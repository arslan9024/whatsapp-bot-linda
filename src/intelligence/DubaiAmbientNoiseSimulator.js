/**
 * @file DubaiAmbientNoiseSimulator.js
 * @description Injects subtle ambient audio soundscapes (DIFC café, Marina breeze,
 * luxury brokerage sales office) into synthesized voice notes for organic realism.
 * Category: Intelligence
 */

export class DubaiAmbientNoiseSimulator {
  constructor() {
    this.ambientProfiles = {
      'DIFC_EXECUTIVE_CAFE': {
        name: 'DIFC Executive Café',
        file: 'ambience/difc_cafe_subtle.opus',
        recommendedVolumeDb: -32
      },
      'MARINA_TERRACE_BREEZE': {
        name: 'Dubai Marina Yacht Club Terrace',
        file: 'ambience/marina_breeze.opus',
        recommendedVolumeDb: -30
      },
      'LUXURY_BROKERAGE_FLOOR': {
        name: 'Private Luxury Client Lounge',
        file: 'ambience/lounge_soft.opus',
        recommendedVolumeDb: -35
      }
    };
  }

  /**
   * Resolves ambient overlay recipe for voice note synthesis
   * @param {'DIFC_EXECUTIVE_CAFE'|'MARINA_TERRACE_BREEZE'|'LUXURY_BROKERAGE_FLOOR'} profileKey
   * @param {number} speechDurationSeconds
   * @returns {Object} FFmpeg audio mixing parameters
   */
  getMixingRecipe(profileKey = 'LUXURY_BROKERAGE_FLOOR', speechDurationSeconds = 10) {
    const profile = this.ambientProfiles[profileKey] || this.ambientProfiles.LUXURY_BROKERAGE_FLOOR;

    return {
      profileName: profile.name,
      ambientAssetPath: profile.file,
      targetDuration: speechDurationSeconds,
      mixVolumeDb: profile.recommendedVolumeDb,
      ffmpegFilterSpec: `[1:a]volume=${profile.recommendedVolumeDb}dB,aloop=loop=-1:size=2e+09[amb];[0:a][amb]amix=inputs=2:duration=first:dropout_transition=2`
    };
  }
}

export default new DubaiAmbientNoiseSimulator();

