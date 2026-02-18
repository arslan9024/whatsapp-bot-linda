# 📖 PHASE 26 COMMAND GUIDE
## Unified Account Management - User Reference
**Version:** 1.0  
**Date:** February 18, 2026  
**Status:** Production Ready

---

## 🎯 QUICK START

### Access the Dashboard
```bash
# The dashboard appears automatically when Linda Bot starts
# Or manually type any command:
status

# You should see:
╔════════════════════════════════════════════╗
║   📱 LINDA BOT - REAL-TIME DEVICE DASHBOARD ║
╚════════════════════════════════════════════╝

📊 DEVICE SUMMARY
🔗 LINKED DEVICES
...
```

### Get Help Anytime
```bash
help

# Shows complete command reference
```

---

## 📋 ACCOUNT MANAGEMENT COMMANDS

### 1. List All Accounts
**Command:** `accounts`

**What it does:**
- Shows all configured WhatsApp accounts
- Displays status for each account
- Shows uptime and last sync time
- Helps identify problem accounts

**Example:**
```bash
> accounts

╔════════════════════════════════════════════╗
║    📱 ALL ACCOUNTS - STATUS OVERVIEW        ║
╚════════════════════════════════════════════╝

1. ✅ +971505760056
   Name: Arslan's Account
   Role: MASTER
   Status: LINKED 🟢
   Uptime: 45m
   Last Sync: 2 seconds ago

2. ✅ +971553633595
   Name: Business Account
   Role: MASTER
   Status: LINKED 🟢
   Uptime: 2 hours, 15 minutes
   Last Sync: 5 seconds ago

3. ⏳ +971505555555
   Name: Assistant Account
   Role: SERVANT
   Status: PENDING
   Last Sync: 15 minutes ago
```

**Interpretation:**
- ✅ = Account linked
- ⏳ = Account pending (needs linking)
- 🟢 = Online and active
- 🔴 = Offline or disconnected

---

## 🏥 HEALTH & MONITORING COMMANDS

### 2. Check Account Health (NEW)
**Command:** `health <+phone-number>`

**What it does:**
- Shows detailed health status for one account
- Displays uptime and connection quality
- Shows last activity timestamp
- Identifies any errors or issues

**Example:**
```bash
> health +971505760056

╔════════════════════════════════════════════╗
║    📊 ACCOUNT HEALTH REPORT                 ║
╚════════════════════════════════════════════╝

Account: +971505760056
Display: Arslan's Account
Role: MASTER

Status: LINKED
Online: 🟢 YES
Health: HEALTHY (95/100)

Connection:
  Auth Method: restore      (how account was linked)
  Linked At: 2/15/2026, 10:30 AM
  Last Heartbeat: 2 seconds ago
  Uptime: 45 minutes

IP Address: 192.168.1.100
Created: 2/15/2026
```

**Health Score Interpretation:**
- 80-100: **HEALTHY** 🟢 - All systems good
- 50-79: **FAIR** 🟡 - Minor issues present
- 0-49: **POOR** 🔴 - Significant problems

**Common Values:**
- Auth Method: `qr` = linked via QR code, `restore` = restored from session
- Uptime: Time account has been active
- Last Heartbeat: Last time account checked in

---

### 3. View Account Metrics (NEW)
**Command:** `stats <+phone-number>`

**What it does:**
- Shows detailed statistics for one account
- Displays uptime in easy-to-read format
- Shows activity counters and timestamps
- Displays health summary

**Example:**
```bash
> stats +971505760056

╔════════════════════════════════════════════╗
║    📈 ACCOUNT METRICS                       ║
╚════════════════════════════════════════════╝

Account: +971505760056
Display: Arslan's Account

UPTIME:
  45 minutes

ACTIVITY:
  Last Activity: 10:35 AM
  Heartbeats: 450          (health checks sent)
  Link Attempts: 1/5       (tried 1 time out of 5 allowed)

HEALTH:
  Status: LINKED
  Online: YES
  Recovery Mode: NO        (not trying to recover)
```

