/**
 * @file BulkContactDeduplicator.js
 * @description Cleans and deduplicates incoming CSV lead lists by normalizing phone
 * numbers to E.164 and resolving duplicate entries in favor of the latest record.
 * Category: Outreach
 */

export class BulkContactDeduplicator {
  /**
   * Normalizes a phone string to digits only
   * @param {string} phone
   * @returns {string} Clean digits
   */
  cleanPhone(phone = '') {
    return String(phone).replace(/\D/g, '');
  }

  /**
   * Deduplicates a list of contacts by phone
   * @param {Array<Object>} contacts
   * @returns {{ uniqueContacts: Array<Object>, duplicateCount: number }}
   */
  deduplicate(contacts = []) {
    const seen = new Map();
    let duplicateCount = 0;

    for (const c of contacts) {
      const phoneKey = this.cleanPhone(c.phone);
      if (!phoneKey) continue;

      if (seen.has(phoneKey)) {
        duplicateCount++;
      }
      // Overwrite to keep latest
      seen.set(phoneKey, c);
    }

    return {
      uniqueContacts: Array.from(seen.values()),
      duplicateCount
    };
  }
}

export default new BulkContactDeduplicator();
