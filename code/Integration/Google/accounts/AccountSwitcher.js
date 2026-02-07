/**
 * Account Switcher
 * Helper utility for switching between Google accounts within operations
 * 
 * Version: 1.0.0
 * Last Updated: February 7, 2026
 */

import { logger } from '../utils/logger.js';

// ============================================================================
// CONTEXT: AccountContext
// ============================================================================

/**
 * Represents a context for account switching
 */
class AccountContext {
  constructor(accountId, accountManager, googleServiceManager) {
    this.accountId = accountId;
    this.accountManager = accountManager;
    this.googleServiceManager = googleServiceManager;
    this.previousAccountId = null;
  }

  /**
   * Enter the account context (switch to this account)
   * @returns {Promise<boolean>} True if successful
   */
  async enter() {
    try {
      this.previousAccountId = this.accountManager.activeAccountId;
      const success = this.accountManager.switchAccount(this.accountId);

      if (success) {
        logger.info(`Entered account context: ${this.accountId}`);
      }

      return success;
    } catch (error) {
      logger.error('Failed to enter account context', { error: error.message });
      return false;
    }
  }

  /**
   * Exit the account context (restore previous account)
   * @returns {Promise<boolean>} True if successful
   */
  async exit() {
    try {
      if (this.previousAccountId) {
        const success = this.accountManager.switchAccount(this.previousAccountId);

        if (success) {
          logger.info(`Exited account context, restored to: ${this.previousAccountId}`);
        }

        return success;
      }

      return true;
    } catch (error) {
      logger.error('Failed to exit account context', { error: error.message });
      return false;
    }
  }
}

// ============================================================================
// SWITCHER: AccountSwitcher
// ============================================================================

class AccountSwitcher {
  /**
   * Initialize AccountSwitcher
   * @param {AccountManager} accountManager - Account manager instance
   * @param {GoogleServiceManager} googleServiceManager - Google service manager
   */
  constructor(accountManager, googleServiceManager) {
    this.accountManager = accountManager;
    this.googleServiceManager = googleServiceManager;
  }

  /**
   * Execute operation within specific account context
   * Automatically switches account, runs operation, then restores previous account
   * 
   * @param {string} accountId - Account ID to use
   * @param {Function} operation - Async function to execute
   * @returns {Promise<*>} Result of operation
   */
  async executeWithAccount(accountId, operation) {
    const context = new AccountContext(accountId, this.accountManager, this.googleServiceManager);

    try {
      // Enter account context
      const entered = await context.enter();
      if (!entered) {
        throw new Error(`Failed to switch to account: ${accountId}`);
      }

      // Execute operation
      logger.info(`Executing operation with account: ${accountId}`);
      const result = await operation();

      // Update last used
      this.accountManager.updateLastUsed(accountId);

      return result;
    } catch (error) {
      logger.error(`Operation failed in account context: ${accountId}`, {
        error: error.message,
      });
      throw error;
    } finally {
      // Exit account context (restore previous)
      await context.exit();
    }
  }

  /**
   * Execute operations across multiple accounts
   * Useful for syncing data across accounts or batch operations
   * 
   * @param {string[]} accountIds - Array of account IDs
   * @param {Function} operation - Async function to execute per account
   * @returns {Promise<Object>} Results keyed by account ID
   */
  async executeAcrossAccounts(accountIds, operation) {
    const results = {};

    for (const accountId of accountIds) {
      try {
        logger.info(`Executing across: ${accountId}`);
        results[accountId] = await this.executeWithAccount(accountId, () => operation(accountId));
      } catch (error) {
        logger.error(`Operation failed for account: ${accountId}`, {
          error: error.message,
        });
        results[accountId] = {
          error: error.message,
          success: false,
        };
      }
    }

    return results;
  }

  /**
   * Execute operation with temporary account switch
   * Shorter syntax for quick operations
   * 
   * @param {string} accountId - Account ID
   * @param {string} sheetId - Sheet ID
   * @param {Function} sheetsOperation - Function that uses sheets service
   * @returns {Promise<*>} Operation result
   */
  async readFromAccountSheet(accountId, sheetId, range = 'Sheet1') {
    return this.executeWithAccount(accountId, async () => {
      const sheetsService = this.googleServiceManager.getSheetsService();
      return sheetsService.getValues(sheetId, range);
    });
  }

  /**
   * Write to sheet in specific account
   * 
   * @param {string} accountId - Account ID
   * @param {string} sheetId - Sheet ID
   * @param {Array} values - Values to write
   * @returns {Promise<Object>} Write result
   */
  async writeToAccountSheet(accountId, sheetId, values, range = 'Sheet1') {
    return this.executeWithAccount(accountId, async () => {
      const sheetsService = this.googleServiceManager.getSheetsService();
      return sheetsService.appendRows(sheetId, values, range);
    });
  }

  /**
   * Get active account ID
   * @returns {string} Active account ID
   */
  getActiveAccount() {
    return this.accountManager.activeAccountId;
  }

  /**
   * List all accounts
   * @returns {Array} Array of account info
   */
  listAccounts() {
    return this.accountManager.listAccounts();
  }

  /**
   * Get current status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      activeAccount: this.getActiveAccount(),
      accounts: this.listAccounts(),
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { AccountSwitcher, AccountContext };
