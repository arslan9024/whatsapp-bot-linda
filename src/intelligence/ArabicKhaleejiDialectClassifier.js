/**
 * ArabicKhaleejiDialectClassifier.js
 * 
 * Single responsibility: Detect Arabic, Khaleeji, Levantine, and Anglo-Hindi idioms in user inputs.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

const DIALECT_MARKERS = Object.freeze({
  KHALEEJI: ['هلا والله', 'شلونك', 'ابي', 'ودي', 'عساك طيب', 'يا خوي', 'طال عمرك', 'ما قصرت', 'كم سيم'],
  LEVANTINE: ['شو في', 'بدي', 'كيفك', 'عم احكي', 'يعطيك العافية', 'حبيبي', 'هيك', 'مشان'],
  EGYPTIAN: ['ازيك', 'عايز', 'فين', 'كده', 'تمام يا باشا', 'يا فندم', 'ايه الاخبار'],
  ANGLO_HINDI: ['bhai', 'yar', 'acha', 'kitna rate', 'plz share details', 'urgent required', 'boss rate please'],
});

export class ArabicKhaleejiDialectClassifier {
  detectDialect(text = '') {
    if (!text || typeof text !== 'string') return { dialect: 'STANDARD', confidence: 0 };
    const lower = text.toLowerCase();

    for (const [dialect, markers] of Object.entries(DIALECT_MARKERS)) {
      for (const m of markers) {
        if (text.includes(m) || lower.includes(m)) {
          return { dialect, matchedMarker: m, confidence: 0.9 };
        }
      }
    }

    // Check if Arabic script
    const hasArabicScript = /[\u0600-\u06FF]/.test(text);
    if (hasArabicScript) {
      return { dialect: 'MODERN_STANDARD_ARABIC', confidence: 0.8 };
    }

    return { dialect: 'ENGLISH', confidence: 0.7 };
  }
}

export default new ArabicKhaleejiDialectClassifier();

