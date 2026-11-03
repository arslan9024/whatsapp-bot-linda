/**
 * DldTitleDeedValidator.js
 * 
 * Single responsibility: Validate formatting standards of Dubai Land Department electronic title deeds.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class DldTitleDeedValidator {
  validateTitleDeedNumber(deedNumber = '') {
    if (!deedNumber || typeof deedNumber !== 'string') return false;
    const clean = deedNumber.trim();
    // Standard format: [Year]/[Number] e.g. 2024/123456 or standard 8-12 digits
    return /^\d{4}\/\d{4,8}$/.test(clean) || /^\d{6,12}$/.test(clean);
  }

  validateCertificateMetadata({ titleDeedNumber, municipalityNumber, communityCode, propertyType } = {}) {
    const isValidDeed = this.validateTitleDeedNumber(titleDeedNumber);
    const hasMunicipality = Boolean(municipalityNumber && String(municipalityNumber).length >= 5);
    const hasCommunity = Boolean(communityCode && String(communityCode).length >= 3);

    return {
      isValidFormat: isValidDeed && hasMunicipality,
      checks: {
        deedNumberValid: isValidDeed,
        municipalityValid: hasMunicipality,
        communityCodeValid: hasCommunity,
      },
      propertyType: propertyType || 'FREEHOLD',
    };
  }
}

export default new DldTitleDeedValidator();
