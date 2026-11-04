/**
 * @file TelegramSupervisorDispatcher.js
 * @description Formats and dispatches critical supervisor notifications (VIP leads,
 * account desync, rate-limit thresholds) directly to management Telegram channels.
 * Category: Integrations
 */

export class TelegramSupervisorDispatcher {
  constructor(config = {}) {
    this.botToken = config.botToken || process.env.TELEGRAM_BOT_TOKEN || null;
    this.chatId = config.chatId || process.env.TELEGRAM_SUPERVISOR_CHAT_ID || null;
  }

  /**
   * Formats a MarkdownV2/HTML alert for Telegram
   * @param {Object} alert
   * @param {string} alert.title
   * @param {string} alert.severity - 'INFO' | 'WARNING' | 'CRITICAL'
   * @param {string} alert.description
   * @param {Object} [alert.metadata]
   * @returns {Object} Telegram send payload
   */
  formatTelegramPayload(alert) {
    const icon = alert.severity === 'CRITICAL' ? '🚨' : alert.severity === 'WARNING' ? '⚠️' : '📢';

    const text = [
      `${icon} <b>${alert.title}</b>`,
      `━━━━━━━━━━━━━━━━━━`,
      alert.description,
      ``,
      `⏰ <i>${new Date().toISOString()}</i>`
    ].join('\n');

    return {
      chat_id: this.chatId || '@linda_supervisors',
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    };
  }
}

export default new TelegramSupervisorDispatcher();

