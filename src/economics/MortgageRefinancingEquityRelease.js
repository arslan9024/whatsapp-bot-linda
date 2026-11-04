/**
 * @file MortgageRefinancingEquityRelease.js
 * @description Estimates cash-out equity release potential and restructuring savings for capital-appreciated properties under UAE Central Bank mortgage regulations.
 * Category: 2️⃣ Domain / Feature (Market Economics)
 */

export class MortgageRefinancingEquityRelease {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.maxLtvExpatsPct = options.maxLtvExpatsPct || 80; // UAE Central Bank 80% LTV for properties under 5M AED
    this.maxLtvSecondPropertyPct = options.maxLtvSecondPropertyPct || 60; // 60% for subsequent properties
  }

  /**
   * Calculates releasable equity through refinancing.
   * @param {Object} params
   * @param {number} params.currentPropertyValueAed
   * @param {number} params.outstandingMortgageBalanceAed
   * @param {boolean} [params.isPrimaryResidence=true]
   * @returns {Object}
   */
  estimateEquityRelease({
    currentPropertyValueAed,
    outstandingMortgageBalanceAed,
    isPrimaryResidence = true
  }) {
    const applicableLtvPct = isPrimaryResidence ? this.maxLtvExpatsPct : this.maxLtvSecondPropertyPct;
    const maxAllowableBorrowingAed = currentPropertyValueAed * (applicableLtvPct / 100);
    const grossCashOutAed = Math.max(0, maxAllowableBorrowingAed - outstandingMortgageBalanceAed);
    const estimatedDldRefinanceMortgageFeeAed = maxAllowableBorrowingAed * 0.0025 + 290; // 0.25% DLD mortgage registration
    const bankValuationAndAdminFeeAed = 5500;
    const netCashOutEquityAed = Math.max(0, grossCashOutAed - estimatedDldRefinanceMortgageFeeAed - bankValuationAndAdminFeeAed);

    return {
      currentPropertyValueAed,
      outstandingMortgageBalanceAed,
      applicableLtvPct,
      maxAllowableBorrowingAed: Math.round(maxAllowableBorrowingAed),
      grossCashOutAed: Math.round(grossCashOutAed),
      netCashOutEquityAed: Math.round(netCashOutEquityAed),
      refinancingCostsTotalAed: Math.round(estimatedDldRefinanceMortgageFeeAed + bankValuationAndAdminFeeAed),
      isRefinancingViable: netCashOutEquityAed >= 150000,
      strategicGuidance: netCashOutEquityAed >= 250000
        ? `Liquidity Unlocked: Releasing AED ${Math.round(netCashOutEquityAed).toLocaleString()} provides sufficient down payment for a secondary high-yield off-plan unit.`
        : 'Hold Mortgage: Equity appreciation spread is too tight to justify bank and DLD refinancing friction costs.'
    };
  }
}

export default new MortgageRefinancingEquityRelease();
