/**
 * @file DualAgencyConflictDiscloser.js
 * @description Audits transaction representation rosters to detect dual-agency conflicts of interest, generating statutory bilingual RERA consent disclosure waivers.
 * Category: 2️⃣ Domain / Feature (Brokerage ERP & Legal MOU)
 */

export class DualAgencyConflictDiscloser {
  /**
   * Evaluates if dual agency representation is present.
   * @param {Object} deal
   * @param {string} deal.sellerBrokerAgencyOrn
   * @param {string} deal.buyerBrokerAgencyOrn
   * @param {string} deal.agencyOrn ('ORN-12345')
   * @param {string} deal.propertyRef
   * @returns {Object}
   */
  evaluateDualAgency(deal) {
    const isDualAgency = deal.sellerBrokerAgencyOrn === deal.agencyOrn &&
      deal.buyerBrokerAgencyOrn === deal.agencyOrn;

    return {
      propertyRef: deal.propertyRef,
      isDualAgency,
      agencyOrn: deal.agencyOrn,
      statutoryAction: isDualAgency ? 'MANDATORY_DUAL_AGENCY_DISCLOSURE_WAIVER' : 'STANDARD_SINGLE_REPRESENTATION',
      disclosureText: isDualAgency
        ? `Statutory Disclosure: Both Buyer and Seller are represented by the same brokerage firm (${deal.agencyOrn}). In accordance with RERA ethical rules, the agency acts as an impartial dual intermediary and will maintain strict confidentiality of confidential price floors and reservation ceilings for both parties.`
        : 'Single agency confirmed. No conflict of interest detected.',
      requiresSignedConsentFromBothParties: isDualAgency
    };
  }
}

export default new DualAgencyConflictDiscloser();
