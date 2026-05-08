/**
 * ====================================================================
 * RATE LIMITER — WhatsApp-safe message throttling
 * ====================================================================
 *
 * Why this exists:
 *  WhatsApp aggressively bans numbers that send messages too fast.
 *  Reported safe limits:
 *    - ≤ 1 message / second  per contact (1:1)
 *    - ≤ 60 messages / minute globally
 *    - ≤ 200 messages / hour  globally
 *    - ≥ 2 s  gap between different contacts in bulk sends
 *
 * Features:
 *  - Per-contact sliding-window rate limiter
 *  - Global (all contacts combined) sliding window
 *  - Queue with back-pressure: callers `await` until a slot is free
 *  - Configurable via constructor options or env vars
 *  - Singleton export `rateLimiter` for drop-in use
 *  - Observable: `.stats()` returns current state
 *
 * Usage:
 *   import { rateLimiter } from './RateLimiter.js';
 *
 *   // Before sending a message
 *   await rateLimiter.acquire(phoneNumber);
 *   await client.sendMessage(phoneNumber, text);
 *
 * @since May 2026
 */

import { Logger } from './Logger.js';

const log = new Logger('RateLimiter');

// ─── defaults (tunable via env) ──────────────────────────────────────
const GLOBAL_PER_MINUTE  = parseInt(process.env.RL_GLOBAL_PER_MIN)  || 60;
const GLOBAL_PER_HOUR    = parseInt(process.env.RL_GLOBAL_PER_HOUR) || 200;
const CONTACT_PER_SECOND = parseFloat(process.env.RL_PER_CONTACT_S) || 1;   // max 1 msg/s per contact
const MIN_CONTACT_GAP_MS = parseInt(process.env.RL_MIN_GAP_MS)      || 1200; // 1.2s between same-contact msgs
const BULK_CONTACT_GAP_MS= parseInt(process.env.RL_BULK_GAP_MS)     || 2000; // 2s between different contacts in bulk

// ─── helpers ─────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sliding-window counter.
 * Stores timestamps of events and prunes ones older than `windowMs`.
 */
class SlidingWindow {
  constructor(windowMs) {
    this.windowMs = windowMs;
    this.events   = [];
  }

  /** Add an event at the current time. */
  push() {
    const now = Date.now();
    this.events.push(now);
    this._prune(now);
  }

  /** How many events are within the window right now? */
  count() {
    this._prune(Date.now());
    return this.events.length;
  }

  /** How many ms until the oldest event leaves the window? */
  msUntilSlotFree() {
    this._prune(Date.now());
    if (this.events.length === 0) return 0;
    return this.events[0] + this.windowMs - Date.now();
  }

  _prune(now) {
    const cutoff = now - this.windowMs;
    while (this.events.length > 0 && this.events[0] < cutoff) {
      this.events.shift();
    }
  }
}

// ─── RateLimiter ─────────────────────────────────────────────────────
export class RateLimiter {
  /**
   * @param {object} [opts]
   * @param {number} [opts.globalPerMinute]   - Max messages across all contacts per minute
   * @param {number} [opts.globalPerHour]     - Max messages across all contacts per hour
   * @param {number} [opts.contactPerSecond]  - Max messages per second per contact
   * @param {number} [opts.minContactGapMs]   - Min gap between sends to same contact
   * @param {number} [opts.bulkContactGapMs]  - Min gap between different contacts in bulk
   */
  constructor(opts = {}) {
    this.globalPerMinute   = opts.globalPerMinute   ?? GLOBAL_PER_MINUTE;
    this.globalPerHour     = opts.globalPerHour     ?? GLOBAL_PER_HOUR;
    this.contactPerSecond  = opts.contactPerSecond  ?? CONTACT_PER_SECOND;
    this.minContactGapMs   = opts.minContactGapMs   ?? MIN_CONTACT_GAP_MS;
    this.bulkContactGapMs  = opts.bulkContactGapMs  ?? BULK_CONTACT_GAP_MS;

    // Global windows
    this._minuteWindow = new SlidingWindow(60_000);
    this._hourWindow   = new SlidingWindow(3_600_000);

    // Per-contact last-sent timestamps (contact → ms)
    this._lastSent = new Map();

    // Last globally sent contact (for bulk gap enforcement)
    this._lastContact = null;
    this._lastGlobalSentAt = 0;

    // Metrics
    this._totalAcquired  = 0;
    this._totalWaitedMs  = 0;
    this._totalThrottled = 0;
  }

