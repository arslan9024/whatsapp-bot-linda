/**
 * Google Authentication Service
 * Handles JWT and OAuth2 authentication for Google APIs
 * 
 * Version: 1.0.0
 * Last Updated: February 7, 2026
 */

const jwt = require('jsonwebtoken');
const axios = require('axios');
const { logger } = require('../utils/logger');
const { errorHandler } = require('../utils/errorHandler');
const { getCredentialsManager } = require('../config/credentials');
const { GOOGLE_SCOPES, API_ENDPOINTS, SERVICE_CONFIG } = require('../config/constants');

// ============================================================================
// CLASS: AuthenticationService
// ============================================================================

class AuthenticationService {
  /**
   * Initialize authentication service
   * @param {Object} config - Configuration
   * @param {Object} config.credentials - Google credentials object
   * @param {string[]} config.scopes - OAuth scopes
   * @param {Object} config.options - Additional options
   */
  constructor(config = {}) {
    this.credentials = config.credentials || null;
    this.scopes = config.scopes || [];
    this.options = config.options || {};
    
    // Token management
    this.accessToken = null;
    this.accessTokenExpires = null;
    this.refreshToken = null;
    
    // Authentication state
    this.isAuthenticated = false;
    this.authMethod = null; // 'jwt' or 'oauth2'
    
    // Multi-account support
    this.accounts = new Map();
    this.activeAccount = null;
    
    // Metrics
    this.metrics = {
      authAttempts: 0,
      authFailures: 0,
      tokenRefreshes: 0,
      tokenRefreshFailures: 0,
    };
    
    logger.info('AuthenticationService initialized');
  }

  /**
   * Load credentials
   * @param {Object} credentials - Credentials object
   */
  loadCredentials(credentials) {
    if (!credentials) {
      throw errorHandler.handleValidationError('Credentials cannot be null');
    }

    this.credentials = credentials;
    logger.info('Credentials loaded');
  }

