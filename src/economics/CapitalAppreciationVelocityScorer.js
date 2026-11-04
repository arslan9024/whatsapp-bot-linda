/**
 * @file CapitalAppreciationVelocityScorer.js
 * @description Analyzes Month-over-Month (MoM) and Year-over-Year (YoY) transactional price changes to score capital appreciation momentum.
 * Category: 2️⃣ Domain / Feature (Market Economics)
 */

export class CapitalAppreciationVelocityScorer {
  /**
   * Evaluates community price momentum and capital appreciation velocity.
   * @param {Object} params
   * @param {string} params.community
   * @param {number} params.currentAvgSqFtAed
   * @param {number} params.priorYearAvgSqFtAed
   * @param {number} [params.threeMonthRollingChangePct=2.5]
   * @returns {Object}
   */
  scoreVelocity({ community, currentAvgSqFtAed, priorYearAvgSqFtAed, threeMonthRollingChangePct = 2.5 }) {
    const yoyChangeAed = currentAvgSqFtAed - priorYearAvgSqFtAed;
    const yoyChangePct = priorYearAvgSqFtAed > 0 ? (yoyChangeAed / priorYearAvgSqFtAed) * 100 : 0;

    // Velocity score combines 60% YoY trend and 40% short-term 3M surge
    const velocityScore = Math.min(100, Math.max(0, Math.round((yoyChangePct * 2.5) + (threeMonthRollingChangePct * 10))));

    let velocityStage = 'STAGNANT';
    if (velocityScore >= 80) velocityStage = 'HYPER_GROWTH';
    else if (velocityScore >= 60) velocityStage = 'ACCELERATING';
    else if (velocityScore >= 40) velocityStage = 'STEADY_MATURE';
    else if (velocityScore >= 20) velocityStage = 'DECELERATING';

    return {
      community: community || 'General Dubai',
      currentAvgSqFtAed,
      priorYearAvgSqFtAed,
      yoyChangePct: Number(yoyChangePct.toFixed(2)),
      threeMonthRollingChangePct,
      velocityScore,
      velocityStage,
      isTopTierMomentum: velocityScore >= 70,
      investmentHorizonAdvice: velocityScore >= 80
        ? 'Aggressive Momentum: High short-term appreciation trajectory; entry window closing fast.'
        : 'Value Accumulation: Steady organic compounding with low cyclical volatility.'
    };
  }
}

export default new CapitalAppreciationVelocityScorer();
