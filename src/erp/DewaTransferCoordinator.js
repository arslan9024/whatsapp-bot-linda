/**
 * @file DewaTransferCoordinator.js
 * @description Coordinates DEWA Move-Out final meter readings, security deposit refunds for sellers, and instant Move-In activation for buyers via Ejari / title deed integration.
 * Category: 2️⃣ Domain / Feature (Brokerage ERP & Legal MOU)
 */

export class DewaTransferCoordinator {
  /**
   * Generates DEWA transfer roadmap.
   * @param {Object} transferData
   * @param {string} transferData.premiseNumber (9-digit DEWA premise ID)
   * @param {string} transferData.propertyType ('Apartment', 'Villa')
   * @param {string} transferData.buyerEmail
   * @param {string} transferData.buyerPhone
   * @returns {Object}
   */
  coordinateDewaTransfer(transferData) {
    const isVilla = (transferData.propertyType || '').toLowerCase().includes('villa');
    const depositAed = isVilla ? 4000 : 2000; // DEWA standard residential security deposit

    return {
      premiseNumber: transferData.premiseNumber,
      propertyType: transferData.propertyType,
      buyerSecurityDepositAed: depositAed,
      connectionFeeAed: 130, // Standard DEWA connection fee + knowledge/innovation dirhams
      totalBuyerPaymentAed: depositAed + 130,
      sellerChecklist: [
        'Apply for DEWA Move-Out via smart app 48 hours prior to transfer.',
        'Settle final bill payment online to trigger Clearance Certificate.'
      ],
      buyerActivationTimeline: 'Activated within 15 hours of DLD title deed registration or Ejari approval.',
      status: 'WORKFLOW_INITIALIZED'
    };
  }
}

export default new DewaTransferCoordinator();
