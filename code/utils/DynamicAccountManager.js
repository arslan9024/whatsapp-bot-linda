/**
 * DynamicAccountManager.js
 * ═══════════════════════════════════════════════════════════════════════════
 * Manages dynamic addition and removal of WhatsApp accounts at runtime
 * 
 * Features:
 * - Add new accounts via WhatsApp commands (no config file editing needed)
 * - Remove accounts with confirmation
 * - List all accounts with current status
 * - Persist changes to bots-config.json
 * - Initialize new accounts immediately without bot restart
 * - Show QR code for new account linking
 * 
 * Version: 1.0
 * Created: February 11, 2026
 * Status: Production Ready
 */

import fs from 'fs/promises';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOTS_CONFIG_FILE = path.join(__dirname, '..', 'WhatsAppBot', 'bots-config.json');

export class DynamicAccountManager {
  constructor(logBot) {
    this.logBot = logBot || console.log;
    this.config = null;
    this.accountCallbacks = {}; // Callbacks for account events
    this.loadConfig();
  }

  /**
   * Load the current configuration
   */
  loadConfig() {
    try {
      if (!existsSync(BOTS_CONFIG_FILE)) {
        this.logBot(`Config file not found: ${BOTS_CONFIG_FILE}`, 'warn');
        this.config = { whatsappBots: {} };
        return false;
      }

      const data = readFileSync(BOTS_CONFIG_FILE, 'utf-8');
      this.config = JSON.parse(data);
      return true;
    } catch (error) {
      this.logBot(`Failed to load config: ${error.message}`, 'error');
      this.config = { whatsappBots: {} };
      return false;
    }
  }

