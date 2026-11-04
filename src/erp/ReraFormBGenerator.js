/**
 * @file ReraFormBGenerator.js
 * @description Generates structured RERA Form B (Buyer Agency Agreement) specifications, protecting broker agency fees and defining property search mandates.
 * Category: 2️⃣ Domain / Feature (Brokerage ERP & Legal MOU)
 */

export class ReraFormBGenerator {
  /**
   * Generates RERA Form B agreement payload.
   * @param {Object} params
   * @param {string} params.buyerName
   * @param {string} params.buyerPassport
   * @param {string} params.brokerAgencyOrn
   * @param {string} params.targetPropertyType ('Villa', 'Apartment', 'Full Floor')
   * @param {number} params.maxBudgetAed
   * @param {number} [params.commissionPct=2.0]
   * @returns {Object}
   */
  generateFormB(params) {
    const commPct = params.commissionPct || 2.0;

    return {
      formType: 'RERA_FORM_B_BUYER_AGREEMENT',
      contractId: `FORM-B-${Date.now().toString(36).toUpperCase()}`,
      buyer: {
        name: params.buyerName,
        passportNumber: params.buyerPassport
      },
      brokerageOrn: params.brokerAgencyOrn,
      mandateScope: {
        propertyType: params.targetPropertyType,
        maxBudgetAed: params.maxBudgetAed,
        commissionFeePct: commPct,
        vatPct: 5.0,
        validityDays: 60
      },
      nonCircumventionClause: 'Buyer agrees not to directly contact sellers or secondary agents introduced by the Brokerage without written agreement.',
      digitalExecutionMethod: 'Digital DocuSign / UAE Pass Verified'
    };
  }
}

export default new ReraFormBGenerator();
