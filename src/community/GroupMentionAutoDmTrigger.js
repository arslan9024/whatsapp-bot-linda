/**
 * @file GroupMentionAutoDmTrigger.js
 * @description Listens for explicit bot mentions or brand name citations in group chats, instantly diverting the conversation into a private 1-on-1 direct message.
 * Category: 2️⃣ Domain / Feature (Community Intelligence)
 */

export class GroupMentionAutoDmTrigger {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.monitoredKeywords = (options.monitoredKeywords || ['linda', '@linda', 'goraha', 'poweragent']).map(k => k.toLowerCase());
  }

  /**
   * Detects if message warrants an automated private DM response.
   * @param {string} rawText
   * @param {string} senderPhone
   * @param {string} groupName
   * @returns {Object|null}
   */
  detectMentionAndBuildDm(rawText, senderPhone, groupName) {
    if (!rawText || typeof rawText !== 'string') return null;

    const lower = rawText.toLowerCase();
    const hasMention = this.monitoredKeywords.some(kw => lower.includes(kw));

    if (!hasMention) return null;

    return {
      senderPhone,
      sourceGroup: groupName,
      triggeredKeyword: this.monitoredKeywords.find(kw => lower.includes(kw)),
      divertToDm: true,
      suggestedGroupReply: `@${senderPhone.replace(/[^0-9]/g, '')} I've sent you a direct message to assist you privately! 📩`,
      privateDmPayload: {
        text: `Hi there! I noticed you mentioned me in *${groupName}*. How can Linda AI assist with your Dubai property inquiry today?`,
        quickReplyButtons: ['Browse New Launches', 'Book Private Consultation', 'Speak with Senior Broker']
      }
    };
  }
}

export default new GroupMentionAutoDmTrigger();
