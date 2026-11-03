/**
 * ContactPhoneNormalizer.js
 * 
 * Single responsibility: Sanitize international numbers to standard E.164 and WhatsApp JID formats.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class ContactPhoneNormalizer {
  normalizeE164(phone = '', defaultCountryCode = '971') {
    if (!phone || typeof phone !== 'string') return null;

    let clean = phone.replace(/[^0-9+]/g, '');
    if (clean.startsWith('+')) clean = clean.slice(1);
    clean = clean.replace(/^00/, '');

    // UAE local formats (e.g. 0501234567 -> 971501234567)
    if (clean.startsWith('0') && clean.length === 10) {
      clean = defaultCountryCode + clean.slice(1);
    } else if (clean.length === 9 && clean.startsWith('5')) {
      clean = defaultCountryCode + clean;
    }

    if (clean.length < 8 || clean.length > 15) return null;
    return `+${clean}`;
  }

  toWhatsAppJid(phone = '', defaultCountryCode = '971') {
    const e164 = this.normalizeE164(phone, defaultCountryCode);
    if (!e164) return null;
    return `${e164.slice(1)}@c.us`;
  }
}

export default new ContactPhoneNormalizer();

