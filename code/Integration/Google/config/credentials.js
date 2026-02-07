/**
 * Google Credentials Management
 * Centralized credential handling for Google services
 * 
 * Version: 1.0.0
 * Last Updated: February 7, 2026
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CLASS: GoogleCredentialsManager
// ============================================================================

class GoogleCredentialsManager {
  /**
   * Initialize credentials manager
   * @param {Object} options - Configuration options
   * @param {string} options.credentialsPath - Path to credentials file
   * @param {string} options.type - Type of credentials (service_account, oauth2, etc.)
   * @param {boolean} options.encrypted - Whether to use encryption
   */
  constructor(options = {}) {
    this.credentialsPath = options.credentialsPath || process.env.GOOGLE_CREDENTIALS_PATH;
    this.type = options.type || 'service_account';
    this.encrypted = options.encrypted || false;
    this.credentials = null;
    this.accounts = new Map(); // For multi-account support
    this.activeAccountEmail = null;
    
    if (!this.credentialsPath) {
      logger.warn('No credentials path provided. Set GOOGLE_CREDENTIALS_PATH environment variable.');
    }
  }

  /**
   * Load credentials from file
   * @returns {Promise<Object>} Loaded credentials
   */
  async loadCredentials() {
    try {
      if (!this.credentialsPath) {
        throw new Error('Credentials path not set');
      }

      if (!fs.existsSync(this.credentialsPath)) {
        throw new Error(`Credentials file not found: ${this.credentialsPath}`);
      }

      const data = fs.readFileSync(this.credentialsPath, 'utf8');
      this.credentials = JSON.parse(data);

      logger.info(`Credentials loaded successfully (Type: ${this.type})`);
      
      // Store as active account
      if (this.credentials.client_email) {
        this.activeAccountEmail = this.credentials.client_email;
        this.accounts.set(this.credentials.client_email, this.credentials);
      }

      return this.credentials;
    } catch (error) {
      logger.error(`Failed to load credentials: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get current credentials
   * @returns {Object} Current credentials
   */
  getCredentials() {
    if (!this.credentials) {
      throw new Error('Credentials not loaded. Call loadCredentials() first.');
    }
    return this.credentials;
  }

  /**
   * Set credentials programmatically
   * @param {Object} credentials - Credentials object
   */
  setCredentials(credentials) {
    if (!credentials) {
      throw new Error('Credentials cannot be null or undefined');
    }

    this.credentials = credentials;

    if (credentials.client_email) {
      this.activeAccountEmail = credentials.client_email;
      this.accounts.set(credentials.client_email, credentials);
    }

    logger.info('Credentials set successfully');
  }

  /**
   * Validate credentials format
   * @param {Object} credentials - Credentials to validate
   * @returns {boolean} True if valid
   */
  validateCredentials(credentials) {
    try {
      if (this.type === 'service_account') {
        const requiredFields = [
          'type',
          'project_id',
          'private_key_id',
          'private_key',
          'client_email',
          'client_id',
          'auth_uri',
          'token_uri',
        ];

        for (const field of requiredFields) {
          if (!credentials[field]) {
            throw new Error(`Missing required field: ${field}`);
          }
        }

        return true;
      }

      if (this.type === 'oauth2') {
        const requiredFields = ['client_id', 'client_secret', 'redirect_uri'];

        for (const field of requiredFields) {
          if (!credentials[field]) {
            throw new Error(`Missing required field: ${field}`);
          }
        }

        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Credential validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get specific credential field
   * @param {string} field - Field name to retrieve
   * @returns {any} Field value
   */
  getField(field) {
    if (!this.credentials) {
      throw new Error('Credentials not loaded');
    }
    return this.credentials[field];
  }

  /**
   * Add new account (for multi-account support)
   * @param {Object} credentials - Account credentials
   * @param {string} email - Account email (optional, extracted from credentials)
   */
  addAccount(credentials, email = null) {
    const accountEmail = email || credentials.client_email;

    if (!accountEmail) {
      throw new Error('Account email required');
    }

    this.accounts.set(accountEmail, credentials);
    logger.info(`Account added: ${accountEmail}`);

    if (!this.activeAccountEmail) {
      this.activeAccountEmail = accountEmail;
      this.credentials = credentials;
    }
  }

  /**
   * Switch active account
   * @param {string} email - Email of account to switch to
   */
  switchAccount(email) {
    if (!this.accounts.has(email)) {
      throw new Error(`Account not found: ${email}`);
    }

    this.activeAccountEmail = email;
    this.credentials = this.accounts.get(email);
    logger.info(`Switched to account: ${email}`);
  }

  /**
   * Get account by email
   * @param {string} email - Account email
   * @returns {Object} Account credentials
   */
  getAccount(email) {
    if (!this.accounts.has(email)) {
      throw new Error(`Account not found: ${email}`);
    }
    return this.accounts.get(email);
  }

  /**
   * List all accounts
   * @returns {Array<string>} Array of account emails
   */
  listAccounts() {
    return Array.from(this.accounts.keys());
  }

  /**
   * Get active account email
   * @returns {string} Active account email
   */
  getActiveAccount() {
    return this.activeAccountEmail;
  }

  /**
   * Remove account
   * @param {string} email - Email of account to remove
   */
  removeAccount(email) {
    if (this.activeAccountEmail === email) {
      throw new Error('Cannot remove active account. Switch to another account first.');
    }

    this.accounts.delete(email);
    logger.info(`Account removed: ${email}`);
  }

  /**
   * Get credentials as JSON string (for export)
   * @returns {string} Credentials as JSON
   */
  toJSON() {
    if (!this.credentials) {
      throw new Error('Credentials not loaded');
    }
    return JSON.stringify(this.credentials, null, 2);
  }

  /**
   * Get scopes from credentials
   * @returns {Array<string>} Array of scopes
   */
  getScopes() {
    if (!this.credentials) {
      throw new Error('Credentials not loaded');
    }

    if (this.credentials.scopes) {
      return this.credentials.scopes;
    }

    if (Array.isArray(this.credentials)) {
      return this.credentials;
    }

    return [];
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let credentialsManagerInstance = null;

/**
 * Get or create credentials manager instance
 * @param {Object} options - Configuration options
 * @returns {GoogleCredentialsManager} Credentials manager instance
 */
function getCredentialsManager(options = {}) {
  if (!credentialsManagerInstance) {
    credentialsManagerInstance = new GoogleCredentialsManager(options);
  }
  return credentialsManagerInstance;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Load credentials from environment variable
 * @returns {Promise<Object>} Credentials object
 */
async function loadCredentialsFromEnv() {
  try {
    const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH;

    if (!credentialsPath) {
      throw new Error('GOOGLE_CREDENTIALS_PATH environment variable not set');
    }

    const manager = getCredentialsManager({ credentialsPath });
    return await manager.loadCredentials();
  } catch (error) {
    logger.error(`Failed to load credentials from environment: ${error.message}`);
    throw error;
  }
}

/**
 * Load credentials from file path
 * @param {string} filePath - Path to credentials file
 * @returns {Promise<Object>} Credentials object
 */
async function loadCredentialsFromFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Credentials file not found: ${filePath}`);
    }

    const data = fs.readFileSync(filePath, 'utf8');
    const credentials = JSON.parse(data);

    logger.info(`Credentials loaded from: ${filePath}`);
    return credentials;
  } catch (error) {
    logger.error(`Failed to load credentials from file: ${error.message}`);
    throw error;
  }
}

/**
 * Validate JSON credentials
 * @param {Object} credentials - Credentials to validate
 * @param {string} type - Credential type (service_account or oauth2)
 * @returns {boolean} True if valid
 */
function validateCredentialsObject(credentials, type = 'service_account') {
  const manager = new GoogleCredentialsManager({ type });
  return manager.validateCredentials(credentials);
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  GoogleCredentialsManager,
  getCredentialsManager,
  loadCredentialsFromEnv,
  loadCredentialsFromFile,
  validateCredentialsObject,
};
