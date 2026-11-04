/**
 * @file MetaLeadAdsWebhookProcessor.js
 * @description Ingests Meta Graph Webhook events for Facebook and Instagram Lead Ads, resolving leadgen_id into contact profiles and triggering immediate WhatsApp outreach.
 * Category: 2️⃣ Domain / Feature (Omnichannel Dominance)
 */

export class MetaLeadAdsWebhookProcessor {
  /**
   * Processes Meta Lead Gen webhook event.
   * @param {Object} metaEvent
   * @param {string} metaEvent.leadgen_id
   * @param {string} metaEvent.ad_id
   * @param {string} metaEvent.form_id
   * @param {Array<{ name: string, values: Array<string> }>} metaEvent.field_data
   * @returns {Object}
   */
  processMetaLead(metaEvent) {
    let fullName = 'Valued Investor';
    let phone = '';
    let email = '';
    let budget = '2M-5M';

    for (const field of (metaEvent.field_data || [])) {
      const val = field.values && field.values[0] ? field.values[0] : '';
      if (field.name === 'full_name' || field.name === 'name') fullName = val;
      else if (field.name === 'phone_number' || field.name === 'phone') phone = val.replace(/[^0-9+]/g, '');
      else if (field.name === 'email') email = val;
      else if (field.name === 'budget') budget = val;
    }

    return {
      channel: 'META_LEAD_ADS',
      leadgenId: metaEvent.leadgen_id,
      adId: metaEvent.ad_id,
      formId: metaEvent.form_id,
      fullName,
      phone,
      email,
      budget,
      processedAt: new Date().toISOString(),
      whatsAppDispatchQueue: {
        toPhone: phone,
        message: `Hello ${fullName}! Thank you for your interest in our Dubai real estate showcase on Instagram/Facebook. Linda AI is ready to share exclusive off-plan brochures matching your budget (${budget}). Which communities are you most interested in?`
      }
    };
  }
}

export default new MetaLeadAdsWebhookProcessor();
