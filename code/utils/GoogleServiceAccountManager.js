/**
 * ====================================================================
 * GOOGLE SERVICE ACCOUNT MANAGER
 * ====================================================================
 * Secure, multi-account credential management via .env
 * 
 * Features:
 * - Base64-encoded JSON keys stored in .env (no secrets in git)
 * - Support for multiple accounts (PowerAgent, GorahaBot, future)
 * - No hardcoding - fully extensible
 * - Runtime credential loading and validation
 * - Automatic fallback to legacy paths (backward compatible)
 * 
 * Usage:
 * ------
 * import GoogleServiceAccountManager from './GoogleServiceAccountManager.js';
 * 
 * const manager = new GoogleServiceAccountManager();
 * const powerAgentCreds = await manager.getCredentials('poweragent');
 * const gorahaCreds = await manager.getCredentials('goraha');
 * 
 * Environment Variables (Required):
 * ---------------------------------
 * GOOGLE_ACCOUNT_<ACCOUNT_NAME>_KEYS_BASE64=<base64_encoded_json>
 * 
 * Example:
 * --------
 * First, encode your JSON key file:
 *   cat keys.json | base64 | tr -d '\n' > keys.base64
 * 
 * Then add to .env:
 *   GOOGLE_ACCOUNT_POWERAGENT_KEYS_BASE64=<entire_base64_string>
 *   GOOGLE_ACCOUNT_GORAHA_KEYS_BASE64=<entire_base64_string>
 * 
 * @since Phase 20 - February 18, 2026
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class GoogleServiceAccountManager {
  constructor() {
    this.credentialsCache = new Map(); // accountName -> credentials object
    this.validationCache = new Map(); // accountName -> validation result
    this.logger = this.createLogger();
  }

  /**
   * Create a simple logger for this module
   */
  createLogger() {
    return {
      debug: (msg) => process.env.LOG_LEVEL === 'debug' && console.log(`🔐 [GSA] ${msg}`),
      info: (msg) => console.log(`ℹ️  [GSA] ${msg}`),
      warn: (msg) => console.warn(`⚠️  [GSA] ${msg}`),
      error: (msg) => console.error(`❌ [GSA] ${msg}`),
    };
  }

  /**
   * Get credentials for a specific Google account
   * Tries multiple sources in order:
   * 1. Environment variable (base64-encoded JSON)
   * 2. Cache (if already loaded)
   * 3. Legacy file path (backward compatibility)
   * 4. Null (credentials not found)
   * 
   * @param {string} accountName - Account identifier (e.g., 'poweragent', 'goraha')
   * @returns {Promise<object|null>} Parsed credentials object or null
   */
  async getCredentials(accountName) {
    if (!accountName) {
      this.logger.error('Account name is required');
      return null;
    }

    const normalizedName = accountName.toLowerCase();

    // Check cache
    if (this.credentialsCache.has(normalizedName)) {
      this.logger.debug(`Using cached credentials for: ${normalizedName}`);
      return this.credentialsCache.get(normalizedName);
    }

    // Try environment variable (base64-encoded JSON)
    const envVarName = `GOOGLE_ACCOUNT_${normalizedName.toUpperCase()}_KEYS_BASE64`;
    const base64Creds = process.env[envVarName];

    if (base64Creds) {
      try {
        const jsonString = Buffer.from(base64Creds, 'base64').toString('utf-8');
        const credentials = JSON.parse(jsonString);
        
        // Validate credentials
        if (this.validateCredentials(credentials, normalizedName)) {
          this.credentialsCache.set(normalizedName, credentials);
          this.logger.info(`✅ Loaded credentials from environment: ${normalizedName}`);
          return credentials;
        }
      } catch (error) {
        this.logger.error(`Failed to decode/parse ${envVarName}: ${error.message}`);
      }
    }

    // Try legacy file path (backward compatible)
    const credentialsPath = this.getLegacyPath(normalizedName);
    if (credentialsPath && fs.existsSync(credentialsPath)) {
      try {
        const fileContent = fs.readFileSync(credentialsPath, 'utf-8');
        const credentials = JSON.parse(fileContent);
        
        // Validate and cache
        if (this.validateCredentials(credentials, normalizedName)) {
          this.credentialsCache.set(normalizedName, credentials);
          this.logger.warn(`Using legacy file path for ${normalizedName}: ${credentialsPath}`);
          this.logger.warn(`⚠️  Consider moving credentials to ${envVarName} in .env for security`);
          return credentials;
        }
      } catch (error) {
        this.logger.error(`Failed to read ${credentialsPath}: ${error.message}`);
      }
    }

    this.logger.warn(`Credentials not found for account: ${normalizedName}`);
    return null;
  }

  /**
   * Validate service account credentials structure
   */
  validateCredentials(credentials, accountName) {
    if (!credentials || typeof credentials !== 'object') {
      this.logger.error(`Invalid credentials object for ${accountName}`);
      return false;
    }

    // Check for required fields based on account type
    const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
    const missingFields = requiredFields.filter(field => !credentials[field]);

    if (missingFields.length > 0) {
      this.logger.error(`Credentials for ${accountName} missing fields: ${missingFields.join(', ')}`);
      return false;
    }

    // Type should be "service_account"
    if (credentials.type !== 'service_account') {
      this.logger.error(`Invalid credentials type for ${accountName}: expected "service_account", got "${credentials.type}"`);
      return false;
    }

    return true;
  }

  /**
   * Get legacy file path for backward compatibility
   */
  getLegacyPath(accountName) {
    const legacyPaths = {
      'poweragent': path.join(process.cwd(), 'code', 'GoogleAPI', 'keys.json'),
      'goraha': path.join(process.cwd(), 'code', 'GoogleAPI', 'keys-goraha.json'),
    };

    return legacyPaths[accountName] || null;
  }

  /**
   * Check if credentials exist for an account (without loading)
   */
  hasCredentials(accountName) {
    const normalizedName = accountName.toLowerCase();
    
    // Check cache
    if (this.credentialsCache.has(normalizedName)) {
      return true;
    }
    
    // Check environment variable
    const envVarName = `GOOGLE_ACCOUNT_${normalizedName.toUpperCase()}_KEYS_BASE64`;
    if (process.env[envVarName]) {
      return true;
    }
    
    // Check legacy file
    const legacyPath = this.getLegacyPath(normalizedName);
    if (legacyPath && fs.existsSync(legacyPath)) {
      return true;
    }
    
    return false;
  }

  /**
   * List all available Google service accounts
   */
  listAvailableAccounts() {
    const accounts = [];
    
    // Check environment variables
    const envVars = Object.keys(process.env);
    envVars.forEach(key => {
      const match = key.match(/^GOOGLE_ACCOUNT_(.+)_KEYS_BASE64$/);
      if (match) {
        accounts.push(match[1].toLowerCase());
      }
    });
    
    // Check legacy files
    const legacyAccounts = ['poweragent', 'goraha'];
    legacyAccounts.forEach(name => {
      const path = this.getLegacyPath(name);
      if (path && fs.existsSync(path) && !accounts.includes(name)) {
        accounts.push(name);
      }
    });
    
    return [...new Set(accounts)]; // Remove duplicates
  }

  /**
   * Get all loaded credentials (cached)
   */
  getAllCachedCredentials() {
    return Array.from(this.credentialsCache.entries()).reduce((acc, [name, creds]) => {
      acc[name] = { account: name, projectId: creds.project_id, email: creds.client_email };
      return acc;
    }, {});
  }

  /**
   * Print security summary to console
   */
  printSecuritySummary() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║        🔐 GOOGLE SERVICE ACCOUNTS - SECURITY STATUS        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    const available = this.listAvailableAccounts();
    
    if (available.length === 0) {
      console.log('⚠️  NO GOOGLE SERVICE ACCOUNTS CONFIGURED!');
      console.log('\nTo add credentials, set environment variables in .env:');
      console.log('  1. Encode your service account JSON:');
      console.log('     cat keys.json | base64 | tr -d "\\n" > keys.base64');
      console.log('\n  2. Add to .env:');
      console.log('     GOOGLE_ACCOUNT_POWERAGENT_KEYS_BASE64=<base64_string>');
      console.log('     GOOGLE_ACCOUNT_GORAHA_KEYS_BASE64=<base64_string>');
      console.log('\n');
      return;
    }
    
    console.log(`✅ Found ${available.length} configured account(s):\n`);
    
    available.forEach(accountName => {
      const hasEnvVar = !!process.env[`GOOGLE_ACCOUNT_${accountName.toUpperCase()}_KEYS_BASE64`];
      const hasLegacy = this.getLegacyPath(accountName) && fs.existsSync(this.getLegacyPath(accountName));
      
      console.log(`  📱 ${accountName.toUpperCase()}`);
      console.log(`     Source: ${hasEnvVar ? '🔐 Environment Variable' : '📄 Legacy File'}`);
      if (hasLegacy && !hasEnvVar) {
        console.log(`     ⚠️  Consider migrating to .env for security`);
      }
    });
    
    console.log('\n');
  }

  /**
   * Encode a JSON file to base64 for .env
   * This is a helper method for setup/migration
   */
  static encodeJsonToBase64(jsonPath) {
    try {
      const content = fs.readFileSync(jsonPath, 'utf-8');
      const base64 = Buffer.from(content).toString('base64');
      return base64;
    } catch (error) {
      console.error(`Failed to encode ${jsonPath}: ${error.message}`);
      return null;
    }
  }

  /**
   * Display instructions for migrating from keys.json to .env
   */
  static printMigrationGuide() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║      🔄 MIGRATION GUIDE: keys.json → .env (Base64)       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('Step 1: Encode your service account JSON files');
    console.log('  PowerAgent:');
    console.log('    cat code/GoogleAPI/keys.json | base64 | tr -d "\\n" > /tmp/poweragent.base64');
    console.log('\n  GorahaBot:');
    console.log('    cat code/GoogleAPI/keys-goraha.json | base64 | tr -d "\\n" > /tmp/goraha.base64');
    
    console.log('\n\nStep 2: Add to .env file');
    console.log('  GOOGLE_ACCOUNT_POWERAGENT_KEYS_BASE64=<contents_of_poweragent.base64>');
    console.log('  GOOGLE_ACCOUNT_GORAHA_KEYS_BASE64=<contents_of_goraha.base64>');
    
    console.log('\n\nStep 3: Remove credentials from repository');
    console.log('  git rm --cached code/GoogleAPI/keys.json');
    console.log('  git rm --cached code/GoogleAPI/keys-goraha.json');
    console.log('  git commit -m "Remove service account credentials from git"');
    
    console.log('\n\nStep 4: Verify in .gitignore');
    console.log('  *.json  # In code/GoogleAPI/ directory');
    console.log('  keys.json');
    console.log('  keys-*.json');
    
    console.log('\n\nStep 5: Test the migration');
    console.log('  npm run dev  # Bot should load credentials from .env\n');
  }
}

export default GoogleServiceAccountManager;
