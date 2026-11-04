/**
 * @file DeveloperNocConditionAuditor.js
 * @description Tracks pre-requisites and clearance milestones required to obtain developer No Objection Certificates (NOC) for secondary resale transfers.
 * Category: 2️⃣ Domain / Feature (Brokerage ERP & Legal MOU)
 */

export class DeveloperNocConditionAuditor {
  /**
   * Evaluates readiness for developer NOC application.
   * @param {Object} checklist
   * @param {string} checklist.developerName ('Emaar', 'Damac', 'Nakheel')
   * @param {boolean} checklist.isMollakServiceChargeCleared
   * @param {boolean} checklist.isDewaFinalBillCleared
   * @param {boolean} checklist.isNocFeePaid (typically AED 1,000 - 5,000)
   * @param {boolean} [checklist.hasPendingModifications=false]
   * @returns {Object}
   */
  auditNocReadiness(checklist) {
    const blockers = [];

    if (!checklist.isMollakServiceChargeCleared) {
      blockers.push('Outstanding Mollak building service charges must be settled in full.');
    }
    if (!checklist.isDewaFinalBillCleared) {
      blockers.push('Final DEWA clearance certificate required.');
    }
    if (!checklist.isNocFeePaid) {
      blockers.push('Developer administrative NOC issuance fee pending payment.');
    }
    if (checklist.hasPendingModifications) {
      blockers.push('Unapproved structural alterations detected; developer inspection approval pending.');
    }

    const isReady = blockers.length === 0;

    return {
      developer: checklist.developerName,
      isReadyToApplyForNoc: isReady,
      pendingBlockersCount: blockers.length,
      blockers,
      estimatedNocTurnaroundBusinessDays: isReady ? (checklist.developerName.toLowerCase().includes('emaar') ? 3 : 5) : null,
      status: isReady ? 'APPROVED_TO_SUBMIT_NOC' : 'BLOCKED_BY_OUTSTANDING_CLEARANCES'
    };
  }
}

export default new DeveloperNocConditionAuditor();
