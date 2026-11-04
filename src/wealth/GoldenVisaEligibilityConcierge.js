/**
 * @file GoldenVisaEligibilityConcierge.js
 * @description Audits property equity and title deed status for the UAE 10-Year Real Estate Golden Visa (AED 2,000,000 threshold).
 * Category: 2️⃣ Domain / Feature (Cross-Border Wealth)
 */

export class GoldenVisaEligibilityConcierge {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.goldenVisaThresholdAed = options.goldenVisaThresholdAed || 2000000;
  }

  /**
   * Assesses buyer eligibility for 10-year Golden Visa.
   * @param {Object} params
   * @param {number} params.totalPropertyPortfolioValueAed
   * @param {number} params.totalEquityPaidAed
   * @param {boolean} [params.isOffPlan=false]
   * @param {boolean} [params.hasOqoodOrTitleDeed=true]
   * @returns {Object}
   */
  assessEligibility({
    totalPropertyPortfolioValueAed,
    totalEquityPaidAed,
    isOffPlan = false,
    hasOqoodOrTitleDeed = true
  }) {
    const meetsPortfolioValue = totalPropertyPortfolioValueAed >= this.goldenVisaThresholdAed;
    const meetsEquityThreshold = totalEquityPaidAed >= this.goldenVisaThresholdAed;
    const isEligible = meetsPortfolioValue && meetsEquityThreshold && hasOqoodOrTitleDeed;

    const shortfallAed = Math.max(0, this.goldenVisaThresholdAed - totalEquityPaidAed);

    return {
      totalPropertyPortfolioValueAed,
      totalEquityPaidAed,
      requiredThresholdAed: this.goldenVisaThresholdAed,
      meetsPortfolioValue,
      meetsEquityThreshold,
      hasOqoodOrTitleDeed,
      isEligible,
      shortfallAed,
      visaType: '10-Year Renewable Real Estate Golden Visa',
      benefits: [
        '10-year residency without local sponsor',
        'Right to stay outside UAE for over 6 months without visa cancellation',
        'Sponsorship of spouse, children (any age), and domestic staff',
        'Direct pathway to Esaad Privilege Discount Card'
      ],
      actionRequired: isEligible
        ? 'Proceed to DLD Cube VIP or GDRFA for fast-track Golden Visa nomination.'
        : `Invest additional AED ${shortfallAed.toLocaleString()} in qualifying property equity to unlock 10-year residency.`
    };
  }
}

export default new GoldenVisaEligibilityConcierge();
