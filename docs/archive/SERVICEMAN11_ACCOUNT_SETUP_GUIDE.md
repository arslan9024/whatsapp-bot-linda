# 🔧 Setup serviceman11 Account for Akoya Organized Sheet

**Date:** February 8, 2026  
**Purpose:** Grant serviceman11 Editor access to the new organized Akoya sheet  
**Status:** Ready to implement

---

## 📋 OVERVIEW

The service account `serviceman11@heroic-artifact-414519.iam.gserviceaccount.com` needs to be set up with Editor access to:
- Read the original Akoya-Oxygen-2023-Arslan-only sheet
- Write to the new Akoya-Oxygen-2023-Organized sheet
- Create and manage tabs in the organized sheet

---

## ✅ STEP 1: Find Your New Sheet ID

If you haven't created the new sheet yet:

1. **Go to Google Sheets**: https://sheets.google.com
2. **Create a new blank sheet**
3. **Name it**: `Akoya-Oxygen-2023-Organized`
4. **Copy your Sheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[YOUR_SHEET_ID_HERE]/edit
   ```
   
Save this Sheet ID - you'll need it below!

---

## 🔐 STEP 2: Share with serviceman11 Account

### Option A: Using Google Drive Web UI (Recommended)

1. **Open your new sheet** in Google Drive
2. Click the **blue "Share" button** (top right)
3. In the sharing dialog:
   - Paste email: `serviceman11@heroic-artifact-414519.iam.gserviceaccount.com`
   - Select role: **"Editor"** (NOT Viewer)
   - Enable: **"Notify people"** (uncheck if you don't want email)
4. Click **"Share"**
5. Wait for confirmation (usually instant)

### Option B: Using Drive API Script

If you prefer automation, use this script:

```javascript
const { google } = require('googleapis');
const fs = require('fs');

async function shareSheet() {
  const credentials = JSON.parse(
    fs.readFileSync('./code/Integration/Google/keys.json', 'utf8')
  );
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  
  const drive = google.drive({ version: 'v3', auth });
  
  const SHEET_ID = 'YOUR_SHEET_ID_HERE';
  const SERVICE_ACCOUNT_EMAIL = 'serviceman11@heroic-artifact-414519.iam.gserviceaccount.com';
  
  try {
    const result = await drive.permissions.create({
      fileId: SHEET_ID,
      requestBody: {
        role: 'editor',
        type: 'user',
        emailAddress: SERVICE_ACCOUNT_EMAIL,
      },
    });
    
    console.log('✅ Shared successfully!');
    console.log('Permission ID:', result.data.id);
  } catch (error) {
    console.error('❌ Error sharing:', error.message);
  }
}

