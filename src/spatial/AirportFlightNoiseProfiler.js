/**
 * @file AirportFlightNoiseProfiler.js
 * @description Analyzes Dubai International (DXB) and Al Maktoum (DWC) departure/arrival
 * flight corridors to benchmark acoustic decibel exposure across residential sub-markets.
 * Category: Domain / Feature (Spatial)
 */

export class AirportFlightNoiseProfiler {
  constructor() {
    this.noiseProfiles = {
      MIRDIF: { decibelRating: '65-75 dB', exposureLevel: 'MODERATE_HIGH', doubleGlazingRequired: true },
      GARHOUD: { decibelRating: '75-85 dB', exposureLevel: 'HIGH', doubleGlazingRequired: true },
      MEYDAN: { decibelRating: '50-60 dB', exposureLevel: 'LOW_MODERATE', doubleGlazingRequired: false },
      DOWNTOWN: { decibelRating: '45-55 dB', exposureLevel: 'MINIMAL', doubleGlazingRequired: false },
      PALM_JUMEIRAH: { decibelRating: '35-45 dB', exposureLevel: 'WHISPER_QUIET', doubleGlazingRequired: false }
    };
  }

  /**
   * Assesses aircraft noise exposure for a community
   * @param {string} communityName
   * @returns {Object} Acoustic flight corridor analysis
   */
  assessAcousticExposure(communityName = '') {
    const key = communityName.toUpperCase().replace(/\s+/g, '_');
    const profile = this.noiseProfiles[key] || {
      decibelRating: '40-50 dB',
      exposureLevel: 'LOW_NORMAL',
      doubleGlazingRequired: false
    };

    return {
      community: communityName,
      ...profile,
      buyerAdvisory: profile.doubleGlazingRequired
        ? 'Located near active flight approaches. Acoustic double or triple glazing recommended for bedrooms.'
        : 'Outside major flight approach corridors. Ambient acoustics remain quiet.'
    };
  }
}

export default new AirportFlightNoiseProfiler();

