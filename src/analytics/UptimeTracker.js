/**
 * UptimeTracker.js
 * 
 * Phase 29e: Analytics & Reporting - Uptime Monitoring
 * 
 * Tracks uptime/downtime for:
 * - Individual accounts
 * - Overall bot system
 * - Service quality metrics (SLA tracking)
 * 
 * Features:
 * - Real-time uptime percentage calculation
 * - Downtime event logging
 * - SLA compliance tracking
 * - Alert triggers for SLA violations
 * - Historical uptime reports
 * 
 * Usage:
 *   const uptime = new UptimeTracker();
 *   uptime.initialize();
 *   uptime.recordAccountOnline('account@gmail.com');
 *   uptime.recordAccountDowntime('account@gmail.com', reason);
 */

class UptimeTracker {
  constructor(options = {}) {
    this.enableLogging = options.enableLogging !== false;
    this.slaTarget = options.slaTarget || 0.99; // 99% SLA
    this.startTime = new Date();

    // Account uptime tracking
    this.accounts = new Map(); // accountId -> { online, onlineTime, downtime, events }

    // System uptime tracking
    this.system = {
      startTime: new Date(),
      onlineTime: 0,
      downTime: 0,
      totalDowntimeMinutes: 0,
      uptimePercentage: 100,
      lastStatus: 'online',
      statusChanges: [],
      downtimeEvents: []
    };

    // SLA tracking
    this.sla = {
      target: this.slaTarget * 100,
      current: 100,
      violations: 0,
      lastViolationTime: null
    };

    // Window for calculations
    this.windowSize = options.windowSize || 3600000; // 1 hour
    this.retentionDays = options.retentionDays || 30;
  }

  /**
   * Initialize uptime tracker
   */
  async initialize() {
    try {
      this.startTime = new Date();
      this.system.startTime = new Date();
      if (this.enableLogging) {
        console.log('[UptimeTracker] Initialized at', this.startTime.toISOString());
      }
      return true;
    } catch (error) {
      console.error('[UptimeTracker] Init error:', error.message);
      return false;
    }
  }

  /**
   * Register a new account for tracking
   */
  registerAccount(accountId) {
    if (!this.accounts.has(accountId)) {
      this.accounts.set(accountId, {
        accountId,
        online: false,
        onlineTime: 0,
        downTime: 0,
        downtimeMinutes: 0,
        uptimePercentage: 0,
        firstSeen: new Date().toISOString(),
        lastStatusChange: null,
        statusHistory: [],
        downtimeEvents: [],
        recoveryEvents: [],
        totalDowntimes: 0,
        avgDowntimeMinutes: 0,
        consecutiveDowntimes: 0
      });
      if (this.enableLogging) {
        console.log(`[UptimeTracker] Registered account: ${accountId}`);
      }
    }
  }

  /**
   * Record account coming online
   */
  recordAccountOnline(accountId) {
    this.registerAccount(accountId);
    const account = this.accounts.get(accountId);
    
    if (!account.online) {
      const now = new Date();
      account.online = true;
      account.lastStatusChange = now.toISOString();
      account.statusHistory.push({
        timestamp: now.toISOString(),
        status: 'online',
        reason: 'Account connected'
      });

      // Record recovery if there was downtime
      if (account.totalDowntimes > 0) {
        account.recoveryEvents.push({
          timestamp: now.toISOString(),
          duration: account.downtimeMinutes,
          downtimeCount: account.totalDowntimes
        });
        account.consecutiveDowntimes = 0;
      }

      this._updateSystemStatus();
    }
  }

  /**
   * Record account going offline/downtime
   */
  recordAccountDowntime(accountId, reason = 'Unknown') {
    this.registerAccount(accountId);
    const account = this.accounts.get(accountId);
    
    // Only record if account is currently online
    if (account.online) {
      const now = new Date();
      account.online = false;
      account.lastStatusChange = now.toISOString();
      account.statusHistory.push({
        timestamp: now.toISOString(),
        status: 'offline',
        reason
      });

      account.downtimeEvents.push({
        timestamp: now.toISOString(),
        reason,
        duration: 0 // Will be updated on recovery
      });

      account.totalDowntimes++;
      account.consecutiveDowntimes++;

      this._updateSystemStatus();

      // Check SLA violation
      if (account.downtimeEvents.length > 2) {
        this._checkSlaViolation();
      }
    }
  }

