/**
 * ApiQueueWorker — delivers messages that the REST API queued in CommunicationLog
 * through the master WhatsApp account.
 *
 * Safety rules (see docs/software_docs/ARCHITECTURAL_BOUNDARIES.md §6):
 * - Off unless API_QUEUE_WORKER=1.
 * - Sends only inside working hours (WORK_HOURS_START/END/TIMEZONE, default 09:00-20:00 Asia/Dubai).
 * - Sends only while MongoDB is connected and the master client is CONNECTED.
 * - One message per tick, random interval between ticks, one tick in flight.
 * - Counts toward the 45/day account cap and the failure circuit breaker.
 * - Consent is re-checked at send time (CommunicationService.processQueue).
 * - A send that threw after reaching WhatsApp is DELIVERY_UNKNOWN and is never auto-retried.
 * - Messages due longer than maxAgeHours ago are cancelled instead of sent.
 */

import mongoose from 'mongoose';
import CommunicationService from '../database/services/CommunicationService.js';
import { campaignRateLimiter } from './CampaignRateLimiter.js';
import { campaignService } from './CampaignService.js';
import { workingHoursConfig, isWithinWorkingHours, msUntilWorkingHours, describeWorkingHours } from './WorkingHours.js';

export const API_QUEUE_LIMIT_ID = 'api-queue';

const numberFromEnv = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export function apiQueueWorkerConfig(env = process.env) {
  const minIntervalMs = Math.max(numberFromEnv(env.API_QUEUE_MIN_INTERVAL_SEC, 30), 3) * 1000;
  return {
    enabled: env.API_QUEUE_WORKER === '1' || env.API_QUEUE_WORKER === 'true',
    minIntervalMs,
    maxIntervalMs: Math.max(numberFromEnv(env.API_QUEUE_MAX_INTERVAL_SEC, 90) * 1000, minIntervalMs),
    maxAgeMs: numberFromEnv(env.API_QUEUE_MAX_AGE_HOURS, 24) * 60 * 60 * 1000,
  };
}

export default class ApiQueueWorker {
  constructor({
    accountClients,
    accountConfigManager,
    logBot = () => {},
    config = apiQueueWorkerConfig(),
    service = CommunicationService,
    rateLimiter = campaignRateLimiter,
    limits = campaignService,
    isDatabaseReady = () => mongoose.connection.readyState === 1,
    random = Math.random,
    workingHours = workingHoursConfig(),
    now = () => new Date(),
  }) {
    Object.assign(this, {
      accountClients, accountConfigManager, logBot, config, service,
      rateLimiter, limits, isDatabaseReady, random, workingHours, now,
    });
    this.timer = null;
    this.running = false;
    this.inFlight = null;
    this.lastState = null;
    this.stats = { sent: 0, failed: 0, skipped: 0, expired: 0 };
  }

  start() {
    if (!this.config.enabled) {
      this.logBot('API queue worker is off (set API_QUEUE_WORKER=1 to deliver API messages).', 'info');
      return false;
    }
    if (this.running) return true;
    this.running = true;
    this.workingHours.warnings?.forEach(warning => this.logBot(warning, 'warn'));
    this.logBot(
      `API queue worker on: 1 message every ${this.config.minIntervalMs / 1000}-${this.config.maxIntervalMs / 1000}s via the master account, working hours ${describeWorkingHours(this.workingHours)}.`,
      'info',
    );
    this.schedule(0);
    return true;
  }

  async stop() {
    this.running = false;
    clearTimeout(this.timer);
    this.timer = null;
    await this.inFlight;
  }

  schedule(delayMs) {
    if (!this.running) return;
    this.timer = setTimeout(() => {
      this.inFlight = this.tick()
        .catch(error => this.report('error', `API queue worker error: ${error.message}`, 'error'))
        .finally(() => {
          this.inFlight = null;
          const { minIntervalMs, maxIntervalMs } = this.config;
          this.schedule(minIntervalMs + Math.floor(this.random() * (maxIntervalMs - minIntervalMs + 1)));
        });
    }, delayMs);
    this.timer.unref?.();
  }

