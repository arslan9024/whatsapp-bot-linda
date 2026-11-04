/**
 * @file HighTensionPowerBufferGuard.js
 * @description Verifies buffer setback distances from DEWA 132kV/400kV high-tension
 * overhead transmission corridors to protect resale capital values and aesthetic sightlines.
 * Category: Domain / Feature (Spatial)
 */

export class HighTensionPowerBufferGuard {
  constructor() {
    this.safeBufferThresholdMeters = 150;
  }

  /**
   * Assesses distance from high-voltage transmission line infrastructure
   * @param {number} distanceMeters
   * @returns {{ safeSetback: boolean, bufferDistanceMeters: number, valuationImpactPercent: number, advisory: string }}
   */
  evaluateBufferSetback(distanceMeters = 300) {
    const safeSetback = distanceMeters >= this.safeBufferThresholdMeters;
    let valuationImpact = 0;
    let advisory = 'Clean setback. Property is outside high-voltage electromagnetic and visual corridors.';

    if (!safeSetback) {
      valuationImpact = distanceMeters < 50 ? -12 : -6;
      advisory = `Plot is ${distanceMeters}m from transmission corridor. Secondary buyers may discount asking price by 5-10% due to visible pylon lines.`;
    }

    return {
      safeSetback,
      bufferDistanceMeters: distanceMeters,
      valuationImpactPercent: valuationImpact,
      advisory
    };
  }
}

export default new HighTensionPowerBufferGuard();
