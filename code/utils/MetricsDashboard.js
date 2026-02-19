/**
 * MetricsDashboard.js
 * 
 * Phase 29e: Analytics & Reporting - Real-time Metrics Display
 * 
 * Displays analytics and metrics in a clean terminal format:
 * - Performance metrics
 * - Health status
 * - Cache statistics
 * - Recovery statistics
 * - Uptime tracking
 * 
 * Features:
 * - Real-time updates
 * - Color-coded status
 * - Charts and graphs (text-based)
 * - Quick insights
 * - Trend indicators
 * 
 * Usage:
 *   const dashboard = new MetricsDashboard(analyticsManager, uptimeTracker);
 *   dashboard.displayFullDashboard();
 */

class MetricsDashboard {
  constructor(analyticsManager, uptimeTracker) {
    this.analytics = analyticsManager;
    this.uptime = uptimeTracker;
  }

  /**
   * Display full metrics dashboard
   */
  displayFullDashboard() {
    console.clear();
    console.log('\n' + this._createHeader('📊 ANALYTICS & METRICS DASHBOARD'));
    
    this.displayPerformanceMetrics();
    console.log('\n');
    this.displayCacheMetrics();
    console.log('\n');
    this.displayRecoveryMetrics();
    console.log('\n');
    this.displayUptimeMetrics();
    console.log('\n');
    this.displayHealthStatus();
    console.log('\n');
    this.displayAnomalies();
    console.log('\n');
  }

  /**
   * Display performance metrics
   */
  displayPerformanceMetrics() {
    const summary = this.analytics.getSummaryReport();
    
    console.log(this._createSection('⚡ PERFORMANCE METRICS'));
    console.log(this._colorize('Messages Processed:', 'cyan'));
    console.log(`  Received: ${summary.messages.received} | Sent: ${summary.messages.sent} | Total: ${summary.messages.total}`);
    
    console.log(this._colorize('Error Rate:', 'cyan'));
    const errorRate = parseFloat(summary.errors.rate);
    const errorColor = errorRate > 0.05 ? 'red' : errorRate > 0.02 ? 'yellow' : 'green';
    console.log(`  ${this._colorize(summary.errors.rate, errorColor)} (${summary.errors.total} errors)`);
    
    console.log(this._colorize('System Uptime:', 'cyan'));
    console.log(`  ${this.analytics.getFormattedUptime()}`);
  }

  /**
   * Display cache metrics
   */
  displayCacheMetrics() {
    const cache = this.analytics.getMetricsByCategory('cache');
    
    console.log(this._createSection('💾 CACHE PERFORMANCE'));
    console.log(this._colorize('Hit Rate:', 'cyan'));
    const hitRate = parseFloat(cache.hitRate);
    const rateColor = hitRate > 0.80 ? 'green' : hitRate > 0.60 ? 'yellow' : 'red';
    console.log(`  ${this._colorize(cache.hitRate, rateColor)} (${cache.hits}/${cache.totalRequests})`);
    
    console.log(this._colorize('Performance:', 'cyan'));
    const perfBar = this._createBar(hitRate, 100);
    console.log(`  ${perfBar} ${(hitRate).toFixed(1)}%`);
    
    console.log(this._colorize('Response Time:', 'cyan'));
    console.log(`  ${cache.avgResponseTime}ms (average)`);
  }

  /**
   * Display recovery metrics
   */
  displayRecoveryMetrics() {
    const recovery = this.analytics.getMetricsByCategory('recovery');
    
    console.log(this._createSection('🔄 RECOVERY & RESILIENCE'));
    console.log(this._colorize('Disconnections:', 'cyan'));
    console.log(`  Total: ${recovery.disconnections} | Recovered: ${recovery.successfulRecoveries} | Failed: ${recovery.failedRecoveries}`);
    
    console.log(this._colorize('Recovery Rate:', 'cyan'));
    const recoveryRate = parseFloat(recovery.recoverySuccessRate);
    const recoveryColor = recoveryRate > 0.80 ? 'green' : 'yellow';
    console.log(`  ${this._colorize(recovery.recoverySuccessRate, recoveryColor)}`);
    
    console.log(this._colorize('Circuit Breaker:', 'cyan'));
    console.log(`  ${recovery.circuitTrips} trips`);
    
    console.log(this._colorize('Degradation Events:', 'cyan'));
    console.log(`  ${recovery.degradationEvents} events`);
  }

