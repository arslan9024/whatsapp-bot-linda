/**
 * @file MasterPlanRenderComparator.js
 * @description Compares off-plan developer 3D concept renders with as-built handover
 * photographs to score delivery fidelity, material authenticity, and landscape density.
 * Category: Intelligence
 */

export class MasterPlanRenderComparator {
  /**
   * Evaluates delivery fidelity attributes
   * @param {Object} attributes
   * @param {number} attributes.facadeAccuracyPercent - 0 to 100
   * @param {number} attributes.amenityMatchPercent
   * @param {number} attributes.landscapingDensityPercent
   * @returns {{ compositeFidelityScore: number, grade: string, buyerAdvice: string }}
   */
  scoreRenderFidelity(attributes = {}) {
    const {
      facadeAccuracyPercent = 90,
      amenityMatchPercent = 85,
      landscapingDensityPercent = 80
    } = attributes;

    const composite = Math.round(
      (facadeAccuracyPercent * 0.40) +
      (amenityMatchPercent * 0.35) +
      (landscapingDensityPercent * 0.25)
    );

    let grade = 'EXCELLENT';
    let advice = 'Building exterior and amenities match developer renders with high fidelity.';

    if (composite < 75) {
      grade = 'DIVERGENT';
      advice = 'Noticeable variance between brochures and final handover. Inspect finishes closely on viewing.';
    } else if (composite < 85) {
      grade = 'ACCEPTABLE';
      advice = 'Standard minor material substitutions typical of UAE construction handovers.';
    }

    return {
      compositeFidelityScore: composite,
      grade,
      buyerAdvice: advice
    };
  }
}

export default new MasterPlanRenderComparator();
