/**
 * OmnichannelFailoverPayload.js
 * 
 * Single responsibility: Structure SMS and Email fallback payloads when WhatsApp delivery is temporarily degraded.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class OmnichannelFailoverPayload {
  formatSmsPayload({ toPhone, messageBody, senderId = 'LINDA-RE' }) {
    if (!toPhone || !messageBody) throw new Error('toPhone and messageBody are required');
    return {
      channel: 'SMS',
      to: toPhone,
      from: senderId,
      body: messageBody.slice(0, 160), // standard 1-segment SMS limit
      timestamp: Date.now(),
    };
  }

  formatEmailPayload({ toEmail, clientName, subject, htmlBody }) {
    if (!toEmail || !subject) throw new Error('toEmail and subject are required');
    return {
      channel: 'EMAIL',
      to: toEmail,
      recipientName: clientName || 'Valued Client',
      subject,
      htmlBody: htmlBody || '<p>Property advisory update from Linda.</p>',
      timestamp: Date.now(),
    };
  }
}

export default new OmnichannelFailoverPayload();

