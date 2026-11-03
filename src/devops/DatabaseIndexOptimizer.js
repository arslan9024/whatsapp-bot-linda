/**
 * @file DatabaseIndexOptimizer.js
 * @description Audits MongoDB collection indexes, recommending high-efficiency compound
 * indexes for contact lookups, timestamp filters, and lead triage queries.
 * Category: Dev-ops / Tools
 */

export class DatabaseIndexOptimizer {
  constructor() {
    this.recommendedIndexes = {
      contacts: [
        { key: { phone: 1 }, unique: true, name: 'idx_contacts_phone_unique' },
        { key: { lastContactedAt: -1, status: 1 }, name: 'idx_contacts_triage' }
      ],
      messages: [
        { key: { chatJid: 1, timestamp: -1 }, name: 'idx_messages_chat_timeline' },
        { key: { direction: 1, status: 1 }, name: 'idx_messages_queue_status' }
      ],
      campaigns: [
        { key: { campaignId: 1, status: 1 }, name: 'idx_campaign_runs' }
      ]
    };
  }

  /**
   * Evaluates existing indexes against recommended optimal indexes
   * @param {string} collectionName
   * @param {Array<{ name: string, key: Object }>} existingIndexes
   * @returns {{ collection: string, missingIndexes: Array<Object>, optimal: boolean }}
   */
  auditCollection(collectionName, existingIndexes = []) {
    const recommended = this.recommendedIndexes[collectionName] || [];
    const missing = [];

    const existingNames = new Set(existingIndexes.map(i => i.name));

    for (const rec of recommended) {
      if (!existingNames.has(rec.name)) {
        missing.push(rec);
      }
    }

    return {
      collection: collectionName,
      existingCount: existingIndexes.length,
      missingIndexes: missing,
      optimal: missing.length === 0
    };
  }
}

export default new DatabaseIndexOptimizer();
