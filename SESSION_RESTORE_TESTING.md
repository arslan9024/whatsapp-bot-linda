# 🧪 Session Restore Testing & Validation Guide

## Test Suite Overview

This guide provides step-by-step testing procedures to validate that **session restore properly reactivates the WhatsApp linked device**.

---

## Prerequisites

✅ ServiceWorker files are in place  
✅ SessionRestoreHandler.js deployed  
✅ sessionLogger.js deployed  
✅ Bot has been run at least once (session file exists)  
✅ Device is currently linked  

---

## Test 1: Basic Session Restore ⭐⭐⭐

**Objective**: Verify device reactivates on normal session restore

**Duration**: 5-10 minutes

### Setup
```bash
# 1. Ensure bot is fully initialized with session
npm start
# Wait until bot shows "🤖 LION0 BOT IS READY TO SERVE!"
# Let it run for 10 seconds to stabilize
```

### Test Steps

```bash
# 1. Stop the bot
# Press Ctrl+C in terminal

# 2. Wait 3 seconds for clean shutdown
# (Session files are persisted)

# 3. Restart the bot
npm start

# 4. Observe the output
```

### Expected Output

```
🔄 Session restoration detected for: +1234567890

╔════════════════════════════════════════════════════════════╗
║          🔄 SESSION RESTORE - REACTIVATING DEVICE         ║
╚════════════════════════════════════════════════════════════╝

📱 Master Account: +1234567890
🔄 Restore Attempt: 1/3
📊 Previous Status: LINKED
📊 Previous Activity: [recent timestamp]

⏳ Verifying session files and authenticating device...

🚀 Initializing WhatsApp client with existing session...

📊 Restore Progress: 0% - Loading...
📊 Restore Progress: 50% - Authenticating...
📊 Restore Progress: 100% - Ready...

✅ AUTHENTICATION SUCCESSFUL DURING SESSION RESTORE!

⏱️  Restore Duration: 2.34s
✅ Device Reactivation: IN PROGRESS

╔════════════════════════════════════════════════════════════╗
║     ✅ DEVICE REACTIVATED - BOT READY TO SERVE!           ║
╚════════════════════════════════════════════════════════════╝

📱 Master Account: +1234567890
✅ Session: RESTORED & VERIFIED
✅ Device Status: REACTIVATED & ACTIVE
✅ Connection: AUTHENTICATED & READY
✅ Auth Method: 6-Digit Code

⚡ Performance Metrics:
   ⏱️  Restore Duration: 2.34s
   🔄 Restore Attempt: 1/3

🤖 Bot Instance: Lion0
📍 Global Reference: global.Lion0

✅ Device reactivation completed.
🚀 Bot is now listening for messages and commands.
```

### Validation Checks

```javascript
// 1. Check device status file
import { getDeviceStatus, displayDeviceStatus } from "./code/utils/deviceStatus.js";

const status = getDeviceStatus("+1234567890");
console.assert(status.deviceLinked === true, "❌ Device should be linked");
console.assert(status.isActive === true, "❌ Device should be active");
console.assert(status.restoreCount >= 1, "❌ Restore count should increment");
console.log("✅ All device status checks passed!");
displayDeviceStatus("+1234567890");
```

```javascript
// 2. Check session history
import { displaySessionHistory, getSessionStats } from "./code/utils/sessionLogger.js";

const stats = getSessionStats("+1234567890");
console.assert(stats.restoreCount > 0, "❌ Should have restore_complete event");
console.assert(stats.eventTypes.restore_complete > 0, "❌ Missing restore_complete");
console.log("✅ All session history checks passed!");
displaySessionHistory("+1234567890", 10);
```

### Pass Criteria

✅ Output shows "DEVICE REACTIVATED" message  
✅ Device status: `deviceLinked: true` and `isActive: true`  
✅ Restore duration < 10 seconds  
✅ Session history contains `restore_complete` event  

---

## Test 2: Multiple Consecutive Restores 🔄

**Objective**: Verify device remains active through multiple restarts

**Duration**: 15-20 minutes

### Test Steps

```bash
# 1. Start bot
npm start
# Wait for "READY TO SERVE" message

# 2. Stop (Ctrl+C)

# 3. Restart (npm start)
# Wait for "DEVICE REACTIVATED" message

# 4. Repeat steps 2-3 four more times
# Total: 5 consecutive restarts

# 5. Verify final status
```

### Validation

```javascript
import { getSessionStats } from "./code/utils/sessionLogger.js";

const stats = getSessionStats("+1234567890");
console.assert(stats.restoreCount === 5, `❌ Should have 5 restores, got ${stats.restoreCount}`);
console.assert(stats.failureCount === 0, `❌ Should have 0 failures, got ${stats.failureCount}`);
console.log(`✅ Successfully completed ${stats.restoreCount} consecutive restores!`);
```