**Metrics Explained:**
- **Uptime:** How long the account has been connected
- **Last Activity:** When the account last did something
- **Heartbeats:** Number of health checks (higher = more active)
- **Link Attempts:** How many times linking was attempted

---

### 4. Restore Session (NEW)
**Command:** `recover <+phone-number>`

**What it does:**
- Attempts to restore a WhatsApp session
- Checks if session files exist
- Automatically marks account as linked if successful
- Falls back to QR code if restoration fails

**Example:**
```bash
> recover +971505760056

⏳ Attempting session restoration for +971505760056...
  ✅ Valid session found!
  💡 Session restored automatically on next link.

Result: Account is ready to use
```

**When to use:**
- Account disconnected unexpectedly
- Want to avoid QR code scanning
- Device was restarted or session lost
- Need to quickly reconnect

**Possible Outcomes:**
1. Session restored: Account ready in <5 seconds
2. No session: Will need to link with QR code

---

## 🔗 DEVICE LINKING COMMANDS

### 5. Link New Master Account
**Command:** `link master` or `link master <+phone> [name]`

**What it does:**
- Adds a new master WhatsApp account
- Checks for existing session first
- Restores session if available (no QR needed)
- Shows QR code only if needed
- Registers account as master (commands permission)

**Example 1: Interactive Mode**
```bash
> link master

🔗 Starting master account linking...

[Follow the on-screen prompts]
-Number: +971505760056
-Name: My Business Account

System checks for existing session...
  ✅ Valid session found!
  Session restored successfully!

Account ready to use: +971505760056
```

**Example 2: Direct Mode**
```bash
> link master +971505760056 "Arslan's Account"

[System automatically:]
1. Checks for existing session
2. If found: Restores automatically
3. If not: Shows QR code to scan
```

**Master Account Permissions:**
- Can execute bot commands
- Can manage other accounts
- Can send messages
- Can receive commands

---

### 6. Re-link Existing Master Account
**Command:** `relink master [+phone-number]`

**What it does:**
- Re-links an existing master account
- Resets session if no longer valid
- Shows new QR code if needed
- Keeps all settings and history

**Example:**
```bash
> relink master +971505760056

Re-linking master account: +971505760056

[1/4] Checking for existing valid session...
  ℹ️  No valid session found - QR code will be displayed

[2/4] Resetting device state...
  ✅ Device state reset

[3/4] Clearing old session data...
  ✅ Old session cleared

[4/4] Creating new client for fresh QR code...
  ✅ QR code will display below...

[Scan QR code with your WhatsApp mobile device]
```

**When to use:**
- Account keeps disconnecting
- Session files corrupted
- Want to force fresh connection
- Moving account to different device

---

### 7. Re-link Servant Account
**Command:** `relink servant <+phone-number>`

**What it does:**
- Re-links a servant (secondary) account
- Restores from session if available
- Shows QR code only if needed
- Maintains servant role and links

**Example:**
```bash
> relink servant +971553633595

Re-linking servant account: +971553633595

[1/4] Checking for existing valid session...
  ✅ Valid session found for +971553633595
  💡 Restoring session instead of showing new QR code...

[2/4] Resetting device state...
  ✅ Device state reset

✅ Servant account +971553633595 restored!

Account ready to use
```

**Servant Account Permissions:**
- Can send messages
- Cannot execute admin commands
- Linked to a master account
- Limited command access

---

## 🔍 INFORMATION COMMANDS

### 8. Show Full Dashboard
**Command:** `status` or `health`

**What it does:**
- Displays complete real-time dashboard
- Shows all devices and their status
- Shows system statistics
- Lists available commands

