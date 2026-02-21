# PHASE 9: Secondary Account Management - QUICK REFERENCE
**Last Updated**: February 17, 2026 | **Status**: ✅ PRODUCTION READY

---

## 🎯 COMMAND QUICK REFERENCE

### 📱 View & Monitor Accounts

| Command | Usage | Example |
|---------|-------|---------|
| `status` / `health` | Display full dashboard with all accounts | `> status` |
| `secondary-stats` | Show account totals and distribution | `> secondary-stats` |
| `list-servants` | Show all masters and their servants | `> list-servants` |
| `servants-by-master` | Show servants for specific master | `> servants-by-master arslan-malik` |

### ➕ Manage Secondary Accounts

| Command | Usage | Example |
|---------|-------|---------|
| `add-secondary` | Add new servant to master | `> add-secondary arslan-malik +971501234567 "Sales Team" support` |
| `link-secondary` | Connect secondary account (QR login) | `> link-secondary servant-1702324945601` |
| `change-servant-master` | Reassign servant to different master | `> change-servant-master servant-1 arslan-malik` |
| `remove-secondary` | Remove servant account from system | `> remove-secondary servant-1702324945601` |

### 🔧 Help & System

| Command | Usage | Example |
|---------|-------|---------|
| `help` | Show all available commands | `> help` |
| `quit` / `exit` | Exit monitoring | `> quit` |

---

## ⚡ QUICK WORKFLOWS

### Add and Connect New Secondary Account
```terminal
# Step 1: Add account to master
> add-secondary arslan-malik +971501234567 "Support Team" support
  → Servant ID: servant-1702324945601

# Step 2: Link account (scan QR code)
> link-secondary servant-1702324945601
  → [QR Code displayed] Scan with phone +971501234567

# Step 3: Verify it's connected
> list-servants
  → Shows new account linked ✅
```

### Check Account Hierarchy
```terminal
# View all accounts
> list-servants

# View specific master's servants
> servants-by-master arslan-malik

# View statistics
> secondary-stats
```

### Reassign Servant to New Master
```terminal
# Move servant1 to assistan-malik master
> change-servant-master servant-1702324945601 assistant-malik
  → Servant reassigned successfully
```

### Remove Account
```terminal
# Remove servant
> remove-secondary servant-1702324945601
  → Account removed from system
```

---

## 📊 COMMAND PARAMETERS

### add-secondary
```
add-secondary <master-id> <phone> <name> [purpose]

<master-id>    Required: ID of master account (e.g., arslan-malik)
<phone>        Required: WhatsApp phone number (e.g., +971501234567)
<name>         Required: Display name (e.g., "Sales Team")
[purpose]      Optional: Purpose tag (support, sales, admin, custom)
```

### link-secondary
```
link-secondary <servant-id>

<servant-id>   Required: ID returned from add-secondary command
               or shown in list-servants output
```

### change-servant-master
```
change-servant-master <servant-id> <new-master-id>

<servant-id>       Required: ID of servant to reassign
<new-master-id>    Required: ID of new master account
```

### servants-by-master
```
servants-by-master <master-id>

<master-id>    Required: ID of master to list servants for
```

### remove-secondary
```
remove-secondary <servant-id>

<servant-id>   Required: ID of servant to remove
```

---

## 📋 CONFIGURATION FILE LOCATIONS

- **Main Config**: `code/WhatsAppBot/bots-config.json`
- **Session Data**: `.whatsapp-sessions/` (automatically managed)
- **Backup Config**: `code/WhatsAppBot/bots-config.json.backup` (create manually)

---

## 🔍 COMMON SCENARIOS

### Scenario 1: Two Support Teams
```
Master: Arslan Malik (+971505760056)
├─ Servant 1: Support USA (+971501234567)
└─ Servant 2: Support EU (+971502345678)

Commands:
> add-secondary arslan-malik +971501234567 "Support USA" support
> add-secondary arslan-malik +971502345678 "Support EU" support
> link-secondary servant-1702324945601
> link-secondary servant-1702325051234
```

### Scenario 2: Multiple Masters with Servants
```
Master 1: Arslan Malik
├─ Servant 1: Sales Team
└─ Servant 2: Support Team

Master 2: Another Manager
├─ Servant 1: Operations
└─ Servant 2: Admin

Commands:
> list-servants        # Shows all masters/servants
> secondary-stats      # Shows totals: 2 masters, 4 servants
```

### Scenario 3: Failover - Servant Reassignment
```
Problem: Master account goes offline
Solution: Reassign servants to backup master

> change-servant-master servant-1702324945601 backup-master
> change-servant-master servant-1702325051234 backup-master
> servants-by-master backup-master  # Verify all servants moved
```

---

## ✅ VERIFICATION CHECKLIST

Use this checklist to verify Phase 9 is working:

