/**
 * ====================================================================
 * SUPERVISOR NOTIFICATION & ALERT DISPATCHER (Telegram & Webhook Bot)
 * ====================================================================
 * Dispatches critical real-time alerts to the real estate management team:
 *   1. HOT Lead Alert (instant viewing or high-intent owner message).
 *   2. Supervisor 24h SLA Breach Alert (agent failed to follow up).
 *   3. WhatsApp Account Offline / Auth Required Alert.
 *   4. Memory Recycling & Health Degradation Alerts.
 *
 * Supports Telegram Bot API webhook, custom Discord/Slack webhooks, and
 * fallback structured audit logging when credentials are not yet configured.
 *
 * @since Development Phase — November 2026
 */

import { Logger } from '../core/Logger.js';
import { maskPhone } from '../outreach/OwnerPhoneNormalizer.js';

const logger = new Logger('SupervisorAlertDispatcher');

export class SupervisorAlertDispatcher {
  constructor(options = {}) {
    this.telegramBotToken = options.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || null;
    this.telegramChatId = options.telegramChatId || process.env.TELEGRAM_CHAT_ID || null;
    this.webhookUrl = options.webhookUrl || process.env.SUPERVISOR_WEBHOOK_URL || null;
    this.fetchImpl = options.fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
    this.enabled = Boolean(this.telegramBotToken && this.telegramChatId) || Boolean(this.webhookUrl);
  }

  /**
   * Send notification via Telegram Bot API or Webhook.
   *
   * @param {string} text
   * @param {object} [metadata]
   * @returns {Promise<{ sent: boolean, provider: string, error?: string }>}
   */
  async sendAlert(text, metadata = {}) {
    logger.info(`🚨 [Supervisor Alert]: ${text}`);

    if (!this.enabled && !this.fetchImpl) {
      return { sent: false, provider: 'none', reason: 'unconfigured' };
    }

    try {
      // 1. Dispatch via Telegram if configured
      if (this.telegramBotToken && this.telegramChatId && this.fetchImpl) {
        const url = `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`;
        const res = await this.fetchImpl(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.telegramChatId,
            text,
            parse_mode: 'HTML',
          }),
        });

        if (res && res.ok) {
          return { sent: true, provider: 'telegram' };
        }
      }

      // 2. Dispatch via Generic Webhook (Slack / Discord / Custom CRM)
      if (this.webhookUrl && this.fetchImpl) {
        const res = await this.fetchImpl(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            ...metadata,
            timestamp: new Date().toISOString(),
          }),
        });

        if (res && res.ok) {
          return { sent: true, provider: 'webhook' };
        }
      }

      return { sent: false, provider: 'fallback', reason: 'delivery_unconfirmed' };
    } catch (err) {
      logger.warn(`Failed to dispatch alert to supervisor: ${err.message}`);
      return { sent: false, provider: 'error', error: err.message };
    }
  }

  /**
   * Alert supervisor regarding a HOT or INVESTOR lead.
   */
  async notifyHotLead({ ownerName = 'Property Owner', phone, tier, text, assignedAgent }) {
    const masked = maskPhone(phone);
    const alertMsg = [
      `🔥 <b>HOT LEAD DETECTED [${tier}]</b>`,
      `👤 <b>Owner:</b> ${ownerName} (${masked})`,
      assignedAgent ? `🎯 <b>Assigned To:</b> ${assignedAgent}` : null,
      `💬 <b>Inbound:</b> "${text.slice(0, 120)}"`,
      `⚡ <i>Action required: Immediate contact recommended.</i>`
    ].filter(Boolean).join('\n');

    return this.sendAlert(alertMsg, { event: 'HOT_LEAD', phone, tier });
  }

  /**
   * Alert supervisor when 24h follow-up SLA is breached.
   */
  async notifySlaBreach({ ownerName, clientPhone, assignedAgentPhone, elapsedHours }) {
    const maskedClient = maskPhone(clientPhone);
    const maskedAgent = maskPhone(assignedAgentPhone);
    const alertMsg = [
      `⚠️ <b>SUPERVISOR SLA BREACHED (${elapsedHours}h)</b>`,
      `👤 <b>Client:</b> ${ownerName || 'Lead'} (${maskedClient})`,
      `👨‍💼 <b>Agent:</b> ${maskedAgent}`,
      `🚨 Lead has had no recorded follow-up within 24 hours. Reassignment suggested.`
    ].join('\n');

    return this.sendAlert(alertMsg, { event: 'SLA_BREACH', clientPhone, assignedAgentPhone });
  }

  /**
   * Alert supervisor when an account is disconnected or needs authentication.
   */
  async notifyAccountState(phone, state, reason = '') {
    const masked = maskPhone(phone);
    const alertMsg = [
      `📱 <b>ACCOUNT STATUS CHANGE</b>`,
      `Account: ${masked}`,
      `State: <b>${state}</b>`,
      reason ? `Reason: ${reason}` : null,
    ].filter(Boolean).join('\n');

    return this.sendAlert(alertMsg, { event: 'ACCOUNT_STATE', phone, state });
  }
}

export const supervisorAlertDispatcher = new SupervisorAlertDispatcher();
export default supervisorAlertDispatcher;

