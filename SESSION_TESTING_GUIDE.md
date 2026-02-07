# ✅ Session Persistence - Testing & Verification Guide

## Quick Start Testing (5 minutes)

### Test 1: Verify System Started Successfully

```bash
# 1. Start the bot
npm run dev

# 2. Look for this in terminal:
# ✅ [SessionManager] Session for 971505760056 found and valid - attempting restore
# OR
# 📱 [QR] QR Code detected - scan with WhatsApp (if first time)

# 3. Verify bot is online by seeing:
# ✅ [WhatsApp] Bot is ready!
# Or similar WhatsApp ready message

# 4. Check files were created:
ls sessions/
ls session-state.json
ls -la .session-cache/ (if exists)
```

**Expected Output:**
```
sessions/
  session-971505760056/
    Default/
    DevToolsActivePort
    ...

session-state.json (file exists)

.session-cache/ (folder exists)
```

---

## Test 2: First-Time Session Creation (Full Linking)

### Prerequisites
- Fresh installation OR `sessions/` folder is empty
- WhatsApp app on your phone

### Steps

```bash
# 1. Start bot
npm run dev

# 2. You should see QR code displayed:
# ┌──────────────────────────┐
# │   (QR code ASCII art)    │
# └──────────────────────────┘

# 3. On your phone:
#    - Open WhatsApp
#    - Go to Settings > Linked Devices
#    - Tap "Link a device"
#    - Scan the QR code shown in terminal

# 4. Wait ~10-15 seconds for connection

# 5. You should see:
# ✅ [WhatsApp] Bot is ready!
```

### Verify Success

```bash
# Check these files were created
ls -la sessions/session-971505760056/Default/

# Should show:
# -rw-r--r--  Session              ← This is critical
# -rw-r--r--  DevToolsActivePort
# drwxr-xr-x  Cache
# drwxr-xr-x  Code Cache
# ... other files

# Check metadata was saved
cat session-state.json

# Should show something like:
# {
#   "sessions": {
#     "971505760056": {
#       "isLinked": true,
#       "authMethod": "qr",
#       "restoreCount": 0,
#       ...
```

**✓ Test 1 Complete: Session created and linked**

---

## Test 3: Session Persistence - Restart Dev Server

### Prerequisites
- Session already created (Test 2 passed)

### Steps

```bash
# 1. Bot should be running from Test 2
# Verify it's online and can see messages

# 2. Now restart the dev server
Ctrl + C

# 3. You should see cleanup messages:
# [Info] Cleaning up browser resources...
# [Info] WhatsApp client disconnected

# 4. Immediately start bot again
npm run dev

# Expected: See this in terminal (NOT a QR code)
# ✅ [SessionManager] Session for 971505760056 found and valid - attempting restore
# ✅ [SessionManager] Session restored successfully for 971505760056
# ✅ [WhatsApp] Bot is ready!

# 5. Wait 5-10 seconds for connection
```

### Verify Success

```bash
# 1. Check that NO QR code was shown
#    (You only see restoration messages, not QR)

# 2. Verify bot came online
#    (Look for "Bot is ready!" or similar message)

# 3. Check restore count increased
cat session-state.json | grep restoreCount

# Should show:
# "restoreCount": 1  ← Was 0 before, now 1

# 4. Check new backup was created
ls .session-cache/

# Should show:
# backup-971505760056-1674149603456/
```

**✓ Test 3 Complete: Session persisted across restart**

---

## Test 4: Multiple Restarts (Stress Test)

### Steps

```bash
# Restart the bot 5 times in a row
# Each time:

for i in {1..5}; do
  echo "=== Restart $i ==="
  sleep 5
  npm run dev &
  sleep 15
  pkill -f "node index.js"
done
```

### Verify Success

```bash
# After all 5 restarts, check:

# 1. Restore count increased
cat session-state.json | grep restoreCount
# Should show: "restoreCount": 5

# 2. Multiple backups created
ls .session-cache/ | wc -l
# Should show at least 5

# 3. Session files still valid
ls sessions/session-971505760056/Default/Session
# File exists and has content

# 4. No QR codes appeared in any restart
# (Check terminal history - no QR anywhere)
```

**✓ Test 4 Complete: System handles multiple restarts**

---

## Test 5: Backup Restoration (Corruption Scenario)

### Steps

```bash
# 1. Verify bot is online and backup exists
npm run dev
# Wait for ready message
sleep 10

# 2. Simulate session corruption - delete critical file
rm sessions/session-971505760056/Default/Session

# 3. Restart bot
Ctrl + C
npm run dev

# Expected behavior:
# Option A (Automatic): Shows "attempting restore from backup"
# Option B (Manual): Shows QR code if backup also corrupted
```

