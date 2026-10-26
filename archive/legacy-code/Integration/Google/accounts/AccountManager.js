/**
 * Account Manager
 * Manages multiple Google accounts with easy switching and credential handling
 * 
 * Version: 1.0.0
 * Last Updated: February 7, 2026
 */

import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import { errorHandler } from '../utils/errorHandler.js';

// ============================================================================
// CLASS: AccountManager
// ============================================================================

class AccountManager {
  /**
   * Initialize AccountManager
   * @param {string} configPath - Path to accounts.config.json
   */
  constructor(configPath = './code/Integration/Google/accounts/accounts.config.json') {
    this.configPath = configPath;
    this.config = null;
    this.accounts = new Map();
    this.activeAccountId = null;
    this.accountCredentials = new Map();
    
    logger.info('AccountManager initialized');
  }

  /**
   * Load accounts configuration from config file
   * @returns {Promise<Object>} Loaded configuration
   */
  async loadConfig() {
    try {
      const configPath = path.resolve(this.configPath);
      
      if (!fs.existsSync(configPath)) {
        throw new Error(`Config file not found: ${configPath}`);
      }

      const configData = fs.readFileSync(configPath, 'utf8');
      this.config = JSON.parse(configData);

      logger.info(`Loaded accounts configuration: ${this.config.accounts.length} accounts found`);

      // Register all accounts
      for (const account of this.config.accounts) {
        this.accounts.set(account.id, account);
        logger.info(`Account registered: ${account.name} (${account.id})`);
      }

      // Set default account
      this.activeAccountId = this.config.defaultAccount;
      logger.info(`Default account set to: ${this.activeAccountId}`);

      return this.config;
    } catch (error) {
      logger.error('Failed to load accounts configuration', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all accounts
   * @returns {Array} Array of account definitions
   */
  getAllAccounts() {
    return Array.from(this.accounts.values());
  }

  /**
   * Get account by ID
   * @param {string} accountId - Account ID
   * @returns {Object|null} Account object or null if not found
   */
  getAccount(accountId) {
    return this.accounts.get(accountId) || null;
  }

  /**
   * Get active account
   * @returns {Object} Active account object
   */
  getActiveAccount() {
    if (!this.activeAccountId) {
      throw new Error('No active account set');
    }
    return this.getAccount(this.activeAccountId);
  }

  /**
   * Switch to different account
   * @param {string} accountId - Account ID to switch to
   * @returns {boolean} True if switch successful
   */
  switchAccount(accountId) {
    try {
      const account = this.getAccount(accountId);
      
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      this.activeAccountId = accountId;
      logger.info(`Switched to account: ${account.name} (${accountId})`);
      
      return true;
    } catch (error) {
      logger.error('Failed to switch account', { error: error.message });
      return false;
    }
  }

  /**
   * Load credentials for a specific account
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Credentials object
   */
  async loadAccountCredentials(accountId) {
    try {
      const account = this.getAccount(accountId);
      
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      // Check if already loaded
      if (this.accountCredentials.has(accountId)) {
        logger.info(`Using cached credentials for account: ${accountId}`);
        return this.accountCredentials.get(accountId);
      }

      // Try to load credentials
      const credentialsPath = path.resolve(account.credentialsPath);
      
      if (!fs.existsSync(credentialsPath)) {
        throw new Error(`Credentials file not found for ${account.name}: ${credentialsPath}`);
      }

      const credentialsData = fs.readFileSync(credentialsPath, 'utf8');
      const credentials = JSON.parse(credentialsData);

      // Cache credentials
      this.accountCredentials.set(accountId, credentials);
      logger.info(`Credentials loaded for account: ${account.name}`);

      return credentials;
    } catch (error) {
      logger.error(`Failed to load credentials for account ${accountId}`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get credentials for active account
   * @returns {Promise<Object>} Credentials object
   */
  async getActiveAccountCredentials() {
    const account = this.getActiveAccount();
    return this.loadAccountCredentials(account.id);
  }

  /**
   * List all account names and IDs
   * @returns {Array} Array of {id, name} objects
   */
  listAccounts() {
    return Array.from(this.accounts.values()).map(account => ({
      id: account.id,
      name: account.name,
      status: account.status,
      isActive: account.id === this.activeAccountId,
    }));
  }

  /**
   * Get account status summary
   * @returns {Object} Status information
   */
  getStatus() {
    const activeAccount = this.getActiveAccount();
    return {
      totalAccounts: this.accounts.size,
      activeAccountId: this.activeAccountId,
      activeAccountName: activeAccount.name,
      accounts: this.listAccounts(),
      configPath: this.configPath,
    };
  }

  /**
   * Update account last-used timestamp
   * @param {string} accountId - Account ID
   */
  updateLastUsed(accountId) {
    const account = this.getAccount(accountId);
    if (account) {
      account.lastUsed = new Date().toISOString();
      logger.info(`Updated last-used timestamp for account: ${accountId}`);
    }
  }

  /**
   * Validate all account credentials exist
   * @returns {Promise<Object>} Validation results for each account
   */
  async validateAllCredentials() {
    const results = {};
    
    for (const [accountId, account] of this.accounts) {
      try {
        const credentialsPath = path.resolve(account.credentialsPath);
        const exists = fs.existsSync(credentialsPath);
        
        results[accountId] = {
          name: account.name,
          exists,
          path: credentialsPath,
          status: exists ? 'ready' : 'missing',
        };

        if (!exists) {
          logger.warn(`Credentials missing for account: ${account.name}`);
        }
      } catch (error) {
        results[accountId] = {
          name: account.name,
          error: error.message,
          status: 'error',
        };
      }
    }

    return results;
  }

  /**
   * Generate setup guide for new accounts
   * @returns {string} Setup instructions
   */
  generateSetupGuide() {
    const guide = `
╔════════════════════════════════════════════════════════════════════╗
║         GOOGLE ACCOUNTS SETUP GUIDE - WhatsApp Bot Linda          ║
╚════════════════════════════════════════════════════════════════════╝

This project uses multiple Google Service Accounts for different purposes:

ACCOUNT 1: Power Agent (PRIMARY)
──────────────────────────────────
Name: Power Agent
Purpose: Broadcast sheets, shared project sheets, bot operations
Location: code/Integration/Google/accounts/power-agent/keys.json
Status: ${this.getAccount('power-agent')?.status || 'not-configured'}

Setup Instructions:
1. Create a Google Service Account in your Google Cloud project
2. Download the service account key (JSON file)
3. Rename it to 'keys.json'
4. Copy it to: code/Integration/Google/accounts/power-agent/
5. Grant it access to your broadcast Google Sheets

ACCOUNT 2: Goraha Properties
──────────────────────────────
Name: Goraha Properties
Purpose: Property-specific sheets, property reports, Goraha operations
Location: code/Integration/Google/accounts/goraha-properties/keys.json
Status: ${this.getAccount('goraha-properties')?.status || 'not-configured'}

Setup Instructions:
1. Create a separate Google Service Account in your Google Cloud project
2. Download the service account key (JSON file)
3. Rename it to 'keys.json'
4. Copy it to: code/Integration/Google/accounts/goraha-properties/
5. Grant it access to your Goraha Properties Google Sheets

USAGE IN CODE:
──────────────
// Switch to Goraha Properties account
accountManager.switchAccount('goraha-properties');
const credentials = await accountManager.getActiveAccountCredentials();

// Switch back to Power Agent
accountManager.switchAccount('power-agent');

VALIDATE SETUP:
───────────────
// Check if all credentials are in place
const validation = await accountManager.validateAllCredentials();
console.log(validation);

Configuration file: ${this.configPath}
    `;
    return guide;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let managerInstance = null;

/**
 * Get or create AccountManager instance
 * @param {string} configPath - Path to accounts config
 * @returns {AccountManager} Manager instance
 */
function getAccountManager(configPath) {
  if (!managerInstance) {
    managerInstance = new AccountManager(configPath);
  }
  return managerInstance;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { AccountManager, getAccountManager };