  /**
   * Acquire a send token for the given phone number.
   * Awaits automatically if any rate limit would be exceeded.
   *
   * @param {string} phone - Recipient phone number or chat ID
   * @returns {Promise<void>}
   */
  async acquire(phone) {
    const t0 = Date.now();

    // 1. Global per-minute limit
    while (this._minuteWindow.count() >= this.globalPerMinute) {
      const wait = this._minuteWindow.msUntilSlotFree() + 50;
      log.debug(`Global per-minute limit reached — waiting ${wait}ms`);
      this._totalThrottled++;
      await sleep(wait);
    }

    // 2. Global per-hour limit
    while (this._hourWindow.count() >= this.globalPerHour) {
      const wait = this._hourWindow.msUntilSlotFree() + 50;
      log.warn(`Global per-hour limit reached — waiting ${Math.round(wait / 1000)}s`);
      this._totalThrottled++;
      await sleep(wait);
    }

    // 3. Bulk: gap between different contacts
    if (this._lastContact && this._lastContact !== phone) {
      const elapsed = Date.now() - this._lastGlobalSentAt;
      if (elapsed < this.bulkContactGapMs) {
        const wait = this.bulkContactGapMs - elapsed;
        await sleep(wait);
      }
    }

    // 4. Per-contact gap
    const lastSent = this._lastSent.get(phone) || 0;
    const elapsed  = Date.now() - lastSent;
    const minGap   = Math.max(this.minContactGapMs, 1000 / this.contactPerSecond);
    if (elapsed < minGap) {
      const wait = minGap - elapsed;
      log.debug(`Per-contact gap for ${phone} — waiting ${wait}ms`);
      await sleep(wait);
    }

    // ─ Record the send ─
    const now = Date.now();
    this._minuteWindow.push();
    this._hourWindow.push();
    this._lastSent.set(phone, now);
    this._lastContact      = phone;
    this._lastGlobalSentAt = now;
    this._totalAcquired++;
    this._totalWaitedMs += now - t0;
  }

  /**
   * Wrap a send function with automatic rate limiting.
   *
   * @param {string}   phone
   * @param {Function} sendFn  async () => result
   * @returns {Promise<any>}
   */
  async send(phone, sendFn) {
    await this.acquire(phone);
    return sendFn();
  }

  /**
   * Observable stats snapshot.
   * @returns {object}
   */
  stats() {
    return {
      globalPerMinute:     this.globalPerMinute,
      globalPerHour:       this.globalPerHour,
      usedThisMinute:      this._minuteWindow.count(),
      usedThisHour:        this._hourWindow.count(),
      uniqueContacts:      this._lastSent.size,
      totalAcquired:       this._totalAcquired,
      totalThrottled:      this._totalThrottled,
      avgWaitMs:           this._totalAcquired
                             ? Math.round(this._totalWaitedMs / this._totalAcquired)
                             : 0,
    };
  }

  /**
   * Reset all internal state (useful for tests).
   */
  reset() {
    this._minuteWindow = new SlidingWindow(60_000);
    this._hourWindow   = new SlidingWindow(3_600_000);
    this._lastSent.clear();
    this._lastContact      = null;
    this._lastGlobalSentAt = 0;
    this._totalAcquired    = 0;
    this._totalWaitedMs    = 0;
    this._totalThrottled   = 0;
  }
}

/** Singleton — import this directly in any module that sends messages. */
export const rateLimiter = new RateLimiter();
export default RateLimiter;
