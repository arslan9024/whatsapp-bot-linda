/**
 * CurrencyFxMultiConverter.js
 * 
 * Single responsibility: Convert international currencies (USD, EUR, GBP, RUB, INR) to and from AED.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const STANDARD_AED_PEGS = Object.freeze({
  USD: 3.6725, // Central Bank of UAE fixed peg
  EUR: 3.98,
  GBP: 4.65,
  RUB: 0.040,
  INR: 0.044,
  CNY: 0.51,
});

export class CurrencyFxMultiConverter {
  constructor({ rates = STANDARD_AED_PEGS } = {}) {
    this.rates = { ...rates };
  }

  convertToAed(amount, currencyCode = 'USD') {
    if (!amount || amount <= 0) return 0;
    const code = currencyCode.toUpperCase().trim();
    const rate = this.rates[code] || 1.0;
    return Math.round(amount * rate);
  }

  convertFromAed(aedAmount, targetCurrency = 'USD') {
    if (!aedAmount || aedAmount <= 0) return 0;
    const code = targetCurrency.toUpperCase().trim();
    const rate = this.rates[code] || 1.0;
    return Number((aedAmount / rate).toFixed(2));
  }

  formatDualPrice(aedAmount, currencyCode = 'USD') {
    const converted = this.convertFromAed(aedAmount, currencyCode);
    return `${aedAmount.toLocaleString()} AED (~${converted.toLocaleString()} ${currencyCode.toUpperCase()})`;
  }
}

export default new CurrencyFxMultiConverter();
