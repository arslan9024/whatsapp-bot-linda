/**
 * @file MetaLeadAdsWebhookReceiver.js
 * @description Ingestion receiver and verification handler for Meta (Facebook & Instagram)
 * Lead Ads webhooks, extracting field data for immediate automated WhatsApp engagement.
 * Category: Integrations
 */

export class MetaLeadAdsWebhookReceiver {
  constructor(config = {}) {
    this.verifyToken = config.verifyToken || process.env.META_VERIFY_TOKEN || 'linda_meta_secret_token';
  }

  /**
   * Verifies incoming webhook handshake from Meta Graph API
   * @param {Object} query - Express req.query
   * @returns {{ verified: boolean, challenge: string|null }}
   */
  verifyWebhook(query = {}) {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === this.verifyToken) {
      return { verified: true, challenge: challenge || null };
    }
    return { verified: false, challenge: null };
  }

  /**
   * Parses raw field data entries from Meta Graph API leadgen payload
   * @param {Array<{name: string, values: Array<string>}>} fieldData
   * @returns {Object} Flattened lead attributes
   */
  parseFieldData(fieldData = []) {
    const extracted = {
      fullName: '',
      phoneNumber: '',
      email: '',
      preferredCommunity: '',
      budgetRange: '',
      timeline: ''
    };

    if (!Array.isArray(fieldData)) return extracted;

    for (const field of fieldData) {
      const name = (field.name || '').toLowerCase();
      const val = Array.isArray(field.values) && field.values.length > 0 ? field.values[0] : '';

      if (name.includes('name')) extracted.fullName = val;
      else if (name.includes('phone')) extracted.phoneNumber = val;
      else if (name.includes('email')) extracted.email = val;
      else if (name.includes('community') || name.includes('location')) extracted.preferredCommunity = val;
      else if (name.includes('budget') || name.includes('price')) extracted.budgetRange = val;
      else if (name.includes('timeline') || name.includes('when')) extracted.timeline = val;
    }

    return extracted;
  }

  /**
   * Normalizes incoming Meta webhook event payload
   * @param {Object} eventBody
   * @returns {Array<Object>} List of leads parsed from event
   */
  processWebhookEvent(eventBody = {}) {
    const entries = eventBody.entry || [];
    const results = [];

    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field === 'leadgen') {
          const val = change.value || {};
          results.push({
            leadgenId: val.leadgen_id,
            formId: val.form_id,
            pageId: val.page_id,
            adId: val.ad_id,
            createdTime: val.created_time ? new Date(val.created_time * 1000).toISOString() : new Date().toISOString()
          });
        }
      }
    }

    return results;
  }
}

export default new MetaLeadAdsWebhookReceiver();
