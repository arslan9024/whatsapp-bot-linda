/**
 * @file CallRecordingConsentAuditor.js
 * @description Audits and enforces mandatory call recording consent under UAE Federal
 * Decree-Law No. 3 of 2003 (Telecom Law) and UAE Penal Code Article 378 before recording.
 * Category: Core
 */

export class CallRecordingConsentAuditor {
  constructor() {
    this.consentStore = new Map(); // phone -> { consented, timestamp, method }
  }

  /**
   * Records explicit consent granted by client
   * @param {string} phone
   * @param {'verbal_announcement'|'whatsapp_optin'|'written_contract'} method
   */
  registerConsent(phone, method = 'verbal_announcement') {
    const clean = phone.replace(/\D/g, '');
    this.consentStore.set(clean, {
      consented: true,
      timestamp: new Date().toISOString(),
      method
    });
  }

  /**
   * Verifies if recording is legally permitted for a participant
   * @param {string} phone
   * @returns {boolean}
   */
  isRecordingPermitted(phone) {
    const clean = phone.replace(/\D/g, '');
    const entry = this.consentStore.get(clean);
    return Boolean(entry && entry.consented);
  }

  /**
   * Generates bilingual pre-call consent announcement copy
   * @returns {string} Standard bilingual consent announcement
   */
  getConsentAnnouncement() {
    return 'This call may be recorded for quality assurance and regulatory compliance under UAE standards. هذه المكالمة قد تكون مسجلة لأغراض الجودة والامتثال.';
  }
}

export default new CallRecordingConsentAuditor();
