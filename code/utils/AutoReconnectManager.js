/**
 * AutoReconnectManager.js
 * 
 * Phase 29d: Advanced Recovery Strategies - Auto-Reconnection System
 * 
 * Handles automatic reconnection when WhatsApp accounts lose connection.
 * Features:
 * - Monitors connection status continuously
 * - Detects disconnections in real-time
 * - Initiates reconnection with exponential backoff
 * - Tracks reconnection attempts and success rates
 * - Integrates with other recovery systems
 * 
 * Usage:
 *   const reconnectMgr = new AutoReconnectManager({
 *     accountConnectionMonitor,
 *     autoAccountRelinkingManager,
 *     terminalDashboard,
 *     maxReconnectAttempts: 5,
 *     initialBackoffMs: 2000
 *   });
 */

class AutoReconnectManager {
  constructor(options = {}) {
    this.accountConnectionMonitor = options.accountConnectionMonitor;
    this.autoAccountRelinkingManager = options.autoAccountRelinkingManager;
    this.terminalDashboard = options.terminalDashboard;
    
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.initialBackoffMs = options.initialBackoffMs || 2000;
    this.maxBackoffMs = options.maxBackoffMs || 60000; // Max 60 seconds
    
    // Tracking state
    this.reconnectState = new Map(); // phone -> { attempts, lastAttempt, backoff }
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.monitoringIntervalMs = options.monitoringIntervalMs || 5000; // Check every 5 seconds
    
    // Statistics
    this.stats = {
      totalDisconnections: 0,
      successfulReconnects: 0,
      failedReconnects: 0,
      totalAttemptsNeeded: 0,
      averageReconnectTime: 0
    };
  }

  /**
   * Initialize auto-reconnect system
   */
  async initialize() {
    try {
      console.log('[AutoReconnect] Initializing auto-reconnect system...');
      return true;
    } catch (error) {
      console.error('[AutoReconnect] Init error:', error.message);
      return false;
    }
  }

