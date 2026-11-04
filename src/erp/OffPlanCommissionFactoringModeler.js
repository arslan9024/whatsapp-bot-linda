/**
 * @file OffPlanCommissionFactoringModeler.js
 * @description Models factoring discount haircuts and capital advance schedules for brokers monetizing delayed developer off-plan commission receivables.
 * Category: 2️⃣ Domain / Feature (Brokerage ERP & Legal MOU)
 */

export class OffPlanCommissionFactoringModeler {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.annualFactoringHaircutRatePct = options.annualFactoringHaircutRatePct || 12.0; // 12% annualized factoring cost
  }

  /**
   * Calculates immediate factoring advance on pending developer commission.
   * @param {Object} receivable
   * @param {number} receivable.pendingCommissionAed
   * @param {number} receivable.expectedDisbursementMonths
   * @param {string} receivable.developerName
   * @returns {Object}
   */
  modelAdvance(receivable) {
    const factorPeriodYears = receivable.expectedDisbursementMonths / 12;
    const totalDiscountRate = (this.annualFactoringHaircutRatePct / 100) * factorPeriodYears;
    const advanceHaircutAed = Math.round(receivable.pendingCommissionAed * totalDiscountRate);
    const netCashAdvanceAed = receivable.pendingCommissionAed - advanceHaircutAed;
    const advanceRatioPct = (netCashAdvanceAed / receivable.pendingCommissionAed) * 100;

    return {
      developer: receivable.developerName,
      pendingCommissionAed: receivable.pendingCommissionAed,
      expectedWaitMonths: receivable.expectedDisbursementMonths,
      discountFeeAed: advanceHaircutAed,
      immediateCashAdvanceAed: netCashAdvanceAed,
      advanceRatioPct: Number(advanceRatioPct.toFixed(1)),
      factoringAssessment: advanceRatioPct >= 85
        ? 'Prudent Liquidity: Haircut cost is under 15% to unlock instant broker cash flow.'
        : 'Expensive Liquidity: Long wait (>18 months) incurs significant discounting.'
    };
  }
}

export default new OffPlanCommissionFactoringModeler();
