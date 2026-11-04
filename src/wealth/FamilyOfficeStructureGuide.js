/**
 * @file FamilyOfficeStructureGuide.js
 * @description Provides structural blueprints for holding Dubai real estate through DIFC and ADGM Foundations and Special Purpose Vehicles (SPVs) for asset protection and succession.
 * Category: 2️⃣ Domain / Feature (Cross-Border Wealth)
 */

export class FamilyOfficeStructureGuide {
  /**
   * Resolves holding company structure recommendations.
   * @param {Object} params
   * @param {number} params.portfolioValueAed
   * @param {string} [params.primaryObjective='succession-planning']
   * @param {string} [params.jurisdiction='DIFC']
   * @returns {Object}
   */
  recommendStructure({ portfolioValueAed, primaryObjective = 'succession-planning', jurisdiction = 'DIFC' }) {
    const jur = jurisdiction.toUpperCase().trim() === 'ADGM' ? 'ADGM' : 'DIFC';
    const isFoundationRecommended = portfolioValueAed >= 5000000;

    const setupFeeUsd = jur === 'DIFC' ? (isFoundationRecommended ? 8500 : 5000) : (isFoundationRecommended ? 7000 : 4000);
    const annualRenewalUsd = jur === 'DIFC' ? 4000 : 3500;

    return {
      jurisdiction: jur,
      portfolioValueAed,
      primaryObjective,
      recommendedEntity: isFoundationRecommended ? `${jur} Private Foundation + Holding SPV` : `${jur} Prescribed Company (SPV)`,
      estimatedSetupCostUsd: setupFeeUsd,
      annualMaintenanceUsd: annualRenewalUsd,
      legalPerks: [
        '100% foreign ownership of freehold Dubai real estate',
        'Exempt from Sharia default succession laws for non-Muslim expatriates',
        'Direct registration with Dubai Land Department (DLD Memorandum of Understanding in force)',
        'Zero personal income tax, zero capital gains tax'
      ],
      structuringSteps: [
        `1. Form holding vehicle in ${jur} with registered corporate service provider.`,
        '2. Execute DLD pre-approval for corporate entity real estate purchasing.',
        '3. Transfer title deeds directly into SPV registry name.'
      ]
    };
  }
}

export default new FamilyOfficeStructureGuide();
