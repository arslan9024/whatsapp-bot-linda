/**
 * ====================================================================
 * UNIFIED ACCOUNT MANAGER
 * ====================================================================
 * Single source of truth for all account management operations
 * Consolidates: Config, Device State, Session Status, Health Metrics
 * 
 * @version 1.0
 * @status Production Ready
 * @created February 18, 2026 - Phase 26
 * 
 * Features:
 * - Single API interface for all account operations
 * - Automatic state synchronization across all managers
 * - Unified account health monitoring
 * - Session restoration with automatic QR bypass
 * - Per-account metrics and analytics
 */

import { SessionManager } from './SessionManager.js';

export class UnifiedAccountManager {
  constructor(opts = {}) {
    this.logFunction = opts.logFunction || console.log;
    
    // Delegated managers
    this.accountConfigManager = opts.accountConfigManager;
    this.deviceLinkedManager = opts.deviceLinkedManager;
    this.accountHealthMonitor = opts.accountHealthMonitor;
    this.sessionRecoveryManager = opts.sessionRecoveryManager;
    
    // Cache for performance
    this.accountCache = new Map();
    this.lastSyncTime = new Map();
    this.syncInterval = 5000; // 5 seconds
  }

  /**
   * ====================================================================
   * ACCOUNT INFO & RETRIEVAL
   * ====================================================================
   */

  /**
   * Get complete account information with all state
   */
  getAccount(phoneNumber) {
    try {
      if (!phoneNumber) return null;
      
      phoneNumber = phoneNumber.trim();
      
      // Return cached version if fresh
      if (this.isCacheFresh(phoneNumber)) {
        return this.accountCache.get(phoneNumber);
      }

      // Build unified account object
      const configAccount = this.accountConfigManager?.getAccountByPhone(phoneNumber);
      const deviceState = this.deviceLinkedManager?.getDevice(phoneNumber);
      const sessionData = SessionManager.canRestoreSession(phoneNumber);

      if (!configAccount && !deviceState) {
        return null; // Account doesn't exist
      }

      const unifiedAccount = {
        // Configuration
        id: configAccount?.id,
        phoneNumber,
        displayName: configAccount?.displayName || deviceState?.name || phoneNumber,
        role: configAccount?.role || deviceState?.role || 'secondary',
        type: configAccount?.type || 'whatsapp',
        
        // Status Information
        status: this._getUnifiedStatus(configAccount, deviceState),
        deviceStatus: deviceState?.status || 'unlinked',
        configStatus: configAccount?.status || 'pending',
        sessionValid: sessionData,
        
        // Authentication
        authMethod: deviceState?.authMethod || null,
        linkedAt: deviceState?.linkedAt || null,
        
        // Health
        isOnline: deviceState?.isOnline || false,
        uptime: deviceState?.uptime || 0,
        lastHeartbeat: deviceState?.lastHeartbeat || null,
        lastActivity: deviceState?.lastActivity || null,
        lastError: deviceState?.lastError || null,
        
        // Metadata
        ipAddress: deviceState?.ipAddress || null,
        createdAt: configAccount?.createdAt || deviceState?.createdAt,
        lastSync: configAccount?.lastSync || null,
        
        // Health score (0-100)
        healthScore: this._calculateHealthScore(phoneNumber),
      };

      // Cache the result
      this.accountCache.set(phoneNumber, unifiedAccount);
      this.lastSyncTime.set(phoneNumber, Date.now());

      return unifiedAccount;
    } catch (error) {
      this.logFunction(`❌ Error getting account ${phoneNumber}: ${error.message}`, 'error');
      return null;
    }
  }

  /**
   * Get all accounts
   */
  getAllAccounts() {
    try {
      const allAccounts = [];
      
      // Get from config
      const configAccounts = this.accountConfigManager?.getAllAccounts() || [];
      const deviceAccounts = this.deviceLinkedManager?.getAllDevices() || [];

      // Collect all unique phone numbers
      const phoneNumbers = new Set();
      configAccounts.forEach(acc => phoneNumbers.add(acc.phoneNumber));
      deviceAccounts.forEach(dev => phoneNumbers.add(dev.phoneNumber));

      // Build unified accounts
      phoneNumbers.forEach(phone => {
        const account = this.getAccount(phone);
        if (account) allAccounts.push(account);
      });

      return allAccounts;
    } catch (error) {
      this.logFunction(`❌ Error getting all accounts: ${error.message}`, 'error');
      return [];
    }
  }

