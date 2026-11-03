/**
 * RentalRoiCalculator.js
 * 
 * Single responsibility: Calculate gross and net rental yield taking into account Dubai service charges.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class RentalRoiCalculator {
  calculateYield({
    purchasePriceAed,
    annualRentAed,
    serviceChargeAnnualAed = 0,
    managementFeePercent = 5, // 5% standard agency management fee
  }) {
    if (!purchasePriceAed || purchasePriceAed <= 0) {
      throw new Error('Valid purchasePriceAed is required');
    }

    const grossYield = (annualRentAed / purchasePriceAed) * 100;
    const managementFee = (annualRentAed * (managementFeePercent / 100));
    const totalExpenses = serviceChargeAnnualAed + managementFee;
    const netIncome = Math.max(0, annualRentAed - totalExpenses);
    const netYield = (netIncome / purchasePriceAed) * 100;

    return {
      purchasePriceAed,
      annualRentAed,
      grossYieldPercent: Number(grossYield.toFixed(2)),
      netYieldPercent: Number(netYield.toFixed(2)),
      annualNetIncomeAed: Math.round(netIncome),
      expensesBreakdown: {
        serviceCharges: serviceChargeAnnualAed,
        managementFee: Math.round(managementFee),
        totalExpenses: Math.round(totalExpenses),
      },
    };
  }
}

export default new RentalRoiCalculator();
