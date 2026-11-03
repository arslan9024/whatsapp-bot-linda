/**
 * @file SecureEnvLoader.js
 * @description Validates environment variables upon bot startup, identifying missing
 * keys and rejecting default dummy placeholders (e.g. 'changeme', 'your_key_here').
 * Category: Core
 */

export class SecureEnvLoader {
  constructor() {
    this.placeholderPatterns = [
      'changeme',
      'your_key_here',
      'your_secret_here',
      'secret123',
      'password123',
      'insert_token_here',
      'todo',
      'placeholder'
    ];
  }

  /**
   * Tests if an environment value is an insecure placeholder
   * @param {string} value
   * @returns {boolean}
   */
  isPlaceholder(value) {
    if (!value || typeof value !== 'string') return true;
    const lower = value.trim().toLowerCase();
    return this.placeholderPatterns.some(p => lower.includes(p)) || lower.length < 4;
  }

  /**
   * Validates required environment variables
   * @param {Array<string>} requiredKeys
   * @param {Object} [envSource]
   * @returns {{ valid: boolean, errors: Array<string> }}
   */
  validateEnvironment(requiredKeys = [], envSource = process.env) {
    const errors = [];

    for (const key of requiredKeys) {
      const val = envSource[key];
      if (!val) {
        errors.push(`Missing required environment variable: "${key}"`);
      } else if (this.isPlaceholder(val)) {
        errors.push(`Insecure default placeholder detected for: "${key}"`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default new SecureEnvLoader();
