/**
 * CustomAudienceSegmenter.js
 * 
 * Single responsibility: Filter and segment contacts by budget range, community interest, and days since last contact.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class CustomAudienceSegmenter {
  filterAudience(contacts = [], { minBudget = 0, maxBudget = Infinity, targetCommunities = [], minDaysDormant = 0, now = Date.now() } = {}) {
    if (!Array.isArray(contacts)) return [];

    const normCommunities = (targetCommunities || []).map(c => c.toUpperCase().trim());

    return contacts.filter(contact => {
      // 1. Budget check
      const budget = contact.budgetAed || 0;
      if (budget < minBudget || budget > maxBudget) return false;

      // 2. Community interest check
      if (normCommunities.length > 0) {
        const contactArea = (contact.preferredArea || '').toUpperCase().trim();
        if (!normCommunities.includes(contactArea)) return false;
      }

      // 3. Dormancy check
      if (minDaysDormant > 0 && contact.lastContactedAt) {
        const days = (now - new Date(contact.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (days < minDaysDormant) return false;
      }

      return true;
    });
  }
}

export default new CustomAudienceSegmenter();

