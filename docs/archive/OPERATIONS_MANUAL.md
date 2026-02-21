# 📖 OPERATIONS MANUAL - LIVE BOT MANAGEMENT

**Bot Status**: ✅ LIVE & RUNNING  
**Date**: February 10, 2026  
**Version**: 1.0 Production Ready  

---

## ⚡ QUICK COMMANDS

### Check Bot Status
```powershell
# See if bot is running
Get-Process node | Measure-Object

# Should show: 14+ node processes
```

### Restart the Bot
```powershell
# Kill all node processes
taskkill /IM node.exe /F

# Start fresh
cd "c:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda"
npm run dev:24-7
```

### Check Session State
```powershell
# View current session
type session-state.json | ConvertFrom-Json | ConvertTo-Json
```

### View Recent Logs
```powershell
# List log files
ls logs/*.log -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Desc
```

---

## 🔄 DAILY OPERATIONS

### Morning Checklist
- [ ] Verify node processes running: `Get-Process node | Measure-Object`
- [ ] Check bot didn't crash overnight
- [ ] Verify sessions were persisted: `type session-state.json`
- [ ] Monitor health for any issues

### During Day
- [ ] Bot runs automatically 24/7
- [ ] Health checks every 5 minutes
- [ ] Keep-alive heartbeats every 30 seconds
- [ ] No manual intervention needed

### Evening Check
- [ ] Verify uptime stable
- [ ] No error spikes
- [ ] Sessions can persist overnight
- [ ] Ready for next day

---

## 🛠️ COMMON TASKS

### Task 1: Monitor Bot Health
**What**: Check if bot is healthy and running
**How**:
```powershell
# See running processes
Get-Process node | Select-Object Id, Name, StartTime | Format-Table

# Should show multiple node processes from today
```

### Task 2: Restart Bot
**What**: Cleanly restart the bot
**How**:
```powershell
# Option A: Kill and restart
taskkill /IM node.exe /F
cd "c:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda"
npm run dev:24-7

# Option B: Just restart (nodemon will handle)
# Modify any file, nodemon auto-restarts
```

### Task 3: View Session Data
**What**: Check what accounts are linked
**How**:
```powershell
# View session file
Get-Content session-state.json | ConvertFrom-Json | ForEach-Object {
    Write-Host "Session Updated: $($_.timestamp)"
    Write-Host "Accounts: $($_.accounts.Count)"
}
```

### Task 4: Check for Errors
**What**: See if there are any critical errors
**How**:
```powershell
# Check recent logs
ls logs/*.log -ErrorAction SilentlyContinue | Select-Object -First 3 | 
  ForEach-Object { Write-Host "=== $($_.Name) ==="; Get-Content $_.FullName -Tail 20 }
```

---

## ⚠️ TROUBLESHOOTING

### Problem: Bot Not Responding
**Symptoms**: 
- No new messages processed
- Health checks stopped
- Processes still running but unresponsive

**Solution**:
```powershell
# Kill and restart
taskkill /IM node.exe /F
npm run dev:24-7
```

### Problem: Memory Growing
**Symptoms**:
- Memory usage keeps increasing
- Performance degradation over time

**Solution**:
```powershell
# Restart cleanly
taskkill /IM node.exe /F
npm run dev:24-7
```

### Problem: No Process Output
**Symptoms**:
- Bot running but terminal silent
- Can't see health checks

**Solution**:
```powershell
# Run in foreground to see output
npm run dev:24-7
# Will show all logs and health checks
```

### Problem: Sessions Lost
**Symptoms**:
- All accounts disconnected after restart
- QR code linking needed again

**Solution**:
```powershell
# Check session file exists
Get-Content session-state.json

# If empty, accounts need re-linking
# Bot will show QR codes for each account
```

---

## 🔍 MONITORING BEST PRACTICES

### What to Monitor Daily
1. **Process Count**: Should have 10-15 node processes
2. **Memory Usage**: Should be stable (not growing constantly)
3. **Uptime**: Should show recent start time (or older if stable)
4. **Error Logs**: Should be minimal or zero

### Commands for Monitoring
```powershell
# Quick health check (run daily)
$procs = Get-Process node
Write-Host "Processes: $($procs.Count)"
Write-Host "Memory: $('{0:N0}' -f ($procs | Measure-Object -Property WorkingSet -Sum).Sum / 1MB) MB"
Write-Host "Command: Get-Content session-state.json | ConvertFrom-Json"
```

