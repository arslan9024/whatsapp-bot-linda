/**
 * @file BrokerBlacklistCircumventionGuard.js
 * @description Protects agency proprietary inventory by cross-referencing inquiring broker phone numbers against an internal blacklist of circumvention and deal poaching offenders.
 * Category: 2️⃣ Domain / Feature (Community Intelligence)
 */

export class BrokerBlacklistCircumventionGuard {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.flaggedBrokers = new Map(options.initialBlacklist || []);
  }

  /**
   * Flags a broker in the circumvention registry.
   * @param {string} phone
   * @param {string} reason
   * @param {string} brokerName
   */
  flagBroker(phone, reason, brokerName = 'Unknown') {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    this.flaggedBrokers.set(cleanPhone, {
      phone: cleanPhone,
      brokerName,
      reason,
      flaggedAt: Date.now()
    });
  }

  /**
   * Checks incoming broker inquiry against blacklist.
   * @param {string} phone
   * @returns {Object}
   */
  auditInquiringBroker(phone) {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const flagged = this.flaggedBrokers.get(cleanPhone);

    if (flagged) {
      return {
        phone: cleanPhone,
        isBlacklisted: true,
        reason: flagged.reason,
        securityAction: 'BLOCK_SENSITIVE_DATA_AND_NOTIFY_PRINCIPAL',
        warningAlert: `⚠️ Security Alert: Flagged broker (${flagged.brokerName}) attempted to request inventory. Known history: ${flagged.reason}. Do NOT disclose seller contact info.`
      };
    }

    return {
      phone: cleanPhone,
      isBlacklisted: false,
      securityAction: 'ALLOW_STANDARD_CO_BROKING_FLOW'
    };
  }
}

export default new BrokerBlacklistCircumventionGuard();
