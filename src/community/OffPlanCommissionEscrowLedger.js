/**
 * @file OffPlanCommissionEscrowLedger.js
 * @description Manages internal and partner co-broking commission reconciliation for off-plan deals across master developer stage payment disbursements (e.g. 50% on SPA, 50% on handover).
 * Category: 2️⃣ Domain / Feature (Community Intelligence)
 */

export class OffPlanCommissionEscrowLedger {
  /**
   * Records deal commission milestones.
   * @param {Object} dealData
   * @param {string} dealData.dealId
   * @param {string} dealData.developerName
   * @param {number} dealData.saleValueAed
   * @param {number} [dealData.totalCommissionPct=5.0]
   * @param {string} [dealData.partnerBrokerAgency='Self']
   * @param {number} [dealData.partnerSplitPct=50]
   * @returns {Object}
   */
  recordDealCommission({
    dealId,
    developerName,
    saleValueAed,
    totalCommissionPct = 5.0,
    partnerBrokerAgency = 'Self',
    partnerSplitPct = 50
  }) {
    const totalCommissionAed = saleValueAed * (totalCommissionPct / 100);
    const hasExternalPartner = partnerBrokerAgency !== 'Self';
    const partnerShareAed = hasExternalPartner ? totalCommissionAed * (partnerSplitPct / 100) : 0;
    const houseShareAed = totalCommissionAed - partnerShareAed;

    return {
      dealId,
      developerName,
      saleValueAed,
      totalCommissionAed: Math.round(totalCommissionAed),
      partnerBrokerAgency,
      partnerShareAed: Math.round(partnerShareAed),
      houseShareAed: Math.round(houseShareAed),
      tranches: [
        { tranche: 'Tranche 1 (SPA Execution & 10% Paid)', percent: 50, amountAed: Math.round(totalCommissionAed * 0.5), status: 'PENDING_DEVELOPER_INVOICE' },
        { tranche: 'Tranche 2 (20% Escrow Milestone / Slab Completion)', percent: 50, amountAed: Math.round(totalCommissionAed * 0.5), status: 'SCHEDULED_MILESTONE' }
      ]
    };
  }
}

export default new OffPlanCommissionEscrowLedger();
