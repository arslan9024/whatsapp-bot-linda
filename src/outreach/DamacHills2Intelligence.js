/**
 * ====================================================================
 * DAMAC HILLS 2 REAL ESTATE INTELLIGENCE (Pillar 1 - Core Engine)
 * ====================================================================
 * Provides domain-specific real estate intelligence for Damac Hills 2:
 *   1. Cluster Smart Context (yields, service charges, sales bands)
 *   2. Instant Property Valuation (DLD transaction benchmarks)
 *   3. Investor vs. End-User Intent Classifier
 *
 * @since Development Phase — October 2026
 */

export const DAMAC2_CLUSTERS = {
  amazon: { name: 'Amazon', type: '3BR & 4BR Villas', avgSale: '1.45M - 1.80M', avgRent: '85k - 110k', yield: '6.8%' },
  victoria: { name: 'Victoria', type: '3BR Townhouses', avgSale: '1.35M - 1.65M', avgRent: '80k - 105k', yield: '6.9%' },
  pacifica: { name: 'Pacifica', type: '4BR & 5BR Luxury Villas', avgSale: '1.85M - 2.40M', avgRent: '115k - 145k', yield: '6.4%' },
  camellia: { name: 'Camellia', type: '3BR Townhouses', avgSale: '1.40M - 1.70M', avgRent: '85k - 110k', yield: '6.7%' },
  aster: { name: 'Aster', type: '3BR & 4BR Villas', avgSale: '1.50M - 1.90M', avgRent: '90k - 120k', yield: '6.6%' },
  coursetia: { name: 'Coursetia', type: '3BR Townhouses', avgSale: '1.35M - 1.60M', avgRent: '80k - 100k', yield: '6.8%' },
  mulberry: { name: 'Mulberry', type: '4BR & 5BR Villas', avgSale: '2.00M - 2.60M', avgRent: '125k - 150k', yield: '6.3%' },
  aquilegia: { name: 'Aquilegia', type: '3BR & 6BR Villas', avgSale: '1.60M - 2.50M', avgRent: '95k - 140k', yield: '6.5%' },
  janusia: { name: 'Janusia', type: '3BR Townhouses', avgSale: '1.38M - 1.65M', avgRent: '82k - 105k', yield: '6.8%' },
  claret: { name: 'Claret', type: '3BR Townhouses', avgSale: '1.40M - 1.68M', avgRent: '85k - 108k', yield: '6.7%' },
  primrose: { name: 'Primrose', type: '3BR & 4BR Villas', avgSale: '1.48M - 1.85M', avgRent: '90k - 115k', yield: '6.6%' },
  juniper: { name: 'Juniper', type: '3BR Townhouses', avgSale: '1.36M - 1.62M', avgRent: '80k - 102k', yield: '6.8%' },
  zinnia: { name: 'Zinnia', type: '3BR & 4BR Townhouses', avgSale: '1.42M - 1.75M', avgRent: '85k - 110k', yield: '6.7%' },
  basswood: { name: 'Basswood', type: '3BR Townhouses', avgSale: '1.35M - 1.60M', avgRent: '80k - 100k', yield: '6.9%' },
};

export const VALUATION_BENCHMARKS = {
  3: {
    beds: 3,
    type: '3-Bed Townhouse / Villa',
    avgBuaSqft: 1850,
    pricePerSqftMin: 780,
    pricePerSqftMax: 880,
    priceMin: 1450000,
    priceMax: 1620000,
    rentMin: 85000,
    rentMax: 105000,
    grossYield: '6.5%',
  },
  4: {
    beds: 4,
    type: '4-Bed Villa',
    avgBuaSqft: 2300,
    pricePerSqftMin: 800,
    pricePerSqftMax: 920,
    priceMin: 1840000,
    priceMax: 2100000,
    rentMin: 115000,
    rentMax: 135000,
    grossYield: '6.3%',
  },
  5: {
    beds: 5,
    type: '5-Bed Luxury Villa',
    avgBuaSqft: 3100,
    pricePerSqftMin: 820,
    pricePerSqftMax: 950,
    priceMin: 2540000,
    priceMax: 2900000,
    rentMin: 150000,
    rentMax: 180000,
    grossYield: '6.1%',
  },
};

/**
 * Detects cluster from free text or address string.
 */
