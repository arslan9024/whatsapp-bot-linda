/**
 * UnreadCatchUpPacer.js
 * 
 * Single responsibility: Paces unread messages gradually to avoid burst alarms after reconnecting.
 * Category: 2️⃣ Domain / Feature (src/anti-ban/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class UnreadCatchUpPacer {
  constructor({ batchSize = 3, intervalBetweenBatchesMs = 12000 } = {}) {
    this.batchSize = batchSize;
    this.intervalBetweenBatchesMs = intervalBetweenBatchesMs;
  }

  planCatchUp(unreadMessages = []) {
    if (!Array.isArray(unreadMessages) || !unreadMessages.length) return [];

    const batches = [];
    for (let i = 0; i < unreadMessages.length; i += this.batchSize) {
      batches.push({
        batchIndex: Math.floor(i / this.batchSize),
        items: unreadMessages.slice(i, i + this.batchSize),
        delayMs: Math.floor(i / this.batchSize) * this.intervalBetweenBatchesMs,
      });
    }
    return batches;
  }
}

export default new UnreadCatchUpPacer();
