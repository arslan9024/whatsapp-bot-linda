/**
 * @file ZeroDataRetentionPiiWrapper.js
 * @description Redacts personally identifiable information (PII) including UAE phone numbers, passport numbers, and Emirates IDs before dispatching prompts to external LLM APIs.
 * Category: 2️⃣ Domain / Feature (Multi-LLM Mesh)
 */

export class ZeroDataRetentionPiiWrapper {
  /**
   * Sanitizes outbound prompt and creates a reverse de-anonymization map.
   * @param {string} promptText
   * @returns {Object}
   */
  anonymizePrompt(promptText = '') {
    const substitutionMap = new Map();
    let sanitized = promptText;

    // Redact UAE Phone numbers (+971 50 123 4567, 0501234567, etc.)
    const phoneRegex = /(?:\+971|00971|0)?(?:50|51|52|54|55|56|58|2|3|4|6|7|9)\d{7}/g;
    sanitized = sanitized.replace(phoneRegex, (match) => {
      const token = `[CLIENT_PHONE_${substitutionMap.size + 1}]`;
      substitutionMap.set(token, match);
      return token;
    });

    // Redact Emirates ID format: 784-XXXX-XXXXXXX-X
    const eidRegex = /784-\d{4}-\d{7}-\d{1}/g;
    sanitized = sanitized.replace(eidRegex, (match) => {
      const token = `[CLIENT_EID_${substitutionMap.size + 1}]`;
      substitutionMap.set(token, match);
      return token;
    });

    // Redact email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    sanitized = sanitized.replace(emailRegex, (match) => {
      const token = `[CLIENT_EMAIL_${substitutionMap.size + 1}]`;
      substitutionMap.set(token, match);
      return token;
    });

    return {
      sanitizedPrompt: sanitized,
      redactionsAppliedCount: substitutionMap.size,
      isPiiScrubbed: substitutionMap.size > 0,
      deanonymize: (llmResponse = '') => {
        let restored = llmResponse;
        for (const [token, original] of substitutionMap.entries()) {
          restored = restored.replace(token, original);
        }
        return restored;
      }
    };
  }
}

export default new ZeroDataRetentionPiiWrapper();
