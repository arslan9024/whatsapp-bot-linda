/**
 * ContactVCardGenerator.js
 * 
 * Single responsibility: Generate valid RFC 6350 vCard contact payloads for Linda and agency brokers.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class ContactVCardGenerator {
  generateVCard({
    fullName = 'Linda Real Estate AI',
    organization = 'Linda Real Estate LLC',
    phone = '+971500000000',
    title = 'Real Estate Operations Advisor',
    website = 'https://linda-realestate.ae',
  } = {}) {
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${fullName}`,
      `ORG:${organization}`,
      `TITLE:${title}`,
      `TEL;TYPE=WORK,VOICE:${phone}`,
      `URL:${website}`,
      'END:VCARD',
    ];
    return lines.join('\n');
  }

  isVCardRequest(text = '') {
    if (!text || typeof text !== 'string') return false;
    const lower = text.toLowerCase();
    const triggers = ['send contact', 'send card', 'your number', 'vcard', 'contact card', 'business card'];
    return triggers.some(t => lower.includes(t));
  }
}

export default new ContactVCardGenerator();

