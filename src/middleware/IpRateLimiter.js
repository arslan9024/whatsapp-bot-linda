/**
 * @file IpRateLimiter.js
 * @description In-memory sliding-window IP rate limiter middleware for Web UI & API endpoints
 * (/api/login, /api/scripts, webhooks) preventing brute-force and DDoS attempts.
 * Category: API / Server
 */

export class IpRateLimiter {
  constructor(config = {}) {
    this.windowMs = config.windowMs || 60 * 1000; // 1 minute default
    this.maxRequests = config.maxRequests || 60; // 60 requests per minute
    this.hits = new Map(); // ip -> Array<timestamp>
  }

  /**
   * Evaluates request from IP address
   * @param {string} ip
   * @param {number} [customLimit]
   * @returns {{ allowed: boolean, remaining: number, resetMs: number }}
   */
  check(ip, customLimit) {
    if (!ip) return { allowed: true, remaining: this.maxRequests, resetMs: 0 };

    const limit = customLimit || this.maxRequests;
    const now = Date.now();
    const timestamps = this.hits.get(ip) || [];

    // Filter out timestamps outside window
    const validTimestamps = timestamps.filter(t => (now - t) < this.windowMs);

    if (validTimestamps.length >= limit) {
      const oldest = validTimestamps[0];
      const resetMs = Math.max(0, this.windowMs - (now - oldest));
      this.hits.set(ip, validTimestamps);
      return { allowed: false, remaining: 0, resetMs };
    }

    validTimestamps.push(now);
    this.hits.set(ip, validTimestamps);

    return {
      allowed: true,
      remaining: limit - validTimestamps.length,
      resetMs: this.windowMs
    };
  }

  /**
   * Express middleware factory
   * @param {number} [customLimit]
   */
  middleware(customLimit) {
    return (req, res, next) => {
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      const result = this.check(ip, customLimit);

      res.setHeader('X-RateLimit-Limit', customLimit || this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);

      if (!result.allowed) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfterMs: result.resetMs
        });
      }

      next();
    };
  }
}

export default new IpRateLimiter();

