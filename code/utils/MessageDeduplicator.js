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
      const toDelete = [];
      
      for (const [hash, entry] of this.hashes) {
        if (now - entry.timestamp > this.ttlMs) {
          toDelete.push(hash);
        }
      }
      
      toDelete.forEach(hash => {
        this.hashes.delete(hash);
      });
      
      if (toDelete.length > 0) {
        console.log(`✅ Deduplicator: Cleaned ${toDelete.length} expired entries`);
      }
      
      return toDelete.length;
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
}

// Export singleton instance
export const messageDeduplicator = new MessageDeduplicator();
