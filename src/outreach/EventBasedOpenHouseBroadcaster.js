/**
 * @file EventBasedOpenHouseBroadcaster.js
 * @description Formats localized open-house event invitations and filters registered
 * buyers matching specific communities for weekend viewing invitations.
 * Category: Outreach
 */

export class EventBasedOpenHouseBroadcaster {
  /**
   * Formats open house invitation message
   * @param {Object} event
   * @param {string} event.community
   * @param {string} event.date
   * @param {string} event.timeWindow
   * @param {string} event.unitDescription
   * @param {string} clientName
   * @returns {string} Client-facing invitation
   */
  formatInvitation(event, clientName = 'Valued Client') {
    const { community, date, timeWindow, unitDescription } = event;

    return [
      `🏡 *EXCLUSIVE OPEN HOUSE INVITATION: ${community.toUpperCase()}*`,
      `Dear ${clientName},`,
      `You are cordially invited to our private weekend open house viewing:`,
      `📍 *Location:* ${unitDescription}, ${community}`,
      `📅 *Date:* ${date}`,
      `🕒 *Time:* ${timeWindow}`,
      ``,
      `Refreshments and architectural dossiers will be provided.`,
      `Reply *"RSVP"* to reserve your VIP entry pass! ✨`
    ].join('\n');
  }
}

export default new EventBasedOpenHouseBroadcaster();
