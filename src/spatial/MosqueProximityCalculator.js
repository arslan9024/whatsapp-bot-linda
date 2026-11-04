/**
 * @file MosqueProximityCalculator.js
 * @description Calculates pedestrian walking distance to local community Juma'a mosques
 * and Musallas, providing proximity and call-to-prayer (Adhan) acoustic guidance.
 * Category: Domain / Feature (Spatial)
 */

export class MosqueProximityCalculator {
  /**
   * Assesses mosque proximity metrics
   * @param {number} distanceMeters
   * @returns {{ walkingMinutes: number, proximityTier: string, acousticAdhanNotice: string }}
   */
  assessProximity(distanceMeters = 350) {
    const walkingMinutes = Math.max(1, Math.round(distanceMeters / 75)); // ~75m/min relaxed walk

    let tier = 'IMMEDIATE_WALKABLE';
    let adhan = 'Clear Adhan acoustic presence; convenient 3-minute walk for daily prayers.';

    if (distanceMeters > 1000) {
      tier = 'DRIVING_DISTANCE';
      adhan = 'Minimal to no Adhan acoustic audibility indoors; 4-minute neighborhood drive.';
    } else if (distanceMeters > 500) {
      tier = 'COMFORTABLE_PROXIMITY';
      adhan = 'Gentle ambient Adhan audibility; easy 7-10 minute pedestrian walk.';
    }

    return {
      distanceMeters,
      walkingMinutes,
      proximityTier: tier,
      acousticAdhanNotice: adhan
    };
  }
}

export default new MosqueProximityCalculator();
