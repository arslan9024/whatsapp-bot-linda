/**
 * @file MaliciousLinkDetector.js
 * @description Analyzes URLs sent by prospective leads in WhatsApp messages to detect
 * phishing portals, IP grabbers (Grabify), credential harvesters, and malicious redirects.
 * Category: Domain / Feature (Security)
 */

export class MaliciousLinkDetector {
  constructor() {
    this.knownBadDomains = new Set([
      'grabify.link',
      'iplogger.org',
      '2no.co',
      'yip.su',
      'bit.do',
      'cutt.us'
    ]);
    this.suspiciousKeywords = [
      'login-emiratesnbd',
      'dubai-land-department-verify',
      'rera-escrow-portal',
      'verify-account',
      'security-update'
    ];
  }

  /**
   * Extracts URLs from a given message string
   * @param {string} text
   * @returns {Array<string>}
   */
  extractUrls(text = '') {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    return text.match(urlRegex) || [];
  }

  /**
   * Evaluates a URL for malicious indicators
   * @param {string} urlString
   * @returns {{ isSafe: boolean, riskLevel: 'NONE'|'LOW'|'HIGH', reason?: string }}
   */
  evaluateUrl(urlString) {
    try {
      const parsed = new URL(urlString);
      const hostname = parsed.hostname.toLowerCase();

      // Check known grabbers
      if (this.knownBadDomains.has(hostname)) {
        return { isSafe: false, riskLevel: 'HIGH', reason: 'Known IP logger or malicious tracking link' };
      }

      // Check for spoofed bank/government keywords in non-official domains
      for (const kw of this.suspiciousKeywords) {
        if (hostname.includes(kw) && !hostname.endsWith('.gov.ae')) {
          return { isSafe: false, riskLevel: 'HIGH', reason: 'Suspected banking or RERA phishing portal' };
        }
      }

      // Check IP address hostname
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
        return { isSafe: false, riskLevel: 'HIGH', reason: 'Raw IP address host detected' };
      }

      return { isSafe: true, riskLevel: 'NONE' };
    } catch {
      return { isSafe: false, riskLevel: 'LOW', reason: 'Malformed URL' };
    }
  }

  /**
   * Scans a full message text for malicious links
   * @param {string} text
   * @returns {{ hasThreat: boolean, scannedCount: number, threats: Array<Object> }}
   */
  scanMessage(text = '') {
    const urls = this.extractUrls(text);
    const threats = [];

    for (const url of urls) {
      const check = this.evaluateUrl(url);
      if (!check.isSafe) {
        threats.push({ url, ...check });
      }
    }

    return {
      hasThreat: threats.length > 0,
      scannedCount: urls.length,
      threats
    };
  }
}

export default new MaliciousLinkDetector();

