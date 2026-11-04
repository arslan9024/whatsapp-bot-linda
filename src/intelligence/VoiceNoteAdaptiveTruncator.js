/**
 * @file VoiceNoteAdaptiveTruncator.js
 * @description Dynamically sizes synthesized voice note durations according to buyer
 * profile: concise <30s clips for busy executives, comprehensive 60-90s explanations for overseas investors.
 * Category: Intelligence
 */

export class VoiceNoteAdaptiveTruncator {
  /**
   * Calculates maximum recommended voice note duration in seconds
   * @param {Object} buyerProfile
   * @param {'executive'|'international_investor'|'first_time_buyer'|'general'} [buyerProfile.buyerType]
   * @param {number} [buyerProfile.inboundAudioDurationSeconds]
   * @returns {{ maxDurationSeconds: number, profileCategory: string }}
   */
  resolveTargetDuration(buyerProfile = {}) {
    const { buyerType = 'general', inboundAudioDurationSeconds = 20 } = buyerProfile;

    if (buyerType === 'executive' || inboundAudioDurationSeconds < 15) {
      return { maxDurationSeconds: 30, profileCategory: 'CONCISE_EXECUTIVE' };
    }

    if (buyerType === 'international_investor') {
      return { maxDurationSeconds: 90, profileCategory: 'COMPREHENSIVE_OVERSEAS' };
    }

    if (buyerType === 'first_time_buyer') {
      return { maxDurationSeconds: 60, profileCategory: 'GUIDED_REASSURING' };
    }

    return { maxDurationSeconds: 45, profileCategory: 'STANDARD_BALANCED' };
  }

  /**
   * Truncates script text to fit within target audio duration
   * @param {string} fullScript
   * @param {number} maxDurationSeconds
   * @param {number} [wordsPerMinute]
   * @returns {string} Truncated script
   */
  fitScriptToDuration(fullScript, maxDurationSeconds, wordsPerMinute = 130) {
    const maxWords = Math.floor((maxDurationSeconds / 60) * wordsPerMinute);
    const words = fullScript.trim().split(/\s+/);

    if (words.length <= maxWords) {
      return fullScript;
    }

    return words.slice(0, maxWords).join(' ') + '... Would you like me to elaborate?';
  }
}

export default new VoiceNoteAdaptiveTruncator();

