# ⚡ QUICK COMMANDS - DAILY BOT MANAGEMENT

**Keep this file handy for quick reference!**

---

## 🎯 ONE-LINERS

### Check if Bot is Running
```powershell
Get-Process node | Measure-Object
```
**Expected**: 10+ processes showing

### Restart Bot
```powershell
taskkill /IM node.exe /F ; cd "c:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda" ; npm run dev:24-7
```
**Expected**: Bot starts, shows initialization messages

### Check Memory Usage
```powershell
Get-Process node | Measure-Object -Property WorkingSet -Sum | Select-Object @{Name='Memory (MB)';Expression={$_.Sum / 1MB}}
```
**Expected**: ~250-350 MB is normal

### View Session State
```powershell
Get-Content session-state.json | ConvertFrom-Json
```
**Expected**: JSON with timestamp and accounts

### Check Bot Stability (Quick)
```powershell
$p=Get-Process node; "$($p.Count) processes | Uptime: $(((Get-Date) - $p[0].StartTime).ToString('hh\:mm\:ss')) | Memory: $('{0:N0}' -f ($p | Measure-Object -Property WorkingSet -Sum).Sum / 1MB) MB"
```
**Expected**: Shows process count, uptime, and memory

---

## 🚀 STARTUP COMMANDS

### Start Bot (Fresh)
```powershell
cd "c:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda"
npm start
```

### Start Bot (24/7 Mode with Auto-Restart)
```powershell
cd "c:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda"
npm run dev:24-7
```

### Start Bot (Development with Watch)
```powershell
cd "c:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda"
npm run dev
```

---

## 🛑 STOP COMMANDS

### Graceful Stop (From Interactive Terminal)
Type in terminal:
```
quit
```

### Force Stop All Node Processes
```powershell
taskkill /IM node.exe /F
```

### Stop Specific Process
```powershell
Stop-Process -Id 12345  # Replace 12345 with process ID
```

---

## 🔍 MONITORING COMMANDS

### See All Bot Processes
```powershell
Get-Process node | Format-Table ProcessName, Id, StartTime, WorkingSet
```

### Watch Bot Performance (Live)
```powershell
while ($true) { 
    Clear-Host
    $p = Get-Process node
    $mem = ($p | Measure-Object -Property WorkingSet -Sum).Sum / 1MB
    Write-Host "Bot Status: $(if($p.Count -gt 10){'✅ GOOD'}else{'⚠️ CHECK'})"
    Write-Host "Processes: $($p.Count)"
    Write-Host "Memory: $([math]::Round($mem, 0)) MB"
    Write-Host "Updated: $(Get-Date -Format 'HH:mm:ss')"
    Start-Sleep -Seconds 5
}
```

### Check Last Error Messages
```powershell
Get-ChildItem logs/*.log -ErrorAction SilentlyContinue | Select-Object -First 1 | ForEach-Object { Get-Content $_.FullName -Tail 50 }
```

---

## 🔧 MAINTENANCE COMMANDS

### Clean & Fresh Start
```powershell
# Clean up
rm -r node_modules
npm cache clean --force

# Reinstall
npm install

# Start
npm run dev:24-7
```

### Check npm Scripts
```powershell
npm run
```
**Shows**: All available npm scripts

### Verify Node Installation
```powershell
node --version
npm --version
```

### Check Project Structure
```powershell
ls -la code/ | Select-Object -First 20
```

---

## 📊 QUICK HEALTH CHECK

**Run this daily:**
```powershell
# Simple health check
($proc = Get-Process node) -and 
"✅ Processes: $($proc.Count)" -and
"✅ Memory: $([math]::Round(($proc | Measure-Object -Property WorkingSet -Sum).Sum / 1MB)) MB" -and
"✅ Uptime: $(((Get-Date) - $proc[0].StartTime).ToString('hh\:mm\:ss'))" -and
"✅ Status: HEALTHY"
```

---

## 📝 LOG VIEWING

### Last 50 Lines of Log
```powershell
Get-ChildItem logs/*.log -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Desc | Select-Object -First 1 | ForEach-Object { Get-Content $_.FullName -Tail 50 }
```

### Follow Live Logs (Like Unix `tail -f`)
```powershell
Get-Content logs/*.log -Wait -Tail 20
```

### Search Logs for Errors
```powershell
Get-ChildItem logs/*.log -ErrorAction SilentlyContinue | ForEach-Object { Select-String "ERROR|FATAL" $_ }
```

---

## 🔐 SESSION MANAGEMENT

