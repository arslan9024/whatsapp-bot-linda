/**
 * @file ZeroSecretScanner.js
 * @description Scans code snippets, config files, and payloads for accidental exposure
 * of secrets (JWTs, MongoDB credentials, Stripe/OpenAI/Twilio API keys, AWS tokens).
 * Category: Core
 */

export class ZeroSecretScanner {
  constructor() {
    this.secretPatterns = [
      { name: 'OpenAI API Key', regex: /sk-[a-zA-Z0-9]{32,64}/ },
      { name: 'Stripe Secret Key', regex: /sk_live_[a-zA-Z0-9]{24,34}/ },
      { name: 'MongoDB Connection String with Password', regex: /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/i },
      { name: 'JWT Token', regex: /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/ },
      { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
      { name: 'Twilio Auth Token', regex: /[a-f0-9]{32}/ } // strictly flagged in auth context
    ];
  }

  /**
   * Scans a string content for known credential patterns
   * @param {string} content
   * @returns {{ hasSecrets: boolean, findings: Array<{ name: string, match: string }> }}
   */
  scanContent(content = '') {
    if (!content || typeof content !== 'string') {
      return { hasSecrets: false, findings: [] };
    }

    const findings = [];
    for (const pat of this.secretPatterns) {
      if (pat.name === 'Twilio Auth Token') {
        // Only trigger if specifically near token indicators
        if (/twilio|auth_token|account_sid/i.test(content) && pat.regex.test(content)) {
          findings.push({ name: pat.name, match: '[REDACTED_TWILIO_SECRET]' });
        }
      } else {
        const match = content.match(pat.regex);
        if (match) {
          findings.push({ name: pat.name, match: match[0].substring(0, 6) + '...' });
        }
      }
    }

    return {
      hasSecrets: findings.length > 0,
      findings
    };
  }
}

export default new ZeroSecretScanner();

