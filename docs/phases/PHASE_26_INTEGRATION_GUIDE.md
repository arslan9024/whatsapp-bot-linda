# 🔌 PHASE 26 INTEGRATION GUIDE
## Quick Integration of UnifiedAccountManager
**Last Updated:** February 18, 2026

---

## 📋 QUICK INTEGRATION (30 minutes)

### **Step 1: Add Import to index.js**

Add this line with other imports at the top of `index.js`:

```javascript
// NEW: Phase 26 - Unified Account Manager (Single source of truth)
import UnifiedAccountManager from './code/utils/UnifiedAccountManager.js';
```

### **Step 2: Initialize UnifiedAccountManager**

Find where you initialize other managers (around line 180-220) and add:

```javascript
// Initialize managers
const accountConfigManager = new AccountConfigManager(logBot);
const deviceLinkedManager = new DeviceLinkedManager(logBot);
const accountHealthMonitor = new AccountHealthMonitor(logBot);
const sessionRecoveryManager = null; // Optional: Your session recovery manager

// NEW: Initialize Unified Account Manager (Phase 26)
const unifiedAccountManager = new UnifiedAccountManager({
  accountConfigManager,
  deviceLinkedManager,
  accountHealthMonitor,
  sessionRecoveryManager,
  logFunction: logBot
});
```

### **Step 3: Update TerminalDashboard Setup**

The dashboard should already have these new commands, but verify the function has access to `unifiedAccountManager`:

```javascript
// Terminal dashboard already has new commands integrated!
// New commands available:
// - accounts          : List all accounts with status
// - health <phone>    : Show health report for account
// - stats <phone>     : Show metrics for account  
// - recover <phone>   : Attempt session restoration
```

### **Step 4: Optional - Use UnifiedManager in Your Logic**

If you want to use it in bot logic:

```javascript
// Check if account is linked before sending message
if (unifiedAccountManager.isAccountLinked(phoneNumber)) {
  const account = unifiedAccountManager.getAccount(phoneNumber);
  console.log(`Account is linked with health score: ${account.healthScore}`);
  
  // Send message
  await client.sendMessage(phoneNumber, 'Hello!');
} else {
  console.log('Account not ready yet');
}

// Attempt session restoration
const restoreResult = await unifiedAccountManager.attemptSessionRestore(phoneNumber);
if (restoreResult.success) {
  console.log('Session restored!');
} else {
  console.log('Need to link with QR code');
}
```

---

## 🔄 HOW SESSION RESTORATION WORKS NOW

### **Before Phase 26:**
```
User: "link master +971505760056"
  ↓
Always create new client
  ↓
Always display QR code (even if already linked!)
  ↓
User scans QR
  ↓
Account linked (wasteful!)
```

### **After Phase 26:**
```
User: "link master +971505760056"
  ↓
Check: Does session exist? (SessionManager.canRestoreSession)
  ├─ YES: Restore session automatically
  │       ✅ Auto-mark as linked
  │       ✅ No QR code needed
  │       ✅ Faster (< 1 second)
  │
  └─ NO: Create fresh client
           ↓
         Display QR code
           ↓
         User scans
           ↓
         Account linked
```

---

## 🎯 KEY METHODS YOU CAN USE

### **Checking Account Status**
```javascript
// Get complete account data
const account = unifiedAccountManager.getAccount('+971505760056');
// Response: { id, phoneNumber, displayName, status, isOnline, healthScore, ... }

// Quick status checks
if (unifiedAccountManager.isAccountLinked(phone)) { ... }
if (unifiedAccountManager.isAccountPending(phone)) { ... }
if (unifiedAccountManager.hasAccountError(phone)) { ... }

// Session checks  
if (unifiedAccountManager.canRestoreSession(phone)) { ... }
const isValid = unifiedAccountManager.isSessionValid(phone);
```

### **Getting Lists**
```javascript
// All accounts with unified state
const allAccounts = unifiedAccountManager.getAllAccounts();
// Response: [{ phoneNumber, status, healthScore, isOnline, ... }, ...]

// Filtered lists
const masters = unifiedAccountManager.getMasterAccounts();
const servants = unifiedAccountManager.getServantAccounts();
const linked = unifiedAccountManager.getAccountsByStatus('linked');
```

### **Health & Monitoring**
```javascript
// Full health report
const health = unifiedAccountManager.getAccountHealth('+971505760056');
// { overallStatus, score, isOnline, uptime, sessionValid, lastError, ... }

// Detailed metrics
const metrics = unifiedAccountManager.getAccountMetrics('+971505760056');
// { uptime, messageCount, errorCount, lastHeartbeat, ... }
```

### **Session Restoration**
```javascript
// Attempt to restore session (with fallback strategy)
const result = await unifiedAccountManager.attemptSessionRestore('+971505760056');

// Response:
// { success: true, method: 'restore', message: 'Session restored successfully' }
// OR
// { success: false, reason: '...', fallback: 'qr_code' }

if (result.success) {
  // Account is back online!
} else if (result.fallback === 'qr_code') {
  // Need to show QR code
}
```

---

## ⚙️ CONFIGURATION OPTIONS

### **Advanced Configuration**

