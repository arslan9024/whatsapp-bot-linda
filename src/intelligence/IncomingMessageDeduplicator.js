/**
 * IncomingMessageDeduplicator.js
 * 
 * Single responsibility: Sliding-window LRU cache for de-duplicating incoming
 * WhatsApp messages to prevent redundant AI parsing or duplicate trigger loops.
 * 
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines), zero external side effects.
 */

export class IncomingMessageDeduplicator {
  /**
   * @param {Object} options
   * @param {number} [options.ttlMs=600000] - Time to live in ms (default 10 mins)
   * @param {number} [options.maxSize=5000] - Maximum keys retained in memory
   */
  constructor({ ttlMs = 600000, maxSize = 5000 } = {}) {
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
    /** @type {Map<string, number>} */
    this.seen = new Map();
  }

  /**
   * Generates a deterministic message fingerprint.
   * @param {string} messageId - Native WhatsApp message ID
   * @param {string} [senderJid] - Sender JID or phone number
   * @param {string|number} [timestamp] - Message timestamp
   * @returns {string}
   */
  generateKey(messageId, senderJid = '', timestamp = '') {
    if (!messageId) {
      throw new Error('messageId is required to generate deduplication key');
    }
    return `${messageId}:${senderJid}:${timestamp}`;
  }

  /**
   * Checks whether a message has already been processed within the TTL window.
   * If not seen, records it automatically.
   * 
   * @param {string} messageId
   * @param {string} [senderJid]
   * @param {string|number} [timestamp]
   * @returns {boolean} True if message is a duplicate, false if new.
   */
  isDuplicate(messageId, senderJid = '', timestamp = '') {
    const key = this.generateKey(messageId, senderJid, timestamp);
    const now = Date.now();

    this._evictExpired(now);

    if (this.seen.has(key)) {
      const expiresAt = this.seen.get(key);
      if (expiresAt > now) {
        return true;
      }
      this.seen.delete(key);
    }

    // Capacity safeguard
    if (this.seen.size >= this.maxSize) {
      const oldestKey = this.seen.keys().next().value;
      if (oldestKey) this.seen.delete(oldestKey);
    }

    this.seen.set(key, now + this.ttlMs);
    return false;
  }

  /**
   * Force eviction of expired entries.
   * @private
   */
  _evictExpired(now = Date.now()) {
    for (const [key, expiresAt] of this.seen.entries()) {
      if (expiresAt <= now) {
        this.seen.delete(key);
      } else {
        // Since Maps maintain insertion order, break early if keys are chronological
        break;
      }
    }
  }

  /**
   * Current count of active tracked entries.
   * @returns {number}
   */
  size() {
    return this.seen.size;
  }

  /**
   * Resets the deduplication cache.
   */
  clear() {
    this.seen.clear();
  }
}

export default new IncomingMessageDeduplicator();