  /**
   * Get accounts by status
   */
  getAccountsByStatus(status) {
    return this.getAllAccounts().filter(acc => acc.status === status);
  }

  /**
   * Get master accounts
   */
  getMasterAccounts() {
    return this.getAllAccounts().filter(acc => acc.role === 'master');
  }

  /**
   * Get servant accounts
   */
  getServantAccounts() {
    return this.getAllAccounts().filter(acc => acc.role === 'servant');
  }

  /**
   * ====================================================================
   * ACCOUNT STATUS MANAGEMENT
   * ====================================================================
   */

  /**
   * Get unified status across all managers
   */
  getAccountStatus(phoneNumber) {
    const account = this.getAccount(phoneNumber);
    return account?.status || 'unknown';
  }

  /**
   * Check if account is linked
   */
  isAccountLinked(phoneNumber) {
    const account = this.getAccount(phoneNumber);
    return account?.status === 'linked' && account?.isOnline;
  }

  /**
   * Check if account is pending
   */
  isAccountPending(phoneNumber) {
    const account = this.getAccount(phoneNumber);
    return account?.status === 'pending' || account?.status === 'linking';
  }

  /**
   * Check if account has errors
   */
  hasAccountError(phoneNumber) {
    const account = this.getAccount(phoneNumber);
    return account?.status === 'error';
  }

  /**
   * ====================================================================
   * SESSION MANAGEMENT
   * ====================================================================
   */

  /**
   * Check if session is valid
   */
  isSessionValid(phoneNumber) {
    try {
      const account = this.getAccount(phoneNumber);
      if (!account) return false;
      
      // Session is valid if:
      // 1. SessionManager says yes AND
      // 2. Device is marked as linked OR device status is 'linked'
      return account.sessionValid && (account.deviceStatus === 'linked' || account.status === 'linked');
    } catch (error) {
      this.logFunction(`⚠️  Error checking session validity: ${error.message}`, 'warn');
      return false;
    }
  }

  /**
   * Check if session can be restored
   */
  canRestoreSession(phoneNumber) {
    try {
      return SessionManager.canRestoreSession(phoneNumber);
    } catch (error) {
      this.logFunction(`⚠️  Error checking session restoration: ${error.message}`, 'warn');
      return false;
    }
  }

  /**
   * Attempt to restore session with fallback strategy
   */
  async attemptSessionRestore(phoneNumber) {
    try {
      this.logFunction(`🔄 Attempting session restoration for ${phoneNumber}...`, 'info');

      // Step 1: Check if session exists
      if (!this.canRestoreSession(phoneNumber)) {
        return {
          success: false,
          reason: 'Session folder missing or invalid',
          fallback: 'qr_code'
        };
      }

      this.logFunction(`✅ Session found, attempting restore...`, 'info');

      // Step 2: Try to restore via SessionRecoveryManager if available
      if (this.sessionRecoveryManager) {
        try {
          const restored = await this.sessionRecoveryManager.restoreSession(phoneNumber);
          if (restored) {
            this._markAccountLinked(phoneNumber, { authMethod: 'restore' });
            return {
              success: true,
              method: 'restore',
              message: 'Session restored successfully'
            };
          }
        } catch (restoreError) {
          this.logFunction(`⚠️  Session restoration failed: ${restoreError.message}`, 'warn');
        }
      }

      // Step 3: Fallback to QR code
      return {
        success: false,
        reason: 'Session restoration failed',
        fallback: 'qr_code'
      };
    } catch (error) {
      this.logFunction(`❌ Session restoration error: ${error.message}`, 'error');
      return {
        success: false,
        reason: error.message,
        fallback: 'qr_code'
      };
    }
  }

  /**
   * ====================================================================
   * DEVICE LINKING & MANAGEMENT
   * ====================================================================
   */

