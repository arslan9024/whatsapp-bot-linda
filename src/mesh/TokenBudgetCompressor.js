/**
 * @file TokenBudgetCompressor.js
 * @description Compresses multi-turn conversation histories by pruning polite greetings, redundant filler phrases, and boilerplate sign-offs, freeing up token capacity.
 * Category: 2️⃣ Domain / Feature (Multi-LLM Mesh)
 */

export class TokenBudgetCompressor {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.fillerPhrases = [
      /i hope this message finds you well[.,]?/gi,
      /as per your previous query[.,]?/gi,
      /thank you for reaching out to us[.,]?/gi,
      /please do not hesitate to let me know[.,]?/gi,
      /have a wonderful and blessed day ahead[.,]?/gi
    ];
  }

  /**
   * Compresses message history.
   * @param {Array<{ role: string, content: string }>} messages
   * @returns {Object}
   */
  compressHistory(messages = []) {
    let originalChars = 0;
    let compressedChars = 0;

    const compressedMessages = messages.map(m => {
      originalChars += m.content.length;
      let cleaned = m.content;
      for (const rx of this.fillerPhrases) {
        cleaned = cleaned.replace(rx, '');
      }
      cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
      compressedChars += cleaned.length;

      return {
        role: m.role,
        content: cleaned
      };
    });

    const savingsPct = originalChars > 0 ? ((originalChars - compressedChars) / originalChars) * 100 : 0;

    return {
      messages: compressedMessages,
      originalLengthChars: originalChars,
      compressedLengthChars: compressedChars,
      compressionRatioPct: Number(savingsPct.toFixed(1)),
      tokensSavedEstimate: Math.round((originalChars - compressedChars) / 4)
    };
  }
}

export default new TokenBudgetCompressor();
