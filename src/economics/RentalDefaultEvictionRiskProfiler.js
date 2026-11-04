/**
 * @file RentalDefaultEvictionRiskProfiler.js
 * @description Evaluates tenant payment default probability, rental dispute committee (RDC) history, and eviction exposure across submarkets.
 * Category: 2️⃣ Domain / Feature (Market Economics)
 */

export class RentalDefaultEvictionRiskProfiler {
  /**
   * Evaluates tenant demographic payment resilience.
   * @param {Object} params
   * @param {string} params.community
   * @param {number} [params.annualRentAed=100000]
   * @param {number} [params.chequeCount=1]
   * @param {string} [params.employmentSector='multinational-corporate']
   * @returns {Object}
   */
  profileDefaultRisk({
    community,
    annualRentAed = 100000,
    chequeCount = 1,
    employmentSector = 'multinational-corporate'
  }) {
    let riskPoints = 10; // Baseline low risk

    // Cheque count risk: 1-cheque is lowest risk, 4-6 cheques higher
    if (chequeCount >= 6) riskPoints += 25;
    else if (chequeCount >= 4) riskPoints += 15;
    else if (chequeCount === 2) riskPoints += 5;

    // Sector risk
    const sectorLower = employmentSector.toLowerCase();
    if (sectorLower.includes('freelance') || sectorLower.includes('startup')) {
      riskPoints += 25;
    } else if (sectorLower.includes('sme')) {
      riskPoints += 15;
    } else if (sectorLower.includes('government') || sectorLower.includes('multinational')) {
      riskPoints -= 5;
    }

    const clampedRisk = Math.max(5, Math.min(95, riskPoints));
    let rating = 'MINIMAL_RISK';
    if (clampedRisk >= 50) rating = 'HIGH_DEFAULT_EXPOSURE';
    else if (clampedRisk >= 30) rating = 'MODERATE_CREDIT_WATCH';

    return {
      community: community || 'General Dubai',
      annualRentAed,
      chequeCount,
      employmentSector,
      defaultProbabilityScore: clampedRisk,
      riskRating: rating,
      rdcEvictionTimelineDays: 90, // Standard Dubai Rental Dispute Centre resolution timeline
      recommendedMitigation: clampedRisk > 35
        ? 'Mandate 1 or 2 cheques maximum, or require direct debit (Ejari UAEPGS system) with 10% security deposit.'
        : 'Standard Ejari tenancy safeguards sufficient.'
    };
  }
}

export default new RentalDefaultEvictionRiskProfiler();
