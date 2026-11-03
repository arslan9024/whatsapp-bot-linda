/**
 * RealEstateObjectionMatrix.js
 * 
 * Single responsibility: Map customer real estate objections to tailored empathy-based counter responses.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const OBJECTION_PROFILES = Object.freeze({
  PRICE_TOO_HIGH: {
    keywords: ['expensive', 'too high', 'overpriced', 'budget is less', 'costly', 'out of budget', 'discount'],
    strategy: 'HIGHLIGHT_ROI_AND_PAYMENT_PLAN',
    promptGuidance: 'Acknowledge budget constraint respectfully. Emphasize post-handover 1% monthly payment plan or 8.5% net rental yields in this community.',
  },
  NOT_INTERESTED: {
    keywords: ['not interested', 'no thanks', 'not looking now', 'dont want', 'later'],
    strategy: 'RESPECTFUL_SOFT_KEEP_IN_TOUCH',
    promptGuidance: 'Politely acknowledge. Offer to send the quarterly market transaction index report only when key prices shift.',
  },
  WRONG_NUMBER: {
    keywords: ['wrong number', 'wrong person', 'dont know you', 'who is this'],
    strategy: 'APOLOGIZE_AND_VERIFY',
    promptGuidance: 'Apologize sincerely, state you are inquiring regarding the property ownership listing record, and offer to remove their number immediately.',
  },
  MARKET_CRASH_FEAR: {
    keywords: ['market will crash', 'bubble', 'prices falling', 'wait for drop'],
    strategy: 'DATA_DRIVEN_DLD_EVIDENCE',
    promptGuidance: 'Cite Dubai Land Department population influx data (+100k residents annually) and 70% cash buyer ratio preventing subprime risk.',
  },
});

export class RealEstateObjectionMatrix {
  classifyObjection(text = '') {
    if (!text || typeof text !== 'string') return null;
    const lower = text.toLowerCase();

    for (const [objectionType, profile] of Object.entries(OBJECTION_PROFILES)) {
      for (const kw of profile.keywords) {
        if (lower.includes(kw)) {
          return {
            objectionType,
            matchedKeyword: kw,
            strategy: profile.strategy,
            promptGuidance: profile.promptGuidance,
          };
        }
      }
    }
    return null;
  }
}

export default new RealEstateObjectionMatrix();

