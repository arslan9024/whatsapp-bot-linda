/**
 * @file MultiModelCostArbitrageRouter.js
 * @description Dynamically routes inbound user queries between budget flash tier models and flagship reasoning models based on query complexity, slashing token expenditure by up to 80%.
 * Category: 2️⃣ Domain / Feature (Multi-LLM Mesh)
 */

export class MultiModelCostArbitrageRouter {
  /**
   * Routes query to the most cost-effective compliant model tier.
   * @param {string} userMessage
   * @param {number} [conversationTurnCount=1]
   * @returns {Object}
   */
  routeQuery(userMessage = '', conversationTurnCount = 1) {
    const textLower = userMessage.toLowerCase().trim();
    const wordCount = textLower.split(/\s+/).length;

    // Fast-path greetings and trivial queries
    const isGreeting = wordCount <= 4 && (textLower.includes('hi') || textLower.includes('hello') || textLower.includes('good morning') || textLower.includes('thanks'));
    const isBasicFaq = textLower.includes('office location') || textLower.includes('contact number') || textLower.includes('opening hours');

    // Complex investment and financial queries
    const isComplexFinancial = textLower.includes('yield') ||
      textLower.includes('arbitrage') ||
      textLower.includes('mortgage') ||
      textLower.includes('npv') ||
      textLower.includes('escrow') ||
      textLower.includes('golden visa') ||
      wordCount > 40;

    let tier = 'STANDARD_BALANCED';
    let selectedModel = 'claude-3-5-haiku';
    let estimatedCostPer1MTokensUsd = 0.80;

    if (isGreeting || isBasicFaq) {
      tier = 'FLASH_MICRO_TIER';
      selectedModel = 'gemini-1.5-flash';
      estimatedCostPer1MTokensUsd = 0.075;
    } else if (isComplexFinancial || conversationTurnCount > 8) {
      tier = 'FRONTIER_REASONING_TIER';
      selectedModel = 'claude-3-5-sonnet';
      estimatedCostPer1MTokensUsd = 3.00;
    }

    return {
      queryPreview: userMessage.slice(0, 60),
      wordCount,
      tier,
      selectedModel,
      estimatedCostPer1MTokensUsd,
      routingRationale: isGreeting
        ? 'Trivial greeting: Routed to ultra-low-cost flash model.'
        : isComplexFinancial
          ? 'High-stakes financial inquiry: Routed to frontier reasoning engine.'
          : 'Standard conversational query: Routed to balanced middle-weight model.'
    };
  }
}

export default new MultiModelCostArbitrageRouter();
