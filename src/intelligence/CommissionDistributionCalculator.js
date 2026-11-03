/**
 * @file CommissionDistributionCalculator.js
 * @description Calculates gross real estate commissions, UAE VAT (5%), broker split tiers,
 * and listing/selling agent splits for Dubai property transactions.
 * Category: Intelligence
 */

export class CommissionDistributionCalculator {
  constructor(config = {}) {
    this.vatRate = config.vatRate ?? 0.05; // 5% UAE VAT
  }

  /**
   * Calculates detailed commission breakdown for a transaction
   * @param {Object} deal
   * @param {number} deal.dealValueAed
   * @param {'off_plan'|'secondary'} [deal.marketType] - 'off_plan' (typically 4-8% developer paid) or 'secondary' (2% seller + 2% buyer)
   * @param {number} [deal.commissionPercent] - Optional override (e.g. 2 for 2%, 5 for 5%)
   * @param {number} [deal.brokerSplitRatio] - e.g. 0.50 (50% to agent, 50% to brokerage)
   * @returns {Object} Full breakdown of amounts
   */
  calculateCommission(deal) {
    const { dealValueAed, marketType = 'secondary', commissionPercent, brokerSplitRatio = 0.50 } = deal;

    if (!dealValueAed || dealValueAed <= 0) {
      throw new Error('dealValueAed must be a positive number');
    }

    // Default commission rate: 2% for secondary (per side), 4% for off-plan developers
    const ratePercent = commissionPercent ?? (marketType === 'off_plan' ? 4.0 : 2.0);
    const grossCommissionAed = (dealValueAed * ratePercent) / 100;
    const vatAmountAed = grossCommissionAed * this.vatRate;
    const totalPayableWithVatAed = grossCommissionAed + vatAmountAed;

    const agentEarningsAed = grossCommissionAed * brokerSplitRatio;
    const brokerageGrossAed = grossCommissionAed * (1 - brokerSplitRatio);

    return {
      dealValueAed,
      marketType,
      commissionRatePercent: ratePercent,
      grossCommissionAed: Math.round(grossCommissionAed * 100) / 100,
      vatAmountAed: Math.round(vatAmountAed * 100) / 100,
      totalPayableWithVatAed: Math.round(totalPayableWithVatAed * 100) / 100,
      brokerSplitRatio,
      agentEarningsAed: Math.round(agentEarningsAed * 100) / 100,
      brokerageGrossAed: Math.round(brokerageGrossAed * 100) / 100
    };
  }
}

export default new CommissionDistributionCalculator();

