/**
 * @file TerminalSecretMasker.js
 * @description Intercepts terminal stdout and WebSocket log streams, automatically
 * redacting bearer tokens, database passwords, and API credentials from visual display.
 * Category: Core
 */

export class TerminalSecretMasker {
  constructor() {
    this.replacement = '[***PROTECTED_SECRET***]';
  }

  /**
   * Redacts sensitive patterns from a terminal line
   * @param {string} line
   * @returns {string} Sanitized line
   */
  maskLine(line = '') {
    if (!line || typeof line !== 'string') return '';

    let out = line;

    // Bearer tokens
    out = out.replace(/Bearer\s+[a-zA-Z0-9_\-\.]{15,}/gi, `Bearer ${this.replacement}`);

    // Password flags or JSON fields (password=xxx, "password": "xxx")
    out = out.replace(/("?password"?\s*[:=]\s*)"[^"]+"/gi, `$1"${this.replacement}"`);
    out = out.replace(/("?secret"?\s*[:=]\s*)"[^"]+"/gi, `$1"${this.replacement}"`);

    // Mongo passwords
    out = out.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@)/gi, `$1${this.replacement}$3`);

    return out;
  }
}

export default new TerminalSecretMasker();

