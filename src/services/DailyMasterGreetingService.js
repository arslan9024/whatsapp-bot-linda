/**
 * DailyMasterGreetingService.js
 * ═══════════════════════════════════════════════════════════════════════════
 * Sends daily greetings to all registered master WhatsApp accounts as per
 * Dubai local time (GST / Asia/Dubai, UTC+4), guarded by primary master
 * online connectivity.
 * 
 * Operating Lane: Campaigns & Outreach / Architecture & Reliability
 * Governing Law: Rate-limited safe dispatch & 24/7 resilience
 */

import cron from 'node-cron';
import { getLiveConnectionState } from '../connection/ConnectionEnhancements.js';
import services from '../core/ServiceRegistry.js';
import { Logger } from '../core/Logger.js';

const logger = new Logger('DailyMasterGreetingService');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class DailyMasterGreetingService {
  constructor(options = {}) {
    this.cronSchedule = options.cronSchedule || process.env.DAILY_GREETING_CRON || '0 9 * * *';
    this.timezone = options.timezone || process.env.DAILY_GREETING_TIMEZONE || 'Asia/Dubai';
    this.accountConfigManager = options.accountConfigManager || null;
    this.accountClients = options.accountClients || null;
    this.sharedContext = options.sharedContext || null;
    this.logBot = options.logBot || ((msg, level = 'info') => {
      if (typeof logger[level] === 'function') {
        logger[level](msg);
      } else {
        logger.info(msg);
      }
    });
    this.sendIntervalMs = options.sendIntervalMs ?? 2500;
    this.task = null;
    this.isRunning = false;
    this.lastRunResult = null;
  }

  getDependencies() {
    const acm = this.accountConfigManager || services.get('accountConfigManager') || this.sharedContext?.accountConfigManager;
    const clients = this.accountClients || services.get('accountClients') || this.sharedContext?.accountClients;
    return { acm, clients };
  }

  formatGreetingMessage(recipientName, dateStr, timeStr) {
    const namePart = recipientName ? ` ${recipientName}` : '';
    return `🌅 *Good Morning${namePart}!* 🇦🇪\n\n` +
      `Wishing you a productive and successful day ahead in Dubai!\n` +
      `All Linda AI Assistant systems and communication channels are active and monitored 24/7.\n\n` +
      `📅 *Date:* ${dateStr}\n` +
      `⏰ *Time:* ${timeStr} (GST / Dubai)\n` +
      `🤖 *Bot Status:* Online & Active\n\n` +
      `✨ _Have a wonderful day ahead!_`;
  }

  async sendGreetingsNow(options = {}) {
    const { acm, clients } = this.getDependencies();
    if (!acm) {
      this.logBot('Daily greetings skipped: AccountConfigManager not available', 'warn');
      return { success: false, reason: 'account_config_manager_unavailable' };
    }

    const primaryMasterPhone = acm.getMasterPhoneNumber();
    if (!primaryMasterPhone) {
      this.logBot('Daily greetings skipped: No primary master phone configured', 'warn');
      return { success: false, reason: 'no_primary_master_configured' };
    }

    const primaryClient = clients?.get(primaryMasterPhone) || this.sharedContext?.masterRef;
    if (!primaryClient) {
      this.logBot(`Daily greetings skipped: Master client for ${primaryMasterPhone} not initialized`, 'warn');
      return { success: false, reason: 'client_not_initialized' };
    }

    const liveState = await getLiveConnectionState(primaryClient).catch(() => null);
    if (liveState !== 'CONNECTED') {
      this.logBot(`Daily greetings skipped: Primary master (${primaryMasterPhone}) is offline (state: ${liveState || 'UNKNOWN'})`, 'warn');
      return { success: false, reason: 'master_offline', state: liveState };
    }

    const allMasters = acm.getAllMasterAccounts?.() || [];
    if (!allMasters.length) {
      this.logBot('Daily greetings skipped: No master accounts registered in config', 'warn');
      return { success: false, reason: 'no_master_accounts' };
    }

    const now = new Date();
    const dubaiTimeStr = now.toLocaleTimeString('en-US', {
      timeZone: this.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const dubaiDateStr = now.toLocaleDateString('en-US', {
      timeZone: this.timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    this.logBot(`🚀 Initiating Dubai daily greetings to ${allMasters.length} master accounts at ${dubaiTimeStr}...`, 'info');

    const results = [];
    for (const master of allMasters) {
      const phoneDigits = String(master.phoneNumber || '').replace(/\D/g, '');
      if (!phoneDigits) continue;

      const jid = `${phoneDigits}@c.us`;
      const message = this.formatGreetingMessage(master.displayName, dubaiDateStr, dubaiTimeStr);

      try {
        await primaryClient.sendMessage(jid, message);
        this.logBot(`✅ Daily greeting sent to ${master.displayName || master.phoneNumber} (${phoneDigits})`, 'success');
        results.push({ phoneNumber: master.phoneNumber, success: true });
      } catch (err) {
        this.logBot(`❌ Failed to send greeting to ${master.phoneNumber}: ${err.message}`, 'error');
        results.push({ phoneNumber: master.phoneNumber, success: false, error: err.message });
      }

      if (this.sendIntervalMs > 0) {
        await sleep(this.sendIntervalMs);
      }
    }

    const sentCount = results.filter(r => r.success).length;
    this.lastRunResult = {
      timestamp: new Date().toISOString(),
      sentCount,
      totalMasters: allMasters.length,
      results,
    };

    this.logBot(`🎉 Daily greetings completed: ${sentCount}/${allMasters.length} sent successfully`, 'success');
    return { success: true, sentCount, total: allMasters.length, results };
  }

  start() {
    if (this.task) {
      this.logBot('DailyMasterGreetingService is already scheduled', 'info');
      return;
    }

    this.logBot(`⏰ Scheduling Daily Master Greetings [Cron: "${this.cronSchedule}", Timezone: "${this.timezone}"]`, 'info');

    this.task = cron.schedule(
      this.cronSchedule,
      async () => {
        try {
          await this.sendGreetingsNow({ source: 'cron' });
        } catch (error) {
          this.logBot(`Error executing daily master greetings: ${error.message}`, 'error');
        }
      },
      {
        scheduled: true,
        timezone: this.timezone,
      }
    );

    this.isRunning = true;
  }

  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      this.isRunning = false;
      this.logBot('DailyMasterGreetingService stopped', 'info');
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      cronSchedule: this.cronSchedule,
      timezone: this.timezone,
      lastRunResult: this.lastRunResult,
    };
  }
}

export default DailyMasterGreetingService;
