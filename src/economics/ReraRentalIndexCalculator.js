/**
 * @file ReraRentalIndexCalculator.js
 * @description Implements Decree No. (43) of 2013 regulating rent increases in Dubai based on official RERA benchmark rates.
 * Category: 2️⃣ Domain / Feature (Market Economics)
 */

export class ReraRentalIndexCalculator {
  /**
   * Calculates allowable rent increase pursuant to Dubai Decree No. 43 of 2013.
   * @param {Object} params
   * @param {number} params.currentContractRentAed
   * @param {number} params.reraBenchmarkAverageRentAed
   * @returns {Object}
   */
  calculateAllowableIncrease({ currentContractRentAed, reraBenchmarkAverageRentAed }) {
    if (reraBenchmarkAverageRentAed <= 0 || currentContractRentAed <= 0) {
      return { allowableIncreasePct: 0, maxNewRentAed: currentContractRentAed, isIncreasePermitted: false };
    }

    const discountFromBenchmarkPct = ((reraBenchmarkAverageRentAed - currentContractRentAed) / reraBenchmarkAverageRentAed) * 100;

    let allowableIncreasePct = 0;
    if (discountFromBenchmarkPct > 40) {
      allowableIncreasePct = 20; // 20% max if rent is >40% below benchmark
    } else if (discountFromBenchmarkPct > 30) {
      allowableIncreasePct = 15; // 15% if 31-40% below
    } else if (discountFromBenchmarkPct > 20) {
      allowableIncreasePct = 10; // 10% if 21-30% below
    } else if (discountFromBenchmarkPct >= 11) {
      allowableIncreasePct = 5;  // 5% if 11-20% below
    } else {
      allowableIncreasePct = 0;  // 0% if up to 10% below or equal/higher
    }

    const increaseAmountAed = Math.round(currentContractRentAed * (allowableIncreasePct / 100));
    const maxNewRentAed = currentContractRentAed + increaseAmountAed;

    return {
      currentContractRentAed,
      reraBenchmarkAverageRentAed,
      discountFromBenchmarkPct: Number(discountFromBenchmarkPct.toFixed(1)),
      allowableIncreasePct,
      increaseAmountAed,
      maxNewRentAed,
      isIncreasePermitted: allowableIncreasePct > 0,
      legalNoticeRequirementDays: 90,
      legalAdvice: allowableIncreasePct > 0
        ? `Landlord may legally increase rent by ${allowableIncreasePct}% (AED ${increaseAmountAed}), provided written notice was served 90 days before contract expiry.`
        : 'Rent cannot be legally increased; current contract is within 10% or above official RERA benchmark index.'
    };
  }
}

export default new ReraRentalIndexCalculator();
