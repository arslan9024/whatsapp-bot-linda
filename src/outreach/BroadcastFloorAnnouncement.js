/**
 * @file BroadcastFloorAnnouncement.js
 * @description Formats urgent sales-floor alerts for newly signed exclusive listings,
 * off-market pocket deals, and distress price reductions to the entire agency team.
 * Category: Outreach
 */

export class BroadcastFloorAnnouncement {
  /**
   * Formats a hot listing announcement for the brokerage internal channel
   * @param {Object} listing
   * @param {string} listing.title
   * @param {string} listing.community
   * @param {number} listing.priceAed
   * @param {string} listing.keyFeatures
   * @param {string} listing.listingAgentName
   * @param {string} listing.listingAgentPhone
   * @returns {string} Formatted floor announcement
   */
  formatHotListingBroadcast(listing) {
    const {
      title,
      community,
      priceAed,
      keyFeatures,
      listingAgentName,
      listingAgentPhone
    } = listing;

    const formattedPrice = Number(priceAed || 0).toLocaleString('en-US');

    return [
      `🔥📢 *NEW EXCLUSIVE POCKET LISTING — FLOOR BROADCAST* 📢🔥`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📍 *Location:* ${community}`,
      `🏢 *Unit Details:* ${title}`,
      `💰 *Asking Price:* AED ${formattedPrice}`,
      `✨ *Highlights:* ${keyFeatures || 'Exclusive Mandate'}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `👤 *Listing Agent:* ${listingAgentName} (${listingAgentPhone})`,
      `🔑 *Access / Viewings:* Keys with agent. Available for viewings today.`,
      `💬 Connect your qualified buyers immediately!`
    ].join('\n');
  }
}

export default new BroadcastFloorAnnouncement();

