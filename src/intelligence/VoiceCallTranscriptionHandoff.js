/**
 * @file VoiceCallTranscriptionHandoff.js
 * @description Distills voice call audio transcriptions into concise 30-second
 * pre-dial executive briefings for human brokers before initiating outbound calls.
 * Category: Intelligence
 */

export class VoiceCallTranscriptionHandoff {
  /**
   * Generates a pre-dial executive briefing from a raw audio transcript
   * @param {Object} data
   * @param {string} data.rawTranscript
   * @param {string} data.callerName
   * @param {string} [data.callerPhone]
   * @returns {Object} Structured briefing
   */
  generatePreDialBriefing(data) {
    const { rawTranscript = '', callerName = 'Prospective Buyer', callerPhone = '' } = data;

    // Extract key sentiments and terms
    const lower = rawTranscript.toLowerCase();
    const hasMortgage = lower.includes('mortgage') || lower.includes('finance') || lower.includes('bank');
    const hasCash = lower.includes('cash') || lower.includes('ready funds');
    const hasUrgency = lower.includes('urgent') || lower.includes('today') || lower.includes('asap') || lower.includes('this week');

    const keyPoints = [];
    if (hasCash) keyPoints.push('Buyer claims liquid cash / ready funds for immediate deposit.');
    else if (hasMortgage) keyPoints.push('Buyer inquires about bank mortgage or developer payment plan financing.');

    if (hasUrgency) keyPoints.push('High Urgency: Ready to view or decide within 48-72 hours.');
    else keyPoints.push('Standard consideration timeline: Gathering market comparisons.');

    if (lower.includes('invest') || lower.includes('rental') || lower.includes('roi')) {
      keyPoints.push('Investor Persona: Prioritizes net rental yield, Ejari rents, and capital appreciation.');
    } else {
      keyPoints.push('End-User Persona: Inquiring for family residence, schools, and lifestyle amenities.');
    }

    return {
      callerName,
      callerPhone,
      sentiment: hasUrgency ? 'HOT_LEAD' : 'QUALIFIED',
      bulletSummary: keyPoints,
      recommendedOpeningLine: `Hi ${callerName}, thank you for your voice note regarding our luxury listings. I have the exact floor plans in front of me.`
    };
  }

  /**
   * Formats the briefing into an internal WhatsApp / SMS alert
   * @param {Object} briefing
   * @returns {string}
   */
  formatBriefingMessage(briefing) {
    return [
      `📞 *PRE-DIAL BRIEFING FOR ${briefing.callerName.toUpperCase()}*`,
      `📱 Mobile: *${briefing.callerPhone}*`,
      `🔥 Tier: *${briefing.sentiment}*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ...briefing.bulletSummary.map(pt => `• ${pt}`),
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💡 *Recommended Icebreaker:*`,
      `"${briefing.recommendedOpeningLine}"`
    ].join('\n');
  }
}

export default new VoiceCallTranscriptionHandoff();

