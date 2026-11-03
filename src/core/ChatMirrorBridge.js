/**
 * @file ChatMirrorBridge.js
 * @description Bridges live WhatsApp chat streams with the Web UI console, allowing
 * human brokers to inspect incoming messages and trigger instant manual bot takeover.
 * Category: Core
 */

export class ChatMirrorBridge {
  constructor() {
    this.takeovers = new Map(); // chatJid -> { agentId, expiresAt }
    this.defaultMuteMinutes = 120; // 2 hours
  }

  /**
   * Engages manual human takeover on a chat
   * @param {string} chatJid
   * @param {string} agentId
   * @param {number} [durationMinutes]
   */
  engageTakeover(chatJid, agentId, durationMinutes = this.defaultMuteMinutes) {
    const expiresAt = Date.now() + (durationMinutes * 60 * 1000);
    this.takeovers.set(chatJid, {
      agentId,
      engagedAt: new Date().toISOString(),
      expiresAt
    });
    return { chatJid, agentId, expiresAt: new Date(expiresAt).toISOString() };
  }

  /**
   * Tests whether a chat is currently under manual human takeover
   * @param {string} chatJid
   * @returns {boolean}
   */
  isTakeoverActive(chatJid) {
    const record = this.takeovers.get(chatJid);
    if (!record) return false;

    if (Date.now() > record.expiresAt) {
      this.takeovers.delete(chatJid);
      return false;
    }
    return true;
  }

  /**
   * Releases manual takeover, restoring automated AI responses
   * @param {string} chatJid
   * @returns {boolean}
   */
  releaseTakeover(chatJid) {
    return this.takeovers.delete(chatJid);
  }
}

export default new ChatMirrorBridge();
