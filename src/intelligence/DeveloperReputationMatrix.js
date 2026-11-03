/**
 * DeveloperReputationMatrix.js
 * 
 * Single responsibility: Factsheet and track record directory for Dubai master developers.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const DEVELOPER_DIRECTORY = Object.freeze({
  EMAAR: { tier: 'TIER_1', flagship: 'Downtown Dubai / Dubai Hills', deliveryReliability: 0.98, finishQuality: 'HIGH_PREMIUM' },
  DAMAC: { tier: 'TIER_1', flagship: 'DAMAC Hills / DAMAC Lagoons', deliveryReliability: 0.92, finishQuality: 'LUXURY_LIFESTYLE' },
  SOBHA: { tier: 'TIER_1', flagship: 'Sobha Hartland', deliveryReliability: 0.96, finishQuality: 'IN_HOUSE_CRAFTSMANSHIP' },
  NAKHEEL: { tier: 'TIER_1', flagship: 'Palm Jumeirah / Dubai Islands', deliveryReliability: 0.90, finishQuality: 'WATERFRONT_SCALE' },
  MERAAS: { tier: 'TIER_1', flagship: 'Bluewaters / City Walk', deliveryReliability: 0.95, finishQuality: 'URBAN_CONTEMPORARY' },
  BINGHATTI: { tier: 'TIER_2', flagship: 'Bugatti / Mercedes / JVC Towers', deliveryReliability: 0.89, finishQuality: 'ARCHITECTURAL_DISTINCT' },
  ELLINGTON: { tier: 'TIER_2_BOUTIQUE', flagship: 'Palm / JLT Boutique Residences', deliveryReliability: 0.94, finishQuality: 'DESIGN_CENTRIC' },
});

export class DeveloperReputationMatrix {
  getDeveloperFactsheet(developerName = '') {
    const key = developerName.toUpperCase().replace(/[^A-Z]/g, '');
    const foundKey = Object.keys(DEVELOPER_DIRECTORY).find(k => key.includes(k));
    return foundKey ? { developer: foundKey, ...DEVELOPER_DIRECTORY[foundKey] } : null;
  }
}

export default new DeveloperReputationMatrix();
