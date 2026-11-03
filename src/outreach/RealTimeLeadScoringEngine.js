/**
 * @file RealTimeLeadScoringEngine.js
 * @description Computes real-time lead qualification score (0-100) and assigns tiers
 * (COLD, WARM, HOT, QUALIFIED_VIP) based on budget, purchase timeline, and liquidity.
 * Category: Outreach
 */

export class RealTimeLeadScoringEngine {
  /**
   * Scores a lead based on qualification attributes
   * @param {Object} attributes
   * @param {number} [attributes.budgetAed]
   * @param {string} [attributes.timeline] - 'immediate' | '1-3_months' | 'exploring'
   * @param {boolean} [attributes.hasReadyCash]
   * @param {number} [attributes.messagesExchanged]
   * @returns {{ score: number, tier: 'COLD'|'WARM'|'HOT'|'QUALIFIED_VIP' }}
   */
  scoreLead(attributes = {}) {
    let score = 20; // baseline

    const budget = Number(attributes.budgetAed || 0);
    if (budget >= 10000000) score += 35;
    else if (budget >= 3000000) score += 25;
    else if (budget >= 1500000) score += 15;

    if (attributes.timeline === 'immediate' || attributes.timeline === 'this_week') score += 25;
    else if (attributes.timeline === '1-3_months') score += 15;

    if (attributes.hasReadyCash) score += 20;

    const count = attributes.messagesExchanged || 0;
    if (count >= 5) score += 10;

    const finalScore = Math.min(100, score);

    let tier = 'COLD';
    if (finalScore >= 85) tier = 'QUALIFIED_VIP';
    else if (finalScore >= 65) tier = 'HOT';
    else if (finalScore >= 45) tier = 'WARM';

    return {
      score: finalScore,
      tier
    };
  }
}

export default new RealTimeLeadScoringEngine();