  /**
   * Authenticate using JWT (service account)
   * @param {Object} credentials - Service account credentials
   * @param {string[]} scopes - OAuth scopes
   * @returns {Promise<string>} Access token
   */
  async authenticateJWT(credentials = null, scopes = null) {
    try {
      this.metrics.authAttempts++;

      const creds = credentials || this.credentials;
      const scopesToUse = scopes || this.scopes;

      if (!creds) {
        throw errorHandler.handleAuthError(
          new Error('No credentials provided for JWT authentication')
        );
      }

      if (creds.type !== 'service_account') {
        throw errorHandler.handleValidationError(
          'JWT authentication requires service_account credentials'
        );
      }

      logger.info('Starting JWT authentication', { account: creds.client_email });

      // Create JWT claim
      const now = Math.floor(Date.now() / 1000);
      const claim = {
        iss: creds.client_email,
        scope: scopesToUse.join(' '),
        aud: API_ENDPOINTS.OAUTH_TOKEN_URL,
        exp: now + 3600, // 1 hour
        iat: now,
      };

      // Sign JWT
      const token = jwt.sign(claim, creds.private_key, {
        algorithm: 'RS256',
        keyid: creds.private_key_id,
      });

      logger.debug('JWT token created', { account: creds.client_email });

      // Exchange JWT for access token
      const accessToken = await this.exchangeJWTForToken(token);

      // Store authentication state
      this.accessToken = accessToken.access_token;
      this.accessTokenExpires = now + accessToken.expires_in;
      this.isAuthenticated = true;
      this.authMethod = 'jwt';

      // Store account info
      this.activeAccount = creds.client_email;
      this.accounts.set(creds.client_email, {
        credentials: creds,
        token: accessToken,
        lastAuthenticated: new Date(),
      });

      logger.info('JWT authentication successful', { account: creds.client_email });
      logger.logAuthEvent('jwt_authenticated', creds.client_email);

      return accessToken.access_token;
    } catch (error) {
      this.metrics.authFailures++;
      logger.error('JWT authentication failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Exchange JWT for access token
   * @param {string} jwt - JWT token
   * @returns {Promise<Object>} Token response
   * @private
   */
  async exchangeJWTForToken(jwt) {
    try {
      const params = new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      });

      logger.debug('Exchanging JWT for access token');

      const response = await axios.post(API_ENDPOINTS.OAUTH_TOKEN_URL, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      logger.debug('JWT exchange successful', { 
        expiresIn: response.data.expires_in 
      });

      return response.data;
    } catch (error) {
      logger.error('JWT exchange failed', { error: error.message });
      throw errorHandler.handleAuthError(error);
    }
  }

  /**
   * Authenticate using OAuth2
   * @param {string} authCode - Authorization code
   * @param {Object} clientConfig - Client configuration (client_id, client_secret, redirect_uri)
   * @returns {Promise<Object>} Token response
   */
  async authenticateOAuth2(authCode, clientConfig = null) {
    try {
      this.metrics.authAttempts++;

      if (!authCode) {
        throw errorHandler.handleValidationError('Authorization code is required');
      }

      const config = clientConfig || this.credentials;

      if (!config.client_id || !config.client_secret) {
        throw errorHandler.handleValidationError(
          'client_id and client_secret required for OAuth2'
        );
      }

      logger.info('Starting OAuth2 authentication');

      const params = new URLSearchParams({
        code: authCode,
        client_id: config.client_id,
        client_secret: config.client_secret,
        redirect_uri: config.redirect_uri || 'http://localhost',
        grant_type: 'authorization_code',
      });

      const response = await axios.post(API_ENDPOINTS.OAUTH_TOKEN_URL, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // Store token information
      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token || this.refreshToken;
      this.accessTokenExpires = Math.floor(Date.now() / 1000) + response.data.expires_in;
      this.isAuthenticated = true;
      this.authMethod = 'oauth2';

      logger.info('OAuth2 authentication successful');
      logger.logAuthEvent('oauth2_authenticated', 'user');

      return response.data;
    } catch (error) {
      this.metrics.authFailures++;
      logger.error('OAuth2 authentication failed', { error: error.message });
      throw errorHandler.handleAuthError(error);
    }
  }

  /**
   * Refresh access token using refresh token
   * @returns {Promise<string>} New access token
   */
  async refreshToken() {
    try {
      this.metrics.tokenRefreshes++;

      if (!this.refreshToken) {
        throw errorHandler.handleAuthError(
          new Error('No refresh token available')
        );
      }

      logger.info('Refreshing access token');

      const params = new URLSearchParams({
        client_id: this.credentials.client_id,
        client_secret: this.credentials.client_secret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token',
      });

      const response = await axios.post(API_ENDPOINTS.OAUTH_TOKEN_URL, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      this.accessToken = response.data.access_token;
      this.accessTokenExpires = Math.floor(Date.now() / 1000) + response.data.expires_in;

      logger.info('Token refresh successful');
      logger.logAuthEvent('token_refreshed', this.activeAccount);

      return this.accessToken;
    } catch (error) {
      this.metrics.tokenRefreshFailures++;
      logger.error('Token refresh failed', { error: error.message });
      throw errorHandler.handleAuthError(error);
    }
  }

  /**
   * Get current access token
   * @returns {Promise<string>} Access token
   */
  async getAccessToken() {
    // Check if token needs refresh
    if (this.isTokenExpired()) {
      logger.debug('Token expired, refreshing...');
      
      if (this.authMethod === 'jwt') {
        // Re-authenticate with JWT
        return await this.authenticateJWT();
      } else if (this.authMethod === 'oauth2') {
        // Refresh token
        return await this.refreshToken();
      }
    }

    if (!this.accessToken) {
      throw errorHandler.handleAuthError(
        new Error('No access token available. Please authenticate first.')
      );
    }

    return this.accessToken;
  }

  /**
   * Check if token is expired
   * @returns {boolean} True if token is expired
   */
  isTokenExpired() {
    if (!this.accessTokenExpires) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    const threshold = SERVICE_CONFIG.TOKEN.refreshThreshold / 1000; // Convert to seconds

    return this.accessTokenExpires <= (now + threshold);
  }

  /**
   * Validate token
   * @param {string} token - Token to validate
   * @returns {Promise<boolean>} True if valid
   */
  async validateToken(token = null) {
    try {
      const tokenToValidate = token || this.accessToken;

      if (!tokenToValidate) {
        return false;
      }

      // For JWT tokens, we can decode and verify locally
      if (this.authMethod === 'jwt' && this.credentials?.private_key) {
        try {
          jwt.verify(tokenToValidate, this.credentials.public_key || this.credentials.private_key);
          return true;
        } catch (error) {
          return false;
        }
      }

      // For other tokens, we'd need to validate with Google
      // This is a simplified check
      return tokenToValidate.length > 0;
    } catch (error) {
      logger.warn('Token validation check failed', { error: error.message });
      return false;
    }
  }

  /**
   * Revoke token (logout)
   * @param {string} token - Token to revoke
   * @returns {Promise<boolean>} True if successful
   */
  async revokeToken(token = null) {
    try {
      const tokenToRevoke = token || this.accessToken;

      if (!tokenToRevoke) {
        logger.warn('No token to revoke');
        return false;
      }

      logger.info('Revoking token');

      await axios.post(`${API_ENDPOINTS.OAUTH_REVOKE_URL}?token=${tokenToRevoke}`);

      // Clear authentication state
      this.accessToken = null;
      this.accessTokenExpires = null;
      this.isAuthenticated = false;

      logger.info('Token revoked successfully');
      logger.logAuthEvent('token_revoked', this.activeAccount);

      return true;
    } catch (error) {
      logger.warn('Token revocation failed', { error: error.message });
      return false;
    }
  }

  /**
   * Set scopes
   * @param {string[]} scopes - Array of scope strings
   */
  setScopes(scopes) {
    if (!Array.isArray(scopes)) {
      throw errorHandler.handleValidationError('Scopes must be an array');
    }
    this.scopes = scopes;
    logger.debug('Scopes updated', { count: scopes.length });
  }

  /**
   * Add scope
   * @param {string} scope - Scope to add
   */
  addScope(scope) {
    if (!this.scopes.includes(scope)) {
      this.scopes.push(scope);
      logger.debug('Scope added', { scope });
    }
  }

  /**
   * Get authentication status
   * @returns {Object} Authentication status
   */
  getStatus() {
    return {
      isAuthenticated: this.isAuthenticated,
      authMethod: this.authMethod,
      activeAccount: this.activeAccount,
      tokenExpired: this.isTokenExpired(),
      accounts: Array.from(this.accounts.keys()),
    };
  }

  /**
   * Add account for multi-account support
   * @param {string} email - Account email
   * @param {Object} accountInfo - Account information
   */
  addAccount(email, accountInfo) {
    this.accounts.set(email, accountInfo);
    logger.info('Account added', { email });
  }

  /**
   * Switch active account
   * @param {string} email - Account email
   */
  switchAccount(email) {
    if (!this.accounts.has(email)) {
      throw errorHandler.handleValidationError(`Account not found: ${email}`);
    }

    const accountInfo = this.accounts.get(email);
    this.activeAccount = email;
    this.accessToken = accountInfo.token?.access_token || null;
    this.accessTokenExpires = accountInfo.token?.expires_in || null;

    logger.info('Active account switched', { email });
  }

  /**
   * Get authentication metrics
   * @returns {Object} Metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Reset authentication metrics
   */
  resetMetrics() {
    this.metrics = {
      authAttempts: 0,
      authFailures: 0,
      tokenRefreshes: 0,
      tokenRefreshFailures: 0,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let authServiceInstance = null;

/**
 * Get or create authentication service instance
 * @param {Object} config - Configuration
 * @returns {AuthenticationService} Service instance
 */
function getAuthenticationService(config = {}) {
  if (!authServiceInstance) {
    authServiceInstance = new AuthenticationService(config);
  }
  return authServiceInstance;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  AuthenticationService,
  getAuthenticationService,
};
