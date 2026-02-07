/**
 * Akoya Sheet Creator - Manual Workaround
 * Creates sheet by copying the original and then organizing
 */

import 'dotenv/config';
import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function createAndOrganizeSheet() {
  try {
    console.clear();
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   AKOYA SHEET ORGANIZER - MANUAL METHOD                   ║');
    console.log('║   Creating copy and organizing data                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH;
    console.log(`📍 Credentials path: ${credentialsPath}\n`);
    
    if (!credentialsPath) {
      throw new Error('GOOGLE_CREDENTIALS_PATH not set in .env');
    }

    const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));
    console.log(`✅ Credentials loaded\n`);

    // Original sheet ID
    const originalSheetId = '1gV4-hSAhDyWsivajBb2E2DSs25CMbqhc-6oufP1ZX04';
    const originalName = 'Akoya-Oxygen-2023-Arslan-only';
    const newName = 'Akoya-Oxygen-2023-Arrayed-Organized';

    console.log(`📋 Original Sheet: ${originalName}`);
    console.log(`📄 Sheet ID: ${originalSheetId}\n`);

    // Step 1: Try to copy the sheet using Drive API
    console.log('📋 Step 1: Creating copy of original sheet...\n');
    
    const drive = google.drive({ version: 'v3', auth: driveAuth });

    try {
      const copyResponse = await drive.files.copy({
        fileId: originalSheetId,
        requestBody: {
          name: newName,
        },
      });

      const newSheetId = copyResponse.data.id;
      console.log(`✅ Sheet copied successfully!`);
      console.log(`✅ New Sheet ID: ${newSheetId}`);
      console.log(`✅ New Sheet Name: ${newName}\n`);

      // Step 2: Clear the copied sheet and set it up
      console.log('📋 Step 2: Setting up new sheet structure...\n');

      const sheets = google.sheets({ version: 'v4', auth: sheetsAuth });

      // Create the 3 tabs
      const batchUpdateRequest = {
        requests: [
          // Rename Sheet1 to "Data Viewer"
          {
            updateSheetProperties: {
              fields: 'title',
              properties: {
                sheetId: 0,
                title: 'Data Viewer',
              },
            },
          },
          // Add "Organized Data" sheet
          {
            addSheet: {
              properties: {
                title: 'Organized Data',
                gridProperties: {
                  rowCount: 11000,
                  columnCount: 30,
                },
              },
            },
          },
          // Add "Metadata" sheet
          {
            addSheet: {
              properties: {
                title: 'Metadata',
                gridProperties: {
                  rowCount: 100,
                  columnCount: 5,
                },
              },
            },
          },
        ],
      };

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: newSheetId,
        requestBody: batchUpdateRequest,
      });

      console.log('✅ Sheet structure created with 3 tabs:');
      console.log('   1. Data Viewer (interactive row selector)');
      console.log('   2. Organized Data (cleaned dataset)');
      console.log('   3. Metadata (transformation info)\n');

      // Step 3: Add basic info to Data Viewer tab
      console.log('📋 Step 3: Configuring Data Viewer tab...\n');

      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: newSheetId,
        requestBody: {
          data: [
            {
              range: 'Data Viewer!A1',
              values: [['DATA VIEWER - Interactive Property Browser']],
            },
            {
              range: 'Data Viewer!A2',
              values: [['Select Row Number:']],
            },
            {
              range: 'Data Viewer!B3',
              values: [['1']],
            },
            {
              range: 'Data Viewer!A4',
              values: [['Column Filters:']],
            },
          ],
          valueInputOption: 'RAW',
        },
      });

      console.log('✅ Data Viewer tab configured\n');

      // Step 4: Add metadata info
      console.log('📋 Step 4: Adding metadata...\n');

      const now = new Date().toISOString();
      await sheets.spreadsheets.values.update({
        spreadsheetId: newSheetId,
        range: 'Metadata!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [
            ['Original Sheet ID', originalSheetId],
            ['Original Name', originalName],
            ['New Sheet ID', newSheetId],
            ['New Sheet Name', newName],
            ['Created', now],
            ['Total Records', '10654'],
            ['Total Columns', '26'],
          ],
        },
      });

      console.log('✅ Metadata added\n');

      // Final summary
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║                    ✨ SUCCESS! ✨                           ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');

      console.log(`📊 NEW SHEET CREATED:\n`);
      console.log(`   Name: ${newName}`);
      console.log(`   ID:   ${newSheetId}`);
      console.log(`   Tabs: 3 (Data Viewer, Organized Data, Metadata)\n`);

      console.log(`📍 NEXT STEPS:\n`);
      console.log(`   1. Open in Google Drive: https://drive.google.com`);
      console.log(`   2. Search for: "${newName}"\n`);
      console.log(`   3. Register in bot: node addNewProject.js --id "${newSheetId}" --name "${newName}"\n`);

      console.log(`✅ Sheet is ready for data organization!\n`);

      return {
        success: true,
        originalSheetId,
        newSheetId,
        newSheetName: newName,
      };
    } catch (error) {
      if (error.message.includes('permission')) {
        console.log('\n⚠️  PERMISSIONS ISSUE DETECTED\n');
        console.log('The service account needs Drive API permission to copy sheets.');
        console.log('\nSolution: Manually create the sheet in Google Sheets:');
        console.log('  1. Open Google Sheets');
        console.log('  2. Create new spreadsheet');
        console.log('  3. Name it: Akoya-Oxygen-2023-Organized');
        console.log('  4. Copy the sheet ID from URL');
        console.log('  5. Run: node addNewProject.js --id "[SHEET_ID]" --name "Akoya-Oxygen-2023-Organized"\n');
      }
      throw error;
    }
  } catch (error) {
    console.log('\n❌ ERROR:\n');
    console.log(`   ${error.message}\n`);
    process.exit(1);
  }
}

createAndOrganizeSheet();
