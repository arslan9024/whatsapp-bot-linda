/**
 * @file ExitLiquidityDaysOnMarketScorer.js
 * @description Analyzes average Days on Market (DOM), buyer bidding depth, and liquidation velocity across Dubai property types.
 * Category: 2️⃣ Domain / Feature (Market Economics)
 */

export class ExitLiquidityDaysOnMarketScorer {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.communityDomBenchmarks = options.communityDomBenchmarks || {
      'downtown': 28,
      'dubai-marina': 32,
      'palm-jumeirah': 35,
      'jvc': 21,
      'dubai-hills': 25,
      'arabian-ranches': 38
    };
  }

  /**
   * Evaluates liquidity velocity and expected Days on Market.
   * @param {Object} params
   * @param {string} params.community
   * @param {string} params.propertyType ('1br', '2br', 'villa', 'penthouse')
   * @param {number} [params.priceCompetitivenessPct=100] (100 = fair market, 90 = 10% below market)
   * @returns {Object}
   */
  scoreExitLiquidity({ community, propertyType, priceCompetitivenessPct = 100 }) {
    const slug = (community || '').toLowerCase().trim().replace(/\s+/g, '-');
    const baseDom = this.communityDomBenchmarks[slug] || 40;

    // Adjust for property type: 1BR liquidates fastest, penthouses slower
    let typeMultiplier = 1.0;
    const typeLower = (propertyType || '').toLowerCase();
    if (typeLower.includes('studio') || typeLower.includes('1br')) typeMultiplier = 0.8;
    else if (typeLower.includes('3br') || typeLower.includes('villa')) typeMultiplier = 1.25;
    else if (typeLower.includes('penthouse') || typeLower.includes('mansion')) typeMultiplier = 2.0;

    // Adjust for price: discounting cuts DOM drastically
    const priceFactor = priceCompetitivenessPct / 100;
    const estimatedDomDays = Math.max(7, Math.round(baseDom * typeMultiplier * Math.pow(priceFactor, 2)));
    const liquidityScore = Math.max(10, Math.min(100, Math.round(100 - (estimatedDomDays * 0.9))));

    return {
      community,
      propertyType,
      priceCompetitivenessPct,
      estimatedDaysOnMarket: estimatedDomDays,
      liquidityScore,
      liquidityTier: liquidityScore >= 75 ? 'ULTRA_LIQUID' : liquidityScore >= 50 ? 'HEALTHY_LIQUIDITY' : 'LOW_VELOCITY_SPECIALTY',
      quickCashSaleDiscountRequiredPct: estimatedDomDays > 45 ? 8 : 4
    };
  }
}

export default new ExitLiquidityDaysOnMarketScorer();
