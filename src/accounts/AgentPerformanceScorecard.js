/**
 * @file AgentPerformanceScorecard.js
 * @description Evaluates human broker performance metrics (response speed, viewing completion,
 * deal closure rate) to dynamically adjust lead allocation and round-robin weighting.
 * Category: Accounts
 */

export class AgentPerformanceScorecard {
  constructor() {
    this.agentStats = new Map();
  }

  /**
   * Initializes or fetches stats container for an agent
   * @param {string} agentId
   * @returns {Object}
   */
  getOrCreateStats(agentId) {
    if (!this.agentStats.has(agentId)) {
      this.agentStats.set(agentId, {
        agentId,
        leadsAssigned: 0,
        leadsContactedUnder15m: 0,
        totalResponseMinutes: 0,
        viewingsBooked: 0,
        dealsClosed: 0,
        clientRatings: []
      });
    }
    return this.agentStats.get(agentId);
  }

  /**
   * Records a response event from a broker to a handed-off lead
   * @param {string} agentId
   * @param {number} responseMinutes
   */
  recordResponseTime(agentId, responseMinutes) {
    const st = this.getOrCreateStats(agentId);
    st.leadsAssigned++;
    st.totalResponseMinutes += responseMinutes;
    if (responseMinutes <= 15) {
      st.leadsContactedUnder15m++;
    }
  }

  /**
   * Records a deal conversion milestone
   * @param {string} agentId
   * @param {'viewing'|'deal'} type
   */
  recordConversion(agentId, type) {
    const st = this.getOrCreateStats(agentId);
    if (type === 'viewing') st.viewingsBooked++;
    if (type === 'deal') st.dealsClosed++;
  }

  /**
   * Computes an overall composite performance score (0 - 100)
   * @param {string} agentId
   * @returns {Object} Performance metrics and composite score
   */
  calculateScorecard(agentId) {
    const st = this.getOrCreateStats(agentId);
    if (st.leadsAssigned === 0) {
      return { agentId, compositeScore: 50, avgResponseMinutes: 0, slaComplianceRate: 100 };
    }

    const avgResponse = Math.round((st.totalResponseMinutes / st.leadsAssigned) * 10) / 10;
    const slaComplianceRate = Math.round((st.leadsContactedUnder15m / st.leadsAssigned) * 100);
    const viewingRate = Math.round((st.viewingsBooked / st.leadsAssigned) * 100);
    const dealRate = Math.round((st.dealsClosed / st.leadsAssigned) * 100);

    // Composite: 40% SLA, 35% Viewing, 25% Deal Close
    const compositeScore = Math.min(100, Math.round(
      (slaComplianceRate * 0.40) +
      (Math.min(100, viewingRate * 2.5) * 0.35) +
      (Math.min(100, dealRate * 5) * 0.25)
    ));

    return {
      agentId,
      compositeScore,
      leadsAssigned: st.leadsAssigned,
      avgResponseMinutes: avgResponse,
      slaComplianceRate,
      viewingsBooked: st.viewingsBooked,
      dealsClosed: st.dealsClosed
    };
  }
}

export default new AgentPerformanceScorecard();