shareSheet();
```

---

## 🔑 STEP 3: Get Credentials for serviceman11

You need the `keys.json` file for this service account.

### If you already have the keys.json:

Skip to Step 4.

### If you need to get/regenerate the keys:

1. **Go to Google Cloud Console**: https://console.cloud.google.com
2. **Select your project**: "heroic-artifact-414519"
3. **Navigate**: IAM & Admin → Service Accounts
4. **Find**: `serviceman11@heroic-artifact-414519.iam.gserviceaccount.com`
5. **Click on it** to open details
6. **Go to**: "Keys" tab (top menu)
7. **Click**: "Add Key" → "Create new key"
8. **Select**: "JSON"
9. **Click**: "Create"
   - This downloads the keys.json file automatically
10. **Move** the file to: `code/Integration/Google/accounts/serviceman11/keys.json`

---

## 📁 STEP 4: Create serviceman11 Account Directory

The directories should have this structure:

```
code/
├── Integration/
│   └── Google/
│       ├── accounts/
│       │   ├── power-agent/
│       │   │   └── keys.json          # Power Agent credentials
│       │   ├── goraha-properties/
│       │   │   └── keys.json          # Goraha credentials
│       │   ├── serviceman11/
│       │   │   └── keys.json          # NEW - serviceman11 credentials
│       │   └── accounts.config.json    # Account registry (update below)
│       └── keys.json                  # Main account keys
```

**To create the directory**:

```powershell
# Windows PowerShell
New-Item -Path "code\Integration\Google\accounts\serviceman11" -ItemType Directory -Force
```

**Then move your downloaded keys.json** to that directory.

---

## 🔧 STEP 5: Update accounts.config.json

Add serviceman11 to the accounts configuration:

**File**: `code/Integration/Google/accounts/accounts.config.json`

Add this new account to the "accounts" array:

```json
{
  "id": "serviceman11",
  "name": "serviceman11",
  "description": "Service account for organized Akoya sheet - Editor access",
  "type": "service-account",
  "credentialsPath": "./code/Integration/Google/accounts/serviceman11/keys.json",
  "scopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
  ],
  "status": "active",
  "permissions": {
    "sheets": "editor",
    "drive": "editor"
  },
  "sheetAccess": {
    "original_sheet_id": "1gV4-hSAhDyWsivajBb2E2DSs25CMbqhc-6oufP1ZX04",
    "original_sheet_name": "Akoya-Oxygen-2023-Arslan-only",
    "organized_sheet_id": "YOUR_NEW_SHEET_ID_HERE",
    "organized_sheet_name": "Akoya-Oxygen-2023-Organized"
  },
  "createdAt": "2026-02-08",
  "lastUsed": null
}
```

**Replace**: `YOUR_NEW_SHEET_ID_HERE` with your actual sheet ID from Step 1.

---

## 🧪 STEP 6: Test Permissions

Create a test script to verify permissions:

**File**: `test-serviceman11-permissions.js`

```javascript
import { google } from 'googleapis';
import fs from 'fs';

async function testServiceman11Permissions() {
  try {
    // Load credentials
    const credentials = JSON.parse(
      fs.readFileSync('./code/Integration/Google/accounts/serviceman11/keys.json', 'utf8')
    );
    
    // Initialize auth
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
      ],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });
    
    const SHEET_ID = 'YOUR_NEW_SHEET_ID_HERE';
    
    console.log('\n✅ Testing serviceman11 Account Permissions\n');
    console.log('Service Account:', credentials.client_email);
    
    // Test 1: Can read spreadsheet metadata
    console.log('\n📖 Test 1: Reading sheet metadata...');
    const sheetMetadata = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
    });
    console.log('✅ Can read sheet:', sheetMetadata.data.properties.title);
    console.log('   Sheets in workbook:', sheetMetadata.data.sheets.map(s => s.properties.title).join(', '));
    
    // Test 2: Can write to sheet
    console.log('\n✍️ Test 2: Writing test data...');
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'Data Viewer!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['✅ serviceman11 can write to this sheet - ' + new Date().toISOString()]],
      },
    });
    console.log('✅ Can write to sheet');
    
    // Test 3: Can create new sheet/tab
    console.log('\n➕ Test 3: Creating new tab...');
    const batchRequest = {
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: 'Test Tab ' + Date.now(),
              },
            },
          },
        ],
      },
    };
    const response = await sheets.spreadsheets.batchUpdate(batchRequest);
    console.log('✅ Can create tabs:', response.data.replies[0].addSheet.properties.title);
    
    // Test 4: Check Drive permissions
    console.log('\n🔐 Test 4: Checking Drive permissions...');
    const fileMetadata = await drive.files.get({
      fileId: SHEET_ID,
      fields: 'name, permissions',
    });
    console.log('✅ Can access from Drive:', fileMetadata.data.name);
    
    console.log('\n✅ ALL TESTS PASSED!\n');
    console.log('serviceman11 account is ready to use with:');
    console.log('  ✓ Read access to original sheet');
    console.log('  ✓ Write access to organized sheet');
    console.log('  ✓ Tab/sheet creation access');
    console.log('  ✓ Drive file access\n');
    
  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    console.error('Details:', error.details || error.stack);
  }
}

