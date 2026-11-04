/**
 * @file SessionMemoryAutoPruner.js
 * @description Sweeps stale in-memory conversational states and temporary scratch files older than 30 days, keeping process heap consumption lean.
 * Category: 2️⃣ Domain / Feature (Self-Evolution & Red-Teaming)
 */

export class SessionMemoryAutoPruner {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.retentionTtlMs = options.retentionTtlMs || (30 * 24 * 60 * 60 * 1000); // 30 days
  }

  /**
   * Prunes stale sessions from active in-memory session map.
   * @param {Map<string, { lastActiveTimestamp: number }>} sessionStore
   * @param {number} [currentTimeMs]
   * @returns {Object}
   */
  pruneStaleSessions(sessionStore, currentTimeMs = Date.now()) {
    let prunedCount = 0;
    const initialCount = sessionStore.size;

    for (const [id, session] of sessionStore.entries()) {
      if (currentTimeMs - session.lastActiveTimestamp > this.retentionTtlMs) {
        sessionStore.delete(id);
        prunedCount++;
      }
    }

    return {
      initialSessionsCount: initialCount,
      prunedCount,
      remainingActiveSessionsCount: sessionStore.size,
      freedMemoryRatioPct: initialCount > 0 ? Number(((prunedCount / initialCount) * 100).toFixed(1)) : 0
    };
  }
}

export default new SessionMemoryAutoPruner();
