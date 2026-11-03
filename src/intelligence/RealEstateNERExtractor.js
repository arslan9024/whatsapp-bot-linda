/**
 * RealEstateNERExtractor.js
 * 
 * Single responsibility: Extract budgets, currencies, handover years, and ROI targets from chat messages.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class RealEstateNERExtractor {
  extractEntities(text = '') {
    if (!text || typeof text !== 'string') {
      return { budgetAed: null, handoverYear: null, expectedRoiPercent: null, currency: 'AED' };
    }

    const clean = text.toLowerCase();

    // 1. Budget extraction (e.g., "2.5M", "2,500,000", "500k", "1.2 million aed")
    let budgetAed = null;
    const millMatch = clean.match(/([\d.]+)\s*(?:m|million)\s*(?:aed|dirhams)?/i);
    const kMatch = clean.match(/([\d.]+)\s*(?:k|thousand)\s*(?:aed|dirhams)?/i);
    const rawNumberMatch = clean.match(/(\b\d{1,3}(?:,\d{3}){1,3}\b)\s*(?:aed|dirhams)?/i);

    if (millMatch) {
      budgetAed = Math.round(parseFloat(millMatch[1]) * 1000000);
    } else if (kMatch) {
      budgetAed = Math.round(parseFloat(kMatch[1]) * 1000);
    } else if (rawNumberMatch) {
      budgetAed = parseInt(rawNumberMatch[1].replace(/,/g, ''), 10);
    }

    // 2. Handover year (e.g., "2026", "2027", "q4 2026", "q1 2028")
    let handoverYear = null;
    const yearMatch = clean.match(/\b(202[4-9]|203[0-5])\b/);
    if (yearMatch) {
      handoverYear = parseInt(yearMatch[1], 10);
    }

    // 3. Expected ROI (e.g., "8% roi", "9.5% return", "7.5 percent yield")
    let expectedRoiPercent = null;
    const roiMatch = clean.match(/([\d.]+)\s*(?:%|percent)\s*(?:roi|return|yield)/i);
    if (roiMatch) {
      expectedRoiPercent = parseFloat(roiMatch[1]);
    }

    // 4. Currency
    let currency = 'AED';
    if (clean.includes('usd') || clean.includes('$')) currency = 'USD';
    else if (clean.includes('eur') || clean.includes('€')) currency = 'EUR';
    else if (clean.includes('gbp') || clean.includes('£')) currency = 'GBP';

    return {
      budgetAed,
      handoverYear,
      expectedRoiPercent,
      currency,
    };
  }
}

export default new RealEstateNERExtractor();

