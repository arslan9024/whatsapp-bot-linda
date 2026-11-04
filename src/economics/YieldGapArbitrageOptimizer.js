/**
 * @file YieldGapArbitrageOptimizer.js
 * @description Analyzes the spread between high-cash-yield communities (JVC, Arjan) vs capital appreciation prime hubs (Downtown, Palm), adjusting for vacancy, service charges, and tenant churn.
 * Category: 2️⃣ Domain / Feature (Market Economics)
 */

export class YieldGapArbitrageOptimizer {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.defaultChurnCostMonths = options.defaultChurnCostMonths || 1; // 1 month vacancy per turnover
  }

  /**
   * Compares two property investment profiles for net yield vs capital appreciation arbitrage.
   * @param {Object} propA High yield asset (e.g. JVC 1BR)
   * @param {Object} propB Prime capital asset (e.g. Downtown 1BR)
   * @returns {Object}
   */
  compareYieldGap(propA, propB) {
    const calcNet = (p) => {
      const grossRent = p.annualRentAed || 0;
      const price = p.purchasePriceAed || 1;
      const serviceCharges = p.annualServiceChargeAed || 0;
      const vacancyRate = p.vacancyRatePct ? p.vacancyRatePct / 100 : 0.05; // 5% default
      const effectiveRent = grossRent * (1 - vacancyRate) - serviceCharges;
      const grossYield = (grossRent / price) * 100;
      const netYield = Math.max(0, (effectiveRent / price) * 100);
      const projectedAppreciation = p.expectedAnnualAppreciationPct || 3;
      const totalReturn = netYield + projectedAppreciation;

      return {
        name: p.name || 'Property',
        purchasePriceAed: price,
        grossYieldPct: Number(grossYield.toFixed(2)),
        netYieldPct: Number(netYield.toFixed(2)),
        projectedAppreciationPct: projectedAppreciation,
        totalReturnPct: Number(totalReturn.toFixed(2))
      };
    };

    const resA = calcNet(propA);
    const resB = calcNet(propB);
    const netYieldSpread = Number((resA.netYieldPct - resB.netYieldPct).toFixed(2));
    const totalReturnSpread = Number((resA.totalReturnPct - resB.totalReturnPct).toFixed(2));

    return {
      assetA: resA,
      assetB: resB,
      netYieldSpreadPct: netYieldSpread,
      totalReturnSpreadPct: totalReturnSpread,
      dominantCashFlowAsset: netYieldSpread >= 0 ? resA.name : resB.name,
      dominantTotalReturnAsset: totalReturnSpread >= 0 ? resA.name : resB.name,
      arbitrageStrategy: netYieldSpread > 2.5
        ? `Cash Flow Play: ${resA.name} provides a ${netYieldSpread}% net income premium.`
        : `Balanced Play: Tight spread (${netYieldSpread}%); appreciation favors ${resB.name}.`
    };
  }
}

export default new YieldGapArbitrageOptimizer();
