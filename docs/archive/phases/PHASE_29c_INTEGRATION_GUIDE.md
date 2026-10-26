# Phase 29c: Integration Code Snippets

## Integration into index.js

### 1. Add Imports (Top of file)
```javascript
import AutoAccountRelinkingManager from './code/utils/AutoAccountRelinkingManager.js';
import AccountConnectionMonitor from './code/utils/AccountConnectionMonitor.js';
```

### 2. Initialize Managers (After UnifiedAccountManager & TerminalDashboard)
```javascript
// ========== AUTO-RELINKING & CONNECTION MONITORING (Phase 29c) ==========
const relinkManager = new AutoAccountRelinkingManager({
  unifiedAccountManager,
  terminalDashboard,
  sessionsDir: './sessions',
  maxRetries: 3,
  retryDelayMs: 3000
});

const connectionMonitor = new AccountConnectionMonitor({
  unifiedAccountManager,
  terminalDashboard,
  healthCheckInterval: 30000  // Health check every 30 seconds
});

console.log('[STARTUP] Phase 29c: Auto-Relinking & Monitoring initialized');
```

### 3. Start Auto-Relinking After Server Ready (In startup sequence)
```javascript
// Call after all managers and dashboard are ready
async function startAutoRelinkingAndMonitoring() {
  try {
    console.log('\n[STARTUP] Initializing auto-relink system...');
    
    // Initialize relinking manager
    await relinkManager.initialize();
    
    // Start auto-relink process
    console.log('[STARTUP] Starting auto-relink sequence...\n');
    await relinkManager.startAutoRelinking();
    
    // Get the list of restored accounts
    const restoredAccounts = relinkManager.getSavedSessions();
    
    // Start monitoring the restored accounts
    if (restoredAccounts.length > 0) {
      console.log('[STARTUP] Starting health monitoring for restored accounts...\n');
      connectionMonitor.startMonitoring(restoredAccounts);
    }
  } catch (error) {
    console.error('[ERROR] Auto-relinking failed:', error.message);
  }
}

// Call this in your startup sequence
await startAutoRelinkingAndMonitoring();
```

### 4. Add Dashboard Commands
Add these to your dashboard command handler:

```javascript
// In your switch/case for dashboard commands:

case 'status':
case 'health':
  console.log('\n');
  connectionMonitor.printHealthDashboard();
  break;

case 'relink':
case 'emergency-relink':
  console.log('\n[DASHBOARD] Starting emergency relink sequence...');
  await relinkManager.startAutoRelinking();
  console.log('[DASHBOARD] Emergency relink complete\n');
  break;

case 'relink-report':
  const results = relinkManager.getRelinkResults();
  console.log('\nRelink Results:');
  console.log(JSON.stringify(results, null, 2));
  break;

case 'account-report':
  const report = connectionMonitor.getHealthReport();
  console.log('\nAccount Health Report:');
  console.log(JSON.stringify(report, null, 2));
  break;
```

### 5. Graceful Shutdown
```javascript
// Before server shutdown
process.on('SIGINT', async () => {
  console.log('\n[SHUTDOWN] Stopping health monitoring...');
  connectionMonitor.stopMonitoring();
  relinkManager.isRelinking = false;
  
  console.log('[SHUTDOWN] Closing WhatsApp clients...');
  // ... rest of shutdown sequence
});
```

---

## Dashboard Command Summary

| Command | Function | Output |
|---------|----------|--------|
| `status` | Show current account statuses | Live status table with online/offline |
| `health` | Same as status | Live status table |
| `relink` | Emergency relink all accounts | Relink success/failure results |
| `relink-report` | Detailed relink results | JSON with duration, methods, errors |
| `account-report` | Detailed health report | Full health metrics and history |

---

## Expected Console Output

### On Server Startup:
```
[STARTUP] Phase 29c: Auto-Relinking & Monitoring initialized
[STARTUP] Initializing auto-relink system...
[STARTUP] Starting auto-relink sequence...

 [AutoRelink] Found 5 saved account(s)
 [AutoRelink] Starting auto-relink sequence...

 [AutoRelink] [1/3] Relinking +201001234567...
 [AutoRelink]  +201001234567 restored and activated
 [AutoRelink] [1/3] Relinking +201009876543...
 [AutoRelink]  +201009876543 restored and activated
...

======================================================================
 AUTO-RELINK RESULTS
======================================================================
 +201001234567: session_restore (2341ms)
 +201009876543: session_restore (1823ms)
 +201112233445: session_restore (2156ms)
 +201556677889: session_restore (1945ms)
 +201778899000: session_restore (2087ms)
======================================================================
TOTAL: 5 online, 0 offline (11s)
======================================================================

[STARTUP] Starting health monitoring for restored accounts...

[Monitor] Health monitoring started
```

### When Running `status` Command:
```

======================================================================
 ACCOUNT CONNECTION STATUS
======================================================================
 Updated: 14:32:45
 Online: 5/5 (100%)
   +201001234567 [checked 2s ago]
   +201009876543 [checked 2s ago]
   +201112233445 [checked 2s ago]
   +201556677889 [checked 2s ago]
   +201778899000 [checked 2s ago]
======================================================================
```

---

## Testing Checklist

- [ ] Files created successfully
- [ ] Test suite passes (5/5 tests)
- [ ] Imports added to index.js
- [ ] Managers initialized
- [ ] startAutoRelinkingAndMonitoring() called
- [ ] Dashboard commands working
- [ ] Server startup shows relink sequence
- [ ] Health monitoring checks every 30s
- [ ] `status` command shows correct accounts
- [ ] All accounts show as online after relink
- [ ] Can trigger `relink` command manually
- [ ] Graceful shutdown works

---

## Deployment Checklist

Before going to production:

- [ ] Verify all tests pass
- [ ] Test auto-relink with real accounts
- [ ] Verify dashboard updates work
- [ ] Check monitoring interval is appropriate
- [ ] Review and adjust maxRetries if needed
- [ ] Monitor error logs for relinking issues
- [ ] Verify graceful shutdown
- [ ] Test with server restart scenarios
- [ ] Monitor resource usage during healthchecks
- [ ] Document any custom configurations used

---

## Performance Notes

- **Memory**: ~5-10MB per 100 accounts (status tracking + history)
- **CPU**: <1% per 100 accounts (30s healthcheck interval)
- **Network**: 1 CheckAccountHealth call per account per 30s
- **Startup Time**: ~2-5 seconds per account (relinking)

Adjust `healthCheckInterval` based on needs:
- 10000ms: More responsive, higher CPU
- 30000ms: Balanced (default)
- 60000ms: Lower resource usage, less responsive