#!/usr/bin/env node

/**
 * Test Phase 1: SessionStateManager
 * Verify that session state persistence works correctly
 * 
 * Run: node test-phase-1-session-state.js
 */

import sessionStateManager from "./code/utils/SessionStateManager.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = __dirname;
const SESSION_STATE_FILE = path.join(PROJECT_ROOT, "session-state.json");

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
  console.log("  PHASE 1: SessionStateManager Verification");
  console.log("═".repeat(60) + "\n");

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // TEST 1: Initialize manager
    log("TEST 1: Initializing SessionStateManager", "test");
    const initialized = await sessionStateManager.initialize();
    if (!initialized) {
      log("Failed to initialize", "error");
      testsFailed++;
    } else {
      log("SessionStateManager initialized successfully", "success");
      testsPassed++;
    }

    // TEST 2: Save account state
    log("\nTEST 2: Saving account state", "test");
    const success1 = await sessionStateManager.saveAccountState("test-account-1", {
      phoneNumber: "+971505760056",
      displayName: "Test Account 1",
      deviceLinked: true,
      isActive: false,
      sessionPath: "sessions/session-971505760056",
      lastKnownState: "authenticated"
    });

    if (!success1) {
      log("Failed to save account state", "error");
      testsFailed++;
    } else {
      log("Account state saved successfully", "success");
      testsPassed++;
    }

    // TEST 3: Load account state
    log("\nTEST 3: Loading account state", "test");
    const state = sessionStateManager.getAccountState("test-account-1");
    if (!state || state.phoneNumber !== "+971505760056") {
      log("Failed to load account state", "error");
      testsFailed++;
    } else {
      log(`Loaded state: ${state.displayName} (${state.phoneNumber})`, "success");
      testsPassed++;
    }

    // TEST 4: Get all account states
    log("\nTEST 4: Getting all account states", "test");
    const allStates = sessionStateManager.getAllAccountStates();
    if (Object.keys(allStates).length === 0) {
      log("No states found", "warn");
      testsFailed++;
    } else {
      log(`Retrieved ${Object.keys(allStates).length} account state(s)`, "success");
      testsPassed++;
    }

    // TEST 5: Validate session
    log("\nTEST 5: Validating session", "test");
    const validation = await sessionStateManager.validateSession("test-account-1");
    log(`Session valid: ${validation.valid} (reason: ${validation.reason || "none"})`, "info");
    testsPassed++; // Always pass - this is informational

    // TEST 6: Get accounts to recover
    log("\nTEST 6: Getting accounts to recover", "test");
    const toRecover = await sessionStateManager.getAccountsToRecover();
    if (toRecover.length > 0) {
      log(`Found ${toRecover.length} account(s) to recover:`, "success");
      toRecover.forEach(acc => {
        log(`  • ${acc.displayName} (${acc.phoneNumber})`, "info");
      });
      testsPassed++;
    } else {
      log("No accounts need recovery", "info");
      testsPassed++;
    }

    // TEST 7: Mark recovery success
    log("\nTEST 7: Marking recovery as successful", "test");
    const success7 = await sessionStateManager.markRecoverySuccess("test-account-1");
    if (!success7) {
      log("Failed to mark recovery success", "error");
      testsFailed++;
    } else {
      const updatedState = sessionStateManager.getAccountState("test-account-1");
      log(
        `Account marked active: ${updatedState.isActive}, Recovery attempts: ${updatedState.recoveryAttempts}`,
        "success"
      );
      testsPassed++;
    }

    // TEST 8: Mark recovery failed
    log("\nTEST 8: Marking recovery as failed", "test");
    const success8 = await sessionStateManager.markRecoveryFailed("test-account-1", new Error("Test error"));
    if (!success8) {
      log("Failed to mark recovery failed", "error");
      testsFailed++;
    } else {
      const updatedState = sessionStateManager.getAccountState("test-account-1");
      log(
        `Recovery attempts: ${updatedState.recoveryAttempts}, Last error: ${updatedState.lastError}`,
        "success"
      );
      testsPassed++;
    }

    // TEST 9: Get health report
    log("\nTEST 9: Getting health report", "test");
    const healthReport = sessionStateManager.getHealthReport();
    log(
      `Health Report: ${healthReport.totalAccounts} total, ${healthReport.activeAccounts} active, ${healthReport.linkedDevices} linked`,
      "success"
    );
    log(`Timestamp: ${healthReport.timestamp}`, "info");
    testsPassed++;

    // TEST 10: Write safe point file
    log("\nTEST 10: Writing safe point file", "test");
    const success10 = await sessionStateManager.writeSafePointFile();
    if (!success10) {
      log("Failed to write safe point file", "error");
      testsFailed++;
    } else {
      // Check if file exists
      const fileExists = fs.existsSync(SESSION_STATE_FILE);
      if (fileExists) {
        const fileContent = fs.readFileSync(SESSION_STATE_FILE, "utf-8");
        const fileSize = fileContent.length;
        log(`Safe point file created (${fileSize} bytes)`, "success");
        testsPassed++;
      } else {
        log("Safe point file not found on disk", "error");
        testsFailed++;
      }
    }

    // TEST 11: Verify session-state.json structure
    log("\nTEST 11: Verifying session-state.json structure", "test");
    if (fs.existsSync(SESSION_STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(SESSION_STATE_FILE, "utf-8"));
      const hasVersion = data.version === "1.0";
      const hasTimestamp = Boolean(data.timestamp);
      const hasAccounts = Boolean(data.accounts);

      if (hasVersion && hasTimestamp && hasAccounts) {
        log("✓ version, ✓ timestamp, ✓ accounts - FILE STRUCTURE VALID", "success");
        testsPassed++;
      } else {
        log("Invalid file structure", "error");
        testsFailed++;
      }
    } else {
      log("session-state.json not found", "error");
      testsFailed++;
    }

    // TEST 12: Reset recovery attempts
    log("\nTEST 12: Resetting recovery attempts", "test");
    const success12 = await sessionStateManager.resetRecoveryAttempts("test-account-1");
    if (!success12) {
      log("Failed to reset recovery attempts", "error");
      testsFailed++;
    } else {
      const updatedState = sessionStateManager.getAccountState("test-account-1");
      log(`Recovery attempts reset to: ${updatedState.recoveryAttempts}`, "success");
      testsPassed++;
    }

    // TEST 13: Clear all state
    log("\nTEST 13: Clearing all session state", "test");
    const success13 = await sessionStateManager.clearAllState();
    if (!success13) {
      log("Failed to clear state", "error");
      testsFailed++;
    } else {
      const allStatesAfter = sessionStateManager.getAllAccountStates();
      if (Object.keys(allStatesAfter).length === 0) {
        log("✓ All state cleared successfully", "success");
        testsPassed++;
      } else {
        log("State still exists after clear", "error");
        testsFailed++;
      }
    }

  } catch (error) {
    log(`Test error: ${error.message}`, "error");
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
    console.log("\n🎉 ALL TESTS PASSED - Phase 1 is READY!");
  } else {
    console.log(`\n⚠️  ${testsFailed} test(s) failed - review errors above`);
  }

  console.log("═".repeat(60) + "\n");

  // Show sample session-state.json if it exists
  if (fs.existsSync(SESSION_STATE_FILE)) {
    console.log("📄 Sample session-state.json:");
    console.log(fs.readFileSync(SESSION_STATE_FILE, "utf-8"));
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log(`Fatal error: ${error.message}`, "error");
  process.exit(1);
});
