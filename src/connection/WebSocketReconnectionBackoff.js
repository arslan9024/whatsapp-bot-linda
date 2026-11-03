/**
 * WebSocketReconnectionBackoff.js
 * 
 * Single responsibility: Calculate jittered exponential backoff intervals
 * for silent WebSocket and companion device re-handshaking without process churn.
 * 
 * Category: 2️⃣ Domain / Feature (src/connection/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class WebSocketReconnectionBackoff {
  /**
   * @param {Object} [options]
   * @param {number} [options.baseDelayMs=1000] - Initial delay
   * @param {number} [options.maxDelayMs=30000] - Delay ceiling
   * @param {number} [options.factor=1.8]       - Multiplier per retry
   * @param {number} [options.jitterRatio=0.25] - Randomization ratio (0 to 1)
   */
  constructor({
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    factor = 1.8,
    jitterRatio = 0.25,
  } = {}) {
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
    this.factor = factor;
    this.jitterRatio = jitterRatio;
    /** @type {Map<string, number>} */
    this.retryCounts = new Map();
  }

  /**
   * Computes the next reconnect delay for a specific session with jitter.
   * 
   * @param {string} sessionId
   * @returns {number} Delay in milliseconds
   */
  getNextDelay(sessionId) {
    const attempts = (this.retryCounts.get(sessionId) || 0) + 1;
    this.retryCounts.set(sessionId, attempts);

    const rawDelay = Math.min(
      this.baseDelayMs * Math.pow(this.factor, attempts - 1),
      this.maxDelayMs
    );

    // Apply randomized symmetric jitter
    const jitterMax = rawDelay * this.jitterRatio;
    const jitter = (Math.random() * 2 - 1) * jitterMax;
    const finalDelay = Math.max(100, Math.round(rawDelay + jitter));

    return finalDelay;
  }

  /**
   * Resets the retry counter upon successful reconnection.
   * @param {string} sessionId
   */
  reset(sessionId) {
    this.retryCounts.delete(sessionId);
  }

  /**
   * Returns current retry attempt count for session.
   * @param {string} sessionId
   * @returns {number}
   */
  getAttempts(sessionId) {
    return this.retryCounts.get(sessionId) || 0;
  }
}

export default new WebSocketReconnectionBackoff();