testServiceman11Permissions();
```

**Run it**:
```powershell
node test-serviceman11-permissions.js
```

---

## 🎯 STEP 7: Update Your Bot Configuration

Once serviceman11 is set up, you can use it in your bot:

**Example in your bot code**:

```javascript
import { GoogleServiceManager } from './code/Integration/Google/GoogleServiceManager.js';

// Initialize
const googleManager = new GoogleServiceManager();
await googleManager.initialize();

// Switch to serviceman11 account
await googleManager.switchAccount('serviceman11');

// Now all operations use serviceman11's permissions
const sheets = googleManager.sheetsService;

// Example: Write organized data
await sheets.appendRows('YOUR_NEW_SHEET_ID', 'Organized Data!A1', [
  ['P00001', 'Property Name', 'Location', '...other columns...'],
  ['P00002', 'Another Property', 'Location', '...other columns...'],
]);

// Example: Create a new tab
await sheets.addSheet('YOUR_NEW_SHEET_ID', 'Analytics');
```

---

## 📝 CHECKLIST

Before you start, make sure you have:

- [ ] New organized sheet created and named (**Akoya-Oxygen-2023-Organized**)
- [ ] Sheet ID copied from the URL
- [ ] serviceman11 email: `serviceman11@heroic-artifact-414519.iam.gserviceaccount.com`
- [ ] Editor access granted via Share button
- [ ] keys.json file downloaded from Google Cloud Console
- [ ] serviceman11 directory created: `code/Integration/Google/accounts/serviceman11/`
- [ ] keys.json moved to serviceman11 directory
- [ ] accounts.config.json updated with new account config
- [ ] Test script run and all tests passed

---

## 🚀 NEXT STEPS

Once serviceman11 is set up:

1. **Update EnhancedSheetOrganizer.js** to use serviceman11 account
2. **Run the orchestration script** to populate the organized sheet:
   ```powershell
   node organizeAndAnalyzeSheet.js
   ```
3. **Verify** the new sheet has all tabs and data
4. **Test** with the bot using serviceman11 for subsequent updates

---

## 🔗 RELATED FILES

- `code/Integration/Google/accounts/accounts.config.json` - Account registry
- `code/Integration/Google/GoogleServiceManager.js` - Service manager
- `code/Integration/Google/services/SheetsService.js` - Sheets API wrapper
- `ADVANCED_SHEET_ORGANIZATION_GUIDE.md` - Full organization guide
- `CREATE_AKOYA_SHEET_MANUAL_GUIDE.md` - Manual sheet creation steps

---

## ❓ TROUBLESHOOTING

### Permission Denied Error
**Problem**: "The user does not have the permission to access the file"

**Solution**:
1. Verify you shared the sheet with the EXACT email: `serviceman11@heroic-artifact-414519.iam.gserviceaccount.com`
2. Wait 2-3 minutes for Google to propagate the permissions
3. Check the Drive file directly - make sure serviceman11 is listed in Share settings

### Invalid Keys.json
**Problem**: "Invalid service account credentials"

**Solution**:
1. Re-download the keys.json from Google Cloud Console
2. Make sure it's the correct project: **heroic-artifact-414519**
3. Verify the service account exists and is enabled
4. Don't edit the JSON file - use it as-is from the download

### Can't Create New Tab
**Problem**: "Permission denied to modify sheet structure"

**Solution**:
1. Verify role is set to **"Editor"** (not Viewer or Commenter)
2. Re-share the sheet with broader permissions
3. Try the test script to see which exact operation fails

---

## 📞 SUPPORT

If you encounter issues:

1. Check the test script results for specific failed tests
2. Verify all Step 1-5 are completed
3. Review the error message in the test output
4. Check Google Cloud Console for service account status

**Generated:** February 8, 2026  
**Ready to implement** ✅
