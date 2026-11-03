/**
 * @file DeadLetterQueueInspector.js
 * @description Inspects, filters, and manages failed outbound messages in the Dead
 * Letter Queue (DLQ), providing replay, retry, and discard mechanisms.
 * Category: Dev-ops / Tools
 */

export class DeadLetterQueueInspector {
  constructor() {
    this.deadLetterItems = new Map(); // id -> item
  }

  /**
   * Adds a failed message to the DLQ
   * @param {Object} failedPayload
   * @param {string} failedPayload.recipientJid
   * @param {string} failedPayload.messageContent
   * @param {string} failedPayload.errorReason
   * @returns {string} DLQ item ID
   */
  enqueueFailed(failedPayload) {
    const id = `dlq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.deadLetterItems.set(id, {
      id,
      ...failedPayload,
      failedAt: new Date().toISOString(),
      retryCount: 0,
      status: 'FAILED'
    });
    return id;
  }

  /**
   * Retrieves summary and list of failed items
   * @param {string} [statusFilter]
   * @returns {Array<Object>}
   */
  listFailed(statusFilter) {
    const items = Array.from(this.deadLetterItems.values());
    if (statusFilter) {
      return items.filter(i => i.status === statusFilter);
    }
    return items;
  }

  /**
   * Requeues an item for retry
   * @param {string} id
   * @returns {Object|null}
   */
  requeueItem(id) {
    const item = this.deadLetterItems.get(id);
    if (!item) return null;

    item.status = 'REQUEUED';
    item.retryCount++;
    item.lastRetriedAt = new Date().toISOString();

    return item;
  }

  /**
   * Discards an unrecoverable DLQ item
   * @param {string} id
   * @returns {boolean}
   */
  discardItem(id) {
    return this.deadLetterItems.delete(id);
  }
}

export default new DeadLetterQueueInspector();
