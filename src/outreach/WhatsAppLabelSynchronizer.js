/**
 * WhatsAppLabelSynchronizer.js
 * 
 * Single responsibility: Map and synchronize native WhatsApp Business labels with CRM pipeline stages.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const STANDARD_LABEL_MAP = Object.freeze({
  1: 'New Lead',
  2: 'Prospect Qualified',
  3: 'Viewing Scheduled',
  4: 'Negotiation',
  5: 'Closed Won',
  6: 'Dormant / Archive',
});

export class WhatsAppLabelSynchronizer {
  constructor({ labelMap = STANDARD_LABEL_MAP } = {}) {
    this.labelMap = { ...labelMap };
    /** @type {Map<string, Set<number>>} */
    this.chatLabels = new Map();
  }

  assignLabel(chatId, labelId) {
    if (!chatId) throw new Error('chatId is required');
    if (!this.labelMap[labelId]) throw new Error(`Unknown label ID: ${labelId}`);

    if (!this.chatLabels.has(chatId)) {
      this.chatLabels.set(chatId, new Set());
    }
    this.chatLabels.get(chatId).add(Number(labelId));
  }

  removeLabel(chatId, labelId) {
    if (!this.chatLabels.has(chatId)) return;
    this.chatLabels.get(chatId).delete(Number(labelId));
  }

  getLabels(chatId) {
    const ids = Array.from(this.chatLabels.get(chatId) || []);
    return ids.map(id => ({ id, name: this.labelMap[id] }));
  }

  hasLabel(chatId, labelId) {
    return Boolean(this.chatLabels.get(chatId)?.has(Number(labelId)));
  }
}

export default new WhatsAppLabelSynchronizer();
