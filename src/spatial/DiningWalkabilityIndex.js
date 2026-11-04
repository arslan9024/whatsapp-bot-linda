/**
 * @file DiningWalkabilityIndex.js
 * @description Scores pedestrian walkability to premium grocers (Waitrose, Spinneys)
 * and licensed dining clusters, calculating the 15-minute lifestyle convenience index.
 * Category: Domain / Feature (Spatial)
 */

export class DiningWalkabilityIndex {
  /**
   * Calculates pedestrian walkability score
   * @param {Object} amenities
   * @param {number} amenities.gourmetGrocerWalkMinutes - Walk to Waitrose/Spinneys
   * @param {number} amenities.fineDiningCount - Within 800m
   * @param {number} amenities.cafeCount - Within 400m
   * @returns {{ walkScore: number, classification: string, lifestyleVerdict: string }}
   */
  scoreWalkability(amenities = {}) {
    const { gourmetGrocerWalkMinutes = 5, fineDiningCount = 6, cafeCount = 4 } = amenities;

    let score = 50;

    // Grocer walkability bonus
    if (gourmetGrocerWalkMinutes <= 5) score += 25;
    else if (gourmetGrocerWalkMinutes <= 10) score += 15;
    else score -= 15;

    // Dining density bonus
    score += Math.min(15, fineDiningCount * 2.5);
    score += Math.min(10, cafeCount * 2.5);

    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    let classification = 'CAR_DEPENDENT';
    if (finalScore >= 85) classification = 'WALKERS_PARADISE';
    else if (finalScore >= 70) classification = 'HIGHLY_WALKABLE';
    else if (finalScore >= 50) classification = 'SOMEWHAT_WALKABLE';

    return {
      walkScore: finalScore,
      classification,
      lifestyleVerdict: finalScore >= 70
        ? 'Daily errands, specialty organic coffee, and gourmet dining accomplishable entirely on foot.'
        : 'Suburban driving lifestyle; vehicle required for major grocery shopping.'
    };
  }
}

export default new DiningWalkabilityIndex();
