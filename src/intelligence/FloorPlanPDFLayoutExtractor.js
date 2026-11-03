/**
 * FloorPlanPDFLayoutExtractor.js
 * 
 * Single responsibility: Parse bedroom counts, BUA sqft, and unit types from developer brochure metadata.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class FloorPlanPDFLayoutExtractor {
  extractLayoutFacts(text = '') {
    if (!text || typeof text !== 'string') {
      return { bedrooms: null, buaSqft: null, unitType: 'UNKNOWN' };
    }

    const clean = text.toLowerCase();

    // 1. Bedroom extraction (e.g., "3 Bedroom", "4 BR", "Studio", "1BHK")
    let bedrooms = null;
    if (clean.includes('studio')) {
      bedrooms = 0;
    } else {
      const brMatch = clean.match(/(\d+)\s*(?:bed|bedroom|br|bhk)/i);
      if (brMatch) bedrooms = parseInt(brMatch[1], 10);
    }

    // 2. Built-Up Area (BUA) extraction (e.g., "2,450 sq.ft", "1800 sqft", "950 sq ft")
    let buaSqft = null;
    const buaMatch = clean.match(/([\d,]+)\s*(?:sq\.?\s*ft|sqft)/i);
    if (buaMatch) {
      buaSqft = parseInt(buaMatch[1].replace(/,/g, ''), 10);
    }

    // 3. Unit Type
    let unitType = 'APARTMENT';
    if (clean.includes('villa')) unitType = 'VILLA';
    else if (clean.includes('townhouse')) unitType = 'TOWNHOUSE';
    else if (clean.includes('penthouse')) unitType = 'PENTHOUSE';
    else if (clean.includes('duplex')) unitType = 'DUPLEX';

    return {
      bedrooms,
      buaSqft,
      unitType,
      hasBalcony: clean.includes('balcony') || clean.includes('terrace'),
      hasMaidRoom: clean.includes('maid') || clean.includes("maid's"),
    };
  }
}

export default new FloorPlanPDFLayoutExtractor();

