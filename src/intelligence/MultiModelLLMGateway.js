/**
 * MultiModelLLMGateway.js
 * 
 * Single responsibility: Multi-provider LLM failover gateway (Gemini -> Claude -> GPT-4o).
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const LLM_PROVIDERS = Object.freeze(['GEMINI', 'CLAUDE', 'OPENAI']);

export class MultiModelLLMGateway {
  constructor({ defaultProvider = 'GEMINI', maxRetries = 2 } = {}) {
    this.currentProvider = defaultProvider;
    this.maxRetries = maxRetries;
    this.failureCounts = new Map(LLM_PROVIDERS.map(p => [p, 0]));
  }

  selectProvider() {
    return this.currentProvider;
  }

  recordFailure(provider) {
    const current = (this.failureCounts.get(provider) || 0) + 1;
    this.failureCounts.set(provider, current);

    if (current >= this.maxRetries && provider === this.currentProvider) {
      this.failover();
    }
  }

  failover() {
    const idx = LLM_PROVIDERS.indexOf(this.currentProvider);
    const nextIdx = (idx + 1) % LLM_PROVIDERS.length;
    this.currentProvider = LLM_PROVIDERS[nextIdx];
    return this.currentProvider;
  }

  recordSuccess(provider) {
    this.failureCounts.set(provider, 0);
  }

  getStatus() {
    return {
      activeProvider: this.currentProvider,
      failures: Object.fromEntries(this.failureCounts.entries()),
    };
  }
}

export default new MultiModelLLMGateway();

