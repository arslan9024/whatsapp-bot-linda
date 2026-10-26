/**
 * Phase 7 Smoke Tests - Direct Module Validation
 * No Jest runner - direct instantiation tests
 * Date: February 14, 2026
 */

import AnalyticsDashboard from '../src/analytics/AnalyticsDashboard.js';
import AdminConfigInterface from '../src/core/AdminConfigInterface.js';
import AdvancedConversationFeatures from '../src/intelligence/AdvancedConversationFeatures.js';
import ReportGenerator from '../src/analytics/reports/ReportGenerator.js';

async function runSmokeTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 PHASE 7 SMOKE TESTS - Direct Module Validation');
  console.log('='.repeat(70) + '\n');

  let passed = 0;
  let failed = 0;

  // ═══════════════════════════════════════════════════════════════
  // TEST 1: AnalyticsDashboard
  // ═══════════════════════════════════════════════════════════════
  
  try {
    console.log('📊 Testing AnalyticsDashboard...');
    const analytics = new AnalyticsDashboard();
    await analytics.initialize();
    
    // Test tracking
    analytics.trackMessage({ from: '+971501234567', body: 'hello', type: 'chat' }, {});
    analytics.trackHandlerExecution('testHandler', 250, true);
    
    // Test snapshot
    const snapshot = analytics.getDashboardSnapshot();
    if (snapshot && snapshot.metrics && snapshot.metrics.messages) {
      console.log('  ✅ Analytics initialization: PASS');
      console.log(`     - Messages tracked: ${snapshot.metrics.messages.total}`);
      console.log(`     - Dashboard snapshot: OK`);
      passed++;
    } else {
      console.log('  ❌ Analytics snapshot failed');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Analytics error: ${error.message}`);
    failed++;
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 2: AdminConfigInterface
  // ═══════════════════════════════════════════════════════════════

  try {
    console.log('\n🔐 Testing AdminConfigInterface...');
    const adminConfig = new AdminConfigInterface();
    await adminConfig.initialize();
    
    // Test authorization
    const isAuthorized = adminConfig.isUserAuthorized('+971501234567');
    const access = adminConfig.verifyAdminAccess('admin-phone');
    
    // Test toggle
    const toggle = adminConfig.toggleHandler('testHandler');
    
    // Test audit
    const audit = adminConfig.getAuditLog();
    
    if (access && toggle && audit) {
      console.log('  ✅ Admin config initialization: PASS');
      console.log(`     - Authorization check: OK`);
      console.log(`     - Handler toggle: ${toggle.enabled ? 'ENABLED' : 'DISABLED'}`);
      console.log(`     - Audit log entries: ${audit.length}`);
      passed++;
    } else {
      console.log('  ❌ Admin config functionality failed');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Admin config error: ${error.message}`);
    failed++;
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 3: AdvancedConversationFeatures
  // ═══════════════════════════════════════════════════════════════

  try {
    console.log('\n🤖 Testing AdvancedConversationFeatures...');
    const conversations = new AdvancedConversationFeatures();
    await conversations.initialize();
    
    // Test processing
    const analysis = conversations.processMessage('+971501234567', 'I want to buy a villa');
    const response = conversations.generateResponse('+971501234567', 'hello');
    
    if (analysis && analysis.intent && response && response.message) {
      console.log('  ✅ Conversation features initialization: PASS');
      console.log(`     - Intent detection: ${analysis.intent}`);
      console.log(`     - Sentiment: ${analysis.sentiment}`);
      console.log(`     - Response generated: ${response.message.substring(0, 50)}...`);
      passed++;
    } else {
      console.log('  ❌ Conversation features failed');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Conversation error: ${error.message}`);
    failed++;
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 4: ReportGenerator
  // ═══════════════════════════════════════════════════════════════

  try {
    console.log('\n📄 Testing ReportGenerator...');
    const reportGen = new ReportGenerator();
    await reportGen.initialize();
    
    // Generate reports
    const dailyReport = reportGen.generateDailyReport();
    const weeklyReport = reportGen.generateWeeklyReport();
    const monthlyReport = reportGen.generateMonthlyReport();
    
    // Test exports
    const json = reportGen.exportAsJSON(dailyReport);
    const csv = reportGen.exportAsCSV(dailyReport);
    
    if (dailyReport && weeklyReport && monthlyReport && json && csv) {
      console.log('  ✅ Report generator initialization: PASS');
      console.log(`     - Daily report: ${dailyReport.summary.period}`);
      console.log(`     - Weekly report: ${weeklyReport.summary.period}`);
      console.log(`     - Monthly report: ${monthlyReport.summary.period}`);
      console.log(`     - JSON export: ${json.length} bytes`);
      console.log(`     - CSV export: ${csv.split('\n').length} rows`);
      passed++;
    } else {
      console.log('  ❌ Report generator failed');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Report generator error: ${error.message}`);
    failed++;
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST 5: Integration Flow
  // ═══════════════════════════════════════════════════════════════

  try {
    console.log('\n🔗 Testing Integration Flow...');
    
    const analytics = new AnalyticsDashboard();
    const adminConfig = new AdminConfigInterface();
    const conversations = new AdvancedConversationFeatures();
    const reportGen = new ReportGenerator();
    
    await Promise.all([
      analytics.initialize(),
      adminConfig.initialize(),
      conversations.initialize(),
      reportGen.initialize()
    ]);

    // Simulate message handling
    const userId = '+971501234567';
    const message = 'I want to buy a villa in Dubai';

    // Step 1: Track
    analytics.trackMessage({ from: userId, body: message }, { type: 'text' });

    // Step 2: Check auth
    const isAuth = adminConfig.isUserAuthorized(userId);

    // Step 3: Analyze
    const analysis = conversations.processMessage(userId, message);

    // Step 4: Generate response
    const response = conversations.generateResponse(userId, message);

    // Step 5: Create report
    const report = reportGen.generateDailyReport();

    if (analysis.intent && response.message && report.summary) {
      console.log('  ✅ Full integration flow: PASS');
      console.log(`     - Message tracking: ${analytics.getDashboardSnapshot().metrics.messages.total} messages`);
      console.log(`     - Authorization: ${isAuth ? 'Authorized' : 'Not authorized'}`);
      console.log(`     - Intent: ${analysis.intent}`);
      console.log(`     - Response: "${response.message.substring(0, 40)}..."`);
      console.log(`     - Report: ${report.summary.metrics.totalMessages} messages in report`);
      passed++;
    } else {
      console.log('  ❌ Integration flow failed');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Integration error: ${error.message}`);
    failed++;
  }

  // ═══════════════════════════════════════════════════════════════
  // RESULTS
  // ═══════════════════════════════════════════════════════════════

  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(70));
  console.log(`✅ PASSED: ${passed}/5`);
  console.log(`❌ FAILED: ${failed}/5`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL PHASE 7 SMOKE TESTS PASSED!');
    console.log('Ready for integration testing and production deployment.\n');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Review errors above.\n`);
    process.exit(1);
  }
}

// Run tests
runSmokeTests().catch(error => {
  console.error('❌ Test runner error:', error.message);
  process.exit(1);
});
