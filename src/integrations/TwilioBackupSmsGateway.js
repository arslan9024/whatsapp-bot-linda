/**
 * @file TwilioBackupSmsGateway.js
 * @description Provides fallback SMS dispatch payloads via Twilio API when WhatsApp Web
 * connection is temporarily offline, guaranteeing urgent viewing notifications are delivered.
 * Category: Integrations
 */

export class TwilioBackupSmsGateway {
  constructor(config = {}) {
    this.accountSid = config.accountSid || process.env.TWILIO_ACCOUNT_SID || null;
    this.fromNumber = config.fromNumber || process.env.TWILIO_PHONE_NUMBER || '+1234567890';
  }

  /**
   * Formats a fallback SMS payload
   * @param {string} toPhone
   * @param {string} messageText
   * @returns {Object} Twilio REST request body
   */
  createSmsPayload(toPhone, messageText) {
    if (!toPhone || !messageText) {
      throw new Error('toPhone and messageText are required for SMS fallback');
    }

    return {
      From: this.fromNumber,
      To: toPhone.startsWith('+') ? toPhone : `+${toPhone}`,
      Body: messageText.substring(0, 160) // Clean single SMS segment
    };
  }
}

export default new TwilioBackupSmsGateway();