  /**
   * Display uptime metrics
   */
  displayUptimeMetrics() {
    const systemReport = this.uptime.getSystemUptimeReport();
    const slaStatus = this.uptime.getSlaStatus();
    
    console.log(this._createSection('⏱️ UPTIME & SLA'));
    console.log(this._colorize('System Status:', 'cyan'));
    const statusColor = systemReport.system.status === 'online' ? 'green' : 'red';
    console.log(`  ${this._colorize(systemReport.system.status.toUpperCase(), statusColor)}`);
    
    console.log(this._colorize('Uptime:', 'cyan'));
    const uptimeBar = this._createBar(parseFloat(systemReport.system.uptime), 100);
    console.log(`  ${uptimeBar} ${systemReport.system.uptime}`);
    
    console.log(this._colorize('SLA Compliance:', 'cyan'));
    const slaColor = slaStatus.compliant ? 'green' : 'red';
    console.log(`  ${this._colorize(slaStatus.current, slaColor)} (Target: ${slaStatus.target})`);
    
    console.log(this._colorize('Accounts:', 'cyan'));
    console.log(`  Online: ${systemReport.accounts.online}/${systemReport.accounts.total} | Downtime: ${systemReport.downtime.totalMinutes}min`);
  }

  /**
   * Display health status
   */
  displayHealthStatus() {
    console.log(this._createSection('🏥 SYSTEM HEALTH'));
    
    const cache = this.analytics.getMetricsByCategory('cache');
    const recovery = this.analytics.getMetricsByCategory('recovery');
    const database = this.analytics.getMetricsByCategory('database');
    const summary = this.analytics.getSummaryReport();

    const health = {
      'Cache': parseFloat(cache.hitRate) > 0.80 ? '✅ Healthy' : '⚠️ Needs Attention',
      'Recovery': parseFloat(recovery.recoverySuccessRate) > 0.80 ? '✅ Healthy' : '⚠️ Needs Attention',
      'Database': parseFloat(database.successRate) > 0.95 ? '✅ Healthy' : '⚠️ Needs Attention',
      'Error Rate': parseFloat(summary.errors.rate) < 0.05 ? '✅ Healthy' : '🚨 Critical',
      'Accounts': summary.system.degradationPercentage === '0%' ? '✅ All Online' : '⚠️ Some Offline'
    };

    for (const [component, status] of Object.entries(health)) {
      console.log(`  ${component.padEnd(20)} ${status}`);
    }
  }

  /**
   * Display anomalies and alerts
   */
  displayAnomalies() {
    const anomalies = this.analytics.getAnomalies();
    const alerts = this.uptime.getCriticalAlerts();
    
    console.log(this._createSection('⚠️ ALERTS & ANOMALIES'));
    
    if (anomalies.length === 0 && alerts.length === 0) {
      console.log(this._colorize('  ✅ No active alerts', 'green'));
    } else {
      console.log(this._colorize(`  Found ${anomalies.length + alerts.length} alerts:`, 'yellow'));
      
      for (const anomaly of anomalies) {
        const color = anomaly.severity === 'critical' ? 'red' : 'yellow';
        console.log(`  ${this._colorize('•', color)} ${anomaly.type}: ${anomaly.value} (threshold: ${anomaly.threshold})`);
      }

      for (const alert of alerts) {
        const color = alert.severity === 'critical' ? 'red' : 'yellow';
        console.log(`  ${this._colorize('•', color)} ${alert.type}: ${alert.message}`);
      }
    }
  }

