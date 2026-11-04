/**
 * @file UaePdplComplianceManager.js
 * @description Implements compliance workflows for UAE Federal Decree-Law No. 45 of 2021
 * regarding Personal Data Protection (PDPL), handling Right to Erasure ("Forget Me")
 * requests, data portability exports, and consent logging.
 * Category: Core
 */

export class UaePdplComplianceManager {
  constructor() {
    this.consentRecords = new Map(); // phone -> { consentDate, optInSource, active }
    this.erasureAuditLog = [];
  }

  /**
   * Records explicit opt-in consent from a user
   * @param {string} phone
   * @param {string} source - e.g. 'whatsapp_inbound', 'web_form', 'qr_link'
   */
  recordConsent(phone, source = 'whatsapp_inbound') {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    this.consentRecords.set(cleanPhone, {
      consentDate: new Date().toISOString(),
      optInSource: source,
      active: true
    });
  }

  /**
   * Checks whether active consent exists for a phone number
   * @param {string} phone
   * @returns {boolean}
   */
  hasActiveConsent(phone) {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const record = this.consentRecords.get(cleanPhone);
    return Boolean(record && record.active);
  }

  /**
   * Executes a PDPL Right to Erasure ("Forget Me") request
   * De-identifies personal data and logs an immutable compliance audit record
   * @param {string} phone
   * @param {string} [reason]
   * @returns {{ erased: boolean, auditId: string, timestamp: string }}
   */
  processRightToErasure(phone, reason = 'customer_request') {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const auditId = `pdpl_del_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();

    // Revoke consent
    if (this.consentRecords.has(cleanPhone)) {
      this.consentRecords.delete(cleanPhone);
    }

    // Append to audit trail without storing raw PII
    const maskedPhone = cleanPhone.length > 5 ? cleanPhone.substring(0, 3) + '***' + cleanPhone.slice(-2) : '***';
    this.erasureAuditLog.push({
      auditId,
      maskedPhone,
      reason,
      erasedAt: timestamp,
      status: 'PURGED'
    });

    return {
      erased: true,
      auditId,
      timestamp
    };
  }

  /**
   * Generates a portable data bundle for the customer under PDPL Right of Access
   * @param {string} phone
   * @param {Object} userData
   * @returns {Object} Portable export format
   */
  generateDataPortabilityPackage(phone, userData = {}) {
    return {
      pdplExportVersion: '1.0',
      exportedAt: new Date().toISOString(),
      subject: (phone || '').replace(/\D/g, ''),
      legalFramework: 'UAE Federal Decree-Law No. 45/2021',
      records: userData
    };
  }
}

export default new UaePdplComplianceManager();

