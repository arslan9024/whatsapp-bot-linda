/**
 * @file WebsiteLiveChatWidgetBridge.js
 * @description Generates web widget handoff tokens and QR codes bridging visitors from goraha.com directly into continuous Linda WhatsApp sessions.
 * Category: 2️⃣ Domain / Feature (Omnichannel Dominance)
 */

export class WebsiteLiveChatWidgetBridge {
  /**
   * Generates web-to-WhatsApp handoff payload.
   * @param {Object} session
   * @param {string} session.visitorIp
   * @param {string} session.activePageUrl
   * @param {string} [session.viewedPropertySlug]
   * @param {string} [session.botNumber='971501234567']
   * @returns {Object}
   */
  generateWebHandoff(session) {
    const handoffToken = `WEB-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    const botNum = (session.botNumber || '971501234567').replace(/[^0-9]/g, '');

    const propNote = session.viewedPropertySlug ? ` regarding ${session.viewedPropertySlug}` : '';
    const prefilledText = encodeURIComponent(`Hi Linda! I was just browsing goraha.com${propNote} (Session: ${handoffToken}). Please send me full details.`);
    const waUrl = `https://wa.me/${botNum}?text=${prefilledText}`;

    return {
      handoffToken,
      visitorIp: session.visitorIp,
      pageUrl: session.activePageUrl,
      propertySlug: session.viewedPropertySlug || 'GENERAL_HOMEPAGE',
      whatsAppUrl: waUrl,
      qrPayload: waUrl,
      intentDirective: 'Link web analytics session with inbound WhatsApp phone identity upon first message receipt.'
    };
  }
}

export default new WebsiteLiveChatWidgetBridge();
