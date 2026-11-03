/**
 * HolidayHomeVsEjariComparator.js
 * 
 * Single responsibility: Model and compare short-term Airbnb yields against long-term annual Ejari leases.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class HolidayHomeVsEjariComparator {
  compare({
    purchasePriceAed,
    estimatedDailyRateAed,
    occupancyRatePercent = 75,
    annualEjariRentAed,
    shortTermManagementFeePercent = 18, // DTCM licensing + operator cut
  }) {
    // 1. Short-term (Holiday Home) model
    const annualDays = 365;
    const occupiedNights = Math.round(annualDays * (occupancyRatePercent / 100));
    const grossShortTermAed = occupiedNights * estimatedDailyRateAed;
    const netShortTermAed = grossShortTermAed * (1 - (shortTermManagementFeePercent / 100));
    const shortTermNetYield = (netShortTermAed / purchasePriceAed) * 100;

    // 2. Long-term (Ejari) model (5% management fee)
    const netEjariAed = annualEjariRentAed * 0.95;
    const longTermNetYield = (netEjariAed / purchasePriceAed) * 100;

    const recommendation = shortTermNetYield > (longTermNetYield + 1.2) ? 'HOLIDAY_HOME_OPTIMAL' : 'LONG_TERM_EJARI_STABLE';

    return {
      purchasePriceAed,
      shortTerm: {
        annualGrossAed: grossShortTermAed,
        annualNetAed: Math.round(netShortTermAed),
        netYieldPercent: Number(shortTermNetYield.toFixed(2)),
        occupiedNights,
      },
      longTerm: {
        annualGrossAed: annualEjariRentAed,
        annualNetAed: Math.round(netEjariAed),
        netYieldPercent: Number(longTermNetYield.toFixed(2)),
      },
      yieldDifferencePercent: Number((shortTermNetYield - longTermNetYield).toFixed(2)),
      recommendation,
    };
  }
}

export default new HolidayHomeVsEjariComparator();

