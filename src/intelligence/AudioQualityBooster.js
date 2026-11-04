/**
 * @file AudioQualityBooster.js
 * @description Evaluates audio buffer acoustics and generates FFmpeg audio normalization,
 * noise gating, and dynamic range compression filters for clear WhatsApp playback.
 * Category: Intelligence
 */

export class AudioQualityBooster {
  /**
   * Generates FFmpeg audio enhancement filter graph
   * @param {Object} [options]
   * @param {boolean} [options.deNoise]
   * @param {boolean} [options.normalizeVolume]
   * @returns {string} FFmpeg audio filter parameter
   */
  buildEnhancementFilter(options = {}) {
    const filters = [];

    if (options.deNoise ?? true) {
      // High-pass filter to remove low-frequency vehicle rumble + noise gate
      filters.push('highpass=f=80,lowpass=f=12000,afftdn=nf=-25');
    }

    if (options.normalizeVolume ?? true) {
      // EBU R128 loudness normalization for consistent voice note levels
      filters.push('loudnorm=I=-16:TP=-1.5:LRA=11');
    }

    return filters.join(',');
  }

  /**
   * Inspects basic audio descriptor for optimization readiness
   * @param {number} sizeBytes
   * @param {number} durationSeconds
   * @returns {Object} Quality health analysis
   */
  inspectAudioHealth(sizeBytes, durationSeconds) {
    const bitrateKbps = durationSeconds > 0 ? Math.round(((sizeBytes * 8) / durationSeconds) / 1000) : 0;
    const isOptimal = bitrateKbps >= 24 && bitrateKbps <= 96;

    return {
      sizeBytes,
      durationSeconds,
      bitrateKbps,
      isOptimalForWhatsApp: isOptimal,
      recommendation: isOptimal ? 'Pass through untouched' : 'Transcode to 32kbps Opus'
    };
  }
}

export default new AudioQualityBooster();
