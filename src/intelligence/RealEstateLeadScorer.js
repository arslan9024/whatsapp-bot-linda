/**
 * ====================================================================
 * REAL ESTATE LEAD SCORING & DEAL READINESS TIERING ENGINE
 * ====================================================================
 * Evaluates inbound communications and messages from property owners to
 * determine conversion readiness, urgency, and investor vs end-user intent.
 *
 * Tiers:
 *   - HOT: Immediate selling or buying intent, ready for contract / viewing.
 *   - WARM: Active interest, requesting market valuation or pricing estimates.
 *   - INVESTOR: Inquiring about yields, ROI, tenancy contracts, or multi-unit.
 *   - BROWSING: Casual queries, generic questions, future plans.
 *   - UNRESPONSIVE: Closed circle or uncooperative responses.
 *
 * @since Development Phase — November 2026
 */

import { Logger } from '../core/Logger.js';

const logger = new Logger('RealEstateLeadScorer');

export const LEAD_TIERS = {
  HOT: 'HOT',
  WARM: 'WARM',
  INVESTOR: 'INVESTOR',
  BROWSING: 'BROWSING',
  UNRESPONSIVE: 'UNRESPONSIVE',
};

const HOT_KEYWORDS = [
  'sell', 'selling', 'buy', 'buyer', 'offer', 'cash buyer', 'viewing',
  'contract', 'mou', 'form a', 'form f', 'agent commission', 'list my property',
  'how much can i get', 'urgent sale', 'distress', 'cheque', 'ready to sell',
  'بيع', 'شراء', 'مشتري', 'عقد', 'كاش', 'معاينة'
];

const WARM_KEYWORDS = [
  'valuation', 'evaluate', 'price', 'market price', 'worth', 'rent out',
  'rental yield', 'service charges', 'market trend', 'estimate', 'interested',
  'كم السعر', 'تقييم', 'ايجار', 'قيمة'
];

const INVESTOR_KEYWORDS = [
  'roi', 'yield', 'tenant', 'tenancy contract', 'ejari', 'annual return',
  'portfolio', 'capital appreciation', 'developer handover', 'bulk', 'multi-unit',
  'عائد استثماري', 'مستأجر', 'ايجاري'
];

const UNRESPONSIVE_KEYWORDS = [
  'not interested', 'wrong number', 'stop messaging', 'do not call', 'remove me',
  'spam', 'unsubscribe', 'غير مهتم', 'الرقم غلط'
];

export class RealEstateLeadScorer {
  /**
   * Score an incoming message or interaction.
   *
   * @param {object} params
   * @param {string} [params.text] - Message content
   * @param {string} [params.reaction] - Emoji reaction if any
   * @param {boolean} [params.hasVoiceNote] - Whether sender sent a voice note
   * @param {number} [params.historyLength] - Count of previous exchanges
   * @returns {{ tier: string, score: number, reasons: string[], isPriority: boolean }}
   */
  static scoreLead({ text = '', reaction = '', hasVoiceNote = false, historyLength = 0 } = {}) {
    const cleanText = String(text || '').toLowerCase().trim();
    let score = 20; // baseline score
    const reasons = [];

    // 1. Reaction Emoji Analysis
    if (reaction) {
      if (['🔥', '👍', '❤️', '👏', '🤝'].includes(reaction)) {
        score += 25;
        reasons.push(`Positive engagement reaction (${reaction})`);
      } else if (['👎', '❌', '🚫'].includes(reaction)) {
        score -= 40;
        reasons.push(`Negative engagement reaction (${reaction})`);
      }
    }

    // 2. Voice Note Presence (Voice notes indicate serious human effort)
    if (hasVoiceNote) {
      score += 30;
      reasons.push('High-touch inbound voice note received');
    }

    // 3. Negative / Unresponsive Keywords
    for (const kw of UNRESPONSIVE_KEYWORDS) {
      if (cleanText.includes(kw)) {
        score -= 60;
        reasons.push(`Explicit opt-out keyword: "${kw}"`);
        break;
      }
    }

    // 4. Hot Keywords
    let matchedHot = 0;
    for (const kw of HOT_KEYWORDS) {
      if (cleanText.includes(kw)) {
        score += 35;
        matchedHot++;
        reasons.push(`Hot intent keyword: "${kw}"`);
        if (matchedHot >= 2) break;
      }
    }

    // 5. Investor Keywords
    let matchedInvestor = 0;
    for (const kw of INVESTOR_KEYWORDS) {
      if (cleanText.includes(kw)) {
        score += 25;
        matchedInvestor++;
        reasons.push(`Investor keyword: "${kw}"`);
        if (matchedInvestor >= 2) break;
      }
    }

    // 6. Warm Keywords
    let matchedWarm = 0;
    for (const kw of WARM_KEYWORDS) {
      if (cleanText.includes(kw)) {
        score += 20;
        matchedWarm++;
        reasons.push(`Market interest keyword: "${kw}"`);
        if (matchedWarm >= 2) break;
      }
    }

    // 7. Conversation Depth Multiplier
    if (historyLength > 2) {
      score += Math.min(25, historyLength * 5);
      reasons.push(`Established multi-turn conversation (${historyLength} msgs)`);
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    // Determine Tier
    let tier = LEAD_TIERS.BROWSING;
    if (cleanText && UNRESPONSIVE_KEYWORDS.some(kw => cleanText.includes(kw))) {
      tier = LEAD_TIERS.UNRESPONSIVE;
    } else if (matchedHot > 0) {
      tier = LEAD_TIERS.HOT;
    } else if (matchedInvestor > 0 || (cleanText.includes('yield') || cleanText.includes('roi'))) {
      tier = LEAD_TIERS.INVESTOR;
    } else if (matchedWarm > 0 || score >= 50) {
      tier = LEAD_TIERS.WARM;
    }

    const isPriority = tier === LEAD_TIERS.HOT || tier === LEAD_TIERS.INVESTOR;

    logger.debug(`Lead scored: ${score} pts -> Tier: ${tier} (Priority: ${isPriority})`);

    return {
      tier,
      score,
      reasons,
      isPriority,
    };
  }
}

export default RealEstateLeadScorer;
