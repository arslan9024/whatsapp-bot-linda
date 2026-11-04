/**
 * @file DldTitleDeedIssuanceTracker.js
 * @description Monitors Dubai REST and DLD Oqood/Title Deed issuance milestones and automatically triggers congratulatory dispatch with digital certificate verification.
 * Category: 2️⃣ Domain / Feature (Cross-Border Wealth)
 */

export class DldTitleDeedIssuanceTracker {
  /**
   * Tracks title deed status.
   * @param {Object} params
   * @param {string} params.propertyRefNumber
   * @param {string} params.buyerName
   * @param {string} params.currentStage ('OQOOD_REGISTERED', 'HANDOVER_INSPECTION', 'DLD_AUDIT', 'TITLE_DEED_ISSUED')
   * @returns {Object}
   */
  trackTitleDeedStatus({ propertyRefNumber, buyerName, currentStage }) {
    const isIssued = currentStage === 'TITLE_DEED_ISSUED';

    return {
      propertyRefNumber,
      buyerName,
      stage: currentStage,
      isFullyIssued: isIssued,
      dubaiRestAppDeepLink: `https://dubairest.gov.ae/verify?ref=${propertyRefNumber}`,
      whatsAppDispatchPayload: isIssued ? {
        messageType: 'DOCUMENT_WITH_CONGRATULATORY_CARD',
        caption: `Congratulations ${buyerName}! Your official Dubai Land Department Title Deed for ${propertyRefNumber} is officially issued.`,
        qrVerificationCode: `DLD-VERIFY-${propertyRefNumber}`
      } : {
        messageType: 'STATUS_PROGRESS_UPDATE',
        caption: `Title Deed Processing: Property ${propertyRefNumber} is currently undergoing ${currentStage}.`
      }
    };
  }
}

export default new DldTitleDeedIssuanceTracker();
