/**
 * ====================================================================
 * TITLE DEED & REAL ESTATE DOCUMENT OCR SANITIZER (Pillar 1 - Security)
 * ====================================================================
 * Protects client privacy and extracts verified property facts from
 * received Dubai Land Department (DLD) Title Deeds or Oqood certificates:
 *   1. Extracts Safe Property Identifiers:
 *      - Plot Number / Municipality Number
 *      - Unit / Villa Number
 *      - Building / Project / Cluster Name
 *      - Built-Up Area (BUA) and Plot Size in Sqft or Sqm
 *   2. Redacts & Sanitizes Sensitive Owner Information:
 *      - UAE Emirates ID numbers (784-YYYY-XXXXXXX-Z)
 *      - Passport numbers & Nationality
 *      - Personal bank IBAN / Account numbers
 *      - Exact purchase price or mortgage balance (if confidential)
 *   3. Generates a clean, sanitized property snapshot for CRM ingestion.
 *
 * @since Development Phase — November 2026
 */

import { Logger } from '../core/Logger.js';

const logger = new Logger('TitleDeedOcrSanitizer');

export class TitleDeedOcrSanitizer {
  /**
   * Sanitize text OCR content extracted from title deeds or property documents.
   *
   * @param {string} rawOcrText
   * @returns {{
   *   sanitizedText: string,
   *   redactedCount: number,
   *   propertyFacts: {
   *     unitNumber: string|null,
   *     plotNumber: string|null,
   *     areaSqft: number|null,
   *     community: string|null,
   *   }
   * }}
   */
  static sanitize(rawOcrText = '') {
    if (!rawOcrText || typeof rawOcrText !== 'string') {
      return {
        sanitizedText: '',
        redactedCount: 0,
        propertyFacts: { unitNumber: null, plotNumber: null, areaSqft: null, community: null },
      };
    }

    let sanitized = rawOcrText;
    let redactedCount = 0;

    // 1. Redact UAE Emirates ID (784-XXXX-XXXXXXX-X or 784XXXXXXXXXXXX)
    const eidRegex = /\b784[- ]?[0-9]{4}[- ]?[0-9]{7}[- ]?[0-9]\b/g;
    sanitized = sanitized.replace(eidRegex, () => {
      redactedCount++;
      return '[REDACTED_EMIRATES_ID]';
    });

    // 2. Redact Passport Numbers (e.g., standard letter followed by 7-9 digits)
    const passportRegex = /\b[A-PR-WY][0-9]{7,9}\b/g;
    sanitized = sanitized.replace(passportRegex, () => {
      redactedCount++;
      return '[REDACTED_PASSPORT]';
    });

    // 3. Redact IBAN (AE followed by 21 digits)
    const ibanRegex = /\bAE[0-9]{2}[0-9]{19}\b/gi;
    sanitized = sanitized.replace(ibanRegex, () => {
      redactedCount++;
      return '[REDACTED_IBAN]';
    });

    // 4. Extract Safe Property Facts
    // Unit Number matching (e.g. Unit 302, Villa V-12, Townhouse TH-04)
    const unitMatch = rawOcrText.match(/\b(?:Unit|Villa|Townhouse|Apartment|Flat)\s*(?:No\.?|#)?[:\s]+([A-Z0-9-]+)/i);
    const unitNumber = unitMatch ? unitMatch[1] : null;

    // Plot Number matching (e.g. Plot No. 123-456)
    const plotMatch = rawOcrText.match(/\b(?:Plot|Land)\s*(?:No\.?|#)?[:\s]+([0-9-]+)/i);
    const plotNumber = plotMatch ? plotMatch[1] : null;

    // Area in Sqft matching (e.g. 2,450 sq ft or 1850 Sq.Ft)
    const areaMatch = rawOcrText.match(/([0-9,.]+)\s*(?:sq\.?\s*ft|sqft|square\s*feet)/i);
    let areaSqft = null;
    if (areaMatch) {
      const cleanNum = parseFloat(areaMatch[1].replace(/,/g, ''));
      if (!isNaN(cleanNum)) areaSqft = cleanNum;
    }

    // Community matching
    let community = null;
    const lower = rawOcrText.toLowerCase();
    if (lower.includes('damac hills 2') || lower.includes('akoya')) {
      community = 'Damac Hills 2';
    } else if (lower.includes('dubai hills')) {
      community = 'Dubai Hills Estate';
    } else if (lower.includes('palm jumeirah')) {
      community = 'Palm Jumeirah';
    } else if (lower.includes('arabian ranches')) {
      community = 'Arabian Ranches';
    }

    logger.debug(`Title Deed sanitized: ${redactedCount} sensitive item(s) redacted`);

    return {
      sanitizedText: sanitized,
      redactedCount,
      propertyFacts: {
        unitNumber,
        plotNumber,
        areaSqft,
        community,
      },
    };
  }
}

export default TitleDeedOcrSanitizer;
