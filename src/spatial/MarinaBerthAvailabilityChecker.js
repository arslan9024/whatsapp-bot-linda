/**
 * @file MarinaBerthAvailabilityChecker.js
 * @description Inquires and benchmarks private yacht mooring berth capacities
 * across Dubai Marina Yacht Club, Dubai Harbour, and Bulgari Marina for yachting buyers.
 * Category: Domain / Feature (Spatial)
 */

export class MarinaBerthAvailabilityChecker {
  constructor() {
    this.marinaHubs = {
      'DUBAI_HARBOUR': { maxVesselLengthFeet: 160, superyachtReady: true, annualRatePerFootAed: 1800 },
      'DUBAI_MARINA_YACHT_CLUB': { maxVesselLengthFeet: 110, superyachtReady: true, annualRatePerFootAed: 1500 },
      'BULGARI_MARINA': { maxVesselLengthFeet: 140, superyachtReady: true, annualRatePerFootAed: 2400 },
      'CREEK_MARINA': { maxVesselLengthFeet: 90, superyachtReady: false, annualRatePerFootAed: 1200 }
    };
  }

  /**
   * Estimates mooring costs and suitability for a buyer's boat
   * @param {string} marinaKey
   * @param {number} vesselLengthFeet
   * @returns {Object} Mooring feasibility and cost analysis
   */
  evaluateBerth(marinaKey = 'DUBAI_MARINA_YACHT_CLUB', vesselLengthFeet = 45) {
    const hub = this.marinaHubs[marinaKey] || this.marinaHubs.DUBAI_MARINA_YACHT_CLUB;
    const canAccommodate = vesselLengthFeet <= hub.maxVesselLengthFeet;
    const annualMooringCostAed = canAccommodate ? vesselLengthFeet * hub.annualRatePerFootAed : null;

    return {
      marina: marinaKey,
      vesselLengthFeet,
      canAccommodate,
      superyachtFacility: hub.superyachtReady,
      estimatedAnnualBerthCostAed: annualMooringCostAed,
      advisory: canAccommodate
        ? `Berth capacity verified. Estimated annual mooring cost: AED ${annualMooringCostAed.toLocaleString()}.`
        : `Vessel exceeds max length (${hub.maxVesselLengthFeet} ft) for this marina. Route to Dubai Harbour.`
    };
  }
}

export default new MarinaBerthAvailabilityChecker();
