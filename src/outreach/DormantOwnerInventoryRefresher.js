/**
 * @file DormantOwnerInventoryRefresher.js
 * @description Engages known property owners every 6 months to verify current occupancy
 * status (vacant vs tenanted), Ejari renewal timelines, and interest in listing for sale.
 * Category: Outreach
 */

export class DormantOwnerInventoryRefresher {
  /**
   * Formats inventory status inquiry for a property landlord
   * @param {Object} landlord
   * @param {string} landlord.name
   * @param {string} landlord.unitRef
   * @param {string} landlord.community
   * @returns {string} WhatsApp prompt
   */
  formatOwnerInquiry(landlord) {
    const { name = 'Landlord', unitRef, community } = landlord;

    return [
      `🏢 *Dubai Property Portfolio Update — ${community}*`,
      `Dear ${name},`,
      `We hope your property at *${unitRef}* is performing well!`,
      ``,
      `With Dubai rental yields up 15% this season, we are checking in:`,
      `1️⃣ Is your unit currently tenanted or coming vacant soon?`,
      `2️⃣ Would you like an updated complimentary rental valuation report?`,
      `3️⃣ Are you considering capital realization through a secondary sale?`,
      ``,
      `Simply reply with *1*, *2*, or *3* and our asset management desk will assist you promptly.`
    ].join('\n');
  }
}

export default new DormantOwnerInventoryRefresher();