**Example:**
```bash
> status

╔════════════════════════════════════════════╗
║  📱 LINDA BOT - REAL-TIME DEVICE DASHBOARD ║
║       Last Updated: 10:35:24 AM             ║
╚════════════════════════════════════════════╝

📊 DEVICE SUMMARY
  Total Devices: 2 | Linked: 2 | Unlinked: 0 | Linking: 0

🔗 LINKED DEVICES (2)
  ✅ +971505760056 | Arslan's Account [master]
     Status: LINKED 🟢 | Uptime: 45m | Last: now

  ✅ +971553633595 | Business Account [master]
     Status: LINKED 🟢 | Uptime: 2h | Last: 30s ago

[... more output ...]

⚙️  AVAILABLE COMMANDS (Phase 26)
  ACCOUNT MANAGEMENT:
    'link master' 'link master <+p> [n]' 'accounts'
  
  HEALTH & MONITORING (NEW):
    'health <+phone>' 'stats <+phone>' 'recover <+phone>'

  [... more commands ...]
```

---

### 9. View Device Information
**Command:** `device <+phone-number>` or `device +971505760056`

**What it does:**
- Shows detailed device information
- Displays device ID and metadata
- Shows connection details
- Helpful for debugging

**Example:**
```bash
> device +971505760056

Device: +971505760056 - Arslan's Account
  Device ID: device-0056
  Role: MASTER
  Status: LINKED
  
  Connection:
    Auth Method: restore
    Linked At: 2/15/2026 10:30 AM
    IP: 192.168.1.100
    
  Health:
    Online: YES
    Heartbeats: 450
    Last Error: None
```

---

### 10. List All Devices
**Command:** `list` or `devices`

**What it does:**
- Shows all linked devices
- Quick status view of all accounts
- Useful for system overview

**Example:**
```bash
> list

📱 All Devices (2):
  1. ✅ +971505760056 [MASTER] - LINKED 🟢
  2. ✅ +971553633595 [MASTER] - LINKED 🟢

Use 'device <+phone>' for details
```

---

## 📚 REFERENCE COMMANDS

### 11. View Help
**Command:** `help`

**What it does:**
- Shows complete command reference
- Lists all available commands
- Shows command syntax
- Provides usage examples

**Output:**
```bash
📚 Available Commands:

  ACCOUNT MANAGEMENT:
    link master              → Link first master WhatsApp account
    link master <+phone>     → Add additional master WhatsApp account
    accounts                 → List all accounts with per-account status

  ACCOUNT HEALTH & MONITORING:
    health <+phone>          → Show detailed health for specific account
    stats <+phone>           → Show metrics (uptime, messages, errors)
    recover <+phone>         → Attempt session restoration

  DEVICE MANAGEMENT:
    status / health          → Display full dashboard
    relink master [+phone]   → Re-link master account
    relink servant [+phone]  → Re-link servant account
    device <+phone>          → Show detailed device information
    list                     → List all devices

  SYSTEM:
    help                     → Show this help message
    quit / exit              → Exit monitoring
```

---

### 12. Exit Terminal
**Command:** `quit` or `exit`

**What it does:**
- Exits the interactive terminal
- Closes the dashboard
- Keeps Linda Bot running in background

**Example:**
```bash
> quit

👋 Exiting device manager...

[Dashboard closes, bot continues running]
```

---

## 💡 COMMON WORKFLOWS

### Workflow 1: Linking a New Account
```
Step 1: Type "link master +971505760056 MyAccount"
Step 2: System checks for existing session
Step 3a: If session exists → Account restored in <5s, done!
Step 3b: If no session → Scan QR code with WhatsApp
Step 4: Verify with "accounts" → Should show LINKED status
```

### Workflow 2: Troubleshooting Offline Account
```
Step 1: Type "accounts" → See which account is offline
Step 2: Type "health +971505760056" → Check what's wrong
Step 3: Type "stats +971505760056" → See if errors present
Step 4a: If recent heartbeat → Might reconnect automatically
Step 4b: If no recent heartbeat → Type "recover +971505760056"
Step 5: If still offline → Type "relink master +971505760056"
```

### Workflow 3: Monitoring All Accounts
```
Step 1: Type "accounts" → Overview of all accounts
Step 2: Type "health +phone1" → Check first account
Step 3: Type "health +phone2" → Check second account
Step 4: Type "stats +phone1" → Get metrics for account
Step 5: Regular checks every 30 minutes
```

---

