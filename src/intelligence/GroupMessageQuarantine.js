/**
 * GroupMessageQuarantine.js
 * 
 * Single responsibility: Filter and quarantine noisy WhatsApp group traffic while capturing mentions.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class GroupMessageQuarantine {
  constructor({ botJid = '971500000000@c.us' } = {}) {
    this.botJid = botJid;
    /** @type {Array<Object>} */
    this.quarantined = [];
    this.maxQuarantine = 500;
  }

  isGroupJid(jid = '') {
    return typeof jid === 'string' && jid.endsWith('@g.us');
  }

  shouldProcessGroupMessage(message) {
    if (!message || !this.isGroupJid(message.from)) {
      return { process: true, reason: 'DIRECT_CHAT' };
    }

    const mentions = Array.isArray(message.mentionedIds) ? message.mentionedIds : [];
    const isBotMentioned = mentions.includes(this.botJid) || (typeof message.body === 'string' && message.body.includes('@Linda'));

    if (isBotMentioned) {
      return { process: true, reason: 'BOT_MENTIONED' };
    }

    this._quarantine(message);
    return { process: false, reason: 'QUARANTINED_GROUP_NOISE' };
  }

  _quarantine(msg) {
    if (this.quarantined.length >= this.maxQuarantine) {
      this.quarantined.shift();
    }
    this.quarantined.push({
      id: msg.id,
      from: msg.from,
      sender: msg.author || msg.from,
      timestamp: Date.now(),
    });
  }

  getQuarantinedCount() {
    return this.quarantined.length;
  }
}

export default new GroupMessageQuarantine();

