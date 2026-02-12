/**
 * WhatsApp Multi-Account Manager for Linda Bot
 * Manages multiple WhatsApp accounts with master/secondary account support
 * 
 * Features:
 * - Add/remove multiple WhatsApp accounts
 * - Dynamic master and secondary account selection
 * - Account switching and status management
 * - Load balancing across accounts
 * - Device linking management
 * - Account synchronization
 * - Fallback mechanisms
 * 
 * Version: 1.0.0
 * Created: February 26, 2026
 * Phase: 6 M2 Module 1
 */

const logger = require('../Integration/Google/utils/logger');
const EventEmitter = require('events');

class WhatsAppMultiAccountManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.accounts = new Map();
    this.masterAccount = null;
    this.secondaryAccounts = [];
    this.accountRouting = new Map();
    this.accountMetrics = new Map();
    this.maxSecondaryAccounts = options.maxSecondaryAccounts || 5;
    this.loadBalancingStrategy = options.loadBalancingStrategy || 'round-robin';
    this.failoverEnabled = options.failoverEnabled !== false;
    this.initialized = false;
  }

  /**
   * Initialize multi-account manager
   */
  async initialize() {
    try {
      this.initialized = true;
      logger.info('WhatsApp Multi-Account Manager initialized successfully', {
        maxSecondaryAccounts: this.maxSecondaryAccounts,
        loadBalancingStrategy: this.loadBalancingStrategy,
        failoverEnabled: this.failoverEnabled
      });
      return { success: true, message: 'Multi-account manager ready' };
    } catch (error) {
      logger.error('Failed to initialize multi-account manager', { error: error.message });
      throw error;
    }
  }

  /**
   * Add a new WhatsApp account
   */
  async addAccount(accountConfig) {
    try {
      const accountId = accountConfig.id || this.generateAccountId();

      // Validate phone number
      if (!this.isValidPhoneNumber(accountConfig.phone)) {
        throw new Error('Invalid phone number format');
      }

      const account = {
        id: accountId,
        phone: accountConfig.phone,
        displayName: accountConfig.displayName || accountConfig.phone,
        deviceName: accountConfig.deviceName || `Device_${accountId}`,
        type: accountConfig.type || 'secondary',
        status: 'linked',
        isPrimary: false,
        isActive: false,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        metrics: {
          messagesSent: 0,
          messagesReceived: 0,
          connectionAttempts: 0,
          successfulConnections: 0,
          failedConnections: 0
        },
        sessionData: null,
        deviceLinking: {
          status: 'pending',
          qrCode: null,
          linkedAt: null,
          expiresAt: null
        }
      };

      // Check if this should be the master account
      if (accounts.size === 0 || accountConfig.type === 'master') {
        if (this.masterAccount) {
          // Demote current master to secondary
          const oldMaster = this.accounts.get(this.masterAccount);
          if (oldMaster) {
            oldMaster.type = 'secondary';
            this.secondaryAccounts.push(this.masterAccount);
          }
        }

        account.type = 'master';
        account.isPrimary = true;
        this.masterAccount = accountId;
        logger.info('Master account set', { accountId, phone: account.phone });
      } else {
        // Add as secondary account
        if (this.secondaryAccounts.length >= this.maxSecondaryAccounts) {
          throw new Error(`Maximum secondary accounts (${this.maxSecondaryAccounts}) reached`);
        }
        this.secondaryAccounts.push(accountId);
      }

      // Store account
      this.accounts.set(accountId, account);
      this.accountMetrics.set(accountId, {
        createdAt: new Date().toISOString(),
        messageLoadPerMinute: 0,
        connectionQuality: 100
      });

      logger.info('Account added successfully', {
        accountId,
        phone: account.phone,
        type: account.type
      });

      this.emit('account:added', {
        accountId,
        phone: account.phone,
        type: account.type
      });

      return {
        success: true,
        accountId,
        account
      };
    } catch (error) {
      logger.error('Failed to add account', { error: error.message });
      throw error;
    }
  }

  /**
   * Remove an account
   */
  async removeAccount(accountId) {
    try {
      const account = this.accounts.get(accountId);
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      // Cannot remove master if secondary accounts exist
      if (account.type === 'master' && this.secondaryAccounts.length > 0) {
        throw new Error('Cannot remove master account while secondary accounts exist');
      }

      // Remove from secondary accounts list if applicable
      if (this.secondaryAccounts.includes(accountId)) {
        this.secondaryAccounts = this.secondaryAccounts.filter(id => id !== accountId);
      }

      // Reset master if removing master account
      if (this.masterAccount === accountId) {
        if (this.secondaryAccounts.length > 0) {
          this.masterAccount = this.secondaryAccounts[0];
          const newMaster = this.accounts.get(this.masterAccount);
          newMaster.type = 'master';
          newMaster.isPrimary = true;
        } else {
          this.masterAccount = null;
        }
      }

      this.accounts.delete(accountId);
      this.accountMetrics.delete(accountId);
      this.accountRouting.delete(accountId);

      logger.info('Account removed', { accountId });
      this.emit('account:removed', { accountId });

      return { success: true, accountId };
    } catch (error) {
      logger.error('Failed to remove account', { error: error.message });
      throw error;
    }
  }

  /**
   * Switch to a different account
   */
  async switchAccount(accountId) {
    try {
      const account = this.accounts.get(accountId);
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      // Deactivate all other accounts
      for (const [id, acc] of this.accounts) {
        acc.isActive = false;
      }

      // Activate selected account
      account.isActive = true;
      account.lastActivity = new Date().toISOString();

      logger.info('Account switched', { accountId, phone: account.phone });
      this.emit('account:switched', { accountId, phone: account.phone });

      return {
        success: true,
        accountId,
        account: this.getAccountInfo(accountId)
      };
    } catch (error) {
      logger.error('Failed to switch account', { error: error.message });
      throw error;
    }
  }

  /**
   * Get routing account for a contact
   * Determines which account should handle messaging to a specific contact
   */
  getRoutingAccount(contactId) {
    try {
      // Check if contact has routing preference
      if (this.accountRouting.has(contactId)) {
        const preferredAccountId = this.accountRouting.get(contactId);
        const account = this.accounts.get(preferredAccountId);

        if (account && account.status === 'linked') {
          return account;
        }
      }

      // Use load balancing to select account
      return this.selectAccountByLoadBalance();
    } catch (error) {
      logger.error('Failed to get routing account', { error: error.message });
      // Fallback to master account
      return this.accounts.get(this.masterAccount);
    }
  }

  /**
   * Select account based on load balancing strategy
   */
  selectAccountByLoadBalance() {
    const activeAccounts = Array.from(this.accounts.values())
      .filter(acc => acc.status === 'linked');

    if (activeAccounts.length === 0) {
      return null;
    }

    switch (this.loadBalancingStrategy) {
      case 'round-robin':
        return this.roundRobinSelection(activeAccounts);

      case 'least-loaded':
        return this.leastLoadedSelection(activeAccounts);

      case 'random':
        return activeAccounts[Math.floor(Math.random() * activeAccounts.length)];

      case 'master-first':
      default:
        return this.accounts.get(this.masterAccount) || activeAccounts[0];
    }
  }

  /**
   * Round-robin account selection
   */
  roundRobinSelection(accounts) {
    if (accounts.length === 0) return null;

    if (!this._rrIndex) this._rrIndex = 0;
    const account = accounts[this._rrIndex % accounts.length];
    this._rrIndex++;

    return account;
  }

  /**
   * Least-loaded account selection
   */
  leastLoadedSelection(accounts) {
    if (accounts.length === 0) return null;

    let leastLoadedAccount = accounts[0];
    let leastLoad = Infinity;

    for (const account of accounts) {
      const metrics = this.accountMetrics.get(account.id) || {};
      const load = metrics.messageLoadPerMinute || 0;

      if (load < leastLoad) {
        leastLoad = load;
        leastLoadedAccount = account;
      }
    }

    return leastLoadedAccount;
  }

  /**
   * Set routing preference for a contact
   */
  setRoutingPreference(contactId, accountId) {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    this.accountRouting.set(contactId, accountId);
    logger.info('Routing preference set', { contactId, accountId });

    return { success: true, contactId, accountId };
  }

  /**
   * Record message activity for load balancing
   */
  recordMessageActivity(accountId, direction = 'sent') {
    const metrics = this.accountMetrics.get(accountId);
    if (metrics) {
      if (direction === 'sent') {
        metrics.messageLoadPerMinute++;
      }

      // Reset load every minute
      if (!metrics.lastReset || Date.now() - metrics.lastReset > 60000) {
        metrics.messageLoadPerMinute = direction === 'sent' ? 1 : 0;
        metrics.lastReset = Date.now();
      }
    }
  }

  /**
   * Link account to device
   */
  async linkAccountToDevice(accountId, qrCodeCallback) {
    try {
      const account = this.accounts.get(accountId);
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      // Generate QR code or device linking code
      const linkingCode = {
        code: this.generateLinkingCode(),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 5 * 60000).toISOString() // 5 minutes
      };

      account.deviceLinking.qrCode = linkingCode.code;
      account.deviceLinking.status = 'pending';

      logger.info('Device linking initiated', { accountId });
      this.emit('device:linkingStarted', { accountId, linkingCode });

      if (qrCodeCallback && typeof qrCodeCallback === 'function') {
        await qrCodeCallback(linkingCode);
      }

      return {
        success: true,
        accountId,
        linkingCode
      };
    } catch (error) {
      logger.error('Failed to link account', { error: error.message });
      throw error;
    }
  }

  /**
   * Confirm device linking
   */
  async confirmDeviceLinking(accountId) {
    try {
      const account = this.accounts.get(accountId);
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      account.deviceLinking.status = 'linked';
      account.deviceLinking.linkedAt = new Date().toISOString();
      account.status = 'linked';

      logger.info('Device linked successfully', { accountId });
      this.emit('device:linked', { accountId });

      return {
        success: true,
        accountId,
        linkedAt: account.deviceLinking.linkedAt
      };
    } catch (error) {
      logger.error('Failed to confirm device linking', { error: error.message });
      throw error;
    }
  }

  /**
   * Get account information
   */
  getAccountInfo(accountId) {
    const account = this.accounts.get(accountId);
    if (!account) {
      return null;
    }

    const metrics = this.accountMetrics.get(accountId) || {};

    return {
      id: account.id,
      phone: account.phone,
      displayName: account.displayName,
      type: account.type,
      status: account.status,
      isActive: account.isActive,
      isPrimary: account.isPrimary,
      createdAt: account.createdAt,
      lastActivity: account.lastActivity,
      metrics: {
        ...account.metrics,
        ...metrics
      },
      deviceLinking: account.deviceLinking
    };
  }

  /**
   * List all accounts
   */
  listAccounts(filter = {}) {
    let accounts = Array.from(this.accounts.values());

    if (filter.type) {
      accounts = accounts.filter(a => a.type === filter.type);
    }

    if (filter.status) {
      accounts = accounts.filter(a => a.status === filter.status);
    }

    return accounts.map(a => this.getAccountInfo(a.id));
  }

  /**
   * Get master account
   */
  getMasterAccount() {
    if (!this.masterAccount) {
      return null;
    }

    return this.getAccountInfo(this.masterAccount);
  }

  /**
   * Get secondary accounts
   */
  getSecondaryAccounts() {
    return this.secondaryAccounts.map(id => this.getAccountInfo(id));
  }

  /**
   * Get account status
   */
  getStatus() {
    const activeAccounts = Array.from(this.accounts.values())
      .filter(a => a.status === 'linked').length;

    return {
      totalAccounts: this.accounts.size,
      activeAccounts,
      masterAccount: this.getMasterAccount(),
      secondaryAccounts: this.getSecondaryAccounts(),
      loadBalancingStrategy: this.loadBalancingStrategy,
      failoverEnabled: this.failoverEnabled
    };
  }

  /**
   * Validate phone number
   */
  isValidPhoneNumber(phone) {
    // Basic validation - should be customized based on requirements
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  }

  /**
   * Generate unique account ID
   */
  generateAccountId() {
    return `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate device linking code
   */
  generateLinkingCode() {
    return Math.random().toString(36).substr(2, 20).toUpperCase();
  }

  /**
   * Get manager statistics
   */
  getStatistics() {
    const accounts = Array.from(this.accounts.values());
    const totalMessages = accounts.reduce((sum, a) => sum + a.metrics.messagesSent, 0);
    const totalReceived = accounts.reduce((sum, a) => sum + a.metrics.messagesReceived, 0);

    return {
      totalAccounts: accounts.length,
      masterAccount: this.masterAccount,
      secondaryAccounts: this.secondaryAccounts.length,
      linkedAccounts: accounts.filter(a => a.status === 'linked').length,
      totalMessages,
      totalReceived,
      averageMessagesPerAccount: accounts.length > 0 ? (totalMessages / accounts.length).toFixed(2) : 0,
      accountHealth: this.calculateAccountHealth(accounts)
    };
  }

  /**
   * Calculate overall account health
   */
  calculateAccountHealth(accounts) {
    if (accounts.length === 0) return 0;

    const healthScores = accounts.map(account => {
      const successRate = account.metrics.successfulConnections > 0
        ? (account.metrics.successfulConnections / (account.metrics.connectionAttempts || 1)) * 100
        : 0;

      return successRate;
    });

    const averageHealth = healthScores.reduce((sum, score) => sum + score, 0) / accounts.length;
    return Math.round(averageHealth);
  }
}

module.exports = WhatsAppMultiAccountManager;