- [ ] Can run `secondary-stats` successfully
- [ ] `list-servants` shows all accounts
- [ ] Can add secondary: `add-secondary arslan-malik +971501234567 "Test" custom`
- [ ] Can link secondary account with QR code
- [ ] Can view servants by master with `servants-by-master`
- [ ] Can reassign servant with `change-servant-master`
- [ ] Can remove secondary account
- [ ] Help command shows all new Phase 9 commands

---

## 🚨 TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| `❓ Unknown command` | Restart bot - dashboard needs to reload callbacks |
| `❌ Master account not found` | Check master ID - use `list-servants` to see valid IDs |
| `❌ Phone number already in use` | Each phone must be unique - check `list-servants` |
| `⏳ No QR code appears` | Wait 5 seconds, use `recover <phone>` if needed |
| `❌ Account already exists` | Check if phone already added - use `list-servants` |

---

## 📞 USEFUL COMBINATION COMMANDS

```terminal
# Full account audit
> secondary-stats
> list-servants
> servants-by-master arslan-malik

# Add and verify new servant
> add-secondary arslan-malik +971501234567 "New Team" custom
> list-servants
> secondary-stats

# Failover procedure
> servants-by-master old-master
> change-servant-master servant-1 new-master
> servants-by-master new-master
> list-servants
```

---

## 🎯 KEY FEATURES

- ✅ **Add Secondary Accounts** - `add-secondary` command
- ✅ **Link with QR Code** - `link-secondary` command
- ✅ **View Hierarchy** - `list-servants` shows all accounts
- ✅ **Reassign Servants** - `change-servant-master` for failover
- ✅ **Remove Accounts** - `remove-secondary` to clean up
- ✅ **View Statistics** - `secondary-stats` for overview
- ✅ **Per-Master Servants** - `servants-by-master` shows specific master

---

## 📊 ACCOUNT STATUS MEANINGS

| Icon | Status | Meaning |
|------|--------|---------|
| ✅ | Linked | Account is actively connected to WhatsApp |
| ⏳ | Pending | Account added but not yet linked |
| ❌ | Unlinked | Account was connected but now disconnected |
| 👑 | Primary | This is a primary/master account |
| 📱 | Secondary | This is a servant account under a master |

---

## 🔗 RELATED COMMANDS (EXISTING)

```terminal
# Device management
> check-device <phone>
> list
> relink <phone>
> recover <phone>

# Session management
> validate-session <phone>
> list-sessions
> force-session-restore <phone>

# Device state
> check-device-state <phone>
> device-state-metrics
> reset-device-state <phone>
```

---

## 📝 CREATING SERVANT ACCOUNT IDS

Servant IDs are auto-generated as: `servant-{timestamp}`

Examples:
- `servant-1702324945601` (from Feb 11, 2026)
- `servant-1702325051234` (from Feb 11, 2026)

These IDs are displayed after `add-secondary` and shown in `list-servants`.

---

## 📈 EXAMPLE OUTPUT

### Running `list-servants`
```
👑 MASTER ACCOUNTS & SECONDARY ACCOUNTS

✅ [PRIMARY] Arslan Malik (+971505760056)
   └─ 2 Secondary Accounts:
      [1] ✅ Sales Team (support)
          +971501234567
      [2] ⏳ Support Desk (custom)
          +971502345678
```

### Running `secondary-stats`
```
📊 ACCOUNT STATISTICS

Total Accounts: 3
Master Accounts: 1
Secondary Accounts: 2

 Master Distribution:
  👑 Arslan Malik: 2 servants
```

### Running `servants-by-master arslan-malik`
```
📱 SECONDARY ACCOUNTS: Arslan Malik

Master: +971505760056
Servant Count: 2

[1] ✅ Sales Team
    ID: servant-1702324945601
    Phone: +971501234567
    Purpose: support

[2] ⏳ Support Desk
    ID: servant-1702325051234
    Phone: +971502345678
    Purpose: custom
```

---

## 🎓 LEARNING ORDER

1. **First**: `secondary-stats` - See what accounts exist
2. **Then**: `list-servants` - View full hierarchy
3. **Then**: `add-secondary` - Create new servant
4. **Then**: `link-secondary` - Connect servant account
5. **Advanced**: `change-servant-master` - Reassign servants
6. **Cleanup**: `remove-secondary` - Remove accounts

---

## 🔐 ACCOUNT SECURITY

- ✅ Phone numbers validated before adding
- ✅ Duplicate phone numbers prevented
- ✅ Master existence verified
- ✅ Session data stored securely
- ✅ Configuration auto-backed up
- ✅ All changes logged to config file

---

## 📞 GETTING HELP

```terminal
# Show all commands
> help

# Show command examples in documentation
See: PHASE_9_SECONDARY_ACCOUNT_MANAGEMENT.md

# View this quick reference
See: PHASE_9_QUICK_REFERENCE.md
```

---

**Phase 9 Implementation**: ✅ COMPLETE  
**Production Ready**: ✅ YES  
**Next Phase**: Automatic Failover & Load Balancing  

*For detailed documentation, see PHASE_9_SECONDARY_ACCOUNT_MANAGEMENT.md*
