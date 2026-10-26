/**
 * HealthConsoleLogger.js
 * Colored terminal console logging for health monitoring
 * Outputs health status every 5 minutes with color-coded status
 */

class HealthConsoleLogger {
  constructor(healthMonitor) {
    this.healthMonitor = healthMonitor;
    this.isLogging = false;
    this.logInterval = 5 * 60 * 1000; // 5 minutes default
    this.loggingInterval = null;
  }

  // ANSI color codes
  static colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    brightRed: '\x1b[91m',
    brightGreen: '\x1b[92m',
    brightYellow: '\x1b[93m',
    brightCyan: '\x1b[96m',
  };

  static color(text, colorCode) {
    return `${colorCode}${text}${HealthConsoleLogger.colors.reset}`;
  }

  getStatusIcon(status) {
    switch (status) {
      case 'HEALTHY':
        return HealthConsoleLogger.color('✅', HealthConsoleLogger.colors.brightGreen);
      case 'WARNING':
        return HealthConsoleLogger.color('⚠️', HealthConsoleLogger.colors.brightYellow);
      case 'UNHEALTHY':
        return HealthConsoleLogger.color('❌', HealthConsoleLogger.colors.brightRed);
      default:
        return '❓';
    }
  }

  /**
   * Log health status for all accounts to console
   */
  async logHealthStatus() {
    try {
      if (!this.healthMonitor) {
        console.log(HealthConsoleLogger.color('⚠️  Health monitor not initialized', HealthConsoleLogger.colors.brightYellow));
        return;
      }

      const timestamp = new Date().toLocaleString();
      const header = HealthConsoleLogger.color('═══════════════════════════════════════════════════════════', HealthConsoleLogger.colors.brightCyan);
      const title = HealthConsoleLogger.color('🏥 HEALTH CHECK', HealthConsoleLogger.colors.brightCyan);

      console.log('');
      console.log(header);
      console.log(`${title} - ${timestamp}`);
      console.log(header);

      // Get current health status
      const allHealth = await this.healthMonitor.checkHealth();

      if (Object.keys(allHealth).length === 0) {
        console.log(HealthConsoleLogger.color('  No accounts registered', HealthConsoleLogger.colors.yellow));
        return;
      }

      // Log each account
      Object.entries(allHealth).forEach(([phone, health]) => {
        const lastSixDigits = phone.slice(-6);
        const icon = this.getStatusIcon(health.status);
        const statusText = HealthConsoleLogger.color(
          health.status.padEnd(10),
          health.status === 'HEALTHY' ? HealthConsoleLogger.colors.brightGreen :
          health.status === 'WARNING' ? HealthConsoleLogger.colors.brightYellow :
          HealthConsoleLogger.colors.brightRed
        );
        const uptime = `${((health.uptime || 0).toFixed(1))}%`.padStart(7);
        const responseTime = `${health.responseTime || 0}ms`.padStart(6);
        const failures = `${health.consecutiveFailures || 0}`.padStart(2);

        console.log(`  ${lastSixDigits} ${icon} ${statusText} (${uptime} uptime | ${responseTime} response | ${failures} failures)`);
      });

      // Get and log summary
      const metrics = this.healthMonitor.getMetrics();
      const summaryLine = HealthConsoleLogger.color('──────────────────────────────────────────────────────────', HealthConsoleLogger.colors.cyan);
      console.log(summaryLine);

      const statusSummary = this.getStatusCounts(allHealth);
      const total = Object.keys(allHealth).length;
      const healthPercent = total > 0 ? ((statusSummary.healthy / total) * 100).toFixed(1) : 0;

      const summary = `Summary: ${statusSummary.healthy}/${total} healthy, ${statusSummary.warning} warning, ${statusSummary.unhealthy} unhealthy (${healthPercent}% health)`;
      console.log(`  ${summary}`);

      const metricsText = `Metrics: ${metrics.totalChecks} checks | ${metrics.totalRecoveries} recoveries | ${metrics.totalFailures} failures | ${(metrics.averageResponseTime || 0).toFixed(0)}ms avg`;
      console.log(`  ${metricsText}`);

      console.log(header);
      console.log('');
    } catch (error) {
      console.error(HealthConsoleLogger.color(`❌ Error: ${error.message}`, HealthConsoleLogger.colors.brightRed));
    }
  }

  getStatusCounts(allHealth) {
    let healthy = 0, warning = 0, unhealthy = 0;
    Object.values(allHealth).forEach(health => {
      if (health.status === 'HEALTHY') healthy++;
      else if (health.status === 'WARNING') warning++;
      else unhealthy++;
    });
    return { healthy, warning, unhealthy };
  }

  /**
   * Start continuous console logging
   */
  startLogging(intervalMs = null) {
    if (this.isLogging) {
      console.log(HealthConsoleLogger.color('⚠️  Logging already started', HealthConsoleLogger.colors.yellow));
      return;
    }

    if (intervalMs) {
      this.logInterval = intervalMs;
    }

    this.isLogging = true;
    const intervalMinutes = (this.logInterval / 1000 / 60).toFixed(1);
    console.log(HealthConsoleLogger.color(`🏥 Console logger started (${intervalMinutes} min intervals)`, HealthConsoleLogger.colors.brightGreen));

    // Log immediately
    this.logHealthStatus();

    // Then log on interval
    this.loggingInterval = setInterval(() => {
      this.logHealthStatus();
    }, this.logInterval);
  }

  /**
   * Stop continuous console logging
   */
  stopLogging() {
    if (!this.isLogging) {
      console.log(HealthConsoleLogger.color('⚠️  Logging not started', HealthConsoleLogger.colors.yellow));
      return;
    }

    clearInterval(this.loggingInterval);
    this.isLogging = false;
    console.log(HealthConsoleLogger.color('⏹️  Console logger stopped', HealthConsoleLogger.colors.brightYellow));
  }

  /**
   * Log single account health
   */
  async logAccountHealth(phoneNumber) {
    try {
      const health = await this.healthMonitor.getHealth(phoneNumber);
      if (!health) {
        console.log(HealthConsoleLogger.color(`❌ Account ${phoneNumber} not found`, HealthConsoleLogger.colors.brightRed));
        return;
      }

      const icon = this.getStatusIcon(health.status);
      const timestamp = new Date().toLocaleTimeString();
      console.log(`\n${icon} Account: ${phoneNumber} (${timestamp})`);
      console.log(`  Uptime:     ${(health.uptime || 0).toFixed(1)}%`);
      console.log(`  Response:   ${health.responseTime || 0}ms`);
      console.log(`  Failures:   ${health.consecutiveFailures || 0} consecutive`);
      console.log(`  Recoveries: ${health.recoveryAttempts || 0} attempts`);
    } catch (error) {
      console.error(HealthConsoleLogger.color(`❌ Error: ${error.message}`, HealthConsoleLogger.colors.brightRed));
    }
  }
}

export default HealthConsoleLogger;
