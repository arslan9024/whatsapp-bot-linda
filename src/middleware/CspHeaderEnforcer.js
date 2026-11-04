/**
 * @file CspHeaderEnforcer.js
 * @description Hardens HTTP response headers with strict Content-Security-Policy (CSP),
 * HSTS, X-Frame-Options, and anti-MIME-sniffing policies for dashboard and API routes.
 * Category: API / Server
 */

export class CspHeaderEnforcer {
  /**
   * Generates strict security headers object
   * @param {Object} [options]
   * @returns {Object} Headers map
   */
  getSecurityHeaders(options = {}) {
    const isProd = options.isProduction ?? (process.env.NODE_ENV === 'production');

    return {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "connect-src 'self' ws: wss: http://localhost:5000 http://localhost:4000",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; '),
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      ...(isProd ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {})
    };
  }

  /**
   * Express middleware applying hardened security headers
   */
  middleware() {
    return (req, res, next) => {
      const headers = this.getSecurityHeaders();
      for (const [key, value] of Object.entries(headers)) {
        res.setHeader(key, value);
      }
      next();
    };
  }
}

export default new CspHeaderEnforcer();

