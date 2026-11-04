/**
 * @file TrusteeFeeExpenseLedger.js
 * @description Itemizes all mandatory Dubai Land Department conveyance charges, Trustee registration fees, title deed fees, and knowledge fees for buyer settlement.
 * Category: 2️⃣ Domain / Feature (Brokerage ERP & Legal MOU)
 */

export class TrusteeFeeExpenseLedger {
  /**
   * Computes complete closing transfer expenses.
   * @param {number} purchasePriceAed
   * @param {boolean} [isMortgageFinanced=false]
   * @param {number} [mortgageAmountAed=0]
   * @returns {Object}
   */
  calculateClosingExpenses(purchasePriceAed, isMortgageFinanced = false, mortgageAmountAed = 0) {
    const dldTransferFeeAed = Math.round(purchasePriceAed * 0.04);
    const trusteeFeeAed = purchasePriceAed >= 500000 ? 4000 : 2000;
    const trusteeFeeVatAed = trusteeFeeAed * 0.05;
    const titleDeedFeeAed = 250;
    const mapIssuanceFeeAed = 250;
    const knowledgeAndInnovationDirhamsAed = 40;

    let mortgageRegistrationFeeAed = 0;
    if (isMortgageFinanced && mortgageAmountAed > 0) {
      mortgageRegistrationFeeAed = Math.round((mortgageAmountAed * 0.0025) + 290);
    }

    const totalClosingGovtFeesAed = dldTransferFeeAed + trusteeFeeAed + trusteeFeeVatAed + titleDeedFeeAed + mapIssuanceFeeAed + knowledgeAndInnovationDirhamsAed + mortgageRegistrationFeeAed;

    return {
      purchasePriceAed,
      isMortgageFinanced,
      lineItems: {
        dldTransferFee4Pct: dldTransferFeeAed,
        trusteeRegistrationFee: trusteeFeeAed,
        trusteeVat: trusteeFeeVatAed,
        titleDeedIssuance: titleDeedFeeAed,
        dldCadastralMapFee: mapIssuanceFeeAed,
        knowledgeAndInnovationFee: knowledgeAndInnovationDirhamsAed,
        mortgageRegistrationFee: mortgageRegistrationFeeAed
      },
      totalPayableAtTrusteeAed: totalClosingGovtFeesAed,
      chequeInstructions: [
        `Manager's Cheque 1: AED ${dldTransferFeeAed + titleDeedFeeAed + mapIssuanceFeeAed + knowledgeAndInnovationDirhamsAed + mortgageRegistrationFeeAed} payable to "Dubai Land Department".`,
        `Manager's Cheque 2: AED ${trusteeFeeAed + trusteeFeeVatAed} payable to the appointed DLD Trustee Office.`
      ]
    };
  }
}

export default new TrusteeFeeExpenseLedger();
