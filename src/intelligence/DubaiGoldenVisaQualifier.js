/**
 * DubaiGoldenVisaQualifier.js
 * 
 * Single responsibility: Validate investor purchase amounts against the UAE 2,000,000 AED Golden Visa threshold.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const GOLDEN_VISA_THRESHOLD_AED = 2000000;

export class DubaiGoldenVisaQualifier {
  evaluateEligibility(totalPropertyInvestmentAed = 0, isMortgage = false, equityPaidAed = null) {
    const effectiveInvestment = isMortgage && equityPaidAed !== null ? equityPaidAed : totalPropertyInvestmentAed;
    const qualifies = effectiveInvestment >= GOLDEN_VISA_THRESHOLD_AED;
    const difference = GOLDEN_VISA_THRESHOLD_AED - effectiveInvestment;

    return {
      qualifies,
      thresholdAed: GOLDEN_VISA_THRESHOLD_AED,
      totalInvestmentAed: totalPropertyInvestmentAed,
      effectiveInvestmentAed: effectiveInvestment,
      remainingRequiredAed: qualifies ? 0 : Math.max(0, difference),
      visaType: qualifies ? '10_YEAR_RENEWABLE_GOLDEN_VISA' : 'STANDARD_RESIDENCY_OR_INVESTOR_VISA',
      benefits: qualifies
        ? ['10-year residency for investor and family', '100% foreign business ownership', 'No continuous 6-month stay restriction outside UAE']
        : ['Standard 2-year property investor visa available for investments over 750,000 AED'],
    };
  }
}

export default new DubaiGoldenVisaQualifier();
