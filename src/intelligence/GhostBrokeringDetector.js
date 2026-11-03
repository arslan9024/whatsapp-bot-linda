/**
 * @file GhostBrokeringDetector.js
 * @description Analyzes incoming buyer inquiries for patterns of unlicensed intermediary
 * or "ghost brokering" activities (curbstoning, unbranded requests, co-broke splits).
 * Category: Intelligence
 */

export class GhostBrokeringDetector {
  constructor() {
    this.ghostKeywords = [
      'unbranded',
      'unbranded brochure',
      'co-broke',
      'cobroke',
      '50/50 split',
      'client is waiting',
      'direct with owner',
      'are you direct',
      'direct with landlord',
      'sub-agent',
      'share commission',
      'my investor from abroad',
      'without company logo',
      'no agency logo'
    ];
  }

  /**
   * Scans text for ghost brokering indicators
   * @param {string} text
   * @returns {{ isSuspectedGhostBroker: boolean, confidence: number, matches: Array<string> }}
   */
  evaluateMessage(text = '') {
    if (!text || typeof text !== 'string') {
      return { isSuspectedGhostBroker: false, confidence: 0, matches: [] };
    }

    const lower = text.toLowerCase();
    const matched = [];

    for (const kw of this.ghostKeywords) {
      if (lower.includes(kw)) {
        matched.push(kw);
      }
    }

    // High confidence if multiple keywords or specific giveaways
    let confidence = 0;
    if (matched.length >= 2) {
      confidence = 90;
    } else if (matched.length === 1) {
      confidence = matched[0].includes('unbranded') || matched[0].includes('co-broke') ? 75 : 50;
    }

    return {
      isSuspectedGhostBroker: confidence >= 60,
      confidence,
      matches: matched
    };
  }

  /**
   * Generates recommendation on how to handle suspected intermediary
   * @param {boolean} isSuspected
   * @returns {string} Action policy
   */
  getPolicyRecommendation(isSuspected) {
    if (isSuspected) {
      return 'Request RERA Broker Card (BRN) number and Agency ORN before sharing off-market details.';
    }
    return 'Standard direct buyer engagement protocol.';
  }
}

export default new GhostBrokeringDetector();

