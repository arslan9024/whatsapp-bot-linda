/**
 * @file SunExposureHeatSimulator.js
 * @description Analyzes Dubai solar orientation (+25.2°N latitude) to predict seasonal
 * direct afternoon sun exposure, natural daylight quality, and cooling energy loads.
 * Category: Domain / Feature (Spatial)
 */

export class SunExposureHeatSimulator {
  /**
   * Evaluates solar exposure impact based on unit orientation
   * @param {'NORTH'|'SOUTH'|'EAST'|'WEST'|'NORTH_EAST'|'SOUTH_WEST'} orientation
   * @param {number} [floorLevel]
   * @returns {{ lightingProfile: string, afternoonHeatIndex: string, coolingImpact: string, advice: string }}
   */
  evaluateSunExposure(orientation = 'NORTH', floorLevel = 10) {
    const directWest = orientation.includes('WEST');
    const directSouth = orientation.includes('SOUTH');

    if (directWest) {
      return {
        orientation,
        lightingProfile: 'Intense golden sunset light; high afternoon exposure',
        afternoonHeatIndex: 'HIGH',
        coolingImpact: 'Elevated AC consumption from 2:00 PM to 6:00 PM in summer',
        advice: 'Recommend UV heat-reflective window tinting or motorized solar blackout shades.'
      };
    }

    if (directSouth) {
      return {
        orientation,
        lightingProfile: 'Consistently bright, sunlit throughout the day',
        afternoonHeatIndex: 'MODERATE',
        coolingImpact: 'Moderate baseline cooling requirements',
        advice: 'Optimal for indoor plants and buyers seeking bright, sun-filled living spaces.'
      };
    }

    return {
      orientation,
      lightingProfile: 'Soft, indirect diffuse northern daylight; no harsh glare',
      afternoonHeatIndex: 'LOW',
      coolingImpact: 'Lowest energy consumption; naturally cooler interiors',
      advice: 'Highly sought-after orientation in Dubai for thermal comfort.'
    };
  }
}

export default new SunExposureHeatSimulator();
