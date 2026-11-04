/**
 * @file TaxResidencyCertificateFacilitator.js
 * @description Guides international property investors on obtaining Federal Tax Authority (FTA) Tax Residency Certificates (TRC) under the 90-day / 183-day physical presence rules.
 * Category: 2️⃣ Domain / Feature (Cross-Border Wealth)
 */

export class TaxResidencyCertificateFacilitator {
  /**
   * Assesses individual eligibility for UAE Tax Residency Certificate.
   * @param {Object} params
   * @param {number} params.daysInUaePast12Months
   * @param {boolean} [params.hasEmiratesId=true]
   * @param {boolean} [params.hasEjariOrTitleDeed=true]
   * @param {number} [params.annualSalaryOrDividendInUaeAed=0]
   * @returns {Object}
   */
  assessTrcEligibility({
    daysInUaePast12Months,
    hasEmiratesId = true,
    hasEjariOrTitleDeed = true,
    annualSalaryOrDividendInUaeAed = 0
  }) {
    // Under Cabinet Decision No. 85 of 2022:
    // 183 days physical presence -> automatic tax resident
    // 90 days physical presence + UAE citizen/resident with primary residence or financial center in UAE -> qualified tax resident
    let qualifiedRule = null;
    let isEligible = false;

    if (daysInUaePast12Months >= 183 && hasEmiratesId) {
      qualifiedRule = '183-Day Physical Presence Standard (Cabinet Decision 85/2022 Art. 4(1))';
      isEligible = true;
    } else if (daysInUaePast12Months >= 90 && hasEmiratesId && hasEjariOrTitleDeed && annualSalaryOrDividendInUaeAed > 0) {
      qualifiedRule = '90-Day Primary Permanent Home & Financial Ties Standard (Art. 4(2))';
      isEligible = true;
    }

    return {
      daysInUaePast12Months,
      hasEmiratesId,
      hasEjariOrTitleDeed,
      isEligible,
      applicableRule: qualifiedRule || 'Ineligible: Less than 90 days physical presence or missing financial ties',
      requiredDocuments: [
        'Certified entry/exit report issued by GDRFA / ICP',
        'Valid Passport and Emirates ID copies',
        'Title deed or attested Ejari tenancy contract',
        '6-month UAE bank statement showing active local transactions'
      ],
      ftaApplicationFeeAed: 1750,
      processingTimeBusinessDays: 5
    };
  }
}

export default new TaxResidencyCertificateFacilitator();
