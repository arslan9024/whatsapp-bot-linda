/**
 * @file PiiLogMasker.js
 * @description Automatically redacts personally identifiable information (PII)
 * such as UAE phone numbers, emails, and passport/Emirates IDs from application logs.
 * Category: Core
 */

export class PiiLogMasker {
  /**
   * Masks a phone number preserving country prefix and last 3 digits
   * e.g. +971501234567 -> +97150****567
   * @param {string} phone
   * @returns {string}
   */
  maskPhone(phone) {
    if (!phone || typeof phone !== 'string') return '';
    const clean = phone.trim();
    if (clean.length < 8) return '****';
    const prefix = clean.substring(0, Math.min(6, clean.length - 4));
    const suffix = clean.substring(clean.length - 3);
    return `${prefix}****${suffix}`;
  }

  /**
   * Masks an email address preserving first 2 chars and domain
   * e.g. investor@gmail.com -> in****@gmail.com
   * @param {string} email
   * @returns {string}
   */
  maskEmail(email) {
    if (!email || !email.includes('@')) return email;
    const [user, domain] = email.split('@');
    const maskedUser = user.length <= 2 ? user + '***' : user.substring(0, 2) + '****';
    return `${maskedUser}@${domain}`;
  }

  /**
   * Sanitizes any log string or object removing PII patterns
   * @param {string|Object} input
   * @returns {string|Object}
   */
  sanitize(input) {
    if (!input) return input;

    if (typeof input === 'object') {
      const copy = Array.isArray(input) ? [...input] : { ...input };
      for (const [k, v] of Object.entries(copy)) {
        if (typeof v === 'string') {
          if (/phone|mobile|whatsapp/i.test(k)) copy[k] = this.maskPhone(v);
          else if (/email/i.test(k)) copy[k] = this.maskEmail(v);
        } else if (typeof v === 'object' && v !== null) {
          copy[k] = this.sanitize(v);
        }
      }
      return copy;
    }

    if (typeof input === 'string') {
      // Redact email patterns
      let sanitized = input.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, (match) => this.maskEmail(match));
      // Redact standard UAE / international phone patterns
      sanitized = sanitized.replace(/(\+?971\d{8,9}|\+?\d{10,13})/g, (match) => this.maskPhone(match));
      return sanitized;
    }

    return input;
  }
}

export default new PiiLogMasker();