  /**
   * Start monitoring for disconnections
   */
  startMonitoring(accountPhones = []) {
    if (this.isMonitoring) {
      console.log('[AutoReconnect] Monitoring already active');
      return;
    }

    this.isMonitoring = true;
    console.log(`[AutoReconnect] Starting monitoring for ${accountPhones.length} account(s)`);

    // Initialize tracking state for each account
    accountPhones.forEach(phone => {
      if (!this.reconnectState.has(phone)) {
        this.reconnectState.set(phone, {
          attempts: 0,
          lastAttempt: null,
          backoff: this.initialBackoffMs,
          status: 'online',
          lastStatusChange: new Date().toISOString()
        });
      }
    });

    // Start periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this._checkAndReconnect();
    }, this.monitoringIntervalMs);

    console.log(`[AutoReconnect] Monitoring active (${this.monitoringIntervalMs}ms interval)`);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('[AutoReconnect] Monitoring stopped');
  }

  /**
   * Check for disconnected accounts and attempt reconnection
   */
  async _checkAndReconnect() {
    if (!this.accountConnectionMonitor) return;

    const health = this.accountConnectionMonitor.getHealthReport();
    if (!health || !health.accounts) return;

    for (const accountStatus of health.accounts) {
      const phone = accountStatus.phone;
      
      // Check if account went offline
      if (accountStatus.status === 'offline') {
        const state = this.reconnectState.get(phone);
        
        if (state && state.status === 'online') {
          // Status changed from online to offline - trigger reconnect
          console.log(`[AutoReconnect] ⚠️  Disconnection detected: ${phone}`);
          this.stats.totalDisconnections++;
          await this._attemptReconnect(phone);
        }
      } else if (accountStatus.status === 'online') {
        // Account is online, reset reconnect attempts
        const state = this.reconnectState.get(phone);
        if (state && state.attempts > 0) {
          console.log(`[AutoReconnect] ✅ Reconnected: ${phone} (${state.attempts} attempts needed)`);
          this.stats.successfulReconnects++;
          this.stats.totalAttemptsNeeded += state.attempts;
          
          // Reset state
          state.attempts = 0;
          state.backoff = this.initialBackoffMs;
          state.lastAttempt = null;
        }
        if (state) {
          state.status = 'online';
        }
      }
      
      // Update state
      if (state) {
        state.status = accountStatus.status;
        state.lastStatusChange = new Date().toISOString();
      }
    }
  }

  /**
   * Attempt to reconnect a single account
   */
  async _attemptReconnect(phone) {
    const state = this.reconnectState.get(phone);
    if (!state) return false;

    // Check if we've exceeded max attempts
    if (state.attempts >= this.maxReconnectAttempts) {
      console.log(`[AutoReconnect] ❌ ${phone}: Max reconnect attempts exceeded (${this.maxReconnectAttempts})`);
      this.stats.failedReconnects++;
      
      // Notify dashboard
      if (this.terminalDashboard?.updateAccountStatus) {
        this.terminalDashboard.updateAccountStatus(phone, {
          status: 'reconnect_failed',
          message: `Reconnection failed after ${this.maxReconnectAttempts} attempts`,
          timestamp: new Date().toISOString()
        });
      }
      return false;
    }

    state.attempts++;
    state.lastAttempt = new Date().toISOString();

    // Apply exponential backoff
    const delay = Math.min(state.backoff, this.maxBackoffMs);
    console.log(`[AutoReconnect] ${phone}: Attempt ${state.attempts}/${this.maxReconnectAttempts} (waiting ${delay}ms)`);

    // Notify dashboard
    if (this.terminalDashboard?.updateAccountStatus) {
      this.terminalDashboard.updateAccountStatus(phone, {
        status: 'reconnecting',
        message: `Reconnecting... (attempt ${state.attempts}/${this.maxReconnectAttempts})`,
        timestamp: new Date().toISOString()
      });
    }

    // Wait before attempting
    await this._sleep(delay);

    // Increase backoff for next attempt (exponential: backoff * 1.5)
    state.backoff = Math.min(state.backoff * 1.5, this.maxBackoffMs);

    // Trigger relink
    if (this.autoAccountRelinkingManager?.startAutoRelinking) {
      try {
        await this.autoAccountRelinkingManager.startAutoRelinking();
        return true;
      } catch (error) {
        console.error(`[AutoReconnect] Reconnect error for ${phone}:`, error.message);
        return false;
      }
    }

    return false;
  }

  /**
   * Get current reconnection status for an account
   */
  getAccountReconnectStatus(phone) {
    const state = this.reconnectState.get(phone);
    if (!state) return null;

    return {
      phone,
      attempts: state.attempts,
      maxAttempts: this.maxReconnectAttempts,
      currentBackoff: state.backoff,
      lastAttempt: state.lastAttempt,
      status: state.status
    };
  }

  /**
   * Get all reconnection states
   */
  getAllReconnectStatus() {
    const statuses = [];
    for (const [phone, state] of this.reconnectState) {
      statuses.push({
        phone,
        attempts: state.attempts,
        maxAttempts: this.maxReconnectAttempts,
        currentBackoff: state.backoff,
        lastAttempt: state.lastAttempt,
        status: state.status
      });
    }
    return statuses;
  }

  /**
   * Get recovery statistics
   */
  getStatistics() {
    const avgAttempts = this.stats.successfulReconnects > 0
      ? (this.stats.totalAttemptsNeeded / this.stats.successfulReconnects).toFixed(2)
      : 0;

    return {
      totalDisconnections: this.stats.totalDisconnections,
      successfulReconnects: this.stats.successfulReconnects,
      failedReconnects: this.stats.failedReconnects,
      successRate: this.stats.totalDisconnections > 0
        ? ((this.stats.successfulReconnects / this.stats.totalDisconnections) * 100).toFixed(2) + '%'
        : '0%',
      averageAttemptsPerReconnect: avgAttempts,
      isMonitoring: this.isMonitoring
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics() {
    this.stats = {
      totalDisconnections: 0,
      successfulReconnects: 0,
      failedReconnects: 0,
      totalAttemptsNeeded: 0,
      averageReconnectTime: 0
    };
  }

  /**
   * Sleep utility
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default AutoReconnectManager;
