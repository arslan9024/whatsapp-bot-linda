/**
 * @file DldSectorCodeNormalizer.js
 * @description Maps marketing community names (e.g. 'Old Town', 'Sobha Hartland', 'Emaar Beachfront')
 * to official Dubai Land Department (DLD) area numbers and cadastral sector codes.
 * Category: Domain / Feature (Spatial)
 */

export class DldSectorCodeNormalizer {
  constructor() {
    this.areaCodeMap = new Map([
      ['DOWNTOWN DUBAI', { dldAreaId: 392, officialNameEn: 'Burj Khalifa', sectorNameAr: 'برج خليفة' }],
      ['OLD TOWN', { dldAreaId: 392, officialNameEn: 'Burj Khalifa', sectorNameAr: 'برج خليفة' }],
      ['DUBAI MARINA', { dldAreaId: 388, officialNameEn: 'Marsa Dubai', sectorNameAr: 'مرسى دبي' }],
      ['EMAAR BEACHFRONT', { dldAreaId: 388, officialNameEn: 'Marsa Dubai', sectorNameAr: 'مرسى دبي' }],
      ['PALM JUMEIRAH', { dldAreaId: 381, officialNameEn: 'Palm Jumeirah', sectorNameAr: 'نخلة جميرا' }],
      ['BUSINESS BAY', { dldAreaId: 346, officialNameEn: 'Business Bay', sectorNameAr: 'الخليج التجاري' }],
      ['DUBAI HILLS ESTATE', { dldAreaId: 631, officialNameEn: 'Hadaeq Sheikh Mohammed Bin Rashid', sectorNameAr: 'حدائق الشيخ محمد بن راشد' }]
    ]);
  }

  /**
   * Normalizes marketing name to official DLD cadastral record
   * @param {string} marketingName
   * @returns {Object} Official DLD sector descriptor
   */
  normalizeArea(marketingName = '') {
    const key = marketingName.toUpperCase().trim();
    const entry = this.areaCodeMap.get(key);

    if (entry) {
      return {
        marketingName,
        dldAreaId: entry.dldAreaId,
        officialNameEn: entry.officialNameEn,
        sectorNameAr: entry.sectorNameAr,
        verifiedDldArea: true
      };
    }

    return {
      marketingName,
      dldAreaId: null,
      officialNameEn: marketingName,
      sectorNameAr: '',
      verifiedDldArea: false
    };
  }
}

export default new DldSectorCodeNormalizer();
