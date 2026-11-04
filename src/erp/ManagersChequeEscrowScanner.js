/**
 * @file ManagersChequeEscrowScanner.js
 * @description Audits scanned bank manager's cheques, verifying beneficiary payee exact match against developer escrow or DLD title deed owner to prevent escrow diversion fraud.
 * Category: 2️⃣ Domain / Feature (Brokerage ERP & Legal MOU)
 */

export class ManagersChequeEscrowScanner {
  /**
   * Audits manager's cheque specifications.
   * @param {Object} chequeData
   * @param {string} chequeData.issuingBank
   * @param {string} chequeData.payeeName
   * @param {number} chequeData.amountAed
   * @param {string} chequeData.targetBeneficiaryLegalName
   * @returns {Object}
   */
  auditManagersCheque(chequeData) {
    const cleanPayee = (chequeData.payeeName || '').trim().toLowerCase();
    const cleanBeneficiary = (chequeData.targetBeneficiaryLegalName || '').trim().toLowerCase();

    const isExactNameMatch = cleanPayee === cleanBeneficiary;
    const isApprovedBank = ['emirates nbd', 'first abu dhabi bank', 'adcb', 'mashreq', 'dubai islamic bank'].some(b => (chequeData.issuingBank || '').toLowerCase().includes(b));

    const isVerifiedForTrusteeTransfer = isExactNameMatch && isApprovedBank && chequeData.amountAed > 0;

    return {
      issuingBank: chequeData.issuingBank,
      payeeName: chequeData.payeeName,
      amountAed: chequeData.amountAed,
      isExactNameMatch,
      isApprovedUaeBank: isApprovedBank,
      isVerifiedForTrusteeTransfer,
      status: isVerifiedForTrusteeTransfer ? 'PASSED_FOR_DLD_TRUSTEE' : 'DISCREPANCY_REJECTED',
      fraudRiskAdvisory: !isExactNameMatch
        ? `Security Alert: Payee name on cheque ("${chequeData.payeeName}") does not match legal beneficiary ("${chequeData.targetBeneficiaryLegalName}"). DLD Trustees will reject this cheque.`
        : 'Cheque beneficiary matches title deed / escrow account perfectly.'
    };
  }
}

export default new ManagersChequeEscrowScanner();
