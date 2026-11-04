/**
 * @file DoubleTaxationTreatyGuide.js
 * @description Outlines bilateral Double Taxation Avoidance Agreements (DTAA) between the UAE and key overseas buyer jurisdictions.
 * Category: 2️⃣ Domain / Feature (Cross-Border Wealth)
 */

export class DoubleTaxationTreatyGuide {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.treatyDatabase = options.treatyDatabase || {
      'UK': { treatyInForce: true, rentalIncomeRule: 'Situs of Property (Taxed in UK if UK resident; no withholding in UAE)', capitalGains: 'Exempt from UAE CGT; UK CGT applies based on non-resident status', taxResidencyCertificateBenefit: 'Mitigates dual tax residency friction' },
      'FRANCE': { treatyInForce: true, rentalIncomeRule: 'Taxed only in UAE (Treaty Article 6 exemption method gives French tax credit)', capitalGains: 'Exempt from French tax under France-UAE treaty with proper residency', taxResidencyCertificateBenefit: 'High - total French tax elimination with UAE TRC' },
      'GERMANY': { treatyInForce: false, rentalIncomeRule: 'Subject to German progression clause (Progressionsvorbehalt)', capitalGains: 'German tax applies unless holding period exceeds 10 years', taxResidencyCertificateBenefit: 'Moderate' },
      'INDIA': { treatyInForce: true, rentalIncomeRule: 'Taxed in UAE (Zero tax); Indian tax credit available under Article 25', capitalGains: 'Taxed in UAE (Zero rate)', taxResidencyCertificateBenefit: 'Essential for NRE/NRO remittance compliance' },
      'USA': { treatyInForce: false, rentalIncomeRule: 'US citizens taxed on worldwide income; standard FTC applies', capitalGains: 'US federal long-term capital gains tax applies', taxResidencyCertificateBenefit: 'Limited due to US citizenship-based taxation' }
    };
  }

  /**
   * Analyzes cross-border tax treaty impact for an international investor.
   * @param {string} countryOfTaxResidency
   * @returns {Object}
   */
  assessTreatyProfile(countryOfTaxResidency) {
    const code = (countryOfTaxResidency || '').toUpperCase().trim();
    const profile = this.treatyDatabase[code] || {
      treatyInForce: true,
      rentalIncomeRule: 'Governed by general OECD Model bilateral convention',
      capitalGains: 'UAE levies 0% capital gains tax on individual property sales',
      taxResidencyCertificateBenefit: 'Available via Federal Tax Authority (FTA)'
    };

    return {
      country: code,
      ...profile,
      uaeLocalTaxRates: { personalIncomeTax: '0%', capitalGainsTax: '0%', propertyWealthTax: '0%' },
      disclaimer: 'Informational briefing only; client must consult licensed international tax counsel in their home jurisdiction.'
    };
  }
}

export default new DoubleTaxationTreatyGuide();
