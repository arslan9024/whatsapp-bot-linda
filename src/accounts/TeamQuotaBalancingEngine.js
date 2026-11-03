/**
 * @file TeamQuotaBalancingEngine.js
 * @description Dynamically weights lead distribution toward brokers furthest behind
 * their monthly quota while maintaining performance thresholds.
 * Category: Accounts
 */

export class TeamQuotaBalancingEngine {
  constructor() {
    this.brokerQuotas = new Map(); // agentId -> { targetAed, achievedAed }
  }

  /**
   * Sets or updates monthly quota metrics for a broker
   * @param {string} agentId
   * @param {number} targetAed
   * @param {number} achievedAed
   */
  setQuota(agentId, targetAed, achievedAed = 0) {
    this.brokerQuotas.set(agentId, {
      agentId,
      targetAed: Math.max(1, targetAed),
      achievedAed: Math.max(0, achievedAed)
    });
  }

  /**
   * Calculates quota achievement deficit percentage (higher deficit = higher priority)
   * @param {string} agentId
   * @returns {number} Deficit ratio (0.0 to 1.0+)
   */
  getDeficitScore(agentId) {
    const q = this.brokerQuotas.get(agentId);
    if (!q) return 0.5; // neutral

    const ratio = q.achievedAed / q.targetAed;
    // If achieved 20%, deficit is 0.8; if achieved 100%, deficit is 0
    return Math.max(0, 1.0 - ratio);
  }

  /**
   * Selects candidate agent weighted by quota deficit
   * @param {Array<string>} candidateAgentIds
   * @returns {string|null} Chosen agentId
   */
  selectAgentByDeficit(candidateAgentIds = []) {
    if (!candidateAgentIds.length) return null;

    let selected = candidateAgentIds[0];
    let highestDeficit = -1;

    for (const id of candidateAgentIds) {
      const score = this.getDeficitScore(id);
      if (score > highestDeficit) {
        highestDeficit = score;
        selected = id;
      }
    }

    return selected;
  }
}

export default new TeamQuotaBalancingEngine();

