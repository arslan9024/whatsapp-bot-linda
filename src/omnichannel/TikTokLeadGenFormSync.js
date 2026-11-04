/**
 * @file TikTokLeadGenFormSync.js
 * @description Ingests real-time lead webhook submissions from TikTok Ads Manager campaigns, normalizing creative IDs and queuing high-speed WhatsApp follow-up.
 * Category: 2️⃣ Domain / Feature (Omnichannel Dominance)
 */

export class TikTokLeadGenFormSync {
  /**
   * Ingests TikTok Instant Form webhook payload.
   * @param {Object} ttLead
   * @param {string} ttLead.lead_id
   * @param {string} ttLead.campaign_name
   * @param {string} ttLead.ad_name
   * @param {string} ttLead.full_name
   * @param {string} ttLead.phone_number
   * @returns {Object}
   */
  processTikTokLead(ttLead) {
    const rawPhone = (ttLead.phone_number || '').replace(/[^0-9+]/g, '');

    return {
      channel: 'TIKTOK_LEAD_ADS',
      leadId: ttLead.lead_id,
      campaignName: ttLead.campaign_name,
      adName: ttLead.ad_name,
      fullName: ttLead.full_name,
      phoneNumber: rawPhone,
      speedToLeadTargetSeconds: 60,
      assignedWelcomeSequence: 'TIKTOK_OFF_PLAN_VIRAL_ENGAGE',
      whatsAppDispatchPayload: {
        toPhone: rawPhone,
        text: `Hey ${ttLead.full_name}! 👋 Thanks for checking out our video on TikTok about *${ttLead.ad_name || 'Dubai Real Estate'}*. Linda here! Would you like the official PDF brochure and 1% payment plan breakdown?`
      }
    };
  }
}

export default new TikTokLeadGenFormSync();