---

## 🎯 DEPLOYMENT RULES

### DO ✅
- ✅ Let bot run continuously 24/7
- ✅ Restart if unresponsive or after updates
- ✅ Monitor process count and memory
- ✅ Keep terminal window open
- ✅ Check logs for errors daily

### DON'T ❌
- ❌ Manually interrupt bot (use `quit` command instead)
- ❌ Close terminal without checking bot status
- ❌ Run multiple `npm run dev:24-7` commands
- ❌ Ignore persistent error patterns
- ❌ Make code changes without reviewing

---

## 📊 EXPECTED BEHAVIOR

### On Startup
```
[nodemon] 3.1.11
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): index.js code\**\*.js .env

✅ SessionKeepAliveManager initialized
✅ Health monitor is active
📊 Terminal dashboard ready
```

### During Operation
- Quiet most of the time (no output)
- Every 5 minutes: Health check summary
- Every 30 seconds: Keep-alive heartbeat (silent)
- On errors: Error message appears

### Expected Memory
- Initial: ~150-200 MB
- Stable: ~250-350 MB
- Never should exceed: 800 MB

---

## 🚨 EMERGENCY PROCEDURES

### If Bot Crashes Repeatedly
```powershell
# 1. Check logs for error pattern
ls logs/*.log | Select-Object -First 1 | ForEach-Object { Get-Content $_.FullName -Tail 50 }

# 2. Check if it's a code issue
# Review recent changes in index.js or main files

# 3. Force clean restart
taskkill /IM node.exe /F
rm -r node_modules
npm install
npm run dev:24-7
```

### If All Accounts Disconnected
```powershell
# 1. Check session file
Get-Content session-state.json

# 2. If empty, re-link accounts via QR code
# Bot will automatically prompt for QR codes

# 3. Wait for all accounts to link
# Keep terminal open and visible
```

### If High Memory Usage
```powershell
# 1. Check what's using memory
Get-Process node | Select-Object -First 1 | ForEach-Object {
    $_.WorkingSet / 1MB
}

# 2. If > 500MB, restart
taskkill /IM node.exe /F
npm run dev:24-7
```

---

## 🎓 UNDERSTANDING THE BOT

### How It Works
1. **Startup**: nodemon launches Node.js process
2. **Initialization**: Load all managers and accounts
3. **Session Restore**: Auto-connect to previously linked accounts
4. **Health Monitor**: Checks every 5 minutes
5. **Keep-Alive**: Sends heartbeat every 30 seconds
6. **Auto-Restart**: On crash, nodemon restarts within 3 seconds

### What Each Component Does
- **SessionKeepAliveManager**: Sends heartbeats to prevent timeout
- **AccountHealthMonitor**: Checks account health every 5 minutes
- **DeviceRecoveryManager**: Auto-reconnects lost devices
- **Nodemon**: Auto-restarts on file changes or crashes
- **TerminalHealthDashboard**: Provides interactive status commands

---

## 📝 MAINTENANCE SCHEDULE

### Daily
- Check process count: `Get-Process node | Measure-Object`
- Check memory usage: `Get-Process node | Measure-Object -Property WorkingSet -Sum`
- Review error logs: `ls logs/*.log | Select-Object -First 1 | Get-Content -Tail 50`

### Weekly
- Review uptime trends
- Check for performance degradation
- Verify all accounts still connected
- Test message handling

### Monthly
- Full system review
- Performance optimization check
- Documentation updates
- Backup session state

---

## ✅ SIGN-OFF CHECKLIST

When everything is working:
- [ ] Bot process running (14+ node processes)
- [ ] No critical errors in logs
- [ ] Memory usage stable (< 400 MB)
- [ ] Session state initialized
- [ ] Health checks running (every 5 min)
- [ ] Keep-alive active (every 30 sec)
- [ ] Auto-restart enabled via nodemon
- [ ] Terminal window open and stable

**If all checked**: Deployment is successful! ✅

---

## 🎯 NEXT STEPS

1. **Now**: Leave bot running 24/7
2. **Verify**: Check status daily with quick health check
3. **Monitor**: Watch for patterns in logs
4. **Maintain**: Restart if needed (weekly or after code changes)
5. **Scale**: Add more accounts as needed

---

**Operations Manual v1.0**  
**Effective**: February 10, 2026  
**Status**: ACTIVE & PRODUCTION  

### **🚀 Bot is operational. Follow this manual for daily management.** 🚀