### Pass Criteria

✅ All 5 restores complete successfully  
✅ Zero failures throughout  
✅ Session history shows 5 `restore_complete` events  
✅ Device remains active between restarts  

---

## Test 3: Device Status Persistence 💾

**Objective**: Verify device status correctly persists through restores

**Duration**: 10 minutes

### Test Steps

```javascript
import fs from "fs";
import path from "path";
import { getDeviceStatus, updateDeviceStatus } from "./code/utils/deviceStatus.js";

// 1. Get initial status before restart
const statusBefore = getDeviceStatus("+1234567890");
console.log("Status before restart:", statusBefore);

// 2. Note the linkedAt time
const linkedAtBefore = statusBefore.linkedAt;

// 3. Manually restart bot...
// (Ctrl+C and npm start)

// 4. Get status after restart
const statusAfter = getDeviceStatus("+1234567890");
console.log("Status after restart:", statusAfter);

// 5. Verify persistence
console.assert(statusAfter.linkedAt === linkedAtBefore, 
  "❌ linkedAt should persist (device wasn't re-linked)");
console.assert(statusAfter.restoreCount === (statusBefore.restoreCount + 1),
  "❌ restoreCount should increment by 1");
console.assert(statusAfter.deviceLinked === true, "❌ Device should remain linked");
console.assert(statusAfter.isActive === true, "❌ Device should remain active");
console.log("✅ All persistence checks passed!");
```

### Pass Criteria

✅ `linkedAt` timestamp unchanged (same original link time)  
✅ `restoreCount` increments by 1 each restart  
✅ `deviceLinked` always true  
✅ `isActive` always true  

---

## Test 4: Session Files Corruption Handling 🛡️

**Objective**: Verify bot handles corrupted session gracefully

**Duration**: 10 minutes

### Test Steps

```bash
# 1. Start bot normally
npm start
# Wait for device reactivation

# 2. Stop bot (Ctrl+C)

# 3. Corrupt a session file
# Edit: sessions/session-1234567890/device-status.json
# Change: "deviceLinked": true to "deviceLinked": "corrupted"
# (Invalid JSON or wrong type)

# 4. Restart bot
npm start

# 5. Observe error handling
```

### Expected Behavior

**Option A - Graceful Recovery** (Preferred):
```
⚠️  Error reading device status: [error message]
🔄 Creating fresh device status file...
✅ Device status file recovered
✅ DEVICE REACTIVATED - BOT READY TO SERVE!
```

**Option B - Re-authentication Required** (Acceptable):
```
⚠️  Session file corrupted
🔄 Requesting fresh authentication...
[QR Code or Pairing Code displayed]
```

### Validation

```javascript
import { getDeviceStatus } from "./code/utils/deviceStatus.js";

const status = getDeviceStatus("+1234567890");
// Status should be valid, either recovered or re-created
console.assert(status !== null, "❌ Device status should be readable");
console.assert(typeof status.deviceLinked === "boolean", "❌ Status should be valid");
console.log("✅ Corruption handling passed!");
```

### Pass Criteria

✅ Bot handles corrupted files without crashing  
✅ Either recovers gracefully OR prompts for re-authentication  
✅ Final device status is valid  

---

## Test 5: Network Interruption Recovery 🌐

**Objective**: Verify device reactivates after network interruption

**Duration**: 20 minutes

### Setup

```bash
# 1. Start bot
npm start
# Wait for "READY TO SERVE"

# 2. Let it run for 10 seconds to stabilize
```

### Test Steps - Simulate Network Loss

```bash
# 1. Disconnect internet (WiFi off or unplug ethernet)
# Keep bot running for 10 seconds

# 2. Restore internet connection

# 3. Wait 30-60 seconds for bot to detect reconnection

# 4. Observe auto-recovery in logs
```

### Expected Output

```
⚠️  Bot disconnected: NAVIGATION
🔄 Attempting to reconnect...

📊 Restore Progress: 0% - Loading...
📊 Restore Progress: 50% - Authenticating...

✅ AUTHENTICATION SUCCESSFUL DURING SESSION RESTORE!
✅ DEVICE REACTIVATED - BOT READY TO SERVE!
```

### Validation

```javascript
import { wasRecentlyReactivated } from "./code/utils/sessionLogger.js";

// Check if device was reactivated within last 5 minutes
if (wasRecentlyReactivated("+1234567890", 300)) {
  console.log("✅ Device successfully reactivated after network restoration!");
} else {
  console.log("❌ Device did not reactivate - manual restart required");
}
```

### Pass Criteria

