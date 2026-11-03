/**
 * MongoChangeStreamsFilter.js
 * 
 * Single responsibility: Filter and categorize MongoDB Change Stream events (insert, update, delete) for external sync.
 * Category: 2️⃣ Domain / Feature (src/integrations/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class MongoChangeStreamsFilter {
  categorizeChangeEvent(changeDoc = {}) {
    const opType = changeDoc.operationType; // 'insert' | 'update' | 'replace' | 'delete'
    const collection = changeDoc.ns?.coll || 'unknown';

    const isLeadMutation = ['leads', 'contacts', 'propertycontacts'].includes(collection.toLowerCase());
    const isCampaignMutation = ['campaigns', 'outreachplans'].includes(collection.toLowerCase());

    return {
      operationType: opType,
      collection,
      documentId: changeDoc.documentKey?._id || null,
      shouldSyncToCrm: isLeadMutation && (opType === 'insert' || opType === 'update'),
      shouldRefreshCampaignCache: isCampaignMutation,
      timestamp: Date.now(),
    };
  }
}

export default new MongoChangeStreamsFilter();
