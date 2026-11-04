/**
 * @file CommunityWhatsAppPollGenerator.js
 * @description Generates native WhatsApp poll specifications for broker and investor groups to drive conversation momentum and identify active buyer sentiment.
 * Category: 2️⃣ Domain / Feature (Community Intelligence)
 */

export class CommunityWhatsAppPollGenerator {
  /**
   * Generates interactive WhatsApp poll configuration.
   * @param {Object} params
   * @param {string} params.question
   * @param {Array<string>} params.options
   * @param {boolean} [params.allowMultipleAnswers=false]
   * @returns {Object}
   */
  generatePollPayload({ question, options = [], allowMultipleAnswers = false }) {
    if (options.length < 2) {
      throw new Error('A WhatsApp poll must have at least 2 options.');
    }

    return {
      type: 'WHATSAPP_NATIVE_POLL',
      pollQuestion: question,
      pollOptions: options.map((opt, idx) => ({ id: `opt_${idx}`, text: opt })),
      selectableCount: allowMultipleAnswers ? options.length : 1,
      leadCaptureStrategy: 'DMs automatically dispatched to members voting on bullish investment choices.'
    };
  }
}

export default new CommunityWhatsAppPollGenerator();
