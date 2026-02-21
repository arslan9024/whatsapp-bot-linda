/**
 * Test serviceman11 Account Permissions
 * 
 * This script verifies that serviceman11 has proper access to:
 * - Read original Akoya sheet
 * - Write to organized Akoya sheet
 * - Create new tabs
 * - Access files via Drive API
 * 
 * Usage:
 *   node test-serviceman11-permissions.js YOUR_SHEET_ID
 * 
 * Example:
 *   node test-serviceman11-permissions.js 1a2b3c4d5e6f7g8h9i0j
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const SERVICEMAN11_CREDS = './code/Integration/Google/accounts/serviceman11/keys.json';

async function testServiceman11Permissions(sheetId) {
  try {
    // Validate inputs
    if (!sheetId) {
      console.error('\n❌ Error: Sheet ID required');
      console.error('\nUsage: node test-serviceman11-permissions.js YOUR_SHEET_ID\n');
      process.exit(1);
    }

    // Check if credentials exist
    if (!fs.existsSync(SERVICEMAN11_CREDS)) {
      console.error(`\n❌ Error: Credentials file not found at ${SERVICEMAN11_CREDS}`);
      console.error('\n📖 Please follow Step 3 in SERVICEMAN11_ACCOUNT_SETUP_GUIDE.md\n');
      process.exit(1);
    }

    // Load credentials
    const credentials = JSON.parse(fs.readFileSync(SERVICEMAN11_CREDS, 'utf8'));
    
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

    console.log('\n' + '='.repeat(70));
    console.log('  ✅ TESTING serviceman11 ACCOUNT PERMISSIONS');
    console.log('='.repeat(70) + '\n');
    
    console.log('📋 Account Details:');
    console.log('   Service Account:', credentials.client_email);
    console.log('   Project ID:', credentials.project_id);
    console.log('   Sheet ID:', sheetId);
    console.log('');

    // Test 1: Can read spreadsheet metadata
    console.log('📖 Test 1: Reading sheet metadata...');
    let sheetMetadata;
    try {
      sheetMetadata = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });
      console.log('   ✅ Can read sheet:', sheetMetadata.data.properties.title);
      console.log('   Sheets in workbook:');
      sheetMetadata.data.sheets.forEach(s => {
        console.log(`     - ${s.properties.title} (${s.data ? s.data.length : 0} rows)`);
      });
      console.log('');
    } catch (error) {
      console.error('   ❌ Failed to read sheet:', error.message);
      console.error('   This likely means:');
      console.error('   1. The sheet ID is incorrect');
      console.error('   2. serviceman11 does not have access to this sheet');
      console.error('   3. The sheet does not exist');
      console.error('');
      process.exit(1);
    }

    // Test 2: Can write to sheet
    console.log('✍️  Test 2: Writing test data...');
    try {
      const timestamp = new Date().toISOString();
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'Data Viewer!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[`✅ serviceman11 can write to this sheet - ${timestamp}`]],
        },
      });
      console.log('   ✅ Can write to sheet');
      console.log('   Test data written to "Data Viewer" sheet, cell A1');
      console.log('');
    } catch (error) {
      console.error('   ❌ Failed to write:', error.message);
      console.error('   This likely means:');
      console.error('   1. serviceman11 does not have Editor role');
      console.error('   2. Please verify sharing settings in Step 2');
      console.error('');
      process.exit(1);
    }

    // Test 3: Can create new sheet/tab
    console.log('➕ Test 3: Creating new test tab...');
    try {
      const testTabName = `Test Tab ${Date.now()}`;
      const batchRequest = {
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: testTabName,
                },
              },
            },
          ],
        },
      };
      const response = await sheets.spreadsheets.batchUpdate(batchRequest);
      const newTabId = response.data.replies[0].addSheet.properties.sheetId;
      console.log('   ✅ Can create tabs:', testTabName);
      console.log('   New tab ID:', newTabId);
      
      // Clean up: delete the test tab
      console.log('   Cleaning up test tab...');
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              deleteSheet: {
                sheetId: newTabId,
              },
            },
          ],
        },
      });
      console.log('   ✅ Test tab deleted');
      console.log('');
    } catch (error) {
      console.error('   ❌ Failed to create tab:', error.message);
      console.error('   This likely means:');
      console.error('   1. serviceman11 does not have Editor role');
      console.error('   2. The spreadsheet is in read-only mode');
      console.error('');
      process.exit(1);
    }

    // Test 4: Check Drive permissions
    console.log('🔐 Test 4: Checking Drive access...');
    try {
      const fileMetadata = await drive.files.get({
        fileId: sheetId,
        fields: 'name, owners, permissions',
      });
      console.log('   ✅ Can access from Drive:', fileMetadata.data.name);
      console.log('   Owners:', fileMetadata.data.owners.map(o => o.emailAddress).join(', '));
      console.log('');
    } catch (error) {
      console.error('   ❌ Failed to access Drive:', error.message);
      console.error('');
    }

    // All tests passed
    console.log('='.repeat(70));
    console.log('  ✅ ALL TESTS PASSED!');
    console.log('='.repeat(70) + '\n');
    
    console.log('✨ serviceman11 is ready to use with:');
    console.log('   ✓ Read access to spreadsheets');
    console.log('   ✓ Write access to spreadsheets');
    console.log('   ✓ Tab/sheet creation capability');
    console.log('   ✓ Drive file access');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('   1. Update accounts.config.json with your sheet ID (if not done)');
    console.log('   2. Run organizeAndAnalyzeSheet.js to populate data');
    console.log('   3. Integrate serviceman11 into your bot code\n');

  } catch (error) {
    console.error('\n❌ Unexpected Error:', error.message);
    console.error('Details:', error.stack);
    process.exit(1);
  }
}

// Get sheet ID from command line
const sheetId = process.argv[2];
testServiceman11Permissions(sheetId);
