/**
 * MarketEventTriggerNotifier.js
 * 
 * Single responsibility: Format contextual alert messages when macroeconomic or community market events occur.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class MarketEventTriggerNotifier {
  formatMarketAlert(eventType, { community = 'Dubai', metricChange = '0.5%' } = {}) {
    switch (eventType) {
      case 'INTEREST_RATE_CUT':
        return `Market Update: UAE Central Bank interest rates have reduced by ${metricChange}, lowering monthly mortgage installments across prime Dubai communities. Would you like an updated mortgage calculation?`;
      case 'NEW_PHASE_LAUNCH':
        return `New Release: The developer has just announced the final waterfront cluster in ${community} with an exclusive 1% monthly payment plan. Would you like early pre-launch access?`;
      case 'CAPITAL_APPRECIATION_INDEX':
        return `Quarterly DLD Update: Average price/sqft in ${community} has grown by ${metricChange} over the last 90 days. Would you like a fresh valuation of your property?`;
      default:
        return `Market Update: New verified real estate opportunities are now available in ${community}.`;
    }
  }
}

export default new MarketEventTriggerNotifier();