  /**
   * Save configuration to file
   */
  async saveConfig() {
    try {
      const formattedJson = JSON.stringify(this.config, null, 2);
      writeFileSync(BOTS_CONFIG_FILE, formattedJson, 'utf-8');
      this.logBot('Account configuration saved to disk', 'success');
      return true;
    } catch (error) {
      this.logBot(`Failed to save config: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Generate unique account ID from phone number
   */
  generateAccountId(phoneNumber) {
    // Format: +971505760056 → account-971505760056
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    return `account-${cleanPhone}`;
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phoneNumber) {
    // Accept: +971505760056, 971505760056, or similar
    const phoneRegex = /^(\+?971|0)[0-9]{9}$/;
    return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
  }

  /**
   * Normalize phone number to +971XXXXXXXXX format
   */
  normalizePhoneNumber(phoneNumber) {
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Convert 971XXXXXXXXX to +971XXXXXXXXX
    if (cleaned.startsWith('971')) {
      return `+${cleaned}`;
    }
    
    // Convert 0XXXXXXXXX to +971XXXXXXXXX
    if (cleaned.startsWith('0')) {
      return `+971${cleaned.slice(1)}`;
    }
    
    return `+${cleaned}`;
  }

  /**
   * Check if account already exists
   */
  accountExists(phoneNumber) {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    return Object.values(this.config.whatsappBots || {}).some(
      bot => bot.phoneNumber === normalized
    );
  }

  /**
   * Add a new account dynamically
   */
  async addAccount(phoneNumber, displayName, options = {}) {
    try {
      // Validate input
      if (!phoneNumber || !displayName) {
        return {
          success: false,
          error: 'Missing required: phoneNumber or displayName'
        };
      }

      // Validate phone number
      if (!this.isValidPhoneNumber(phoneNumber)) {
        return {
          success: false,
          error: `Invalid phone number: ${phoneNumber}. Use format: +971XXXXXXXXX`
        };
      }

      // Normalize phone number
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      // Check if already exists
      if (this.accountExists(normalizedPhone)) {
        return {
          success: false,
          error: `Account already exists: ${normalizedPhone}`
        };
      }

      // Determine role
      const isMaster = Object.values(this.config.whatsappBots || {}).length === 0;
      const role = options.role || (isMaster ? 'primary' : 'secondary');

      // Generate account ID
      const accountId = this.generateAccountId(normalizedPhone);

      // Create account config
      const newAccount = {
        id: accountId,
        phoneNumber: normalizedPhone,
        displayName: displayName,
        description: options.description || `WhatsApp Account - ${displayName}`,
        role: role,
        sessionPath: `sessions/session-${accountId}`,
        enabled: true,
        features: {
          messaging: true,
          contacts: true,
          campaigns: true,
          analytics: true,
          scheduling: true
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        lastSync: null
      };

      // Add to config
      this.config.whatsappBots = this.config.whatsappBots || {};
      this.config.whatsappBots[accountId] = newAccount;

      // Update metadata
      this.config.metadata = this.config.metadata || {};
      this.config.metadata.totalBots = Object.keys(this.config.whatsappBots).length;
      this.config.metadata.lastModified = new Date().toISOString();

      // Save to disk
      await this.saveConfig();

      this.logBot(`✅ Account added: ${displayName} (${normalizedPhone})`, 'success');
      this.logBot(`   ID: ${accountId}`, 'info');
      this.logBot(`   Role: ${role}`, 'info');
      this.logBot(`   Status: Pending device link (will show QR code)`, 'info');

      // Trigger callback if registered
      if (this.accountCallbacks.onAccountAdded) {
        this.accountCallbacks.onAccountAdded(newAccount);
      }

      return {
        success: true,
        account: newAccount,
        message: `Account ${displayName} added. Device linking will start automatically.`
      };
    } catch (error) {
      this.logBot(`Error adding account: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Remove an account
   */
  async removeAccount(phoneNumber) {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      // Find account
      let foundId = null;
      let foundAccount = null;

      for (const [id, account] of Object.entries(this.config.whatsappBots || {})) {
        if (account.phoneNumber === normalizedPhone) {
          foundId = id;
          foundAccount = account;
          break;
        }
      }

      if (!foundId) {
        return {
          success: false,
          error: `Account not found: ${normalizedPhone}`
        };
      }

      // Prevent removing master/primary account
      if (foundAccount.role === 'primary' || foundAccount.role === 'master') {
        return {
          success: false,
          error: `Cannot remove master account: ${normalizedPhone}. Promote another account first.`
        };
      }

      // Remove from config
      delete this.config.whatsappBots[foundId];

      // Update metadata
      this.config.metadata.totalBots = Object.keys(this.config.whatsappBots).length;
      this.config.metadata.lastModified = new Date().toISOString();

      // Save to disk
      await this.saveConfig();

      this.logBot(`✅ Account removed: ${foundAccount.displayName} (${normalizedPhone})`, 'success');

      // Trigger callback
      if (this.accountCallbacks.onAccountRemoved) {
        this.accountCallbacks.onAccountRemoved(foundAccount);
      }

      return {
        success: true,
        account: foundAccount,
        message: `Account removed: ${foundAccount.displayName}`
      };
    } catch (error) {
      this.logBot(`Error removing account: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all accounts
   */
  getAllAccounts() {
    return Object.values(this.config.whatsappBots || {});
  }

  /**
   * Get account by phone number
   */
  getAccountByPhone(phoneNumber) {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    for (const account of Object.values(this.config.whatsappBots || {})) {
      if (account.phoneNumber === normalizedPhone) {
        return account;
      }
    }
    return null;
  }

  /**
   * Get master account
   */
  getMasterAccount() {
    for (const account of Object.values(this.config.whatsappBots || {})) {
      if (account.role === 'primary' || account.role === 'master') {
        return account;
      }
    }
    return null;
  }

  /**
   * Get enabled accounts only
   */
  getEnabledAccounts() {
    return Object.values(this.config.whatsappBots || {}).filter(
      account => account.enabled !== false
    );
  }

  /**
   * Update account status
   */
  async updateAccountStatus(phoneNumber, status) {
    try {
      const account = this.getAccountByPhone(phoneNumber);
      if (!account) {
        return { success: false, error: `Account not found: ${phoneNumber}` };
      }

      account.status = status;
      account.lastSync = new Date().toISOString();
      await this.saveConfig();

      this.logBot(`Account status updated: ${account.displayName} → ${status}`, 'info');
      return { success: true, account };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Register callback for account events
   */
  onAccountAdded(callback) {
    this.accountCallbacks.onAccountAdded = callback;
  }

  onAccountRemoved(callback) {
    this.accountCallbacks.onAccountRemoved = callback;
  }

  /**
   * Format accounts for display
   */
  formatAccountsForDisplay() {
    const accounts = this.getAllAccounts();
    if (accounts.length === 0) {
      return '📱 No accounts configured yet. Use /add-account to add one.';
    }

    let output = '📱 **WHATSAPP ACCOUNTS**\n';
    output += '════════════════════════════════════\n\n';

    accounts.forEach((account, idx) => {
      const statusEmoji = account.enabled ? '✅' : '⏸️';
      const roleEmoji = account.role === 'primary' ? '👑' : '📲';
      output += `${idx + 1}. ${statusEmoji} ${roleEmoji} ${account.displayName}\n`;
      output += `   📞 ${account.phoneNumber}\n`;
      output += `   🏷️  Role: ${account.role}\n`;
      output += `   📊 Status: ${account.status}\n`;
      output += `   📅 Added: ${new Date(account.createdAt).toLocaleDateString()}\n`;
      output += '\n';
    });

    return output;
  }
}
