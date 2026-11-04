/**
 * @file ExpatRelocationSchoolConcierge.js
 * @description Coordinates premier school tour bookings and admissions concierge for international families relocating to Dubai.
 * Category: 2️⃣ Domain / Feature (Cross-Border Wealth)
 */

export class ExpatRelocationSchoolConcierge {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.partnerSchools = options.partnerSchools || [
      { name: 'Dubai College', curriculum: 'British', khdaRating: 'Outstanding', minAge: 11, annualTuitionAed: 95000 },
      { name: 'Kings School Al Barsha', curriculum: 'British', khdaRating: 'Outstanding', minAge: 3, annualTuitionAed: 88000 },
      { name: 'Dubai International Academy (DIA)', curriculum: 'IB', khdaRating: 'Outstanding', minAge: 3, annualTuitionAed: 76000 }
    ];
  }

  /**
   * Matches family with top schools and arranges registrar introductions.
   * @param {Object} params
   * @param {string} params.curriculumPreference ('British', 'IB')
   * @param {number} params.childAge
   * @param {string} params.communityLocation
   * @returns {Object}
   */
  matchSchoolAdmission({ curriculumPreference, childAge, communityLocation }) {
    const matched = this.partnerSchools.filter(s =>
      (!curriculumPreference || s.curriculum.toLowerCase().includes(curriculumPreference.toLowerCase())) &&
      s.minAge <= childAge
    );
    const selected = matched[0] || this.partnerSchools[0];

    return {
      communityLocation,
      childAge,
      curriculumPreference,
      recommendedSchool: selected.name,
      curriculum: selected.curriculum,
      khdaRating: selected.khdaRating,
      annualTuitionAed: selected.annualTuitionAed,
      registrarFastTrackContact: `admissions@${selected.name.toLowerCase().replace(/[^a-z]/g, '')}.ae`,
      requiredAdmissionDocs: [
        'Child and parents passport & Emirates ID copies',
        'Past 2 years academic report cards (Ministry of Foreign Affairs attested)',
        'Transfer Certificate (TC) from prior school',
        'Immunization record card'
      ]
    };
  }
}

export default new ExpatRelocationSchoolConcierge();
