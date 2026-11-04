/**
 * @file AgentPerformanceScorecard.js
 * @description Evaluates individual broker performance metrics (Gross Commission Income GCI, deals closed, speed-to-lead, and client Net Promoter Score NPS).
 * Category: 2️⃣ Domain / Feature (Brokerage ERP & Legal MOU)
 */

export class AgentPerformanceScorecard {
  /**
   * Generates broker scorecard.
   * @param {Object} brokerMetrics
   * @param {string} brokerMetrics.agentId
   * @param {string} brokerMetrics.agentName
   * @param {number} brokerMetrics.gciEarnedAed
   * @param {number} brokerMetrics.dealsClosedCount
   * @param {number} brokerMetrics.leadsAssignedCount
   * @param {number} [brokerMetrics.clientNpsScore=9] (0 to 10)
   * @returns {Object}
   */
  evaluateBroker(brokerMetrics) {
    const conversionRatePct = brokerMetrics.leadsAssignedCount > 0
      ? (brokerMetrics.dealsClosedCount / brokerMetrics.leadsAssignedCount) * 100
      : 0;

    let tier = 'BRONZE_PRODUCER';
    if (brokerMetrics.gciEarnedAed >= 1000000) tier = 'PRESIDENTS_CLUB_DIAMOND';
    else if (brokerMetrics.gciEarnedAed >= 500000) tier = 'PLATINUM_PRODUCER';
    else if (brokerMetrics.gciEarnedAed >= 250000) tier = 'GOLD_PRODUCER';

    return {
      agentId: brokerMetrics.agentId,
      agentName: brokerMetrics.agentName,
      totalGciAed: brokerMetrics.gciEarnedAed,
      dealsClosed: brokerMetrics.dealsClosedCount,
      leadsAssigned: brokerMetrics.leadsAssignedCount,
      conversionRatePct: Number(conversionRatePct.toFixed(1)),
      clientNpsScore: brokerMetrics.clientNpsScore || 9,
      performanceTier: tier,
      isTopTierProducer: tier.includes('PLATINUM') || tier.includes('DIAMOND')
    };
  }
}

export default new AgentPerformanceScorecard();
