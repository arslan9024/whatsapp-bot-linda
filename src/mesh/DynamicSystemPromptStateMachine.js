/**
 * @file DynamicSystemPromptStateMachine.js
 * @description Adapts Linda's operational system prompt dynamically across the client lifecycle (Cold Prospect -> Discovery -> Investment Presentation -> Negotiation -> Title Deed Closing).
 * Category: 2️⃣ Domain / Feature (Multi-LLM Mesh)
 */

export class DynamicSystemPromptStateMachine {
  /**
   * Resolves the customized system prompt instructions for client stage.
   * @param {string} stage ('COLD_DISCOVERY', 'NURTURE_EDUCATION', 'INVESTMENT_OFFER', 'NEGOTIATION_CLOSING')
   * @param {Object} [clientContext]
   * @returns {Object}
   */
  resolveSystemPrompt(stage = 'COLD_DISCOVERY', clientContext = {}) {
    const stageKey = stage.toUpperCase().trim();

    const stageDirectives = {
      'COLD_DISCOVERY': {
        posture: 'WARM_WELCOMING_CONCIERGE',
        instruction: 'Ask brief, friendly qualifying questions (budget, desired community, move-in vs investment timeline). Do not overwhelm with technical brochures.',
        tone: 'Consultative, low-pressure, welcoming'
      },
      'NURTURE_EDUCATION': {
        posture: 'SENIOR_MARKET_ANALYST',
        instruction: 'Provide clear ROI yields, capital appreciation trends, and community infrastructure insights. Emphasize DLD historical data.',
        tone: 'Data-driven, authoritative, professional'
      },
      'INVESTMENT_OFFER': {
        posture: 'TRANSACTION_STRUCTURER',
        instruction: 'Present specific verified units with exact payment plan schedules, DLD waiver perks, and floor plan highlights. Solicit reservation deposit.',
        tone: 'Action-oriented, clear, compelling'
      },
      'NEGOTIATION_CLOSING': {
        posture: 'EXECUTIVE_ESCROW_OFFICER',
        instruction: 'Focus on Contract F / MOU terms, manager cheque arrangements, Golden Visa eligibility, and developer NOC coordination.',
        tone: 'Precise, legally rigorous, reassuring'
      }
    };

    const selected = stageDirectives[stageKey] || stageDirectives['COLD_DISCOVERY'];

    return {
      activeStage: stageKey,
      posture: selected.posture,
      directive: selected.instruction,
      tone: selected.tone,
      buyerName: clientContext.name || 'Valued Client',
      targetBudgetAed: clientContext.budgetAed || 'Unspecified'
    };
  }
}

export default new DynamicSystemPromptStateMachine();
