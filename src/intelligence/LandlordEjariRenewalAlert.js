/**
 * LandlordEjariRenewalAlert.js
 * 
 * Single responsibility: Track annual Ejari tenancy contracts and trigger automated 90-day renewal notices.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class LandlordEjariRenewalAlert {
  constructor({ noticeThresholdDays = 90 } = {}) {
    this.noticeThresholdDays = noticeThresholdDays;
  }

  evaluateContract(expiryDateString, now = new Date()) {
    if (!expiryDateString) return { status: 'NO_EXPIRY_DATE', needsNotice: false };
    const expiry = new Date(expiryDateString);
    const msDiff = expiry.getTime() - now.getTime();
    const daysRemaining = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

    const needsNotice = daysRemaining > 0 && daysRemaining <= this.noticeThresholdDays;
    const isExpired = daysRemaining <= 0;

    return {
      expiryDate: expiry.toISOString().split('T')[0],
      daysRemaining,
      needsNotice,
      isExpired,
      legalWindow: 'ARTICLE_14_DUBAI_TENANCY_LAW_90_DAY_NOTICE',
      recommendedAction: needsNotice ? 'DISPATCH_RENT_REVISION_OR_RENEWAL_NOTICE' : 'MAINTAIN_CURRENT_LEASE',
    };
  }
}

export default new LandlordEjariRenewalAlert();
