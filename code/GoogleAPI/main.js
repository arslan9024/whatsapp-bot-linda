/**
 * Google API Integration - Main Entry Point
 * 
 * UPDATED: February 2026 - Multi-Account Support
 * Now supports multiple Google accounts (ServiceAccounts + OAuth2)
 * 
 * Legacy API (PowerAgent) still works for backward compatibility
 * New API: Use MultiAccountManager for multi-account operations
 */

import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import MultiAccountManager, { getMultiAccountManager, getManagerSync } from './MultiAccountManager.js';
import { getOAuth2Handler } from './OAuth2Handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ════════════════════════════════════════════════════════════════
// LEGACY API (BACKWARD COMPATIBILITY)
// ════════════════════════════════════════════════════════════════

let keys;
let PowerAgent = null;
let isGoogleAuthenticated = false;
let globalManager = null;

try {
  keys = JSON.parse(readFileSync('./code/GoogleAPI/keys.json', 'utf8'));
} catch (error) {
  console.error('❌ Failed to load Google credentials:', error.message || error);
  console.log('⚠️  Google Sheets integration disabled');
  keys = null;
}

// Function to initialize Google authentication (lazy-loaded on first use)
export async function initializeGoogleAuth() {
  if (isGoogleAuthenticated || !keys) {
    return PowerAgent;
  }

  try {
    // Initialize multi-account manager
    console.log('🔄 Initializing Multi-Account Manager...');
    globalManager = await getMultiAccountManager();

    // Get PowerAgent from manager
    PowerAgent = globalManager.getActive();
    isGoogleAuthenticated = true;

    // Verify auth works by getting a token
    await PowerAgent.getAccessToken();
    console.log('✅ Google Services Connected (PowerAgent)');
    
    return PowerAgent;
  } catch (error) {
    console.error('❌ Google Authentication Error:', error.message || error);
    if (error.message && error.message.includes('invalid_grant')) {
      console.log('⚠️  Invalid JWT Signature - This usually means:');
      console.log('   1. The private key is malformed or expired');
      console.log('   2. System time is out of sync');
      console.log('   3. The service account key is not valid');
      console.log('');
      console.log('📋 Troubleshooting:');
      console.log('   • Download fresh keys from Google Cloud Console');
      console.log('   • Check system date/time matches Google Cloud');
      console.log('   • Verify serviceman11@heroic-artifact-414519.iam.gserviceaccount.com has editor access');
    }
    PowerAgent = null;
    isGoogleAuthenticated = false;
    return null;
  }
}

// Getter function that initializes auth on demand
export async function getPowerAgent() {
  if (!PowerAgent && keys) {
    await initializeGoogleAuth();
  }
  return PowerAgent;
}

// ════════════════════════════════════════════════════════════════
// NEW MULTI-ACCOUNT API
// ════════════════════════════════════════════════════════════════

/**
 * Get the global Multi-Account Manager
 * Ensures initialization before returning
 */
export async function getManager() {
  if (!globalManager) {
    globalManager = await getMultiAccountManager();
  }
  return globalManager;
}

/**
 * Switch to a different Google account
 * @param {string} accountName - Account name (e.g., 'PowerAgent', 'GorahaBot')
 * @returns {Promise<boolean>} Success
 */
export async function switchAccount(accountName) {
  const manager = await getManager();
  return manager.switchTo(accountName);
}

/**
 * Get auth for specific account without switching global account
 * @param {string} accountName
 * @returns {Promise<Object>} Auth object
 */
export async function getAuthForAccount(accountName) {
  const manager = await getManager();
  return manager.getAuthForAccount(accountName);
}

/**
 * List all available accounts
 * @returns {Promise<Array>} Account names
 */
export async function listAccounts() {
  const manager = await getManager();
  return manager.listAccounts();
}

/**
 * Get OAuth2 handler for user accounts
 * @param {string} accountName - e.g., 'GorahaBot'
 * @returns {Promise<OAuth2Handler>}
 */
export async function getOAuth2(accountName = 'GorahaBot') {
  return getOAuth2Handler(accountName);
}

/**
 * Perform operation with specific account
 * @param {string} accountName
 * @param {Function} operation - Async function (auth) => { ... }
 * @returns {Promise<Object>} Operation result
 */
export async function withAccount(accountName, operation) {
  const manager = await getManager();
  return manager.withAccount(accountName, operation);
}

/**
 * Get current manager status
 */
export async function managerStatus() {
  const manager = await getManager();
  manager.status();
}

// ════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════

// Legacy exports (for backward compatibility)
export { PowerAgent };
export { isGoogleAuthenticated };

// New exports (multi-account)
export { MultiAccountManager, getMultiAccountManager, getManagerSync };
export { getOAuth2Handler };
