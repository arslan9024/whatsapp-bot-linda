/**
 * @file DynamicVoicePersonaSwitcher.js
 * @description Modulates Linda's conversational voice persona, tone of voice,
 * and formality level dynamically based on conversation stage and client status.
 * Category: Intelligence
 */

export class DynamicVoicePersonaSwitcher {
  constructor() {
    this.personas = {
      WARM_CONCIERGE: {
        id: 'WARM_CONCIERGE',
        style: 'friendly, welcoming, highly polite',
        openingGreeting: 'Hello and welcome! It is my pleasure to assist your luxury property search in Dubai.',
        formalityScore: 70
      },
      INVESTMENT_ANALYST: {
        id: 'INVESTMENT_ANALYST',
        style: 'data-driven, quantitative, objective',
        openingGreeting: 'Good day. I have compiled the net rental yields and capital growth projections for this cluster.',
        formalityScore: 90
      },
      PRIVATE_OFFICE_DIRECTOR: {
        id: 'PRIVATE_OFFICE_DIRECTOR',
        style: 'discreet, exclusive, executive',
        openingGreeting: 'Greetings. I oversee our off-market pocket listings and ultra-prime assets directly.',
        formalityScore: 95
      }
    };
  }

  /**
   * Resolves persona based on lead tier and user request
   * @param {Object} context
   * @param {string} [context.leadTier] - 'UHNW_VIP' | 'QUALIFIED' | 'STANDARD'
   * @param {string} [context.intent] - 'FINANCIAL_ROI' | 'POCKET_LISTING'
   * @returns {Object} Active voice persona
   */
  resolvePersona(context = {}) {
    if (context.leadTier === 'UHNW_VIP' || context.intent === 'POCKET_LISTING') {
      return this.personas.PRIVATE_OFFICE_DIRECTOR;
    }

    if (context.intent === 'FINANCIAL_ROI') {
      return this.personas.INVESTMENT_ANALYST;
    }

    return this.personas.WARM_CONCIERGE;
  }
}

export default new DynamicVoicePersonaSwitcher();
