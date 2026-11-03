/**
 * ContactAvatarCache.js
 * 
 * Single responsibility: Background caching and retrieval of contact avatars for Web UI.
 * Category: 2️⃣ Domain / Feature (src/accounts/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class ContactAvatarCache {
  constructor({ maxEntries = 2000, ttlMs = 86400000 } = {}) { // 24h TTL
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    /** @type {Map<string, Object>} */
    this.avatars = new Map();
  }

  setAvatar(jid, avatarUrl) {
    if (!jid) throw new Error('jid is required');
    if (this.avatars.size >= this.maxEntries) {
      const oldestKey = this.avatars.keys().next().value;
      if (oldestKey) this.avatars.delete(oldestKey);
    }
    this.avatars.set(jid, {
      url: avatarUrl || null,
      cachedAt: Date.now(),
    });
  }

  getAvatar(jid, now = Date.now()) {
    const entry = this.avatars.get(jid);
    if (!entry) return null;
    if (now - entry.cachedAt > this.ttlMs) {
      this.avatars.delete(jid);
      return null;
    }
    return entry.url;
  }

  size() {
    return this.avatars.size;
  }

  clear() {
    this.avatars.clear();
  }
}

export default new ContactAvatarCache();
