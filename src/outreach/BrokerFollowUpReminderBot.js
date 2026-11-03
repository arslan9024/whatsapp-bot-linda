/**
 * @file BrokerFollowUpReminderBot.js
 * @description Internal automated notification generator reminding human brokers
 * to re-engage warm leads and update CRM deal stages every 48 hours.
 * Category: Outreach
 */

export class BrokerFollowUpReminderBot {
  constructor(config = {}) {
    this.staleThresholdHours = config.staleThresholdHours || 48;
  }

  /**
   * Filters leads that haven't been contacted within threshold
   * @param {Array<Object>} leadAssignments
   * @param {Date} [referenceDate]
   * @returns {Array<Object>}
   */
  findDormantAssignments(leadAssignments = [], referenceDate = new Date()) {
    const thresholdMs = this.staleThresholdHours * 60 * 60 * 1000;
    const refMs = referenceDate.getTime();

    return leadAssignments.filter(item => {
      if (['closed', 'lost', 'rejected'].includes((item.dealStage || '').toLowerCase())) {
        return false;
      }
      const lastUpdate = new Date(item.lastActivityAt || item.assignedAt).getTime();
      return (refMs - lastUpdate) >= thresholdMs;
    });
  }

  /**
   * Generates a direct WhatsApp reminder message for the assigned broker
   * @param {Object} item
   * @returns {string} Formatted reminder
   */
  formatBrokerNudge(item) {
    const { brokerName, clientName, clientPhone, lastActivityAt, propertyRef } = item;
    const hoursSince = Math.round((Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60));

    return [
      `⏰ *Follow-Up Reminder — Lead Inactivity (${hoursSince}h)*`,
      `Hi ${brokerName || 'Agent'},`,
      `Client *${clientName}* (${clientPhone}) interested in *${propertyRef || 'Inquiry'}* has had no recorded activity for ${hoursSince} hours.`,
      ``,
      `📌 *Action Options:*`,
      `1️⃣ Send WhatsApp follow-up or schedule viewing`,
      `2️⃣ Update deal stage in CRM`,
      `3️⃣ Reply "!hold ${clientName}" to pause auto-reminders`,
      `Prompt follow-ups keep conversion rates above 35%! 🚀`
    ].join('\n');
  }
}

export default new BrokerFollowUpReminderBot();

