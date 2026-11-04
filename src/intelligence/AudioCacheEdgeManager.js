/**
 * @file AudioCacheEdgeManager.js
 * @description In-memory and edge cache for frequently requested synthesized audio clips
 * (common property overviews, greetings, FAQs) providing near-instant <200ms dispatch.
 * Category: Intelligence
 */

import crypto from 'node:crypto';

export class AudioCacheEdgeManager {
  constructor(config = {}) {
    this.cache = new Map(); // hashKey -> { buffer, mimeType, createdAt, hits }
    this.ttlMs = config.ttlMs || 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Generates a deterministic cache key from text and voice parameters
   * @param {string} text
   * @param {string} voiceId
   * @returns {string} SHA-256 hash key
   */
  generateKey(text, voiceId) {
    const raw = `${text.trim()}|${voiceId}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Stores an audio buffer in the cache
   * @param {string} text
   * @param {string} voiceId
   * @param {Buffer} buffer
   * @param {string} [mimeType]
   */
  put(text, voiceId, buffer, mimeType = 'audio/ogg; codecs=opus') {
    const key = this.generateKey(text, voiceId);
    this.cache.set(key, {
      buffer,
      mimeType,
      createdAt: Date.now(),
      hits: 0
    });
    return key;
  }

  /**
   * Retrieves an audio buffer from cache if present and fresh
   * @param {string} text
   * @param {string} voiceId
   * @returns {Object|null}
   */
  get(text, voiceId) {
    const key = this.generateKey(text, voiceId);
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry;
  }
}

export default new AudioCacheEdgeManager();

