/**
 * @file WhatsAppCommunityTopicRouter.js
 * @description Routes incoming buyer inquiries into specialized micro-community sub-groups (e.g. Luxury Villas, Off-Plan Flipping, Palm Jebel Ali Investors).
 * Category: 2️⃣ Domain / Feature (Community Intelligence)
 */

export class WhatsAppCommunityTopicRouter {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.topicSubgroups = options.topicSubgroups || {
      'palm-jebel-ali': { groupName: 'Palm Jebel Ali Private Syndicate', inviteLink: 'https://chat.whatsapp.com/samplePJA' },
      'off-plan-flipping': { groupName: 'Dubai Off-Plan Flips & Distress', inviteLink: 'https://chat.whatsapp.com/sampleFlips' },
      'luxury-waterfront': { groupName: 'Dubai Waterfront & Island Ultra-Luxury', inviteLink: 'https://chat.whatsapp.com/sampleLuxury' },
      'commercial-offices': { groupName: 'DIFC & Downtown Grade-A Commercial', inviteLink: 'https://chat.whatsapp.com/sampleOffices' }
    };
  }

  /**
   * Resolves appropriate sub-group based on user intent keywords.
   * @param {string} userQuery
   * @returns {Object}
   */
  resolveTopicSubgroup(userQuery = '') {
    const lower = userQuery.toLowerCase();

    let matchedKey = 'off-plan-flipping';
    if (lower.includes('jebel ali') || lower.includes('pja')) matchedKey = 'palm-jebel-ali';
    else if (lower.includes('luxury') || lower.includes('penthouse') || lower.includes('beachfront') || lower.includes('island')) matchedKey = 'luxury-waterfront';
    else if (lower.includes('office') || lower.includes('commercial') || lower.includes('difc')) matchedKey = 'commercial-offices';

    const group = this.topicSubgroups[matchedKey];

    return {
      matchedTopicKey: matchedKey,
      subgroupName: group.groupName,
      inviteLink: group.inviteLink,
      routingMessage: `For dedicated inventory updates on this sector, you can join our private syndicate: *${group.groupName}* 👉 ${group.inviteLink}`
    };
  }
}

export default new WhatsAppCommunityTopicRouter();