```javascript
const unifiedAccountManager = new UnifiedAccountManager({
  // Required managers
  accountConfigManager,
  deviceLinkedManager,
  accountHealthMonitor,
  
  // Optional
  sessionRecoveryManager,  // For advanced session recovery
  logFunction: customLogger, // Default: console.log
  
  // Cache settings
  syncInterval: 5000,      // 5 seconds (time cache stays fresh)
});

// You can also:
unifiedAccountManager.syncAllManagers();        // Force sync all data
unifiedAccountManager.invalidateCache('+971505760056'); // Clear one account
```

---

## ✅ VALIDATION CHECKLIST

After integration, verify:

- [ ] Bot starts without errors
- [ ] `help` command shows new options (accounts, health, stats, recover)
- [ ] `accounts` command lists all configured accounts
- [ ] `health +<phone>` shows health report for an account
- [ ] `stats +<phone>` shows metrics for an account
- [ ] `recover +<phone>` shows session restoration status
- [ ] `link master +<phone> <name>` checks session before showing QR
- [ ] Linked accounts show up with ✅ status in accounts list
- [ ] No console errors related to UnifiedAccountManager

---

## 🆘 TROUBLESHOOTING

### **Problem: Import error for UnifiedAccountManager**
```
Error: Cannot find module './code/utils/UnifiedAccountManager.js'
```
**Solution:** Make sure file exists at `code/utils/UnifiedAccountManager.js`

### **Problem: New commands not showing in terminal**
```
Unknown command: 'accounts'
```
**Solution:** Restart the bot - terminal dashboard should pick up new commands automatically

### **Problem: Health command shows error**
```
❌ Account not found: +971505760056
```
**Solution:** Account may not be configured yet - use `accounts` to see what's available

### **Problem: UnifiedAccountManager is undefined**
```
TypeError: unifiedAccountManager is undefined
```
**Solution:** Check initialization order - must be created after accountConfigManager, deviceLinkedManager

---

## 📊 EXPECTED TERMINAL OUTPUT

### **After typing: accounts**
```
╔════════════════════════════════════════════════════════════╗
║           📱 ALL ACCOUNTS - STATUS OVERVIEW                 ║
╚════════════════════════════════════════════════════════════╝

  1. ✅ +971505760056
     Name: Arslan Malik
     Role: MASTER
     Status: LINKED 🟢
     Uptime: 45m
     Last Sync: 10:30:45 AM

  2. ⏳ +971553633595
     Name: BusinessAccount
     Role: SERVANT
     Status: LINKING ⏳
     Uptime: --
     Last Sync: 10:28:12 AM
```

### **After typing: health +971505760056**
```
╔════════════════════════════════════════════════════════════╗
║         📊 ACCOUNT HEALTH REPORT                          ║
╚════════════════════════════════════════════════════════════╝

  Account: +971505760056
  Display: Arslan Malik
  Role: MASTER

  Status: LINKED
  Online: 🟢 YES
  Health: 🟢 HEALTHY (85/100)

  Connection:
    Auth Method: qr
    Linked At: 2/15/2026, 8:00:00 AM
    Last Heartbeat: 10:30:45 AM
    Uptime: 45m

  IP Address: 192.168.1.100
  Create: 2/15/2026
```

---

## 🔗 FILE LOCATIONS

```
project-root/
├── index.js                                    (Main entry point - modify)
├── code/
│   └── utils/
│       ├── UnifiedAccountManager.js            (NEW - Phase 26)
│       ├── TerminalDashboardSetup.js           (MODIFIED - Phase 26)
│       ├── TerminalHealthDashboard.js          (MODIFIED - Phase 26)
│       ├── SessionManager.js                   (Existing - not modified)
│       ├── DeviceLinkedManager.js              (Existing - not modified)
│       └── AccountConfigManager.js             (Existing - not modified)
└── PHASE_26_IMPLEMENTATION_COMPLETE.md         (Documentation)
```

---

## 📚 RELATED DOCUMENTATION

- [Phase 26 Analysis](./PHASE_26_ARCHITECTURE_ANALYSIS.md) - Detailed problem analysis
- [Phase 26 Complete](./PHASE_26_IMPLEMENTATION_COMPLETE.md) - Full implementation details
- [Integration Guide](./PHASE_26_INTEGRATION_GUIDE.md) - This file

---

## 🎓 QUICK REFERENCE

```javascript
// Import
import UnifiedAccountManager from './code/utils/UnifiedAccountManager.js';

// Initialize
const manager = new UnifiedAccountManager({ accountConfigManager, deviceLinkedManager, ... });

// Check status
manager.isAccountLinked(phone)              // true/false
manager.getAccount(phone)                   // Full account object
manager.getAccountHealth(phone)             // Health report
manager.getAccountMetrics(phone)            // Metrics

// Restore session
const result = await manager.attemptSessionRestore(phone);
if (result.success) { /* was restored */ }

// List accounts
manager.getAllAccounts()                    // All
manager.getMasterAccounts()                 // Just masters  
manager.getAccountsByStatus('linked')       // Filtered

// Terminal commands (type in bot)
accounts                # See all accounts
health +971505760056    # Account health
stats +971505760056     # Account metrics
recover +971505760056   # Session restoration
```

---

**Integration Time:** ~30 minutes  
**Test Time:** ~15 minutes  
**Total:** ~45 minutes to full deployment

**Status:** Ready for production  
**Questions?** Refer back to PHASE_26_IMPLEMENTATION_COMPLETE.md
