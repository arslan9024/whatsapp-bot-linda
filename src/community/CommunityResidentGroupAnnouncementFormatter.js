/**
 * @file CommunityResidentGroupAnnouncementFormatter.js
 * @description Formats courteous, low-pressure neighborly announcements for residential building and community WhatsApp groups to avoid group admin bans.
 * Category: 2️⃣ Domain / Feature (Community Intelligence)
 */

export class CommunityResidentGroupAnnouncementFormatter {
  /**
   * Formats a neighborly open house or rental announcement.
   * @param {Object} params
   * @param {string} params.communityName ('The Greens', 'Downtown Dubai')
   * @param {string} params.unitType ('2BR with lake view')
   * @param {string} params.eventDateText ('This Saturday, 2:00 PM - 5:00 PM')
   * @param {string} params.agentContactName
   * @param {string} params.agentPhone
   * @returns {string} Formatted text
   */
  formatNeighborlyAnnouncement({
    communityName,
    unitType,
    eventDateText,
    agentContactName,
    agentPhone
  }) {
    return [
      `👋 Good afternoon neighbors in ${communityName},`,
      ``,
      `Just a quick private notice for anyone with visiting friends or family looking to move into our community:`,
      `We have an open viewing for an upcoming ${unitType} scheduled for ${eventDateText}.`,
      ``,
      `To respect the quiet comfort of our building, private viewing slots are staggered. Feel free to send a direct private message if someone you know is looking:`,
      `📲 ${agentContactName} (${agentPhone})`,
      ``,
      `Wishing everyone a wonderful week ahead! 🌿`
    ].join('\n');
  }
}

export default new CommunityResidentGroupAnnouncementFormatter();