### Verify Success

```bash
# 1. Bot should either:
#    A) Show: "Session restored from backup"
#    B) Show: QR code for re-linking

# 2. If restored from backup:
#    - Session file should exist
ls sessions/session-971505760056/Default/Session
#    - File size should be normal (at least 1KB)
ls -lh sessions/session-971505760056/Default/Session

# 3. Bot should come online
# (Look for "Bot is ready!")
```

**✓ Test 5 Complete: Backup restoration working**

---

## Test 6: Nodemon Auto-Restart (File Change)

### Prerequisites
- Bot running
- Session created and persistent

### Steps

```bash
# 1. Bot is running
npm run dev
# Wait for ready message

# 2. Edit a file (any file in code/ folder)
# For example, edit code/messages.js:
#   - Add a comment
#   - Save file (Ctrl+S)

# 3. Nodemon should auto-restart
# You'll see in terminal:
# [nodemon] restarting due to changes...
# [nodemon] starting `node index.js`

# 4. Bot should come back online
# Look for: "Bot is ready!" message
# This should happen within 5-10 seconds
```

### Verify Success

```bash
# Check that:
# 1. No QR code appeared
# 2. Restore messages appeared
# 3. Bot came online within 5-10 seconds
# 4. Restore count increased in session-state.json

# Check metadata
cat session-state.json | grep -A5 "971505760056"
# Should show updated "_lastRestored" timestamp
```

**✓ Test 6 Complete: Nodemon restarts work seamlessly**

---

## Test 7: Manual Session Clear (New Linking)

### Purpose
Test that you can force a new QR code when needed

### Steps

```bash
# 1. Bot is running
npm run dev

# 2. Open Node.js REPL in another terminal
node

# 3. Import and clear session
> import('./code/utils/SessionManager.js').then(module => {
    const SM = module.default;
    SM.clearSession('971505760056');
    console.log('Session cleared');
  });
// Wait for: Session cleared {at top level}

# 4. Stop bot (Ctrl+C)

# 5. Start bot again
npm run dev

# Expected: QR code shown again
# (Because session was cleared)

# 6. Scan QR to re-link device
```

### Verify Success

```bash
# 1. QR code was shown
# 2. Device was re-linked
# 3. New session files created
# 4. Bot came online
# 5. Restore count reset to 0 in session-state.json
```

**✓ Test 7 Complete: Manual session clear works**

---

## Diagnostic Commands

### Check Session Status

```bash
# Is session valid?
node -e "
import('./code/utils/SessionManager.js').then(module => {
  const SM = module.default;
  const status = SM.canRestoreSession('971505760056');
  console.log('Can restore session:', status);
});
"

# Expected output:
# Can restore session: true
# (or false if no session)
```

### Check Session Info

```bash
# Get detailed session info
node -e "
import('./code/utils/SessionManager.js').then(module => {
  const SM = module.default;
  const info = SM.getSessionInfo('971505760056');
  console.log(JSON.stringify(info, null, 2));
});
"

# Expected output:
# {
#   "exists": true,
#   "canRestore": true,
#   "sessionPath": "...",
#   "defaultPath": "...",
#   "lastState": "authenticated",
#   ...
# }
```

### Check Backup Status

```bash
# List all backups
ls -la .session-cache/

# Expected:
# backup-971505760056-1674149502981/
# backup-971505760056-1674149603456/
# etc.

# Get backup count
ls .session-cache/ | wc -l
```

### Check Metadata

```bash
# View session state
cat session-state.json | jq

# Or with grep
grep -A10 "971505760056" session-state.json
```

---

## Troubleshooting Tests

### Problem: QR code shows every restart

```bash
# 1. Check if session files exist
ls sessions/session-971505760056/Default/

# If empty:
# → Run Test 2 again (create session)

# If files exist but QR still shows:
# → Check if Default/Session has content
ls -lh sessions/session-971505760056/Default/Session

# If file is 0 bytes:
# → Session corrupted, restore from backup
node -e "
import('./code/utils/SessionManager.js').then(m => 
  m.default.restoreFromBackup('971505760056')
);
"
# Then restart bot
```

### Problem: Bot doesn't come online

