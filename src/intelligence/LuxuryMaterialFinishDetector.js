/**
 * @file LuxuryMaterialFinishDetector.js
 * @description Evaluates property specifications and vision tags to detect high-end
 * luxury materials, branded appliances, and designer architectural finishes.
 * Category: Intelligence
 */

export class LuxuryMaterialFinishDetector {
  constructor() {
    this.luxuryCatalog = [
      { brand: 'Calacatta / Statuario Marble', keywords: ['calacatta', 'statuario', 'carrara', 'italian marble'], tier: 'ULTRA_LUXURY' },
      { brand: 'Gaggenau / Miele Appliances', keywords: ['gaggenau', 'miele', 'sub-zero', 'wolf'], tier: 'ULTRA_LUXURY' },
      { brand: 'Poliform / Minotti Cabinetry', keywords: ['poliform', 'minotti', 'molteni', 'b&b italia'], tier: 'DESIGNER' },
      { brand: 'Dornbracht / Gessi Sanitaryware', keywords: ['dornbracht', 'gessi', 'toto neorest', 'hansgrohe'], tier: 'HIGH_END' },
      { brand: 'Crestron / Lutron Smart Home', keywords: ['crestron', 'lutron', 'control4', 'knx automation'], tier: 'SMART_HOME' }
    ];
  }

  /**
   * Scans text or vision classification tags for luxury material matches
   * @param {string|Array<string>} inputData
   * @returns {{ score: number, identifiedFinishes: Array<Object>, isUltraLuxury: boolean }}
   */
  evaluateFinishes(inputData = '') {
    const text = Array.isArray(inputData) ? inputData.join(' ').toLowerCase() : String(inputData).toLowerCase();
    const identified = [];

    for (const item of this.luxuryCatalog) {
      if (item.keywords.some(kw => text.includes(kw))) {
        identified.push({
          material: item.brand,
          tier: item.tier
        });
      }
    }

    const score = Math.min(100, identified.length * 25);

    return {
      score,
      identifiedFinishes: identified,
      isUltraLuxury: identified.some(i => i.tier === 'ULTRA_LUXURY')
    };
  }
}

export default new LuxuryMaterialFinishDetector();
