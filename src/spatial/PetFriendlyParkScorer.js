/**
 * @file PetFriendlyParkScorer.js
 * @description Evaluates community pet-friendliness, mapping dedicated enclosed dog parks,
 * off-leash zones, veterinary hospital proximity, and developer pet bylaws.
 * Category: Domain / Feature (Spatial)
 */

export class PetFriendlyParkScorer {
  constructor() {
    this.petProfiles = {
      'THE_GREENS': { isPetFriendly: true, dogParkCount: 2, vetClinicMinutes: 3, bylawAllowed: true },
      'DUBAI_HILLS_ESTATE': { isPetFriendly: true, dogParkCount: 1, vetClinicMinutes: 6, bylawAllowed: true },
      'JBR_BAHAR': { isPetFriendly: false, dogParkCount: 0, vetClinicMinutes: 10, bylawAllowed: false },
      'ARABIAN_RANCHES': { isPetFriendly: true, dogParkCount: 3, vetClinicMinutes: 5, bylawAllowed: true }
    };
  }

  /**
   * Evaluates pet friendliness for a target area
   * @param {string} community
   * @returns {Object} Pet-friendly community audit
   */
  evaluatePetFriendliness(community = '') {
    const key = community.toUpperCase().replace(/\s+/g, '_');
    const profile = this.petProfiles[key] || {
      isPetFriendly: true,
      dogParkCount: 1,
      vetClinicMinutes: 8,
      bylawAllowed: true
    };

    return {
      community,
      isPetFriendly: profile.isPetFriendly,
      dedicatedDogParks: profile.dogParkCount,
      nearestVetDriveMinutes: profile.vetClinicMinutes,
      developerBylawPermission: profile.bylawAllowed,
      score: profile.isPetFriendly ? 85 + (profile.dogParkCount * 5) : 20
    };
  }
}

export default new PetFriendlyParkScorer();
