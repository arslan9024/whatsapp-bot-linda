/**
 * BuyerPersonaProfiler.js
 * 
 * Single responsibility: Classify buyer personas (End-User, Speculative Flipper, Yield Collector) from chat context.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class BuyerPersonaProfiler {
  profileLead({ text = '', budgetAed = 0, isMortgage = false } = {}) {
    const clean = text.toLowerCase();

    // 1. Speculative Flipper
    if (clean.includes('flip') || clean.includes('resell before handover') || clean.includes('capital appreciation') || clean.includes('fast exit')) {
      return {
        persona: 'SPECULATIVE_FLIPPER',
        priority: 'CAPITAL_GROWTH_AND_PAYMENT_PLAN',
        recommendedProjects: ['OFF_PLAN_LAUNCHES_PHASE_1'],
      };
    }

    // 2. High-Yield Collector (Investor)
    if (clean.includes('roi') || clean.includes('rental yield') || clean.includes('tenant') || clean.includes('airbnb') || clean.includes('passive income')) {
      return {
        persona: 'YIELD_COLLECTOR',
        priority: 'MAXIMUM_NET_RENTAL_YIELD',
        recommendedProjects: ['HIGH_YIELD_STUDIOS_AND_1BEDS_JVC_OR_COMMUNITIES'],
      };
    }

    // 3. End-User Family
    if (clean.includes('school') || clean.includes('family') || clean.includes('live in') || clean.includes('move in') || clean.includes('kids') || isMortgage) {
      return {
        persona: 'END_USER_FAMILY',
        priority: 'COMMUNITY_AMENITIES_AND_SPACE',
        recommendedProjects: ['READY_OR_NEAR_COMPLETION_TOWNHOUSES_AND_VILLAS'],
      };
    }

    return {
      persona: 'GENERAL_PROSPECT',
      priority: 'BALANCED_PORTFOLIO',
      recommendedProjects: ['PRIME_DUBAI_LAUNCHES'],
    };
  }
}

export default new BuyerPersonaProfiler();
