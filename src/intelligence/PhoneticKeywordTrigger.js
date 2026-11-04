/**
 * @file PhoneticKeywordTrigger.js
 * @description Scans spoken audio transcripts for high-urgency keywords and phrases,
 * triggering immediate broker notifications and automated CRM status updates.
 * Category: Intelligence
 */

export class PhoneticKeywordTrigger {
  constructor() {
    this.triggers = [
      { id: 'DEPOSIT_READY', pattern: /ready to pay|wire transfer|manager cheque|put deposit/i, priority: 'CRITICAL' },
      { id: 'DEAL_CANCELLATION', pattern: /cancel the deal|pull out|not interested anymore|refund deposit/i, priority: 'HIGH' },
      { id: 'COMPLAINT_ESCALATION', pattern: /talk to your manager|unprofessional|fake listing|complaint/i, priority: 'HIGH' },
      { id: 'PRICE_NEGOTIATION', pattern: /last price|final offer|discount|reduce price/i, priority: 'MEDIUM' }
    ];
  }

  /**
   * Scans text for matching phonetic trigger rules
   * @param {string} transcriptText
   * @returns {{ triggered: boolean, matches: Array<Object> }}
   */
  scanTranscript(transcriptText = '') {
    const matches = [];

    for (const rule of this.triggers) {
      if (rule.pattern.test(transcriptText)) {
        matches.push({
          triggerId: rule.id,
          priority: rule.priority
        });
      }
    }

    return {
      triggered: matches.length > 0,
      matches
    };
  }
}

export default new PhoneticKeywordTrigger();
