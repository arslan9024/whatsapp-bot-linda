// @ts-nocheck
/**
 * AdminNotificationBridge.js
 * 
 * Single responsibility: Send instant high-priority alerts to the admin whitelist
 * when high-intent prospects (Sellers, Cash Buyers, High Confidence Inquiries) respond.
 * Category: 2️⃣ Domain / Feature (src/whatsapp/bridge/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const DEFAULT_ADMIN_WHITELIST = Object.freeze([
  '+971553633595',
  '+971505760056',
  '+971589969886',
]);

export class AdminNotificationBridge {
  constructor(options = {}) {
    this.deviceLinkedManager = options.deviceLinkedManager || null;
    this.adminWhitelist = options.adminWhitelist || this._resolveAdminNumbers();
    this.logBot = options.logBot || console.log;
    this.alertLog = [];
  }

  _resolveAdminNumbers() {
    const raw = process.env.BOT_ADMIN_NUMBERS;
    if (raw) {
      return raw.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [...DEFAULT_ADMIN_WHITELIST];
  }

  /**
   * Format a high-priority alert message for WhatsApp dispatch
   * @param {Object} alertData
   * @returns {string}
   */
  formatAlertMessage({ phone, name, unit, cluster, category, intentText, project, confidence }) {
    const timeStr = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Dubai', hour12: false });
    return [
      `🚨 *HIGH-INTENT LEAD ALERT [LINDA AI]* 🚨`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `👤 *Role:* ${category || 'SELLER / BUYER'}`,
      `📞 *Contact:* ${phone}`,
      name ? `🏷️ *Name:* ${name}` : null,
      unit ? `🔑 *Unit:* ${unit}` : null,
      cluster ? `🏡 *Cluster:* ${cluster}` : null,
      `📍 *Project:* ${project || 'VARDON (Damac Hills 2)'}`,
      `🎯 *Confidence:* ${Math.round((confidence || 0.8) * 100)}%`,
      `⏰ *Time (GST):* ${timeStr}`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `💬 *Inbound Inquiry:*`,
      `"${intentText || 'No text content'}"`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `⚡ *Action Required:* Review in CRM or reply immediately on WhatsApp!`,
    ].filter(Boolean).join('\n');
  }

  /**
   * Send notification to all whitelisted admins
   * @param {Object} alertData
   * @returns {Promise<{ sent: number, failed: number, recipients: string[] }>}
   */
  async notifyAdmins(alertData) {
    const alertMsg = this.formatAlertMessage(alertData);
    let sent = 0;
    let failed = 0;
    const recipients = [];

    for (const adminPhone of this.adminWhitelist) {
      try {
        if (this.deviceLinkedManager?.sendWhatsAppMessage) {
          await this.deviceLinkedManager.sendWhatsAppMessage(adminPhone, alertMsg);
          sent++;
          recipients.push(adminPhone);
        } else {
          // Fallback log if no live client linked
          this.logBot(`[ADMIN ALERT -> ${adminPhone}]\n${alertMsg}`);
          sent++;
          recipients.push(adminPhone);
        }
      } catch (err) {
        this.logBot(`❌ Failed to send alert to admin ${adminPhone}: ${err.message}`);
        failed++;
      }
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      leadPhone: alertData.phone,
      category: alertData.category,
      sentCount: sent,
      failedCount: failed,
    };
    this.alertLog.push(logEntry);

    return { sent, failed, recipients, message: alertMsg };
  }
}

export default new AdminNotificationBridge();
