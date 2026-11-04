/**
 * @file WhatsAppAudioIvrMenu.js
 * @description Generates interactive audio menu structures pairing voice note greetings
 * with WhatsApp quick-reply buttons and numbered list selectors.
 * Category: Outreach
 */

export class WhatsAppAudioIvrMenu {
  /**
   * Builds an interactive audio menu payload
   * @param {Object} options
   * @param {string} options.audioUrl
   * @param {string} options.clientName
   * @returns {Object} Structured IVR message payload
   */
  buildAudioMenu(options = {}) {
    const { audioUrl, clientName = 'Valued Guest' } = options;

    return {
      type: 'interactive_audio_menu',
      audioPromptUrl: audioUrl || 'https://assets.botlinda.ae/audio/welcome_ivr.opus',
      caption: `🎙️ *Linda Luxury Concierge — Quick Voice Guide for ${clientName}*`,
      interactiveOptions: [
        { id: 'opt_palm_villas', title: '🏝️ Palm & Beachfront Villas', description: 'AED 15M - 80M+' },
        { id: 'opt_downtown_penthouses', title: '🏙️ Downtown Penthouses', description: 'Full Burj Khalifa View' },
        { id: 'opt_golden_visa', title: '⭐ Golden Visa Units', description: 'AED 2M+ Instant Qualification' },
        { id: 'opt_human_director', title: '📞 Speak with Director', description: 'Direct Call / WhatsApp Transfer' }
      ]
    };
  }
}

export default new WhatsAppAudioIvrMenu();

