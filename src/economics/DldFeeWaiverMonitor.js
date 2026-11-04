/**
 * @file DldFeeWaiverMonitor.js
 * @description Tracks developer sales promotions absorbing 2% to 4% Dubai Land Department title deed registration fees, quantifying effective buyer cash savings.
 * Category: 2️⃣ Domain / Feature (Market Economics)
 */

export class DldFeeWaiverMonitor {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.activePromotions = options.activePromotions || {
      'EMAAR': { defaultWaiverPct: 2, currentPromoWaiverPct: 4, promoExpiry: '2026-12-31' },
      'DAMAC': { defaultWaiverPct: 4, currentPromoWaiverPct: 4, promoExpiry: '2026-11-30' },
      'SOBHA': { defaultWaiverPct: 0, currentPromoWaiverPct: 4, promoExpiry: '2026-12-15' },
      'DANUBE': { defaultWaiverPct: 4, currentPromoWaiverPct: 4, promoExpiry: '2026-12-31' }
    };
  }

  /**
   * Evaluates DLD fee absorption savings on purchase price.
   * @param {Object} params
   * @param {string} params.developer
   * @param {number} params.purchasePriceAed
   * @param {number} [params.customWaiverPct]
   * @returns {Object}
   */
  evaluateWaiverSavings({ developer, purchasePriceAed, customWaiverPct }) {
    const key = (developer || '').toUpperCase().trim();
    const promo = this.activePromotions[key] || { defaultWaiverPct: 0, currentPromoWaiverPct: 0, promoExpiry: null };
    const effectiveWaiverPct = typeof customWaiverPct === 'number' ? customWaiverPct : promo.currentPromoWaiverPct;

    const standardDldFeeAed = purchasePriceAed * 0.04;
    const waivedAmountAed = purchasePriceAed * (effectiveWaiverPct / 100);
    const buyerPayableDldFeeAed = Math.max(0, standardDldFeeAed - waivedAmountAed);

    return {
      developer,
      purchasePriceAed,
      standardDldFeeAed: Math.round(standardDldFeeAed),
      waivedDldPct: effectiveWaiverPct,
      waivedAmountAed: Math.round(waivedAmountAed),
      buyerPayableDldFeeAed: Math.round(buyerPayableDldFeeAed),
      hasActiveWaiverPromo: effectiveWaiverPct > 0,
      savingsInsight: effectiveWaiverPct >= 4
        ? `100% DLD Waiver: Developer absorbs full 4% transfer fee, saving buyer AED ${Math.round(waivedAmountAed).toLocaleString()}.`
        : effectiveWaiverPct > 0
          ? `Partial Waiver: Developer absorbs ${effectiveWaiverPct}%, reducing registration out-of-pocket costs.`
          : 'Standard DLD Fee: Buyer responsible for full 4% registration fee.'
    };
  }
}

export default new DldFeeWaiverMonitor();
