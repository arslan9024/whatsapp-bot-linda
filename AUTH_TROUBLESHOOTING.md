📋 GOOGLE AUTHENTICATION TROUBLESHOOTING GUIDE
==============================================

## Problem
- Authentication Error: "invalid_grant: Invalid JWT Signature"
- This means the private key doesn't match Google Cloud records

## Root Causes (in order of likelihood)
1. ❌ The keys.json file is not from the correct Google Cloud project
2. ❌ The service account keys have been rotated (old keys no longer valid)
3. ❌ The service account was deleted and recreated
4. ❌ The keys.json encoding is corrupted during upload/storage

## Solution Steps

### Step 1: Verify the Service Account in Google Cloud Console
1. Go to: https://console.cloud.google.com/
2. Navigate to: IAM & Admin > Service Accounts
3. Find: serviceman11@heroic-artifact-414519.iam.gserviceaccount.com
4. Check if it exists and is ACTIVE (not disabled)
5. If NOT found or disabled → ISSUE FOUND

### Step 2: Check Keys in Google Cloud Console
1. Click on the service account (serviceman11@...)
2. Go to "KEYS" tab
3. You should see one or more private keys
4. Look for a key with ID: fc8e551af8380a2f189197f1db08aa954b25698d
   (from your current keys.json)
5. If NOT found → The keys were rotated/deleted

### Step 3: Generate FRESH Keys (if needed)
IF the key ID is NOT in Google Cloud Console:
1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Click on serviceman11@...
3. Go to KEYS tab
4. Click "ADD KEY" > "Create new key"
5. Choose "JSON" format
6. Download the new JSON file
7. Replace ./code/GoogleAPI/keys.json with the downloaded file
8. Run test again: node testGoogleAuth.js

### Step 4: Verify Sheet Permissions
After keys are fixed, verify these sheets are accessible:
- Original Sheet ID: 1wBX2zhUaBg082BUmGCvqCSPI6w8eDJFtxZAsH2LjiaY
- Organized Sheet ID: 1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk

For EACH sheet:
1. Open the sheet in Google Drive
2. Click "Share"
3. Ensure serviceman11@heroic-artifact-414519.iam.gserviceaccount.com has "Editor" access
4. If not there → Click "Add people or groups" and add serviceman11@... with Editor role

## Alternative: Manual Data Transfer (Workaround)

If you want to populate the organized sheet while fixing authentication:

### Option A: Copy-Paste in Google Sheets UI
1. Open original sheet: https://docs.google.com/spreadsheets/d/1wBX2zhUaBg082BUmGCvqCSPI6w8eDJFtxZAsH2LjiaY
2. Select all data (Ctrl+A)
3. Copy (Ctrl+C)
4. Open organized sheet: https://docs.google.com/spreadsheets/d/1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk
5. Paste in Sheet1 (Ctrl+V)
6. Run deduplication script afterward

### Option B: Use Your Browser Console
[Available upon request - uses Google Apps Script]

## Testing After Fix

Once you've regenerated keys.json:

```bash
# Test authentication
node testGoogleAuth.js

# If successful, run population
node populateAkoyaOrganzedSheetDirect.js
```

## Still Not Working?

Try these debug steps:
1. Check system time: `date` (should match Google Cloud time within ±5 minutes)
2. Clear npm cache: `npm cache clean --force`
3. Delete node_modules and reinstall: `rm -r node_modules && npm install`
4. Check if service account is in a different project

## Contact Info
For Google Cloud issues, check:
- Google Cloud Project ID: heroic-artifact-414519
- Service Account: serviceman11@heroic-artifact-414519.iam.gserviceaccount.com

---

⚠️  DO NOT share the keys.json file or private key with anyone!