export function detectCluster(text = '') {
  const lower = String(text).toLowerCase();
  for (const [key, cluster] of Object.entries(DAMAC2_CLUSTERS)) {
    if (lower.includes(key) || lower.includes(cluster.name.toLowerCase())) {
      return cluster;
    }
  }
  return null;
}

/**
 * Formats a clean WhatsApp cluster brief.
 */
export function formatClusterBrief(clusterNameOrKey) {
  const cluster = typeof clusterNameOrKey === 'object' && clusterNameOrKey !== null
    ? clusterNameOrKey
    : detectCluster(clusterNameOrKey) || DAMAC2_CLUSTERS.amazon;

  return (
    `🏡 *DAMAC HILLS 2 — ${cluster.name.toUpperCase()} CLUSTER*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📐 Typology: *${cluster.type}*\n` +
    `💰 Current Market Sales: *AED ${cluster.avgSale}*\n` +
    `📈 Annual Rental Range: *AED ${cluster.avgRent}*\n` +
    `📊 Estimated Gross Yield: *${cluster.yield}*\n` +
    `🛡️ Community Fee: ~AED 3.8 / sq.ft.\n` +
    `📍 Proximity: Near Water Town & Community Center`
  );
}

/**
 * Formats instant valuation report for 3, 4, or 5-bed properties.
 */
export function formatValuationReport(beds = 3) {
  const num = Number(beds) || 3;
  const benchmark = VALUATION_BENCHMARKS[num] || VALUATION_BENCHMARKS[3];

  return (
    `📊 *DAMAC HILLS 2 VALUATION ESTIMATE (${benchmark.beds}-BEDROOM)*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🏡 Property: *${benchmark.type}*\n` +
    `📐 Average BUA: *${benchmark.avgBuaSqft} sq.ft.*\n` +
    `💵 Price / sq.ft.: *AED ${benchmark.pricePerSqftMin} - ${benchmark.pricePerSqftMax}*\n\n` +
    `🏷️ *Estimated Market Value:*\n` +
    `   AED ${(benchmark.priceMin / 1000000).toFixed(2)}M – ${(benchmark.priceMax / 1000000).toFixed(2)}M\n\n` +
    `📈 *Rental Projection:*\n` +
    `   AED ${(benchmark.rentMin / 1000).toFixed(0)}k – ${(benchmark.rentMax / 1000).toFixed(0)}k / year\n` +
    `🎯 Average Gross Yield: *${benchmark.grossYield}*\n\n` +
    `📌 Source: DLD transaction benchmarks & active Damac Hills 2 trades`
  );
}

const INVESTOR_KEYWORDS = ['rent', 'tenant', 'roi', 'yield', 'lease', 'investment', 'sell', 'buyer', 'cash', 'portfolio'];
const END_USER_KEYWORDS = ['live', 'family', 'stay', 'home', 'living', 'move', 'renovation', 'own', 'school', 'children'];

/**
 * Classify whether an inbound reply represents an Investor or End-User.
 *
 * @param {string} text - Message text
 * @returns {{ type: 'INVESTOR' | 'END_USER' | 'UNDETERMINED', confidence: number, matchedKeywords: string[] }}
 */
export function classifyLeadIntent(text = '') {
  const lower = String(text || '').toLowerCase();
  const matchedInvestor = INVESTOR_KEYWORDS.filter((k) => new RegExp(`\\b${k}\\b`, 'i').test(lower));
  const matchedEndUser = END_USER_KEYWORDS.filter((k) => new RegExp(`\\b${k}\\b`, 'i').test(lower));

  if (matchedInvestor.length > matchedEndUser.length) {
    return {
      type: 'INVESTOR',
      confidence: Math.min(1.0, 0.4 + matchedInvestor.length * 0.2),
      matchedKeywords: matchedInvestor,
      summary: `Investor intent detected (keywords: ${matchedInvestor.join(', ')})`,
    };
  }

  if (matchedEndUser.length > matchedInvestor.length) {
    return {
      type: 'END_USER',
      confidence: Math.min(1.0, 0.4 + matchedEndUser.length * 0.2),
      matchedKeywords: matchedEndUser,
      summary: `End-User intent detected (keywords: ${matchedEndUser.join(', ')})`,
    };
  }

  return {
    type: 'UNDETERMINED',
    confidence: 0.2,
    matchedKeywords: [],
    summary: 'Generic or neutral owner response',
  };
}
