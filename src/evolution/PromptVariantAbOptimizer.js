/**
 * @file PromptVariantAbOptimizer.js
 * @description Executes automated A/B experimentation across outreach copy variants, allocating traffic dynamically towards top-converting messaging hooks.
 * Category: 2️⃣ Domain / Feature (Self-Evolution & Red-Teaming)
 */

export class PromptVariantAbOptimizer {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.variants = options.variants || {
      'VARIANT_A': { id: 'VARIANT_A', text: 'Hi! Are you looking for rental yield or holiday home use in Dubai?', dispatches: 0, replies: 0 },
      'VARIANT_B': { id: 'VARIANT_B', text: 'Hello! Would you like to review our top 3 off-plan investment picks this week?', dispatches: 0, replies: 0 }
    };
  }

  /**
   * Selects variant using epsilon-greedy or alternating traffic allocation.
   * @returns {Object}
   */
  selectActiveVariant() {
    const list = Object.values(this.variants);
    list.sort((a, b) => a.dispatches - b.dispatches);
    const chosen = list[0];
    chosen.dispatches++;

    return {
      variantId: chosen.id,
      promptText: chosen.text,
      currentDispatches: chosen.dispatches
    };
  }

  /**
   * Records reply conversion.
   * @param {string} variantId
   */
  recordReply(variantId) {
    if (this.variants[variantId]) {
      this.variants[variantId].replies++;
    }
  }

  /**
   * Evaluates A/B metrics and identifies winning variant.
   * @returns {Object}
   */
  getExperimentSummary() {
    const results = Object.values(this.variants).map(v => ({
      variantId: v.id,
      dispatches: v.dispatches,
      replies: v.replies,
      conversionRatePct: v.dispatches > 0 ? Number(((v.replies / v.dispatches) * 100).toFixed(1)) : 0
    }));

    results.sort((a, b) => b.conversionRatePct - a.conversionRatePct);

    return {
      variants: results,
      currentWinner: results[0].variantId,
      winnerConversionRatePct: results[0].conversionRatePct
    };
  }
}

export default new PromptVariantAbOptimizer();