  /**
   * Update downtime duration when account comes back online
   */
  _updateDowntimeDuration(accountId) {
    const account = this.accounts.get(accountId);
    if (account && account.downtimeEvents.length > 0) {
      const lastEvent = account.downtimeEvents[account.downtimeEvents.length - 1];
      const duration = (Date.now() - new Date(lastEvent.timestamp).getTime()) / 1000 / 60;
      lastEvent.duration = Math.round(duration);
      account.downtimeMinutes = Math.round(
        account.downtimeEvents.reduce((sum, e) => sum + e.duration, 0)
      );
      account.avgDowntimeMinutes = Math.round(
        account.downtimeMinutes / account.totalDowntimes
      );
    }
  }

  /**
   * Update system status based on all accounts
   */
  _updateSystemStatus() {
    const now = new Date();
    let onlineCount = 0;
    let totalAccounts = this.accounts.size;

    for (const account of this.accounts.values()) {
      if (account.online) {
        onlineCount++;
      } else {
        this._updateDowntimeDuration(account.accountId);
      }
    }

    const lastStatus = this.system.lastStatus;
    const isSystemOnline = onlineCount > 0;
    this.system.lastStatus = isSystemOnline ? 'online' : 'offline';

    if (lastStatus !== this.system.lastStatus) {
      this.system.statusChanges.push({
        timestamp: now.toISOString(),
        status: this.system.lastStatus,
        onlineAccounts: onlineCount,
        totalAccounts: totalAccounts
      });
    }

    // Calculate system uptime
    this._calculateSystemUptime();
  }

  /**
   * Calculate system uptime percentage
   */
  _calculateSystemUptime() {
    const totalDowntimeMinutes = Array.from(this.accounts.values())
      .reduce((sum, acc) => sum + (acc.downtimeMinutes || 0), 0);

    const runtimeMinutes = (Date.now() - this.system.startTime.getTime()) / 1000 / 60;
    const uptimeMinutes = runtimeMinutes - totalDowntimeMinutes;

    this.system.totalDowntimeMinutes = totalDowntimeMinutes;
    this.system.uptimePercentage = runtimeMinutes > 0
      ? ((uptimeMinutes / runtimeMinutes) * 100).toFixed(4)
      : 100;

    // Update SLA
    this.sla.current = this.system.uptimePercentage;
    this.sla.violations = this.sla.current < this.sla.target ? 1 : 0;
  }

  /**
   * Check for SLA violations
   */
  _checkSlaViolation() {
    if (this.system.uptimePercentage < this.sla.target) {
      this.sla.violations++;
      this.sla.lastViolationTime = new Date().toISOString();
      if (this.enableLogging) {
        console.warn(`[UptimeTracker] ⚠️ SLA VIOLATION: ${this.system.uptimePercentage}% < ${this.sla.target}%`);
      }
    }
  }

  /**
   * Get account uptime report
   */
  getAccountUptimeReport(accountId) {
    if (!this.accounts.has(accountId)) {
      return null;
    }

    const account = this.accounts.get(accountId);
    this._updateDowntimeDuration(accountId);

    const runtimeMinutes = (Date.now() - new Date(account.firstSeen).getTime()) / 1000 / 60;
    const uptimePercentage = runtimeMinutes > 0
      ? ((runtimeMinutes - account.downtimeMinutes) / runtimeMinutes * 100).toFixed(2)
      : 100;

    return {
      accountId,
      currentStatus: account.online ? 'online' : 'offline',
      uptime: {
        percentage: uptimePercentage + '%',
        minutes: runtimeMinutes - account.downtimeMinutes,
        total: Math.round(runtimeMinutes)
      },
      downtime: {
        total: account.downtimeMinutes,
        events: account.totalDowntimes,
        average: account.avgDowntimeMinutes,
        consecutive: account.consecutiveDowntimes
      },
      recovery: {
        totalRecoveries: account.recoveryEvents.length,
        lastRecoveryTime: account.recoveryEvents.length > 0
          ? account.recoveryEvents[account.recoveryEvents.length - 1].timestamp
          : null
      },
      lastStatusChange: account.lastStatusChange,
      statusHistory: account.statusHistory.slice(-10) // Last 10 events
    };
  }

