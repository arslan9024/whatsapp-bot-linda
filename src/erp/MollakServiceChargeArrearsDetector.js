/**
 * @file MollakServiceChargeArrearsDetector.js
 * @description Inspects DLD Mollak building management system accounts to detect unpaid service charges or sinking fund deficits prior to property conveyance.
 * Category: 2️⃣ Domain / Feature (Brokerage ERP & Legal MOU)
 */

export class MollakServiceChargeArrearsDetector {
  /**
   * Evaluates Mollak service charge standing.
   * @param {Object} mollakRecord
   * @param {string} mollakRecord.propertyId
   * @param {number} mollakRecord.outstandingArrearsAed
   * @param {number} mollakRecord.currentQuarterFeeAed
   * @param {string} mollakRecord.oaManagementCompany (Owners Association firm)
   * @returns {Object}
   */
  evaluateMollakStanding(mollakRecord) {
    const hasArrears = mollakRecord.outstandingArrearsAed > 0;

    return {
      propertyId: mollakRecord.propertyId,
      oaManagementCompany: mollakRecord.oaManagementCompany,
      outstandingArrearsAed: mollakRecord.outstandingArrearsAed,
      currentQuarterFeeAed: mollakRecord.currentQuarterFeeAed,
      isCleanForTransfer: !hasArrears,
      status: hasArrears ? 'OUTSTANDING_ARREARS_BLOCKED' : 'CLEARED_FOR_DLD_TRANSFER',
      advisoryNotice: hasArrears
        ? `Transfer Blocked: Developer and DLD require full settlement of AED ${mollakRecord.outstandingArrearsAed.toLocaleString()} in service charges to issue NOC.`
        : 'Mollak account in good standing. Zero arrears detected.'
    };
  }
}

export default new MollakServiceChargeArrearsDetector();
