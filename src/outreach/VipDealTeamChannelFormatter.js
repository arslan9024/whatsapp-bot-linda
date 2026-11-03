/**
 * @file VipDealTeamChannelFormatter.js
 * @description Generates structured alerts for internal agency "Deal War Room" WhatsApp
 * groups when Ultra-High-Net-Worth (UHNW) leads or multi-unit investors are captured.
 * Category: Outreach
 */

export class VipDealTeamChannelFormatter {
  /**
   * Formats a comprehensive deal alert for an internal broker deal group
   * @param {Object} deal
   * @param {string} deal.leadName
   * @param {string} deal.leadPhone
   * @param {number} deal.budgetAed
   * @param {string} deal.assetTarget
   * @param {string} [deal.investorOrigin]
   * @param {string} [deal.leadSource]
   * @param {string} [deal.assignedLeadDirector]
   * @returns {string}
   */
  formatWarRoomAlert(deal) {
    const {
      leadName,
      leadPhone,
      budgetAed,
      assetTarget,
      investorOrigin = 'International Buyer',
      leadSource = 'Direct WhatsApp Concierge',
      assignedLeadDirector = 'Managing Director'
    } = deal;

    const formattedBudget = Number(budgetAed || 0).toLocaleString('en-US');

    return [
      `🌟👑 *UHNW VIP DEAL WAR ROOM ALERT* 👑🌟`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💼 *Investor:* ${leadName}`,
      `📞 *Contact:* ${leadPhone}`,
      `🌍 *Origin:* ${investorOrigin}`,
      `💰 *Declared Budget:* AED ${formattedBudget}`,
      `🏛️ *Target Asset:* ${assetTarget}`,
      `🌐 *Inbound Channel:* ${leadSource}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🎯 *Assigned Deal Lead:* ${assignedLeadDirector}`,
      `📋 *Key Checklist for Team:*`,
      `  • Verify off-market pocket listings matching budget`,
      `  • Prepare branded PDF portfolio presentation`,
      `  • Check Golden Visa eligibility paperwork readiness`,
      `⚡ *Protocol:* Lead Director to initiate contact within 10 minutes.`
    ].join('\n');
  }
}

export default new VipDealTeamChannelFormatter();
