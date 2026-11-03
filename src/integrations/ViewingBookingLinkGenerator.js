/**
 * ViewingBookingLinkGenerator.js
 * 
 * Single responsibility: Generate personalized Calendly / Cal.com booking links with pre-filled lead metadata.
 * Category: 2️⃣ Domain / Feature (src/integrations/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class ViewingBookingLinkGenerator {
  constructor({ baseUrl = 'https://cal.com/linda-advisory/viewing' } = {}) {
    this.baseUrl = baseUrl;
  }

  generateBookingUrl({ clientName, clientPhone, clientEmail, community }) {
    const url = new URL(this.baseUrl);
    if (clientName) url.searchParams.set('name', clientName);
    if (clientPhone) url.searchParams.set('phone', clientPhone);
    if (clientEmail) url.searchParams.set('email', clientEmail);
    if (community) url.searchParams.set('notes', `Viewing request for ${community}`);
    return url.toString();
  }

  formatViewingInvitation(clientName, bookingUrl) {
    return `Hi ${clientName || 'there'}! You can select your preferred day and time for the on-site property tour directly on our schedule calendar here: ${bookingUrl}\nOur property specialist will meet you at the community gate.`;
  }
}

export default new ViewingBookingLinkGenerator();

