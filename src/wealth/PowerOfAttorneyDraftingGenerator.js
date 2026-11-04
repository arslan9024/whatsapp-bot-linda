/**
 * @file PowerOfAttorneyDraftingGenerator.js
 * @description Generates structured bilingual (Arabic/English) Power of Attorney specifications for property purchase, resale, and developer utility connection representation.
 * Category: 2️⃣ Domain / Feature (Cross-Border Wealth)
 */

export class PowerOfAttorneyDraftingGenerator {
  /**
   * Generates POA clause blueprint for Dubai Court notary execution.
   * @param {Object} params
   * @param {string} params.principalName
   * @param {string} params.principalPassport
   * @param {string} params.attorneyName
   * @param {string} params.attorneyEmiratesId
   * @param {Array<string>} [params.authorizedPowers]
   * @param {string} [params.specificPropertyRef]
   * @returns {Object}
   */
  generatePoaDraft({
    principalName,
    principalPassport,
    attorneyName,
    attorneyEmiratesId,
    authorizedPowers = ['purchase', 'sign-mou-contract-f', 'register-dld', 'connect-dewa'],
    specificPropertyRef = 'ALL_PROPERTIES'
  }) {
    const isRestrictedToSpecificUnit = specificPropertyRef !== 'ALL_PROPERTIES';
    const clausesEn = [
      `Represent the Principal before Dubai Land Department (DLD) for property transactions.`,
      `Sign real estate sale and purchase agreements (Contract F / MOU) on behalf of Principal.`,
      `Apply for No Objection Certificates (NOC) from developers.`,
      `Apply for and register DEWA, Empower, and district cooling connections.`
    ];

    if (authorizedPowers.includes('resale-receive-funds')) {
      clausesEn.push(`Receive manager's cheques strictly in the name of the Principal (no third-party cash collection permitted).`);
    }

    return {
      poaReference: `POA-DXB-${Date.now().toString(36).toUpperCase()}`,
      principal: { name: principalName, passport: principalPassport },
      attorney: { name: attorneyName, emiratesId: attorneyEmiratesId },
      scope: isRestrictedToSpecificUnit ? `Restricted to Unit: ${specificPropertyRef}` : 'General Real Estate Management Scope',
      authorizedPowers,
      notarizationPath: 'Dubai Courts Digital Notary (via UAE Pass or Ministry of Foreign Affairs MOFA overseas attestation)',
      clausesEnglish: clausesEn,
      estimatedNotaryFeeAed: 1250,
      validityPeriodMonths: 24
    };
  }
}

export default new PowerOfAttorneyDraftingGenerator();
