#!/usr/bin/env node

/**
 * PHASE 5 HEALTH MONITORING TEST
 * 
 * Tests the AccountHealthMonitor implementation:
 * - Account registration and health checks
 * - Metrics collection and reporting
 * - Dashboard data generation
 * - Health trends and historical data
 * - Graceful shutdown integration
 * 
 * Version: 1.0
 * Created: February 9, 2026
 * 
 * RUN: node test-phase-5-health-monitoring.js
 */

import accountHealthMonitor from "./code/utils/AccountHealthMonitor.js";
import sessionStateManager from "./code/utils/SessionStateManager.js";

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Terminal colors
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m"
};

function log(msg, color = "reset") {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function test(name, fn) {
  return async () => {
    try {
      await fn();
      testResults.passed++;
      testResults.tests.push({ name, status: "✅ PASS" });
      log(`  ✅ ${name}`, "green");
    } catch (error) {
      testResults.failed++;
      testResults.tests.push({ name, status: `❌ FAIL: ${error.message}` });
      log(`  ❌ ${name}: ${error.message}`, "red");
    }
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

/**
 * Mock WhatsApp Client for testing
 */
function createMockClient(isHealthy = true) {
  return {
    info: isHealthy ? { phone: "test" } : null,
    destroy: async () => {},
    initialize: async () => {},
    once: (event, callback) => {
      if (event === 'ready' && isHealthy) {
        setTimeout(() => callback(), 100);
      }
    }
  };
}

/**
 * RUN TESTS
 */
async function runTests() {
  log("\n╔════════════════════════════════════════════════════════════╗", "cyan");
  log("║         PHASE 5: HEALTH MONITORING TEST SUITE             ║", "cyan");
  log("║    Account Health Checks, Metrics & Auto-Recovery Tests   ║", "cyan");
  log("╚════════════════════════════════════════════════════════════╝\n", "cyan");

  // TEST 1: Initialize AccountHealthMonitor
  await test("AccountHealthMonitor instantiation", async () => {
    assert(accountHealthMonitor !== null, "Monitor should be instantiated");
    assert(typeof accountHealthMonitor.registerAccount === 'function', "Should have registerAccount method");
    assert(typeof accountHealthMonitor.startHealthChecks === 'function', "Should have startHealthChecks method");
  })();

  // TEST 2: Register account for monitoring
  await test("Register account for health monitoring", async () => {
    const mockClient = createMockClient(true);
    const result = accountHealthMonitor.registerAccount("971505760056", mockClient);
    assert(result === true, "Registration should succeed");
  })();

  // TEST 3: Multiple account registration
  await test("Register multiple accounts", async () => {
    const mockClient1 = createMockClient(true);
    const mockClient2 = createMockClient(true);
    const mockClient3 = createMockClient(true);
    
    accountHealthMonitor.registerAccount("971553633595", mockClient1);
    accountHealthMonitor.registerAccount("971505110636", mockClient2);
    
    assert(accountHealthMonitor.accounts.size === 3, "Should have 3 registered accounts");
  })();

  // TEST 4: Get single account health
  await test("Get health for specific account", async () => {
    const health = accountHealthMonitor.getAccountHealth("971505760056");
    assert(health !== null, "Should return health data");
    assert(health.phoneNumber === "971505760056", "Should have correct phone number");
    assert(health.status !== undefined, "Should have status field");
  })();

  // TEST 5: Get all accounts health
  await test("Get health for all accounts", async () => {
    const allHealth = accountHealthMonitor.getAllAccountsHealth();
    assert(allHealth.accounts.length === 3, "Should return all 3 accounts");
    assert(allHealth.summary !== undefined, "Should have summary");
    assert(allHealth.summary.healthy >= 0, "Should have healthy count");
  })();

  // TEST 6: Metrics collection
  await test("Collect system metrics", async () => {
    const metrics = accountHealthMonitor.getSystemMetrics();
    assert(metrics.totalAccounts === 3, "Should report 3 accounts");
    assert(metrics.totalHealthChecks >= 0, "Should have totalChecks");
    assert(metrics.averageUptime !== undefined, "Should have average uptime");
  })();

  // TEST 7: Health check execution
  await test("Perform health checks", async () => {
    const results = await accountHealthMonitor.performHealthChecks();
    assert(results.totalAccounts === 3, "Should check all 3 accounts");
    assert(results.results.length === 3, "Should return 3 results");
    assert(results.timestamp !== undefined, "Should have timestamp");
  })();

  // TEST 8: Health trends
  await test("Get health trend data", async () => {
    const trend = accountHealthMonitor.getHealthTrend();
    assert(trend.dataPoints !== undefined, "Should have data points");
    assert(trend.totalDataPoints >= 0, "Should have total count");
  })();

  // TEST 9: Dashboard data generation
  await test("Generate dashboard data", async () => {
    const dashboard = accountHealthMonitor.generateDashboardData();
    assert(dashboard.title !== undefined, "Should have title");
    assert(dashboard.summary !== undefined, "Should have summary");
    assert(dashboard.accounts !== undefined, "Should have accounts data");
    assert(dashboard.metrics !== undefined, "Should have metrics");
  })();

  // TEST 10: Dashboard has required structure
  await test("Dashboard data has complete structure", async () => {
    const dashboard = accountHealthMonitor.generateDashboardData();
    const { summary } = dashboard;
    
    assert(summary.systemStatus !== undefined, "Should have system status");
    assert(summary.healthyAccounts !== undefined, "Should have healthy count");
    assert(summary.warningAccounts !== undefined, "Should have warning count");
    assert(summary.unhealthyAccounts !== undefined, "Should have unhealthy count");
  })();

  // TEST 11: Account registration validation
  await test("Account registration validation", async () => {
    const result1 = accountHealthMonitor.registerAccount(null, createMockClient());
    const result2 = accountHealthMonitor.registerAccount("test", null);
    
    assert(result1 === false, "Should reject null phone number");
    assert(result2 === false, "Should reject null client");
  })();

  // TEST 12: Health check includes metrics
  await test("Health check includes metrics", async () => {
    const health = accountHealthMonitor.getAccountHealth("971505760056");
    assert(health.metrics !== undefined, "Should have metrics");
    assert(health.metrics.uptime !== undefined, "Should have uptime");
    assert(health.metrics.responseTime !== undefined, "Should have response time");
  })();

  // TEST 13: Consecutive failures tracking
  await test("Track consecutive failures", async () => {
    const health = accountHealthMonitor.getAccountHealth("971505760056");
    const accountData = accountHealthMonitor.accounts.get("971505760056");
    
    assert(accountData.consecutiveFailures >= 0, "Should track consecutive failures");
  })();

  // TEST 14: Recovery attempt tracking
  await test("Recovery attempts counter", async () => {
    const health = accountHealthMonitor.getAccountHealth("971505760056");
    assert(health.recoveryAttempts >= 0, "Should track recovery attempts");
  })();

  // TEST 15: Multiple health checks maintain history
  await test("Health check history", async () => {
    const metricsBeforeCheck = accountHealthMonitor.metrics.totalChecks;
    await accountHealthMonitor.performHealthChecks();
    const metricsAfterCheck = accountHealthMonitor.metrics.totalChecks;
    
    assert(metricsAfterCheck > metricsBeforeCheck, "Should increment total checks");
  })();

  // TEST 16: Stop and start health checks
  await test("Start and stop health checks", async () => {
    accountHealthMonitor.startHealthChecks();
    assert(accountHealthMonitor.healthChecker !== null, "Should have active checker");
    
    accountHealthMonitor.stopHealthChecks();
    assert(accountHealthMonitor.healthChecker === null, "Should clear checker on stop");
  })();

  // TEST 17: Health check interval configuration
  await test("Health check interval configuration", async () => {
    const expectedInterval = 5 * 60 * 1000; // 5 minutes
    assert(accountHealthMonitor.healthCheckInterval === expectedInterval, 
           `Should use 5-minute interval (${expectedInterval}ms)`);
  })();

  // TEST 18: No duplicate registrations
  await test("Prevent duplicate account registration", async () => {
    const mockClient = createMockClient(true);
    accountHealthMonitor.registerAccount("971505760056", mockClient);
    accountHealthMonitor.registerAccount("971505760056", mockClient);
    
    // Should still be 3 (not 4)
    assert(accountHealthMonitor.accounts.size === 3, "Should not create duplicate registration");
  })();

  // TEST 19: Session state manager integration
  await test("SessionStateManager integration", async () => {
    const initialized = await sessionStateManager.initialize();
    assert(initialized === true, "SessionStateManager should initialize");
  })();

  // TEST 20: Health monitor available globally
  await test("Health monitor global availability", async () => {
    // For global availability testing, we just verify the singleton pattern
    const { default: monitor1 } = await import("./code/utils/AccountHealthMonitor.js");
    const { default: monitor2 } = await import("./code/utils/AccountHealthMonitor.js");
    assert(monitor1 === monitor2, "Should be singleton instance");
  })();

  // ═══════════════════════════════════════════════════════════════════════
  // PRINT TEST SUMMARY
  // ═══════════════════════════════════════════════════════════════════════

  console.log(`\n${'═'.repeat(60)}`);
  log("TEST SUMMARY", "blue");
  console.log(`${'═'.repeat(60)}`);

  for (const test of testResults.tests) {
    const color = test.status.includes("✅") ? "green" : "red";
    log(`${test.status.padEnd(50)} ${test.name}`, color);
  }

  console.log(`${'═'.repeat(60)}`);
  log(
    `Results: ${testResults.passed} passed, ${testResults.failed} failed (${testResults.tests.length} total)`,
    testResults.failed === 0 ? "green" : "red"
  );
  console.log(`${'═'.repeat(60)}\n`);

  if (testResults.failed === 0) {
    log("✅ PHASE 5 HEALTH MONITORING TEST PASSED", "green");
    process.exit(0);
  } else {
    log("❌ PHASE 5 HEALTH MONITORING TEST FAILED", "red");
    process.exit(1);
  }
}

/**
 * Start tests
 */
runTests().catch(err => {
  log(`Fatal error: ${err.message}`, "red");
  process.exit(1);
});
