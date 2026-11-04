/**
 * @file TelegramVipChannelBroadcastBot.js
 * @description Formats and broadcasts verified property deals to private Telegram investor channels, embedding wa.me deep links with pre-filled lead tracking parameters.
 * Category: 2️⃣ Domain / Feature (Omnichannel Dominance)
 */

export class TelegramVipChannelBroadcastBot {
  /**
   * Formats Telegram broadcast post with pre-filled WhatsApp link.
   * @param {Object} deal
   * @param {string} deal.projectName
   * @param {string} deal.community
   * @param {number} deal.startingPriceAed
   * @param {string} deal.paymentPlanSummary ('60/40 Post-Handover')
   * @param {string} [deal.botWhatsAppNumber='971501234567']
   * @returns {Object}
   */
  formatTelegramPost(deal) {
    const waNumber = (deal.botWhatsAppNumber || '971501234567').replace(/[^0-9]/g, '');
    const encodedMsg = encodeURIComponent(`Hi Linda, I saw the VIP Telegram deal for ${deal.projectName} in ${deal.community}. Please send me the brochure.`);
    const waDeepLink = `https://wa.me/${waNumber}?text=${encodedMsg}`;

    const tgMessage = [
      `🔥 *NEW INVESTOR EXCLUSIVE: ${deal.projectName.toUpperCase()}*`,
      `📍 *Location:* ${deal.community}`,
      `💰 *Starting Price:* AED ${deal.startingPriceAed.toLocaleString()}`,
      `📈 *Payment Plan:* ${deal.paymentPlanSummary}`,
      `─────────────────────────`,
      `⚡ *Direct Developer Allocation*`,
      `👉 [Tap Here to Chat with Linda AI on WhatsApp](${waDeepLink})`
    ].join('\n');

    return {
      channel: 'TELEGRAM_VIP',
      telegramMarkdownText: tgMessage,
      waDeepLink,
      dealRef: `TG-DEAL-${deal.projectName.slice(0, 4).toUpperCase()}`
    };
  }
}

export default new TelegramVipChannelBroadcastBot();
