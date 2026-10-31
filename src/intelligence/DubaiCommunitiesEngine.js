/**
 * ====================================================================
 * DUBAI MULTI-COMMUNITY REAL ESTATE INTELLIGENCE ENGINE (Pillar 1)
 * ====================================================================
 * Expands Linda's real estate domain knowledge across major Dubai developments:
 *   1. Damac Hills 2 (AKOYA Oxygen)
 *   2. Dubai Hills Estate (Emaar)
 *   3. Palm Jumeirah (Nakheel)
 *   4. Downtown Dubai (Emaar)
 *   5. Dubai Creek Harbour (Emaar)
 *   6. Arabian Ranches 1, 2 & 3 (Emaar)
 *
 * Provides:
 *   - Automatic community and sub-cluster recognition from inquiries.
 *   - Average Price-per-Sqft benchmarks (min / max).
 *   - Typical Gross Rental Yields & Service Charges.
 *   - Unit typology identification (Villas, Townhouses, Mansions, Apartments).
 *
 * @since Development Phase — November 2026
 */

import { Logger } from '../core/Logger.js';

const logger = new Logger('DubaiCommunitiesEngine');

export const DUBAI_COMMUNITIES = {
  damac_hills_2: {
    id: 'damac_hills_2',
    name: 'Damac Hills 2',
    aliases: ['dh2', 'damac 2', 'akoya', 'akoya oxygen', 'damac hills 2'],
    developer: 'DAMAC Properties',
    avgPricePerSqft: { min: 780, max: 920 },
    avgGrossYield: '6.7%',
    serviceChargePerSqft: 4.5,
    topClusters: ['Amazon', 'Victoria', 'Pacifica', 'Camellia', 'Aster', 'Mulberry', 'Aquilegia'],
    typologies: ['Townhouses', 'Villas'],
  },
  dubai_hills_estate: {
    id: 'dubai_hills_estate',
    name: 'Dubai Hills Estate',
    aliases: ['dubai hills', 'dhe', 'hills estate', 'park heights', 'maple', 'sidra', 'club villas'],
    developer: 'Emaar Properties',
    avgPricePerSqft: { min: 1850, max: 2600 },
    avgGrossYield: '6.1%',
    serviceChargePerSqft: 14.5,
    topClusters: ['Maple', 'Sidra', 'Park Field', 'Collective', 'Golf Place', 'Emerald Hills'],
    typologies: ['Apartments', 'Townhouses', 'Villas', 'Mansions'],
  },
  palm_jumeirah: {
    id: 'palm_jumeirah',
    name: 'Palm Jumeirah',
    aliases: ['palm', 'the palm', 'jumeirah palm', 'atlantis', 'fronds', 'shoreline'],
    developer: 'Nakheel',
    avgPricePerSqft: { min: 2800, max: 5500 },
    avgGrossYield: '5.2%',
    serviceChargePerSqft: 18.0,
    topClusters: ['Shoreline', 'Signature Villas', 'Garden Homes', 'One Palm', 'Six Senses'],
    typologies: ['Luxury Apartments', 'Penthouses', 'Waterfront Villas'],
  },
  downtown_dubai: {
    id: 'downtown_dubai',
    name: 'Downtown Dubai',
    aliases: ['downtown', 'burj khalifa district', 'opera district', 'fountain views', 'boulevard'],
    developer: 'Emaar Properties',
    avgPricePerSqft: { min: 2400, max: 3900 },
    avgGrossYield: '5.8%',
    serviceChargePerSqft: 22.0,
    topClusters: ['Burj Crown', 'Opera Grand', 'Fountain Views', 'Address Downtown', 'Boulevard Point'],
    typologies: ['Luxury Apartments', 'Penthouses', 'Serviced Residences'],
  },
  dubai_creek_harbour: {
    id: 'dubai_creek_harbour',
    name: 'Dubai Creek Harbour',
    aliases: ['creek', 'creek harbour', 'dch', 'creek beach', 'creek rise', 'creek gate'],
    developer: 'Emaar Properties',
    avgPricePerSqft: { min: 1650, max: 2300 },
    avgGrossYield: '6.5%',
    serviceChargePerSqft: 15.0,
    topClusters: ['Creek Horizon', 'The Cove', 'Creek Edge', 'Harbour Views', 'Vida Residences'],
    typologies: ['Waterfront Apartments', 'Townhouses'],
  },
  arabian_ranches: {
    id: 'arabian_ranches',
    name: 'Arabian Ranches',
    aliases: ['ranches', 'arabian ranches 1', 'arabian ranches 2', 'arabian ranches 3', 'ranches 3'],
    developer: 'Emaar Properties',
    avgPricePerSqft: { min: 1350, max: 1950 },
    avgGrossYield: '5.9%',
    serviceChargePerSqft: 10.5,
    topClusters: ['Sun', 'Joy', 'Spring', 'Polo Homes', 'Al Reem', 'Palma'],
    typologies: ['Townhouses', 'Villas'],
  },
};

export class DubaiCommunitiesEngine {
  /**
   * Identify which Dubai community matches the inquiry text.
   *
   * @param {string} text
   * @returns {object|null} Matched community metadata or null
   */
  static matchCommunity(text) {
    if (!text || typeof text !== 'string') return null;
    const lower = text.toLowerCase();

    for (const key of Object.keys(DUBAI_COMMUNITIES)) {
      const comm = DUBAI_COMMUNITIES[key];
      if (lower.includes(comm.name.toLowerCase())) {
        return comm;
      }
      for (const alias of comm.aliases) {
        // Match word boundaries or substring
        if (lower.includes(alias)) {
          return comm;
        }
      }
    }

    return null;
  }

  /**
   * Estimate valuation range based on community and approximate sqft.
   *
   * @param {string} communityKey
   * @param {number} sqft
   * @returns {{ priceMin: number, priceMax: number, avgYield: string, serviceChargesAnnual: number }|null}
   */
  static estimateValuation(communityKey, sqft) {
    const comm = DUBAI_COMMUNITIES[communityKey];
    if (!comm || !sqft || sqft <= 0) return null;

    const priceMin = Math.round(sqft * comm.avgPricePerSqft.min);
    const priceMax = Math.round(sqft * comm.avgPricePerSqft.max);
    const serviceChargesAnnual = Math.round(sqft * comm.serviceChargePerSqft);

    return {
      community: comm.name,
      sqft,
      priceMin,
      priceMax,
      avgYield: comm.avgGrossYield,
      serviceChargesAnnual,
    };
  }

  /**
   * Generate an informative briefing snippet for an agent handling this lead.
   *
   * @param {string} text
   * @returns {string|null}
   */
  static generateBriefing(text) {
    const match = this.matchCommunity(text);
    if (!match) return null;

    return `📍 Community: ${match.name} (${match.developer}) | Avg: AED ${match.avgPricePerSqft.min}-${match.avgPricePerSqft.max}/sqft | Yield: ${match.avgGrossYield}`;
  }
}

export default DubaiCommunitiesEngine;