  // Logs only when the worker's state changes, to keep the terminal quiet.
  report(state, message, level = 'info') {
    if (this.lastState === state) return;
    this.lastState = state;
    this.logBot(message, level);
  }

  async tick() {
    const now = this.now();
    if (!isWithinWorkingHours(this.workingHours, now)) {
      const resumeInMs = msUntilWorkingHours(this.workingHours, now);
      this.report(
        'off-hours',
        `API queue worker waiting: outside working hours (${describeWorkingHours(this.workingHours)}); resumes in ${Math.ceil(resumeInMs / 60000)} min.`,
        'info',
      );
      return { status: 'waiting', reason: 'working-hours', resumeInMs };
    }
    if (!this.isDatabaseReady()) {
      this.report('no-db', 'API queue worker waiting: MongoDB is not connected.', 'warn');
      return { status: 'waiting', reason: 'database' };
    }
    const masterPhone = this.accountConfigManager?.getMasterPhoneNumber?.();
    const client = masterPhone && this.accountClients?.get(masterPhone);
    const state = client ? await client.getState().catch(() => null) : null;
    if (state !== 'CONNECTED') {
      this.report('no-master', 'API queue worker waiting: master account is not online.', 'warn');
      return { status: 'waiting', reason: 'master' };
    }

    const expired = await this.service.expireStaleQueued(this.config.maxAgeMs);
    if (expired) {
      this.stats.expired += expired;
      this.logBot(`API queue: ${expired} stale message(s) cancelled instead of sent.`, 'warn');
    }

    const limit = await this.rateLimiter.canSendMessage(
      API_QUEUE_LIMIT_ID,
      masterPhone,
      this.rateLimiter.WHATSAPP_DAILY_LIMIT,
    );
    if (!limit.allowed) {
      this.report('limited', `API queue worker paused: ${limit.reason}`, 'warn');
      return { status: 'limited', reason: limit.reason };
    }

    const result = await this.service.processQueue(
      (phone, content) => this.send(client, masterPhone, phone, content),
      1,
      0,
    );
    if (!result.success) throw new Error(result.error);
    const { sent, failed, skipped, processed } = result.stats;
    this.stats.sent += sent;
    this.stats.failed += failed;
    this.stats.skipped += skipped;
    if (!processed) {
      this.report('idle', 'API queue worker ready: no due messages.', 'info');
      return { status: 'idle' };
    }
    this.lastState = 'active';
    if (sent) this.logBot(`API queue: message sent via master (${this.stats.sent} this run).`, 'success');
    if (failed) this.logBot('API queue: send failed; marked for manual review (not retried automatically).', 'error');
    return { status: 'processed', ...result.stats };
  }

  async send(client, masterPhone, recipientPhone, content) {
    const digits = String(recipientPhone || '').replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) {
      const error = new Error(`Invalid recipient number: ${recipientPhone}`);
      error.code = 'INVALID_RECIPIENT';
      throw error;
    }
    let result;
    try {
      result = await client.sendMessage(`${digits}@c.us`, content);
      if (!result?.id) throw new Error('WhatsApp did not acknowledge the message.');
    } catch (sendError) {
      this.rateLimiter.recordOutcome(masterPhone, false);
      const error = new Error(`${sendError.message} Delivery unknown; check WhatsApp before resending.`);
      error.code = 'DELIVERY_UNKNOWN';
      throw error;
    }
    this.rateLimiter.recordOutcome(masterPhone, true);
    // The message is already delivered; a counter failure must not mark it failed (that would invite a resend).
    await this.limits.incrementDailySent(API_QUEUE_LIMIT_ID, masterPhone)
      .catch(error => this.logBot(`API queue: daily counter update failed: ${error.message}`, 'error'));
    return result;
  }
}
