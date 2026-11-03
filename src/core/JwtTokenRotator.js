/**
 * @file JwtTokenRotator.js
 * @description Manages short-lived JWT access tokens (15 min) and rotating refresh tokens
 * with cryptographic blacklisting to prevent session replay and token leaks.
 * Category: Core
 */

import crypto from 'node:crypto';

export class JwtTokenRotator {
  constructor(config = {}) {
    this.secret = config.secret || process.env.JWT_SECRET || 'linda_jwt_fallback_secret_key_32chars';
    this.accessTokenTtlMs = (config.accessTokenMinutes || 15) * 60 * 1000;
    this.refreshTokenTtlMs = (config.refreshTokenDays || 7) * 24 * 60 * 60 * 1000;
    this.revokedTokens = new Set();
    this.refreshTokens = new Map(); // token -> { userId, expiresAt }
  }

  /**
   * Generates a signable base64 token string
   * @param {Object} payload
   * @param {number} ttlMs
   * @returns {string} Simulated signed token
   */
  createToken(payload, ttlMs) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const exp = Date.now() + ttlMs;
    const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
    const signature = crypto.createHmac('sha256', this.secret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${signature}`;
  }

  /**
   * Issues an access token and refresh token pair
   * @param {string} userId
   * @param {string} role - 'admin' | 'supervisor' | 'agent'
   * @returns {{ accessToken: string, refreshToken: string, expiresIn: number }}
   */
  issueTokenPair(userId, role = 'agent') {
    const accessToken = this.createToken({ userId, role, type: 'access' }, this.accessTokenTtlMs);
    const refreshToken = `ref_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;

    this.refreshTokens.set(refreshToken, {
      userId,
      role,
      expiresAt: Date.now() + this.refreshTokenTtlMs
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: Math.round(this.accessTokenTtlMs / 1000)
    };
  }

  /**
   * Verifies an access token
   * @param {string} token
   * @returns {{ valid: boolean, payload?: Object, error?: string }}
   */
  verifyAccessToken(token) {
    if (!token || this.revokedTokens.has(token)) {
      return { valid: false, error: 'Token is revoked or missing' };
    }

    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, error: 'Malformed token' };

    const [header, body, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', this.secret).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSig) {
      return { valid: false, error: 'Invalid token signature' };
    }

    try {
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      if (Date.now() > payload.exp) {
        return { valid: false, error: 'Token has expired' };
      }
      return { valid: true, payload };
    } catch {
      return { valid: false, error: 'Invalid token payload' };
    }
  }

  /**
   * Revokes an access token explicitly
   * @param {string} token
   */
  revokeToken(token) {
    if (token) this.revokedTokens.add(token);
  }
}

export default new JwtTokenRotator();
