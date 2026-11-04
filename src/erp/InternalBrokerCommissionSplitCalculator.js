/**
 * @file InternalBrokerCommissionSplitCalculator.js
 * @description Models multi-tier agency commission splits between listing agent, buyer agent, team lead overrides, and brokerage house retention.
 * Category: 2️⃣ Domain / Feature (Brokerage ERP & Legal MOU)
 */

export class InternalBrokerCommissionSplitCalculator {
  /**
   * Calculates internal agency commission waterfall.
   * @param {Object} dealCommission
   * @param {number} dealCommission.totalAgencyGrossCommissionAed
   * @param {number} [dealCommission.listingAgentSplitPct=50]
   * @param {number} [dealCommission.teamLeadOverridePct=5]
   * @param {number} [dealCommission.brokerageHouseSharePct=40]
   * @returns {Object}
   */
  calculateInternalSplit(dealCommission) {
    const gross = dealCommission.totalAgencyGrossCommissionAed;
    const houseSplitPct = dealCommission.brokerageHouseSharePct || 40;
    const houseShareAed = Math.round(gross * (houseSplitPct / 100));

    const distributablePoolAed = gross - houseShareAed;
    const teamLeadOverridePct = dealCommission.teamLeadOverridePct || 5;
    const teamLeadOverrideAed = Math.round(gross * (teamLeadOverridePct / 100));

    const agentPoolAed = Math.max(0, distributablePoolAed - teamLeadOverrideAed);
    const listingAgentSplitPct = dealCommission.listingAgentSplitPct || 50;
    const listingAgentPayoutAed = Math.round(agentPoolAed * (listingAgentSplitPct / 100));
    const buyerAgentPayoutAed = agentPoolAed - listingAgentPayoutAed;

    return {
      grossCommissionAed: gross,
      houseRetentionAed: houseShareAed,
      teamLeadOverrideAed,
      listingAgentPayoutAed,
      buyerAgentPayoutAed,
      totalPayoutsAed: houseShareAed + teamLeadOverrideAed + listingAgentPayoutAed + buyerAgentPayoutAed,
      settlementStatus: 'SCHEDULED_FOR_PAYROLL_CLEARING'
    };
  }
}

export default new InternalBrokerCommissionSplitCalculator();
