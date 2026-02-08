/**
 * OAuth2 Handler for Google User Accounts
 * Handles OAuth2 authorization flow for user accounts like GorahaBot
 * 
 * Usage:
 *   const handler = new OAuth2Handler();
 *   const url = handler.getAuthorizationUrl();
 *   // User visits URL and gets code
 *   await handler.exchangeCodeForToken(code);
 *   const token = handler.getToken();
 */

import { google } from 'googleapis';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ════════════════════════════════════════════════════════════════
// OAUTH2 HANDLER
// ════════════════════════════════════════════════════════════════

class OAuth2Handler {
  constructor(accountName = 'GorahaBot', keysFile = 'keys-goraha.json') {
    this.accountName = accountName;
    this.keysPath = join(__dirname, keysFile);
    this.tokenDirPath = join(__dirname, '..', '..', '.tokens');
    this.tokenPath = join(this.tokenDirPath, `${accountName.toLowerCase()}-token.json`);
    
    this.oauth2Client = null;
    this.token = null;
    this.isAuthorized = false;

    console.log(`📋 OAuth2Handler initialized for ${accountName}`);
  }

  /**
   * Initialize OAuth2 client from keys file
   * @returns {boolean} Success
   */
  async initialize() {
    try {
      if (!existsSync(this.keysPath)) {
        throw new Error(`Keys file not found: ${this.keysPath}`);
      }

      const keys = JSON.parse(readFileSync(this.keysPath, 'utf8'));

      // Validate required fields
      if (!keys.client_id || !keys.client_secret || !keys.redirect_uris) {
        throw new Error('Missing required OAuth2 fields in keys file');
      }

      this.oauth2Client = new google.auth.OAuth2(
        keys.client_id,
        keys.client_secret,
        keys.redirect_uris[0] // Use first redirect URI
      );

      console.log(`✅ OAuth2 client initialized for ${this.accountName}`);

      // Check if token already exists
      if (existsSync(this.tokenPath)) {
        await this.loadToken();
      }

      return true;
    } catch (error) {
      console.error('❌ OAuth2 initialization error:', error.message);
      return false;
    }
  }

  /**
   * Get authorization URL for user to visit
   * @param {Array} scopes - OAuth2 scopes
   * @returns {string} Authorization URL
   */
  getAuthorizationUrl(scopes = [
    'https://www.googleapis.com/auth/contacts',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
  ]) {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized');
    }

