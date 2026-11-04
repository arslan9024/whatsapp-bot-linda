/**
 * @file FurnishedRentalPremiumArbitrage.js
 * @description Models the return on investment of furnishing unfurnished apartments with turnkey designer packages to capture higher rental yield.
 * Category: 2️⃣ Domain / Feature (Market Economics)
 */

export class FurnishedRentalPremiumArbitrage {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.furnitureDepreciationYears = options.furnitureDepreciationYears || 4; // 4-year straight-line depreciation
  }

  /**
   * Evaluates furnishing capital expenditure arbitrage.
   * @param {Object} params
   * @param {number} params.unfurnishedRentAed
   * @param {number} params.projectedFurnishedRentAed
   * @param {number} params.furnishingCapexAed
   * @returns {Object}
   */
  evaluateFurnishingRoi({ unfurnishedRentAed, projectedFurnishedRentAed, furnishingCapexAed }) {
    const annualRentUpliftAed = projectedFurnishedRentAed - unfurnishedRentAed;
    const annualDepreciationAed = furnishingCapexAed / this.furnitureDepreciationYears;
    const netAnnualUpliftAed = annualRentUpliftAed - annualDepreciationAed;
    const cashOnCashRoiPct = furnishingCapexAed > 0 ? (annualRentUpliftAed / furnishingCapexAed) * 100 : 0;
    const paybackPeriodMonths = annualRentUpliftAed > 0 ? Math.round((furnishingCapexAed / annualRentUpliftAed) * 12) : 999;

    return {
      unfurnishedRentAed,
      projectedFurnishedRentAed,
      furnishingCapexAed,
      annualRentUpliftAed,
      netAnnualUpliftAfterDepreciationAed: Math.round(netAnnualUpliftAed),
      cashOnCashRoiPct: Number(cashOnCashRoiPct.toFixed(1)),
      paybackPeriodMonths,
      isFurnishingRecommended: paybackPeriodMonths <= 24,
      advisory: paybackPeriodMonths <= 18
        ? 'High Arbitrage: Furniture investment amortizes in under 18 months; recommended for high-turnover areas like Downtown and Marina.'
        : 'Marginal Uplift: Payback period exceeds 24 months; keep unfurnished to minimize tenant wear-and-tear liabilities.'
    };
  }
}

export default new FurnishedRentalPremiumArbitrage();
