/**
 * @file ColdLeadReengagementDrip.js
 * @description Schedules tailored re-activation touchpoints for dormant leads (60+ days inactive), referencing newly launched projects in their previously expressed communities of interest.
 * Category: 2️⃣ Domain / Feature (Omnichannel Dominance)
 */

export class ColdLeadReengagementDrip {
  /**
   * Generates tailored re-engagement message.
   * @param {Object} leadProfile
   * @param {string} leadProfile.name
   * @param {string} leadProfile.preferredCommunity ('Dubai Creek Harbour', 'Downtown')
   * @param {number} leadProfile.daysInactive
   * @returns {Object}
   */
  generateReengagementPayload(leadProfile) {
    const isReadyForDrip = leadProfile.daysInactive >= 60;
    const comm = leadProfile.preferredCommunity || 'Dubai';

    const messageText = [
      `Hi ${leadProfile.name}! 👋`,
      ``,
      `It's Linda following up from our conversation regarding property options in *${comm}*.`,
      `A new phase was just released today with an attractive 1% monthly payment plan that I thought might fit your earlier criteria.`,
      ``,
      `Would you like me to send you the fresh 2-minute overview video and floor plans? No pressure at all! 🏙️`
    ].join('\n');

    return {
      clientName: leadProfile.name,
      community: comm,
      daysInactive: leadProfile.daysInactive,
      isEligibleForDrip: isReadyForDrip,
      scheduledDispatchText: messageText,
      reengagementCadence: 'STAGGERED_60_DAY_PULSE'
    };
  }
}

export default new ColdLeadReengagementDrip();
