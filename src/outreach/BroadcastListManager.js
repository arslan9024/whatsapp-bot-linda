/**
 * BroadcastListManager.js
 * 
 * Single responsibility: Validate and enforce WhatsApp native 256-recipient limit on broadcasts.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const MAX_BROADCAST_RECIPIENTS = 256;

export class BroadcastListManager {
  constructor({ maxRecipients = MAX_BROADCAST_RECIPIENTS } = {}) {
    this.maxRecipients = maxRecipients;
    /** @type {Map<string, Set<string>>} */
    this.lists = new Map();
  }

  createList(listId, initialRecipients = []) {
    if (!listId) throw new Error('listId is required');
    if (initialRecipients.length > this.maxRecipients) {
      throw new Error(`Broadcast list cannot exceed ${this.maxRecipients} recipients.`);
    }
    this.lists.set(listId, new Set(initialRecipients));
    return { listId, recipientCount: this.lists.get(listId).size };
  }

  addRecipient(listId, phone) {
    if (!this.lists.has(listId)) {
      this.lists.set(listId, new Set());
    }
    const set = this.lists.get(listId);
    if (set.size >= this.maxRecipients) {
      throw new Error(`List "${listId}" reached max capacity of ${this.maxRecipients}`);
    }
    set.add(phone);
    return set.size;
  }

  getRecipients(listId) {
    return Array.from(this.lists.get(listId) || []);
  }

  chunkForBroadcast(recipients = []) {
    const chunks = [];
    for (let i = 0; i < recipients.length; i += this.maxRecipients) {
      chunks.push(recipients.slice(i, i + this.maxRecipients));
    }
    return chunks;
  }
}

export default new BroadcastListManager();

