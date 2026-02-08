#!/usr/bin/env node

/**
 * QUICK GOOGLE CLOUD VERIFICATION CHECKLIST
 * 
 * This script generates URLs and instructions for verifying your Google Cloud setup
 */

const projectId = 'heroic-artifact-414519';
const serviceAccountEmail = 'serviceman11@heroic-artifact-414519.iam.gserviceaccount.com';
const currentKeyId = 'fc8e551af8380a2f189197f1db08aa954b25698d';

const sheetsIds = {
  original: '1wBX2zhUaBg082BUmGCvqCSPI6w8eDJFtxZAsH2LjiaY',
  organized: '1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk'
};

console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║         GOOGLE CLOUD VERIFICATION CHECKLIST                             ║
║  Use this to verify your service account and permissions               ║
╚════════════════════════════════════════════════════════════════════════╝

📋 YOUR ACCOUNT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Project ID: ${projectId}
  Service Account: ${serviceAccountEmail}
  Key ID in keys.json: ${currentKeyId}

🔗 STEP 1: Verify Service Account Exists
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
  
  Look for: ${serviceAccountEmail}
  
  ✓ EXPECTED: Service account should be listed and ENABLED
  ✗ PROBLEM: If NOT listed or marked as DISABLED → This is the issue!

🔑 STEP 2: Check Current Keys
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. Click on: ${serviceAccountEmail}
  2. Go to: KEYS tab
  3. Look for Key ID: ${currentKeyId}
  
  ✓ EXPECTED: Key should be listed with "JSON" type
  ✗ PROBLEM: If NOT listed → The keys were rotated and this copy is invalid!
  
  ACTION: Generate new keys:
  - Click "ADD KEY" > "Create new key"
  - Choose "JSON"
  - Replace ./code/GoogleAPI/keys.json with the new file

📄 STEP 3: Check Sheet Permissions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  Original Sheet:
  https://docs.google.com/spreadsheets/d/${sheetsIds.original}/edit

  Organized Sheet:
  https://docs.google.com/spreadsheets/d/${sheetsIds.organized}/edit
  
  For EACH sheet:
  1. Open the link above
  2. Click Share (top right)
  3. Look for: ${serviceAccountEmail}
  
  ✓ EXPECTED: Should have "Editor" access
  ✗ PROBLEM: If not listed or has Reader access → Grant Editor access:
     - Click "Share"
     - Add: ${serviceAccountEmail}
     - Give: "Editor" role
     - Click "Share"

🧪 STEP 4: After Making Changes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Run: node testGoogleAuth.js
  
  ✓ SUCCESS: Should show "All authentication tests passed!"
  ✗ STILL FAILING: Check all steps above again

⚡ QUICK EXECUTION PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  [ ] 1. Open: https://console.cloud.google.com/iam-admin/serviceaccounts
  [ ] 2. Find and click: ${serviceAccountEmail}
  [ ] 3. Go to KEYS tab
  [ ] 4. If ${currentKeyId} not found:
         → Delete old keys if any
         → Click "ADD KEY" > "Create new key" > Choose "JSON"
         → Replace ./code/GoogleAPI/keys.json
  [ ] 5. Go back, click "DETAILS" tab and copy entire email
  [ ] 6. Share original sheet: https://docs.google.com/spreadsheets/d/${sheetsIds.original}
         → Click Share > Add service account email > "Editor"
  [ ] 7. Share organized sheet: https://docs.google.com/spreadsheets/d/${sheetsIds.organized}
         → Click Share > Add service account email > "Editor"
  [ ] 8. Run: node testGoogleAuth.js
  [ ] 9. If OK, run: node populateAkoyaOrganzedSheetDirect.js

⏱️  ESTIMATED TIME: 5-10 minutes

🆘 STILL NOT WORKING?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Check: AUTH_TROUBLESHOOTING.md for detailed solutions
  Or:    See below for manual workaround
`);

console.log(`

⚙️  MANUAL WORKAROUND (If auth issues persist)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

While authentication is being fixed, you can manually copy data:

1. Open original sheet in browser:
   ${sheetsIds.original}

2. Select all (Ctrl+A) and Copy (Ctrl+C)

3. Open organized sheet:
   ${sheetsIds.organized}

4. Paste (Ctrl+V) in Sheet1

5. Then run deduplication locally

This is NOT ideal but allows work to continue while auth is being fixed.

`);
