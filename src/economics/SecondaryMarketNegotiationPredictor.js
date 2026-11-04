/**
 * @file SecondaryMarketNegotiationPredictor.js
 * @description Analyzes seller motivation, Days on Market (DOM), and historical listing-to-sale price ratios to predict realistic negotiation discount buffers.
 * Category: 2️⃣ Domain / Feature (Market Economics)
 */

export class SecondaryMarketNegotiationPredictor {
  /**
   * Predicts achievable negotiation discount cushion off asking price.
   * @param {Object} params
   * @param {number} params.askingPriceAed
   * @param {number} params.daysOnMarket
   * @param {boolean} [params.isVacantOnTransfer=false]
   * @param {boolean} [params.isDistressedSeller=false]
   * @returns {Object}
   */
  predictNegotiationCushion({
    askingPriceAed,
    daysOnMarket,
    isVacantOnTransfer = false,
    isDistressedSeller = false
  }) {
    let discountPct = 3.0; // Baseline healthy market discount

    if (daysOnMarket > 120) discountPct += 4.5;
    else if (daysOnMarket > 60) discountPct += 2.5;
    else if (daysOnMarket < 14) discountPct -= 1.5; // Fresh listing seller stubbornness

    if (isDistressedSeller) discountPct += 5.0;
    if (isVacantOnTransfer) discountPct += 1.0; // Seller incurring vacancy costs

    const clampedDiscountPct = Math.max(1.0, Math.min(18.0, discountPct));
    const suggestedFirstOfferAed = Math.round(askingPriceAed * (1 - ((clampedDiscountPct + 3.0) / 100)));
    const targetClosingPriceAed = Math.round(askingPriceAed * (1 - (clampedDiscountPct / 100)));

    return {
      askingPriceAed,
      daysOnMarket,
      predictedRealisticDiscountPct: Number(clampedDiscountPct.toFixed(1)),
      targetClosingPriceAed,
      suggestedOpeningOfferAed: suggestedFirstOfferAed,
      negotiationPosture: clampedDiscountPct >= 8.0
        ? 'Aggressive Buyer Advantage: Prolonged listing tenure or distress allows firm lowball counter-offers.'
        : 'Tight Seller Market: Desirable asset with minimal pricing flexibility; stay within 2-4% of ask.'
    };
  }
}

export default new SecondaryMarketNegotiationPredictor();
