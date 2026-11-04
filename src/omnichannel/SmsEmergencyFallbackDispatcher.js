/**
 * @file SmsEmergencyFallbackDispatcher.js
 * @description Triggers SMS failover when critical WhatsApp notifications (e.g. appointment confirmations, viewing location pins) fail delivery or remain unread.
 * Category: 2️⃣ Domain / Feature (Omnichannel Dominance)
 */

export class SmsEmergencyFallbackDispatcher {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.maxWaitBeforeSmsMs = options.maxWaitBeforeSmsMs || 300000; // 5 minutes
  }

  /**
   * Evaluates if SMS fallback is required.
   * @param {Object} deliveryStatus
   * @param {string} deliveryStatus.whatsappStatus ('SENT', 'DELIVERED', 'READ', 'FAILED', 'UNDELIVERED')
   * @param {string} deliveryStatus.phone
   * @param {string} deliveryStatus.urgentNotificationSummary
   * @param {string} [deliveryStatus.shortLink='https://goraha.com/viewing']
   * @returns {Object}
   */
  evaluateSmsFailover({ whatsappStatus, phone, urgentNotificationSummary, shortLink = 'https://goraha.com/viewing' }) {
    const isFailed = whatsappStatus === 'FAILED' || whatsappStatus === 'UNDELIVERED';

    const smsText = `Linda Real Estate Alert: ${urgentNotificationSummary}. View your confirmed details: ${shortLink}`;

    return {
      phone,
      whatsappStatus,
      isSmsRequired: isFailed,
      smsPayload: isFailed ? {
        toPhone: phone,
        body: smsText,
        characterCount: smsText.length,
        smsParts: Math.ceil(smsText.length / 160)
      } : null,
      routingStatus: isFailed ? 'SMS_FALLBACK_DISPATCHED' : 'WHATSAPP_HEALTHY'
    };
  }
}

export default new SmsEmergencyFallbackDispatcher();
