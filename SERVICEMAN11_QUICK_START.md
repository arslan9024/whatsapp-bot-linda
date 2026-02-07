# ⚡ SERVICEMAN11 QUICK START GUIDE

**Date:** February 8, 2026  
**Objective:** Set up serviceman11 account with Editor access to Akoya organized sheet

---

## 🎯 THE MISSION (5 Simple Steps)

```
1. Create new sheet in Google Sheets
2. Get your new sheet ID 
3. Download serviceman11 keys.json from Google Cloud
4. Run setup script
5. Test permissions and you're done!
```

---

## 🚀 QUICK START (Copy & Paste Commands)

### Step 1️⃣ : Get Your New Sheet ID

1. Go to: https://sheets.google.com
2. Create a NEW blank sheet
3. Name it: `Akoya-Oxygen-2023-Organized`
4. Copy the ID from URL:
   ```
   https://docs.google.com/spreadsheets/d/COPY_THIS_PART/edit
   ```

**Your Sheet ID**: `_____________________________` (save this!)

---

### Step 2️⃣ : Download serviceman11 Keys

1. Go to: https://console.cloud.google.com
2. Select project: `heroic-artifact-414519`
3. Left menu → **IAM & Admin** → **Service Accounts**
4. Find: `serviceman11@heroic-artifact-414519.iam.gserviceaccount.com`
5. Click it → **Keys** tab → **Add Key** → **Create new key**
6. Select: **JSON** format
7. Click: **Create** (auto-downloads)

**Downloaded file**: `keys.json` in your Downloads folder

---

### Step 3️⃣ : Run Setup Script

```powershell
# Windows PowerShell
cd C:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda

node setup-serviceman11.js "C:\Users\HP\Downloads\keys.json" "YOUR_SHEET_ID_HERE"
```

**Replace**: `YOUR_SHEET_ID_HERE` with the sheet ID from Step 1

---

### Step 4️⃣ : Auto-Share the Sheet

```powershell
node share-sheet-with-serviceman11.js "YOUR_SHEET_ID_HERE"
```

---

### Step 5️⃣ : Test Permissions

```powershell
node test-serviceman11-permissions.js "YOUR_SHEET_ID_HERE"
```

**Expected output**: ✅ ALL TESTS PASSED!

---

## 📋 WHAT EACH SCRIPT DOES

| Script | Purpose | When to Run |
|--------|---------|-----------|
| `setup-serviceman11.js` | Creates directories, copies keys, updates config | First |
| `share-sheet-with-serviceman11.js` | Shares sheet with serviceman11 via API | Second |
| `test-serviceman11-permissions.js` | Verifies read/write/create access | After sharing |

---

## 📁 FILES CREATED

After running the setup:

```
✅ code/Integration/Google/accounts/serviceman11/keys.json
✅ Updated: code/Integration/Google/accounts/accounts.config.json
✅ Generated: test-serviceman11-permissions.js
✅ Generated: share-sheet-with-serviceman11.js
✅ Generated: setup-serviceman11.js
```

---

## ✅ HOW TO KNOW IT WORKED

After all 5 steps:

```
✅ Setup script ran without errors
✅ Share script showed "Shared successfully"
✅ Test script showed "ALL TESTS PASSED"
✅ New sheet has 3 tabs: Data Viewer, Organized Data, Metadata
✅ serviceman11 appears in Google Sheet share settings
```

---

## 🔍 TROUBLESHOOTING

### ❌ "Sheet ID is incorrect"
- Check you copied the full ID from the URL
- Make sure it's the NEW sheet, not the old one

### ❌ "Permission denied"
- Wait 2-3 minutes for Google to update permissions
- Run test script again
- Check Google Sheet's Share settings manually

### ❌ "Can't find keys.json"
- Make sure you downloaded it from Google Cloud Console
- Check the path is correct (e.g., C:\Users\HP\Downloads\keys.json)

### ❌ "accounts.config.json not found"
- Create it first from the setup guide
- Or copy the template from SERVICEMAN11_ACCOUNT_SETUP_GUIDE.md

---

## 🔗 NEED MORE DETAILS?

Read the **full guide**: `SERVICEMAN11_ACCOUNT_SETUP_GUIDE.md`

Read the **integration guide**: `ADVANCED_SHEET_ORGANIZATION_GUIDE.md`

---

## 📞 QUICK REFERENCE

**serviceman11 Email**: 
```
serviceman11@heroic-artifact-414519.iam.gserviceaccount.com
```

**Original Akoya Sheet**:
```
ID: 1gV4-hSAhDyWsivajBb2E2DSs25CMbqhc-6oufP1ZX04
Name: Akoya-Oxygen-2023-Arslan-only
```

**New Organized Sheet**:
```
Name: Akoya-Oxygen-2023-Organized
ID: [YOUR_NEW_SHEET_ID]
```

**Required Scopes**:
```
- https://www.googleapis.com/auth/spreadsheets (read/write)
- https://www.googleapis.com/auth/drive (access)
```

---

## 🎯 AFTER SETUP - USING serviceman11

In your bot code:

```javascript
// Import the service manager
import { GoogleServiceManager } from './code/Integration/Google/GoogleServiceManager.js';

// Initialize
const googleManager = new GoogleServiceManager();
await googleManager.initialize();

// Switch to serviceman11
await googleManager.switchAccount('serviceman11');

// Now all operations use serviceman11's permissions
const sheets = googleManager.sheetsService;

// Write to organized sheet
await sheets.appendRows('YOUR_NEW_SHEET_ID', 'Organized Data!A1', [
  ['P00001', 'Property Name', 'Location'],
  ['P00002', 'Another Property', 'Location'],
]);

// Create a new tab
await sheets.addSheet('YOUR_NEW_SHEET_ID', 'Analytics');
```

---

## 📊 STATUS CHECK

Run this anytime to verify serviceman11 is set up:

```powershell
# Check if directory exists
Test-Path "code\Integration\Google\accounts\serviceman11\keys.json"

# Check if in config
Select-String -Path "code\Integration\Google\accounts\accounts.config.json" -Pattern "serviceman11"

# Run permission test
node test-serviceman11-permissions.js "YOUR_SHEET_ID"
```

---

**Generated:** February 8, 2026  
**Status:** Ready to implement ✅  
**Estimated time:** 10-15 minutes
