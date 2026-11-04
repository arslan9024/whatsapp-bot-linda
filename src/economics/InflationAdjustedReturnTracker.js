/**
 * @file InflationAdjustedReturnTracker.js
 * @description Compares net UAE real estate yield returns against US Treasuries (risk-free hurdle), global inflation, and physical gold.
 * Category: 2️⃣ Domain / Feature (Market Economics)
 */

export class InflationAdjustedReturnTracker {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.benchmarks = options.benchmarks || {
      us10YearTreasuryYieldPct: 4.25,
      uaeInflationRatePct: 2.8,
      goldAnnualized5YearReturnPct: 7.8
    };
  }

  /**
   * Compares real estate asset yield against global alternative asset classes.
   * @param {Object} propertyReturn
   * @param {number} propertyReturn.netRentalYieldPct
   * @param {number} propertyReturn.expectedCapitalGrowthPct
   * @returns {Object}
   */
  compareRealReturns({ netRentalYieldPct, expectedCapitalGrowthPct }) {
    const nominalTotalReturnPct = netRentalYieldPct + expectedCapitalGrowthPct;
    const realReturnAfterInflationPct = nominalTotalReturnPct - this.benchmarks.uaeInflationRatePct;
    const spreadOverTreasuriesPct = netRentalYieldPct - this.benchmarks.us10YearTreasuryYieldPct;
    const alphaOverGoldPct = nominalTotalReturnPct - this.benchmarks.goldAnnualized5YearReturnPct;

    return {
      propertyNominalReturnPct: Number(nominalTotalReturnPct.toFixed(2)),
      propertyRealReturnPct: Number(realReturnAfterInflationPct.toFixed(2)),
      benchmarks: this.benchmarks,
      spreadOverUsTreasuriesPct: Number(spreadOverTreasuriesPct.toFixed(2)),
      alphaOverGoldPct: Number(alphaOverGoldPct.toFixed(2)),
      isRealYieldPositive: realReturnAfterInflationPct > 0,
      hedgingAssessment: spreadOverTreasuriesPct > 2.0
        ? 'Super-Hurdle Alpha: Real estate cash yield beats US Treasury risk-free hurdle by over 200 bps.'
        : 'Marginal Carry: Cash spread over sovereign debt is tight; relies on capital upside.'
    };
  }
}

export default new InflationAdjustedReturnTracker();
