/**
 * SpamKeywordSanitizer.js
 * 
 * Single responsibility: Pre-scan and strip or flag high-risk promotional trigger phrases.
 * Category: 2️⃣ Domain / Feature (src/anti-ban/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const HIGH_RISK_SPAM_WORDS = Object.freeze([
  '100% guarantee',
  'free money',
  'click here now',
  'crypto investment guaranteed',
  'urgent reply needed',
  'claim your prize',
  'limited time cash bonus',
  'instant profit',
  'no risk high return',
]);

export class SpamKeywordSanitizer {
  constructor({ keywords = HIGH_RISK_SPAM_WORDS } = {}) {
    this.keywords = [...keywords];
  }

  scan(text = '') {
    if (!text || typeof text !== 'string') return { safe: true, detected: [] };
    const lower = text.toLowerCase();
    const detected = this.keywords.filter(kw => lower.includes(kw));

    return {
      safe: detected.length === 0,
      detected,
      score: detected.length * 25,
    };
  }

  sanitize(text = '') {
    let clean = text;
    for (const kw of this.keywords) {
      const regex = new RegExp(kw, 'gi');
      clean = clean.replace(regex, '[verified opportunity]');
    }
    return clean;
  }
}

export default new SpamKeywordSanitizer();

