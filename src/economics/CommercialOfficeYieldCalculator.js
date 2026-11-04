/**
 * @file CommercialOfficeYieldCalculator.js
 * @description Models commercial Grade-A office lease economics, including service charge splits, fit-out amortization, VAT compliance, and corporate tenant covenant strength.
 * Category: 2️⃣ Domain / Feature (Market Economics)
 */

export class CommercialOfficeYieldCalculator {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.commercialVatRatePct = options.commercialVatRatePct || 5.0; // 5% UAE VAT applies to commercial real estate
  }

  /**
   * Calculates commercial office net yield.
   * @param {Object} params
   * @param {number} params.purchasePriceAed
   * @param {number} params.annualBaseRentAed
   * @param {number} params.annualServiceChargeAed
   * @param {number} [params.fitOutContributionAed=0]
   * @param {number} [params.leaseTermYears=3]
   * @param {string} [params.district='DIFC']
   * @returns {Object}
   */
  calculateOfficeYield({
    purchasePriceAed,
    annualBaseRentAed,
    annualServiceChargeAed,
    fitOutContributionAed = 0,
    leaseTermYears = 3,
    district = 'DIFC'
  }) {
    const annualFitOutAmortizationAed = leaseTermYears > 0 ? fitOutContributionAed / leaseTermYears : 0;
    const netOperatingIncomeAed = annualBaseRentAed - annualServiceChargeAed - annualFitOutAmortizationAed;
    const grossYieldPct = purchasePriceAed > 0 ? (annualBaseRentAed / purchasePriceAed) * 100 : 0;
    const netYieldPct = purchasePriceAed > 0 ? (netOperatingIncomeAed / purchasePriceAed) * 100 : 0;
    const vatCollectableAnnualAed = annualBaseRentAed * (this.commercialVatRatePct / 100);

    return {
      district,
      purchasePriceAed,
      annualBaseRentAed,
      grossYieldPct: Number(grossYieldPct.toFixed(2)),
      netYieldPct: Number(netYieldPct.toFixed(2)),
      annualNoiAed: Math.round(netOperatingIncomeAed),
      annualVatAed: Math.round(vatCollectableAnnualAed),
      leaseTermYears,
      commercialTier: netYieldPct >= 7.5 ? 'PRIME_INSTITUTIONAL_CASH_FLOW' : netYieldPct >= 5.5 ? 'STABLE_CORE_COMMERCIAL' : 'VALUE_ADD_REPOSITIONING'
    };
  }
}

export default new CommercialOfficeYieldCalculator();
