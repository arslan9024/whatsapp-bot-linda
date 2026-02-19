/**
 * AccountConnectionMonitor.js
 * Monitor real-time account connection status and health
 */

class AccountConnectionMonitor {
  constructor(options = {}) {
    this.accountStatusMap = new Map();
    this.healthCheckInterval = options.healthCheckInterval || 30000;
    this.timeoutDuration = options.timeoutDuration || 45000;
    
    this.unifiedAccountManager = options.unifiedAccountManager;
    this.cacheManager = options.cacheManager;
    this.databaseManager = options.databaseManager;
    this.terminalDashboard = options.terminalDashboard;
    
    this.isMonitoring = false;
    this.monitoringIntervals = new Map();
    this.logger = this.createLogger();
  }

  createLogger() {
    return {
      info: (msg) => console.log('[Monitor] ' + msg),
      success: (msg) => console.log('[Monitor] ' + msg),
      warn: (msg) => console.warn('[Monitor] ' + msg),
      error: (msg) => console.error('[Monitor] ' + msg),
    };
  }

  startMonitoring(phones = []) {
    if (this.isMonitoring) {
      this.logger.warn('Monitoring already active');
      return;
    }

    this.isMonitoring = true;
    this.logger.success('Health monitoring started');

    for (const phone of phones) {
      this.setupAccountMonitor(phone);
    }
  }

  stopMonitoring() {
    for (const intervalId of this.monitoringIntervals.values()) {
      clearInterval(intervalId);
    }
    this.monitoringIntervals.clear();
    this.isMonitoring = false;
    this.logger.info('Monitoring stopped');
  }

  setupAccountMonitor(phone) {
    if (this.monitoringIntervals.has(phone)) {
      return;
    }

    this.accountStatusMap.set(phone, {
      status: 'checking',
      lastCheck: null,
      isConnected: false,
      messagesSent: 0,
      lastActivity: null,
      errorCount: 0,
      statusHistory: []
    });

    const intervalId = setInterval(() => {
      this.checkAccountHealth(phone);
    }, this.healthCheckInterval);

    this.monitoringIntervals.set(phone, intervalId);
    
    // Initial check
    this.checkAccountHealth(phone);
  }

  async checkAccountHealth(phone) {
    try {
      const account = this.unifiedAccountManager?.getAccount?.(phone);
      
      if (!account || !account.client) {
        this.updateStatus(phone, {
          status: 'offline',
          isConnected: false,
          reason: 'No active client'
        });
        return;
      }

      const client = account.client;
      let isOnline = false;

      try {
        if (client.info?.wid) {
          isOnline = true;
        }
      } catch (err) {
        // Client check failed
      }

      const currentStatus = this.accountStatusMap.get(phone) || {};
      const statusHistory = (currentStatus.statusHistory || []).slice(-20);
      statusHistory.push({
        timestamp: Date.now(),
        status: isOnline ? 'online' : 'offline'
      });

      this.updateStatus(phone, {
        status: isOnline ? 'online' : 'offline',
        isConnected: isOnline,
        lastCheck: new Date(),
        statusHistory
      });

      // Update dashboard
      this.syncDashboard(phone, isOnline);

      // Log to database
      if (this.databaseManager?.logConnectionEvent) {
        await this.databaseManager.logConnectionEvent(phone, {
          status: isOnline ? 'online' : 'offline',
          timestamp: new Date(),
          type: 'health_check'
        });
      }

    } catch (error) {
      this.logger.warn('Health check failed for ' + phone + ': ' + error.message);
      const status = this.accountStatusMap.get(phone);
      if (status) {
        status.errorCount = (status.errorCount || 0) + 1;
      }
    }
  }

  updateStatus(phone, updates) {
    const current = this.accountStatusMap.get(phone) || {};
    const updated = { ...current, ...updates };
    this.accountStatusMap.set(phone, updated);
  }

  syncDashboard(phone, isOnline) {
    try {
      if (this.terminalDashboard?.updateAccountStatus) {
        this.terminalDashboard.updateAccountStatus(phone, {
          status: isOnline ? 'online' : 'offline',
          lastChecked: new Date(),
          emoji: isOnline ? '' : ''
        });
      }
    } catch (error) {
      // Silent fail - don't spam logs
    }
  }

  getAccountStatus(phone) {
    return this.accountStatusMap.get(phone) || {
      status: 'unknown',
      isConnected: false
    };
  }

  getAllAccountStatus() {
    const all = {};
    for (const [phone, status] of this.accountStatusMap) {
      all[phone] = status;
    }
    return all;
  }

  getOnlineAccounts() {
    const online = [];
    for (const [phone, status] of this.accountStatusMap) {
      if (status.isConnected) {
        online.push(phone);
      }
    }
    return online;
  }

  getOfflineAccounts() {
    const offline = [];
    for (const [phone, status] of this.accountStatusMap) {
      if (!status.isConnected) {
        offline.push(phone);
      }
    }
    return offline;
  }

  getHealthReport() {
    const onlineCount = this.getOnlineAccounts().length;
    const offlineCount = this.getOfflineAccounts().length;
    const totalCount = this.accountStatusMap.size;
    const uptime = totalCount > 0 ? Math.round((onlineCount / totalCount) * 100) : 0;

    return {
      timestamp: new Date(),
      summary: {
        total: totalCount,
        online: onlineCount,
        offline: offlineCount,
        uptime: uptime + '%'
      },
      accounts: this.getAllAccountStatus()
    };
  }

  printHealthDashboard() {
    const report = this.getHealthReport();
    console.log('\n' + '='.repeat(70));
    console.log(' ACCOUNT CONNECTION STATUS');
    console.log('='.repeat(70));
    console.log(' Updated: ' + report.timestamp.toLocaleTimeString());
    console.log(' Online: ' + report.summary.online + '/' + report.summary.total + ' (' + report.summary.uptime + ')');
    
    for (const [phone, status] of Object.entries(report.accounts)) {
      const emoji = status.isConnected ? '' : '';
      const lastCheck = status.lastCheck ? ' [checked ' + (Date.now() - new Date(status.lastCheck).getTime())/1000 + 's ago]' : '';
      console.log('  ' + emoji + ' ' + phone + lastCheck);
    }

    console.log('='.repeat(70) + '\n');
  }
}

export default AccountConnectionMonitor;