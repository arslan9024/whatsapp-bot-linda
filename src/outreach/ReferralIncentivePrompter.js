/**
 * ReferralIncentivePrompter.js
 * 
 * Single responsibility: Format customized referral inquiries and investor incentive introductions.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class ReferralIncentivePrompter {
  formatReferralPrompt({ clientName = 'there', community = 'Dubai' } = {}) {
    return `Hi ${clientName}, thank you for trusting us with your property journey in ${community}! If you have friends or business associates also looking to invest in Dubai real estate, we offer an exclusive private advisory credit. May I share our referral program details?`;
  }

  isReferralIntent(text = '') {
    if (!text || typeof text !== 'string') return false;
    const lower = text.toLowerCase();
    return lower.includes('referral') || lower.includes('my friend wants') || lower.includes('my colleague is looking') || lower.includes('introduce someone');
  }
}

export default new ReferralIncentivePrompter();
