/**
 * AutonomousUnsubscribeHandler.js
 * 
 * Single responsibility: Detect opt-out intent (stop, unsubscribe, remove me) and maintain blacklists.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const OPT_OUT_TRIGGERS = Object.freeze([
  'stop',
  'unsubscribe',
  'remove me',
  'dont message',
  'do not contact',
  'opt out',
  'please stop',
  'cancel messages',
]);

export class AutonomousUnsubscribeHandler {
  constructor() {
    /** @type {Set<string>} */
    this.optOutList = new Set();
  }

  isOptOutIntent(messageText = '') {
    if (!messageText || typeof messageText !== 'string') return false;
    const clean = messageText.toLowerCase().trim();
    return OPT_OUT_TRIGGERS.some(trigger => clean === trigger || clean.startsWith(trigger));
  }

  processOptOut(phone, messageText) {
    if (!phone) throw new Error('phone is required');
    if (this.isOptOutIntent(messageText)) {
      this.optOutList.add(phone);
      return {
        unsubscribed: true,
        phone,
        confirmationReply: 'You have been successfully removed from our property alert updates. No further messages will be sent.',
      };
    }
    return { unsubscribed: false, phone };
  }

  isUnsubscribed(phone) {
    return this.optOutList.has(phone);
  }
}

export default new AutonomousUnsubscribeHandler();
