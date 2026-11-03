/**
 * SlackOperationsNotifier.js
 * 
 * Single responsibility: Format rich Slack Block Kit notifications for brokerage deal and operational rooms.
 * Category: 2️⃣ Domain / Feature (src/integrations/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class SlackOperationsNotifier {
  formatLeadAlertBlock({ leadName, phone, community, budgetAed, agentAssigned }) {
    return {
      text: `New Qualified Lead: ${leadName} (${(budgetAed || 0).toLocaleString()} AED)`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '⚡ New Qualified WhatsApp Lead' },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Client:*\n${leadName || 'Verified'}` },
            { type: 'mrkdwn', text: `*Phone:*\n${phone}` },
            { type: 'mrkdwn', text: `*Area:*\n${community || 'Dubai Prime'}` },
            { type: 'mrkdwn', text: `*Budget:*\n${(budgetAed || 0).toLocaleString()} AED` },
          ],
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `*Desk Assigned:* ${agentAssigned || 'Senior Broker'} | Source: WhatsApp Linda` },
          ],
        },
      ],
    };
  }
}

export default new SlackOperationsNotifier();

