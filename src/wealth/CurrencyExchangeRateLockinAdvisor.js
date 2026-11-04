/**
 * @file CurrencyExchangeRateLockinAdvisor.js
 * @description Monitors FX rate fluctuations (GBP/AED, EUR/AED, INR/AED) against 90-day moving averages and recommends optimal spot wire execution windows.
 * Category: 2️⃣ Domain / Feature (Cross-Border Wealth)
 */

export class CurrencyExchangeRateLockinAdvisor {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.rateHistory90d = options.rateHistory90d || {
      'EUR': { average: 3.98, current: 3.92, low90d: 3.90, high90d: 4.08 },
      'GBP': { average: 4.75, current: 4.68, low90d: 4.65, high90d: 4.86 },
      'INR': { average: 0.043, current: 0.042, low90d: 0.041, high90d: 0.044 }
    };
  }

  /**
   * Evaluates FX timing for a cross-border wire transfer.
   * @param {Object} params
   * @param {string} params.sourceCurrency ('EUR', 'GBP', 'INR')
   * @param {number} params.targetAedAmount
   * @returns {Object}
   */
  evaluateFxWindow({ sourceCurrency, targetAedAmount }) {
    const symbol = (sourceCurrency || 'EUR').toUpperCase().trim();
    const history = this.rateHistory90d[symbol] || { average: 1.0, current: 1.0, low90d: 0.95, high90d: 1.05 };

    const discountVsAveragePct = ((history.average - history.current) / history.average) * 100;
    const isOptimalWindow = history.current <= (history.average * 0.985); // >1.5% favorable vs average
    const foreignCurrencyCost = targetAedAmount / history.current;
    const foreignCurrencyAtAverage = targetAedAmount / history.average;
    const estimatedSavingsHomeCurrency = Math.round(foreignCurrencyAtAverage - foreignCurrencyCost);

    return {
      sourceCurrency: symbol,
      targetAedAmount,
      currentRate: history.current,
      average90dRate: history.average,
      favorableWindowRating: isOptimalWindow ? 'PRIME_LOCK_IN_WINDOW' : 'NORMAL_RANGE',
      foreignCurrencyRequired: Math.round(foreignCurrencyCost),
      estimatedSavingsVsAverage: Math.abs(estimatedSavingsHomeCurrency),
      recommendation: isOptimalWindow
        ? `Execute Wire Transfer Now: ${symbol} is trading near 90-day lows, saving ~${Math.abs(discountVsAveragePct).toFixed(1)}% on purchase equity conversion.`
        : 'Staggered Transfer: Current rate is near average; consider transferring 50% now and setting a forward alert for the balance.'
    };
  }
}

export default new CurrencyExchangeRateLockinAdvisor();
