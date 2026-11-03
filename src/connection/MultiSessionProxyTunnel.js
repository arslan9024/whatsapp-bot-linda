/**
 * MultiSessionProxyTunnel.js
 * 
 * Single responsibility: Configure and validate dedicated HTTP/SOCKS5 residential
 * proxies per WhatsApp session to prevent IP reputation contamination across numbers.
 * 
 * Category: 2️⃣ Domain / Feature (src/connection/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class MultiSessionProxyTunnel {
  /**
   * @param {Object} [options]
   * @param {Object<string, string>} [options.sessionProxies] - Predefined map of sessionId -> proxyURL
   */
  constructor({ sessionProxies = {} } = {}) {
    /** @type {Map<string, string>} */
    this.proxyMap = new Map(Object.entries(sessionProxies));
  }

  /**
   * Validates format of proxy URL.
   * Supports: http://, https://, socks4://, socks5://
   * 
   * @param {string} proxyUrl
   * @returns {boolean}
   */
  validateProxyUrl(proxyUrl) {
    if (!proxyUrl || typeof proxyUrl !== 'string') return false;
    try {
      const parsed = new URL(proxyUrl);
      return ['http:', 'https:', 'socks4:', 'socks5:'].includes(parsed.protocol) && Boolean(parsed.hostname);
    } catch {
      return false;
    }
  }

  /**
   * Assigns a dedicated proxy to a specific WhatsApp session.
   * 
   * @param {string} sessionId
   * @param {string} proxyUrl
   */
  assignProxy(sessionId, proxyUrl) {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('Valid sessionId is required');
    }
    if (!this.validateProxyUrl(proxyUrl)) {
      throw new Error(`Invalid proxy URL format: "${proxyUrl}"`);
    }
    this.proxyMap.set(sessionId, proxyUrl);
  }

  /**
   * Retrieves the configured proxy URL for a session.
   * 
   * @param {string} sessionId
   * @returns {string|null}
   */
  getProxy(sessionId) {
    return this.proxyMap.get(sessionId) || null;
  }

  /**
   * Returns Puppeteer launch args for the assigned session proxy.
   * 
   * @param {string} sessionId
   * @returns {string[]} Chromium args array (e.g. ['--proxy-server=...'])
   */
  getPuppeteerProxyArgs(sessionId) {
    const proxy = this.getProxy(sessionId);
    if (!proxy) return [];
    return [`--proxy-server=${proxy}`];
  }

  /**
   * Clears assigned proxy for a session.
   * @param {string} sessionId
   */
  removeProxy(sessionId) {
    this.proxyMap.delete(sessionId);
  }

  /**
   * Returns all active proxy assignments.
   * @returns {Object<string, string>}
   */
  getAllAssignments() {
    return Object.fromEntries(this.proxyMap.entries());
  }
}

export default new MultiSessionProxyTunnel();

