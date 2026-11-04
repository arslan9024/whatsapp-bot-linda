/**
 * @file CurrencyHedgedReturnModeler.js
 * @description Models foreign exchange risk and forward contract hedging costs for international investors converting EUR, GBP, or INR into USD-pegged AED.
 * Category: 2️⃣ Domain / Feature (Market Economics)
 */

export class CurrencyHedgedReturnModeler {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.usdPegRate = 3.6725; // Official UAE Dirham to USD peg
    this.annualForwardHedgingCostsPct = options.annualForwardHedgingCostsPct || {
      'EUR': 1.6, // Cost of EUR/USD forward hedge
      'GBP': 1.8, // Cost of GBP/USD forward hedge
      'INR': 4.2, // Cost of INR/USD forward hedge
      'RUB': 7.5  // Cost of RUB/USD forward hedge
    };
  }

  /**
   * Models net returns after foreign currency hedging.
   * @param {Object} params
   * @param {string} params.baseCurrency ('EUR', 'GBP', 'INR', 'RUB')
   * @param {number} params.nominalAedYieldPct
   * @param {number} [params.expectedCurrencyDepreciationVsUsdPct=0]
   * @returns {Object}
   */
  modelHedgedReturn({ baseCurrency, nominalAedYieldPct, expectedCurrencyDepreciationVsUsdPct = 0 }) {
    const curr = (baseCurrency || 'EUR').toUpperCase().trim();
    const hedgeCostPct = this.annualForwardHedgingCostsPct[curr] || 2.0;

    const hedgedNetYieldPct = Math.max(0, nominalAedYieldPct - hedgeCostPct);
    const unhedgedProjectedHomeYieldPct = nominalAedYieldPct + expectedCurrencyDepreciationVsUsdPct;

    return {
      baseCurrency: curr,
      nominalAedYieldPct,
      annualFxHedgeCostPct: hedgeCostPct,
      hedgedNetYieldPct: Number(hedgedNetYieldPct.toFixed(2)),
      unhedgedProjectedHomeYieldPct: Number(unhedgedProjectedHomeYieldPct.toFixed(2)),
      usdPegAdvantage: 'AED is 100% pegged to USD (3.6725), providing dollar-denominated asset security with zero dollar exchange volatility.',
      hedgingRecommendation: hedgeCostPct > 3.5
        ? 'Unhedged Advantage: High forward hedge drag makes holding unhedged USD/AED more accretive over 5+ year horizons.'
        : 'Cost-Effective Hedge: Forward hedge cost is modest, locking in predictable home-currency cash yields.'
    };
  }
}

export default new CurrencyHedgedReturnModeler();
