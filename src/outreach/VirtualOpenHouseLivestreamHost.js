/**
 * @file VirtualOpenHouseLivestreamHost.js
 * @description Manages registration, access links, and WhatsApp reminders for live
 * interactive virtual open-house broadcasts and developer digital launch events.
 * Category: Outreach
 */

export class VirtualOpenHouseLivestreamHost {
  /**
   * Generates a registered livestream attendee confirmation pass
   * @param {Object} event
   * @param {string} event.eventId
   * @param {string} event.propertyTitle
   * @param {string} event.streamDateTime
   * @param {string} event.livestreamUrl
   * @param {string} clientName
   * @returns {Object} Structured digital entry pass
   */
  createAttendeePass(event, clientName = 'Valued Guest') {
    const { eventId, propertyTitle, streamDateTime, livestreamUrl } = event;
    const passCode = `VIP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    return {
      eventId,
      passCode,
      clientName,
      propertyTitle,
      streamDateTime,
      livestreamUrl: `${livestreamUrl}?pass=${passCode}`,
      whatsappConfirmationCopy: [
        `🎟️ *VIRTUAL OPEN HOUSE VIP PASS*`,
        `Guest: *${clientName}*`,
        `Property: *${propertyTitle}*`,
        `Broadcast Time: *${streamDateTime}*`,
        ``,
        `🔗 Private Stream Link: ${livestreamUrl}?pass=${passCode}`,
        `💬 You can ask live questions right here on WhatsApp during the walkthrough!`
      ].join('\n')
    };
  }
}

export default new VirtualOpenHouseLivestreamHost();

