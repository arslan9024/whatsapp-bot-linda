/**
 * GracefulDegradationManager.js
 * 
 * Phase 29d: Advanced Recovery Strategies - Graceful Degradation
 * 
 * Allows the bot to continue operating with partial account availability.
 * When some accounts fail, the system degrades gracefully instead of stopping.
 * 
 * Features:
 * - Marks accounts as unavailable without crashing
 * - Routes messages to available accounts intelligently
 * - Tracks degradation events
 * - Provides degradation status reports
 * - Routes fallback to master account when available
 * 
 * Usage:
 *   const degradation = new GracefulDegradationManager({
 *     accountConnectionMonitor,
 *     terminalDashboard
 *   });
 *   
 *   if (degradation.hasAvailableAccounts()) {
 *     const accounts = degradation.getAvailableAccounts();
 *   }
 */

class GracefulDegradationManager {
  constructor(options = {}) {
    this.accountConnectionMonitor = options.accountConnectionMonitor;
    this.terminalDashboard = options.terminalDashboard;
    
    // Account availability state
    this.accountAvailability = new Map(); // phone -> { available, reason, startedAt }
    
    // Routing state
    this.masterPhone = options.masterPhone || null;
    this.fallbackChain = []; // Array of phone numbers in fallback order
    
    // Statistics
    this.stats = {
      totalDegradationEvents: 0,
      currentDegradedAccounts: 0,
      recoveredAccounts: 0,
      messagesRoutedToFallback: 0
    };
  }

  /**
   * Mark account as unavailable
   */
  markAccountUnavailable(phone, reason = 'Unknown error') {
    const availability = this.accountAvailability.get(phone) || {};
    
    // Only count as new degradation if it wasn't already unavailable
    if (availability.available !== false) {
      this.stats.totalDegradationEvents++;
      this.stats.currentDegradedAccounts++;
      
      console.log(`[Degradation] ⚠️  ${phone}: Marked unavailable - ${reason}`);
      
      if (this.terminalDashboard?.updateAccountStatus) {
        this.terminalDashboard.updateAccountStatus(phone, {
          status: 'unavailable',
          message: `Account unavailable: ${reason}`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    this.accountAvailability.set(phone, {
      available: false,
      reason,
      startedAt: new Date().toISOString()
    });
  }

  /**
   * Mark account as available again
   */
  markAccountAvailable(phone) {
    const availability = this.accountAvailability.get(phone);
    
    if (availability && availability.available === false) {
      this.stats.recoveredAccounts++;
      this.stats.currentDegradedAccounts--;
      
      console.log(`[Degradation] ✅ ${phone}: Recovered and available again`);
      
      if (this.terminalDashboard?.updateAccountStatus) {
        this.terminalDashboard.updateAccountStatus(phone, {
          status: 'available',
          message: 'Account recovered',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    this.accountAvailability.set(phone, {
      available: true,
      reason: null,
      startedAt: new Date().toISOString()
    });
  }

  /**
   * Get list of available accounts
   */
  getAvailableAccounts() {
    const available = [];
    
    for (const [phone, status] of this.accountAvailability) {
      if (status.available) {
        available.push(phone);
      }
    }
    
    return available;
  }

  /**
   * Get list of unavailable accounts
   */
  getUnavailableAccounts() {
    const unavailable = [];
    
    for (const [phone, status] of this.accountAvailability) {
      if (!status.available) {
        unavailable.push({
          phone,
          reason: status.reason,
          unavailableSince: status.startedAt
        });
      }
    }
    
    return unavailable;
  }

  /**
   * Check if any accounts are available
   */
  hasAvailableAccounts() {
    for (const status of this.accountAvailability.values()) {
      if (status.available) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if specific account is available
   */
  isAccountAvailable(phone) {
    const status = this.accountAvailability.get(phone);
    return status ? status.available : false;
  }

  /**
   * Get best fallback account for routing
   * Priority order: master (if available), then fallback chain, then any available
   */
  getBestFallbackAccount() {
    // Try master first
    if (this.masterPhone && this.isAccountAvailable(this.masterPhone)) {
      return this.masterPhone;
    }
    
    // Try fallback chain order
    for (const phone of this.fallbackChain) {
      if (this.isAccountAvailable(phone)) {
        return phone;
      }
    }
    
    // Return any available account
    const available = this.getAvailableAccounts();
    return available.length > 0 ? available[0] : null;
  }

  /**
   * Get degradation status
   */
  getStatus() {
    const available = this.getAvailableAccounts();
    const unavailable = this.getUnavailableAccounts();
    const total = this.accountAvailability.size;
    const degradationPercentage = total > 0 
      ? ((unavailable.length / total) * 100).toFixed(2)
      : 0;

    return {
      totalAccounts: total,
      availableAccounts: available.length,
      unavailableAccounts: unavailable.length,
      degradationPercentage,
      isDegraded: unavailable.length > 0,
      availableAccountList: available,
      unavailableAccountList: unavailable
    };
  }

  /**
   * Get degradation statistics
   */
  getStatistics() {
    return {
      totalDegradationEvents: this.stats.totalDegradationEvents,
      currentDegradedAccounts: this.stats.currentDegradedAccounts,
      recoveredAccounts: this.stats.recoveredAccounts,
      messagesRoutedToFallback: this.stats.messagesRoutedToFallback
    };
  }

  /**
   * Route message through fallback system
   */
  routeToAvailableAccount(preferredPhone = null) {
    // Try preferred account first
    if (preferredPhone && this.isAccountAvailable(preferredPhone)) {
      return { phone: preferredPhone, source: 'preferred' };
    }
    
    // Fall back to best available
    const fallback = this.getBestFallbackAccount();
    if (fallback) {
      this.stats.messagesRoutedToFallback++;
      console.log(`[Degradation] 📨 Message routed to fallback: ${fallback}`);
      
      return {
        phone: fallback,
        source: 'fallback',
        reason: `Preferred account unavailable, using fallback`
      };
    }
    
    // No accounts available
    console.error('[Degradation] ❌ No available accounts for routing');
    return { phone: null, source: 'none', reason: 'No accounts available' };
  }

  /**
   * Set master account for priority fallback
   */
  setMasterAccount(phone) {
    this.masterPhone = phone;
    this.markAccountAvailable(phone);
    console.log(`[Degradation] Master account set to: ${phone}`);
  }

  /**
   * Set fallback chain order
   */
  setFallbackChain(phones = []) {
    this.fallbackChain = phones;
    console.log(`[Degradation] Fallback chain updated: ${phones.join(' -> ')}`);
  }

  /**
   * Register account for degradation tracking
   */
  registerAccount(phone, isMaster = false) {
    if (isMaster) {
      this.setMasterAccount(phone);
    } else {
      this.markAccountAvailable(phone);
    }
  }

  /**
   * Reset statistics
   */
  resetStatistics() {
    this.stats = {
      totalDegradationEvents: 0,
      currentDegradedAccounts: 0,
      recoveredAccounts: 0,
      messagesRoutedToFallback: 0
    };
  }

  /**
   * Generate degradation report
   */
  generateReport() {
    const status = this.getStatus();
    const stats = this.getStatistics();
    
    return {
      timestamp: new Date().toISOString(),
      status,
      statistics: stats,
      summary: {
        systemDegraded: status.isDegraded,
        degradationLevel: status.degradationPercentage + '%',
        recommendation: status.isDegraded 
          ? `${status.unavailableAccounts} account(s) offline - system operating in degraded mode`
          : 'All accounts operational'
      }
    };
  }
}

export default GracefulDegradationManager;
