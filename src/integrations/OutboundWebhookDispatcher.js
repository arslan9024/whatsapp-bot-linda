/**
 * OutboundWebhookDispatcher.js
 * 
 * Single responsibility: Format standardized JSON webhook events for Zapier, Make.com, and custom API consumers.
 * Category: 2️⃣ Domain / Feature (src/integrations/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class OutboundWebhookDispatcher {
  formatWebhookEvent(eventType, payload = {}) {
    if (!eventType) throw new Error('eventType is required');
    return {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventType, // e.g. 'LEAD_QUALIFIED', 'VIEWING_REQUESTED', 'UNSUBSCRIBE_RECORDED'
      timestamp: new Date().toISOString(),
      source: 'WHATSAPP_BOT_LINDA',
      version: '1.0',
      data: payload,
    };
  }
}

export default new OutboundWebhookDispatcher();

