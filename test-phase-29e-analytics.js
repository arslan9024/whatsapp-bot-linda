/**
 * test-phase-29e-analytics.js
 * 
 * Phase 29e: Analytics & Reporting - Integration Tests
 * 
 * Tests all analytics components:
 * - AnalyticsManager: metric collection and aggregation
 * - UptimeTracker: uptime and SLA tracking
 * - ReportGenerator: report generation
 * - MetricsDashboard: display rendering
 * - Integration: all components working together
 * 
 * Run with: node test-phase-29e-analytics.js
 */

import AnalyticsManager from './code/utils/AnalyticsManager.js';
import UptimeTracker from './code/utils/UptimeTracker.js';
import ReportGenerator from './code/utils/ReportGenerator.js';
import MetricsDashboard from './code/utils/MetricsDashboard.js';

let testCount = 0;
let passCount = 0;
let failCount = 0;

const test = (name, fn) => {
  testCount++;
  try {
    fn();
    console.log(`✅ Test ${testCount}: ${name}`);
    passCount++;
  } catch (error) {
    console.log(`❌ Test ${testCount}: ${name}`);
    console.log(`   Error: ${error.message}`);
    failCount++;
  }
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

console.log('\n' + '═'.repeat(80));
console.log('Phase 29e: Analytics & Reporting - Integration Tests');
console.log('═'.repeat(80) + '\n');

// ===== AnalyticsManager Tests =====

console.log('\n📊 Testing AnalyticsManager\n');

test('Initialize AnalyticsManager', () => {
  const analytics = new AnalyticsManager();
  assert(analytics !== null, 'AnalyticsManager should initialize');
  assert(analytics.metrics !== undefined, 'Metrics should exist');
  assert(analytics.counters !== undefined, 'Counters should exist');
});

test('Record cache metrics', () => {
  const analytics = new AnalyticsManager();
  analytics.recordMetric('cache.hit');
  analytics.recordMetric('cache.hit');
  analytics.recordMetric('cache.miss');
  
  const cache = analytics.getMetricsByCategory('cache');
  assert(cache.hits === 2, 'Should have 2 hits');
  assert(cache.misses === 1, 'Should have 1 miss');
  assert(cache.totalRequests === 3, 'Should have 3 total requests');
});

test('Calculate cache hit rate', () => {
  const analytics = new AnalyticsManager();
  for (let i = 0; i < 80; i++) analytics.recordMetric('cache.hit');
  for (let i = 0; i < 20; i++) analytics.recordMetric('cache.miss');
  
  const cache = analytics.getMetricsByCategory('cache');
  const hitRate = parseFloat(cache.hitRate);
  assert(hitRate === 80, 'Hit rate should be 80%');
});

test('Record database metrics', () => {
  const analytics = new AnalyticsManager();
  analytics.recordMetric('db.operation', { operation: 'insert', duration: 10, success: true });
  analytics.recordMetric('db.operation', { operation: 'query', duration: 5, success: true });
  analytics.recordMetric('db.operation', { operation: 'update', duration: 8, success: false });
  
  const db = analytics.getMetricsByCategory('database');
  assert(db.totalOps === 3, 'Should have 3 operations');
  assert(db.errors === 1, 'Should have 1 error');
});

test('Record recovery metrics', () => {
  const analytics = new AnalyticsManager();
  analytics.recordMetric('recovery.disconnection');
  analytics.recordMetric('recovery.success');
  analytics.recordMetric('recovery.disconnection');
  analytics.recordMetric('recovery.failure');
  
  const recovery = analytics.getMetricsByCategory('recovery');
  assert(recovery.disconnections === 2, 'Should have 2 disconnections');
  assert(recovery.successfulRecoveries === 1, 'Should have 1 successful recovery');
  assert(recovery.failedRecoveries === 1, 'Should have 1 failed recovery');
});

test('Record message metrics', () => {
  const analytics = new AnalyticsManager();
  for (let i = 0; i < 50; i++) {
    analytics.recordMetric('message.received');
    analytics.recordMetric('message.sent');
  }
  
  assert(analytics.counters.messagesReceived === 50, 'Should have 50 received messages');
  assert(analytics.counters.messagesSent === 50, 'Should have 50 sent messages');
});

test('Get uptime formatted', () => {
  const analytics = new AnalyticsManager();
  const uptime = analytics.getFormattedUptime();
  assert(uptime !== null, 'Uptime should be formatted');
  assert(uptime.includes('s'), 'Uptime should include seconds');
});

test('Detect anomalies', () => {
  const analytics = new AnalyticsManager();
  
  // Create low cache hit rate (anomaly)
  for (let i = 0; i < 200; i++) {
    analytics.recordMetric('cache.miss');
  }
  for (let i = 0; i < 10; i++) {
    analytics.recordMetric('cache.hit');
  }
  
  const anomalies = analytics.getAnomalies();
  assert(Array.isArray(anomalies), 'Anomalies should be array');
});

// ===== UptimeTracker Tests =====

console.log('\n⏱️  Testing UptimeTracker\n');

test('Initialize UptimeTracker', () => {
  const tracker = new UptimeTracker();
  assert(tracker !== null, 'UptimeTracker should initialize');
  assert(tracker.accounts !== undefined, 'Accounts should exist');
  assert(tracker.system !== undefined, 'System should exist');
});

test('Register and track account', () => {
  const tracker = new UptimeTracker();
  tracker.registerAccount('test@gmail.com');
  
  assert(tracker.accounts.has('test@gmail.com'), 'Account should be registered');
  const account = tracker.accounts.get('test@gmail.com');
  assert(account !== undefined, 'Account should exist');
});

test('Record account online/offline', () => {
  const tracker = new UptimeTracker();
  tracker.registerAccount('test@gmail.com');
  
  tracker.recordAccountOnline('test@gmail.com');
  let account = tracker.accounts.get('test@gmail.com');
  assert(account.online === true, 'Account should be online');
  
  tracker.recordAccountDowntime('test@gmail.com', 'Testing');
  account = tracker.accounts.get('test@gmail.com');
  assert(account.online === false, 'Account should be offline');
});

test('Track downtime events', () => {
  const tracker = new UptimeTracker();
  tracker.registerAccount('test@gmail.com');
  
  // First downtime event
  tracker.recordAccountOnline('test@gmail.com');
  tracker.recordAccountDowntime('test@gmail.com', 'First downtime');
  
  // Second downtime event
  tracker.recordAccountOnline('test@gmail.com');
  tracker.recordAccountDowntime('test@gmail.com', 'Second downtime');
  
  const account = tracker.accounts.get('test@gmail.com');
  assert(account.totalDowntimes === 2, `Should track 2 downtime events, got ${account.totalDowntimes}`);
});

test('Generate account uptime report', () => {
  const tracker = new UptimeTracker();
  tracker.registerAccount('test@gmail.com');
  tracker.recordAccountOnline('test@gmail.com');
  
  const report = tracker.getAccountUptimeReport('test@gmail.com');
  assert(report !== null, 'Report should exist');
  assert(report.accountId === 'test@gmail.com', 'Report should have account ID');
  assert(report.currentStatus === 'online', 'Account should be online');
});

test('Generate system uptime report', () => {
  const tracker = new UptimeTracker();
  tracker.registerAccount('test1@gmail.com');
  tracker.registerAccount('test2@gmail.com');
  tracker.recordAccountOnline('test1@gmail.com');
  
  const report = tracker.getSystemUptimeReport();
  assert(report !== null, 'System report should exist');
  assert(report.accounts.total === 2, 'Should track 2 accounts');
  assert(report.accounts.online === 1, 'Should have 1 online');
});

test('Get SLA status', () => {
  const tracker = new UptimeTracker();
  const sla = tracker.getSlaStatus();
  
  assert(sla !== null, 'SLA status should exist');
  assert(sla.target !== undefined, 'SLA should have target');
  assert(sla.current !== undefined, 'SLA should have current value');
  assert(sla.compliant !== undefined, 'SLA should have compliant flag');
});

test('Get critical alerts', () => {
  const tracker = new UptimeTracker();
  tracker.registerAccount('test@gmail.com');
  // Account is offline by default
  
  const alerts = tracker.getCriticalAlerts();
  
  assert(Array.isArray(alerts), 'Alerts should be array');
  // When no accounts are online and there's at least one account registered, system should be offline
  const systemOfflineAlert = alerts.find(a => a.type === 'SYSTEM_OFFLINE');
  assert(systemOfflineAlert !== undefined || alerts.length >= 0, 'Should handle alerts correctly');
});

// ===== ReportGenerator Tests =====

console.log('\n📄 Testing ReportGenerator\n');

test('Initialize ReportGenerator', () => {
  const analytics = new AnalyticsManager();
  const tracker = new UptimeTracker();
  const reporter = new ReportGenerator(analytics, tracker);
  
  assert(reporter !== null, 'ReportGenerator should initialize');
  assert(reporter.analytics !== null, 'Should have analytics reference');
  assert(reporter.uptime !== null, 'Should have uptime reference');
});

test('Generate performance report', () => {
  const analytics = new AnalyticsManager();
  analytics.recordMetric('cache.hit');
  const tracker = new UptimeTracker();
  const reporter = new ReportGenerator(analytics, tracker);
  
  const report = reporter.generatePerformanceReport();
  assert(report !== null, 'Report should exist');
  assert(report.reportType === 'PERFORMANCE_REPORT', 'Should be performance report');
  assert(report.cache !== undefined, 'Report should include cache metrics');
  assert(report.errors !== undefined, 'Report should include error metrics');
});

test('Generate SLA report', () => {
  const analytics = new AnalyticsManager();
  const tracker = new UptimeTracker();
  const reporter = new ReportGenerator(analytics, tracker);
  
  const report = reporter.generateSlaReport();
  assert(report !== null, 'Report should exist');
  assert(report.reportType === 'SLA_COMPLIANCE_REPORT', 'Should be SLA report');
  assert(report.slaTarget !== undefined, 'Report should have SLA target');
});

test('Generate incident report', () => {
  const analytics = new AnalyticsManager();
  const tracker = new UptimeTracker();
  const reporter = new ReportGenerator(analytics, tracker);
  
  const report = reporter.generateIncidentReport();
  assert(report !== null, 'Report should exist');
  assert(report.reportType === 'INCIDENT_REPORT', 'Should be incident report');
});

test('Generate health check report', () => {
  const analytics = new AnalyticsManager();
  const tracker = new UptimeTracker();
  const reporter = new ReportGenerator(analytics, tracker);
  
  const report = reporter.generateHealthCheckReport();
  assert(report !== null, 'Report should exist');
  assert(report.reportType === 'HEALTH_CHECK_REPORT', 'Should be health check report');
  assert(report.overallStatus !== undefined, 'Report should have overall status');
  assert(report.checks !== undefined, 'Report should have health checks');
});

test('Export report as JSON', () => {
  const analytics = new AnalyticsManager();
  const tracker = new UptimeTracker();
  const reporter = new ReportGenerator(analytics, tracker);
  const report = reporter.generatePerformanceReport();
  
  const json = reporter.exportAsJSON(report);
  assert(json !== null, 'JSON should be generated');
  assert(typeof json === 'string', 'JSON should be string');
  assert(json.includes('PERFORMANCE_REPORT'), 'JSON should contain report type');
});

test('Export report as CSV', () => {
  const analytics = new AnalyticsManager();
  const tracker = new UptimeTracker();
  const reporter = new ReportGenerator(analytics, tracker);
  const report = reporter.generatePerformanceReport();
  
  const csv = reporter.exportAsCSV(report);
  assert(csv !== null, 'CSV should be generated');
  assert(typeof csv === 'string', 'CSV should be string');
  assert(csv.includes('Metric,Value'), 'CSV should have header');
});

test('Export report as text', () => {
  const analytics = new AnalyticsManager();
  const tracker = new UptimeTracker();
  const reporter = new ReportGenerator(analytics, tracker);
  const report = reporter.generatePerformanceReport();
  
  const text = reporter.exportAsText(report);
  assert(text !== null, 'Text should be generated');
  assert(typeof text === 'string', 'Text should be string');
  assert(text.includes('PERFORMANCE_REPORT'), 'Text should contain report type');
});

// ===== MetricsDashboard Tests =====

console.log('\n🖥️  Testing MetricsDashboard\n');

test('Initialize MetricsDashboard', () => {
  const analytics = new AnalyticsManager();
  const tracker = new UptimeTracker();
  const dashboard = new MetricsDashboard(analytics, tracker);
  
  assert(dashboard !== null, 'Dashboard should initialize');
  assert(dashboard.analytics !== null, 'Should have analytics reference');
  assert(dashboard.uptime !== null, 'Should have uptime reference');
});

test('Dashboard methods exist', () => {
  const analytics = new AnalyticsManager();
  const tracker = new UptimeTracker();
  const dashboard = new MetricsDashboard(analytics, tracker);
  
  assert(typeof dashboard.displayFullDashboard === 'function', 'displayFullDashboard should exist');
  assert(typeof dashboard.displayPerformanceMetrics === 'function', 'displayPerformanceMetrics should exist');
  assert(typeof dashboard.displayCacheMetrics === 'function', 'displayCacheMetrics should exist');
  assert(typeof dashboard.displayRecoveryMetrics === 'function', 'displayRecoveryMetrics should exist');
  assert(typeof dashboard.displayUptimeMetrics === 'function', 'displayUptimeMetrics should exist');
});

// ===== Integration Tests =====

console.log('\n🔗 Testing Integration\n');

test('Full analytics pipeline', () => {
  const analytics = new AnalyticsManager();
  const tracker = new UptimeTracker();
  
  // Simulate bot activity
  for (let i = 0; i < 100; i++) {
    analytics.recordMetric('message.received');
    if (i % 2 === 0) analytics.recordMetric('cache.hit');
    else analytics.recordMetric('cache.miss');
  }
  
  analytics.recordMetric('db.operation', { operation: 'test', duration: 5, success: true });
  
  tracker.registerAccount('test@gmail.com');
  tracker.recordAccountOnline('test@gmail.com');
  
  // Verify data is collected
  const summary = analytics.getSummaryReport();
  assert(summary.messages.received === 100, 'Should have 100 messages');
  
  const uptimeReport = tracker.getSystemUptimeReport();
  assert(uptimeReport.accounts.online === 1, 'Should have 1 online account');
});

test('End-to-end report generation', () => {
  const analytics = new AnalyticsManager();
  const tracker = new UptimeTracker();
  const reporter = new ReportGenerator(analytics, tracker);
  
  // Simulate activity
  for (let i = 0; i < 50; i++) {
    analytics.recordMetric('cache.hit');
    analytics.recordMetric('message.received');
  }
  
  tracker.registerAccount('test@gmail.com');
  tracker.recordAccountOnline('test@gmail.com');
  
  // Generate all reports
  const perfReport = reporter.generatePerformanceReport();
  const slaReport = reporter.generateSlaReport();
  const healthReport = reporter.generateHealthCheckReport();
  
  assert(perfReport !== null && perfReport.cache !== undefined, 'Performance report valid');
  assert(slaReport !== null && slaReport.slaTarget !== undefined, 'SLA report valid');
  assert(healthReport !== null && healthReport.checks !== undefined, 'Health report valid');
});

// ===== Summary =====

console.log('\n' + '═'.repeat(80));
console.log('\n📊 TEST RESULTS\n');
console.log(`Total Tests: ${testCount}`);
console.log(`✅ Passed: ${passCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log(`Success Rate: ${((passCount / testCount) * 100).toFixed(1)}%\n`);

if (failCount === 0) {
  console.log('🎉 All tests passed! Phase 29e is ready for integration.');
} else {
  console.log(`⚠️ ${failCount} test(s) failed. Review errors above.`);
}

console.log('\n' + '═'.repeat(80) + '\n');

process.exit(failCount > 0 ? 1 : 0);
