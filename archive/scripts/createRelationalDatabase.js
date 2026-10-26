/**
 * createRelationalDatabase.js
 * 
 * Phase 1: Creates 8 relational tabs with proper structure
 * Converts organized sheet into a relational database
 * 
 * Tabs to create:
 * 1. Projects (PJ codes)
 * 2. Contacts (C codes)
 * 3. Properties - Confidential
 * 4. Properties - Non-Confidential
 * 5. Properties - Financial
 * 6. Properties - Projects Link
 * 7. Properties - Status Tracker
 * 8. Master View (already exists, will enhance)
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEYS_PATH = path.join(__dirname, './code/GoogleAPI/keys.json');
const ORGANIZED_ID = '1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk';

async function createRelationalDatabase() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 1: CREATING RELATIONAL DATABASE STRUCTURE');
    console.log('='.repeat(80) + '\n');

    // Auth
    const keyFileData = fs.readFileSync(KEYS_PATH, 'utf8');
    const keyFile = JSON.parse(keyFileData);

    const jwtClient = new (google.auth.JWT)(
      keyFile.client_email,
      null,
      keyFile.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    jwtClient.authorize((err) => {
      if (err) throw err;
    });

    const sheets = google.sheets('v4');

    // Get existing sheets
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: ORGANIZED_ID,
      auth: jwtClient
    });

    const existingSheets = spreadsheet.data.sheets.map(s => s.properties.title);
    console.log('📋 Current sheets:', existingSheets.join(', '));
    console.log('');

    // Tabs to create (in order)
    const tabsToCreate = [
      { title: 'Projects', type: 'reference' },
      { title: 'Contacts', type: 'reference' },
      { title: 'Properties - Confidential', type: 'property' },
      { title: 'Properties - Non-Confidential', type: 'property' },
      { title: 'Properties - Financial', type: 'property' },
      { title: 'Properties - Projects Link', type: 'relationship' },
      { title: 'Properties - Status Tracker', type: 'property' }
    ];

    // Filter out existing tabs
    const missingTabs = tabsToCreate.filter(t => !existingSheets.includes(t.title));

    if (missingTabs.length === 0) {
      console.log('✓ All tabs already exist!\n');
    } else {
      console.log(`📝 Creating ${missingTabs.length} new tabs...\n`);

      // Create missing tabs
      const createRequests = missingTabs.map(tab => ({
        addSheet: {
          properties: {
            title: tab.title,
            gridProperties: {
              rowCount: 10000,
              columnCount: 20
            }
          }
        }
      }));

      const batchResponse = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: ORGANIZED_ID,
        requestBody: { requests: createRequests },
        auth: jwtClient
      });

      missingTabs.forEach(t => {
        console.log(`  ✓ Created: ${t.title}`);
      });
      console.log('');

      // Get updated sheet info
      const updatedSpreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: ORGANIZED_ID,
        auth: jwtClient
      });

      const allSheets = updatedSpreadsheet.data.sheets;

      console.log('='.repeat(80));
      console.log('SETTING UP TAB HEADERS');
      console.log('='.repeat(80) + '\n');

      // Define headers for each tab
      const headerConfigs = {
        'Projects': [
          'Project Code', 'Project Name', 'Location', 'Developer', 'Status',
          'Start Date', 'Completion Date', 'Units Total'
        ],
        'Contacts': [
          'Contact Code', 'Name', 'Phone', 'Email', 'Mobile',
          'Secondary Mobile', 'Contact Type', 'Preferred Method'
        ],
        'Properties - Confidential': [
          'Property Code', 'Registration Number', 'Municipality Number',
          'P-Number', 'Plot Number', 'Unit Number', 'Building', 'Floor'
        ],
        'Properties - Non-Confidential': [
          'Property Code', 'Property Type', 'Layout', 'Bedrooms',
          'Bathrooms', 'Floor Plan', 'Size (sqm)', 'Status'
        ],
        'Properties - Financial': [
          'Property Code', 'Price (Sale)', 'Rental Rate', 'Currency',
          'Payment Terms', 'Discount', 'Commission', 'Notes'
        ],
        'Properties - Projects Link': [
          'Property Code', 'Project Code', 'Contact Code (Owner)',
          'Contact Code (Agent)', 'Date Listed', 'Special Notes'
        ],
        'Properties - Status Tracker': [
          'Property Code', 'Current Status', 'Status Date',
          'Previous Status', 'Last Updated', 'Updated By', 'Notes'
        ]
      };

      // Create header requests
      const headerRequests = [];

      Object.entries(headerConfigs).forEach(([tabName, headers]) => {
        const tab = allSheets.find(s => s.properties.title === tabName);
        if (!tab) return;

        const sheetId = tab.properties.sheetId;

        const headerRequest = {
          updateCells: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: headers.length
            },
            rows: [
              {
                values: headers.map(h => ({
                  userEnteredValue: { stringValue: h },
                  userEnteredFormat: {
                    backgroundColor: { red: 0.2, green: 0.2, blue: 0.4 },
                    textFormat: {
                      bold: true,
                      foregroundColor: { red: 1, green: 1, blue: 1 }
                    },
                    horizontalAlignment: 'CENTER'
                  }
                }))
              }
            ],
            fields: 'userEnteredValue,userEnteredFormat'
          }
        };

        headerRequests.push(headerRequest);
      });

      // Apply all header requests
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: ORGANIZED_ID,
        requestBody: { requests: headerRequests },
        auth: jwtClient
      });

      Object.keys(headerConfigs).forEach(tabName => {
        console.log(`✓ ${tabName}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('RELATIONAL DATABASE STRUCTURE CREATED');
    console.log('='.repeat(80) + '\n');

    console.log('📊 Tab Structure:\n');
    console.log('REFERENCE TABS (Master data):');
    console.log('  1. [Projects]              - All 30 projects with PJ001-PJ030 codes');
    console.log('  2. [Contacts]              - All contacts with C001-C#### codes\n');

    console.log('PROPERTY INFORMATION TABS (Split data):');
    console.log('  3. [Properties - Confidential]     - Registration, P-Number, Unit, etc.');
    console.log('  4. [Properties - Non-Confidential] - Layout, Beds, Size, Type');
    console.log('  5. [Properties - Financial]        - Price, Rent, Payment Terms');
    console.log('  6. [Properties - Projects Link]    - Links properties to projects/contacts');
    console.log('  7. [Properties - Status Tracker]   - Status history and tracking\n');

    console.log('INTEGRATION TAB:');
    console.log('  8. [Master View]           - Interactive view pulling from all tabs\n');

    console.log('='.repeat(80));
    console.log('NEXT STEPS');
    console.log('='.repeat(80) + '\n');

    console.log('Phase 2: Migrate Data from Sheet1');
    console.log('  Step 1: Extract unique projects → Projects tab');
    console.log('  Step 2: Extract unique contacts → Contacts tab');
    console.log('  Step 3: Split Sheet1 properties across Property tabs');
    console.log('  Step 4: Create linking data in Projects Link tab\n');

    console.log('Phase 3: Build Master View Formulas');
    console.log('  Step 1: Set up VLOOKUP formulas');
    console.log('  Step 2: Configure dropdown filters');
    console.log('  Step 3: Test data pulls\n');

    console.log('Phase 4: Validation & Testing');
    console.log('  Step 1: Verify data integrity');
    console.log('  Step 2: Test all lookup formulas');
    console.log('  Step 3: Create documentation\n');

    console.log(`📋 View your sheet:`);
    console.log(`   https://docs.google.com/spreadsheets/d/1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk\n`);

    console.log('✅ Phase 1 Complete: Database structure is ready!');
    console.log('👉 Next: Run Phase 2 to migrate data from Sheet1\n');

    process.exit(0);

  } catch (error) {
    console.error('\n✗ Error:', error.message || error);
    if (error.code) console.error('Code:', error.code);
    process.exit(1);
  }
}

createRelationalDatabase();
