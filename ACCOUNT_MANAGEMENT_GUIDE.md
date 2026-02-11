# 📱 Dynamic Account Management System
## Linda Bot - Multi-Account WhatsApp Management

**Version:** 1.0 | **Date:** February 11, 2026 | **Status:** Production Ready

---

## 📑 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Commands Reference](#commands-reference)
4. [Architecture](#architecture)
5. [Configuration](#configuration)
6. [Troubleshooting](#troubleshooting)
7. [Examples](#examples)
8. [Advanced Topics](#advanced-topics)

---

## 📋 Overview

### What's New?

The Dynamic Account Management System replaces Linda's static account configuration with a command-driven, flexible multi-account architecture. Instead of manually editing `bots-config.json`, you can now manage all WhatsApp accounts directly through WhatsApp commands.

### Key Features

✅ **Add Accounts Dynamically** - No restart required  
✅ **Remove Accounts Safely** - Graceful removal with session tracking  
✅ **Set Master Account** - Primary account for operations  
✅ **Enable/Disable Accounts** - Control which accounts initialize  
✅ **Account Status Tracking** - Real-time device status  
✅ **Persistent Configuration** - All changes saved to `bots-config.json`  
✅ **Master Phone Validation** - Ensures master is always configured  

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **AccountConfigManager** | `code/utils/AccountConfigManager.js` | Core account management logic |
| **Linda Commands** | `code/Commands/LindaCommandHandler.js` | Command handlers for account ops |
| **Command Registry** | `code/Commands/LindaCommandRegistry.js` | Command metadata and help |
| **index.js** | Root | Integration & initialization |

---

## 🚀 Quick Start

### Adding Your First Account

```
!add-account +971501234567 "My Main Account"
```

Response:
```
✅ Account Added Successfully

📱 Name: My Main Account
☎️  Phone: +971501234567
🆔 ID: account-1707557400000
⚙️  Status: pending

💡 Next: Scan QR code to link this account
```

### Setting Master Account

```
!set-master account-1707557400000
```

### Viewing All Accounts

```
!list-accounts
```

---

## 💬 Commands Reference

### !add-account

**Add a new WhatsApp account to Linda**

```
Syntax:  !add-account <phone> <name>
Auth:    Not required
Example: !add-account +971501234567 "Main Office"
```

**Parameters:**
- `<phone>`: Phone number in UAE format (+971XXXXXXXXX)
- `<name>`: Display name for the account

**Returns:**
- Account ID for future reference
- Status indicator (pending/active)
- Instructions for device linking

**💡 Tips:**
- Phone must be valid UAE number (9 digits after 971)
- Name can be anything (office name, team, device name)
- Account starts in "pending" state until QR code is scanned
- Use account ID to manage the account later

---

### !list-accounts

**List all configured WhatsApp accounts**

```
Syntax:  !list-accounts
Auth:    Not required
Example: !list-accounts
```

**Output:**
- Account count (total)
- Master account indicator
- Status for each account (✅ active / ⏳ pending)
- Account ID and phone number

**💡 Tips:**
- Pending accounts need QR code scanning
- 🔴 Red indicator means account is disabled (won't initialize)
- 👑 Crown icon shows master account
- Use account ID to manage specific accounts

---

### !remove-account

**Remove a configured account**

```
Syntax:  !remove-account <account-id>
Auth:    Required
Example: !remove-account account-1707557400000
```

**Parameters:**
- `<account-id>`: Account ID from !list-accounts

**Restrictions:**
- Cannot remove if it's the only account
- Cannot remove master without another primary account
- Authentication required

**⚠️ Important:**
- Removes from Linda configuration only
- WhatsApp session still exists on device
- Must revoke access in WhatsApp Settings > Linked Devices

---

### !set-master

**Set the primary WhatsApp account**

```
Syntax:  !set-master <account-id>
Auth:    Required
Example: !set-master account-1707557400000
```

**Parameters:**
- `<account-id>`: Account ID from !list-accounts

**Effects:**
- Routes all defaultcommands to master account
- Master phone used in health monitoring
- Master account gets 👑 indicator in !list-accounts

**💡 Tips:**
- Only one master account at a time
- Switch master anytime without removing old one
- Old master becomes secondary account

---

### !enable-account

**Enable a disabled account**

```
Syntax:  !enable-account <account-id>
Auth:    Required
Example: !enable-account account-1707557400000
```

**Effects:**
- Account will initialize on next restart
- Changes saved to bots-config.json
- Status changes from 🔴 disabled → 🟢 enabled

---

### !disable-account

**Disable an account (temporarily)**

```
Syntax:  !disable-account <account-id>
Auth:    Required
Example: !disable-account account-1707557400000
```

**Effects:**
- Account will NOT initialize on next restart
- Configuration preserved (can enable later)
- Useful for testing or maintenance

---

## 🏗️ Architecture

### System Flow

```
┌──────────────────────────────────────────────────────────┐
│                    WhatsApp Message                      │
└──────────────────────────────────────────────────────────┘
                         │
                         ▼
            ┌────────────────────────────┐
            │  LindaCommandHandler       │
            │  - Parse message           │
            │  - Extract command & args  │
            │  - Route to handler        │
            └────────────────────────────┘
                         │
                         ▼
        ┌───────────────────────────────────────┐
        │  Account Management Handler           │
        │  - Validate arguments                 │
        │  - Check authentication               │
        │  - Call AccountConfigManager          │
        └───────────────────────────────────────┘
                         │
                         ▼
        ┌───────────────────────────────────────┐
        │  AccountConfigManager                 │
        │  - Load/save config                   │
        │  - Validate phone numbers             │
        │  - Manage account metadata            │
        │  - Persist to bots-config.json        │
        └───────────────────────────────────────┘
                         │
                         ▼
        ┌───────────────────────────────────────┐
        │  bots-config.json                     │
        │  (Persistent Account Storage)         │
        └───────────────────────────────────────┘
```

### Data Flow

1. **Command Entry** - WhatsApp message starting with `!`
2. **Parsing** - Extract command name and arguments
3. **Validation** - Verify syntax and authentication
4. **Processing** - Execute account operation
5. **Persistence** - Save changes to config file
6. **Confirmation** - Send status message to user

### Master Phone Configuration

Linda ensures master phone is always properly set:

```javascript
// On startup (index.js - STEP 1C):
1. Load AccountConfigManager
2. Check for master account in bots-config.json
3. If no master found:
   - Display all available accounts
   - Show command to set master: !set-master <id>
   - Log helpful instructions

// At command time:
1. Terminal dashboard uses master phone from AccountConfigManager
2. Fallback to first account if not set
3. Show helpful error with available accounts if both missing
```

---

## ⚙️ Configuration

### bots-config.json Structure

```json
{
  "whatsappBots": {
    "main_office": {
      "id": "account-1707557400000",
      "phoneNumber": "+971501234567",
      "displayName": "Main Office",
      "description": "WhatsApp Account - Main Office",
      "role": "primary",
      "sessionPath": "sessions/session-9710123456789",
      "enabled": true,
      "features": {
        "messaging": true,
        "contacts": true,
        "campaigns": true,
        "analytics": true,
        "scheduling": true
      },
      "status": "active",
      "createdAt": "2026-02-11",
      "lastSync": "2026-02-11T09:30:00Z"
    },
    "team_account": {
      "id": "account-1707557401234",
      "phoneNumber": "+971509876543",
      "displayName": "Team Account",
      "role": "secondary",
      "sessionPath": "sessions/session-9710987654321",
      "enabled": true,
      "status": "pending",
      "createdAt": "2026-02-11",
      "lastSync": null
    }
  }
}
```

### AccountConfigManager API

```javascript
// Get accounts
accountConfigManager.getAllAccounts()      // All accounts
accountConfigManager.getMasterAccount()    // Master only
accountConfigManager.getMasterPhoneNumber() // Master phone string
accountConfigManager.getLinkedAccounts()   // Active only
accountConfigManager.getPendingAccounts()  // Needs QR scan

// Manage accounts
await accountConfigManager.addAccount(data)
await accountConfigManager.removeAccount(id)
await accountConfigManager.setMasterAccount(id)
await accountConfigManager.enableAccount(id)
await accountConfigManager.disableAccount(id)

// Query accounts
accountConfigManager.getAccount(id)
accountConfigManager.getAccountByPhone(phone)
accountConfigManager.getAccountCount()

// Status updates
await accountConfigManager.updateAccountStatus(id, 'active')
```

---

## 🔧 Troubleshooting

### "Master phone not configured"

**Error Message:**
```
⚠️  WARNING: Master account not properly configured!
```

**Cause:**
- No accounts in bots-config.json, OR
- No account marked with role: "primary"

**Solution:**

```
Step 1: View all accounts
!list-accounts

Step 2: Add an account if none exist
!add-account +971501234567 "Main Account"

Step 3: Set as master
!set-master account-1707557400000

Step 4: Verify
!list-accounts
(Should show 👑 Master Account indicator)
```

### "Invalid phone number format"

**Error:**
```
Invalid phone number format. Use +971XXXXXXXXX
```

**Fix:**
- Must be UAE format: +971 followed by 9 digits
- ❌ Wrong: `0501234567` or `971501234567`
- ✅ Correct: `+971501234567`

### "Account already exists"

**Error:**
```
Phone number already in use by Other Account
```

**Fix:**
- That phone is already registered
- Use !remove-account to remove old entry first
- Or use a different phone number

### "Authentication required"

**Error:**
```
This command requires authentication
```

**Fix:**
1. Run: `!authenticate <password>`
2. Default password: `linda123` (set in .env)
3. Auth valid for 1 hour per session

---

## 📚 Examples

### Scenario 1: Add Two Company Accounts

```
Step 1: Add main office account
!add-account +971501234567 "Main Office"

Step 2: Add satellite office account  
!add-account +971559876543 "Dubai Branch"

Step 3: List both accounts
!list-accounts

Step 4: Set main as master
!authenticate linda123
!set-master account-1707557400000

Output:
✅ Master account set to: Main Office
👑 This account is now the primary account for Linda
```

### Scenario 2: Temporarily Disable Account

```
Step 1: View accounts
!list-accounts

Step 2: Disable for maintenance
!authenticate linda123
!disable-account account-1707557401234

Step 3: Verify
!list-accounts
(Account now shows 🔴 disabled)

Step 4: Re-enable later
!authenticate linda123
!enable-account account-1707557401234
```

### Scenario 3: Switch Master Account

```
Before:
- Main Office (👑 master)
- Branch Office (secondary)

Commands:
!authenticate linda123
!set-master account-branch-id

After:
- Main Office (secondary)
- Branch Office (👑 master)
```

---

## 🔒 Security

### Authentication

- Admin commands require password verification
- Default: `LINDA_ADMIN_PASSWORD` environment variable
- Session-based: Auth valid for 1 hour
- Per-phone-number tracking

### Commands Requiring Auth

- `!remove-account` - Prevents accidental deletion
- `!set-master` - Prevents account misconfig
- `!enable-account` - Controls active accounts
- `!disable-account` - Disables accounts

### Best Practices

1. **Change default password** in .env
   ```
   LINDA_ADMIN_PASSWORD=your_secure_password
   ```

2. **Restrict admin phone numbers** (coming soon)
   - Only certain numbers can run admin commands

3. **Audit logging** (plan)
   - Track all account changes
   - Log who changed what and when

---

## 🚀 Advanced Topics

### Custom Account Features

Each account supports feature flags:

```javascript
"features": {
  "messaging": true,      // Send/receive messages
  "contacts": true,       // Access contacts
  "campaigns": true,      // Run campaigns
  "analytics": true,      // Collect analytics
  "scheduling": true      // Schedule messages
}
```

Future: Control per-account features with commands

### Device Recovery

When an account's device is lost/rotated:

```
Step 1: Device goes offline
Step 2: Status changes to "disconnected"
Step 3: Run: !relink-device +971501234567
Step 4: Scan new QR code on new device
Step 5: Status becomes "active"
```

### Session Persistence

Account session files stored in:
```
sessions/
├── session-9710123456789/   (Main Office)
├── session-9710987654321/   (Branch Office)
└── session-9710564856432/   (Team Account)
```

Automatic restoration on restart (Phase 3).

### Conversation Learning

All account operations logged for ML training:

```javascript
accountConfigManager.logBot()  // Every action logged
LindaConversationLearner       // Learns from patterns
```

---

## 📊 Monitoring Account Health

### Terminal Dashboard

View real-time account status:

```
Press 'd' or type 'dashboard' in terminal:

📱 Device Status:
─────────────────────────
✅ Main Office (2/2 linked)
   └─ +971501234567 | Connected | Last msg: 2min ago
⏳ Branch Office (0/1 linked)
   Waiting for QR code scan...

Account Summary:
  Total: 2 | Active: 1 | Pending: 1
  Master: +971501234567
```

### Health Check Command

```
!health

Response:
📊 System Health:
─────────────────────────
✅ Uptime: 5d 14h 23m
✅ Memory: 234 MB (12%)
✅ Devices: 2 of 2 linked
✅ Accounts: All active
```

---

## 📞 Support & Contact

**Issues:**
1. Check Troubleshooting section above
2. Review LINDA_COMMANDS.md for command list
3. Check bot logs: `!logs 50 error`

**Feature Requests:**
- Hot-reload without restart (coming soon)
- Per-account feature flags (coming soon)
- Account groups/teams (coming soon)

---

## 🔄 Updates & Changelog

### Version 1.0 (February 11, 2026)

✅ Initial release  
✅ Add/remove accounts  
✅ Master account management  
✅ Enable/disable accounts  
✅ Account status tracking  
✅ Master phone validation  
✅ Command integration  
✅ Persistent config  

### Upcoming (Q1 2026)

🔄 Hot-reload without restart  
🔄 Account groups  
🔄 Feature flags per account  
🔄 Admin multi-phone auth  
🔄 Account backup/export  
🔄 Device replacement flow  

---

**Created:** February 11, 2026  
**Last Updated:** February 11, 2026  
**Maintained By:** Linda Bot Development Team  
**Status:** Production Ready ✅
