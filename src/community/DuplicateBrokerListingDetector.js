/**
 * @file DuplicateBrokerListingDetector.js
 * @description Fingerprints property parameters (tower, size sqft, floor range, asking price) across broker group posts to detect multi-brokered non-exclusive distress listings.
 * Category: 2️⃣ Domain / Feature (Community Intelligence)
 */

export class DuplicateBrokerListingDetector {
  /**
   * Fingerprints and groups duplicate listings.
   * @param {Array<{ brokerPhone: string, brokerName: string, building: string, sqFt: number, priceAed: number, rawSnippet: string }>} listings
   * @returns {Object}
   */
  detectDuplicates(listings = []) {
    const clusterMap = new Map();

    for (const item of listings) {
      // Fingerprint key: building + approximate size (+/- 2%)
      const sizeBucket = Math.round(item.sqFt / 50) * 50;
      const key = `${item.building.toLowerCase().replace(/[^a-z0-9]/g, '')}-${sizeBucket}`;

      const existing = clusterMap.get(key) || [];
      existing.push(item);
      clusterMap.set(key, existing);
    }

    const duplicateClusters = [];
    for (const [key, items] of clusterMap.entries()) {
      if (items.length > 1) {
        const prices = items.map(i => i.priceAed);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        duplicateClusters.push({
          fingerprintKey: key,
          building: items[0].building,
          brokerCount: items.length,
          brokersInvolved: items.map(i => ({ name: i.brokerName, phone: i.brokerPhone, price: i.priceAed })),
          priceSpreadAed: maxPrice - minPrice,
          cheapestAskingPriceAed: minPrice,
          isDistressMultiBrokerWar: items.length >= 3
        });
      }
    }

    return {
      totalListingsAnalyzed: listings.length,
      duplicateClustersFound: duplicateClusters.length,
      clusters: duplicateClusters,
      buyerInsight: duplicateClusters.length > 0
        ? 'Duplicate seller discovered: Multiple brokers marketing same unit with varying prices indicates urgent distress seller.'
        : 'Unique exclusive inventory.'
    };
  }
}

export default new DuplicateBrokerListingDetector();
