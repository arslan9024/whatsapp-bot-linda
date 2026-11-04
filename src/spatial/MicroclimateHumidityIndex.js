/**
 * @file MicroclimateHumidityIndex.js
 * @description Analyzes coastal vs inland microclimates, thermal comfort indices, and evening sea breeze metrics across Dubai.
 * Category: 2️⃣ Domain / Feature (Spatial Intelligence)
 */

export class MicroclimateHumidityIndex {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.zones = options.zones || {
      'dubai-marina': { type: 'coastal', avgSummerHumidity: 78, seaBreezeExposure: 0.9, heatIslandIndex: 0.4 },
      'palm-jumeirah': { type: 'island', avgSummerHumidity: 82, seaBreezeExposure: 0.95, heatIslandIndex: 0.3 },
      'downtown': { type: 'urban-dense', avgSummerHumidity: 65, seaBreezeExposure: 0.4, heatIslandIndex: 0.85 },
      'arabian-ranches': { type: 'inland-suburb', avgSummerHumidity: 48, seaBreezeExposure: 0.3, heatIslandIndex: 0.5 },
      'damac-hills': { type: 'inland-desert', avgSummerHumidity: 44, seaBreezeExposure: 0.25, heatIslandIndex: 0.45 },
      'dubai-creek-harbour': { type: 'waterfront-lagoon', avgSummerHumidity: 70, seaBreezeExposure: 0.75, heatIslandIndex: 0.55 }
    };
  }

  /**
   * Computes microclimate profile for a given location and season.
   * @param {string} community
   * @param {string} [season='summer']
   * @returns {Object}
   */
  assessMicroclimate(community, season = 'summer') {
    const slug = (community || '').toLowerCase().trim().replace(/\s+/g, '-');
    const zone = this.zones[slug] || {
      type: 'inland-metro',
      avgSummerHumidity: 55,
      seaBreezeExposure: 0.4,
      heatIslandIndex: 0.6
    };

    const isWinter = season.toLowerCase() === 'winter';
    const effectiveHumidity = isWinter ? Math.max(30, zone.avgSummerHumidity - 25) : zone.avgSummerHumidity;
    const comfortScore = Math.round(100 - (effectiveHumidity * 0.45) - (zone.heatIslandIndex * 30) + (zone.seaBreezeExposure * 20));

    return {
      community,
      slug,
      zoneType: zone.type,
      season,
      avgHumidityPct: effectiveHumidity,
      seaBreezeExposure: zone.seaBreezeExposure,
      heatIslandIndex: zone.heatIslandIndex,
      outdoorComfortScore: Math.max(10, Math.min(100, comfortScore)),
      airConditioningBurden: effectiveHumidity > 60 || zone.heatIslandIndex > 0.7 ? 'HIGH' : 'MODERATE'
    };
  }
}

export default new MicroclimateHumidityIndex();
