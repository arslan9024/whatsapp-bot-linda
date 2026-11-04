/**
 * @file OffMarketPocketListingAnonymizer.js
 * @description Sanitizes exclusive off-market listings, stripping exact unit numbers, landlord names, and identifiable photos to prevent direct broker bypass.
 * Category: 2️⃣ Domain / Feature (Community Intelligence)
 */

export class OffMarketPocketListingAnonymizer {
  /**
   * Sanitizes private listing payload for public broker group dissemination.
   * @param {Object} rawListing
   * @param {string} rawListing.landlordName
   * @param {string} rawListing.landlordPhone
   * @param {string} rawListing.unitNumber ('Villa 14, Frond J')
   * @param {string} rawListing.community ('Palm Jumeirah')
   * @param {string} rawListing.propertyType ('Garden Home Villa')
   * @param {number} rawListing.priceAed
   * @returns {Object}
   */
  anonymizeListing(rawListing) {
    const sanitizedUnitDescriptor = rawListing.unitNumber
      ? `High-Floor / Premium Cluster Unit`
      : 'Exclusive Private Unit';

    const anonymizedCopy = [
      `🔒 *OFF-MARKET POCKET LISTING — DIRECT MANDATE*`,
      `📍 *Location:* ${rawListing.community}`,
      `🏡 *Type:* ${rawListing.propertyType} (${sanitizedUnitDescriptor})`,
      `💰 *Asking Price:* AED ${rawListing.priceAed.toLocaleString()}`,
      `📋 *Status:* Direct from Seller / Form A in Place`,
      `🤝 *Co-Broking:* 50/50 RERA Form I with registered agents only.`,
      `⚠️ _Exact unit number & title deed released upon signed Form I & client passport._`
    ].join('\n');

    return {
      community: rawListing.community,
      propertyType: rawListing.propertyType,
      isAnonymized: true,
      scrubbedFields: ['landlordName', 'landlordPhone', 'unitNumber'],
      safeBroadcastText: anonymizedCopy
    };
  }
}

export default new OffMarketPocketListingAnonymizer();
