/**
 * HealthDashboardCLI.js
 * Real-time interactive CLI dashboard for health monitoring
 * Like 'top' command - auto-updating terminal UI
 */

import HealthConsoleLogger from './HealthConsoleLogger.js';

class HealthDashboardCLI {
  constructor(healthMonitor) {
    this.healthMonitor = healthMonitor;
    this.isDashboardRunning = false;
    this.updateInterval = 10000; // 10 seconds default
    this.dashboardIntervalId = null;
  }

  /**
   * Clear terminal screen
   */
  clearScreen() {
    console.clear();
  }

  /**
   * Draw dashboard header
   */
  drawHeader() {
    const line = '═'.repeat(70);
    console.log(HealthConsoleLogger.color(line, HealthConsoleLogger.colors.brightCyan));
    console.log(HealthConsoleLogger.color('🏥 WHATSAPP BOT HEALTH DASHBOARD', HealthConsoleLogger.colors.brightCyan));
    console.log(HealthConsoleLogger.color(line, HealthConsoleLogger.colors.brightCyan));
  }

  /**
   * Draw status section
   */
  async drawStatusSection(allHealth) {
    const statusCounts = this.getStatusCounts(allHealth);
    const total = Object.keys(allHealth).length;

    console.log('\n' + HealthConsoleLogger.color('📊 STATUS SUMMARY', HealthConsoleLogger.colors.brightGreen));
    console.log('─'.repeat(70));

    const healthyBar = this.drawBar(statusCounts.healthy, total, 'green');
    const warningBar = this.drawBar(statusCounts.warning, total, 'yellow');
    const unhealthyBar = this.drawBar(statusCounts.unhealthy, total, 'red');

    const healthyPercent = total > 0 ? ((statusCounts.healthy / total) * 100).toFixed(0) : 0;
    const warningPercent = total > 0 ? ((statusCounts.warning / total) * 100).toFixed(0) : 0;
    const unhealthyPercent = total > 0 ? ((statusCounts.unhealthy / total) * 100).toFixed(0) : 0;

    console.log(`  ${HealthConsoleLogger.color('✅ Healthy:', HealthConsoleLogger.colors.brightGreen)} ${healthyBar} ${statusCounts.healthy}/${total} (${healthyPercent}%)`);
    console.log(`  ${HealthConsoleLogger.color('⚠️  Warning:', HealthConsoleLogger.colors.brightYellow)} ${warningBar} ${statusCounts.warning}/${total} (${warningPercent}%)`);
    console.log(`  ${HealthConsoleLogger.color('❌ Unhealthy:', HealthConsoleLogger.colors.brightRed)} ${unhealthyBar} ${statusCounts.unhealthy}/${total} (${unhealthyPercent}%)`);
  }

  /**
   * Draw progress bar
   */
  drawBar(value, total, color) {
    const maxWidth = 30;
    const filledWidth = total > 0 ? Math.round((value / total) * maxWidth) : 0;
    const filled = '█'.repeat(filledWidth);
    const empty = '░'.repeat(maxWidth - filledWidth);

    const colorCode = color === 'green' ? HealthConsoleLogger.colors.brightGreen :
                       color === 'yellow' ? HealthConsoleLogger.colors.brightYellow :
                       HealthConsoleLogger.colors.brightRed;

    return HealthConsoleLogger.color(`[${filled}${empty}]`, colorCode);
  }

  /**
   * Draw accounts section
   */
  async drawAccountsSection(allHealth) {
    console.log('\n' + HealthConsoleLogger.color('📱 ACCOUNT STATUS', HealthConsoleLogger.colors.brightGreen));
    console.log('─'.repeat(70));

    if (Object.keys(allHealth).length === 0) {
      console.log(HealthConsoleLogger.color('  No accounts registered', HealthConsoleLogger.colors.yellow));
      return;
    }

    console.log(`  ${'Phone'.padEnd(12)} ${'Status'.padEnd(12)} ${'Uptime'.padEnd(10)} ${'Response'.padEnd(10)} ${'Failures'}`);
    console.log('  ' + '─'.repeat(66));

    Object.entries(allHealth).forEach(([phone, health]) => {
      const lastSix = phone.slice(-6);
      const statusEmoji = this.getStatusEmoji(health.status);
      const statusColor = health.status === 'HEALTHY' ? HealthConsoleLogger.colors.brightGreen :
                          health.status === 'WARNING' ? HealthConsoleLogger.colors.brightYellow :
                          HealthConsoleLogger.colors.brightRed;
      const statusText = HealthConsoleLogger.color(health.status.padEnd(12), statusColor);

      const uptime = `${(health.uptime || 0).toFixed(1)}%`.padEnd(10);
      const response = `${health.responseTime || 0}ms`.padEnd(10);
      const failures = `${health.consecutiveFailures || 0}`.padEnd(8);

      console.log(`  ${lastSix.padEnd(12)} ${statusEmoji} ${statusText} ${uptime} ${response} ${failures}`);
    });
  }

