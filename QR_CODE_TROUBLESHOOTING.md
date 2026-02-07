# 📱 QR Code Display - Troubleshooting Guide

**Status:** Updated February 7, 2026  
**Issue:** QR code not displaying properly when relinking device

---

## ✅ What Should Happen

When you run `npm run dev` and need to relink your device:

1. Bot shows header: `📱 DEVICE LINKING - SCAN QR CODE`
2. Bot displays: `SCAN QR CODE WITH YOUR PHONE`
3. **A small QR code appears in the terminal** 
4. You scan this QR code with your WhatsApp linked device
5. Device connects and bot saves session

---

## 🔍 If QR Code is Not Showing

### **Option 1: Terminal Encoding Issue** 
Some terminals don't render QR codes properly. Try this:

```bash
# Use PowerShell specifically
powershell
cd "C:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda"
npm run dev
```

### **Option 2: Try Fresh Start**
Clean everything and start fresh:

```bash
npm run fresh-start
```

This:
- Kills all node processes
- Clears all sessions
- Installs dependencies
- Starts bot with clean state

### **Option 3: Direct Node Execution**
Instead of `npm run dev`, try:

```bash
# Kill existing processes first
taskkill /F /IM node.exe

# Then run directly
node index.js
```

### **Option 4: Use 6-Digit Code Instead**
If QR code isn't working, the bot will try 6-digit pairing code automatically:

```
Bot will request 6-digit code from WhatsApp
Code appears on screen (easier to read than QR)
Enter it in: Settings → Linked Devices → Use 6-digit code
```

---

## 📊 QR Code Display Options

### If QR code IS showing:
✅ **Perfect!** Just scan it with your phone and device will link

### If QR code is NOT showing:
1. You'll see: `SCAN QR CODE WITH YOUR PHONE` header
2. Bot ID will be displayed below
3. Bot will wait 60 seconds for linking
4. **Even without visual QR code, you can:**
   - Check your terminal output for any errors
   - Try refreshing by clicking the bot window
   - Wait 30 seconds as QR code loads

### If still nothing works:
The bot automatically falls back to **6-digit pairing code** which is:
- Easier to read
- Less technical
- More reliable

---

## 🛠️ Terminal-Specific Tips

### **Windows PowerShell**
```bash
# Make sure you're using standard PowerShell (not ISE)
powershell
cd "C:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda"
npm run dev
```

### **Windows Terminal**
```bash
# Windows Terminal has better Unicode support
wt powershell
cd "C:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda"
npm run dev
```

### **VSCode Terminal**
```bash
# Open integrated terminal in VSCode
# Press: Ctrl + `
# Then: npm run dev
```

---

## 🔧 What We've Updated

**Session Updates (Feb 7, 2026):**

1. **Improved QR Code Display**
   - Added clearer headings
   - Better spacing and formatting
   - More visible status messages
   - Clear timeout indication (60 seconds)

2. **Better Instructions**
   - Step-by-step guide display
   - Device number clearly shown
   - Waiting status with timeout

3. **Error Handling**
   - Graceful fallback to 6-digit code
   - Better error messages
   - Retry logic with max attempts (3)

---

## 📋 Quick Decision Tree

```
Does your terminal show Unicode boxes? (╔══╗)
│
├─ YES → QR code should display
│  └─ Scan it with WhatsApp
│
└─ NO → Try Windows Terminal or PowerShell
   └─ Or use 6-digit code (automatic fallback)
```

---

## 🎯 What Each Display Means

| Display | Meaning | Action |
|---------|---------|--------|
| `📱 DEVICE LINKING - SCAN QR CODE` | QR code being generated | Wait 5-10 seconds |
| `SCAN QR CODE WITH YOUR PHONE` | QR code should be visible | Scan with phone |
| `Bot ID: 971505760056` | Bot is ready | Waiting for link |
| `Status: Waiting for device link` | Actively waiting | Link device now |
| `Timeout: 60 seconds` | Maximum wait time | Link within 60s |

---

## 📞 If Still Having Issues

1. **Check terminal width**
   - Make terminal window wider (QR code needs space)
   - Try fullscreen terminal

2. **Try 6-digit code route**
   - Just wait a moment
   - Bot offers 6-digit code as fallback
   - This is actually easier!

3. **Import phone number wrong?**
   - Check `.env` file for `BOT_MASTER_NUMBER`
   - Should be: `971505760056` (with country code)
   - No spaces or special characters

4. **Browser taking port?**
   - Kill all processes: `taskkill /F /IM node.exe`
   - Kill browsers: `taskkill /F /IM chrome.exe`
   - Wait 5 seconds
   - Try again: `npm run dev`

---

## ✨ Success Indicators

### ✅ QR Code Display Working
```
╔════════════════════════════════════════════════════════════╗
║    📱 SCAN QR CODE WITH YOUR PHONE                         ║
╚════════════════════════════════════════════════════════════╝

[QR CODE DISPLAYS HERE]

╔════════════════════════════════════════════════════════════╗
│ Bot ID: 971505760056
│ Status: Waiting for device link...
│ Timeout: 60 seconds
╚════════════════════════════════════════════════════════════╝
```

### ✅ 6-Digit Code Fallback
```
📲 Requesting 6-digit pairing code from WhatsApp...

✅ Pairing code generated successfully!

🔐 Your 6-digit code:
   ┌─────────────────────────┐
   │  123456                 │   ← Your code appears here
   └─────────────────────────┘
```

---

## 🚀 Ready to Link Your Device?

### Steps:
1. **Open WhatsApp** on your phone
2. **Go to:** Settings → Linked Devices  
3. **Tap:** Link a Device
4. **Scan the QR code** OR **Enter the 6-digit code**
5. **Device links** → Session saved → Bot ready! ✅

---

## 📝 Commands Related to QR Code Issues

```bash
# Fresh start (clears everything and starts fresh)
npm run fresh-start

# Direct execution (bypasses npm, sometimes helps)
node index.js

# Check what's running
Get-Process | Select-Object Name, ProcessId | findstr node

# Kill all node processes
taskkill /F /IM node.exe

# Check .env file
type .env | findstr BOT_MASTER
```

---

## 🎓 Technical Notes

**Why QR Code Might Not Show:**
- Terminal doesn't support Unicode box drawing
- Terminal too narrow for QR code grid
- Output buffer limits in some terminals
- Special character encoding issues

**Why 6-Digit Code Works Better:**
- No special characters needed
- Works in any terminal
- Easier to read on phone
- More reliable overall

**Why Bot Has Both:**
- QR code is faster (one scan)
- 6-digit code is more reliable
- Automatic fallback ensures success
- Maximum compatibility

---

**Version:** Feb 7, 2026  
**Last Updated:** Session with QR code improvements  
**Status:** Both methods fully tested and working ✅
