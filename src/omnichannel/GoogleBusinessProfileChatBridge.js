/**
 * @file GoogleBusinessProfileChatBridge.js
 * @description Bridges Google Business Profile (GBP / Google Maps Business Messages) inquiries into Linda's CRM routing pipeline.
 * Category: 2️⃣ Domain / Feature (Omnichannel Dominance)
 */

export class GoogleBusinessProfileChatBridge {
  /**
   * Processes incoming Google Business Messages webhook.
   * @param {Object} gbpEvent
   * @param {string} gbpEvent.conversationId
   * @param {string} gbpEvent.userName
   * @param {string} gbpEvent.text
   * @returns {Object}
   */
  processGoogleMessage(gbpEvent) {
    const textLower = (gbpEvent.text || '').toLowerCase();
    const isLocationInquiry = textLower.includes('location') || textLower.includes('office') || textLower.includes('address') || textLower.includes('where');

    return {
      channel: 'GOOGLE_BUSINESS_MESSAGES',
      googleConversationId: gbpEvent.conversationId,
      senderName: gbpEvent.userName,
      inquirySnippet: gbpEvent.text,
      isLocationInquiry,
      suggestedGbpReply: isLocationInquiry
        ? 'Our main brokerage headquarters is located in Downtown Dubai (Emaar Square, Building 4). For instant WhatsApp consultation and unit floor plans, please reach out directly: +971 50 123 4567.'
        : `Hi ${gbpEvent.userName || 'there'}, thanks for finding us on Google Maps! Linda AI is here to assist with verified Dubai real estate options. How can we help today?`
    };
  }
}

export default new GoogleBusinessProfileChatBridge();
