/**
 * CampaignBudgetGuard.js
 * 
 * Single responsibility: Monitor daily outbound API token consumption and enforce hard cost ceilings.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class CampaignBudgetGuard {
  constructor({ dailyCostLimitUsd = 15.0 } = {}) {
    this.dailyCostLimitUsd = dailyCostLimitUsd;
    this.currentSpendUsd = 0.0;
    this.lastResetDate = new Date().toISOString().split('T')[0];
  }

  _checkDateReset(now = new Date()) {
    const today = now.toISOString().split('T')[0];
    if (today !== this.lastResetDate) {
      this.currentSpendUsd = 0.0;
      this.lastResetDate = today;
    }
  }

  recordApiCost(costUsd, now = new Date()) {
    this._checkDateReset(now);
    this.currentSpendUsd += costUsd;
  }

  canDispatchCampaign(estimatedCostUsd = 0.005, now = new Date()) {
    this._checkDateReset(now);
    return (this.currentSpendUsd + estimatedCostUsd) <= this.dailyCostLimitUsd;
  }

  getBudgetStatus() {
    return {
      dailyLimitUsd: this.dailyCostLimitUsd,
      currentSpendUsd: Number(this.currentSpendUsd.toFixed(4)),
      remainingUsd: Number(Math.max(0, this.dailyCostLimitUsd - this.currentSpendUsd).toFixed(4)),
      isExhausted: this.currentSpendUsd >= this.dailyCostLimitUsd,
    };
  }
}

export default new CampaignBudgetGuard();

