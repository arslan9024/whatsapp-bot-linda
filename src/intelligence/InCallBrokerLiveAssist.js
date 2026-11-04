/**
 * @file InCallBrokerLiveAssist.js
 * @description Generates real-time teleprompter cues and instant fact-checks for human
 * brokers during live telephone discussions, streamed directly to their mobile or screen.
 * Category: Intelligence
 */

export class InCallBrokerLiveAssist {
  constructor() {
    this.propertyFacts = new Map([
      ['BURJ-CROWN', { serviceCharge: '17.5 AED/sqft', handover: 'Ready', developer: 'Emaar' }],
      ['PALM-VILLA', { serviceCharge: '8.2 AED/sqft', handover: 'Ready', developer: 'Nakheel' }],
      ['DUBAI-HILLS', { serviceCharge: '14.0 AED/sqft', handover: 'Q4 2026', developer: 'Emaar' }]
    ]);
  }

  /**
   * Generates live on-screen assistance cards from client question keywords
   * @param {string} spokenPhrase
   * @param {string} activePropertyRef
   * @returns {Object} Contextual teleprompter hint
   */
  generateLiveCue(spokenPhrase = '', activePropertyRef = 'BURJ-CROWN') {
    const text = spokenPhrase.toLowerCase();
    const facts = this.propertyFacts.get(activePropertyRef) || { serviceCharge: '15 AED/sqft (avg)' };

    if (text.includes('service charge') || text.includes('maintenance')) {
      return {
        cueType: 'FACT_CHECK',
        headline: `Service Charges: ${facts.serviceCharge}`,
        coachingAdvice: 'Emphasize that chiller fees are included or building has 100% reserve fund.'
      };
    }

    if (text.includes('handover') || text.includes('completion')) {
      return {
        cueType: 'CLOSING_WINDOW',
        headline: `Handover Timeline: ${facts.handover || 'Under Construction'}`,
        coachingAdvice: 'Highlight that developer escrow accounts hold 100% of construction funds under Law 8.'
      };
    }

    return {
      cueType: 'RAPPORT_BUILDER',
      headline: 'Active Listening',
      coachingAdvice: 'Validate client question and ask about their planned holding period (3-5 vs 10+ years).'
    };
  }
}

export default new InCallBrokerLiveAssist();