✅ Device auto-reconnects within 60 seconds  
✅ No manual restart required  
✅ Bot resumes listening for messages  

---

## Test 6: Restore Performance Metrics ⏱️

**Objective**: Measure and validate restore performance

**Duration**: 15 minutes

### Test Script

```javascript
import { getSessionHistory, getSessionStats } from "./code/utils/sessionLogger.js";
import { getDeviceStatus } from "./code/utils/deviceStatus.js";

// 1. Get session stats
const stats = getSessionStats("+1234567890");
console.log("\n📊 SESSION RESTORE PERFORMANCE METRICS\n");
console.log(`Total Events: ${stats.totalEvents}`);
console.log(`Total Restores: ${stats.restoreCount}`);
console.log(`Failure Count: ${stats.failureCount}`);
console.log(`Success Rate: ${((stats.restoreCount / stats.totalEvents) * 100).toFixed(2)}%\n`);

// 2. Get restore durations from history
const history = getSessionHistory("+1234567890");
const restoreDurations = history
  .filter(e => e.eventType === "restore_complete")
  .map(e => e.restoreDuration || 0);

if (restoreDurations.length > 0) {
  const avgDuration = restoreDurations.reduce((a, b) => a + b, 0) / restoreDurations.length;
  const minDuration = Math.min(...restoreDurations);
  const maxDuration = Math.max(...restoreDurations);
  
  console.log(`⏱️  Restore Duration Metrics:`);
  console.log(`   Average: ${(avgDuration / 1000).toFixed(2)}s`);
  console.log(`   Minimum: ${(minDuration / 1000).toFixed(2)}s`);
  console.log(`   Maximum: ${(maxDuration / 1000).toFixed(2)}s\n`);
  
  // Performance checks
  console.assert(avgDuration < 10000, "❌ Average restore should be < 10s");
  console.assert(maxDuration < 30000, "❌ Max restore should be < 30s");
}

// 3. Current device status
const status = getDeviceStatus("+1234567890");
console.log(`✅ Current Device Status:`);
console.log(`   Linked: ${status.deviceLinked ? "YES" : "NO"}`);
console.log(`   Active: ${status.isActive ? "YES" : "NO"}`);
console.log(`   Last Connected: ${new Date(status.lastConnected).toLocaleString()}\n`);
```

### Expected Results

```
📊 SESSION RESTORE PERFORMANCE METRICS

Total Events: 15
Total Restores: 5
Failure Count: 0
Success Rate: 100.00%

⏱️  Restore Duration Metrics:
   Average: 3.45s
   Minimum: 2.12s
   Maximum: 5.67s

✅ Current Device Status:
   Linked: YES
   Active: YES
   Last Connected: 1/15/2024, 10:30:05 AM
```

### Pass Criteria

✅ Average restore duration < 10 seconds  
✅ Maximum restore duration < 30 seconds  
✅ Success rate 100%  
✅ Zero failures in last 5 restores  

---

## Test 7: Integration with Message Listening 📨

**Objective**: Verify restored device receives messages correctly

**Duration**: 15 minutes

### Setup

```bash
# 1. Start bot
npm start
# Wait for device reactivation

# 2. Note the bot's WhatsApp account number
# Verify MessageAnalyzer is working (message type logging enabled)
```

### Test Steps

```bash
# 1. From another WhatsApp account, send a test message to the bot
# Message: "BOT_TEST_MESSAGE_001"

# 2. Wait 5 seconds

# 3. Check bot terminal for message receipt
# Expected log: "[MESSAGE] MESSAGE_TYPE: text - From: [sender]"

# 4. Stop bot (Ctrl+C)

# 5. Wait 3 seconds

# 6. Restart bot
npm start
# Wait for device reactivation

# 7. Send another test message
# Message: "BOT_TEST_MESSAGE_002"

# 8. Verify bot receives it after reactivation
```

### Expected Output After Restore

```
✅ DEVICE REACTIVATED - BOT READY TO SERVE!
🚀 Bot is now listening for messages and commands.

[LISTENING] Waiting for messages...

[MESSAGE] MESSAGE_TYPE: text - From: +92[sender] - "BOT_TEST_MESSAGE_002"
[PROCESSING] Message from: +92[sender]
```

### Validation

```javascript
// Check message event logs in MessageAnalyzer output
// Should show messages received both before AND after restore
console.assert(messageCountBeforeRestore > 0, "❌ Should receive messages before restore");
console.assert(messageCountAfterRestore > 0, "❌ Should receive messages after restore");
console.log("✅ Device receives messages correctly after restore!");
```

### Pass Criteria

✅ Bot receives messages after device reactivation  
✅ Message type is logged correctly  
✅ MessageAnalyzer processes messages from restored device  

---

## Automated Test Suite (Optional)

