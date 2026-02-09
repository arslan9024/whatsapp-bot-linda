# PHASE 6: Terminal-Based Health Monitoring Integration Guide

## Overview

This guide shows you how to integrate three terminal-based health monitoring modules into your WhatsApp Bot system for real-time, production-grade monitoring in VSCode's terminal.

**Three Components:**
1. **Console Logger** - Colored console output every 5 minutes
2. **CLI Dashboard** - Real-time interactive terminal UI (updates every 10 seconds)
3. **File Logger** - Rotating daily JSON log files for analysis and debugging

---

## Quick Start

### Installation

All three modules are located in `code/utils/`:
- `HealthConsoleLogger.js` - Console output
- `HealthDashboardCLI.js` - Terminal dashboard
- `HealthFileLogger.js` - File-based logging

### Basic Usage

```javascript
import AccountHealthMonitor from './code/utils/AccountHealthMonitor.js';
import HealthConsoleLogger from './code/utils/HealthConsoleLogger.js';
import HealthDashboardCLI from './code/utils/HealthDashboardCLI.js';
import HealthFileLogger from './code/utils/HealthFileLogger.js';

// Initialize health monitor
const healthMonitor = new AccountHealthMonitor();

// Create loggers
const consoleLogger = new HealthConsoleLogger(healthMonitor);
const cliDashboard = new HealthDashboardCLI(healthMonitor);
const fileLogger = new HealthFileLogger(healthMonitor);

// Start monitoring
consoleLogger.startLogging(300000);    // Every 5 minutes
cliDashboard.startDashboard(10000);    // Every 10 seconds
fileLogger.startLogging(60000);        // Every 1 minute
```

---

## Component Details

### 1. HealthConsoleLogger

**Purpose:** Print formatted health status to console with color coding

**Features:**
- 🟢 GREEN: Healthy accounts (uptime > 90%)
- 🟡 YELLOW: Warning status (uptime 70-90%)
- 🔴 RED: Critical status (uptime < 70%)
- Shows total accounts, recoveries, failures
- Automatic interval updates

**Configuration:**
```javascript
const consoleLogger = new HealthConsoleLogger(healthMonitor);

// Start with custom interval (milliseconds)
consoleLogger.startLogging(300000);  // Every 5 minutes

// Log once immediately
await consoleLogger.logHealthStatus();

// Stop logging
consoleLogger.stopLogging();
```

**Output Example:**
```
╔════════════════════════════════════════════════╗
║       WhatsApp Bot Health Status               ║
║       Last Update: 2024-12-13 14:32:00        ║
╚════════════════════════════════════════════════╝

Total Accounts: 3
✅ Healthy: 2  ⚠️  Warning: 1  ❌ Critical: 0

Account Details:
🟢 971505760056  [HEALTHY]     ↑99.5%  (Last Check: 5s ago)
🟢 971553633595  [HEALTHY]     ↑98.2%  (Last Check: 8s ago)
🟡 971505110636  [WARNING]     ↑85.0%  (Last Check: 12s ago)

System Metrics:
📊 Total Health Checks: 42
🔄 Total Recoveries: 2
❌ Total Failures: 1
⏱️  Average Response: 245ms
```

---

### 2. HealthDashboardCLI

**Purpose:** Real-time interactive terminal dashboard with live updates

**Features:**
- Clear terminal and redraw complete dashboard
- Account status with visual indicators
- Health metrics and trends
- Interactive updates every 10 seconds
- Perfect for VSCode terminal monitoring

**Configuration:**
```javascript
const cliDashboard = new HealthDashboardCLI(healthMonitor);

// Start dashboard with update interval
cliDashboard.startDashboard(10000);  // Update every 10 seconds

// Update once immediately
await cliDashboard.updateDashboard();

// Stop dashboard
cliDashboard.stopDashboard();
```

**Recommended Interval:** 10 seconds (balances visibility and terminal refresh)

**Output Example:**
```
┌──────────────────── WhatsApp Bot Dashboard ──────────────────┐
│                                                              │
│  Overall Status: ✅ OPERATIONAL                             │
│  Last Update: 2024-12-13 14:32:15                          │
│  Monitoring Duration: 2 days 14 hours 23 minutes           │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ ACCOUNTS STATUS                                              │
├──────────────────────────────────────────────────────────────┤
│ 🟢 971505760056  │ HEALTHY   │ 99.5% │ 5s │ 42 checks      │
│ 🟢 971553633595  │ HEALTHY   │ 98.2% │ 8s │ 40 checks      │
│ 🟡 971505110636  │ WARNING   │ 85.0% │ 12s│ 38 checks      │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ SYSTEM METRICS                                               │
├──────────────────────────────────────────────────────────────┤
│ Total Health Checks.......... 120                            │
│ Successful Checks............ 117                            │
│ Recovery Triggered........... 3                              │
│ Failure Rate................. 2.5%                           │
│ Average Response Time........ 245ms                          │
└──────────────────────────────────────────────────────────────┘
```

