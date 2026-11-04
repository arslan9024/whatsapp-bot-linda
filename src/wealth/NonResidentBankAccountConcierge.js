/**
 * @file NonResidentBankAccountConcierge.js
 * @description Outlines criteria, minimum initial balance requirements, and KYC pipelines for non-resident property investors opening personal accounts in the UAE.
 * Category: 2️⃣ Domain / Feature (Cross-Border Wealth)
 */

export class NonResidentBankAccountConcierge {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.bankProfiles = options.bankProfiles || [
      { id: 'ENBD_PRIORITY', name: 'Emirates NBD Priority Banking', minBalanceAed: 100000, processingDays: 14, allowsNonResident: true, requiresPropertyProof: true },
      { id: 'FAB_WEALTH', name: 'First Abu Dhabi Bank (FAB) Wealth', minBalanceAed: 200000, processingDays: 10, allowsNonResident: true, requiresPropertyProof: true },
      { id: 'MASHREQ_NEO', name: 'Mashreq Non-Resident Account', minBalanceAed: 50000, processingDays: 7, allowsNonResident: true, requiresPropertyProof: false }
    ];
  }

  /**
   * Matches investor with compliant non-resident banking provider.
   * @param {Object} params
   * @param {number} params.liquidDepositBudgetAed
   * @param {boolean} [params.hasPurchasedPropertyInUae=true]
   * @param {string} params.homeCountry
   * @returns {Object}
   */
  matchBankingProvider({ liquidDepositBudgetAed, hasPurchasedPropertyInUae = true, homeCountry }) {
    const matched = this.bankProfiles.filter(b => liquidDepositBudgetAed >= b.minBalanceAed);
    const recommendedBank = matched[0] || this.bankProfiles[this.bankProfiles.length - 1];

    return {
      homeCountry,
      liquidDepositBudgetAed,
      hasPurchasedPropertyInUae,
      recommendedBank: recommendedBank.name,
      minBalanceRequiredAed: recommendedBank.minBalanceAed,
      estimatedProcessingDays: recommendedBank.processingDays,
      requiredDocumentation: [
        'Valid Passport copy with UAE entry stamp / tourist visa',
        '6-month original home-country bank statements (stamped)',
        'Utility bill verifying permanent residential address outside UAE',
        hasPurchasedPropertyInUae ? 'Original DLD Title Deed or Sales & Purchase Agreement (SPA)' : 'Letter of intent / reservation agreement'
      ],
      kycWarning: 'In-person signature verification inside UAE branch required by UAE Central Bank regulations.'
    };
  }
}

export default new NonResidentBankAccountConcierge();
