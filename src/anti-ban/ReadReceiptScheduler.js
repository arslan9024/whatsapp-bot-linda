/**
 * ReadReceiptScheduler.js
 * 
 * Single responsibility: Delay blue tick read receipts until right before automated reply dispatch.
 * Category: 2️⃣ Domain / Feature (src/anti-ban/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class ReadReceiptScheduler {
  constructor({ minDelayMs = 2500, maxDelayMs = 8000 } = {}) {
    this.minDelayMs = minDelayMs;
    this.maxDelayMs = maxDelayMs;
  }

  calculateReadDelay(messageLength = 20) {
    // Human reads at roughly 250 words/min (approx 20 chars per second)
    const readingTime = (messageLength / 20) * 1000;
    const clamped = Math.max(this.minDelayMs, Math.min(this.maxDelayMs, readingTime));
    const jitter = Math.floor(Math.random() * 1500);
    return clamped + jitter;
  }

  scheduleMarkAsRead(chatId, messageLength = 20) {
    if (!chatId) throw new Error('chatId is required');
    const delay = this.calculateReadDelay(messageLength);
    return {
      chatId,
      scheduledDelayMs: delay,
      executeAt: Date.now() + delay,
    };
  }
}

export default new ReadReceiptScheduler();
