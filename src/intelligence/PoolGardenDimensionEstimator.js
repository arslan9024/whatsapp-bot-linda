/**
 * @file PoolGardenDimensionEstimator.js
 * @description Estimates private swimming pool dimensions, outdoor terrace area,
 * and garden square footage from plot size and Built-Up Area (BUA) data.
 * Category: Intelligence
 */

export class PoolGardenDimensionEstimator {
  /**
   * Computes outdoor landscape and pool space metrics
   * @param {Object} villa
   * @param {number} villa.plotSizeSqFt
   * @param {number} villa.builtUpAreaSqFt - (BUA)
   * @param {boolean} [villa.hasPrivatePool]
   * @returns {Object} Outdoor amenity dimension estimates
   */
  estimateOutdoorDimensions(villa = {}) {
    const { plotSizeSqFt = 6000, builtUpAreaSqFt = 4500, hasPrivatePool = true } = villa;

    // Ground floor footprint is typically ~55% of total multi-story BUA
    const groundFootprintSqFt = Math.round(builtUpAreaSqFt * 0.55);
    const outdoorGardenSpaceSqFt = Math.max(0, plotSizeSqFt - groundFootprintSqFt);

    let estimatedPoolAreaSqFt = 0;
    let poolDimensions = null;

    if (hasPrivatePool && outdoorGardenSpaceSqFt > 500) {
      estimatedPoolAreaSqFt = Math.min(450, Math.round(outdoorGardenSpaceSqFt * 0.20));
      // Standard luxury plunge / lap pool: e.g. 10m x 4m (~430 sqft)
      poolDimensions = {
        lengthMeters: 9.0,
        widthMeters: 4.0,
        depthMeters: 1.5,
        estimatedVolumeLiters: 9 * 4 * 1.5 * 1000
      };
    }

    return {
      plotSizeSqFt,
      builtUpAreaSqFt,
      outdoorGardenSpaceSqFt,
      hasPrivatePool,
      estimatedPoolAreaSqFt,
      poolDimensions,
      landscapingPotential: outdoorGardenSpaceSqFt >= 2000 ? 'EXPANSIVE_ESTATE' : 'COMPACT_COURTYARD'
    };
  }
}

export default new PoolGardenDimensionEstimator();

