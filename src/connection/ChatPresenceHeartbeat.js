/**
 * ChatPresenceHeartbeat.js
 * 
 * Single responsibility: Emulate authentic WhatsApp Web tab focus and presence subscription.
 * Category: 2️⃣ Domain / Feature (src/connection/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class ChatPresenceHeartbeat {
  constructor({ pulseIntervalMs = 45000 } = {}) {
    this.pulseIntervalMs = pulseIntervalMs;
    /** @type {Map<string, number>} */
    this.lastPresence = new Map();
  }

  shouldSendPresence(chatId, now = Date.now()) {
    if (!chatId) throw new Error('chatId is required');
    const last = this.lastPresence.get(chatId) || 0;
    return (now - last) >= this.pulseIntervalMs;
  }

  recordPresence(chatId, now = Date.now()) {
    if (!chatId) throw new Error('chatId is required');
    this.lastPresence.set(chatId, now);
    return { chatId, presenceRecordedAt: now };
  }

  generatePresencePayload(chatId, state = 'available') {
    return {
      chatId,
      state, // 'available' | 'composing' | 'recording' | 'paused'
      timestamp: Date.now(),
    };
  }

  clear() {
    this.lastPresence.clear();
  }
}

export default new ChatPresenceHeartbeat();

