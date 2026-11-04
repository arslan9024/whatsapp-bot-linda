/**
 * @file ShortTermAirbnbRevenuePredictor.js
 * @description Forecasts seasonal holiday home (Airbnb / DTCM) gross revenue, occupancy curves, and net yields across Dubai locations.
 * Category: 2️⃣ Domain / Feature (Market Economics)
 */

export class ShortTermAirbnbRevenuePredictor {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.dtcmPermitAnnualAed = options.dtcmPermitAnnualAed || 1520;
    this.operatorRevSharePct = options.operatorRevSharePct || 18; // 18% standard holiday home management
  }

  /**
   * Predicts annual holiday home revenues with Dubai seasonality.
   * @param {Object} params
   * @param {number} params.highSeasonDailyRateAed (Oct - Apr: 212 days)
   * @param {number} params.lowSeasonDailyRateAed (May - Sep: 153 days)
   * @param {number} [params.highSeasonOccupancyPct=85]
   * @param {number} [params.lowSeasonOccupancyPct=55]
   * @param {number} [params.annualUtilitiesAndWifiAed=18000]
   * @returns {Object}
   */
  predictAnnualHolidayRevenue({
    highSeasonDailyRateAed,
    lowSeasonDailyRateAed,
    highSeasonOccupancyPct = 85,
    lowSeasonOccupancyPct = 55,
    annualUtilitiesAndWifiAed = 18000
  }) {
    const highDaysBooked = 212 * (highSeasonOccupancyPct / 100);
    const lowDaysBooked = 153 * (lowSeasonOccupancyPct / 100);

    const highSeasonGross = highDaysBooked * highSeasonDailyRateAed;
    const lowSeasonGross = lowDaysBooked * lowSeasonDailyRateAed;
    const totalGrossRevenue = highSeasonGross + lowSeasonGross;

    const operatorFee = totalGrossRevenue * (this.operatorRevSharePct / 100);
    const netTakeHome = totalGrossRevenue - operatorFee - annualUtilitiesAndWifiAed - this.dtcmPermitAnnualAed;
    const blendedOccupancyPct = ((highDaysBooked + lowDaysBooked) / 365) * 100;
    const blendedRevPar = totalGrossRevenue / 365;

    return {
      highSeasonGrossAed: Math.round(highSeasonGross),
      lowSeasonGrossAed: Math.round(lowSeasonGross),
      totalGrossRevenueAed: Math.round(totalGrossRevenue),
      operatorFeeAed: Math.round(operatorFee),
      netTakeHomeAed: Math.round(netTakeHome),
      blendedOccupancyPct: Number(blendedOccupancyPct.toFixed(1)),
      blendedRevParAed: Number(blendedRevPar.toFixed(1)),
      holidayRentalFeasibility: netTakeHome > 0 ? 'HIGHLY_VIABLE' : 'UNECONOMIC'
    };
  }
}

export default new ShortTermAirbnbRevenuePredictor();