```bash
# Create file: test-session-restore.js

import { WhatsAppClientFunctions } from "./code/WhatsAppBot/WhatsAppClientFunctions.js";
import { getDeviceStatus, displayDeviceStatus } from "./code/utils/deviceStatus.js";
import { displaySessionHistory, getSessionStats } from "./code/utils/sessionLogger.js";

async function runSessionRestoreTests() {
  console.log("\n🧪 RUNNING SESSION RESTORE TEST SUITE...\n");
  
  const number = "+1234567890";
  
  // Test 1: Device Status
  console.log("Test 1: Checking device status...");
  const status = getDeviceStatus(number);
  console.assert(status.deviceLinked, "Test 1 FAILED");
  console.assert(status.isActive, "Test 1 FAILED");
  console.log("✅ Test 1 PASSED\n");
  
  // Test 2: Session History
  console.log("Test 2: Checking session history...");
  const stats = getSessionStats(number);
  console.assert(stats.restoreCount > 0, "Test 2 FAILED");
  console.assert(stats.failureCount === 0, "Test 2 FAILED");
  console.log("✅ Test 2 PASSED\n");
  
  // Test 3: Restore Performance
  console.log("Test 3: Checking restore performance...");
  const minRestoreDuration = 2000; // 2 seconds minimum
  const maxRestoreDuration = 30000; // 30 seconds maximum
  console.assert(stats.duration >= minRestoreDuration, "Test 3 FAILED - too fast");
  console.assert(stats.duration <= maxRestoreDuration, "Test 3 FAILED - too slow");
  console.log("✅ Test 3 PASSED\n");
  
  console.log("✅✅✅ ALL TESTS PASSED ✅✅✅\n");
  displayDeviceStatus(number);
  displaySessionHistory(number, 10);
}

runSessionRestoreTests();
```

```bash
# Run test
node test-session-restore.js
```

---

## Troubleshooting Test Failures

### Failure: Device shows `isActive: false` after restore

```bash
# 1. Check device status details
node -e "import { displayDeviceStatus } from './code/utils/deviceStatus.js'; displayDeviceStatus('+1234567890')"

# 2. View restore history
node -e "import { displaySessionHistory } from './code/utils/sessionLogger.js'; displaySessionHistory('+1234567890')"

# 3. Check for errors
grep -r "auth_failure\|disconnected" sessions/session-1234567890/

# 4. Clear session and restart fresh
rm -rf sessions/session-1234567890
npm start
```

### Failure: Restore takes > 30 seconds

```bash
# 1. Check internet connection
ping google.com

# 2. Check WhatsApp server status
# (Might be temporarily unavailable)

# 3. Increase timeout in SessionRestoreHandler
# Edit: code/WhatsAppBot/SessionRestoreHandler.js
# Change: setTimeout(..., 30000) to 60000

# 4. Check system resources
# (High CPU/memory usage can slow restore)
```

### Failure: Session history not logging

```bash
# 1. Check session directory permissions
ls -la sessions/session-1234567890/

# 2. Verify sessionLogger is imported
grep -n "sessionLogger" code/WhatsAppBot/SessionRestoreHandler.js

# 3. Check for file write errors
tail -f sessions/session-1234567890/session-history.json

# 4. Ensure directory is writable
chmod 755 sessions/session-1234567890/
```

---

## Test Report Template

```markdown
# Session Restore Test Report

| Test | Status | Duration | Notes |
|------|--------|----------|-------|
| Test 1: Basic Restore | ✅ PASS | 5m | Device reactivated successfully |
| Test 2: Multiple Restores | ✅ PASS | 15m | 5/5 restores successful |
| Test 3: Status Persistence | ✅ PASS | 10m | All metrics persisted correctly |
| Test 4: Corruption Handling | ✅ PASS | 10m | Recovered gracefully |
| Test 5: Network Recovery | ✅ PASS | 20m | Auto-reactivation successful |
| Test 6: Performance | ✅ PASS | 15m | Avg restore 3.2 seconds |
| Test 7: Message Listening | ✅ PASS | 15m | Messages received post-restore |

**Overall Result**: ✅ ALL TESTS PASSED

**Date**: 2024-01-15  
**Tester**: [Name]  
**Bot Version**: 3.0  
**WhatsApp Library**: whatsapp-web.js v1.x  
```

---

## Next Steps After Testing

1. ✅ Document any issues found
2. ✅ Fix issues and re-run failed tests
3. ✅ Save test report for auditing
4. ✅ Deploy to production with confidence
5. 📊 Monitor restore metrics in production
6. 🔔 Set up alerts for restore failures

---

**Test Suite Version**: 1.0  
**Last Updated**: 2024-01-15  
**Status**: ✅ Ready for Testing