---

### 3. HealthFileLogger

**Purpose:** Write health monitoring data to rotating daily JSON log files

**Features:**
- Automatic daily log rotation
- JSON format for easy parsing
- Snapshots for important events
- Log file management
- Perfect for analysis, debugging, and compliance

**Configuration:**
```javascript
const fileLogger = new HealthFileLogger(healthMonitor);

// Start file logging
fileLogger.startLogging(60000);  // Every 1 minute

// Log once immediately
await fileLogger.logHealthStatus();

// Write a snapshot for important events
await fileLogger.writeSnapshot('Recovery triggered for 971505760056');

// Get today's log file path
const logFile = fileLogger.getTodayLogFile();
// => logs/health/health-2024-12-13.log

// Get last N lines
const tail = fileLogger.getTailLog(10);

// Get all log files
const allLogFiles = fileLogger.getLogFiles();

// Stop logging
fileLogger.stopLogging();
```

**Log File Location:**
```
logs/health/
├── health-2024-12-13.log
├── health-2024-12-12.log
├── health-2024-12-11.log
└── ...
```

**Log File Format (JSON):**
```json
{
  "timestamp": "2024-12-13T14:32:00.000Z",
  "type": "healthStatus",
  "totalAccounts": 3,
  "healthyAccounts": 2,
  "warningAccounts": 1,
  "criticalAccounts": 0,
  "metrics": {
    "totalChecks": 120,
    "totalRecoveries": 3,
    "totalFailures": 1,
    "averageResponseTime": 245
  },
  "accounts": [
    {
      "phoneNumber": "971505760056",
      "status": "HEALTHY",
      "uptime": 99.5,
      "lastCheckTime": "2024-12-13T14:32:00.000Z"
    }
  ]
}
```

---

## Integration with index.js

Here's how to add all three loggers to your main `index.js` file:

```javascript
// imports
import express from 'express';
import AccountBootstrapManager from './code/utils/AccountBootstrapManager.js';
import DeviceRecoveryManager from './code/utils/DeviceRecoveryManager.js';
import AccountHealthMonitor from './code/utils/AccountHealthMonitor.js';
import HealthConsoleLogger from './code/utils/HealthConsoleLogger.js';
import HealthDashboardCLI from './code/utils/HealthDashboardCLI.js';
import HealthFileLogger from './code/utils/HealthFileLogger.js';

// ... other code ...

// Initialize health monitor and loggers
const healthMonitor = new AccountHealthMonitor();
const consoleLogger = new HealthConsoleLogger(healthMonitor);
const cliDashboard = new HealthDashboardCLI(healthMonitor);
const fileLogger = new HealthFileLogger(healthMonitor);

// Register accounts with health monitor
function registerAccountsWithHealth() {
  // For each active WhatsApp bot...
  bots.forEach(bot => {
    healthMonitor.registerAccount(bot.phoneNumber, bot);
  });
}

// Start all health monitoring on server startup
async function startHealthMonitoring() {
  console.log('🏥 Starting health monitoring modules...\n');
  
  // Start console logger (every 5 minutes)
  consoleLogger.startLogging(300000);
  
  // Start CLI dashboard (every 10 seconds)
  cliDashboard.startDashboard(10000);
  
  // Start file logger (every 1 minute)
  fileLogger.startLogging(60000);
  
  console.log('✅ Health monitoring active in terminal!\n');
}

// Start server
const server = app.listen(PORT, async () => {
  console.log(`🚀 WhatsApp Bot Server running on port ${PORT}`);
  
  // Bootstrap accounts
  await AccountBootstrapManager.bootstrapAllAccounts();
  registerAccountsWithHealth();
  
  // Start monitoring
  await startHealthMonitoring();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down...');
  
  // Stop all loggers
  consoleLogger.stopLogging();
  cliDashboard.stopDashboard();
  fileLogger.stopLogging();
  
  // Close server
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
```

---

## Usage Scenarios

### Scenario 1: Development Monitoring

**Setup:** All three loggers running
```javascript
consoleLogger.startLogging(300000);   // 5 min - less noise
cliDashboard.startDashboard(10000);   // 10 sec - see updates
fileLogger.startLogging(60000);       // 1 min - detailed logs
```

**What You See:**
- Terminal dashboard updates every 10 seconds
- Console summary every 5 minutes
- Rotating logs for debugging

