/**
 * @file SpeechToIntentFastMatcher.js
 * @description Fast-path heuristic intent parser extracting primary real estate intents
 * from speech transcripts in <50ms, bypassing LLM round-trip latency.
 * Category: Intelligence
 */

export class SpeechToIntentFastMatcher {
  constructor() {
    this.intentRules = [
      { intent: 'BOOK_VIEWING', regex: /viewing|visit|see the unit|inspect|open house|tomorrow|weekend/i },
      { intent: 'REQUEST_BROCHURE', regex: /brochure|floor plan|layout|pdf|catalog|send photos/i },
      { intent: 'ASK_PRICE', regex: /how much|price|cost|budget|payment plan|discount|cheques/i },
      { intent: 'HUMAN_TRANSFER', regex: /speak with agent|call me|human|broker|director|manager/i },
      { intent: 'GOLDEN_VISA', regex: /golden visa|residency|emirates id|passport|2 million/i }
    ];
  }

  /**
   * Evaluates text for fast-path intent matching
   * @param {string} rawTranscript
   * @returns {{ intent: string, matched: boolean, confidence: number }}
   */
  matchIntent(rawTranscript = '') {
    if (!rawTranscript) {
      return { intent: 'GENERAL_INQUIRY', matched: false, confidence: 0 };
    }

    for (const rule of this.intentRules) {
      if (rule.regex.test(rawTranscript)) {
        return {
          intent: rule.intent,
          matched: true,
          confidence: 90
        };
      }
    }

    return {
      intent: 'GENERAL_INQUIRY',
      matched: false,
      confidence: 40
    };
  }
}

export default new SpeechToIntentFastMatcher();