  /**
   * Display quick summary
   */
  displayQuickSummary() {
    const summary = this.analytics.getSummaryReport();
    const slaStatus = this.uptime.getSlaStatus();
    
    console.log('\n' + this._createHeader('📈 QUICK SUMMARY'));
    console.log(`Status: ${slaStatus.compliant ? '✅ OK' : '🚨 WARNING'}`);
    console.log(`Messages: ${summary.messages.total} | Errors: ${summary.errors.total} | Cache Hit: ${summary.cache.hitRate}`);
    console.log(`Accounts Online: ${summary.system.accountsOnline}/${summary.system.accountsTotal}`);
    console.log(`Uptime: ${slaStatus.current} (Target: ${slaStatus.target})`);
  }

  /**
   * Display cache performance chart
   */
  displayCacheChart() {
    const cache = this.analytics.getMetricsByCategory('cache');
    const hitRate = parseFloat(cache.hitRate);
    
    console.log('\n' + this._createHeader('CACHE HIT RATE TREND'));
    
    const bar = this._createBar(hitRate, 100);
    console.log(`Current: ${bar} ${cache.hitRate}`);
    console.log(`Total Requests: ${cache.totalRequests} | Hits: ${cache.hits} | Misses: ${cache.misses}`);
  }

  /**
   * Display recovery performance chart
   */
  displayRecoveryChart() {
    const recovery = this.analytics.getMetricsByCategory('recovery');
    const recoveryRate = parseFloat(recovery.recoverySuccessRate);
    
    console.log('\n' + this._createHeader('RECOVERY SUCCESS RATE'));
    
    const bar = this._createBar(recoveryRate, 100);
    console.log(`Rate: ${bar} ${recovery.recoverySuccessRate}`);
    console.log(`Successful: ${recovery.successfulRecoveries} | Failed: ${recovery.failedRecoveries} | Total: ${recovery.disconnections}`);
  }

  /**
   * Display accounts status table
   */
  displayAccountsTable() {
    const accountsSummary = this.uptime.getAllAccountsSummary();
    
    console.log('\n' + this._createHeader('ACCOUNTS STATUS'));
    console.log('Account ID'.padEnd(40), 'Status'.padEnd(12), 'Uptime'.padEnd(10), 'Downtime (min)'.padEnd(15));
    console.log('-'.repeat(80));
    
    for (const account of accountsSummary) {
      const status = account.currentStatus === 'online' ? '✅ Online' : '❌ Offline';
      console.log(
        account.accountId.substring(0, 39).padEnd(40),
        status.padEnd(12),
        account.uptime.percentage.padEnd(10),
        account.downtime.total.toString().padEnd(15)
      );
    }
  }

  /**
   * Display recent incidents
   */
  displayRecentIncidents() {
    const systemReport = this.uptime.getSystemUptimeReport();
    const changes = systemReport.statusChanges.slice(-5).reverse();
    
    console.log('\n' + this._createHeader('RECENT STATUS CHANGES'));
    
    if (changes.length === 0) {
      console.log('  No recent status changes');
    } else {
      for (const change of changes) {
        const time = new Date(change.timestamp).toLocaleTimeString();
        const status = change.status === 'online' ? '🟢' : '🔴';
        console.log(`  ${time} ${status} ${change.status.toUpperCase()}`);
      }
    }
  }

  // ===== Helper Methods =====

  _createHeader(title) {
    return '═'.repeat(80) + '\n' + title.padEnd(80) + '\n' + '═'.repeat(80);
  }

  _createSection(title) {
    return '─'.repeat(80) + '\n' + title + '\n' + '─'.repeat(80);
  }

  _createBar(value, max, length = 20) {
    const percentage = Math.min(100, (value / max) * 100);
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    
    let color = 'green';
    if (percentage < 60) color = 'red';
    else if (percentage < 80) color = 'yellow';
    
    return this._colorize(`[${bar}]`, color);
  }

  _colorize(text, color) {
    const colors = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      reset: '\x1b[0m'
    };
    
    return `${colors[color] || colors.white}${text}${colors.reset}`;
  }
}

export default MetricsDashboard;
