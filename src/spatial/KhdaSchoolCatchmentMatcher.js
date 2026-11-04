/**
 * @file KhdaSchoolCatchmentMatcher.js
 * @description Matches family buyers with top-tier Outstanding and Very Good rated
 * KHDA (Knowledge and Human Development Authority) schools within a 10-15 minute radius.
 * Category: Domain / Feature (Spatial)
 */

export class KhdaSchoolCatchmentMatcher {
  constructor() {
    this.schools = [
      { name: "Dubai College", rating: "Outstanding", curriculum: "British", lat: 25.1055, lng: 55.1764 },
      { name: "Jumeirah English Speaking School (JESS)", rating: "Outstanding", curriculum: "British/IB", lat: 25.0531, lng: 55.2530 },
      { name: "Kings' School Dubai", rating: "Outstanding", curriculum: "British", lat: 25.1384, lng: 55.2078 },
      { name: "GEMS Wellington International", rating: "Outstanding", curriculum: "British/IB", lat: 25.1221, lng: 55.1950 },
      { name: "Dubai International Academy (DIA)", rating: "Very Good", curriculum: "IB", lat: 25.0740, lng: 55.1690 }
    ];
  }

  /**
   * Approximates driving distance in kilometers
   */
  calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  /**
   * Finds top schools within radius of property
   * @param {number} propertyLat
   * @param {number} propertyLng
   * @param {number} [maxDistanceKm]
   * @returns {Array<Object>} Sorted list of top nearby schools
   */
  findNearbySchools(propertyLat, propertyLng, maxDistanceKm = 8.0) {
    const matches = [];

    for (const school of this.schools) {
      const dist = this.calculateDistanceKm(propertyLat, propertyLng, school.lat, school.lng);
      if (dist <= maxDistanceKm) {
        matches.push({
          ...school,
          distanceKm: dist,
          estimatedDriveMinutes: Math.round(dist * 2.2) // ~2.2 mins per km in suburban traffic
        });
      }
    }

    return matches.sort((a, b) => a.distanceKm - b.distanceKm);
  }
}

export default new KhdaSchoolCatchmentMatcher();
