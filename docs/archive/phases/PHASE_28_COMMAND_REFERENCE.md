# Phase 28: Restore Sessions - Quick Command Reference
## WhatsApp Bot Terminal Commands

---

## 🎯 New Commands (Phase 28)

### Command #1: `restore-sessions`
**Purpose**: View all saved sessions and get session recovery options

**Syntax**:
```bash
restore-sessions
```

**Expected Output**:
```
📱 Scanning saved sessions...

  ✅ Found 2 saved session(s):
    • +971505760056
    • +971553633595

📊 RESTORE OPTIONS:

  1️⃣  Auto-restore: Restart the server (node index.js)
     → Automatically restores all 2 session(s)

  2️⃣  Manual restore: Relink specific accounts
     • recover <+phone>     → Attempt restore for one account
     • relink <+phone>      → Re-link with fresh QR code

  3️⃣  Check status: Monitor restore progress
     • health               → View all accounts
     • accounts             → List accounts & details
```

---

### Command #2: `restore`
**Purpose**: Alias for `restore-sessions` (same functionality)

**Syntax**:
```bash
restore
```

**Expected Output**: Same as `restore-sessions` above

---

## 📋 Related Commands (Existing)

### Command: `recover <+phone>`
**Purpose**: Restore a specific WhatsApp session for one account

**Syntax**:
```bash
recover +971505760056
```

**Expected Output**:
```
⏳ Attempting session restoration for +971505760056...
  ✅ Valid session found!
  💡 Session restored automatically on next link.
```

---

### Command: `health`
**Purpose**: Show health status of all connected accounts

**Syntax**:
```bash
health
```

**Expected Output**:
```
╔════════════════════════════════════════════════════════════╗
║         📊 WHATSAPP BOT - ACCOUNT HEALTH STATUS            ║
╚════════════════════════════════════════════════════════════╝

  Account: +971505760056
    Status: ✅ Linked
    Role: Primary
    Uptime: 2h 45m
    Last Message: 5 min ago
    Connected: ✅ Active

  Account: +971553633595
    Status: ✅ Linked
    Role: Primary
    Uptime: 2h 40m
    Last Message: 10 min ago
    Connected: ✅ Active
```

---

### Command: `accounts`
**Purpose**: List all configured and linked accounts

**Syntax**:
```bash
accounts
```

**Expected Output**:
```
📱 CONFIGURED ACCOUNTS:
  [1] Arslan Malik (+971505760056) - role: primary
  [2] "big broker" (+971553633595) - role: primary

📊 DEVICE LINKING STATUS:
  ✅ +971505760056      Linked (primary)
  ✅ +971553633595      Linked (primary)
```

---

## 🔄 Session Recovery Workflow

### Scenario 1: Server Restart (Auto-Restore)
```
1. Bot crashes or server restarts
2. AutoSessionRestoreManager starts automatically
3. Scans saved sessions
4. Restores all valid sessions without QR scanning
5. Status shown in dashboard
```

---

### Scenario 2: Single Account Manual Recovery
```
1. Type: restore-sessions
2. See saved sessions list
3. Type: recover +971505760056
4. Bot attempts to restore session
5. Check status with: health
```

---

### Scenario 3: Fresh Link (No Session)
```
1. Type: restore-sessions
2. No session found or corrupted
3. Type: relink +971505760056
4. Scan QR code in browser
5. Wait for link confirmation
```

---

## ✅ All Dashboard Commands

| Command | Purpose | Usage |
|---------|---------|-------|
| **link-master** | Choose & link master account | `link-master` |
| **relink <+phone>** | Re-link specific device | `relink +971505760056` |
| **recover <+phone>** | Restore saved session | `recover +971505760056` |
| **restore** ⭐ | View all restore options | `restore` |
| **restore-sessions** ⭐ | View all restore options | `restore-sessions` |
| **health** | Show account status | `health` |
| **health <+phone>** | Single account health | `health +971505760056` |
| **accounts** | List all accounts | `accounts` |
| **stats <+phone>** | Performance metrics | `stats +971505760056` |
| **goraha** | GorahaBot stats | `goraha` |
| **goraha contacts** | Get total contacts | `goraha contacts` |
| **goraha filter <string>** | Filter contacts | `goraha filter D2 Security` |
| **help** | Show all commands | `help` |

⭐ = New in Phase 28

