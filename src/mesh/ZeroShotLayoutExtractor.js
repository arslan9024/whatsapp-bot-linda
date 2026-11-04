/**
 * @file ZeroShotLayoutExtractor.js
 * @description Parses raw developer floor plan metadata and text specifications into structured room dimensions, net internal area, and balcony orientation.
 * Category: 2️⃣ Domain / Feature (Multi-LLM Mesh)
 */

export class ZeroShotLayoutExtractor {
  /**
   * Extracts layout specifications from text or structured OCR output.
   * @param {string} rawPlanText
   * @returns {Object}
   */
  extractLayout(rawPlanText = '') {
    const textLower = rawPlanText.toLowerCase();

    // Extract total area (sqft)
    const normalizedText = rawPlanText.replace(/,/g, '');
    const areaMatch = normalizedText.match(/(\d{3,5}(?:\.\d+)?)\s*(?:sq\.?\s*ft|sqft)/i);
    const totalSqFt = areaMatch ? parseFloat(areaMatch[1]) : 0;

    // Extract bedrooms count
    let bedroomCount = 1;
    if (textLower.includes('studio')) bedroomCount = 0;
    else if (textLower.includes('2 bed') || textLower.includes('2br')) bedroomCount = 2;
    else if (textLower.includes('3 bed') || textLower.includes('3br')) bedroomCount = 3;
    else if (textLower.includes('4 bed') || textLower.includes('4br')) bedroomCount = 4;

    // Extract balcony presence and orientation
    const hasBalcony = textLower.includes('balcony') || textLower.includes('terrace');
    let orientation = 'Standard City Horizon';
    if (textLower.includes('sea view') || textLower.includes('waterfront')) orientation = 'Direct Sea / Lagoon Horizon';
    else if (textLower.includes('burj khalifa view') || textLower.includes('downtown view')) orientation = 'Skyline & Burj Khalifa Facing';
    else if (textLower.includes('golf view')) orientation = 'Championship Golf Course Fairway';

    return {
      bedroomCount,
      totalAreaSqFt: totalSqFt,
      hasBalcony,
      balconyOrientation: orientation,
      layoutType: bedroomCount === 0 ? 'Studio Suite' : `${bedroomCount}BR Residential Apartment`,
      efficiencyRating: totalSqFt > 0 ? (totalSqFt / Math.max(1, bedroomCount) > 650 ? 'SPACIOUS_LUXURY' : 'COMPACT_EFFICIENT') : 'UNSPECIFIED'
    };
  }
}

export default new ZeroShotLayoutExtractor();
