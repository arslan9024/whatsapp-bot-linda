/**
 * @file TelegramToWhatsAppSignalCrossPoster.js
 * @description Ingests Markdown/HTML alerts from private real estate Telegram channels, normalizes styling, and reformats for native WhatsApp bold/italic typography.
 * Category: 2️⃣ Domain / Feature (Community Intelligence)
 */

export class TelegramToWhatsAppSignalCrossPoster {
  /**
   * Adapts Telegram deal message into WhatsApp format.
   * @param {string} telegramText
   * @param {string} sourceChannelTitle
   * @returns {Object}
   */
  adaptTelegramToWhatsApp(telegramText, sourceChannelTitle = 'Telegram VIP Alerts') {
    if (!telegramText) return { whatsAppText: '', originalLength: 0 };

    // Replace Markdown double-asterisks **bold** with WhatsApp single *bold*
    let converted = telegramText.replace(/\*\*(.*?)\*\*/g, '*$1*');
    // Replace Markdown __italic__ or _italic_ with _italic_
    converted = converted.replace(/__(.*?)__/g, '_$1_');
    // Strip raw HTML tags if present
    converted = converted.replace(/<[^>]*>/g, '');

    const finalWhatsAppCopy = [
      `⚡ *CROSS-POSTED VIP DEAL ALERT*`,
      `📡 _Source: ${sourceChannelTitle}_`,
      `─────────────────────────`,
      converted.trim(),
      `─────────────────────────`,
      `📲 Reply *DEAL* to request full investment teaser via Linda AI.`
    ].join('\n');

    return {
      sourceChannel: sourceChannelTitle,
      whatsAppText: finalWhatsAppCopy,
      isFormattedForWhatsApp: true
    };
  }
}

export default new TelegramToWhatsAppSignalCrossPoster();
