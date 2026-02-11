# 🔧 ENVIRONMENT SETUP & TROUBLESHOOTING

**Problem**: npm/node commands failing  
**Solution**: Install/Fix Node.js Environment

---

## ⚡ QUICK FIX - Option 1: Install Node.js (If Not Installed)

### Step 1: Download Node.js
Go to: https://nodejs.org/

**Download Version 18 LTS** (Long Term Support) - recommended for production

### Step 2: Run Installer
- Double-click the downloaded `.msi` file
- Follow wizard (next → next → next)
- **Important**: Check "Add to PATH" option
- Click "Install"
- Accept admin prompts if asked

### Step 3: Restart Terminal/Computer
Close all PowerShell/terminal windows and reopen them

### Step 4: Verify Installation
Open PowerShell and type:
```powershell
node -v
npm -v
```

**Should show**: 
```
v18.x.x
9.x.x
```

If you see version numbers → **Node.js is installed!** ✅

---

## ⚡ QUICK FIX - Option 2: Node.js Already Installed But Not in PATH

### Step 1: Find Node.js Installation
```powershell
# Check if node exists elsewhere
Get-Command node -ErrorAction SilentlyContinue
```

### Step 2: Add to PATH Manually
If Node.js is installed but not in PATH:

1. Open: **Environment Variables**
   - Windows Key → Type "environment"
   - Click "Edit the system environment variables"

2. Click "Environment Variables" button

3. Under "System variables", find "Path"

4. Click "Edit"

5. Click "New" and add:
   ```
   C:\Program Files\nodejs
   ```

6. Click "OK" → "OK" → "OK"

7. Restart PowerShell

8. Test:
   ```powershell
   node -v
   npm -v
   ```

---

## ✅ Once Node.js is Working

### Step 1: Navigate to Project
```powershell
cd "c:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda"
```

### Step 2: Install Dependencies (First Time Only)
```powershell
npm install
```

**This reads `package.json` and installs all packages to `node_modules/`**

### Step 3: Start the Bot
```powershell
npm run dev:24-7
```

**Wait for**: `INITIALIZATION COMPLETE` message (takes 20-30 seconds)

### Step 4: Test Dashboard
While bot is running, type:
```
dashboard
```

You should see your health dashboard!

---

## 🆘 Troubleshooting

### If "npm install" fails:
```powershell
# Try clearing npm cache
npm cache clean --force

# Then try install again
npm install
```

### If "npm run dev:24-7" fails:
```powershell
# Check if dependencies are installed
ls node_modules

# If empty, run:
npm install

# Then try:
npm run dev:24-7
```

### If still getting errors:
```powershell
# Delete node_modules and package-lock.json
rm -r node_modules
rm package-lock.json

# Reinstall fresh
npm install

# Run bot
npm run dev:24-7
```

---

## 📋 Installation Checklist

- [ ] Downloaded Node.js v18 LTS from nodejs.org
- [ ] Ran installer with "Add to PATH" checked
- [ ] Restarted terminal/computer
- [ ] Verified: `node -v` shows version
- [ ] Verified: `npm -v` shows version
- [ ] Navigated to project folder
- [ ] Ran: `npm install`
- [ ] Ran: `npm run dev:24-7`
- [ ] Saw "INITIALIZATION COMPLETE"
- [ ] Typed: `dashboard`
- [ ] Saw health dashboard ✅

---

## 🚀 Expected Output When Running

```powershell
PS C:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda> npm run dev:24-7

╔═══════════════════════════════════════════════════════════════╗
║       🤖 LINDA - 24/7 WhatsApp Bot Service                  ║
║            PRODUCTION MODE ENABLED                          ║
║        Sessions: Persistent | Features: All Enabled         ║
╚═══════════════════════════════════════════════════════════════╝

[15:45:32] ℹ️  Initialization Attempt: 1/3
[15:45:33] ✅ SessionKeepAliveManager initialized
[15:45:34] ✅ Account bootstrap manager ready
[15:45:45] ✅ Account health monitoring active (5-minute intervals)
[15:45:45] 📊 Terminal dashboard ready - Press Ctrl+D or 'dashboard' to view health status
[15:45:45]    Available commands: 'dashboard' | 'health' | 'relink' | 'status' | 'quit'

🟢 READY - +971xxxxxxxxxx is online
```

Then type:
```
dashboard
```

And see your full health dashboard!

---

## 💻 Full Setup Command (Copy & Paste)

Once Node.js is installed, copy this entire block and paste into PowerShell:

```powershell
cd "c:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda"
npm install
npm run dev:24-7
```

Then wait for completion and type:
```
dashboard
```

---

## ✅ Success Indicators

When working correctly, you should:
- ✅ See no red errors in console
- ✅ See "INITIALIZATION COMPLETE" message
- ✅ Bot is listening for commands
- ✅ `dashboard` command shows account status
- ✅ `status` command works
- ✅ Can type `relink` to fix accounts

---

## 📞 If Still Having Issues

1. **Check Node.js version**
   ```powershell
   node -v
   ```
   Should show v18+

2. **Check npm packages installed**
   ```powershell
   ls node_modules | wc -l
   ```
   Should show 50+ packages

3. **Check logs for errors**
   ```powershell
   npm run dev:24-7 2>&1 | Tee-Object -FilePath log.txt
   ```
   This saves output to `log.txt` for review

4. **Try fresh install**
   ```powershell
   rm -r node_modules, package-lock.json
   npm install
   npm run dev:24-7
   ```

---

## 🎯 YOUR IMMEDIATE ACTION

1. **Install Node.js** → https://nodejs.org/ (v18 LTS)
2. **Restart terminal**
3. **Run this command:**
   ```powershell
   cd "c:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda" && npm install && npm run dev:24-7
   ```
4. **Wait for "INITIALIZATION COMPLETE"**
5. **Type:** `dashboard`
6. **See your health dashboard!** ✅

---

**That's it! Once Node.js is set up, everything works.** 🚀

---

**Date**: February 9, 2026  
**Purpose**: Get your environment working so you can use the Terminal Health Dashboard  
**Next Step**: Install Node.js, then run the bot
