# 🚀 QUICK START - WhatsApp Bot Linda v2.0

**Version:** 2.0 - Production Ready  
**Status:** ✅ All Systems Operational  
**Date:** February 19, 2026  

---

## ⚡ START THE BOT IN 10 SECONDS

```bash
npm start
```

That's it! 🎉

---

## 📱 WHAT YOU GET

### Auto-Restore Sessions ✅
- Server restarts → All accounts come back online automatically
- No manual re-linking needed
- Zero downtime

### GorahaBot Integration ✅
- Type `goraha` → See total contacts + Google status
- Type `goraha verify` → Force fresh API call
- Automatic contact tracking

### Full Dashboard ✅
- All accounts showing live status
- Auto-restore on startup
- Real-time health monitoring

---

## 🎮 KEY COMMANDS

```
DASHBOARD:
status / help       → Full dashboard & help
health <+phone>     → Account health check
accounts            → List all accounts

GORAHA BOT:
goraha              → Get contact stats
goraha verify       → Force fresh check

DEVICE MANAGEMENT:
link master         → Link first account
relink <+phone>     → Re-link account
```

---

## 🔧 WHAT'S CONFIGURED

✅ **GorahaBot Google Credentials:**
- Project: white-caves-fb-486818
- Service Account: gorahabot@white-caves-fb-486818.iam.gserviceaccount.com
- Status: Fresh key, properly encoded in .env

✅ **Auto-Restore System:**
- Saves session state on shutdown
- Restores all accounts on startup
- Shows ONLINE in dashboard immediately

✅ **Dashboard Commands:**
- GorahaBot contact tracking
- Google account validation
- Per-account health checks
- Live status monitoring

---

## 📊 TYPICAL STARTUP SEQUENCE

```
npm start

↓ (Loading...)

🤖 BOT STATUS
├─ WhatsApp: Initialized
├─ Sessions: Restoring (N accounts found)
├─ Dashboard: Online
└─ Ready to accept commands

▶ Linda Bot > (Ready for input)
```

---

## ✨ TRY THESE NOW

1. **Start:** `npm start`
2. **Show Dashboard:** Type `status`
3. **List Accounts:** Type `accounts`
4. **Check GorahaBot:** Type `goraha`
5. **Get Help:** Type `help`

---

## 🎯 EXPECTED OUTPUT

When you type `goraha`:
```
📱 GorahaBot Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Contacts: [your contact count]
D2 Security: [filtered count]
Last Updated: [timestamp]
Status: ✅ Working
```

---

## ⚠️ IF SOMETHING'S WRONG

**Bot won't start?**
```bash
# Check errors
npm start 2>&1

# Clean install
rm -r node_modules
npm install
npm start
```

**GorahaBot says "unavailable"?**
```
This is normal if:
- Google Contacts API not enabled on project
- Network connectivity issues

The bot still works! Just no contact stats.
All other features are fully operational.
```

**Can't restart accounts?**
```bash
# Clear sessions
rm -r sessions/

# Restart
npm start

# Re-link manually with: link master
```

---

## 🔐 CREDENTIALS INFO

✅ Your credentials are:
- Stored in `.env` (not in git)
- Base64 encoded for security
- Validated on startup
- Ready to use

Location: `.env` line ~40-55

---

## 📚 MORE HELP

```bash
# See all commands
type 'help' in dashboard

# Test credentials
node test-goraha-credentials.js

# View full documentation
cat PHASE_28_GORAHA_CREDENTIALS_COMPLETE.md
```

---

## 🎉 YOU'RE READY!

Your bot has:
- ✅ Fresh Google credentials
- ✅ Auto-restore on restart
- ✅ GorahaBot integration
- ✅ Full dashboard commands
- ✅ Production-ready security

**Just run:** `npm start`

---

**Questions?** Check the documentation files or run the test scripts!

Happy botting! 🚀
