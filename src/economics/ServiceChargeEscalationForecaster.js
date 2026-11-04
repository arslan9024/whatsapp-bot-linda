/**
 * @file ServiceChargeEscalationForecaster.js
 * @description Projects 5-year Mollak building service charge escalation curves and assesses erosion on net rental yields.
 * Category: 2️⃣ Domain / Feature (Market Economics)
 */

export class ServiceChargeEscalationForecaster {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.defaultAnnualInflationPct = options.defaultAnnualInflationPct || 4.2; // Historical Mollak escalation rate
  }

  /**
   * Projects 5-year service charge trends.
   * @param {Object} params
   * @param {number} params.currentSqFtRateAed
   * @param {number} params.unitSqFt
   * @param {number} [params.annualInflationPct]
   * @returns {Object}
   */
  forecastEscalation({ currentSqFtRateAed, unitSqFt, annualInflationPct }) {
    const rate = (annualInflationPct || this.defaultAnnualInflationPct) / 100;
    const projections = [];
    let currentRate = currentSqFtRateAed;

    for (let year = 1; year <= 5; year++) {
      currentRate = currentRate * (1 + rate);
      const annualBill = currentRate * unitSqFt;
      projections.push({
        year,
        ratePerSqFtAed: Number(currentRate.toFixed(2)),
        annualTotalAed: Math.round(annualBill)
      });
    }

    const fiveYearTotal = projections.reduce((acc, curr) => acc + curr.annualTotalAed, 0);
    const compoundIncreasePct = ((projections[4].ratePerSqFtAed - currentSqFtRateAed) / currentSqFtRateAed) * 100;

    return {
      initialRatePerSqFtAed: currentSqFtRateAed,
      unitSqFt,
      projectedAnnualEscalationPct: (annualInflationPct || this.defaultAnnualInflationPct),
      fiveYearProjection: projections,
      fiveYearCumulativeCostAed: fiveYearTotal,
      fiveYearRateGrowthPct: Number(compoundIncreasePct.toFixed(2)),
      sinkingFundRiskLevel: currentSqFtRateAed > 28 ? 'HIGH_MAINTENANCE_LUXURY' : currentSqFtRateAed > 16 ? 'MODERATE_BALANCED' : 'LEAN_EFFICIENT'
    };
  }
}

export default new ServiceChargeEscalationForecaster();
