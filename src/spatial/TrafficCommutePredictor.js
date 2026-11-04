/**
 * @file TrafficCommutePredictor.js
 * @description Models rush-hour traffic travel durations and arterial highway congestion
 * (E11 SZR, E44 Al Khail, E311 MBZ) from residential communities to central job hubs.
 * Category: Domain / Feature (Spatial)
 */

export class TrafficCommutePredictor {
  constructor() {
    this.baselineMinutes = {
      'DUBAI_HILLS_TO_DIFC': { offPeak: 14, morningPeak: 22 },
      'DAMAC_HILLS_TO_DOWNTOWN': { offPeak: 28, morningPeak: 45 },
      'PALM_JUMEIRAH_TO_DIFC': { offPeak: 20, morningPeak: 35 },
      'DUBAI_CREEK_TO_DXB_AIRPORT': { offPeak: 10, morningPeak: 16 }
    };
  }

  /**
   * Estimates commute duration between origin and destination
   * @param {string} origin
   * @param {string} destination
   * @param {boolean} [isPeakHour]
   * @returns {{ estimatedMinutes: number, arterialRoute: string, congestionLevel: string }}
   */
  estimateCommute(origin = 'Dubai Hills', destination = 'DIFC', isPeakHour = true) {
    const key = `${origin.toUpperCase().replace(/\s+/g, '_')}_TO_${destination.toUpperCase().replace(/\s+/g, '_')}`;
    const benchmark = this.baselineMinutes[key] || { offPeak: 20, morningPeak: 32 };

    const estimatedMinutes = isPeakHour ? benchmark.morningPeak : benchmark.offPeak;

    return {
      origin,
      destination,
      estimatedMinutes,
      arterialRoute: origin.includes('Hills') ? 'E44 Al Khail Road' : 'E11 Sheikh Zayed Road',
      congestionLevel: isPeakHour ? 'MODERATE_HEAVY' : 'FREE_FLOWING'
    };
  }
}

export default new TrafficCommutePredictor();
