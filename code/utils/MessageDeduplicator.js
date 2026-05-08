/**
 * ============================================
 * MESSAGE DEDUPLICATOR (Phase 17)
 * ============================================
 * 
 * Prevents duplicate message processing using
 * SHA-256 hashing and LRU cache.
 */

import crypto from 'crypto';

export class MessageDeduplicator {
  constructor(windowSize = 1000, ttlMs = 300000) {
    this.windowSize = windowSize;
    this.ttlMs = ttlMs;  // 5 minutes default
    this.hashes = new Map();  // hash -> { timestamp, count }
    this.hashQueue = [];  // FIFO queue for LRU eviction

    // Auto-cleanup: proactively evict expired entries every 2× TTL.
    // Without this, entries only expire when checked (lookup-lazy eviction)
    // which causes unbounded Map growth in high-volume environments.
    this._cleanupInterval = setInterval(() => this.cleanup(), Math.max(ttlMs * 2, 60_000));
    // Don't hold the event loop open just for cleanup
    if (this._cleanupInterval.unref) this._cleanupInterval.unref();
  }

  /**
   * Check if message is a duplicate
   */
  isDuplicate(phoneNumber, messageBody, timestamp) {
    try {
      const hash = this.generateHash(phoneNumber, messageBody, timestamp);
      
      // Check if hash exists and not expired
      if (this.hashes.has(hash)) {
        const entry = this.hashes.get(hash);
        const age = Date.now() - entry.timestamp;
        
        if (age < this.ttlMs) {
          entry.count += 1;
          return true;
        } else {
          // Entry expired, remove it
          this.hashes.delete(hash);
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ Deduplicator error:', error.message);
      return false;
    }
  }

  /**
   * Register a message as processed
   */
  register(phoneNumber, messageBody, timestamp) {
    try {
      const hash = this.generateHash(phoneNumber, messageBody, timestamp);
      
      // Add to map
      if (!this.hashes.has(hash)) {
        this.hashes.set(hash, {
          timestamp: Date.now(),
          count: 1,
        });
        
        this.hashQueue.push(hash);
        
        // Evict oldest if exceeding window size
        if (this.hashQueue.length > this.windowSize) {
          const oldHash = this.hashQueue.shift();
          this.hashes.delete(oldHash);
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Deduplicator register error:', error.message);
      return false;
    }
  }

  /**
   * Generate SHA-256 hash of message
   */
  generateHash(phoneNumber, messageBody, timestamp) {
    const data = `${phoneNumber}:${messageBody}:${Math.floor(timestamp / 1000)}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Clean expired entries
   */
  cleanup() {
    try {
      const now = Date.now();
      const toDelete = new Set();

      for (const [hash, entry] of this.hashes) {
        if (now - entry.timestamp > this.ttlMs) {
          toDelete.add(hash);
        }
      }

      for (const hash of toDelete) {
        this.hashes.delete(hash);
      }

      // Also prune hashQueue so it doesn't hold stale references that
      // make the window-size eviction check (hashQueue.length > windowSize)
      // fire too early on legitimate new messages.
      if (toDelete.size > 0) {
        this.hashQueue = this.hashQueue.filter((h) => !toDelete.has(h));
      }

      return toDelete.size;
    } catch (error) {
      console.error('❌ Deduplicator cleanup error:', error.message);
      return 0;
    }
  }

  /**
   * Get deduplicator stats
   */
  getStats() {
    return {
      totalHashes: this.hashes.size,
      queueLength: this.hashQueue.length,
      windowSize: this.windowSize,
      ttlMs: this.ttlMs,
    };
  }

  /**
   * Clear all entries
   */
  clear() {
    this.hashes.clear();
    this.hashQueue = [];
  }

  /**
   * Stop the periodic cleanup interval (useful for tests / shutdown).
   */
  destroy() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = null;
    }
    this.clear();
  }
}

// Export singleton instance
export const messageDeduplicator = new MessageDeduplicator();
