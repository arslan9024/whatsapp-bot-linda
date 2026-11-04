/**
 * @file SupplyWaveImpactAnalyzer.js
 * @description Models the rental dilution and pricing drag triggered when thousands of off-plan units hand over simultaneously in a submarket.
 * Category: 2️⃣ Domain / Feature (Market Economics)
 */

export class SupplyWaveImpactAnalyzer {
  /**
   * Assesses supply influx shock on sub-market rental rates and vacancy.
   * @param {Object} params
   * @param {string} params.submarket
   * @param {number} params.existingStockUnits
   * @param {number} params.upcomingHandoverUnits
   * @param {number} params.currentAverageRentAed
   * @param {number} [params.annualAbsorptionCapacityUnits=3000]
   * @returns {Object}
   */
  assessSupplyWave({
    submarket,
    existingStockUnits,
    upcomingHandoverUnits,
    currentAverageRentAed,
    annualAbsorptionCapacityUnits = 3000
  }) {
    const supplyExpansionPct = existingStockUnits > 0 ? (upcomingHandoverUnits / existingStockUnits) * 100 : 0;
    const oversupplyRatio = annualAbsorptionCapacityUnits > 0 ? upcomingHandoverUnits / annualAbsorptionCapacityUnits : 1;

    let projectedRentDragPct = 0;
    if (oversupplyRatio > 2.0) projectedRentDragPct = 12.5;
    else if (oversupplyRatio > 1.4) projectedRentDragPct = 7.0;
    else if (oversupplyRatio > 1.0) projectedRentDragPct = 3.5;
    else projectedRentDragPct = 0;

    const adjustedRentAed = Math.round(currentAverageRentAed * (1 - (projectedRentDragPct / 100)));

    return {
      submarket: submarket || 'Sector',
      existingStockUnits,
      upcomingHandoverUnits,
      supplyExpansionPct: Number(supplyExpansionPct.toFixed(1)),
      oversupplyRatio: Number(oversupplyRatio.toFixed(2)),
      projectedRentDragPct,
      currentAverageRentAed,
      adjustedRentPostHandoverAed: adjustedRentAed,
      absorptionRiskTier: oversupplyRatio > 1.5 ? 'HIGH_SUPPLY_OVERHANG' : oversupplyRatio > 1.0 ? 'MODERATE_ABSORPTION_DRAG' : 'BALANCED_HEALTHY_PIPELINE',
      landlordPlaybook: oversupplyRatio > 1.2
        ? 'Defensive Leasing: Secure long-term 2-year leases or offer 12-cheque incentives ahead of cluster handover wave.'
        : 'Bullish Expansion: Supply pipeline easily absorbed by tenant migration.'
    };
  }
}

export default new SupplyWaveImpactAnalyzer();
