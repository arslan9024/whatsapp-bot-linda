/**
 * DistressDealDetector.js
 * 
 * Single responsibility: Flag properties priced 15%+ below 30-day community transaction averages.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class DistressDealDetector {
  constructor({ distressThresholdPercent = 15 } = {}) {
    this.distressThresholdPercent = distressThresholdPercent;
  }

  evaluateListing({
    community,
    askingPriceAed,
    buaSqft,
    benchmarkAvgPricePerSqft,
  }) {
    if (!askingPriceAed || !buaSqft || !benchmarkAvgPricePerSqft) {
      return { isDistressDeal: false, discountPercent: 0 };
    }

    const askingPricePerSqft = askingPriceAed / buaSqft;
    const discount = ((benchmarkAvgPricePerSqft - askingPricePerSqft) / benchmarkAvgPricePerSqft) * 100;
    const isDistress = discount >= this.distressThresholdPercent;

    return {
      community,
      askingPriceAed,
      askingPricePerSqft: Math.round(askingPricePerSqft),
      benchmarkAvgPricePerSqft,
      discountPercent: Number(discount.toFixed(1)),
      isDistressDeal: isDistress,
      urgencyTag: isDistress ? '🔥 HIGH_PRIORITY_DISTRESS_OPPORTUNITY' : 'STANDARD_MARKET_PRICED',
    };
  }
}

export default new DistressDealDetector();

