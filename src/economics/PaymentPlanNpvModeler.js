/**
 * @file PaymentPlanNpvModeler.js
 * @description Models Net Present Value (NPV) and effective real discount of developer extended post-handover payment plans vs upfront cash deals.
 * Category: 2️⃣ Domain / Feature (Market Economics)
 */

export class PaymentPlanNpvModeler {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.defaultDiscountRatePct = options.defaultDiscountRatePct || 6.5; // 6.5% UAE risk-free/cost of capital
  }

  /**
   * Calculates NPV of installment cash flows and compares with cash offer.
   * @param {Object} params
   * @param {number} params.listPriceAed
   * @param {Array<{ month: number, amountAed: number }>} params.cashFlows
   * @param {number} [params.discountRatePct]
   * @param {number} [params.cashDiscountOfferAed]
   * @returns {Object}
   */
  evaluatePlanNpv({ listPriceAed, cashFlows = [], discountRatePct, cashDiscountOfferAed = 0 }) {
    const rate = (discountRatePct || this.defaultDiscountRatePct) / 100;
    const monthlyRate = rate / 12;

    let npvTotal = 0;
    for (const cf of cashFlows) {
      const discountFactor = Math.pow(1 + monthlyRate, cf.month);
      npvTotal += cf.amountAed / discountFactor;
    }

    const effectiveDiscountAed = listPriceAed - npvTotal;
    const effectiveDiscountPct = listPriceAed > 0 ? (effectiveDiscountAed / listPriceAed) * 100 : 0;
    const cashOfferPrice = listPriceAed - cashDiscountOfferAed;
    const isPaymentPlanBetterThanCashOffer = cashDiscountOfferAed > 0 ? npvTotal < cashOfferPrice : true;

    return {
      listPriceAed,
      npvAed: Math.round(npvTotal),
      annualDiscountRatePct: rate * 100,
      effectiveSavingFromDeferredTermsAed: Math.round(effectiveDiscountAed),
      effectiveDiscountPct: Number(effectiveDiscountPct.toFixed(2)),
      cashOfferPrice: cashDiscountOfferAed > 0 ? cashOfferPrice : null,
      recommendation: cashDiscountOfferAed > 0 && !isPaymentPlanBetterThanCashOffer
        ? 'Opt for Cash Deal: Developer upfront cash discount outweighs NPV time-value of payments.'
        : 'Opt for Payment Plan: Zero-interest installment schedule beats upfront cash liquidity cost.'
    };
  }
}

export default new PaymentPlanNpvModeler();
