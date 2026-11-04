/**
 * @file ExpatWillProbateAdvisor.js
 * @description Outlines succession planning options for non-Muslim real estate owners, detailing DIFC Wills and Probate Registry vs Dubai Courts notarized wills.
 * Category: 2️⃣ Domain / Feature (Cross-Border Wealth)
 */

export class ExpatWillProbateAdvisor {
  /**
   * Evaluates estate planning options for non-Muslim expatriate buyers.
   * @param {Object} params
   * @param {number} params.propertyCount
   * @param {boolean} [params.hasMinorChildren=false]
   * @param {string} [params.preferredRegistry='DIFC']
   * @returns {Object}
   */
  assessSuccessionOptions({ propertyCount, hasMinorChildren = false, preferredRegistry = 'DIFC' }) {
    const isDifc = preferredRegistry.toUpperCase() === 'DIFC';

    const willType = propertyCount > 1
      ? (hasMinorChildren ? 'Full Will (Guardianship & Multiple Properties)' : 'Real Estate Will (Up to 5 Properties)')
      : 'Single Property Will';

    const registrationFeeAed = isDifc
      ? (willType.includes('Single') ? 8500 : 15500)
      : 2500; // Dubai Courts notary fee

    return {
      registry: isDifc ? 'DIFC Wills & Probate Registry' : 'Dubai Notary Public (Civil Law Will)',
      recommendedWillType: willType,
      estimatedRegistrationFeeAed: registrationFeeAed,
      languageRequirement: isDifc ? 'English only (Common Law)' : 'Bilingual Arabic & English (Ministry of Justice certified translation)',
      primaryLegalBenefit: isDifc
        ? 'Direct distribution of Dubai real estate under testamentary freedom without freezing bank accounts or Sharia default division.'
        : 'Statutory recognition by Dubai Courts under UAE Personal Status Law for Non-Muslims (Federal Decree-Law No. 41 of 2022).',
      virtualExecutionAvailable: true
    };
  }
}

export default new ExpatWillProbateAdvisor();
