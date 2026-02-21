# AutoSessionRestoreManager - Testing & Verification Guide

## Overview
The AutoSessionRestoreManager automatically restores WhatsApp sessions on server restart (when using nodemon or manual npm start). This prevents the need for manual re-linking after every server crash or restart.

## Test Scenarios

### Scenario 1: First Startup (No Saved Sessions)
**Expected Output:**
```
╔════════════════════════════════════════════════════════════╗
║         🔄 AUTO-RESTORE: Previous WhatsApp Sessions       ║
╚════════════════════════════════════════════════════════════╝

ℹ️  No saved sessions found.
```

**Result:** ✅ Pass if this message appears

---

### Scenario 2: Server Restart After Successful Linking
**Prerequisites:**
1. First startup complete
2. User successfully linked a WhatsApp account using `link master` command
3. Dashboard shows device as "LINKED" with green status
4. Kill server (Ctrl+C) or restart with `npm start` again

**Expected Output:**
```
╔════════════════════════════════════════════════════════════╗
║         🔄 AUTO-RESTORE: Previous WhatsApp Sessions       ║
╚════════════════════════════════════════════════════════════╝

📱 Found 1 saved account(s) to restore:

  ▶ +971501234567 (Master Account Name)
    ✅ Session found - attempting restore...
    ⏳ Initializing with saved session...
    ✅ RESTORED SUCCESSFULLY

╭────────────────────────────────────────────────────────────╮
│              AUTO-RESTORE SUMMARY                          │
├────────────────────────────────────────────────────────────┤
│  ✅ RESTORED: 1 account(s)                             │
│     • Master Account Name                                  │
│                                                            │
╰────────────────────────────────────────────────────────────╯

✅ Auto-restore completed successfully!
   1 account(s) restored from previous sessions
   Dashboard shows current online status

✅ All accounts are now online and ready to use
   No manual linking required on this restart
```

**Result:** ✅ Pass if all accounts are restored and marked as ONLINE in dashboard without manual intervention

---

### Scenario 3: Partial Restore (Some Sessions Corrupted)
**Prerequisites:**
1. Multiple accounts linked
2. At least one session file is deleted or corrupted

**Expected Output:**
```
╔════════════════════════════════════════════════════════════╗
║         🔄 AUTO-RESTORE: Previous WhatsApp Sessions       ║
╚════════════════════════════════════════════════════════════╝

📱 Found 2 saved account(s) to restore:

  ▶ +971501234567 (Primary Account)
    ✅ Session found - attempting restore...
    ⏳ Initializing with saved session...
    ✅ RESTORED SUCCESSFULLY

  ▶ +971509876543 (Secondary Account)
    ❌ Session not found or corrupted - manual linking required

╭────────────────────────────────────────────────────────────╮
│              AUTO-RESTORE SUMMARY                          │
├────────────────────────────────────────────────────────────┤
│  ✅ RESTORED: 1 account(s)                             │
│     • Primary Account                                      │
│                                                            │
│  ❌ FAILED: 1 account(s)                               │
│     • Secondary Account                                    │
│                                                            │
│  💡 Tip: Use terminal command:                            │
│     link master <+phone>      → Add new account           │
│     relink <+phone>           → Re-link specific account  │
│                                                            │
╰────────────────────────────────────────────────────────────╯

✅ Auto-restore completed successfully!
   1 account(s) restored from previous sessions
   Dashboard shows current online status

⚠️  1 account(s) need manual re-linking
   Use: link master <+phone> or relink <+phone>
```

**Result:** ✅ Pass if restored accounts appear ONLINE and failed accounts prompt for manual re-linking

---

### Scenario 4: Dashboard Shows Correct Status
**Expected Behavior:**
After auto-restore, dashboard should show:
- Restored accounts: GREEN ✅ LINKED/ONLINE
- Failed accounts: YELLOW ⚠️ ERROR/OFFLINE
- No manual linking intervention needed for restored accounts

**Commands to verify:**
```
Type: dashboard     → Shows all accounts and their status
Type: status        → Shows current online status for all devices
Type: health        → Shows account health metrics
```

---

## Implementation Details

### Files Involved
1. **AutoSessionRestoreManager.js** - Core utility for session restoration
2. **index.js** - Main orchestration at STEP 4A (line ~520)
3. **SessionStateManager.js** - Loads saved session state
4. **SessionManager.js** - Checks if session can be restored via `canRestoreSession()`
5. **DeviceLinkedManager.js** - Marks devices as linked after successful restore
6. **CreatingNewWhatsAppClient.js** - Creates WhatsApp client with saved session

### Restoration Flow
```
┌─────────────────────────────────────────┐
│ Server Starts (npm start / nodemon)    │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ SessionStateManager loads saved state  │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ AutoSessionRestoreManager.autoRestore() │
│   - For each saved account:             │
│   - Check SessionManager.canRestore()   │
│   - Create WhatsApp client (isRestore)  │
│   - Call setupClientFlow (isRestore)    │
│   - Mark device as LINKED              │
└────────────────┬────────────────────────┘
                 │
         ┌───────┴───────┐
         │               │
    Success          Failure
         │               │
         ▼               ▼
    ONLINE         OFFLINE/ERROR
   (No QR)        (Needs Relink)
```

### Key Configuration
- **Auto-restore enabled:** Yes (Phase 27)
- **Trigger:** Server startup (index.js STEP 4A)
- **Restored accounts:** Show as ONLINE without QR scanning
- **Failed restores:** Fallback to manual linking

---

## Verification Checklist

- [ ] First startup: "No saved sessions found" message appears
- [ ] After linking: Account marked as LINKED in dashboard
- [ ] After restart: Auto-restore summary shows restored accounts
- [ ] Restored account shows ONLINE immediately (no QR prompt)
- [ ] Failed restores show yellow warning and require manual re-linking
- [ ] Dashboard commands work correctly after auto-restore
- [ ] Terminal history shows correct account details

---

## Debugging Tips

If auto-restore doesn't work:

1. **Check SessionStateManager:**
   ```
   cd .whatsapp-bot-state
   ls -la
   # Should show date_master_linkedDevices.json and account_*.json files
   ```

2. **Check Session Files:**
   ```
   ls -la .wwebjs_auth
   # Should show session_+phone folders for each linked account
   ```

3. **Enable Debug Mode (in AutoSessionRestoreManager.js):**
   ```javascript
   console.log('[DEBUG] Checking:', phoneNumber);
   console.log('[DEBUG] Can restore:', canRestore);
   ```

4. **Manual Restore Test:**
   ```
   Type: relink +phone
   # Should attempt manual restoration
   ```

---

## Integration with Dashboard
Restored accounts will automatically:
- ✅ Show ONLINE status in the terminal dashboard
- ✅ Receive incoming messages
- ✅ Execute commands
- ✅ Participate in campaigns
- ✅ Send status updates to health monitoring

No manual linking required if sessions can be restored!

---

## Next Steps
1. Link first account using `link master` command
2. Verify dashboard shows LINKED status
3. Kill server (Ctrl+C)
4. Restart server (`npm start`)
5. Confirm Auto-restore summary shows restored account
6. Verify account shows ONLINE without QR prompt
7. Send test message to confirm messages flow correctly

---

## Success Criteria
✅ All previously linked accounts restore automatically on restart  
✅ No manual re-linking needed unless session files are deleted/corrupted  
✅ Dashboard shows correct status (ONLINE/OFFLINE) for each account  
✅ Terminal shows informative auto-restore summary  
✅ Fallback to manual linking for failed restores  
