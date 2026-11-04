/**
 * @file CrmBidirectionalWebhookRelay.js
 * @description Translates Linda WhatsApp events into normalized CRM payloads for external CRM platforms (HubSpot, Salesforce, Zoho).
 * Category: 2️⃣ Domain / Feature (Omnichannel Dominance)
 */

export class CrmBidirectionalWebhookRelay {
  /**
   * Transforms WhatsApp interaction into CRM contact update payload.
   * @param {Object} interaction
   * @param {string} interaction.clientPhone
   * @param {string} interaction.clientName
   * @param {string} interaction.currentStage ('DISCOVERY', 'VIEWING_SCHEDULED', 'OFFER_MADE', 'WON_CLOSED')
   * @param {string} interaction.latestSummary
   * @param {string} [interaction.targetCrm='HUBSPOT']
   * @returns {Object}
   */
  buildCrmSyncPayload(interaction) {
    const crm = (interaction.targetCrm || 'HUBSPOT').toUpperCase();

    return {
      targetCrm: crm,
      contactIdentifier: interaction.clientPhone,
      properties: {
        firstname: (interaction.clientName || '').split(' ')[0] || 'Client',
        lastname: (interaction.clientName || '').split(' ').slice(1).join(' ') || '',
        phone: interaction.clientPhone,
        dealstage: interaction.currentStage,
        linda_ai_notes: interaction.latestSummary,
        last_contacted_timestamp: new Date().toISOString()
      },
      syncEndpoint: `/api/v1/crm/${crm.toLowerCase()}/contacts/upsert`,
      httpMethod: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Linda-Relay-Version': '2.0'
      }
    };
  }
}

export default new CrmBidirectionalWebhookRelay();
