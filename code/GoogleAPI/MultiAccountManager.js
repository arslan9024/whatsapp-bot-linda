/**
 * Multi-Account Google Services Manager
 * Handles switching between multiple Google accounts
 * Supports both Service Accounts (JWT) and OAuth2 User Accounts
 * 
 * Usage:
 *   const manager = new MultiAccountManager();
 *   await manager.initialize();
 *   manager.switchTo('GorahaBot');
 *   const auth = manager.getActive();
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================
// CONFIGURATION
// ============================================================

const ACCOUNTS_REGISTRY_PATH = join(__dirname, 'accounts.json');
const DEFAULT_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/contacts'
];

// ============================================================
// MULTI-ACCOUNT MANAGER
// ============================================================

class MultiAccountManager {
  constructor() {
    this.accountsRegistry = null;
    this.authCache = {};        // Cache for loaded auth objects
    this.activeAccount = null;
    this.isInitialized = false;
    this.scopeDefaults = DEFAULT_SCOPES;

    console.log('📋 MultiAccountManager initialized');
  }

  /**
   * Initialize the manager - load accounts registry and set default account
   */
  async initialize() {
    try {
      if (!existsSync(ACCOUNTS_REGISTRY_PATH)) {
        throw new Error(`Accounts registry not found: ${ACCOUNTS_REGISTRY_PATH}`);
      }

      // Load accounts registry
      const registryContent = readFileSync(ACCOUNTS_REGISTRY_PATH, 'utf8');
      this.accountsRegistry = JSON.parse(registryContent);
      
      console.log(`✅ Accounts registry loaded (${this.listAccounts().length} accounts)`);

      // Set default account
      const defaultAccountName = this.accountsRegistry.default || 'PowerAgent';
      await this.switchTo(defaultAccountName);
      
      this.isInitialized = true;
      console.log(`✅ MultiAccountManager ready. Default: ${this.activeAccount}`);

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize MultiAccountManager:', error.message);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Switch to a different account
   * @param {string} accountName - Account name from registry (e.g., 'PowerAgent', 'GorahaBot')
   * @returns {Promise<boolean>} Success status
   */
  async switchTo(accountName) {
    try {
      if (!this.accountsRegistry) {
        throw new Error('Not initialized. Call initialize() first');
      }

      const account = this.accountsRegistry.accounts[accountName];
      if (!account) {
        throw new Error(`Account not found: ${accountName}`);
      }

      if (account.status !== 'active') {
        throw new Error(`Account not active: ${accountName} (status: ${account.status})`);
      }

      console.log(`🔄 Switching to account: ${accountName} (${account.name})`);

      // Check if auth already cached
      if (this.authCache[accountName]) {
        this.activeAccount = accountName;
        console.log(`   ✓ Using cached auth`);
        return true;
      }

      // Load based on type
      let auth;
      if (account.type === 'service_account') {
        auth = await this._loadServiceAccountAuth(accountName, account);
      } else if (account.type === 'oauth2_user') {
        auth = await this._loadOAuth2Auth(accountName, account);
      } else {
        throw new Error(`Unknown account type: ${account.type}`);
      }

      if (auth) {
        this.authCache[accountName] = auth;
        this.activeAccount = accountName;
        console.log(`   ✓ Account switched successfully`);
        return true;
      } else {
        throw new Error(`Failed to load auth for ${accountName}`);
      }
    } catch (error) {
      console.error(`❌ Failed to switch to ${accountName}:`, error.message);
      return false;
    }
  }

  /**
   * Load service account (JWT) auth
   * @param {string} accountName
   * @param {Object} account
   * @returns {Promise<GoogleAuth>}
   */
  async _loadServiceAccountAuth(accountName, account) {
    try {
      console.log(`   Loading Service Account: ${account.name}`);

      const keyFilePath = join(__dirname, account.keyPath);
      if (!existsSync(keyFilePath)) {
        throw new Error(`Key file not found: ${keyFilePath}`);
      }

      const keyFileContent = readFileSync(keyFilePath, 'utf8');
      const keyFileData = JSON.parse(keyFileContent);

      const auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: account.scopes || DEFAULT_SCOPES
      });

      console.log(`   ✓ Service Account Auth loaded: ${account.name}`);

      return auth;
    } catch (error) {
      console.error(`   ✗ Service Account Auth Error:`, error.message);
      throw error;
    }
  }

  /**
   * Load OAuth2 user account auth
   * @param {string} accountName
   * @param {Object} account
   * @returns {Promise<OAuth2Client>}
   */
  async _loadOAuth2Auth(accountName, account) {
    try {
      console.log(`   Loading OAuth2 User Account: ${account.name}`);

      // For pending accounts, we need to set up OAuth2 first
      if (account.status !== 'active') {
        console.log(`   ⚠️  Account ${accountName} is not active yet. May need OAuth2 setup.`);
        return null;
      }

      const credentialsPath = join(__dirname, account.credentialsFile || account.credentialsPath);
      if (!existsSync(credentialsPath)) {
        throw new Error(`Credentials file not found: ${credentialsPath}. Run oauth2 setup first.`);
      }

      const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));

      // Get client config from environment or account settings
      const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || account.clientId;
      const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || account.clientSecret;
      const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || account.redirectUri || 'http://localhost:3000/oauth2callback';

      if (!clientId || !clientSecret) {
        throw new Error('Missing OAuth2 client credentials');
      }

      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

      oauth2Client.setCredentials({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token,
        expiry_date: credentials.expiry_date
      });

      console.log(`   ✓ OAuth2 Auth loaded: ${account.name}`);

      return oauth2Client;
    } catch (error) {
      console.error(`   ✗ OAuth2 Auth Error:`, error.message);
      throw error;
    }
  }

  /**
   * Get the active account's auth object
   * @returns {Object} Auth object (GoogleAuth or OAuth2Client)
   */
  getActive() {
    if (!this.activeAccount) {
      throw new Error('No active account. Call switchTo() first');
    }

    const auth = this.authCache[this.activeAccount];
    if (!auth) {
      throw new Error(`No cached auth for ${this.activeAccount}`);
    }

    return auth;
  }

  /**
   * Get active account information
   * @returns {Object} Account metadata
   */
  getActiveAccountInfo() {
    if (!this.activeAccount || !this.accountsRegistry) {
      return null;
    }

    return {
      id: this.activeAccount,
      ...this.accountsRegistry.accounts[this.activeAccount]
    };
  }

  /**
   * List all available accounts
   * @returns {Array} Account names
   */
  listAccounts() {
    if (!this.accountsRegistry) {
      return [];
    }

    return Object.keys(this.accountsRegistry.accounts);
  }

  /**
   * Get account by name
   * @param {string} accountName
   * @returns {Object} Account metadata
   */
  getAccountByName(accountName) {
    if (!this.accountsRegistry) {
      return null;
    }

    return this.accountsRegistry.accounts[accountName] || null;
  }

  /**
   * Check if account exists and is active
   * @param {string} accountName
   * @returns {boolean}
   */
  isAccountActive(accountName) {
    const account = this.getAccountByName(accountName);
    return account && account.status === 'active';
  }

  /**
   * Get all active accounts
   * @returns {Array} List of active account names
   */
  getActiveAccounts() {
    return this.listAccounts().filter(name => this.isAccountActive(name));
  }

  /**
   * Get auth for specific account (without switching)
   * @param {string} accountName
   * @returns {Promise<Object>} Auth object
   */
  async getAuthForAccount(accountName) {
    try {
      const account = this.getAccountByName(accountName);
      if (!account) {
        throw new Error(`Account not found: ${accountName}`);
      }

      // Check cache first
      if (this.authCache[accountName]) {
        return this.authCache[accountName];
      }

      // Load based on type
      let auth;
      if (account.type === 'service_account') {
        auth = await this._loadServiceAccountAuth(accountName, account);
      } else if (account.type === 'oauth2_user') {
        auth = await this._loadOAuth2Auth(accountName, account);
      }

      if (auth) {
        this.authCache[accountName] = auth;
      }

      return auth;
    } catch (error) {
      console.error(`❌ Failed to get auth for ${accountName}:`, error.message);
      return null;
    }
  }

  /**
   * Perform operation with specific account (without switching)
   * @param {string} accountName
   * @param {Function} operation - Async function receiving auth as parameter
   * @returns {Promise<Object>} Operation result
   */
  async withAccount(accountName, operation) {
    try {
      const auth = await this.getAuthForAccount(accountName);
      if (!auth) {
        throw new Error(`Could not get auth for ${accountName}`);
      }

      return await operation(auth);
    } catch (error) {
      console.error(`❌ Operation failed for ${accountName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get registry data
   * @returns {Object} Full accounts registry
   */
  getRegistry() {
    return this.accountsRegistry;
  }

  /**
   * Summary of current status
   */
  status() {
    console.log('\n====================================================');
    console.log('   MultiAccountManager Status');
    console.log('====================================================\n');

    if (!this.isInitialized) {
      console.log('❌ Not initialized');
      return;
    }

    console.log(`✅ Initialized: Yes`);
    console.log(`📍 Active Account: ${this.activeAccount}`);
    console.log(`\n📊 Registered Accounts:`);

    this.listAccounts().forEach(name => {
      const account = this.getAccountByName(name);
      const status = account.status === 'active' ? '✅' : '⚠️ ';
      const type = account.type === 'service_account' ? '🔑' : '👤';
      console.log(`   ${status} ${type} ${name} (${account.name})`);
    });

    console.log(`\n📦 Cached Auths: ${Object.keys(this.authCache || {}).length}`);
    console.log('');
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let instance = null;

export async function getMultiAccountManager() {
  if (!instance) {
    instance = new MultiAccountManager();
    await instance.initialize();
  }
  return instance;
}

export function getManagerSync() {
  if (!instance) {
    throw new Error('MultiAccountManager not initialized. Call getMultiAccountManager() first');
  }
  return instance;
}

export default MultiAccountManager;
