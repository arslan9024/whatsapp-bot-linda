/**
 * @file RdcCaseFilingAssistant.js
 * @description Outlines Dubai Rental Dispute Centre (RDC) litigation procedures, fee calculations (3.5% of annual rent), and mandatory statutory 30-day notary eviction notices.
 * Category: 2️⃣ Domain / Feature (Brokerage ERP & Legal MOU)
 */

export class RdcCaseFilingAssistant {
  /**
   * Prepares RDC filing guidance.
   * @param {Object} claim
   * @param {string} claim.claimType ('NON_PAYMENT_EVICTION', 'PERSONAL_USE_EVICTION', 'UNAUTHORIZED_SUBLEASE')
   * @param {number} claim.annualContractRentAed
   * @param {number} [claim.outstandingArrearsAed=0]
   * @param {boolean} [claim.hasNotaryEvictionNoticeServed=false]
   * @returns {Object}
   */
  prepareRdcFilingGuidance(claim) {
    // RDC court filing fee: 3.5% of annual rent (min AED 500, max AED 20,000)
    const baseCourtFeeAed = Math.max(500, Math.min(20000, Math.round(claim.annualContractRentAed * 0.035)));
    const translationAndAdminFeeAed = 1250;
    const totalEstimatedFilingCostAed = baseCourtFeeAed + translationAndAdminFeeAed;

    const isReadyToFile = claim.claimType === 'NON_PAYMENT_EVICTION'
      ? Boolean(claim.outstandingArrearsAed > 0)
      : Boolean(claim.hasNotaryEvictionNoticeServed);

    return {
      claimType: claim.claimType,
      annualRentAed: claim.annualContractRentAed,
      courtFilingFeeAed: baseCourtFeeAed,
      totalEstimatedCostAed: totalEstimatedFilingCostAed,
      isStatutorilyReady: isReadyToFile,
      requiredFilingDossier: [
        'Original Ejari certificate copy',
        'Title Deed copy and Landlord Passport/Emirates ID',
        'Bank-stamped bounced cheque certificate or statement of non-payment',
        'Official Dubai Notary Public 30-day eviction notice with proof of service / Aramex receipt'
      ],
      expectedRdcTimelineDays: 45,
      firstHearingGuidance: 'Hearings conducted via digital video conference on Dubai Courts / RDC portal.'
    };
  }
}

export default new RdcCaseFilingAssistant();
