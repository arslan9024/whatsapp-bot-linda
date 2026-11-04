/**
 * @file FamilyDependentVisaCalculator.js
 * @description Computes comprehensive government fees (GDRFA, medical fitness, Emirates ID, stamping) for sponsoring spouse, children, and parents under a UAE Golden Visa.
 * Category: 2️⃣ Domain / Feature (Cross-Border Wealth)
 */

export class FamilyDependentVisaCalculator {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.feeSchedule = options.feeSchedule || {
      spouseVisaAed: 3850,
      childVisaAed: 3850,
      parentVisaAed: 5200,
      domesticStaffVisaAed: 4500,
      medicalFitnessVipAed: 700,
      emiratesId10YearAed: 1150
    };
  }

  /**
   * Calculates total family sponsorship cost.
   * @param {Object} params
   * @param {boolean} [params.hasSpouse=true]
   * @param {number} [params.childrenCount=0]
   * @param {number} [params.parentsCount=0]
   * @param {number} [params.domesticStaffCount=0]
   * @returns {Object}
   */
  calculateSponsorshipCosts({
    hasSpouse = true,
    childrenCount = 0,
    parentsCount = 0,
    domesticStaffCount = 0
  }) {
    let totalGovtFeesAed = 0;
    const breakdown = [];

    if (hasSpouse) {
      const spouseTotal = this.feeSchedule.spouseVisaAed + this.feeSchedule.medicalFitnessVipAed + this.feeSchedule.emiratesId10YearAed;
      totalGovtFeesAed += spouseTotal;
      breakdown.push({ relation: 'Spouse', count: 1, costPerPersonAed: spouseTotal, totalAed: spouseTotal });
    }

    if (childrenCount > 0) {
      const childTotal = (this.feeSchedule.childVisaAed + this.feeSchedule.emiratesId10YearAed) * childrenCount;
      totalGovtFeesAed += childTotal;
      breakdown.push({ relation: 'Children', count: childrenCount, costPerPersonAed: this.feeSchedule.childVisaAed + this.feeSchedule.emiratesId10YearAed, totalAed: childTotal });
    }

    if (parentsCount > 0) {
      const parentTotal = (this.feeSchedule.parentVisaAed + this.feeSchedule.medicalFitnessVipAed + this.feeSchedule.emiratesId10YearAed) * parentsCount;
      totalGovtFeesAed += parentTotal;
      breakdown.push({ relation: 'Parents', count: parentsCount, costPerPersonAed: this.feeSchedule.parentVisaAed + this.feeSchedule.medicalFitnessVipAed + this.feeSchedule.emiratesId10YearAed, totalAed: parentTotal });
    }

    if (domesticStaffCount > 0) {
      const staffTotal = (this.feeSchedule.domesticStaffVisaAed + this.feeSchedule.medicalFitnessVipAed) * domesticStaffCount;
      totalGovtFeesAed += staffTotal;
      breakdown.push({ relation: 'Domestic Staff', count: domesticStaffCount, costPerPersonAed: this.feeSchedule.domesticStaffVisaAed + this.feeSchedule.medicalFitnessVipAed, totalAed: staffTotal });
    }

    const totalDependents = (hasSpouse ? 1 : 0) + childrenCount + parentsCount + domesticStaffCount;

    return {
      totalDependents,
      totalGovtFeesAed,
      feeBreakdown: breakdown,
      validityYears: 10,
      perkSummary: 'Dependents under Golden Visa can remain in the UAE until the end of their permit validity even if the primary Golden Visa holder passes away.'
    };
  }
}

export default new FamilyDependentVisaCalculator();
