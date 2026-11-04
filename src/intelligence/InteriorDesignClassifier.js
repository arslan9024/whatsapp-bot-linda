/**
 * @file InteriorDesignClassifier.js
 * @description Classifies interior property aesthetics (Modern Minimalist, Mediterranean,
 * Neo-Classical, Arabesque Luxury, Industrial Loft) from keyword descriptions and tags.
 * Category: Intelligence
 */

export class InteriorDesignClassifier {
  constructor() {
    this.styleSignatures = [
      { style: 'MODERN_MINIMALIST', keywords: ['minimalist', 'clean lines', 'open concept', 'frameless glass', 'monochrome'] },
      { style: 'MEDITERRANEAN_COASTAL', keywords: ['mediterranean', 'terracotta', 'arches', 'coastal', 'white stucco'] },
      { style: 'ARABESQUE_PALATIAL', keywords: ['arabesque', 'mashrabiya', 'majlis', 'chandelier', 'gilded', 'palatial'] },
      { style: 'CONTEMPORARY_LUXURY', keywords: ['contemporary', 'statuary marble', 'fluted wood', 'bronze accents', 'designer'] }
    ];
  }

  /**
   * Identifies best matching interior design category
   * @param {string} descriptionText
   * @returns {{ primaryStyle: string, confidence: number }}
   */
  classifyStyle(descriptionText = '') {
    const text = descriptionText.toLowerCase();

    for (const item of this.styleSignatures) {
      if (item.keywords.some(kw => text.includes(kw))) {
        return {
          primaryStyle: item.style,
          confidence: 85
        };
      }
    }

    return {
      primaryStyle: 'CONTEMPORARY_LUXURY',
      confidence: 60
    };
  }
}

export default new InteriorDesignClassifier();
