/**
 * @file ZapierMakeWebhookGateway.js
 * @description Standardizes event payloads for Zapier and Make.com webhooks, enabling
 * integration with over 5,000 SaaS apps upon core CRM lifecycle events.
 * Category: Integrations
 */

export class ZapierMakeWebhookGateway {
  /**
   * Packages a real estate event into standard Zapier/Make REST format
   * @param {string} eventType - e.g. 'lead.qualified', 'viewing.booked', 'deposit.confirmed'
   * @param {Object} data
   * @returns {Object} Standard webhook payload
   */
  createWebhookPayload(eventType, data = {}) {
    return {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      event: eventType,
      timestamp: new Date().toISOString(),
      apiVersion: '1.0',
      source: 'whatsapp-bot-linda',
      data
    };
  }
}

export default new ZapierMakeWebhookGateway();