  /**
   * Draw metrics section
   */
  drawMetricsSection(metrics) {
    console.log('\n' + HealthConsoleLogger.color('📈 SYSTEM METRICS', HealthConsoleLogger.colors.brightGreen));
    console.log('─'.repeat(70));

    const metricsData = [
      { label: '🔍 Total Health Checks', value: metrics.totalChecks || 0 },
      { label: '🔄 Total Recoveries', value: metrics.totalRecoveries || 0 },
      { label: '❌ Total Failures', value: metrics.totalFailures || 0 },
      { label: '⏱️  Average Response Time', value: `${(metrics.averageResponseTime || 0).toFixed(0)}ms` }
    ];

    metricsData.forEach((metric, i) => {
      const label = metric.label.padEnd(28);
      const value = String(metric.value).padStart(15);
      console.log(`  ${label} ${value}`);
    });
  }

  /**
   * Draw footer with timestamp
   */
  drawFooter() {
    const timestamp = new Date().toLocaleString();
    const footer = `Last updated: ${timestamp} | Press Ctrl+C to exit`;
    console.log('\n' + HealthConsoleLogger.color('─'.repeat(70), HealthConsoleLogger.colors.cyan));
    console.log(HealthConsoleLogger.color(footer, HealthConsoleLogger.colors.dim));
  }

  /**
   * Get status emoji
   */
  getStatusEmoji(status) {
    switch (status) {
      case 'HEALTHY':
        return '✅';
      case 'WARNING':
        return '⚠️';
      case 'UNHEALTHY':
        return '❌';
      default:
        return '❓';
    }
  }

  /**
   * Get status counts
   */
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
   * Update dashboard once
   */
  async updateDashboard() {
    try {
      if (!this.healthMonitor) {
        console.log(HealthConsoleLogger.color('⚠️  Health monitor not initialized', HealthConsoleLogger.colors.yellow));
        return;
      }

      this.clearScreen();
      this.drawHeader();

      const allHealth = await this.healthMonitor.checkHealth();
      await this.drawStatusSection(allHealth);
      await this.drawAccountsSection(allHealth);

      const metrics = this.healthMonitor.getMetrics();
      this.drawMetricsSection(metrics);

      this.drawFooter();
    } catch (error) {
      console.error(HealthConsoleLogger.color(`❌ Dashboard error: ${error.message}`, HealthConsoleLogger.colors.brightRed));
    }
  }

  /**
   * Start real-time dashboard
   */
  startDashboard(updateIntervalMs = null) {
    if (this.isDashboardRunning) {
      console.log(HealthConsoleLogger.color('⚠️  Dashboard already running', HealthConsoleLogger.colors.yellow));
      return;
    }

    if (updateIntervalMs) {
      this.updateInterval = updateIntervalMs;
    }

    this.isDashboardRunning = true;
    console.log(HealthConsoleLogger.color(`🏥 Starting real-time dashboard (${(this.updateInterval / 1000).toFixed(0)}s updates)`, HealthConsoleLogger.colors.brightGreen));

    // Initial draw
    this.updateDashboard();

    // Update on interval
    this.dashboardIntervalId = setInterval(() => {
      this.updateDashboard();
    }, this.updateInterval);
  }

  /**
   * Stop real-time dashboard
   */
  stopDashboard() {
    if (!this.isDashboardRunning) {
      console.log(HealthConsoleLogger.color('⚠️  Dashboard not running', HealthConsoleLogger.colors.yellow));
      return;
    }

    clearInterval(this.dashboardIntervalId);
    this.isDashboardRunning = false;
    console.log(HealthConsoleLogger.color('⏹️  Dashboard stopped', HealthConsoleLogger.colors.brightYellow));
  }
}

export default HealthDashboardCLI;
