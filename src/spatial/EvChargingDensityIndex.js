/**
 * @file EvChargingDensityIndex.js
 * @description Maps DEWA EV Green Charger hubs and Tesla Supercharger density within
 * a 3km neighborhood radius for electric vehicle owners and ESG-conscious buyers.
 * Category: Domain / Feature (Spatial)
 */

export class EvChargingDensityIndex {
  constructor() {
    this.evHubsByCommunity = {
      'DOWNTOWN_DUBAI': { fastChargers: 14, standardDewaPorts: 32, teslaSuperchargers: 8 },
      'DUBAI_HILLS_ESTATE': { fastChargers: 6, standardDewaPorts: 18, teslaSuperchargers: 4 },
      'DUBAI_MARINA': { fastChargers: 10, standardDewaPorts: 24, teslaSuperchargers: 6 },
      'PALM_JUMEIRAH': { fastChargers: 8, standardDewaPorts: 16, teslaSuperchargers: 4 }
    };
  }

  /**
   * Evaluates EV charging infrastructure index for a community
   * @param {string} community
   * @returns {Object} EV charging availability index
   */
  evaluateEvInfrastructure(community = 'Downtown Dubai') {
    const key = community.toUpperCase().replace(/\s+/g, '_');
    const hub = this.evHubsByCommunity[key] || { fastChargers: 2, standardDewaPorts: 6, teslaSuperchargers: 0 };

    const totalPorts = hub.fastChargers + hub.standardDewaPorts + hub.teslaSuperchargers;
    const score = Math.min(100, totalPorts * 2);

    return {
      community,
      totalPorts,
      breakdown: hub,
      evReadinessScore: score,
      tier: score >= 60 ? 'HIGH_DENSITY_READY' : 'GROWING_INFRASTRUCTURE'
    };
  }
}

export default new EvChargingDensityIndex();
