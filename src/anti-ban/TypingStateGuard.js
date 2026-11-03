/**
 * TypingStateGuard.js
 * 
 * Single responsibility: Maintain natural typing cadence and prevent typing state timeout.
 * Category: 2️⃣ Domain / Feature (src/anti-ban/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class TypingStateGuard {
  constructor({ charsPerSecond = 14, minTypingMs = 1200, maxTypingMs = 15000 } = {}) {
    this.charsPerSecond = charsPerSecond;
    this.minTypingMs = minTypingMs;
    this.maxTypingMs = maxTypingMs;
  }

  calculateTypingDuration(text = '') {
    if (!text || typeof text !== 'string') return this.minTypingMs;
    const duration = Math.round((text.length / this.charsPerSecond) * 1000);
    return Math.max(this.minTypingMs, Math.min(this.maxTypingMs, duration));
  }

  getHeartbeatIntervals(totalDurationMs) {
    const intervals = [];
    const step = 4500; // WhatsApp client typing state expires ~5s
    let remaining = totalDurationMs;

    while (remaining > 0) {
      const slice = Math.min(remaining, step);
      intervals.push(slice);
      remaining -= slice;
    }
    return intervals;
  }
}

export default new TypingStateGuard();

