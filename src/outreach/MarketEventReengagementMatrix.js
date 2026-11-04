/**
 * @file MarketEventReengagementMatrix.js
 * @description Triggers automated targeted outreach campaigns based on macroeconomic
 * and regulatory Dubai property events (interest rate cuts, Golden Visa rules, metro lines).
 * Category: Outreach
 */

export class MarketEventReengagementMatrix {
  constructor() {
    this.eventCatalog = {
      GOLDEN_VISA_POLICY_UPDATE: {
        headline: 'UAE Golden Visa Real Estate Threshold Update',
        audienceFilter: (lead) => (lead.budgetAed || 0) >= 2000000,
        messageTemplate: 'Hi {name}, following the latest UAE Golden Visa regulatory update, property purchases above 2M AED now qualify with zero minimum down payment. Would you like to review eligible options?'
      },
      INTEREST_RATE_CUT: {
        headline: 'Central Bank Rate Reduction',
        audienceFilter: (lead) => lead.requiresMortgage === true,
        messageTemplate: 'Hi {name}, mortgage borrowing rates in Dubai just eased following the Central Bank rate cut. Your monthly installment estimates for {community} are now lower.'
      }
    };
  }

  /**
   * Evaluates which leads in a roster match a market event trigger
   * @param {string} eventKey
   * @param {Array<Object>} leadRoster
   * @returns {Array<Object>} Matching leads ready for broadcast
   */
  filterTargetAudience(eventKey, leadRoster = []) {
    const event = this.eventCatalog[eventKey];
    if (!event) return [];

    return leadRoster.filter(lead => event.audienceFilter(lead));
  }
}

export default new MarketEventReengagementMatrix();

