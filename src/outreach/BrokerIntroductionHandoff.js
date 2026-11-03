/**
 * @file BrokerIntroductionHandoff.js
 * @description Generates client-facing and broker-facing WhatsApp handoff introduction
 * messages, transferring warm leads to human specialists with context.
 * Category: Outreach
 */

export class BrokerIntroductionHandoff {
  /**
   * Formats the transition message sent to the client on WhatsApp
   * @param {Object} params
   * @param {string} params.clientName
   * @param {string} params.brokerName
   * @param {string} params.brokerPhone
   * @param {string} params.propertyRef
   * @param {string} [params.specialtyArea]
   * @returns {string}
   */
  formatClientHandoff(params) {
    const { clientName, brokerName, brokerPhone, propertyRef, specialtyArea } = params;
    const areaContext = specialtyArea ? ` our Senior ${specialtyArea} Specialist` : ' our Senior Property Consultant';

    return [
      `🤝 *Meet Your Property Specialist*`,
      ``,
      `Dear ${clientName || 'Valued Client'},`,
      `Thank you for discussing your preferences with me regarding *${propertyRef}*.`,
      ``,
      `I have connected you directly with *${brokerName}*,${areaContext}.`,
      `📱 Mobile / WhatsApp: *${brokerPhone}*`,
      ``,
      `${brokerName} will review your preferences and share exclusive availability, floor plans, and viewing slots shortly.`,
      `I remain available here anytime if you need instant data or market reports! ✨`
    ].join('\n');
  }

  /**
   * Formats internal context briefing sent directly to the broker's WhatsApp
   * @param {Object} params
   * @returns {string}
   */
  formatBrokerBriefing(params) {
    const { clientName, clientPhone, budget, requirements, leadScore, source } = params;
    return [
      `🚨 *NEW QUALIFIED LEAD HANDOFF — BOT LINDA*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `👤 *Client:* ${clientName} (${clientPhone})`,
      `💰 *Budget:* AED ${budget ? Number(budget).toLocaleString() : 'Undisclosed'}`,
      `⭐ *Lead Score:* ${leadScore || 'N/A'}/100`,
      `📍 *Target / Notes:* ${requirements || 'General Inquiry'}`,
      `🌐 *Source:* ${source || 'WhatsApp Inbound'}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `⚡ *Action Required:* Initiate outreach within 15 minutes to maximize conversion.`
    ].join('\n');
  }
}

export default new BrokerIntroductionHandoff();
