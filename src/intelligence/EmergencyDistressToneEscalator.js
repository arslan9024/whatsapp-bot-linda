/**
 * EmergencyDistressToneEscalator.js
 * 
 * Single responsibility: Detect angry, legal threat, or highly distressed customer tone and silence bot.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const DISTRESS_TRIGGERS = Object.freeze([
  'lawyer',
  'police',
  'court',
  'sue you',
  'harassment',
  'stop messaging or else',
  'consumer protection',
  'fraudulent',
  'scam report',
  'dld complaint',
]);

export class EmergencyDistressToneEscalator {
  evaluateTone(text = '') {
    if (!text || typeof text !== 'string') return { shouldSilenceBot: false, urgency: 'LOW' };
    const lower = text.toLowerCase();

    const matches = DISTRESS_TRIGGERS.filter(trigger => lower.includes(trigger));

    if (matches.length > 0) {
      return {
        shouldSilenceBot: true,
        urgency: 'CRITICAL',
        reason: 'LEGAL_OR_COMPLAINT_RISK',
        triggersDetected: matches,
        actionRequired: 'HUMAN_BROKER_TAKEOVER_IMMEDIATELY',
      };
    }

    return {
      shouldSilenceBot: false,
      urgency: 'LOW',
      triggersDetected: [],
      actionRequired: 'CONTINUE_AUTONOMOUS_REPLY',
    };
  }
}

export default new EmergencyDistressToneEscalator();

