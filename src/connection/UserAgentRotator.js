/**
 * UserAgentRotator.js
 * 
 * Single responsibility: Provide deterministic, version-consistent desktop
 * browser User-Agent strings and client hint metadata for WhatsApp sessions.
 * 
 * Category: 2️⃣ Domain / Feature (src/connection/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const BROWSER_POOL = Object.freeze([
  {
    platform: 'MacIntel',
    osName: 'macOS',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  },
  {
    platform: 'Win32',
    osName: 'Windows',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  },
  {
    platform: 'MacIntel',
    osName: 'macOS',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
  },
  {
    platform: 'Win32',
    osName: 'Windows',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
  },
]);

export class UserAgentRotator {
  /**
   * @param {Object} [options]
   * @param {Array<Object>} [options.pool=BROWSER_POOL]
   */
  constructor({ pool = BROWSER_POOL } = {}) {
    this.pool = pool;
    /** @type {Map<string, Object>} */
    this.sessionProfiles = new Map();
  }

  /**
   * Assigns or retrieves a sticky user-agent profile for a given session.
   * Sticky assignment guarantees session continuity across restarts.
   * 
   * @param {string} sessionId
   * @returns {Object} { userAgent, platform, osName }
   */
  getProfileForSession(sessionId) {
    if (!sessionId) {
      throw new Error('sessionId is required for profile retrieval');
    }

    if (this.sessionProfiles.has(sessionId)) {
      return this.sessionProfiles.get(sessionId);
    }

    // Deterministic selection based on sessionId hash to preserve stickiness
    let hash = 0;
    for (let i = 0; i < sessionId.length; i++) {
      hash = (hash << 5) - hash + sessionId.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % this.pool.length;
    const profile = this.pool[index];

    this.sessionProfiles.set(sessionId, profile);
    return profile;
  }

  /**
   * Rotates a session to a fresh profile explicitly.
   * 
   * @param {string} sessionId
   * @returns {Object}
   */
  rotate(sessionId) {
    const current = this.getProfileForSession(sessionId);
    const available = this.pool.filter(p => p.userAgent !== current.userAgent);
    const chosen = available[Math.floor(Math.random() * available.length)] || this.pool[0];
    this.sessionProfiles.set(sessionId, chosen);
    return chosen;
  }

  /**
   * Clears profile cache.
   */
  clear() {
    this.sessionProfiles.clear();
  }
}

export default new UserAgentRotator();