---

### Scenario 2: Production Monitoring

**Setup:** Dashboard + quiet logging
```javascript
cliDashboard.startDashboard(30000);   // 30 sec - less refresh
fileLogger.startLogging(300000);      // 5 min - archive logs
// consoleLogger disabled for cleaner output
```

**What You See:**
- Real-time dashboard updates
- Minimal console noise
- Archived logs for analysis

---

### Scenario 3: Active Debugging

**Setup:** All rapid updates
```javascript
consoleLogger.startLogging(60000);    // 1 min - frequent updates
cliDashboard.startDashboard(5000);    // 5 sec - rapid refresh
fileLogger.startLogging(30000);       // 30 sec - detailed logs
```

**What You See:**
- Dashboard updates every 5 seconds
- Console summary every 1 minute
- Detailed logs every 30 seconds

---

## Log File Analysis

### View Today's Logs
```bash
# View logs for today
cat logs/health/health-2024-12-13.log

# Pretty print JSON logs
cat logs/health/health-2024-12-13.log | jq .

# Count log entries
cat logs/health/health-2024-12-13.log | wc -l

# Find specific account logs
cat logs/health/health-2024-12-13.log | jq '.accounts[] | select(.phoneNumber == "971505760056")'
```

### Extract Trends
```bash
# Get all uptime values
cat logs/health/health-*.log | jq '.accounts[].uptime' | sort -n

# Find warning/critical events
cat logs/health/health-2024-12-13.log | jq 'select(.warningAccounts > 0 or .criticalAccounts > 0)'

# Average response times
cat logs/health/health-2024-12-13.log | jq '.metrics.averageResponseTime' | awk '{sum+=$1} END {print "Average: " sum/NR "ms"}'
```

---

## Testing

Run the complete test suite:

```bash
node test-phase-6-terminal-logging.js
```

**Expected Output:**
```
╔════════════════════════════════════════════════════════════╗
║    PHASE 6: TERMINAL-BASED HEALTH MONITORING TESTS        ║
║   Console Logs + CLI Dashboard + File Logging            ║
╚════════════════════════════════════════════════════════════╝

✅ PASS Console Logger               - Colored console output
✅ PASS CLI Dashboard                - Real-time terminal UI
✅ PASS File Logger                  - Daily rotating logs
✅ PASS Integrated Monitoring         - All three working together
✅ PASS Health Monitor                - Metrics tracking
✅ PASS File Logger Advanced Features - Advanced logging features

🎉 ALL TESTS PASSED (6/6)
```

---

## Troubleshooting

### Dashboard Not Showing?

**Problem:** Terminal is too small
- Solution: Expand VSCode terminal window (minimum 80x24)

**Problem:** Dashboard freezing
- Solution: Reduce update frequency (increase interval)

### Logs Not Writing?

**Problem:** `logs/health/` directory doesn't exist
- Solution: FileLogger creates it automatically on first run

**Problem:** Permission denied
- Solution: Ensure write permissions in project directory
  ```bash
  chmod 755 logs/
  ```

### High CPU Usage?

**Problem:** Too frequent updates
- Solution: Increase intervals
  ```javascript
  consoleLogger.startLogging(600000);  // 10 min instead of 5
  cliDashboard.startDashboard(30000);  // 30 sec instead of 10
  ```

---

## Configuration Summary

| Component | Default Interval | Recommended Dev | Recommended Prod |
|-----------|------------------|-----------------|------------------|
| Console Logger | 5 min (300s) | 5 min | Disabled |
| CLI Dashboard | 10 sec | 10 sec | 30 sec |
| File Logger | 1 min (60s) | 1 min | 5 min |

---

## Next Steps

1. **Integrate:** Add the three loggers to your `index.js`
2. **Test:** Run `node test-phase-6-terminal-logging.js`
3. **Monitor:** Watch your bots in real-time with the dashboard
4. **Archive:** Review logs daily for patterns and issues
5. **Optimize:** Adjust intervals based on your needs

---

## Production Checklist

- [ ] All three loggers integrated into index.js
- [ ] Intervals configured appropriately
- [ ] Log directory created and writable
- [ ] Test suite passing
- [ ] Dashboard verified working in VSCode terminal
- [ ] Log files being created and rotated
- [ ] Graceful shutdown stops all loggers
- [ ] Documentation available for team

---

**Status:** ✅ PHASE 6 COMPLETE - Terminal-Based Health Monitoring Production Ready

**Deliverables:**
- 3 logging modules (console, dashboard, file)
- 1 comprehensive test suite
- 1 integration guide
- All code production-ready, zero errors