  /**
   * Get system uptime report
   */
  getSystemUptimeReport() {
    this._updateSystemStatus();

    const onlineAccounts = Array.from(this.accounts.values()).filter(a => a.online).length;

    return {
      timestamp: new Date().toISOString(),
      system: {
        uptime: this.system.uptimePercentage + '%',
        status: this.system.lastStatus,
        startTime: this.system.startTime.toISOString(),
        runtime: this._formatDuration(Date.now() - this.system.startTime.getTime())
      },
      accounts: {
        online: onlineAccounts,
        offline: this.accounts.size - onlineAccounts,
        total: this.accounts.size
      },
      downtime: {
        totalMinutes: this.system.totalDowntimeMinutes,
        events: this.system.downtimeEvents.length,
        averageEventDuration: this.system.downtimeEvents.length > 0
          ? Math.round(this.system.totalDowntimeMinutes / this.system.downtimeEvents.length)
          : 0
      },
      sla: {
        target: this.sla.target + '%',
        current: this.sla.current + '%',
        compliant: this.sla.current >= this.sla.target,
        violations: this.sla.violations
      },
      statusChanges: this.system.statusChanges.slice(-20) // Last 20
    };
  }

  /**
   * Get all accounts uptime summary
   */
  getAllAccountsSummary() {
    const summary = [];
    for (const [accountId, account] of this.accounts) {
      const report = this.getAccountUptimeReport(accountId);
      summary.push(report);
    }
    return summary.sort((a, b) => parseFloat(b.uptime.percentage) - parseFloat(a.uptime.percentage));
  }

  /**
   * Format duration in ms to readable string
   */
  _formatDuration(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  /**
   * Get SLA compliance status
   */
  getSlaStatus() {
    return {
      target: this.sla.target + '%',
      current: this.sla.current + '%',
      compliant: this.sla.current >= this.sla.target,
      violations: this.sla.violations,
      lastViolation: this.sla.lastViolationTime,
      description: this.sla.current >= this.sla.target
        ? `✅ SLA Compliant (${this.sla.current}%)`
        : `⚠️ SLA Violation (${this.sla.current}% < ${this.sla.target}%)`
    };
  }

  /**
   * Get critical alerts
   */
  getCriticalAlerts() {
    const alerts = [];

    // System offline
    if (this.system.lastStatus === 'offline') {
      alerts.push({
        severity: 'critical',
        type: 'SYSTEM_OFFLINE',
        message: 'Bot system is completely offline',
        timestamp: new Date().toISOString()
      });
    }

    // SLA violation
    if (this.sla.violations > 0) {
      alerts.push({
        severity: 'warning',
        type: 'SLA_VIOLATION',
        message: `Current uptime ${this.sla.current}% below target ${this.sla.target}%`,
        timestamp: new Date().toISOString()
      });
    }

    // Multiple consecutive downtimes
    for (const account of this.accounts.values()) {
      if (account.consecutiveDowntimes > 3) {
        alerts.push({
          severity: 'warning',
          type: 'REPEATED_DOWNTIME',
          accountId: account.accountId,
          message: `Account has ${account.consecutiveDowntimes} consecutive downtimes`,
          timestamp: new Date().toISOString()
        });
      }
    }

    return alerts;
  }

  /**
   * Reset tracker
   */
  reset() {
    this.accounts.clear();
    this.system = {
      startTime: new Date(),
      onlineTime: 0,
      downTime: 0,
      totalDowntimeMinutes: 0,
      uptimePercentage: 100,
      lastStatus: 'online',
      statusChanges: [],
      downtimeEvents: []
    };
    this.sla.violations = 0;
    this.sla.lastViolationTime = null;
  }
}

export default UptimeTracker;
