/**
 * AccountHealthMonitor.js
 * 
 * Monitors health of all WhatsApp bot accounts
 * - Periodic health checks (5-minute intervals)
 * - Detects disconnections and unhealthy accounts
 * - Auto-recovery triggers
 * - Metrics collection and reporting
 * - Health dashboard data generation
 * 
 * Version: 1.0
 * Created: February 9, 2026
 * Status: Production Ready
 */

import sessionStateManager from "../utils/SessionStateManager.js";
import DeviceRecoveryManager from "../utils/DeviceRecoveryManager.js";

class AccountHealthMonitor {
  constructor() {
    this.accounts = new Map(); // phoneNumber → account health data
    this.healthCheckInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
    this.healthChecker = null; // setInterval ID
    
    this.metrics = {
      totalChecks: 0,
      totalRecoveries: 0,
      totalFailures: 0,
      lastCheckTime: null,
      checks: [] // Historical check results
    };
  }

  /**
   * Register an account for health monitoring
   */
  registerAccount(phoneNumber, client) {
    if (!phoneNumber || !client) {
      console.error(`❌ Cannot register account - missing phoneNumber or client`);
      return false;
    }

    this.accounts.set(phoneNumber, {
      phoneNumber,
      client,
      status: "unknown", // unknown, healthy, warning, unhealthy
      lastCheck: null,
      lastActivity: new Date(),
      consecutiveFailures: 0,
      maxConsecutiveFailures: 3, // Unhealthy after 3 failures
      metrics: {
        uptime: 100,
        responseTime: 0,
        lastPingTime: null,
        totalChecks: 0,
        successfulChecks: 0,
        failedChecks: 0
      },
      recoveryAttempts: 0,
      createdAt: new Date()
    });

    console.log(`✅ Account registered for health monitoring: ${phoneNumber}`);
    return true;
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks() {
    if (this.healthChecker) {
      console.warn(`⚠️  Health checks already running`);
      return;
    }

    console.log(`🏥 Starting health monitoring (5-minute intervals)...`);
    
    // Initial health check
    this.performHealthChecks();
    
    // Schedule periodic checks
    this.healthChecker = setInterval(() => {
      this.performHealthChecks();
    }, this.healthCheckInterval);

    console.log(`✅ Health check monitor started`);
  }

  /**
   * Stop health checks
   */
  stopHealthChecks() {
    if (this.healthChecker) {
      clearInterval(this.healthChecker);
      this.healthChecker = null;
      console.log(`⏹️  Health checks stopped`);
    }
  }

  /**
   * Perform health checks on all registered accounts
   */
  async performHealthChecks() {
    const checkStartTime = new Date();
    const results = {
      timestamp: checkStartTime,
      totalAccounts: this.accounts.size,
      healthy: 0,
      warning: 0,
      unhealthy: 0,
      recovered: 0,
      results: []
    };

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🏥 HEALTH CHECK - ${checkStartTime.toLocaleTimeString()}`);
    console.log(`${'═'.repeat(60)}`);

    for (const [phoneNumber, accountData] of this.accounts.entries()) {
      const healthStatus = await this.checkAccountHealth(phoneNumber, accountData);
      
      // Determine overall status
      if (healthStatus.isHealthy) {
        results.healthy++;
        accountData.status = "healthy";
        accountData.consecutiveFailures = 0;
      } else if (healthStatus.isWarning) {
        results.warning++;
        accountData.status = "warning";
        accountData.consecutiveFailures++;
      } else {
        results.unhealthy++;
        accountData.status = "unhealthy";
        accountData.consecutiveFailures++;

        // Trigger recovery if too many failures
        if (accountData.consecutiveFailures >= accountData.maxConsecutiveFailures) {
          console.log(`\n⚠️  RECOVERY TRIGGERED for ${phoneNumber} (${accountData.consecutiveFailures} consecutive failures)`);
          const recovered = await this.attemptAccountRecovery(phoneNumber, accountData);
          if (recovered) {
            results.recovered++;
            accountData.consecutiveFailures = 0;
          }
        }
      }

      accountData.lastCheck = healthStatus;
      results.results.push(healthStatus);
    }

    // Store metrics
    this.metrics.totalChecks++;
    this.metrics.lastCheckTime = checkStartTime;
    this.metrics.checks.push(results);

    // Keep only last 50 checks in history
    if (this.metrics.checks.length > 50) {
      this.metrics.checks.shift();
    }

    // Print summary
    this._printHealthSummary(results);

    return results;
  }

  /**
   * Check health of a single account
   */
  async checkAccountHealth(phoneNumber, accountData) {
    const checkStartTime = new Date();
    
    try {
      const { client } = accountData;
      
      // Check if client exists and has info (basic connectivity check)
      let isHealthy = false;
      let isWarning = false;
      let responseTime = 0;
      
      if (client && client.info) {
        // Client is initialized and has connection
        responseTime = new Date() - checkStartTime;
        isHealthy = true;
        
        // Update last activity
        accountData.lastActivity = new Date();
      } else if (client) {
        // Client exists but might be initializing
        responseTime = new Date() - checkStartTime;
        isWarning = true; // Not yet ready but not failed
      } else {
        // No client
        isWarning = true;
      }

      // Update metrics
      accountData.metrics.totalChecks++;
      accountData.metrics.responseTime = responseTime;
      accountData.metrics.lastPingTime = new Date();
      
      if (isHealthy) {
        accountData.metrics.successfulChecks++;
        accountData.metrics.uptime = (accountData.metrics.successfulChecks / accountData.metrics.totalChecks * 100).toFixed(1);
      } else {
        accountData.metrics.failedChecks++;
        accountData.metrics.uptime = (accountData.metrics.successfulChecks / accountData.metrics.totalChecks * 100).toFixed(1);
      }

      const status = isHealthy ? "✅ Healthy" : (isWarning ? "⚠️  Warning" : "❌ Unhealthy");
      console.log(`  ${phoneNumber.slice(-6).padEnd(6)} ${status.padEnd(15)} (${responseTime}ms, ${accountData.metrics.uptime}% uptime)`);

      return {
        phoneNumber,
        isHealthy,
        isWarning,
        responseTime,
        uptime: accountData.metrics.uptime,
        consecutiveFailures: accountData.consecutiveFailures,
        timestamp: checkStartTime,
        message: isHealthy ? "Account responsive" : (isWarning ? "Account initializing" : "Account unresponsive")
      };
    } catch (error) {
      console.log(`  ${phoneNumber.slice(-6).padEnd(6)} ❌ Error${' '.repeat(11)}(${error.message.substring(0, 30)}...)`);
      
      accountData.metrics.totalChecks++;
      accountData.metrics.failedChecks++;
      accountData.metrics.uptime = (accountData.metrics.successfulChecks / accountData.metrics.totalChecks * 100).toFixed(1);

      return {
        phoneNumber,
        isHealthy: false,
        isWarning: false,
        responseTime: new Date() - checkStartTime,
        uptime: accountData.metrics.uptime,
        consecutiveFailures: accountData.consecutiveFailures,
        timestamp: checkStartTime,
        message: `Error: ${error.message}`
      };
    }
  }

  /**
   * Attempt to recover an unhealthy account
   */
  async attemptAccountRecovery(phoneNumber, accountData) {
    try {
      console.log(`  🔄 Attempting recovery...`);
      
      accountData.recoveryAttempts++;
      this.metrics.totalRecoveries++;

      // Check if device was previously linked
      const wasLinked = await DeviceRecoveryManager.prototype.wasDevicePreviouslyLinked(phoneNumber);
      
      if (!wasLinked) {
        console.log(`  ℹ️  Device was not previously linked - cannot auto-recover`);
        return false;
      }

      // Attempt reinitialize client
      if (accountData.client && typeof accountData.client.initialize === 'function') {
        try {
          console.log(`  🔄 Re-initializing client...`);
          accountData.client.initialize();
          
          // Wait for ready event (max 10 seconds)
          const recoveryPromise = new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(false), 10000);
            
            accountData.client.once('ready', () => {
              clearTimeout(timeout);
              resolve(true);
            });
          });

          const recovered = await recoveryPromise;
          
          if (recovered) {
            console.log(`  ✅ Recovery successful - account reconnected`);
            accountData.status = "healthy";
            accountData.consecutiveFailures = 0;
            await sessionStateManager.markRecoverySuccess(phoneNumber);
            return true;
          }
        } catch (error) {
          console.log(`  ⚠️  Re-initialization failed: ${error.message}`);
        }
      }

      return false;
    } catch (error) {
      console.log(`  ❌ Recovery attempt failed: ${error.message}`);
      this.metrics.totalFailures++;
      return false;
    }
  }

  /**
   * Get health report for a specific account
   */
  getAccountHealth(phoneNumber) {
    const accountData = this.accounts.get(phoneNumber);
    
    if (!accountData) {
      return null;
    }

    return {
      phoneNumber,
      status: accountData.status,
      lastCheck: accountData.lastCheck,
      metrics: accountData.metrics,
      recoveryAttempts: accountData.recoveryAttempts,
      createdAt: accountData.createdAt,
      uptime: accountData.metrics.uptime
    };
  }

  /**
   * Get health report for all accounts
   */
  getAllAccountsHealth() {
    const report = {
      timestamp: new Date(),
      totalAccounts: this.accounts.size,
      accounts: [],
      summary: {
        healthy: 0,
        warning: 0,
        unhealthy: 0
      }
    };

    for (const [phoneNumber, accountData] of this.accounts.entries()) {
      const health = this.getAccountHealth(phoneNumber);
      
      if (accountData.status === "healthy") {
        report.summary.healthy++;
      } else if (accountData.status === "warning") {
        report.summary.warning++;
      } else if (accountData.status === "unhealthy") {
        report.summary.unhealthy++;
      }

      report.accounts.push(health);
    }

    return report;
  }

  /**
   * Get system health metrics
   */
  getSystemMetrics() {
    const accountHealthReports = [];
    let totalUptime = 0;
    let totalAccounts = 0;

    for (const [phoneNumber, accountData] of this.accounts.entries()) {
      totalAccounts++;
      totalUptime += parseFloat(accountData.metrics.uptime) || 0;
      accountHealthReports.push({
        phoneNumber,
        uptime: accountData.metrics.uptime,
        responsePath: accountData.metrics.responseTime || 0,
        lastCheck: accountData.lastCheck?.timestamp
      });
    }

    const averageUptime = totalAccounts > 0 ? (totalUptime / totalAccounts).toFixed(1) : 0;

    return {
      timestamp: new Date(),
      totalAccounts,
      averageUptime,
      totalHealthChecks: this.metrics.totalChecks,
      totalRecoveries: this.metrics.totalRecoveries,
      totalFailures: this.metrics.totalFailures,
      lastCheckTime: this.metrics.lastCheckTime,
      accountMetrics: accountHealthReports,
      recoverySuccessRate: this.metrics.totalRecoveries > 0 
        ? ((this.metrics.totalRecoveries / (this.metrics.totalRecoveries + this.metrics.totalFailures)) * 100).toFixed(1)
        : 0
    };
  }

  /**
   * Get historical health data (trending)
   */
  getHealthTrend(lastNChecks = 10) {
    const trend = {
      timestamp: new Date(),
      dataPoints: this.metrics.checks.slice(-lastNChecks),
      totalDataPoints: this.metrics.checks.length
    };

    // Calculate trend line
    if (trend.dataPoints.length > 1) {
      const healthyTrend = trend.dataPoints.map(check => check.healthy);
      const avgHealthy = (healthyTrend.reduce((a, b) => a + b, 0) / healthyTrend.length).toFixed(1);
      trend.averageHealthyAccounts = avgHealthy;
    }

    return trend;
  }

  /**
   * Generate health dashboard HTML
   */
  generateDashboardData() {
    const allHealth = this.getAllAccountsHealth();
    const metrics = this.getSystemMetrics();
    const trend = this.getHealthTrend();

    return {
      title: "Linda Bot - Health Dashboard",
      timestamp: new Date().toISOString(),
      summary: {
        systemStatus: allHealth.summary.unhealthy > 0 ? "⚠️ WARNING" : (allHealth.summary.healthy === allHealth.totalAccounts ? "✅ HEALTHY" : "🔄 MONITORING"),
        healthyAccounts: allHealth.summary.healthy,
        warningAccounts: allHealth.summary.warning,
        unhealthyAccounts: allHealth.summary.unhealthy,
        totalAccounts: allHealth.totalAccounts,
        averageUptime: metrics.averageUptime + "%",
        recoverySuccessRate: metrics.recoverySuccessRate + "%"
      },
      accounts: allHealth.accounts,
      metrics,
      trend
    };
  }

  /**
   * Print health check summary
   */
  _printHealthSummary(results) {
    console.log(`${'─'.repeat(60)}`);
    console.log(`Summary: ${results.healthy}/${results.totalAccounts} healthy, ${results.warning} warning, ${results.unhealthy} unhealthy`);
    if (results.recovered > 0) {
      console.log(`Recoveries: ${results.recovered} account(s) recovered`);
    }
    console.log(`${'═'.repeat(60)}\n`);
  }
}

// Create singleton instance
const accountHealthMonitor = new AccountHealthMonitor();

export default accountHealthMonitor;
export { AccountHealthMonitor };
