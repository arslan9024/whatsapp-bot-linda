/**
 * @file VoicePacingHarmonizer.js
 * @description Harmonizes voice synthesis tempo, pauses, and cadence with client
 * speaking rate, fostering subconscious rapport through behavioral pacing mirroring.
 * Category: Intelligence
 */

export class VoicePacingHarmonizer {
  /**
   * Calculates optimal response playback speed based on client speaking rate
   * @param {number} clientWpm - Words per minute measured from incoming voice note
   * @returns {{ targetSpeedMultiplier: number, pauseDurationMs: number, profile: string }}
   */
  calculateMirroringPace(clientWpm = 130) {
    // Standard baseline is ~130-140 WPM (multiplier 1.0)
    let multiplier = 1.0;
    let pauseMs = 350;
    let profile = 'BALANCED';

    if (clientWpm < 105) {
      // Slow, deliberate, senior or cautious speaker
      multiplier = 0.90;
      pauseMs = 500;
      profile = 'DELIBERATE_REASSURING';
    } else if (clientWpm > 155) {
      // Rapid, busy, high-energy executive speaker
      multiplier = 1.15;
      pauseMs = 200;
      profile = 'CONCISE_DYNAMIC';
    }

    return {
      clientWpm,
      targetSpeedMultiplier: multiplier,
      pauseDurationMs: pauseMs,
      profile
    };
  }
}

export default new VoicePacingHarmonizer();

