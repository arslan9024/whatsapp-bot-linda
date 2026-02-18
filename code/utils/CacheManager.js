/**
 * CacheManager.js
 * ================
 * Unified caching layer for WhatsApp bot
 * Supports in-memory cache by default, Redis optional
 * 
 * Features:
 * - Key-value caching with TTL
 * - Automatic expiration
 * - Memory limits
 * - Cache statistics
 * - Redis support (optional)
 * 
 * Usage:
 * const cache = new CacheManager();
 * cache.set('key', data, 3600); // 1 hour TTL
 * const data = cache.get('key');
 * 
 * @since Phase 29 - February 19, 2026
 */

import { EventEmitter } from 'events';

class CacheManager extends EventEmitter {
  constructor(options = {}) {
    super();

    // Configuration
    this.maxMemoryMB = options.maxMemoryMB || 100;
    this.defaultTTL = options.defaultTTL || 3600; // 1 hour
    this.cleanupInterval = options.cleanupInterval || 60000; // 1 minute
    this.useRedis = options.useRedis || false;
    this.redisClient = options.redisClient || null;

    // In-memory cache
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      expirations: 0,
    };

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Set a cache value with TTL
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {boolean} - Success status
   */
  set(key, value, ttl = this.defaultTTL) {
    try {
      if (!key) throw new Error('Cache key is required');

      const expireAt = Date.now() + (ttl * 1000);
      const entry = {
        value,
        expireAt,
        createdAt: Date.now(),
        size: this.estimateSize(value),
      };

      // Check memory limits
      const memoryUsage = this.getMemoryUsageMB();
      if (memoryUsage > this.maxMemoryMB) {
        this.evictLRU();
      }

      // Store in memory
      this.cache.set(key, entry);
      this.stats.sets++;

      // Optionally store in Redis
      if (this.useRedis && this.redisClient) {
        this.redisClient.setex(
          `cache:${key}`,
          ttl,
          JSON.stringify(value)
        ).catch(err => console.warn(`Redis set error: ${err.message}`));
      }

      return true;
    } catch (error) {
      console.error(`Cache set error: ${error.message}`);
      return false;
    }
  }

  /**
   * Get a cache value
   * @param {string} key - Cache key
   * @returns {*} - Cached value or null
   */
  get(key) {
    try {
      if (!key) return null;

      const entry = this.cache.get(key);

      // Cache miss
      if (!entry) {
        this.stats.misses++;
        return null;
      }

      // Check expiration
      if (entry.expireAt < Date.now()) {
        this.cache.delete(key);
        this.stats.expirations++;
        this.stats.misses++;
        return null;
      }

      // Cache hit
      this.stats.hits++;
      entry.lastAccessed = Date.now();
      return entry.value;
    } catch (error) {
      console.error(`Cache get error: ${error.message}`);
      return null;
    }
  }

