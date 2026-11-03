/**
 * OpenHouseBroadcastFormatter.js
 * 
 * Single responsibility: Format geo-targeted weekend open house invitations with Google Maps pins.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class OpenHouseBroadcastFormatter {
  formatInvitation({ community = 'DAMAC Hills 2', propertyTitle = 'Luxury 4-Bed Villa', dateStr = 'Saturday, 11:00 AM - 3:00 PM', googleMapsUrl = 'https://maps.google.com' } = {}) {
    return [
      `🏡 *EXCLUSIVE WEEKEND OPEN HOUSE INVITATION*`,
      `📍 *Location:* ${propertyTitle}, ${community}`,
      `📅 *Date & Time:* ${dateStr}`,
      `🗺️ *Directions Pin:* ${googleMapsUrl}`,
      `☕ Refreshments and full floor plan dossiers will be provided.`,
      `Would you like me to reserve a private viewing slot for you?`,
    ].join('\n');
  }
}

export default new OpenHouseBroadcastFormatter();
