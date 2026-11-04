/**
 * @file TokenBudgetAutoCapper.js
 * @description Tracks daily LLM token consumption and dollar expenditure, enforcing hard circuit breakers to eliminate accidental bill runaways.
 * Category: 2️⃣ Domain / Feature (Self-Evolution & Red-Teaming)
 */

export class TokenBudgetAutoCapper {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.dailyBudgetLimitUsd = options.dailyBudgetLimitUsd || 15.0; // $15.00 daily safety cap
    this.currentDailySpendUsd = 0;
    this.lastResetDate = new Date().toISOString().slice(0, 10);
  }

  /**
   * Records usage and checks spend cap.
   * @param {number} costUsd
   * @returns {Object}
   */
  recordUsageAndCheckCap(costUsd) {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.lastResetDate) {
      this.currentDailySpendUsd = 0;
      this.lastResetDate = today;
    }

    this.currentDailySpendUsd += costUsd;
    const isCapped = this.currentDailySpendUsd >= this.dailyBudgetLimitUsd;
    const remainingBudgetUsd = Math.max(0, this.dailyBudgetLimitUsd - this.currentDailySpendUsd);

    return {
      currentDailySpendUsd: Number(this.currentDailySpendUsd.toFixed(3)),
      dailyBudgetLimitUsd: this.dailyBudgetLimitUsd,
      remainingBudgetUsd: Number(remainingBudgetUsd.toFixed(3)),
      isBudgetExhausted: isCapped,
      actionPolicy: isCapped ? 'SWITCH_TO_FREE_LOCAL_LLAMA_FALLBACK' : 'ALLOW_FRONTIER_API_CALLS'
    };
  }
}

export default new TokenBudgetAutoCapper();
