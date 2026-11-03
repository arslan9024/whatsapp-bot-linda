/**
 * @file VipLeadFastTrackEscalator.js
 * @description Fast-tracks high-value buyer inquiries directly to Managing Directors,
 * bypassing automated queues and triggering high-priority notifications.
 * Category: Outreach
 */

export class VipLeadFastTrackEscalator {
  constructor(config = {}) {
    this.vipBudgetThresholdAed = config.vipBudgetThresholdAed || 10000000; // 10M AED
  }

  /**
   * Tests whether an inquiry qualifies for fast-track escalation
   * @param {Object} lead
   * @returns {{ isVip: boolean, reason: string }}
   */
  checkFastTrack(lead = {}) {
    const budget = Number(lead.budgetAed || 0);

    if (budget >= this.vipBudgetThresholdAed) {
      return {
        isVip: true,
        reason: `Budget AED ${budget.toLocaleString()} meets or exceeds VIP threshold (10M+)`
      };
    }

    if (lead.isInstitutionalInvestor || lead.isFamilyOffice) {
      return {
        isVip: true,
        reason: 'Client identified as Institutional Investor / Family Office'
      };
    }

    return { isVip: false, reason: 'Standard queue routing applied' };
  }
}

export default new VipLeadFastTrackEscalator();
