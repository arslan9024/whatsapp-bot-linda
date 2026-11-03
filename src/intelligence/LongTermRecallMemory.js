/**
 * LongTermRecallMemory.js
 * 
 * Single responsibility: Store and retrieve persistent lead key preferences across weeks of conversation.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class LongTermRecallMemory {
  constructor() {
    /** @type {Map<string, Object>} */
    this.memoryStore = new Map();
  }

  updateLeadProfile(leadJid, facts = {}) {
    if (!leadJid) throw new Error('leadJid is required');
    const existing = this.memoryStore.get(leadJid) || {
      leadJid,
      preferredAreas: [],
      budgetMaxAed: null,
      unitType: null,
      lastDiscussedTopic: null,
      notes: [],
      updatedAt: Date.now(),
    };

    const updated = {
      ...existing,
      ...facts,
      preferredAreas: Array.from(new Set([...(existing.preferredAreas || []), ...(facts.preferredAreas || [])])),
      updatedAt: Date.now(),
    };

    this.memoryStore.set(leadJid, updated);
    return updated;
  }

  getLeadProfile(leadJid) {
    return this.memoryStore.get(leadJid) || null;
  }

  generateContextPromptSnippet(leadJid) {
    const profile = this.getLeadProfile(leadJid);
    if (!profile) return '';

    const parts = [];
    if (profile.preferredAreas?.length) parts.push(`Preferred areas: ${profile.preferredAreas.join(', ')}`);
    if (profile.budgetMaxAed) parts.push(`Budget: ${profile.budgetMaxAed.toLocaleString()} AED`);
    if (profile.unitType) parts.push(`Unit Type: ${profile.unitType}`);

    return parts.length ? `[Prior Client Context: ${parts.join(' | ')}]` : '';
  }
}

export default new LongTermRecallMemory();

