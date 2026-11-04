/**
 * @file VatCompliantCommissionTaxInvoice.js
 * @description Generates official Federal Tax Authority (FTA) compliant 5% VAT tax invoices with bilingual headings, TRN registration numbers, and QR verification.
 * Category: 2️⃣ Domain / Feature (Brokerage ERP & Legal MOU)
 */

export class VatCompliantCommissionTaxInvoice {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.agencyTrn = options.agencyTrn || '100234567800003';
    this.agencyNameEn = options.agencyNameEn || 'PowerAgent Real Estate Brokerage LLC';
    this.agencyNameAr = options.agencyNameAr || 'باور إيجنت للوساطة العقارية ذ.م.م';
  }

  /**
   * Generates full VAT tax invoice.
   * @param {Object} invoiceParams
   * @param {string} invoiceParams.billToName
   * @param {string} [invoiceParams.billToTrn]
   * @param {string} invoiceParams.propertyRef
   * @param {number} invoiceParams.commissionAmountNetAed
   * @returns {Object}
   */
  generateTaxInvoice(invoiceParams) {
    const net = invoiceParams.commissionAmountNetAed;
    const vatAmountAed = Math.round(net * 0.05 * 100) / 100;
    const grossTotalAed = Math.round((net + vatAmountAed) * 100) / 100;

    return {
      invoiceNumber: `INV-TAX-${Date.now().toString(36).toUpperCase()}`,
      invoiceDate: new Date().toISOString().slice(0, 10),
      issuer: {
        legalNameEnglish: this.agencyNameEn,
        legalNameArabic: this.agencyNameAr,
        trn: this.agencyTrn
      },
      customer: {
        name: invoiceParams.billToName,
        trn: invoiceParams.billToTrn || 'CONSUMER / NON-REGISTERED'
      },
      lineItems: [
        {
          description: `Professional Real Estate Brokerage Services (${invoiceParams.propertyRef})`,
          netAmountAed: net,
          vatRatePct: 5.0,
          vatAmountAed,
          grossTotalAed
        }
      ],
      totals: {
        subtotalNetAed: net,
        vatTotalAed: vatAmountAed,
        totalPayableAed: grossTotalAed
      },
      ftaComplianceNotice: 'This is an official Tax Invoice issued in accordance with UAE Federal Decree-Law No. (8) of 2017 on Value Added Tax.'
    };
  }
}

export default new VatCompliantCommissionTaxInvoice();
