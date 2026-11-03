/**
 * ReadingPauseSimulator.js
 * 
 * Single responsibility: Calculate realistic human reading pauses based on word count.
 * Category: 2️⃣ Domain / Feature (src/anti-ban/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class ReadingPauseSimulator {
  constructor({ msPerWord = 220, minPauseMs = 600, maxPauseMs = 6000 } = {}) {
    this.msPerWord = msPerWord;
    this.minPauseMs = minPauseMs;
    this.maxPauseMs = maxPauseMs;
  }

  calculateReadingPause(text = '') {
    if (!text || typeof text !== 'string') return this.minPauseMs;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const computed = words * this.msPerWord;
    const jitter = Math.floor(Math.random() * 800);
    return Math.max(this.minPauseMs, Math.min(this.maxPauseMs, computed + jitter));
  }
}

export default new ReadingPauseSimulator();
