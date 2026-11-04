/**
 * @file AudioEmotionHesitationAnalyzer.js
 * @description Analyzes audio metadata (pause ratios, jitter, pitch variance, duration)
 * to detect buyer emotional states (hesitant, confident, skeptical, excited).
 * Category: Intelligence
 */

export class AudioEmotionHesitationAnalyzer {
  /**
   * Evaluates acoustic indicators from audio extraction telemetry
   * @param {Object} metrics
   * @param {number} metrics.durationSeconds
   * @param {number} metrics.silenceRatio - 0.0 to 1.0 (pause density)
   * @param {number} metrics.pitchVarianceHz
   * @param {number} metrics.wordsPerMinute
   * @returns {{ emotion: 'HESITANT'|'EXCITED'|'SKEPTICAL'|'CONFIDENT', confidenceScore: number, closingTip: string }}
   */
  analyzeEmotion(metrics = {}) {
    const { durationSeconds = 5, silenceRatio = 0.2, pitchVarianceHz = 20, wordsPerMinute = 120 } = metrics;

    if (silenceRatio > 0.40 || wordsPerMinute < 90) {
      return {
        emotion: 'HESITANT',
        confidenceScore: 85,
        closingTip: 'Client is uncertain or weighing concerns. Soften tone, offer post-handover payment plan comparisons.'
      };
    }

    if (pitchVarianceHz > 45 && wordsPerMinute > 140) {
      return {
        emotion: 'EXCITED',
        confidenceScore: 90,
        closingTip: 'High emotional buy-in detected. Propose immediate token reservation before price escalation.'
      };
    }

    if (silenceRatio > 0.25 && pitchVarianceHz < 15) {
      return {
        emotion: 'SKEPTICAL',
        confidenceScore: 80,
        closingTip: 'Analytical or doubtful tone. Back assertions with official DLD transaction stats and rental yields.'
      };
    }

    return {
      emotion: 'CONFIDENT',
      confidenceScore: 75,
      closingTip: 'Direct, clear buyer. Send floor plans and request preferred time for private viewing.'
    };
  }
}

export default new AudioEmotionHesitationAnalyzer();
