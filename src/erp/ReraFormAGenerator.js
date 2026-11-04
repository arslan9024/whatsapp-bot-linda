/**
 * @file ReraFormAGenerator.js
 * @description Generates structured RERA Form A (Seller Agency Agreement) specifications, enforcing maximum commission limits, exclusivity mandates, and DLD digital verification requirements.
 * Category: 2️⃣ Domain / Feature (Brokerage ERP & Legal MOU)
 */

export class ReraFormAGenerator {
  /**
   * Generates RERA Form A agreement specification.
   * @param {Object} contractParams
   * @param {string} contractParams.sellerName
   * @param {string} contractParams.sellerPassportOrEid
   * @param {string} contractParams.propertyTitleDeedNumber
   * @param {string} contractParams.brokerAgencyOrn
   * @param {number} contractParams.agreedPriceAed
   * @param {number} [contractParams.commissionPct=2.0]
   * @param {boolean} [contractParams.isExclusive=true]
   * @returns {Object}
   */
  generateFormA(contractParams) {
    const isExclusive = Boolean(contractParams.isExclusive);
    const commPct = Math.min(2.0, contractParams.commissionPct || 2.0); // Standard max 2% seller side

    return {
      formType: 'RERA_FORM_A_SELLER_MANDATE',
      contractId: `FORM-A-${Date.now().toString(36).toUpperCase()}`,
      seller: {
        name: contractParams.sellerName,
        identity: contractParams.sellerPassportOrEid
      },
      property: {
        titleDeedNumber: contractParams.propertyTitleDeedNumber,
        listedPriceAed: contractParams.agreedPriceAed
      },
      brokerageOrn: contractParams.brokerAgencyOrn,
      terms: {
        mandateType: isExclusive ? 'SOLE_EXCLUSIVE_AGENCY' : 'OPEN_LISTING',
        commissionPercentage: commPct,
        vatPercentage: 5.0,
        validityDays: isExclusive ? 90 : 30
      },
      dldTrakheesiRequirement: 'Brokerage must link this signed Form A to obtain official DLD Trakheesi Permit before advertising.',
      digitalSigningPlatform: 'UAE Pass / DLD REST Digital Signature'
    };
  }
}

export default new ReraFormAGenerator();
