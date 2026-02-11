# 🚀 GETTING STARTED - Terminal Health Dashboard

**Status**: Ready to Use  
**Date**: February 9, 2026

---

## ⚡ Quick Start (2 Minutes)

### Step 1: Start the Bot
```bash
npm run dev:24-7
```

**What you'll see:**
```
╔═══════════════════════════════════════════════════════════════╗
║       🤖 LINDA - 24/7 WhatsApp Bot Service                  ║
║            PRODUCTION MODE ENABLED                          ║
║        Sessions: Persistent | Features: All Enabled         ║
╚═══════════════════════════════════════════════════════════════╝

[15:45:32] ℹ️  Initialization Attempt: 1/3
[15:45:33] ✅ SessionKeepAliveManager initialized
...
[15:45:45] ✅ Account health monitoring active (5-minute intervals)
[15:45:45] 📊 Terminal dashboard ready - Press Ctrl+D or 'dashboard' to view health status
[15:45:45]    Available commands: 'dashboard' | 'health' | 'relink' | 'status' | 'quit'

🟢 READY - +971502039886 is online
```

### Step 2: Type a Command
While the bot is running, type in the terminal:

```
dashboard
```

### Step 3: See Your Health Status
```
╔═══════════════════════════════════════════════════════════════╗
║ LINDA BOT - COMPREHENSIVE HEALTH DASHBOARD                   ║
╠═══════════════════════════════════════════════════════════════╣
║ 🤖 SYSTEM STATUS                                              ║
║   Uptime: 98.5%                                               ║
║   Total Health Checks: 12                                     ║
║   Recovery Success Rate: 85%                                  ║
║ 📱 WHATSAPP ACCOUNTS (3 total)                                ║
║   Active: 2 | Inactive: 1 | Warning: 0                        ║
║   ✅ +971502039886 Uptime: 100%  Status: healthy              ║
║   ✅ +971234567890 Uptime: 99%   Status: healthy              ║
║   ❌ +971111111111 Uptime: 5%    Status: unhealthy            ║
║ 🔗 GOOGLE ACCOUNTS (2 total)                                  ║
║   Connected: 2 | Services: 6                                  ║
║   ✅ arslanpoweragent@gmail.com (3 services)                  ║
║   ✅ goraha.properties@gmail.com (3 services)                 ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 📋 Available Commands

Type any of these while bot is running:

| Command | See |
|---------|-----|
| `dashboard` | Full account & Google service status |
| `health` | Same as dashboard |
| `status` | Quick summary (counts & uptime) |
| `relink` | Re-link an inactive account |
| `quit` | Stop bot gracefully |

---

## 🔄 Testing Account Re-linking

### Scenario: Account shows ❌ Unhealthy

**Step 1: Type**
```
relink
```

**Step 2: Select Account**
System shows inactive accounts:
```
⚠️  INACTIVE ACCOUNTS DETECTED (1)
The following accounts need to be re-linked:
1. +971111111111 (Status: unhealthy, Attempts: 2)

Options:
1. Re-link an account
2. View detailed health report
3. Cancel

Choose option (1-3): 1
```

Type: `1`

**Step 3: Choose Account**
```
Which account to re-link?
1. +971111111111

Enter account number (or press Enter to cancel): 1
```

Type: `1`

**Step 4: Confirm**
```
════════════════════════════════════════════════════════════════
🔗 RE-LINKING REQUIRED: +971111111111
════════════════════════════════════════════════════════════════

Account +971111111111 is inactive.
A new QR code will be generated to re-link the device.

✅ Account reset. New QR code will be displayed on next bot restart.

To complete re-linking:
1. Restart the bot: npm run dev:24-7
2. Scan the new QR code with your WhatsApp device
3. Device will be linked and session restored

════════════════════════════════════════════════════════════════
```

**Step 5: Restart Bot**
```
quit
```
Then:
```
npm run dev:24-7
```

**Step 6: Scan QR Code**
New QR code appears for that account only. Scan with WhatsApp device.

**Result**: Account restored in < 5 minutes! ✅

---

## 🎯 What to Try First

### Test 1: View Dashboard
```bash
# Bot running
dashboard

# See all accounts and Google services
```

**Expected**: Full health display with account details

### Test 2: Check Quick Status
```bash
# Bot running
status

# See account counts
```

**Expected**: Brief summary showing active/inactive counts

### Test 3: View After Health Check
```bash
# Wait 5-10 minutes (first health check runs)
dashboard

# See health metrics updated
```

**Expected**: "Total Health Checks" increases

---

## 💡 Key Features

✨ **Real-Time Status**: See all accounts at a glance  
✨ **Google Integration**: Monitor service connections  
✨ **No Restart Needed**: Commands work while bot runs  
✨ **Interactive Re-linking**: Guided account recovery  
✨ **Uptime Tracking**: Per-account metrics  
✨ **Auto-Recovery**: 5-minute health checks  

---

## 🆘 Quick Troubleshooting

### Command Not Working?
- Ensure bot fully initialized (look for "INITIALIZATION COMPLETE")
- Terminal focus on bot process
- Check spelling: `dashboard`, `status`, `relink`, `quit`

### Account Still Inactive?
- Wait for next health check (~5 minutes)
- Or re-link again using `relink` command
- Verify WhatsApp device has internet

### Google Accounts Not Showing?
- That's okay - optional feature
- System still monitors WhatsApp accounts

---

## 📚 Full Documentation

For complete details:
- **TERMINAL_HEALTH_DASHBOARD_GUIDE.md** - Complete user guide
- **TERMINAL_HEALTH_DASHBOARD_DELIVERY.md** - Implementation details
- **TERMINAL_HEALTH_DASHBOARD_FINAL_SUMMARY.md** - Quick reference

---

## ✅ Ready to Go!

**Everything is set up and ready to use.**

```bash
# Start your bot now:
npm run dev:24-7

# Then type a command:
dashboard
```

Enjoy your professional-grade health monitoring! 🎉
