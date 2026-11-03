/**
 * @file IpAllowlistGuard.js
 * @description Restricts administrative endpoints and internal operations dashboards
 * to approved corporate office and VPN IP addresses and subnets.
 * Category: API / Server
 */

export class IpAllowlistGuard {
  constructor(config = {}) {
    this.allowedIps = new Set(config.allowedIps || ['127.0.0.1', '::1', 'localhost']);
    this.allowedSubnets = config.allowedSubnets || ['10.', '192.168.', '172.16.'];
    this.enabled = config.enabled ?? true;
  }

  /**
   * Adds an IP or subnet to the allowlist
   * @param {string} ipOrSubnet
   */
  allow(ipOrSubnet) {
    if (ipOrSubnet.endsWith('.')) {
      this.allowedSubnets.push(ipOrSubnet);
    } else {
      this.allowedIps.add(ipOrSubnet);
    }
  }

  /**
   * Tests whether an incoming IP is permitted
   * @param {string} ip
   * @returns {boolean}
   */
  isAllowed(ip) {
    if (!this.enabled) return true;
    if (!ip) return false;

    // Direct match
    if (this.allowedIps.has(ip)) return true;

    // Subnet match
    for (const prefix of this.allowedSubnets) {
      if (ip.startsWith(prefix)) return true;
    }

    return false;
  }

  /**
   * Express middleware factory for route protection
   */
  middleware() {
    return (req, res, next) => {
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      if (!this.isAllowed(ip)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access restricted to authorized office networks.'
        });
      }
      next();
    };
  }
}

export default new IpAllowlistGuard();
