/**
 * @file TitleDeedMortgageDischargeAuditor.js
 * @description Audits mortgage redemption letters, electronic release tokens, and encumbrance certificates to ensure title deed is free and unencumbered before transfer.
 * Category: 2️⃣ Domain / Feature (Brokerage ERP & Legal MOU)
 */

export class TitleDeedMortgageDischargeAuditor {
  /**
   * Evaluates title deed mortgage redemption status.
   * @param {Object} titleData
   * @param {boolean} titleData.isMortgaged
   * @param {string} [titleData.mortgageeBank]
   * @param {number} [titleData.outstandingLiabilityAed=0]
   * @param {boolean} [titleData.hasValidLiabilityLetter=false]
   * @param {string} [titleData.liabilityLetterExpiryDate]
   * @returns {Object}
   */
  auditMortgageDischarge(titleData) {
    if (!titleData.isMortgaged) {
      return {
        isMortgaged: false,
        isReadyForTransfer: true,
        status: 'CLEAR_FREEHOLD_TITLE',
        advisory: 'Property is 100% free of mortgage encumbrance; ready for direct trustee transfer.'
      };
    }

    const today = new Date().toISOString().slice(0, 10);
    const isLetterValid = titleData.hasValidLiabilityLetter &&
      (!titleData.liabilityLetterExpiryDate || titleData.liabilityLetterExpiryDate >= today);

    return {
      isMortgaged: true,
      mortgageeBank: titleData.mortgageeBank,
      outstandingLiabilityAed: titleData.outstandingLiabilityAed,
      hasValidLiabilityLetter: isLetterValid,
      isReadyForTransfer: isLetterValid,
      status: isLetterValid ? 'LIABILITY_LETTER_ACTIVE' : 'EXPIRED_OR_MISSING_LIABILITY_LETTER',
      nextSteps: isLetterValid
        ? `Buyer to issue bank manager's cheque for AED ${titleData.outstandingLiabilityAed.toLocaleString()} directly to ${titleData.mortgageeBank} to trigger e-Mortgage Release.`
        : 'Seller must request fresh official Liability Letter (valid for 15-30 days) from lending bank.'
    };
  }
}

export default new TitleDeedMortgageDischargeAuditor();
