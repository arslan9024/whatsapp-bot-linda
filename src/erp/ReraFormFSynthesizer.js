/**
 * @file ReraFormFSynthesizer.js
 * @description Auto-populates official Dubai Unified Real Estate Contract (Form F / Memorandum of Understanding), locking purchase consideration, 10% deposit manager cheque, and transfer deadlines.
 * Category: 2️⃣ Domain / Feature (Brokerage ERP & Legal MOU)
 */

export class ReraFormFSynthesizer {
  /**
   * Synthesizes Form F contract specifications.
   * @param {Object} deal
   * @param {string} deal.sellerName
   * @param {string} deal.buyerName
   * @param {string} deal.propertyDetails ('Unit 1204, Downtown Burj Crown')
   * @param {number} deal.agreedPriceAed
   * @param {number} [deal.depositPercentage=10]
   * @param {number} [deal.closingDays=30]
   * @returns {Object}
   */
  synthesizeFormF(deal) {
    const depositPct = deal.depositPercentage || 10;
    const depositAed = Math.round(deal.agreedPriceAed * (depositPct / 100));
    const closingDays = deal.closingDays || 30;

    const targetClosingDate = new Date();
    targetClosingDate.setDate(targetClosingDate.getDate() + closingDays);

    return {
      contractType: 'RERA_UNIFIED_CONTRACT_F_MOU',
      mouReferenceNumber: `MOU-DXB-${Date.now().toString(36).toUpperCase()}`,
      seller: deal.sellerName,
      buyer: deal.buyerName,
      property: deal.propertyDetails,
      purchasePriceAed: deal.agreedPriceAed,
      depositTerms: {
        depositPercentage: depositPct,
        depositAmountAed: depositAed,
        securityInstrument: "Bank Manager's Cheque in Seller Name held in Escrow by Brokerage"
      },
      closingDeadlineDate: targetClosingDate.toISOString().slice(0, 10),
      standardConditions: [
        'Subject to developer NOC issuance without outstanding service charge arrears.',
        'Vacant on transfer condition enforced at DLD Trustee office.',
        'Buyer pays 4% DLD transfer fee + Trustee registration fee of AED 4,000 + VAT.'
      ],
      legalEnforceability: 'Legally binding under Dubai Land Department Unified Real Estate Regulations.'
    };
  }
}

export default new ReraFormFSynthesizer();
