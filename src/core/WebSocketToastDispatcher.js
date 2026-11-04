/**
 * @file WebSocketToastDispatcher.js
 * @description Broadcasts prioritized toast events (VIP lead alert, SLA warning, system health)
 * across connected operations WebSockets for instant visual notification.
 * Category: Core
 */

export class WebSocketToastDispatcher {
  constructor() {
    this.connectedSockets = new Set();
  }

  /**
   * Registers an active client WebSocket connection
   * @param {Object} ws
   */
  registerClient(ws) {
    this.connectedSockets.add(ws);
  }

  /**
   * Removes a disconnected client WebSocket
   * @param {Object} ws
   */
  removeClient(ws) {
    this.connectedSockets.delete(ws);
  }

  /**
   * Formats a toast message payload
   * @param {string} title
   * @param {string} message
   * @param {'info'|'success'|'warning'|'error'} [type]
   * @param {Object} [meta]
   * @returns {Object} Structured toast payload
   */
  createToast(title, message, type = 'info', meta = {}) {
    return {
      toastId: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      type,
      title,
      message,
      meta
    };
  }

  /**
   * Dispatches a toast to all connected clients
   * @param {string} title
   * @param {string} message
   * @param {'info'|'success'|'warning'|'error'} [type]
   * @param {Object} [meta]
   * @returns {number} Count of clients notified
   */
  broadcastToast(title, message, type = 'info', meta = {}) {
    const toast = this.createToast(title, message, type, meta);
    const serialized = JSON.stringify({ event: 'TOAST_NOTIFICATION', data: toast });

    let sent = 0;
    for (const ws of this.connectedSockets) {
      try {
        if (ws.readyState === 1) { // OPEN
          ws.send(serialized);
          sent++;
        }
      } catch {
        // Discard failed send
      }
    }

    return sent;
  }
}

export default new WebSocketToastDispatcher();

