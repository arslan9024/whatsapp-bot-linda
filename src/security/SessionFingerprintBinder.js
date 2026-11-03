/**
 * @file SessionFingerprintBinder.js
 * @description Generates and verifies client browser and IP subnet cryptographic fingerprints
 * to bind JWT sessions to physical devices, preventing cookie/token theft and session hijacking.
 * Category: Domain / Feature (Security)
 */

import crypto from 'node:crypto';

export class SessionFingerprintBinder {
  /**
   * Generates a device fingerprint hash from request headers
   * @param {Object} req - Express request or mock
   * @returns {string} Hex fingerprint
   */
  generateFingerprint(req = {}) {
    const userAgent = req.headers?.['user-agent'] || 'unknown_ua';
    const acceptLanguage = req.headers?.['accept-language'] || 'en';
    const ip = req.ip || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';

    // Mask IP to /24 subnet to tolerate minor DHCP ISP fluctuations
    const subnet = ip.split('.').slice(0, 3).join('.');

    const combined = `${userAgent}|${acceptLanguage}|${subnet}`;
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Validates current request fingerprint against session stored fingerprint
   * @param {Object} req
   * @param {string} storedFingerprint
   * @returns {{ valid: boolean, currentFingerprint: string }}
   */
  validateSession(req, storedFingerprint) {
    const currentFingerprint = this.generateFingerprint(req);
    const valid = Boolean(storedFingerprint && currentFingerprint === storedFingerprint);

    return {
      valid,
      currentFingerprint
    };
  }
}

export default new SessionFingerprintBinder();
