/**
 * ExecutiveConversationCondenser.js
 * 
 * Single responsibility: Condense multi-turn chat threads into structured 3-bullet executive CRM summaries.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class ExecutiveConversationCondenser {
  condenseChat(messages = []) {
    if (!Array.isArray(messages) || messages.length === 0) {
      return { summary: 'No conversation history recorded.', bullets: [] };
    }

    const messageCount = messages.length;
    const userMessages = messages.filter(m => m.fromMe === false || m.role === 'user');
    const lastUserText = userMessages.length ? (userMessages[userMessages.length - 1].body || '') : '';

    const bullets = [
      `Engagement: ${messageCount} total messages exchanged; active dialogue maintained.`,
      `Client Intent: Interested in property inquiry (Latest note: "${lastUserText.slice(0, 80)}").`,
      `Next Action: Broker follow-up recommended with tailored community proposal.`,
    ];

    return {
      messageCount,
      bullets,
      summary: bullets.join('\n'),
      generatedAt: Date.now(),
    };
  }
}

export default new ExecutiveConversationCondenser();

