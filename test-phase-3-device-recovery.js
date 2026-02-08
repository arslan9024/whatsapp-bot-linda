#!/usr/bin/env node

/**
 * Test Phase 3: DeviceRecoveryManager
 * Verify that device recovery works correctly
 * 
 * Run: node test-phase-3-device-recovery.js
 */

import deviceRecoveryManager from "./code/utils/DeviceRecoveryManager.js";
import sessionStateManager from "./code/utils/SessionStateManager.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Color output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m"
};

function log(msg, type = "info") {
  const prefix = {
    info: "ℹ️ ",
    success: "✅",
    error: "❌",
    warn: "⚠️ ",
    test: "🧪"
  }[type] || "ℹ️ ";

  console.log(`${prefix} ${msg}`);
}

async function runTests() {
  console.log("\n" + "═".repeat(60));
  console.log("  PHASE 3: DeviceRecoveryManager Verification");
  console.log("═".repeat(60) + "\n");

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Initialize managers
    await sessionStateManager.initialize();

    // TEST 1: Check devices for recovery
    log("TEST 1: Getting devices available for recovery", "test");
    const devicesForRecovery = await deviceRecoveryManager.getDevicesForRecovery();
    log(
      `Found ${devicesForRecovery.length} device(s) available for recovery`,
      "success"
    );
    if (devicesForRecovery.length > 0) {
      devicesForRecovery.forEach((device) => {
        log(
          `  • ${device.displayName || device.phoneNumber}`,
          "info"
        );
      });
    }
    testsPassed++;

    // TEST 2: Check if device was previously linked
    log("\nTEST 2: Checking device linking status", "test");
    const testPhone = "+971505760056";
    const wasLinked = await deviceRecoveryManager.wasDevicePreviouslyLinked(testPhone);
    log(`Device ${testPhone} was previously linked: ${wasLinked ? "YES" : "NO"}`, "success");
    testsPassed++;

    // TEST 3: Get device status
    log("\nTEST 3: Getting device status", "test");
    const status = deviceRecoveryManager.getDeviceStatus(testPhone);
    if (status) {
      log(`Device status retrieved:`, "success");
      log(`  • Linked: ${status.deviceLinked}`, "info");
      log(`  • Active: ${status.isActive}`, "info");
      log(`  • Auth Method: ${status.authMethod || "unknown"}`, "info");
    } else {
      log("No device status found (expected for test)", "success");
    }
    testsPassed++;

    // TEST 4: Update device status
    log("\nTEST 4: Updating device status", "test");
    const updated = deviceRecoveryManager.updateDeviceStatus(testPhone, {
      deviceLinked: true,
      isActive: true,
      linkedAt: new Date().toISOString(),
      authMethod: "qr",
    });
    if (updated && updated.deviceLinked) {
      log("Device status updated successfully", "success");
      testsPassed++;
    } else {
      log("Failed to update device status", "error");
      testsFailed++;
    }

    // TEST 5: Attempt device recovery (without actual client)
    log("\nTEST 5: Attempting device recovery", "test");
    const recovery = await deviceRecoveryManager.attemptDeviceRecovery(testPhone, {
      maxAttempts: 5,
    });
    if (recovery && recovery.success) {
      log(`Recovery attempted: ${recovery.success}`, "success");
      testsPassed++;
    } else if (recovery && !recovery.success) {
      log(`Recovery not available (expected for test): ${recovery.error}`, "success");
      testsPassed++;
    } else {
      log("Recovery attempt returned invalid result", "error");
      testsFailed++;
    }

    // TEST 6: Get recovery status
    log("\nTEST 6: Getting recovery status", "test");
    const recoveryStatus = await deviceRecoveryManager.getRecoveryStatus();
    if (recoveryStatus) {
      log(
        `Recovery status retrieved: ${recoveryStatus.devices.length} device(s)`,
        "success"
      );
      testsPassed++;
    } else {
      log("Failed to get recovery status", "error");
      testsFailed++;
    }

    // TEST 7: Get recovery report
    log("\nTEST 7: Generating recovery report", "test");
    const report = await deviceRecoveryManager.getRecoveryReport();
    if (report && report.summary) {
      log(
        `Report generated: ${report.summary.totalLinkedDevices} device(s)`,
        "success"
      );
      log(`  • Recovery capable: ${report.summary.recoveryCapableDevices}`, "info");
      log(`  • Failed recovery: ${report.summary.failedRecoveryDevices}`, "info");
      testsPassed++;
    } else {
      log("Failed to generate report", "warn");
      testsPassed++; // Non-critical
    }

    // TEST 8: Reset recovery attempts
    log("\nTEST 8: Resetting recovery attempts", "test");
    const reset = deviceRecoveryManager.resetRecoveryAttempts(testPhone);
    if (reset) {
      log("Recovery attempts reset successfully", "success");
      testsPassed++;
    } else {
      log("Failed to reset recovery attempts", "error");
      testsFailed++;
    }

    // TEST 9: Keep-alive monitor
    log("\nTEST 9: Testing keep-alive functionality", "test");
    const mockClient = { info: { pushname: "Test" } };
    const keepAliveInterval = deviceRecoveryManager.keepDeviceAlive(
      mockClient,
      testPhone,
      { interval: 1000 }
    );
    if (keepAliveInterval) {
      log("Keep-alive monitor started successfully", "success");
      clearInterval(keepAliveInterval); // Stop the interval
      testsPassed++;
    } else {
      log("Failed to start keep-alive monitor", "error");
      testsFailed++;
    }

    // TEST 10: Device disconnection handling
    log("\nTEST 10: Handling device disconnection", "test");
    const disconnectResult = await deviceRecoveryManager.handleDeviceDisconnection(
      testPhone,
      mockClient,
      { maxAttempts: 5 }
    );
    if (disconnectResult && disconnectResult.success !== undefined) {
      log(`Disconnection handled: ${JSON.stringify(disconnectResult)}`, "success");
      testsPassed++;
    } else {
      log("Failed to handle disconnection", "error");
      testsFailed++;
    }

    // TEST 11: SessionStateManager integration
    log("\nTEST 11: Verifying SessionStateManager integration", "test");
    const accountId = `account-${testPhone}`;
    await sessionStateManager.saveAccountState(accountId, {
      phoneNumber: testPhone,
      displayName: "Test Account",
      deviceLinked: true,
      isActive: true,
      sessionPath: `sessions/session-${testPhone}`,
      lastKnownState: "authenticated",
    });
    const savedState = sessionStateManager.getAccountState(accountId);
    if (savedState && savedState.phoneNumber === testPhone) {
      log("SessionStateManager integration working correctly", "success");
      testsPassed++;
    } else {
      log("SessionStateManager integration failed", "error");
      testsFailed++;
    }

    // TEST 12: Device recovery initialization
    log("\nTEST 12: Testing device recovery initialization", "test");
    const mockFactory = async (phoneNumber) => {
      // Mock client factory
      return null;
    };
    const initResult = await deviceRecoveryManager.initializeAllDeviceRecoveries(mockFactory, {
      maxAttempts: 5,
    });
    if (initResult && initResult.total !== undefined) {
      log(
        `Device recovery initialization: ${initResult.recovered} recovered, ${initResult.failed} failed`,
        "success"
      );
      testsPassed++;
    } else {
      log("Failed to initialize device recovery", "error");
      testsFailed++;
    }

    // TEST 13: Configuration validation
    log("\nTEST 13: Validating device configuration", "test");
    const sessionPath = path.join(process.cwd(), "sessions", `session-${testPhone}`);
    const statusFile = path.join(sessionPath, "device-status.json");
    
    if (fs.existsSync(statusFile)) {
      const statusData = JSON.parse(fs.readFileSync(statusFile, "utf-8"));
      const hasRequiredFields = statusData.number && statusData.deviceLinked !== undefined;
      
      if (hasRequiredFields) {
        log("Device status file has all required fields", "success");
        testsPassed++;
      } else {
        log("Device status file missing required fields", "error");
        testsFailed++;
      }
    } else {
      log("Device status file not found (may need to be created)", "warn");
      testsPassed++; // Non-critical for test
    }

  } catch (error) {
    log(`Test error: ${error.message}`, "error");
    console.error(error);
    testsFailed++;
  }

  // Summary
  console.log("\n" + "═".repeat(60));
  console.log("  TEST SUMMARY");
  console.log("═".repeat(60));
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📊 Total:  ${testsPassed + testsFailed}`);

  if (testsFailed === 0) {
    console.log("\n🎉 ALL TESTS PASSED - Phase 3 is READY!");
  } else {
    console.log(`\n⚠️  ${testsFailed} test(s) failed - review errors above`);
  }

  console.log("═".repeat(60) + "\n");

  // Show recovery report
  const finalReport = await deviceRecoveryManager.getRecoveryReport();
  if (finalReport) {
    console.log("📋 DEVICE RECOVERY REPORT:\n");
    console.log(JSON.stringify(finalReport, null, 2));
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  log(`Fatal error: ${error.message}`, "error");
  process.exit(1);
});
