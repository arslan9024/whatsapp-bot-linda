/**
 * @file BulkMultiUnitPortfolioModeler.js
 * @description Models consolidated cash flows, volume discount elasticity, and blended cap rates for institutional bulk acquisitions (full floors / multi-unit blocks).
 * Category: 2️⃣ Domain / Feature (Market Economics)
 */

export class BulkMultiUnitPortfolioModeler {
  /**
   * Models bulk package acquisition economics.
   * @param {Object} params
   * @param {Array<{ unitType: string, count: number, retailPriceAed: number, projectedRentAed: number, serviceChargeAed: number }>} params.units
   * @param {number} [params.developerBulkDiscountPct=7.5]
   * @returns {Object}
   */
  modelBulkPortfolio({ units = [], developerBulkDiscountPct = 7.5 }) {
    let totalUnits = 0;
    let totalRetailPriceAed = 0;
    let totalGrossAnnualRentAed = 0;
    let totalServiceChargeAed = 0;

    for (const u of units) {
      totalUnits += u.count;
      totalRetailPriceAed += u.count * u.retailPriceAed;
      totalGrossAnnualRentAed += u.count * u.projectedRentAed;
      totalServiceChargeAed += u.count * u.serviceChargeAed;
    }

    const discountedAcquisitionPriceAed = totalRetailPriceAed * (1 - (developerBulkDiscountPct / 100));
    const netOperatingIncomeAed = totalGrossAnnualRentAed - totalServiceChargeAed;
    const retailGrossYieldPct = totalRetailPriceAed > 0 ? (totalGrossAnnualRentAed / totalRetailPriceAed) * 100 : 0;
    const retailNetYieldPct = totalRetailPriceAed > 0 ? (netOperatingIncomeAed / totalRetailPriceAed) * 100 : 0;
    const bulkDiscountedNetYieldPct = discountedAcquisitionPriceAed > 0 ? (netOperatingIncomeAed / discountedAcquisitionPriceAed) * 100 : 0;
    const yieldExpansionBasisPoints = Math.round((bulkDiscountedNetYieldPct - retailNetYieldPct) * 100);

    return {
      totalUnits,
      retailPriceTotalAed: Math.round(totalRetailPriceAed),
      developerBulkDiscountPct,
      negotiatedBulkPriceAed: Math.round(discountedAcquisitionPriceAed),
      totalSavingsAed: Math.round(totalRetailPriceAed - discountedAcquisitionPriceAed),
      projectedAnnualNoiAed: Math.round(netOperatingIncomeAed),
      retailGrossYieldPct: Number(retailGrossYieldPct.toFixed(2)),
      retailNetYieldPct: Number(retailNetYieldPct.toFixed(2)),
      blendedNetCapRatePct: Number(bulkDiscountedNetYieldPct.toFixed(2)),
      yieldExpansionBasisPoints,
      institutionalGradeRecommendation: totalUnits >= 10 && yieldExpansionBasisPoints > 50
        ? 'Institutional Alpha Buy: Bulk discount creates instant 50+ bps cap rate expansion.'
        : 'Standard Acquisition: Retail bundling yields standard margins.'
    };
  }
}

export default new BulkMultiUnitPortfolioModeler();