```bash
# 1. Check console for errors
# Look for red error messages

# 2. Check if backups exist
ls .session-cache/

# If many backups exist:
# → Cleanup old ones manually
rm -rf .session-cache/backup-971505760056-*-000/

# 3. Clear and re-link
node -e "
import('./code/utils/SessionManager.js').then(m => 
  m.default.clearSession('971505760056')
);
"
npm run dev
# Scan QR code again
```

### Problem: Restore count not increasing

```bash
# 1. Check if metadata file exists
ls -la session-state.json

# If missing:
# → Will be created automatically on next restart

# 2. Check metadata format
cat session-state.json

# Should be valid JSON, not empty

# 3. Check file permissions
ls -l session-state.json

# Should be readable/writable by your user
```

---

## Performance Verification

### Measure Restart Time

```bash
# Time a restart cycle

# Start: note the time
npm run dev
# Time bot comes online (look for "Bot is ready!")

# Should be 5-10 seconds (not 30-40s)

# More precise: use time command
time npm run dev &
# Let it connect, then Ctrl+C
# Check the real time (should be ~5-10s to ready)
```

### Check Log Output

```bash
# Capture startup logs
npm run dev 2>&1 | tee startup.log

# Check for timing information
cat startup.log | grep -E "SessionManager|restore|ready"

# Should show restoration messages quickly
# Example:
# 12:34:56 ✅ [SessionManager] Session restored successfully
# 12:35:02 ✅ [WhatsApp] Bot is ready!
# (6 seconds elapsed)
```

---

## Success Criteria Checklist

### Basic Functionality
- [ ] First session creation works (QR code displays)
- [ ] Device successfully linked after QR scan
- [ ] Bot comes online after first linking
- [ ] Session files created in `sessions/` folder
- [ ] `session-state.json` created with metadata

### Persistence
- [ ] Restart without showing QR code
- [ ] Bot comes online in 5-10 seconds (not 30-40s)
- [ ] Restore count increments in metadata
- [ ] No manual intervention needed

### Backup & Recovery
- [ ] Backups created in `.session-cache/`
- [ ] Multiple restarts create multiple backups
- [ ] Corrupted session recovers from backup
- [ ] Manual clear allows new device linking

### Reliability
- [ ] 5+ consecutive restarts work
- [ ] Nodemon auto-restarts work
- [ ] Browser crashes handled gracefully
- [ ] No errors in console logs

---

## Report Template

After testing, use this template to report status:

```markdown
## Session Persistence Testing Report

Date: [Date]
Tester: [Your name]
Environment: Windows / npm run dev

### Tests Completed
- [ ] Test 1: System startup (✓ PASS / ✗ FAIL)
- [ ] Test 2: First-time session creation (✓ PASS / ✗ FAIL)
- [ ] Test 3: Session persistence restart (✓ PASS / ✗ FAIL)
- [ ] Test 4: Multiple restarts (✓ PASS / ✗ FAIL)
- [ ] Test 5: Backup restoration (✓ PASS / ✗ FAIL)
- [ ] Test 6: Nodemon auto-restart (✓ PASS / ✗ FAIL)
- [ ] Test 7: Manual session clear (✓ PASS / ✗ FAIL)

### Issues Found
1. [Description of any issues]
2. [Description of any issues]

### Performance Metrics
- Time to restore session: ___ seconds
- Number of backups created: ___
- Restore count: ___

### Overall Status
[ ] ALL TESTS PASS - PRODUCTION READY ✓
[ ] MINOR ISSUES - NEEDS FIXES
[ ] MAJOR ISSUES - BLOCKED

### Notes
[Any additional observations or comments]
```

---

## Quick Reference: Expected Behavior

### First Run
```
npm run dev
→ No sessions exist
→ Show QR code
→ [Wait for scan]
→ Device linked
→ Bot online ✓
→ Files created
```

### Second+ Run (without changes)
```
npm run dev
→ Session found
→ Validate files
→ Restore from cache
→ Bot online ✓ (5-10 sec)
→ No QR shown
```

### After Code Change
```
[Edit file]
→ Nodemon detects
→ Bot restarts
→ Session restored
→ Bot online ✓ (5-10 sec)
→ No QR shown
```

---

## Next Steps

1. ✅ Read this guide
2. ⏳ Run Test 1 (verify startup)
3. ⏳ Run Test 2 (create session)
4. ⏳ Run Test 3 (verify persistence)
5. ⏳ Run Test 4-7 (comprehensive testing)
6. ⏳ Report any issues

**Estimated time: 20-30 minutes for full testing suite**

---

**All tests passing? Great! You have a reliable WhatsApp bot that persists sessions seamlessly.** 🎉
