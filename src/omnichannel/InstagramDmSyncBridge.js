/**
 * @file InstagramDmSyncBridge.js
 * @description Bridges Instagram Direct Messages (via Meta Graph API webhook) into Linda's conversational pipeline, syncing chat state across Instagram and WhatsApp.
 * Category: 2️⃣ Domain / Feature (Omnichannel Dominance)
 */

export class InstagramDmSyncBridge {
  /**
   * Ingests Instagram DM webhook event.
   * @param {Object} igEvent
   * @param {string} igEvent.senderId
   * @param {string} igEvent.recipientId
   * @param {string} igEvent.text
   * @param {number} igEvent.timestamp
   * @returns {Object}
   */
  processInstagramWebhook(igEvent) {
    const cleanText = (igEvent.text || '').trim();
    const isPropertyInquiry = /price|available|location|villa|apartment|floor\s*plan|rent|buy/i.test(cleanText);

    return {
      channel: 'INSTAGRAM_DM',
      instagramSenderId: igEvent.senderId,
      messageText: cleanText,
      timestamp: igEvent.timestamp || Date.now(),
      isPropertyInquiry,
      conversationKey: `IG_${igEvent.senderId}`,
      crossChannelRoutingAdvice: 'Prompt client for WhatsApp number after 2nd turn to unlock interactive PDF floor plan delivery.',
      autoReplyDraft: isPropertyInquiry
        ? 'Hi there! Thanks for reaching out on Instagram. Linda AI can send you the complete verified brochure directly on WhatsApp. What is your WhatsApp number?'
        : 'Hello! How can Linda AI assist with your Dubai property inquiry today?'
    };
  }
}

export default new InstagramDmSyncBridge();
