// @ts-nocheck
/**
 * WhatsAppDispatchPool.js
 * 
 * Single responsibility: Multi-account WhatsApp dispatch pooling and round-robin load distribution.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class WhatsAppDispatchPool {
  /**
   * @param {Object} options
   * @param {string[]} [options.accountPhones] - Initial pool of WhatsApp phone numbers
   * @param {number} [options.maxDailyPerAccount] - Maximum outbound daily messages per account
   */
  constructor({ accountPhones = [], maxDailyPerAccount = 15 } = {}) {
    this.maxDailyPerAccount = maxDailyPerAccount;
    /** @type {Array<{ phone: string, active: boolean, dailyCount: number, lastUsedAt: number }>} */
    this.pool = [];
    this.currentIndex = 0;

    if (Array.isArray(accountPhones)) {
      accountPhones.forEach(phone => this.registerAccount(phone));
    }
  }

  /**
   * Register or activate an account in the dispatch pool
   * @param {string} phone
   */
  registerAccount(phone) {
    if (!phone) return null;
    const cleanPhone = String(phone).replace(/[^\d+]/g, '');
    const existing = this.pool.find(acc => acc.phone === cleanPhone);
    if (existing) {
      existing.active = true;
      return existing;
    }
    const newAccount = {
      phone: cleanPhone,
      active: true,
      dailyCount: 0,
      lastUsedAt: 0,
    };
    this.pool.push(newAccount);
    return newAccount;
  }

  /**
   * Deactivate an account (e.g. rate-limited, logged out, or disconnected)
   * @param {string} phone
   */
  deactivateAccount(phone) {
    const cleanPhone = String(phone).replace(/[^\d+]/g, '');
    const acc = this.pool.find(a => a.phone === cleanPhone);
    if (acc) acc.active = false;
  }

  /**
   * Get all active accounts that haven't hit their daily ceiling
   */
  getEligibleAccounts() {
    return this.pool.filter(acc => acc.active && acc.dailyCount < this.maxDailyPerAccount);
  }

  /**
   * Select next account in round-robin fashion
   * @returns {string|null} The phone number to dispatch from
   */
  acquireNextSender() {
    const eligible = this.getEligibleAccounts();
    if (!eligible.length) return null;

    // Pick round-robin from eligible list
    this.currentIndex = this.currentIndex % eligible.length;
    const chosen = eligible[this.currentIndex];
    
    // Advance pointer
    this.currentIndex = (this.currentIndex + 1) % eligible.length;
    chosen.dailyCount += 1;
    chosen.lastUsedAt = Date.now();
    
    return chosen.phone;
  }

  /**
   * Reset daily message counters across all accounts
   */
  resetDailyCounters() {
    this.pool.forEach(acc => { acc.dailyCount = 0; });
  }

  /**
   * Get telemetry snapshot of the pool
   */
  getPoolStatus() {
    return {
      totalAccounts: this.pool.length,
      activeAccounts: this.pool.filter(a => a.active).length,
      eligibleAccounts: this.getEligibleAccounts().length,
      accounts: this.pool.map(a => ({
        phone: a.phone,
        active: a.active,
        dailyCount: a.dailyCount,
        remainingDaily: Math.max(0, this.maxDailyPerAccount - a.dailyCount),
        lastUsedAt: a.lastUsedAt ? new Date(a.lastUsedAt).toISOString() : null,
      })),
    };
  }
}

export default new WhatsAppDispatchPool();
