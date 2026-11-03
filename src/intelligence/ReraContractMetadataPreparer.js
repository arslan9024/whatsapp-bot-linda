/**
 * ReraContractMetadataPreparer.js
 * 
 * Single responsibility: Structure metadata for official RERA Form A (Seller Agreement) and Form B (Buyer Agreement).
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class ReraContractMetadataPreparer {
  prepareFormBMetadata({
    buyerName,
    buyerPhone,
    buyerPassportOrEmiratesId,
    budgetMaxAed,
    communityPreferences = [],
    brokerBrdId,
  }) {
    if (!buyerName || !buyerPhone) throw new Error('buyerName and buyerPhone are required for Form B');

    return {
      formType: 'RERA_FORM_B_BUYER_REPRESENTATION',
      buyerDetails: {
        fullName: buyerName,
        phone: buyerPhone,
        idNumber: buyerPassportOrEmiratesId || 'PENDING_COLLECTION',
      },
      searchMandate: {
        budgetCeilingAed: budgetMaxAed || 0,
        communities: communityPreferences,
      },
      brokerageMandate: {
        brokerBrdId: brokerBrdId || 'RERA_REGISTERED_BROKER',
        commissionAgreedPercent: 2.0,
      },
      generatedAt: Date.now(),
    };
  }
}

export default new ReraContractMetadataPreparer();
