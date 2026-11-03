/**
 * ExpatMortgageEstimator.js
 * 
 * Single responsibility: Model UAE Central Bank mortgage eligibility (20% downpayment for expats, 25-yr tenure).
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class ExpatMortgageEstimator {
  calculateMortgage({
    propertyPriceAed,
    interestRatePercent = 4.5,
    tenureYears = 25,
    isExpat = true,
  }) {
    if (!propertyPriceAed || propertyPriceAed <= 0) throw new Error('propertyPriceAed is required');

    // UAE Central Bank: Expat max LTV 80% (properties <= 5M), Nationals 85%
    const downpaymentRatio = isExpat ? 0.20 : 0.15;
    const minDownpaymentAed = Math.round(propertyPriceAed * downpaymentRatio);
    const loanAmountAed = propertyPriceAed - minDownpaymentAed;

    // Monthly payment formula: P * (r * (1 + r)^n) / ((1 + r)^n - 1)
    const monthlyRate = (interestRatePercent / 100) / 12;
    const totalPayments = tenureYears * 12;
    const monthlyInstallmentAed = Math.round(
      loanAmountAed * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / (Math.pow(1 + monthlyRate, totalPayments) - 1)
    );

    // DBR (Debt Burden Ratio): UAE law caps monthly loan installments at 50% of verified salary
    const minRequiredMonthlySalaryAed = monthlyInstallmentAed * 2;

    return {
      propertyPriceAed,
      loanAmountAed,
      minDownpaymentAed,
      downpaymentPercent: downpaymentRatio * 100,
      monthlyInstallmentAed,
      minRequiredMonthlySalaryAed,
      tenureYears,
      interestRatePercent,
    };
  }
}

export default new ExpatMortgageEstimator();

