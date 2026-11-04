/**
 * @file EmailInboundInquiryParser.js
 * @description Ingests inbound email inquiries from agency contact forms or direct broker emails, extracting phone numbers and triggering proactive WhatsApp touchpoints.
 * Category: 2️⃣ Domain / Feature (Omnichannel Dominance)
 */

export class EmailInboundInquiryParser {
  /**
   * Parses raw email subject and body text.
   * @param {Object} email
   * @param {string} email.fromAddress
   * @param {string} email.subject
   * @param {string} email.bodyText
   * @returns {Object}
   */
  parseInquiryEmail(email) {
    const rawText = `${email.subject || ''} ${email.bodyText || ''}`;

    // Extract international phone number
    const phoneMatch = rawText.match(/(?:\+?\d{1,4}[ -]?)?\(?\d{2,4}\)?[ -]?\d{3,4}[ -]?\d{3,4}/);
    const extractedPhone = phoneMatch ? phoneMatch[0].replace(/[^0-9+]/g, '') : null;

    // Detect project or property keywords
    let mentionedProject = 'Dubai Property Portfolio';
    if (/creek\s*waters/i.test(rawText)) mentionedProject = 'Creek Waters';
    else if (/palm\s*jumeirah/i.test(rawText)) mentionedProject = 'Palm Jumeirah';
    else if (/downtown/i.test(rawText)) mentionedProject = 'Downtown Dubai';

    return {
      fromAddress: email.fromAddress,
      extractedPhone,
      hasCallablePhone: Boolean(extractedPhone && extractedPhone.length >= 8),
      detectedProject: mentionedProject,
      proactiveWhatsAppAction: extractedPhone ? {
        to: extractedPhone,
        message: `Hello! We received your email inquiry regarding *${mentionedProject}*. Linda AI is here to provide instant PDF floor plans and payment plans directly on WhatsApp.`
      } : {
        action: 'REPLY_VIA_EMAIL_REQUESTING_WHATSAPP'
      }
    };
  }
}

export default new EmailInboundInquiryParser();
