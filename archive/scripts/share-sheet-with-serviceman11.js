/**
 * Auto-Share Sheet with serviceman11
 * 
 * Automatically shares the new organized sheet with serviceman11 account.
 * This uses the Power Agent's credentials to share the file via Drive API.
 * 
 * Usage:
 *   node share-sheet-with-serviceman11.js YOUR_SHEET_ID
 * 
 * Example:
 *   node share-sheet-with-serviceman11.js 1a2b3c4d5e6f7g8h9i0j
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const POWER_AGENT_CREDS = './code/Integration/Google/keys.json';
const SERVICEMAN11_CREDS = './code/Integration/Google/accounts/serviceman11/keys.json';
const SERVICEMAN11_EMAIL = 'serviceman11@heroic-artifact-414519.iam.gserviceaccount.com';

async function shareSheetWithServiceman11(sheetId) {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('  📤 AUTO-SHARE SHEET WITH SERVICEMAN11');
    console.log('='.repeat(70) + '\n');

    // Validate sheet ID
    if (!sheetId) {
      console.error('❌ Error: Sheet ID required\n');
      console.error('Usage: node share-sheet-with-serviceman11.js YOUR_SHEET_ID\n');
      console.error('Example: node share-sheet-with-serviceman11.js 1a2b3c4d5e6f7g8h9i0j\n');
      process.exit(1);
    }

    // Check if Power Agent credentials exist
    if (!fs.existsSync(POWER_AGENT_CREDS)) {
      console.error(`❌ Error: Power Agent credentials not found at ${POWER_AGENT_CREDS}\n`);
      console.error('Make sure your main Google API keys are in place.\n');
      process.exit(1);
    }

    // Load Power Agent credentials
    console.log('🔐 Loading credentials...\n');
    const credentials = JSON.parse(fs.readFileSync(POWER_AGENT_CREDS, 'utf8'));

    // Initialize auth with Drive API
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    console.log('📋 Share Details:');
    console.log(`   Sheet ID: ${sheetId}`);
    console.log(`   Recipient: ${SERVICEMAN11_EMAIL}`);
    console.log(`   Role: Editor\n`);

    // Check if already shared
    console.log('🔍 Checking existing permissions...\n');
    let permissions;
    try {
      const fileMetadata = await drive.files.get({
        fileId: sheetId,
        fields: 'permissions',
      });
      permissions = fileMetadata.data.permissions || [];
    } catch (error) {
      console.error(`❌ Error accessing file: ${error.message}`);
      console.error('This likely means:');
      console.error('   1. The sheet ID is incorrect');
      console.error('   2. The file does not exist');
      console.error('   3. You do not have access to it\n');
      process.exit(1);
    }

    const alreadyShared = permissions.some(p => p.emailAddress === SERVICEMAN11_EMAIL);

    if (alreadyShared) {
      console.log('ℹ️  Already shared with serviceman11\n');
      console.log('Current permissions:');
      permissions.forEach(p => {
        if (p.emailAddress) {
          console.log(`   - ${p.emailAddress}: ${p.role}`);
        }
      });
      console.log('');
    } else {
      // Share the sheet
      console.log('📤 Sharing sheet with serviceman11...\n');
      try {
        const result = await drive.permissions.create({
          fileId: sheetId,
          requestBody: {
            role: 'editor',
            type: 'user',
            emailAddress: SERVICEMAN11_EMAIL,
          },
          fields: 'id, emailAddress, role',
        });

        console.log('✅ Shared successfully!\n');
        console.log('Permission Details:');
        console.log(`   Permission ID: ${result.data.id}`);
        console.log(`   Email: ${result.data.emailAddress}`);
        console.log(`   Role: ${result.data.role}\n`);

      } catch (error) {
        console.error('❌ Error sharing file:', error.message, '\n');
        
        // Provide helpful error messages
        if (error.message.includes('notFound')) {
          console.error('The file was not found. Check your sheet ID.\n');
        } else if (error.message.includes('forbidden')) {
          console.error('You do not have permission to share this file.\n');
        } else if (error.message.includes('invalid')) {
          console.error('The email address is invalid.\n');
        }
        
        process.exit(1);
      }
    }

    // Test the connection
    console.log('🧪 Running permission test...\n');
    try {
      const sheets = google.sheets({ version: 'v4', auth });
      await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });
      console.log('✅ Sheet is accessible with Power Agent credentials\n');
    } catch (error) {
      console.warn('⚠️  Warning: Could not verify sheet access:', error.message, '\n');
    }

    // Summary
    console.log('='.repeat(70));
    console.log('  ✅ SHEET SHARING COMPLETE');
    console.log('='.repeat(70) + '\n');

    console.log('🚀 Next Steps:\n');
    console.log('1️⃣  Verify serviceman11 has access:\n');
    console.log(`   node test-serviceman11-permissions.js ${sheetId}\n`);

    console.log('2️⃣  Run the organization script to populate data:\n');
    console.log('   node organizeAndAnalyzeSheet.js\n');

    console.log('3️⃣  Check the sheet in Google Drive:\n');
    console.log(`   https://drive.google.com/file/d/${sheetId}/view\n`);

  } catch (error) {
    console.error('\n❌ Unexpected Error:', error.message);
    console.error('\nDetails:', error.stack, '\n');
    process.exit(1);
  }
}

// Get sheet ID from command line
const sheetId = process.argv[2];
shareSheetWithServiceman11(sheetId);
