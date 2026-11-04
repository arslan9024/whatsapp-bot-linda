/**
 * @file SourceOfFundsAmlChecker.js
 * @description Audits investor source of funds (SOF) documentation against UAE Central Bank and goAML Anti-Money Laundering standards.
 * Category: 2️⃣ Domain / Feature (Cross-Border Wealth)
 */

export class SourceOfFundsAmlChecker {
  /**
   * Evaluates sufficiency of source of funds documentation.
   * @param {Object} params
   * @param {string} params.sourceCategory ('dividends', 'salary', 'business-sale', 'crypto-liquidation', 'inheritance')
   * @param {Array<string>} params.uploadedDocumentTypes
   * @param {number} params.transferAmountAed
   * @returns {Object}
   */
  evaluateSourceOfFunds({ sourceCategory, uploadedDocumentTypes = [], transferAmountAed }) {
    const category = (sourceCategory || '').toLowerCase();
    const requiredDocs = [];

    if (category.includes('dividend') || category.includes('salary')) {
      requiredDocs.push('bank-statement-6-months', 'tax-return-or-employment-contract');
    } else if (category.includes('business')) {
      requiredDocs.push('share-sale-agreement', 'escrow-receipt', 'company-registration');
    } else if (category.includes('crypto')) {
      requiredDocs.push('exchange-trade-history', 'fiat-bank-receipt', 'wallet-address-proof');
    } else if (category.includes('inheritance')) {
      requiredDocs.push('probate-court-order', 'bank-statement-distribution');
    } else {
      requiredDocs.push('bank-statement-6-months', 'proof-of-wealth-origin');
    }

    const missingDocs = requiredDocs.filter(d => !uploadedDocumentTypes.includes(d));
    const isCompliant = missingDocs.length === 0;

    return {
      sourceCategory,
      transferAmountAed,
      isHighValueTransfer: transferAmountAed >= 5000000,
      requiredDocuments: requiredDocs,
      submittedDocuments: uploadedDocumentTypes,
      missingDocuments: missingDocs,
      isCompliant,
      complianceStatus: isCompliant ? 'APPROVED_FOR_CENTRAL_BANK_CLEARING' : 'ACTION_REQUIRED_MISSING_DOCUMENTATION',
      regulatoryNotice: 'Under UAE Federal Decree-Law No. (20) of 2018 on AML/CFT, UAE banks must obtain clear proof of origin for international wires exceeding AED 55,000.'
    };
  }
}

export default new SourceOfFundsAmlChecker();