  /**
   * Delete a cache key
   * @param {string} key - Cache key
   * @returns {boolean} - Success status
   */
  delete(key) {
    try {
      const existed = this.cache.has(key);
      this.cache.delete(key);

      if (existed) {
        this.stats.deletes++;

        // Remove from Redis
        if (this.useRedis && this.redisClient) {
          this.redisClient.del(`cache:${key}`).catch(err =>
            console.warn(`Redis delete error: ${err.message}`)
          );
        }
      }

      return existed;
    } catch (error) {
      console.error(`Cache delete error: ${error.message}`);
      return false;
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (entry.expireAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;

    return {
      ...this.stats,
      keys: this.cache.size,
      memoryMB: this.getMemoryUsageMB(),
      hitRate: `${hitRate}%`,
      totalRequests: total,
    };
  }

  /**
   * Get cache key patterns
   * @param {string} pattern - Glob pattern (e.g., 'goraha:*')
   * @returns {Array} - Matching keys
   */
  keys(pattern = '*') {
    const pattern_regex = `^${pattern.replace(/\*/g, '.*')}$`;
    const regex = new RegExp(pattern_regex);
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  /**
   * Get value by pattern and return first match
   * @param {string} pattern - Pattern to match
   * @returns {*} - First matching value or null
   */
  getByPattern(pattern) {
    const matchingKeys = this.keys(pattern);
    if (matchingKeys.length === 0) return null;
    return this.get(matchingKeys[0]);
  }

  /**
   * Get all values by pattern
   * @param {string} pattern - Pattern to match
   * @returns {Array} - Matching values
   */
  getAllByPattern(pattern) {
    const matchingKeys = this.keys(pattern);
    return matchingKeys
      .map(key => this.get(key))
      .filter(value => value !== null);
  }

  /**
   * Set with conditional check
   * @param {string} key - Cache key
   * @param {Function} valueGetter - Function to get value if missing
   * @param {number} ttl - TTL in seconds
   * @returns {*} - Cached or new value
   */
  async getOrSet(key, valueGetter, ttl = this.defaultTTL) {
    const cached = this.get(key);
    if (cached !== null) return cached;

    try {
      const newValue = await Promise.resolve(valueGetter());
      this.set(key, newValue, ttl);
      return newValue;
    } catch (error) {
      console.error(`getOrSet error: ${error.message}`);
      return null;
    }
  }

  /**
   * Estimate size of value in bytes
   * @private
   */
  estimateSize(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'string') return value.length;
    if (typeof value === 'number') return 8;
    if (typeof value === 'boolean') return 4;
    if (Array.isArray(value)) {
      return value.reduce((sum, item) => sum + this.estimateSize(item), 0);
    }
    if (typeof value === 'object') {
      return JSON.stringify(value).length;
    }
    return 0;
  }

  /**
   * Get memory usage in MB
   * @private
   */
  getMemoryUsageMB() {
    let totalBytes = 0;
    for (const entry of this.cache.values()) {
      totalBytes += entry.size;
    }
    return totalBytes / (1024 * 1024);
  }

  /**
   * Evict least recently used item
   * @private
   */
  evictLRU() {
    let lruKey = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      const accessTime = entry.lastAccessed || entry.createdAt;
      if (accessTime < lruTime) {
        lruTime = accessTime;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.delete(lruKey);
      console.log(`[Cache] LRU evicted: ${lruKey}`);
    }
  }

  /**
   * Start automatic cleanup interval
   * @private
   */
  startCleanupInterval() {
    this.cleanupTimer = setInterval(() => {
      let expired = 0;
      const now = Date.now();

      for (const [key, entry] of this.cache.entries()) {
        if (entry.expireAt < now) {
          this.cache.delete(key);
          expired++;
        }
      }

      if (expired > 0) {
        console.log(`[Cache] Cleaned up ${expired} expired entries`);
      }
    }, this.cleanupInterval);
  }

  /**
   * Stop cleanup interval
   */
  stop() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  /**
   * Display cache info in terminal
   */
  displayInfo() {
    const stats = this.getStats();
    console.log(`\n╔════════════════════════════════════════════════════════╗`);
    console.log(`║           📊 CACHE STATISTICS                          ║`);
    console.log(`╠════════════════════════════════════════════════════════╣`);
    console.log(`║  Keys Cached:        ${stats.keys.toString().padEnd(41)}║`);
    console.log(`║  Memory Usage:       ${stats.memoryMB.toFixed(2)} MB${' '.repeat(36)}║`);
    console.log(`║  Hit Rate:           ${stats.hitRate.padEnd(41)}║`);
    console.log(`║  Total Hits:         ${stats.hits.toString().padEnd(41)}║`);
    console.log(`║  Total Misses:       ${stats.misses.toString().padEnd(41)}║`);
    console.log(`║  Sets:               ${stats.sets.toString().padEnd(41)}║`);
    console.log(`║  Expirations:        ${stats.expirations.toString().padEnd(41)}║`);
    console.log(`╚════════════════════════════════════════════════════════╝\n`);
  }
}

export default CacheManager;
