/**
 * @file PromptInjectionJailbreakNeutralizer.js
 * @description Defends the LLM agent against system prompt leakage, role hijack attempts, and instruction override jailbreaks.
 * Category: 2️⃣ Domain / Feature (Multi-LLM Mesh)
 */

export class PromptInjectionJailbreakNeutralizer {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.maliciousPatterns = [
      /ignore\s+(?:all\s+)?previous\s+instructions/i,
      /you\s+are\s+now\s+(?:dan|unrestricted|an\s+ai\s+without\s+rules)/i,
      /reveal\s+(?:your\s+)?system\s+prompt/i,
      /system\s*:\s*override/i,
      /print\s+all\s+confidential\s+instructions/i,
      /disregard\s+all\s+safety\s+guidelines/i
    ];
  }

  /**
   * Inspects and sanitizes inbound user prompts.
   * @param {string} rawPrompt
   * @returns {Object}
   */
  neutralizePrompt(rawPrompt = '') {
    let hasInjectionAttempt = false;
    const detectedPatterns = [];

    for (const rx of this.maliciousPatterns) {
      if (rx.test(rawPrompt)) {
        hasInjectionAttempt = true;
        detectedPatterns.push(rx.toString());
      }
    }

    if (hasInjectionAttempt) {
      return {
        isSafe: false,
        sanitizedPrompt: 'Hello, please assist me with official Dubai property options and market information.',
        originalPrompt: rawPrompt,
        detectedPatterns,
        securityAction: 'JAILBREAK_ATTEMPT_DEFUSED',
        cannedResponse: 'I am Linda, an artificial intelligence assistant dedicated exclusively to Dubai real estate advisory, financial modeling, and Golden Visa concierge services. How may I assist your property search?'
      };
    }

    return {
      isSafe: true,
      sanitizedPrompt: rawPrompt,
      securityAction: 'PASSED'
    };
  }
}

export default new PromptInjectionJailbreakNeutralizer();