## ⚠️ TROUBLESHOOTING

### Issue: Account Shows OFFLINE
**Solutions:**
1. Check internet connection
2. Verify WhatsApp on phone is still authenticated
3. Try `recover <+phone>` to restore session
4. If persists: `relink master <+phone>`

### Issue: QR Code Not Displaying
**Solutions:**
1. Ensure terminal width is at least 100 characters
2. Check terminal emulator supports Unicode
3. Try `relink master <+phone>` to force new QR
4. Check for terminal output buffering issues

### Issue: Session Restore Not Working
**Solutions:**
1. Check session folder exists: `sessions/session-<phone>`
2. Verify device still has WhatsApp authenticated
3. Try manual re-linking with QR code
4. Clear old session and link fresh

### Issue: Command Not Recognized
**Solutions:**
1. Type `help` to see all commands
2. Check phone number format (include +)
3. Try again after dashboard refresh
4. Ensure spelling is correct

---

## 🎓 BEST PRACTICES

### ✅ DO's
- [x] Check `accounts` regularly to monitor status
- [x] Use `health` command when troubleshooting
- [x] Let session restoration happen automatically
- [x] Keep terminal window open for monitoring
- [x] Run `accounts` after restarting bot

### ❌ DON'Ts
- [ ] Don't rapidly click "relink" - wait for process
- [ ] Don't close terminal while bot is initializing
- [ ] Don't use same phone number for multiple accounts
- [ ] Don't ignore OFFLINE status for extended periods
- [ ] Don't assume QR will work if session available

---

## 🚀 ADVANCED TIPS

### Tip 1: Quick Health Check
```bash
# Instead of individual commands:
health +971505760056
health +971553633595

# Just check both at once:
accounts

# Shows all health at a glance
```

### Tip 2: Monitor Multiple Accounts
```bash
# Create a checklist:
1. accounts              → See overall status
2. health +phone1        → First account details
3. health +phone2        → Second account details
4. Repeat every 30 mins
```

### Tip 3: Automation Friendly
```bash
# Commands work in scripts (if terminal available)
# For monitoring: Check status regularly
# For recovery: Use 'recover' before 'relink'
# For setup: Use 'link master' for new accounts
```

---

## 📞 QUICK REFERENCE TABLE

| Command | Purpose | Format |
|---------|---------|--------|
| `accounts` | List all accounts | Just type command |
| `health` | Account health | `health +971505760056` |
| `stats` | Account metrics | `stats +971505760056` |
| `recover` | Restore session | `recover +971505760056` |
| `link master` | Add master account | `link master +971505760056 Name` |
| `relink master` | Re-link master | `relink master +971505760056` |
| `relink servant` | Re-link servant | `relink servant +971505760056` |
| `device` | Device details | `device +971505760056` |
| `list` | All devices | Just type command |
| `status` | Full dashboard | Just type command |
| `help` | Command help | Just type command |
| `quit` | Exit terminal | Just type command |

---

## 📝 NOTES

### Session Restoration (New in Phase 26)
When you link an account that was previously linked, Linda Bot now automatically:
1. Checks if a valid session exists
2. If yes: Restores it in <5 seconds (no QR needed)
3. If no: Shows QR code for fresh linking

This makes re-linking much faster!

### Health Score
- Calculated from: Device status, online status, uptime, error history
- Updated: Every health check
- Used for: Quick status assessment

### Per-Account Commands
All per-account commands require the phone number in format: `+<country><number>`
- Example: `+971505760056` (not just `505760056`)
- Include country code (971 for UAE)
- Include + symbol

---

## 🎉 CONCLUSION

Phase 26 introduces powerful new commands for monitoring and managing your WhatsApp accounts. The key improvements are:

1. **Smart Session Detection** - Faster linking when session available
2. **Per-Account Health** - See exactly what's happening with each account  
3. **Detailed Metrics** - Understand uptime, activity, and performance
4. **Easy Recovery** - Restore sessions with one command

For any questions or issues, check the help system by typing `help` at any time.

**Happy managing!** 🚀