---

## 🎓 Common Use Cases

### Use Case 1: "I want to restore all my accounts after a restart"
```bash
# Bot automatically does this on startup
# But you can verify with:
restore-sessions
health
```

### Use Case 2: "Specific account lost connection"
```bash
# First, check what's saved:
restore-sessions

# Then restore that one account:
recover +971505760056

# Monitor the restoration:
health +971505760056
```

### Use Case 3: "Session corrupted, need fresh link"
```bash
# See saved sessions:
restore-sessions

# Fresh relink (will show QR code):
relink +971505760056

# Wait for QR scan and confirmation
# Then verify:
accounts
```

### Use Case 4: "Debug - verify all sessions are saved"
```bash
# Check what can be restored:
restore-sessions

# Check live status:
accounts

# Check detailed health:
health
```

---

## 🔧 Technical Details for Developers

### SessionManager.getAllSavedSessions()
**Location**: `code/utils/SessionManager.js`

**What it does**:
1. Scans `/sessions` directory
2. Looks for folders starting with `session-`
3. Validates each has required Chromium files
4. Returns array of valid phone numbers

**Example**:
```javascript
const SessionManager = await import('./SessionManager.js');
const saved = SessionManager.getAllSavedSessions();
// Returns: ["+971505760056", "+971553633595"]
```

### Callback Flow
```
TerminalHealthDashboard receives input: "restore-sessions"
    ↓
Calls destructured callback: onRestoreAllSessions()
    ↓
Imports SessionManager dynamically
    ↓
Calls SessionManager.getAllSavedSessions()
    ↓
Displays results and restore options
```

---

## ⚙️ Configuration

### Session Storage Location
```
/sessions/
├── session-+971505760056/
│   ├── Default/
│   │   ├── Session (required for restore)
│   │   ├── Cookies (browser state)
│   │   └── ... other Chromium files
│   └── ...
└── session-+971553633595/
    ├── Default/
    │   └── ...
    └── ...
```

### Session State File
```
/session-state.json
{
  "masterPhone": "+971505760056",
  "accounts": {
    "+971505760056": {
      "displayName": "Arslan Malik",
      "role": "primary",
      "linkedAt": "2025-02-28T10:30:00Z"
    },
    "+971553633595": {
      "displayName": "big broker",
      "role": "primary",
      "linkedAt": "2025-02-28T10:35:00Z"
    }
  }
}
```

---

## 🧪 Testing Commands

### Test Integration
```bash
# Run automated tests:
node test-restore-commands.js

# Expected output:
# ✅ TEST 1 PASSED - SessionManager method works
# ✅ TEST 2 PASSED - Command handlers wired
# ✅ TEST 3 PASSED - Callback defined
# ✅ TEST 4 PASSED - Help text updated
```

### Manual Testing
```bash
# 1. Start bot
node index.js

# 2. Wait for terminal ready (should see "Waiting for user command")

# 3. Test new commands:
restore-sessions    # Should show saved sessions

restore              # Same as above

help                 # Should include new commands in list

recover +971505760056  # Try to restore an account
```

---

## 🐛 Troubleshooting

### "No saved sessions found"
**Expected** when:
- No devices have been linked yet
- First time running the bot
- Session files were deleted

**Solution**: Link a device first with `link-master`

### "Session not found or corrupted"
**Means**: Session folder exists but is incomplete

**Solution**: Use `relink +phone` to create fresh session

### Command not recognized
**Check**:
1. Bot is running: `node index.js` in terminal
2. Type command exactly: `restore-sessions` (lowercase)
3. Type `help` to see all commands

### Help text doesn't show restore commands
**If missing**, either:
1. Bot not fully started yet (wait for "Waiting for user command")
2. Files not updated (check if `restore-sessions` appears line ~591 in TerminalHealthDashboard.js)

---

## 📊 Phase 28 Summary

**Features Added**:
- ✅ `restore-sessions` command
- ✅ `restore` command (alias)
- ✅ `SessionManager.getAllSavedSessions()` method
- ✅ Terminal dashboard integration
- ✅ User-friendly restore instructions

**Status**: ✅ Production Ready

**Testing**: ✅ 4/4 Integration Tests Passing

**Next Phase**: Deploy to production and monitor usage

---

For more details, see: `PHASE_28_RESTORE_SESSIONS_COMPLETE.md`