  /**
   * Initiate device linking (show QR code)
   */
  async initiateDeviceLinking(phoneNumber, authMethod = 'qr') {
    try {
      // Step 1: Check if session can be restored
      if (this.canRestoreSession(phoneNumber)) {
        this.logFunction(`✅ Valid session exists - skipping QR code`, 'info');
        return {
          success: true,
          method: 'restore',
          requiresQR: false
        };
      }

      // Step 2: Register device for linking
      if (this.deviceLinkedManager) {
        this.deviceLinkedManager.registerDevice(phoneNumber, {
          status: 'linking',
          authMethod
        });
      }

      // Step 3: Clear cache
      this.invalidateCache(phoneNumber);

      return {
        success: true,
        method: authMethod,
        requiresQR: true
      };
    } catch (error) {
      this.logFunction(`❌ Error initiating device linking: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark device as successfully linked
   */
  _markAccountLinked(phoneNumber, linkData = {}) {
    try {
      const now = new Date().toISOString();

      // Update config
      if (this.accountConfigManager) {
        const account = this.accountConfigManager.getAccountByPhone(phoneNumber);
        if (account) {
          this.accountConfigManager.updateAccountStatus(account.id, 'linked');
        }
      }

      // Update device manager
      if (this.deviceLinkedManager) {
        this.deviceLinkedManager.markDeviceLinked(phoneNumber, {
          linkedAt: linkData.linkedAt || now,
          authMethod: linkData.authMethod || 'qr',
          ipAddress: linkData.ipAddress || null
        });
      }

      // Clear cache to force refresh
      this.invalidateCache(phoneNumber);
    } catch (error) {
      this.logFunction(`⚠️  Error marking account linked: ${error.message}`, 'warn');
    }
  }

  /**
   * ====================================================================
   * HEALTH & MONITORING
   * ====================================================================
   */

  /**
   * Get account health status
   */
  getAccountHealth(phoneNumber) {
    try {
      const account = this.getAccount(phoneNumber);
      if (!account) return null;

      const health = {
        phoneNumber,
        displayName: account.displayName,
        overallStatus: this._getHealthStatus(account),
        score: account.healthScore,
        
        // Connection
        isOnline: account.isOnline,
        uptime: account.uptime ? `${Math.floor(account.uptime / 60)}m` : '--',
        lastHeartbeat: account.lastHeartbeat ? new Date(account.lastHeartbeat).toLocaleTimeString() : '--',
        
        // Session
        sessionValid: account.sessionValid,
        linkedAt: account.linkedAt ? new Date(account.linkedAt).toLocaleDateString() : '--',
        
        // Errors
        lastError: account.lastError?.message || '--',
        hasErrors: !!account.lastError,
      };

      return health;
    } catch (error) {
      this.logFunction(`⚠️  Error getting account health: ${error.message}`, 'warn');
      return null;
    }
  }

  /**
   * Get account metrics
   */
  getAccountMetrics(phoneNumber) {
    try {
      const account = this.getAccount(phoneNumber);
      if (!account) return null;

      // Get metrics from health monitor if available
      const healthMetrics = this.accountHealthMonitor?.getMetrics(phoneNumber) || {};

      return {
        phoneNumber,
        displayName: account.displayName,
        uptime: account.uptime || 0,
        lastHeartbeat: account.lastHeartbeat,
        messageCount: healthMetrics.messageCount || 0,
        errorCount: healthMetrics.errorCount || 0,
        linkAttempts: account.deviceState?.linkAttempts || 0,
        ...healthMetrics
      };
    } catch (error) {
      this.logFunction(`⚠️  Error getting account metrics: ${error.message}`, 'warn');
      return null;
    }
  }

  /**
   * ====================================================================
   * ACCOUNT CONFIGURATION
   * ====================================================================
   */

  /**
   * Add new master account
   */
  async addMasterAccount(phoneNumber, displayName) {
    try {
      if (!this.accountConfigManager) {
        return { success: false, error: 'Account config manager not initialized' };
      }

      const result = await this.accountConfigManager.addMasterAccount(phoneNumber, displayName);
      
      if (result.success) {
        // Also register in device manager
        if (this.deviceLinkedManager) {
          this.deviceLinkedManager.registerDevice(phoneNumber, {
            role: 'master',
            displayName,
            status: 'pending'
          });
        }
        
        this.invalidateCache(phoneNumber);
      }

      return result;
    } catch (error) {
      this.logFunction(`❌ Error adding master account: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Add new servant account
   */
  async addServantAccount(phoneNumber, displayName, masterPhone) {
    try {
      if (!this.accountConfigManager) {
        return { success: false, error: 'Account config manager not initialized' };
      }

      const result = await this.accountConfigManager.addServantAccount(phoneNumber, displayName, masterPhone);
      
      if (result.success) {
        // Also register in device manager
        if (this.deviceLinkedManager) {
          this.deviceLinkedManager.registerDevice(phoneNumber, {
            role: 'servant',
            displayName,
            masterAccount: masterPhone,
            status: 'pending'
          });
        }
        
        this.invalidateCache(phoneNumber);
      }

      return result;
    } catch (error) {
      this.logFunction(`❌ Error adding servant account: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Update account status
   */
  async updateAccountStatus(phoneNumber, status) {
    try {
      if (!this.accountConfigManager) {
        return { success: false, error: 'Account config manager not initialized' };
      }

      const account = this.accountConfigManager.getAccountByPhone(phoneNumber);
      if (!account) {
        return { success: false, error: 'Account not found' };
      }

      const result = await this.accountConfigManager.updateAccountStatus(account.id, status);
      
      if (result.success) {
        this.invalidateCache(phoneNumber);
      }

      return result;
    } catch (error) {
      this.logFunction(`❌ Error updating account status: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete account
   */
  async deleteAccount(phoneNumber) {
    try {
      if (!this.accountConfigManager) {
        return { success: false, error: 'Account config manager not initialized' };
      }

      const account = this.accountConfigManager.getAccountByPhone(phoneNumber);
      if (!account) {
        return { success: false, error: 'Account not found' };
      }

      await this.accountConfigManager.removeAccount(account.id);
      
      // Also remove from device manager
      if (this.deviceLinkedManager) {
        this.deviceLinkedManager.removeDevice(phoneNumber);
      }

      this.invalidateCache(phoneNumber);
      return { success: true };
    } catch (error) {
      this.logFunction(`❌ Error deleting account: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * ====================================================================
   * SYNCHRONIZATION & CACHE MANAGEMENT
   * ====================================================================
   */

  /**
   * Manually sync all managers
   */
  syncAllManagers() {
    try {
      // Clear all caches
      this.accountCache.clear();
      this.lastSyncTime.clear();

      this.logFunction(`✅ All managers synchronized`, 'info');
      return true;
    } catch (error) {
      this.logFunction(`❌ Error syncing managers: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Invalidate cache for specific account
   */
  invalidateCache(phoneNumber) {
    this.accountCache.delete(phoneNumber);
    this.lastSyncTime.delete(phoneNumber);
  }

  /**
   * Check if cache is fresh
   */
  isCacheFresh(phoneNumber) {
    const lastSync = this.lastSyncTime.get(phoneNumber);
    if (!lastSync) return false;
    return (Date.now() - lastSync) < this.syncInterval;
  }

  /**
   * ====================================================================
   * HELPER METHODS
   * ====================================================================
   */

  /**
   * Determine unified status from multiple sources
   */
  _getUnifiedStatus(configAccount, deviceState) {
    // If device is linked, account is linked
    if (deviceState?.status === 'linked') return 'linked';
    
    // Use device status as primary
    if (deviceState?.status === 'linking') return 'linking';
    if (deviceState?.status === 'error') return 'error';
    
    // Fall back to config status
    if (configAccount?.status === 'linked') return 'linked';
    if (configAccount?.status === 'active') return 'linked';
    if (configAccount?.status === 'pending') return 'pending';
    if (configAccount?.status === 'error') return 'error';
    
    // Default
    return 'unlinked';
  }

  /**
   * Calculate health score (0-100)
   */
  _calculateHealthScore(phoneNumber) {
    try {
      const device = this.deviceLinkedManager?.getDevice(phoneNumber);
      if (!device) return 0;

      let score = 0;

      // Status points (40)
      if (device.status === 'linked') score += 40;
      else if (device.status === 'linking') score += 20;

      // Online status points (30)
      if (device.isOnline) score += 30;

      // Uptime points (20)
      if (device.uptime > 3600000) score += 20; // > 1 hour
      else if (device.uptime > 600000) score += 10; // > 10 mins

      // Error penalty (-10)
      if (device.lastError) score -= 10;

      return Math.max(0, Math.min(100, score));
    } catch (error) {
      return 0;
    }
  }

  /**
   * Determine health status label
   */
  _getHealthStatus(account) {
    if (account.status === 'error') return 'ERROR';
    if (!account.isOnline) return 'OFFLINE';
    if (account.healthScore >= 80) return 'HEALTHY';
    if (account.healthScore >= 50) return 'FAIR';
    return 'POOR';
  }
}

export default UnifiedAccountManager;
