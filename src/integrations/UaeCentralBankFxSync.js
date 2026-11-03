/**
 * @file UaeCentralBankFxSync.js
 * @description Syncs, parses, and caches official daily foreign exchange rates published by
 * the Central Bank of the UAE (CBUAE) to compute accurate AED conversions for property buyers.
 * Category: Integrations
 */

export class UaeCentralBankFxSync {
  constructor(config = {}) {
    this.pegRateUsd = 3.6725;
    this.ratesCache = new Map();
    this.lastSyncTimestamp = null;
    this.cacheTtlMs = config.cacheTtlMs || 4 * 60 * 60 * 1000; // 4 hours
    this.initializeBaselineRates();
  }

  /**
   * Baseline rates against 1 AED (Inverse of AED per Unit)
   */
  initializeBaselineRates() {
    this.ratesCache.set('AED', 1.0);
    this.ratesCache.set('USD', 0.27229); // 3.6725 AED
    this.ratesCache.set('EUR', 0.2520);
    this.ratesCache.set('GBP', 0.2150);
    this.ratesCache.set('RUB', 25.10);
    this.ratesCache.set('INR', 22.85);
    this.ratesCache.set('CNY', 1.96);
    this.ratesCache.set('SAR', 1.02);
    this.lastSyncTimestamp = new Date();
  }

  /**
   * Updates rates from ingestion payload (CBUAE XML / JSON feed)
   * @param {Array<{currency: string, aedPerUnit: number}>} rateEntries
   */
  ingestCbRates(rateEntries) {
    if (!Array.isArray(rateEntries)) {
      throw new Error('rateEntries must be an array');
    }

    for (const entry of rateEntries) {
      if (entry.currency && entry.aedPerUnit > 0) {
        const curr = entry.currency.toUpperCase();
        // 1 AED in target currency = 1 / aedPerUnit
        this.ratesCache.set(curr, 1 / entry.aedPerUnit);
      }
    }
    this.lastSyncTimestamp = new Date();
    return {
      updatedCount: rateEntries.length,
      syncedAt: this.lastSyncTimestamp.toISOString()
    };
  }

  /**
   * Converts an amount from AED to a target currency
   * @param {number} amountAed
   * @param {string} targetCurrency
   * @returns {{ targetCurrency: string, convertedAmount: number, rate: number }}
   */
  convertAedTo(amountAed, targetCurrency) {
    const curr = (targetCurrency || 'USD').toUpperCase();
    const rate = this.ratesCache.get(curr);
    if (!rate) {
      throw new Error(`Unsupported currency or rate not available for ${curr}`);
    }
    const convertedAmount = Math.round(amountAed * rate * 100) / 100;
    return {
      targetCurrency: curr,
      convertedAmount,
      rate
    };
  }

  /**
   * Returns cache sync health status
   */
  getStatus() {
    const isStale = !this.lastSyncTimestamp || (Date.now() - this.lastSyncTimestamp.getTime() > this.cacheTtlMs);
    return {
      cachedCurrencies: Array.from(this.ratesCache.keys()),
      lastSync: this.lastSyncTimestamp ? this.lastSyncTimestamp.toISOString() : null,
      isStale
    };
  }
}

export default new UaeCentralBankFxSync();
