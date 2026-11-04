/**
 * @file ModelDiscrepancyLogger.js
 * @description Records divergent outputs between frontier models when variance exceeds tolerance, logging them to an audit trail for human broker review.
 * Category: 2️⃣ Domain / Feature (Multi-LLM Mesh)
 */

export class ModelDiscrepancyLogger {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.logs = [];
    this.maxLogs = options.maxLogs || 100;
  }

  /**
   * Logs discrepancy between model outputs.
   * @param {Object} discrepancyData
   * @param {string} discrepancyData.query
   * @param {string} discrepancyData.modelA
   * @param {any} discrepancyData.outputA
   * @param {string} discrepancyData.modelB
   * @param {any} discrepancyData.outputB
   * @param {number} discrepancyData.variancePct
   * @returns {Object}
   */
  logDiscrepancy(discrepancyData) {
    const entry = {
      id: `DISC-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase(),
      timestamp: new Date().toISOString(),
      ...discrepancyData,
      reviewStatus: 'PENDING_HUMAN_BROKER_AUDIT'
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    return entry;
  }

  /**
   * Gets pending discrepancies for broker review.
   * @returns {Array<Object>}
   */
  getPendingAudits() {
    return this.logs.filter(l => l.reviewStatus === 'PENDING_HUMAN_BROKER_AUDIT');
  }
}

export default new ModelDiscrepancyLogger();
