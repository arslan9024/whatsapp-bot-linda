/**
 * SentimentProgressionTracker.js
 * 
 * Single responsibility: Track conversation sentiment trajectory across multi-turn messages.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class SentimentProgressionTracker {
  constructor({ historyWindow = 10 } = {}) {
    this.historyWindow = historyWindow;
    /** @type {Map<string, Array<{ score: number, timestamp: number }>>} */
    this.chatHistories = new Map();
  }

  recordScore(chatId, score = 0, now = Date.now()) {
    if (!chatId) throw new Error('chatId is required');
    if (!this.chatHistories.has(chatId)) {
      this.chatHistories.set(chatId, []);
    }
    const list = this.chatHistories.get(chatId);
    list.push({ score: Math.max(-1.0, Math.min(1.0, score)), timestamp: now });

    if (list.length > this.historyWindow) {
      list.shift();
    }
    return this.getTrajectory(chatId);
  }

  getTrajectory(chatId) {
    const list = this.chatHistories.get(chatId) || [];
    if (!list.length) return { trajectory: 'NEUTRAL', average: 0, delta: 0, count: 0 };

    const average = list.reduce((acc, item) => acc + item.score, 0) / list.length;
    const delta = list.length > 1 ? list[list.length - 1].score - list[0].score : 0;

    let trajectory = 'STABLE';
    if (delta >= 0.25) trajectory = 'IMPROVING';
    else if (delta <= -0.25) trajectory = 'DETERIORATING';

    return {
      trajectory,
      current: list[list.length - 1].score,
      average: Number(average.toFixed(2)),
      delta: Number(delta.toFixed(2)),
      count: list.length,
    };
  }

  clear() {
    this.chatHistories.clear();
  }
}

export default new SentimentProgressionTracker();