### View Current Session
```powershell
gc session-state.json | ConvertFrom-Json | fl
```

### Clear Sessions (Fresh Start)
```powershell
rm sessions -Recurse -Force
mkdir sessions
```

### Backup Session State
```powershell
cp session-state.json "session-state.$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
```

---

## 🎯 TROUBLESHOOTING QUICK FIXES

### Bot Not Responding?
```powershell
# Force restart
taskkill /IM node.exe /F
cd "c:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda"
npm run dev:24-7
```

### High Memory Usage?
```powershell
# Check memory
Get-Process node | Measure-Object -Property WorkingSet -Sum

# If > 600MB, restart
taskkill /IM node.exe /F
npm run dev:24-7
```

### Accounts Disconnected?
```powershell
# Check session file
gc session-state.json

# If empty, restart to get QR codes
taskkill /IM node.exe /F
npm run dev:24-7

# Follow QR code prompts to re-link
```

---

## 📅 DAILY ROUTINE (5 Minutes)

**Morning:**
```powershell
# Check if running
Get-Process node | Measure-Object
# Should show 10+ processes

# Check memory
Get-Process node | Measure-Object -Property WorkingSet -Sum
# Should be ~250-350 MB
```

**During Day:**
- Let bot run (no action needed)
- Health checks run automatically every 5 minutes
- Keep-alive heartbeats every 30 seconds

**Evening:**
```powershell
# Verify still running
Get-Process node | Measure-Object
# Should still show 10+ processes
```

---

## 🎓 COMMAND CATEGORIES

### Most Used (Bookmark These!)
- `npm run dev:24-7` - Start bot
- `taskkill /IM node.exe /F` - Stop bot
- `Get-Process node | Measure-Object` - Check status

### Monitoring Commands
- Memory check
- Process count
- Error logs
- Session state

### Maintenance Commands
- Clean install
- Restart
- Backup sessions
- Clear logs

---

## ✨ POWER COMMANDS

### Complete Daily Check (Copy & Paste)
```powershell
$proc = Get-Process node
$mem = [math]::Round(($proc | Measure-Object -Property WorkingSet -Sum).Sum / 1MB)
$uptime = ((Get-Date) - $proc[0].StartTime).ToString('hh\:mm\:ss')
Write-Host "=== BOT HEALTH CHECK ===" -ForegroundColor Green
Write-Host "Status: ✅ RUNNING" -ForegroundColor Green
Write-Host "Processes: $($proc.Count)" -ForegroundColor Cyan
Write-Host "Memory: $mem MB" -ForegroundColor Cyan
Write-Host "Uptime: $uptime" -ForegroundColor Cyan
if ($mem -lt 500) { Write-Host "Memory Usage: ✅ OK" -ForegroundColor Green } else { Write-Host "Memory Usage: ⚠️ HIGH" -ForegroundColor Yellow }
```

### Quick Restart Alias (Add to PowerShell Profile)
```powershell
function Restart-Linda {
    Write-Host "Stopping bot..."
    taskkill /IM node.exe /F
    Start-Sleep -Seconds 2
    Write-Host "Starting bot..."
    cd "c:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda"
    npm run dev:24-7
}
```
Then just type: `Restart-Linda`

---

## 📍 File Locations

```powershell
# Main bot
c:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda\index.js

# Session state
c:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda\session-state.json

# Logs
c:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda\logs\

# Configurations
c:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda\.env
c:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda\package.json
```

---

## 🆘 HELP COMMANDS

### If Something Goes Wrong
1. Check status: `Get-Process node | Measure-Object`
2. Check memory: `Get-Process node | Measure-Object -Property WorkingSet -Sum`
3. Stop bot: `taskkill /IM node.exe /F`
4. Start bot: `npm run dev:24-7`
5. Check logs: Previous section above

### Need More Help?
- See: OPERATIONS_MANUAL.md
- See: BOT_LIVE_STATUS_DASHBOARD.md
- See: TROUBLESHOOTING guide in project root

---

## 🎯 REMEMBER

- ✅ Bot auto-restarts with nodemon
- ✅ Sessions persist automatically
- ✅ Health checks run every 5 minutes
- ✅ Keep-alive runs every 30 seconds
- ✅ No daily action needed (runs 24/7!)
- ✅ Just monitor weekly
- ✅ Restart monthly for maintenance

---

**Print This File & Keep Handy!** 📋

**Save as**: QUICK_COMMANDS_REFERENCE.txt  
**Use for**: Daily bot management  
**Update**: As needed  

---

### **🚀 These commands will handle 95% of daily operations!** 🚀
