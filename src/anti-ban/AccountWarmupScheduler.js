/**
 * ====================================================================
 * ACCOUNT WARM-UP & GRADUATED OUTREACH SCHEDULER (Pillar 2 - Anti-Ban)
 * ====================================================================
 * Protects newly linked numbers from instant WhatsApp automated spam blocks:
 *   - Calculates account age since initial registration/linking.
 *   - Enforces a graduated daily conversation ceiling:
 *       * Days 1 - 2:  Max 1 new lead / day
 *       * Days 3 - 5:  Max 3 new leads / day
 *       * Days 6 - 9:  Max 7 new leads / day
 *       * Days 10 - 14: Max 12 new leads / day
 *       * Day 15+: Full standard operating capacity (up to daily quota)
 *   - Tracks sent counts per account per calendar day.
 *   - Persists warmup state safely in data/outreach/account-warmup.json.
 *
 * @since Development Phase — November 2026
 */

import fs from 'fs';
import path from 'path';
import { Logger } from '../core/Logger.js';
import { maskPhone, phoneKey } from '../outreach/OwnerPhoneNormalizer.js';

const logger = new Logger('AccountWarmupScheduler');

export const WARMUP_SCHEDULE = [
  { maxDays: 2, limit: 1, stage: 'STAGE_1_COLD' },
  { maxDays: 5, limit: 3, stage: 'STAGE_2_GRADUAL' },
  { maxDays: 9, limit: 7, stage: 'STAGE_3_ACCELERATING' },
  { maxDays: 14, limit: 12, stage: 'STAGE_4_MATURING' },
];

export const MATURE_DEFAULT_LIMIT = 25;

export class AccountWarmupScheduler {
  constructor(options = {}) {
    this.storagePath = options.storagePath || path.resolve('data', 'outreach', 'account-warmup.json');
  }

  /**
   * Load current warmup store from disk.
   * @private
   */
  _load() {
    try {
      if (fs.existsSync(this.storagePath)) {
        return JSON.parse(fs.readFileSync(this.storagePath, 'utf8')) || {};
      }
    } catch (_) {
      /* fallback */
    }
    return {};
  }

  /**
   * Save warmup store to disk.
   * @private
   */
  _save(data) {
    try {
      fs.mkdirSync(path.dirname(this.storagePath), { recursive: true });
      fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      logger.warn(`Failed to save account warmup data: ${err.message}`);
    }
  }

  /**
   * Register or verify account onboarding date.
   *
   * @param {string} rawPhone
   * @param {string|Date} [initialDate]
   * @returns {object} Account warmup profile
   */
  registerAccount(rawPhone, initialDate = new Date()) {
    const key = phoneKey(rawPhone);
    const store = this._load();

    if (!store[key]) {
      const onboardedAt = new Date(initialDate).toISOString();
      store[key] = {
        phone: rawPhone,
        onboardedAt,
        dailySends: {},
      };
      this._save(store);
      logger.info(`🌱 Registered new account for warmup: ${maskPhone(rawPhone)} (Onboarded: ${onboardedAt})`);
    }

    return store[key];
  }

  /**
   * Calculate account age in full days.
   *
   * @param {string} rawPhone
   * @returns {number} Age in days
   */
  getAccountAgeDays(rawPhone) {
    const key = phoneKey(rawPhone);
    const store = this._load();
    const entry = store[key] || this.registerAccount(rawPhone);

    const onboarded = new Date(entry.onboardedAt).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - onboarded);
    return Math.floor(diffMs / (24 * 60 * 60 * 1000));
  }

  /**
   * Get allowed daily outreach limit and current status for an account.
   *
   * @param {string} rawPhone
   * @returns {{ allowed: number, sentToday: number, remaining: number, stage: string, ageDays: number }}
   */
  getWarmupStatus(rawPhone) {
    const key = phoneKey(rawPhone);
    const store = this._load();
    const entry = store[key] || this.registerAccount(rawPhone);

    const ageDays = this.getAccountAgeDays(rawPhone);
    const today = new Date().toISOString().slice(0, 10);
    const sentToday = entry.dailySends?.[today] || 0;

    let allowed = MATURE_DEFAULT_LIMIT;
    let stage = 'STAGE_MATURE';

    for (const step of WARMUP_SCHEDULE) {
      if (ageDays <= step.maxDays) {
        allowed = step.limit;
        stage = step.stage;
        break;
      }
    }

    const remaining = Math.max(0, allowed - sentToday);

    return {
      allowed,
      sentToday,
      remaining,
      stage,
      ageDays,
    };
  }

  /**
   * Check if account is permitted to send a new conversation message right now.
   *
   * @param {string} rawPhone
   * @returns {boolean}
   */
  canSend(rawPhone) {
    const status = this.getWarmupStatus(rawPhone);
    return status.remaining > 0;
  }

  /**
   * Record a new conversation sent by this account today.
   *
   * @param {string} rawPhone
   * @returns {boolean} Whether recorded successfully
   */
  recordSend(rawPhone) {
    const key = phoneKey(rawPhone);
    const store = this._load();
    if (!store[key]) {
      this.registerAccount(rawPhone);
      return this.recordSend(rawPhone);
    }

    const today = new Date().toISOString().slice(0, 10);
    store[key].dailySends = store[key].dailySends || {};
    store[key].dailySends[today] = (store[key].dailySends[today] || 0) + 1;

    this._save(store);
    logger.debug(`Warmup send recorded for ${maskPhone(rawPhone)}: ${store[key].dailySends[today]} today`);
    return true;
  }
}

export const accountWarmupScheduler = new AccountWarmupScheduler();
export default accountWarmupScheduler;

