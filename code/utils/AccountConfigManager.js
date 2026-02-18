/**
 * AccountConfigManager.js
 * ═══════════════════════════════════════════════════════════════════════════
 * Manages dynamic WhatsApp account configuration
 * 
 * Features:
 * - Add/remove accounts without restart
 * - Hot-reload configuration from file
 * - Validate account data before saving
 * - Persist changes to bots-config.json
 * - Support for master account management
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

export class AccountConfigManager {
  constructor(logBotFn) {
    this.logBot = logBotFn || console.log;
    this.config = null;
    this.masterAccountId = null;
    this.loadConfig();
  }

  /**
   * Load configuration from file
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

      // Find master account
      const masterBot = Object.values(this.config.whatsappBots || {}).find(
        bot => bot.role === 'primary' || bot.role === 'master'
      );
      this.masterAccountId = masterBot?.id || null;

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
      this.logBot('Account configuration saved', 'success');
      return true;
    } catch (error) {
      this.logBot(`Failed to save config: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Add a new WhatsApp account
   */
  async addAccount(accountData) {
    try {
      // Validate required fields
      const { phone, displayName, accountId, description, role } = accountData;

      if (!phone || !displayName || !accountId) {
        return { success: false, error: 'Missing required fields: phone, displayName, accountId' };
      }

      // Validate phone format
      if (!this.isValidPhoneNumber(phone)) {
        return { success: false, error: 'Invalid phone number format. Use +971XXXXXXXXX (UAE format)' };
      }

      // Check if account already exists
      if (this.getAccount(accountId)) {
        return { success: false, error: `Account ${accountId} already exists` };
      }

      // Check if phone already used
      const existingPhone = Object.values(this.config.whatsappBots || {}).find(
        bot => bot.phoneNumber === phone
      );
      if (existingPhone) {
        return { success: false, error: `Phone number ${phone} already in use by ${existingPhone.displayName}` };
      }

      // Create account config
      const newAccount = {
        id: accountId,
        phoneNumber: phone,
        displayName: displayName,
        description: description || `WhatsApp Account - ${displayName}`,
        role: role || 'secondary',
        sessionPath: `sessions/session-${phone.replace(/\D/g, '')}`,
        enabled: true,
        features: {
          messaging: true,
          contacts: true,
          campaigns: true,
          analytics: true,
          scheduling: true
        },
        status: 'pending',
        createdAt: new Date().toISOString().split('T')[0],
        lastSync: null
      };

      // Get unique key for config
      const configKey = this.sanitizeKey(displayName);

      // Add to config
      this.config.whatsappBots[configKey] = newAccount;

      // Save to file
      const saved = await this.saveConfig();
      if (!saved) {
        // Rollback
        delete this.config.whatsappBots[configKey];
        return { success: false, error: 'Failed to save configuration' };
      }

      return {
        success: true,
        message: `Account added: ${displayName} (${phone})`,
        account: newAccount,
        requiresLinking: true
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove an account
   */
  async removeAccount(accountId) {
    try {
      const account = this.getAccount(accountId);
      if (!account) {
        return { success: false, error: `Account ${accountId} not found` };
      }

      // Don't allow removing master if it's the only account
      if (account.role === 'primary' && Object.keys(this.config.whatsappBots || {}).length === 1) {
        return { success: false, error: 'Cannot remove the last account' };
      }

      // Find and delete the account
      let found = false;
      for (const [key, bot] of Object.entries(this.config.whatsappBots)) {
        if (bot.id === accountId) {
          delete this.config.whatsappBots[key];
          found = true;
          break;
        }
      }

      if (!found) {
        return { success: false, error: `Account ${accountId} not found` };
      }

      // Save config
      const saved = await this.saveConfig();
      if (!saved) {
        return { success: false, error: 'Failed to save configuration' };
      }

      return {
        success: true,
        message: `Account removed: ${account.displayName}`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get account by ID
   */
  getAccount(accountId) {
    return Object.values(this.config.whatsappBots || {}).find(bot => bot.id === accountId);
  }

  /**
   * Get account by phone number
   */
  getAccountByPhone(phone) {
    return Object.values(this.config.whatsappBots || {}).find(
      bot => bot.phoneNumber === phone
    );
  }

  /**
   * Update account status
   */
  async updateAccountStatus(accountId, status) {
    try {
      let found = false;
      for (const bot of Object.values(this.config.whatsappBots || {})) {
        if (bot.id === accountId) {
          bot.status = status;
          bot.lastSync = new Date().toISOString();
          found = true;
          break;
        }
      }

      if (!found) {
        return { success: false, error: `Account ${accountId} not found` };
      }

      await this.saveConfig();
      return { success: true, message: `Status updated to: ${status}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Enable account
   */
  async enableAccount(accountId) {
    try {
      let found = false;
      for (const bot of Object.values(this.config.whatsappBots || {})) {
        if (bot.id === accountId) {
          bot.enabled = true;
          found = true;
          break;
        }
      }

      if (!found) {
        return { success: false, error: `Account ${accountId} not found` };
      }

      await this.saveConfig();
      return { success: true, message: `Account enabled: ${this.getAccount(accountId).displayName}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Disable account
   */
  async disableAccount(accountId) {
    try {
      let found = false;
      for (const bot of Object.values(this.config.whatsappBots || {})) {
        if (bot.id === accountId) {
          bot.enabled = false;
          found = true;
          break;
        }
      }

      if (!found) {
        return { success: false, error: `Account ${accountId} not found` };
      }

      await this.saveConfig();
      return { success: true, message: `Account disabled: ${this.getAccount(accountId).displayName}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all accounts
   */
  getAllAccounts() {
    return Object.values(this.config.whatsappBots || {});
  }

  /**
   * Get enabled accounts
   */
  getEnabledAccounts() {
    return Object.values(this.config.whatsappBots || {}).filter(bot => bot.enabled !== false);
  }

  /**
   * Get master account
   */
  getMasterAccount() {
    return Object.values(this.config.whatsappBots || {}).find(
      bot => bot.role === 'primary' || bot.role === 'master'
    );
  }

  /**
   * Set account as master (primary)
   */
  async setMasterAccount(accountId) {
    try {
      // Remove primary from all
      for (const bot of Object.values(this.config.whatsappBots || {})) {
        if (bot.role === 'primary') {
          bot.role = 'secondary';
        }
      }

      // Set as primary
      let found = false;
      for (const bot of Object.values(this.config.whatsappBots || {})) {
        if (bot.id === accountId) {
          bot.role = 'primary';
          this.masterAccountId = accountId;
          found = true;
          break;
        }
      }

      if (!found) {
        return { success: false, error: `Account ${accountId} not found` };
      }

      await this.saveConfig();
      const account = this.getAccount(accountId);
      return { success: true, message: `Master account set to: ${account.displayName}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phone) {
    // UAE format: +971XXXXXXXXX (9 digits after 971)
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length === 12 && cleanPhone.startsWith('971');
  }

  /**
   * Get master phone number
   */
  getMasterPhoneNumber() {
    const master = this.getMasterAccount();
    return master?.phoneNumber || null;
  }

  /**
   * Sanitize account key for JSON
   */
  sanitizeKey(name) {
    return name
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 30) || ('account_' + Date.now());
  }

  /**
   * Get account count
   */
  getAccountCount() {
    return Object.keys(this.config.whatsappBots || {}).length;
  }

  /**
   * Get linked accounts (status = active/linked)
   */
  getLinkedAccounts() {
    return Object.values(this.config.whatsappBots || {}).filter(
      bot => bot.status === 'active' || bot.status === 'linked'
    );
  }

  /**
   * Get pending accounts (needs linking)
   */
  getPendingAccounts() {
    return Object.values(this.config.whatsappBots || {}).filter(
      bot => bot.status === 'pending' || !bot.status
    );
  }

  /**
   * Format account for display
   */
  formatAccountForDisplay(account) {
    const statusIcon = account.status === 'active' ? '✅' : '⏳';
    const roleIcon = account.role === 'primary' ? '👑' : '📱';
    
    return {
      display: `${roleIcon} ${account.displayName}`,
      phone: account.phoneNumber,
      status: `${statusIcon} ${account.status || 'pending'}`,
      enabled: account.enabled ? 'Yes' : 'No',
      id: account.id
    };
  }

  /**
   * Print account summary (for terminal)
   */
  printSummary() {
    const accounts = this.getAllAccounts();
    console.log(`\n📱 Account Summary:\n`);
    console.log(`Total Accounts: ${accounts.length}`);
    console.log(`Linked: ${this.getLinkedAccounts().length}`);
    console.log(`Pending: ${this.getPendingAccounts().length}`);
    console.log(`Master: ${this.getMasterAccount()?.displayName || 'Not set'}\n`);

    accounts.forEach((account, idx) => {
      const statusIcon = account.status === 'active' ? '✅' : '⏳';
      const roleIcon = account.role === 'primary' ? '👑' : '📱';
      console.log(`${idx + 1}. ${roleIcon} ${account.displayName}`);
      console.log(`   ${account.phoneNumber} | ${statusIcon} ${account.status || 'pending'}`);
    });
    console.log('');
  }

  /**
   * NEW FEATURE: Get all master accounts (primary role)
   */
  getAllMasterAccounts() {
    const accounts = this.getAllAccounts();
    return accounts.filter(acc => acc.role === 'primary' || acc.role === 'master');
  }

  /**
   * NEW FEATURE: Get all servant accounts (secondary role)
   */
  getAllServantAccounts() {
    const accounts = this.getAllAccounts();
    return accounts.filter(acc => acc.role === 'secondary' || acc.role === 'servant');
  }

  /**
   * NEW FEATURE: Find account by phone number
   */
  getAccountByPhone(phoneNumber) {
    const accounts = this.getAllAccounts();
    if (!phoneNumber) return null;
    
    // Normalize phone number for comparison (remove + if present)
    const normalizedPhone = String(phoneNumber).replace(/^\+/, '');
    return accounts.find(acc => {
      const accPhone = String(acc.phoneNumber).replace(/^\+/, '');
      return accPhone === normalizedPhone;
    });
  }

  /**
   * NEW FEATURE: Add a master account
   */
  async addMasterAccount(phone, displayName) {
    if (!phone) throw new Error('Phone number required');
    
    const accountData = {
      accountId: `master_${Date.now()}`,
      phone: phone,
      displayName: displayName || `Master - ${phone}`,
      role: 'primary',
      description: `Master Account - ${displayName || phone}`
    };

    return await this.addAccount(accountData);
  }

  /**
   * NEW FEATURE: Add a servant account
   */
  async addServantAccount(phone, displayName) {
    if (!phone) throw new Error('Phone number required');
    
    const accountData = {
      accountId: `servant_${Date.now()}`,
      phone: phone,
      displayName: displayName || `Servant - ${phone}`,
      role: 'secondary',
      description: `Servant Account - ${displayName || phone}`
    };

    return await this.addAccount(accountData);
  }

  /**
   * NEW FEATURE: Switch to a different master account by phone
   */
  async switchMasterAccount(phoneNumber) {
    const account = this.getAccountByPhone(phoneNumber);
    if (!account) {
      this.logBot(`Account not found: ${phoneNumber}`, 'error');
      return false;
    }

    if (account.role !== 'primary' && account.role !== 'master') {
      this.logBot(`Account is not a master account: ${phoneNumber}`, 'error');
      return false;
    }

    // Update all accounts: remove primary from others, set on target
    for (const bot of Object.values(this.config.whatsappBots || {})) {
      if (bot.id === account.id) {
        bot.role = 'primary';
      } else if (bot.role === 'primary') {
        bot.role = 'secondary';
      }
    }

    this.masterAccountId = account.id;
    await this.saveConfig();
    this.logBot(`✅ Switched to master account: ${phoneNumber}`, 'success');
    return true;
  }

  /**
   * NEW FEATURE: List all accounts with their roles
   */
  listAllAccountsWithRoles() {
    const masters = this.getAllMasterAccounts();
    const servants = this.getAllServantAccounts();

    console.log('\n👑 MASTER ACCOUNTS:');
    if (masters.length === 0) {
      console.log('  (none)');
    } else {
      masters.forEach((acc, idx) => {
        const status = acc.status === 'active' ? '✅' : '⏳';
        console.log(`  ${idx + 1}. ${acc.displayName} - ${acc.phoneNumber} [${status}]`);
      });
    }

    console.log('\n📱 SERVANT ACCOUNTS:');
    if (servants.length === 0) {
      console.log('  (none)');
    } else {
      servants.forEach((acc, idx) => {
        const status = acc.status === 'active' ? '✅' : '⏳';
        console.log(`  ${idx + 1}. ${acc.displayName} - ${acc.phoneNumber} [${status}]`);
      });
    }
    console.log('');
  }

  /**
   * NEW FEATURE: Validate and update master account by phone
   */
  validateMasterPhone(phoneNumber) {
    if (!phoneNumber) return null;
    const account = this.getAccountByPhone(phoneNumber);
    
    if (!account) {
      this.logBot(`❌ Master account not found: ${phoneNumber}`, 'error');
      this.logBot(`   Available masters:`, 'info');
      this.getAllMasterAccounts().forEach(m => {
        this.logBot(`   • ${m.phoneNumber}`, 'info');
      });
      return null;
    }

    return account.phoneNumber;
  }
}
