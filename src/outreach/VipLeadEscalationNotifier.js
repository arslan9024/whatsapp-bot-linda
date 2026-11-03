/**
 * VipLeadEscalationNotifier.js
 * 
 * Single responsibility: Format and dispatch instant high-priority alerts to management on leads >= 5,000,000 AED.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const VIP_BUDGET_THRESHOLD_AED = 5000000;

export class VipLeadEscalationNotifier {
  isVipLead(budgetAed = 0) {
    return budgetAed >= VIP_BUDGET_THRESHOLD_AED;
  }

  formatTelegramAlert({ leadName, phone, budgetAed, community, agentName }) {
    return [
      '🚨 *VIP HIGH-NET-WORTH LEAD ALERT*',
      `👤 *Client:* ${leadName || 'Verified Investor'}`,
      `📞 *Phone:* ${phone}`,
      `💰 *Budget:* ${(budgetAed || 0).toLocaleString()} AED`,
      `📍 *Target Area:* ${community || 'Luxury Waterfront / Golf'}`,
      `⚡ *Action:* Priority broker callback within 10 minutes.`,
      `💼 *Assigned Desk:* ${agentName || 'Senior Luxury Specialist'}`,
    ].join('\n');
  }
}

export default new VipLeadEscalationNotifier();
