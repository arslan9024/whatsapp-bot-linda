/**
 * @file FreezoneBoundaryMapper.js
 * @description Clarifies real estate ownership eligibility under UAE Freezone jurisdictions
 * (DIFC, DMCC, DWTC) for foreign companies, holding structures, and overseas entities.
 * Category: Domain / Feature (Spatial)
 */

export class FreezoneBoundaryMapper {
  constructor() {
    this.freezones = {
      'DIFC': { legalSystem: 'Common Law (DIFC Courts)', foreignCompanyAllowed: true, registrationAuthority: 'DIFC Registrar' },
      'DMCC': { legalSystem: 'UAE Civil Law / DMCC Regulations', foreignCompanyAllowed: true, registrationAuthority: 'DLD / DMCC' },
      'DUBAI_SOUTH_DWC': { legalSystem: 'DWC Freezone Regulations', foreignCompanyAllowed: true, registrationAuthority: 'DLD Freezone Portal' }
    };
  }

  /**
   * Resolves corporate ownership rules for a property zone
   * @param {string} zoneCode
   * @returns {Object} Legal corporate property ownership analysis
   */
  resolveCorporateOwnershipRules(zoneCode = 'DIFC') {
    const key = zoneCode.toUpperCase().trim();
    const zone = this.freezones[key] || {
      legalSystem: 'UAE Civil Law',
      foreignCompanyAllowed: false,
      registrationAuthority: 'Dubai Land Department (Mainland)'
    };

    return {
      zone: zoneCode,
      legalJurisdiction: zone.legalSystem,
      allowsDirectOffshoreOwnership: zone.foreignCompanyAllowed,
      governingAuthority: zone.registrationAuthority,
      structuringAdvice: zone.foreignCompanyAllowed
        ? 'Foreign entities may purchase directly or through an ADGM / DIFC Special Purpose Vehicle (SPV).'
        : 'Foreign offshore entities must register a local onshore holding vehicle or DIFC SPV prior to DLD title transfer.'
    };
  }
}

export default new FreezoneBoundaryMapper();
