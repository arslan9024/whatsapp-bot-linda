/**
 * @file UnifiedContactInboxEventBus.js
 * @description Central event emitter normalizing cross-channel inbound and outbound messages into a unified real-time event stream.
 * Category: 2️⃣ Domain / Feature (Omnichannel Dominance)
 */

export class UnifiedContactInboxEventBus {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.listeners = new Map(); // eventName -> Array<callback>
    this.recentEvents = [];
    this.maxEventLog = options.maxEventLog || 50;
  }

  /**
   * Subscribes to events.
   * @param {string} eventName
   * @param {Function} callback
   */
  on(eventName, callback) {
    const list = this.listeners.get(eventName) || [];
    list.push(callback);
    this.listeners.set(eventName, list);
  }

  /**
   * Emits unified interaction event.
   * @param {Object} eventData
   * @param {string} eventData.channel ('WHATSAPP', 'INSTAGRAM', 'TELEGRAM', 'WEB')
   * @param {string} eventData.contactId
   * @param {string} eventData.eventType ('MESSAGE_RECEIVED', 'MESSAGE_SENT', 'FORM_SUBMITTED')
   * @param {string} eventData.payloadSnippet
   * @returns {Object}
   */
  emitEvent(eventData) {
    const normalized = {
      eventId: `EVT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase(),
      timestamp: new Date().toISOString(),
      ...eventData
    };

    this.recentEvents.unshift(normalized);
    if (this.recentEvents.length > this.maxEventLog) this.recentEvents.pop();

    const callbacks = this.listeners.get(eventData.eventType) || [];
    for (const cb of callbacks) {
      try { cb(normalized); } catch (e) { /* ignore listener error */ }
    }

    return normalized;
  }

  /**
   * Gets recent unified event stream.
   * @returns {Array<Object>}
   */
  getEventStream() {
    return [...this.recentEvents];
  }
}

export default new UnifiedContactInboxEventBus();
