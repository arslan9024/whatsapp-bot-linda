/**
 * @file SwiftTransferEscrowTracer.js
 * @description Generates cross-border wire instruction sheets with RERA developer escrow account IBANs, intermediary routing instructions, and transfer tracing codes.
 * Category: 2️⃣ Domain / Feature (Cross-Border Wealth)
 */

export class SwiftTransferEscrowTracer {
  /**
   * Generates international wire transfer instruction sheet.
   * @param {Object} params
   * @param {string} params.developerName
   * @param {string} params.projectName
   * @param {string} params.unitNumber
   * @param {string} params.escrowIban
   * @param {string} params.escrowBankSwift
   * @param {number} params.amountAed
   * @returns {Object}
   */
  generateWireInstructions({
    developerName,
    projectName,
    unitNumber,
    escrowIban,
    escrowBankSwift,
    amountAed
  }) {
    const referenceTag = `DP-${projectName.slice(0, 3).toUpperCase()}-${unitNumber.replace(/\s+/g, '')}`;
    const amountUsd = Math.round(amountAed / 3.6725);

    return {
      beneficiaryName: `${developerName} Project Escrow Account`,
      projectName,
      unitNumber,
      escrowIban: escrowIban.replace(/\s+/g, ''),
      swiftBic: escrowBankSwift.toUpperCase().trim(),
      currencyAed: amountAed,
      approximateUsdEquivalent: amountUsd,
      mandatoryPaymentReference: referenceTag,
      intermediaryBankInstructions: 'For USD transfers, route via Citibank N.A. New York or JPMorgan Chase New York to UAE Escrow Bank.',
      complianceWarning: 'The mandatory payment reference MUST be stated verbatim in Field 70 (Remittance Information) to prevent funds being held in UAE Central Bank clearing.'
    };
  }
}

export default new SwiftTransferEscrowTracer();
