/**
 * @file OffPlanFlippingArbitrageScanner.js
 * @description Identifies off-plan contracts where developer minimum threshold (e.g. 30-40%) is satisfied and secondary spreads yield >15% annualized ROI on equity.
 * Category: 2️⃣ Domain / Feature (Market Economics)
 */

export class OffPlanFlippingArbitrageScanner {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.minPaidPercentage = options.minPaidPercentage || 30; // Standard DLD NOC requirement for resale
    this.transferFeeRate = options.transferFeeRate || 0.04; // 4% DLD fee
    this.adminFeeAed = options.adminFeeAed || 5000;
  }

  /**
   * Evaluates flipping arbitrage profitability.
   * @param {Object} params
   * @param {number} params.originalPriceAed
   * @param {number} params.percentPaid
   * @param {number} params.currentMarketPriceAed
   * @param {number} params.holdingPeriodMonths
   * @returns {Object}
   */
  evaluateFlippingArbitrage({ originalPriceAed, percentPaid, currentMarketPriceAed, holdingPeriodMonths = 12 }) {
    const isEligibleForResale = percentPaid >= this.minPaidPercentage;
    const equityInvested = originalPriceAed * (percentPaid / 100);
    const grossSpread = currentMarketPriceAed - originalPriceAed;
    const dldResaleFee = currentMarketPriceAed * this.transferFeeRate;
    const netProfit = grossSpread - dldResaleFee - this.adminFeeAed;
    const roiOnEquityPct = equityInvested > 0 ? (netProfit / equityInvested) * 100 : 0;
    const annualizedRoiPct = holdingPeriodMonths > 0 ? (roiOnEquityPct * (12 / holdingPeriodMonths)) : roiOnEquityPct;

    return {
      originalPriceAed,
      percentPaid,
      equityInvested,
      currentMarketPriceAed,
      grossSpread,
      netProfit: Math.round(netProfit),
      roiOnEquityPct: Number(roiOnEquityPct.toFixed(2)),
      annualizedRoiPct: Number(annualizedRoiPct.toFixed(2)),
      isEligibleForResale,
      isHighArbitrageCandidate: isEligibleForResale && annualizedRoiPct >= 15,
      recommendation: !isEligibleForResale
        ? `Ineligible for resale. Requires additional ${(this.minPaidPercentage - percentPaid).toFixed(1)}% payment to reach DLD NOC threshold.`
        : annualizedRoiPct >= 15
          ? 'Prime Flip Candidate: Premium spread exceeds 15% annualized target.'
          : 'Hold: Spread margin below target flip hurdle.'
    };
  }
}

export default new OffPlanFlippingArbitrageScanner();
