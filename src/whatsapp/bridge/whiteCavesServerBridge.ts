// @ts-nocheck
/**
 * Linda Relay Bridge & CRM Lead Syncer
 * 
 * Forwards incoming WhatsApp messages and classified leads from whatsapp-bot-linda
 * to White-Caves-Server webhook router for AI processing, CRM lead triage, and client tracking.
 */

const MAIN_SERVER_URL = process.env.MAIN_SERVER_URL || 'http://localhost:5000';
const DEFAULT_WEBHOOK_PATH = '/api/v1/webhooks/linda';

/**
 * Standard message forwarder
 * @param {Object} incomingMessage
 * @returns {Promise<any>}
 */
export async function forwardMessageToWhiteCavesServer(incomingMessage) {
  try {
    const payload = {
      from: incomingMessage.from || incomingMessage.sender,
      body: incomingMessage.body || incomingMessage.text || '',
      hasMedia: Boolean(incomingMessage.hasMedia),
      mediaType: incomingMessage.type || 'text',
      timestamp: incomingMessage.timestamp || new Date().toISOString(),
      sourceBotId: 'linda-worker-primary'
    };

    const targetUrl = process.env.WHITE_CAVES_WEBHOOK_URL || `${MAIN_SERVER_URL}${DEFAULT_WEBHOOK_PATH}`;
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Relay-Secret': process.env.WHATSAPP_WEBHOOK_SECRET || 'white-caves-dev-webhook-secret'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.warn(`[LindaRelay] Server responded with status: ${res.status}`);
      return false;
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('[LindaRelay] Failed to forward message to White-Caves-Server:', err.message);
    return false;
  }
}

/**
 * Sync classified lead directly to White Caves CRM
 * @param {Object} leadData
 * @param {string} leadData.phone - Contact phone number
 * @param {string} leadData.category - Classified category (Seller, Buyer, Tenant, Landlord, Broker)
 * @param {string} [leadData.name] - Contact name if available
 * @param {string} [leadData.project] - Project / Cluster (e.g., 'VARDON', 'DAMAC Hills 2')
 * @param {string} [leadData.intentText] - Original message / inquiry text
 * @param {number} [leadData.confidence] - Classification confidence (0 to 1)
 * @param {string} [leadData.source] - Lead source (e.g. 'whatsapp_linda_outreach')
 * @returns {Promise<{ success: boolean, leadId?: string, error?: string }>}
 */
export async function syncLeadToCrm(leadData) {
  try {
    const payload = {
      phone: leadData.phone,
      name: leadData.name || 'WhatsApp Prospect',
      role: leadData.category || 'Lead',
      category: leadData.category || 'GENERAL',
      project: leadData.project || 'VARDON',
      inquiry: leadData.intentText || '',
      confidence: leadData.confidence || 0.8,
      source: leadData.source || 'whatsapp_linda_outreach',
      timestamp: new Date().toISOString(),
      metadata: {
        botId: 'whatsapp-bot-linda',
        cluster: 'Damac Hills 2 - Vardon',
        tags: [leadData.category, leadData.project || 'VARDON', 'AEGIS_AUTO_SYNC'].filter(Boolean),
      }
    };

    const crmUrl = process.env.WHITE_CAVES_CRM_LEADS_URL || `${MAIN_SERVER_URL}${DEFAULT_WEBHOOK_PATH}/lead`;
    const res = await fetch(crmUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Relay-Secret': process.env.WHATSAPP_WEBHOOK_SECRET || 'white-caves-dev-webhook-secret'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { success: true, leadId: data?.leadId || data?.id || 'lead_recorded' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export default {
  forwardMessageToWhiteCavesServer,
  syncLeadToCrm
};
