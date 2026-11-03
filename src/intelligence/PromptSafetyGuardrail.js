/**
 * PromptSafetyGuardrail.js
 * 
 * Single responsibility: Pre-dispatch safety audit preventing hallucinated legal guarantees or false pricing.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const BANNED_HALLUCINATIONS = Object.freeze([
  'guaranteed 100% capital return',
  'i guarantee you will double your money',
  'no need to pay dld fees',
  'dld fee is 0%',
  'i promise you a visa without purchase',
  'you never have to pay service charges',
]);

export class PromptSafetyGuardrail {
  validateOutgoingResponse(botResponseText = '') {
    if (!botResponseText || typeof botResponseText !== 'string') {
      return { safe: false, reason: 'EMPTY_RESPONSE' };
    }

    const lower = botResponseText.toLowerCase();
    for (const banned of BANNED_HALLUCINATIONS) {
      if (lower.includes(banned)) {
        return {
          safe: false,
          violation: banned,
          reason: 'PROHIBITED_FINANCIAL_PROMISE',
        };
      }
    }

    return {
      safe: true,
      length: botResponseText.length,
      timestamp: Date.now(),
    };
  }
}

export default new PromptSafetyGuardrail();

