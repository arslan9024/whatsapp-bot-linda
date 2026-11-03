/**
 * ChatIntentClassifier.js
 * 
 * Single responsibility: Classify inbound real estate messages into 8 core functional intents.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const REAL_ESTATE_INTENTS = Object.freeze([
  'BUY_INQUIRY',
  'SELL_INQUIRY',
  'RENT_INQUIRY',
  'VIEWING_REQUEST',
  'PRICE_NEGOTIATION',
  'BROCHURE_REQUEST',
  'COMPLAINT',
  'GENERAL_CHAT',
]);

export class ChatIntentClassifier {
  classify(text = '') {
    if (!text || typeof text !== 'string') return { intent: 'GENERAL_CHAT', confidence: 0.5 };
    const lower = text.toLowerCase();

    if (lower.includes('brochure') || lower.includes('catalog') || lower.includes('pdf') || lower.includes('floor plan')) {
      return { intent: 'BROCHURE_REQUEST', confidence: 0.95 };
    }
    if (lower.includes('viewing') || lower.includes('visit') || lower.includes('see property') || lower.includes('open house') || lower.includes('appointment')) {
      return { intent: 'VIEWING_REQUEST', confidence: 0.92 };
    }
    if (lower.includes('sell my') || lower.includes('want to list') || lower.includes('valuation') || lower.includes('list my unit')) {
      return { intent: 'SELL_INQUIRY', confidence: 0.94 };
    }
    if (lower.includes('rent') || lower.includes('ejari') || lower.includes('tenant') || lower.includes('lease')) {
      return { intent: 'RENT_INQUIRY', confidence: 0.90 };
    }
    if (lower.includes('discount') || lower.includes('last price') || lower.includes('best offer') || lower.includes('cheaper') || lower.includes('negotiable')) {
      return { intent: 'PRICE_NEGOTIATION', confidence: 0.88 };
    }
    if (lower.includes('scam') || lower.includes('fraud') || lower.includes('complaint') || lower.includes('bad service') || lower.includes('sue')) {
      return { intent: 'COMPLAINT', confidence: 0.96 };
    }
    if (lower.includes('buy') || lower.includes('purchase') || lower.includes('interested in unit') || lower.includes('invest') || lower.includes('offplan') || lower.includes('off-plan')) {
      return { intent: 'BUY_INQUIRY', confidence: 0.91 };
    }

    return { intent: 'GENERAL_CHAT', confidence: 0.60 };
  }
}

export default new ChatIntentClassifier();

