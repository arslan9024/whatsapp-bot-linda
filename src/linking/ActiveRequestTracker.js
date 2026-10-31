/**
 * ====================================================================
 * ACTIVE REQUEST TRACKER (Phase 32)
 * ====================================================================
 * Concurrency guard tracking in-flight WhatsApp pairing code requests.
 * Features:
 *   - Automatic TTL expiration to prevent indefinite locking
 *   - Full backward compatibility with Set (.add, .has, .delete, .clear)
 *   - Multi-format phone digit normalization (+971..., 971...)
 *
 * @since Phase 32 — February 2026
 */

import { normalizeDigits } from './InboundLinkingHelpers.js';

export class ActiveRequestTracker extends Map {
  constructor(defaultTimeoutMs = 90000) {
    super();
    this.defaultTimeoutMs = defaultTimeoutMs;
    this.timers = new Map();
  }

  /**
   * Set compatibility: add phone with current timestamp
   */
  add(phone) {
    this.start(phone);
    return this;
  }

  /**
   * Check if an active pairing request is currently in flight within its TTL.
   * Auto-cleans expired entries.
   *
   * @param {string} phone
   * @param {number} [timeoutMs]
   * @returns {boolean}
   */
  isActive(phone, timeoutMs = this.defaultTimeoutMs) {
    if (!phone) return false;
    const digits = normalizeDigits(phone);
    const entry = this.get(phone) ?? this.get(digits) ?? this.get(`+${digits}`);
    if (entry === undefined || entry === null) return false;

    const startedAt = typeof entry === 'number' ? entry : Date.now();
    if (Date.now() - startedAt < timeoutMs) {
      return true;
    }

    this.clear(phone);
    return false;
  }

  /**
   * Start tracking an active pairing request with TTL.
   *
   * @param {string} phone
   * @param {number} [timeoutMs]
   */
  start(phone, timeoutMs = this.defaultTimeoutMs) {
    if (!phone) return;
    const digits = normalizeDigits(phone);
    const now = Date.now();

    this.set(phone, now);
    this.set(digits, now);
    this.set(`+${digits}`, now);

    if (this.timers.has(digits)) {
      clearTimeout(this.timers.get(digits));
    }

    const timer = setTimeout(() => {
      this.clear(phone);
    }, timeoutMs + 5000);

    if (typeof timer?.unref === 'function') {
      timer.unref();
    }
    this.timers.set(digits, timer);
  }

  /**
   * Clear active pairing request for all variations of the phone number.
   *
   * @param {string} [phone] - If omitted, clears all entries (Map.prototype.clear)
   */
  clear(phone) {
    if (!phone) {
      for (const t of this.timers.values()) {
        clearTimeout(t);
      }
      this.timers.clear();
      super.clear();
      return;
    }
    const digits = normalizeDigits(phone);
    if (this.timers.has(digits)) {
      clearTimeout(this.timers.get(digits));
      this.timers.delete(digits);
    }
    this.delete(phone);
    this.delete(digits);
    this.delete(`+${digits}`);
  }
}

export default ActiveRequestTracker;
