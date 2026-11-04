/**
 * @file GolfCourseViewClassifier.js
 * @description Classifies golf estate fairway exposures (18th Green Championship view,
 * rolling fairway panorama, or back-fence perimeter) and calculates price premium tiers.
 * Category: Domain / Feature (Spatial)
 */

export class GolfCourseViewClassifier {
  constructor() {
    this.viewTiers = {
      SIGNATURE_HOLE_LAKE: { tierName: 'Championship Hole & Lake', pricePremiumPercent: 25, rarity: 'ULTRA_RARE' },
      OPEN_FAIRWAY_PANORAMA: { tierName: 'Direct Open Fairway', pricePremiumPercent: 15, rarity: 'HIGH_DEMAND' },
      PARTIAL_FAIRWAY_TREES: { tierName: 'Partial Fairway with Landscaping', pricePremiumPercent: 8, rarity: 'STANDARD_PREMIUM' },
      PERIMETER_BACKING_FENCE: { tierName: 'Perimeter Boundary (No Golf View)', pricePremiumPercent: 0, rarity: 'BASELINE' }
    };
  }

  /**
   * Classifies golf course view based on visual description
   * @param {string} viewDescription
   * @returns {Object} Golf view classification
   */
  classifyGolfView(viewDescription = '') {
    const lower = viewDescription.toLowerCase();

    if (lower.includes('18th') || (lower.includes('lake') && lower.includes('green'))) {
      return this.viewTiers.SIGNATURE_HOLE_LAKE;
    }
    if (lower.includes('fairway') && !lower.includes('partial')) {
      return this.viewTiers.OPEN_FAIRWAY_PANORAMA;
    }
    if (lower.includes('partial') || lower.includes('filtered')) {
      return this.viewTiers.PARTIAL_FAIRWAY_TREES;
    }

    return this.viewTiers.PERIMETER_BACKING_FENCE;
  }
}

export default new GolfCourseViewClassifier();
