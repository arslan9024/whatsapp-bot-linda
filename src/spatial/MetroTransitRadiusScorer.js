/**
 * @file MetroTransitRadiusScorer.js
 * @description Calculates walking distances and travel times to current Dubai Metro
 * stations (Red/Green Lines) and planned 2029 Blue Line interchanges for tenant transit scoring.
 * Category: Domain / Feature (Spatial)
 */

export class MetroTransitRadiusScorer {
  constructor() {
    this.keyStations = [
      { name: 'Burj Khalifa / Dubai Mall', line: 'RED', lat: 25.1972, lng: 55.2744 },
      { name: 'Dubai Marina / Sobha Realty', line: 'RED', lat: 25.0768, lng: 55.1403 },
      { name: 'Financial Centre', line: 'RED', lat: 25.2104, lng: 55.2778 },
      { name: 'Dubai Creek Harbour Interchange', line: 'BLUE_2029', lat: 25.1980, lng: 55.3520 }
    ];
  }

  /**
   * Approximates walking distance in meters from latitude/longitude (Haversine formula)
   */
  calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  }

  /**
   * Scores proximity to closest active or planned transit station
   * @param {number} propertyLat
   * @param {number} propertyLng
   * @returns {Object} Nearest station details and pedestrian walkability score
   */
  evaluateTransitProximity(propertyLat, propertyLng) {
    let closestStation = null;
    let minDistance = Infinity;

    for (const st of this.keyStations) {
      const dist = this.calculateDistanceMeters(propertyLat, propertyLng, st.lat, st.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closestStation = st;
      }
    }

    const walkingMinutes = Math.round(minDistance / 80); // ~80m/min walking speed
    const isPedestrianWalkable = minDistance <= 800; // Under 10 minutes walk

    return {
      nearestStation: closestStation.name,
      metroLine: closestStation.line,
      distanceMeters: minDistance,
      walkingMinutes,
      isPedestrianWalkable,
      transitScore: Math.max(10, Math.min(100, Math.round(100 - (minDistance / 50))))
    };
  }
}

export default new MetroTransitRadiusScorer();