    const url = this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Required for refresh token
      scope: scopes,
      prompt: 'consent' // Force consent screen to always get refresh token
    });

    return url;
  }

  /**
   * Exchange authorization code for tokens
   * @param {string} code - Authorization code from user
   * @returns {Promise<Object>} Token data
   */
  async exchangeCodeForToken(code) {
    try {
      if (!this.oauth2Client) {
        throw new Error('OAuth2 client not initialized');
      }

      console.log('🔄 Exchanging authorization code for tokens...');

      const { tokens } = await this.oauth2Client.getToken(code);

      // Set credentials
      this.oauth2Client.setCredentials(tokens);
      this.token = tokens;

      // Save token to file
      await this.saveToken();

      this.isAuthorized = true;

      console.log('✅ Token received and saved');
      if (tokens.expiry_date) {
        const expiryDate = new Date(tokens.expiry_date);
        console.log(`   Expires: ${expiryDate.toLocaleString()}`);
      }

      return tokens;
    } catch (error) {
      console.error('❌ Failed to exchange code for token:', error.message);
      throw error;
    }
  }

  /**
   * Load token from file
   * @private
   * @returns {Promise<boolean>}
   */
  async loadToken() {
    try {
      if (!existsSync(this.tokenPath)) {
        console.log(`⚠️  Token file not found: ${this.tokenPath}`);
        return false;
      }

      const tokenData = JSON.parse(readFileSync(this.tokenPath, 'utf8'));
      this.oauth2Client.setCredentials(tokenData);
      this.token = tokenData;
      this.isAuthorized = true;

      console.log(`✅ Token loaded from ${this.tokenPath}`);

      // Check if expired
      if (tokenData.expiry_date) {
        const expiryDate = new Date(tokenData.expiry_date);
        const now = new Date();
        if (now > expiryDate) {
          console.log('⚠️  Token expired, attempting to refresh...');
          await this.refreshToken();
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to load token:', error.message);
      return false;
    }
  }

  /**
   * Save token to file securely
   * @private
   */
  async saveToken() {
    try {
      // Create directory if doesn't exist
      if (!existsSync(this.tokenDirPath)) {
        mkdirSync(this.tokenDirPath, { recursive: true });
      }

      // Save token
      writeFileSync(this.tokenPath, JSON.stringify(this.token, null, 2));

      // Set restrictive permissions (Windows equivalent)
      // Note: On Windows, use ACLs; on Linux, use chmod
      console.log(`✅ Token saved to ${this.tokenPath}`);
    } catch (error) {
      console.error('❌ Failed to save token:', error.message);
      throw error;
    }
  }

  /**
   * Refresh the access token
   * @returns {Promise<Object>} New token
   */
  async refreshToken() {
    try {
      if (!this.oauth2Client) {
        throw new Error('OAuth2 client not initialized');
      }

      console.log('🔄 Refreshing access token...');

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);
      this.token = credentials;

      // Save updated token
      await this.saveToken();

      console.log('✅ Token refreshed');
      return credentials;
    } catch (error) {
      console.error('❌ Failed to refresh token:', error.message);
      throw error;
    }
  }

  /**
   * Get current token
   * @returns {Object} Token data
   */
  getToken() {
    if (!this.isAuthorized) {
      throw new Error('Not authorized. Get token through authorization flow first');
    }

    return this.token;
  }

  /**
   * Get OAuth2 client
   * @returns {Object} OAuth2Client instance
   */
  getClient() {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized');
    }

    return this.oauth2Client;
  }

  /**
   * Check if authorized
   * @returns {boolean}
   */
  isTokenValid() {
    if (!this.token) {
      return false;
    }

    // Check expiry
    if (this.token.expiry_date) {
      const expiryDate = new Date(this.token.expiry_date);
      const now = new Date();
      // Add 5 minute buffer
      return now < new Date(expiryDate.getTime() - 5 * 60000);
    }

    return !!this.token.access_token;
  }

  /**
   * Revoke token (logout)
   * @returns {Promise<boolean>}
   */
  async revokeToken() {
    try {
      if (!this.oauth2Client) {
        throw new Error('OAuth2 client not initialized');
      }

      console.log('🔄 Revoking token...');

      await this.oauth2Client.revokeCredentials();

      this.oauth2Client = null;
      this.token = null;
      this.isAuthorized = false;

      console.log('✅ Token revoked');

      return true;
    } catch (error) {
      console.error('❌ Failed to revoke token:', error.message);
      return false;
    }
  }

  /**
   * Status report
   */
  status() {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log(`║  OAuth2Handler Status - ${this.accountName.padEnd(20)}║`);
    console.log('╚════════════════════════════════════════════╝\n');

    console.log(`Account: ${this.accountName}`);
    console.log(`Keys File: ${this.keysPath}`);
    console.log(`Token File: ${this.tokenPath}`);
    console.log(`Token Path Exists: ${existsSync(this.tokenPath) ? '✅' : '❌'}`);
    console.log(`Authorized: ${this.isAuthorized ? '✅' : '❌'}`);
    console.log(`Token Valid: ${this.isTokenValid() ? '✅' : '❌'}`);

    if (this.token && this.token.expiry_date) {
      const expiryDate = new Date(this.token.expiry_date);
      const now = new Date();
      const minutesLeft = Math.round((expiryDate - now) / 60000);
      console.log(`Token Expires In: ${minutesLeft > 0 ? minutesLeft + ' minutes' : 'EXPIRED'}`);
    }

    console.log('');
  }
}

// ════════════════════════════════════════════════════════════════
// SINGLETON INSTANCES
// ════════════════════════════════════════════════════════════════

const handlers = {};

export async function getOAuth2Handler(accountName = 'GorahaBot', keysFile = 'keys-goraha.json') {
  if (!handlers[accountName]) {
    handlers[accountName] = new OAuth2Handler(accountName, keysFile);
    await handlers[accountName].initialize();
  }
  return handlers[accountName];
}

export default OAuth2Handler;
