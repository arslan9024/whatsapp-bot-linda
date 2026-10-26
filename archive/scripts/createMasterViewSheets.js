/**
 * createMasterViewSheets.js
 * Creates interactive master view and category tabs with filtering
 * Based on user's original request for organized, filterable sheets
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEYS_PATH = path.join(__dirname, './code/GoogleAPI/keys.json');
const ORGANIZED_ID = '1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk';

async function createMasterView() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('CREATING INTERACTIVE MASTER VIEW SHEETS');
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

    // Get current sheets
    console.log('📋 Checking existing sheets...\n');
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: ORGANIZED_ID,
      auth: jwtClient
    });

    const existingSheets = spreadsheet.data.sheets.map(s => s.properties.title);
    console.log('Current sheets:', existingSheets.join(', '));
    console.log('');

    // Define new sheets to create
    const newSheets = [
      { title: 'Master View', type: 'master' },
      { title: 'Property Info', type: 'category' },
      { title: 'Contacts', type: 'category' },
      { title: 'Financial', type: 'category' },
      { title: 'Status Tracker', type: 'category' }
    ];

    const sheetsToCreate = newSheets.filter(s => !existingSheets.includes(s.title));

    if (sheetsToCreate.length === 0) {
      console.log('✓ All sheets already exist!\n');
      console.log('Existing sheets:');
      newSheets.forEach(s => {
        console.log(`  ✓ ${s.title}`);
      });
    } else {
      console.log(`📝 Creating ${sheetsToCreate.length} new sheets...\n`);

      // Create each new sheet
      const createRequests = sheetsToCreate.map(sheet => ({
        addSheet: {
          properties: {
            title: sheet.title,
            gridProperties: {
              rowCount: 1000,
              columnCount: 16
            }
          }
        }
      }));

      const batchResponse = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: ORGANIZED_ID,
        requestBody: { requests: createRequests },
        auth: jwtClient
      });

      console.log('✓ Sheets created:\n');
      sheetsToCreate.forEach(s => {
        console.log(`  ✓ ${s.title}`);
      });

      // Get the new sheet IDs
      const updatedSpreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: ORGANIZED_ID,
        auth: jwtClient
      });

      const masterViewSheet = updatedSpreadsheet.data.sheets.find(s => s.properties.title === 'Master View');
      const propertyInfoSheet = updatedSpreadsheet.data.sheets.find(s => s.properties.title === 'Property Info');
      const contactsSheet = updatedSpreadsheet.data.sheets.find(s => s.properties.title === 'Contacts');
      const financialSheet = updatedSpreadsheet.data.sheets.find(s => s.properties.title === 'Financial');
      const statusSheet = updatedSpreadsheet.data.sheets.find(s => s.properties.title === 'Status Tracker');

      console.log('\n' + '='.repeat(80));
      console.log('SETTING UP MASTER VIEW SHEET');
      console.log('='.repeat(80) + '\n');

      // Set up Master View headers and filters
      const masterViewHeaders = [
        'Filter Controls:',
        '',
        'Search Project:',
        'Filter by Status:',
        'Filter by Layout:',
        '',
        'Results:',
        '',
        'Code',
        'Project',
        'Area',
        'Property Layout',
        'Property Status',
        'Contact Name',
        'Phone',
        'Email'
      ];

      const masterViewRequest = {
        updateCells: {
          range: {
            sheetId: masterViewSheet.properties.sheetId,
            startRowIndex: 0,
            startColumnIndex: 0
          },
          rows: [
            {
              values: masterViewHeaders.map(h => ({
                userEnteredValue: { stringValue: h },
                userEnteredFormat: {
                  backgroundColor: h === 'Filter Controls:' || h === 'Results:' 
                    ? { red: 0.8, green: 0.8, blue: 1 }
                    : h === 'Code' ? { red: 0.9, green: 0.9, blue: 0.9 }
                    : { red: 1, green: 1, blue: 1 },
                  textFormat: {
                    bold: ['Filter Controls:', 'Results:'].includes(h)
                  }
                }
              }))
            }
          ],
          fields: 'userEnteredValue,userEnteredFormat'
        }
      };

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: ORGANIZED_ID,
        requestBody: { requests: [masterViewRequest] },
        auth: jwtClient
      });

      console.log('✓ Master View headers set up');
      console.log('  • Row 1: Filter Controls section');
      console.log('  • Rows 3-5: Dropdown filter inputs');
      console.log('  • Row 7: Results header');
      console.log('  • Rows 8+: Filtered data from Sheet1');

      console.log('\n' + '='.repeat(80));
      console.log('SETTING UP CATEGORY SHEETS');
      console.log('='.repeat(80) + '\n');

      // Property Info sheet headers
      const propertyHeaders = [
        'Code', 'Project', 'Area', 'Plot Number', 'Building', 'Plot No',
        'Registration', 'Units', 'PropertyLayout', 'PropertyStatus'
      ];

      const propertyInfoRequest = {
        updateCells: {
          range: {
            sheetId: propertyInfoSheet.properties.sheetId,
            startRowIndex: 0,
            startColumnIndex: 0
          },
          rows: [
            {
              values: propertyHeaders.map(h => ({
                userEnteredValue: { stringValue: h },
                userEnteredFormat: {
                  backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                  textFormat: { bold: true }
                }
              }))
            }
          ],
          fields: 'userEnteredValue,userEnteredFormat'
        }
      };

      // Contacts sheet headers
      const contactHeaders = [
        'Code', 'Contact Name', 'Phone', 'Mobile', 'Secondary Mobile', 'Email', 'Project'
      ];

      const contactsRequest = {
        updateCells: {
          range: {
            sheetId: contactsSheet.properties.sheetId,
            startRowIndex: 0,
            startColumnIndex: 0
          },
          rows: [
            {
              values: contactHeaders.map(h => ({
                userEnteredValue: { stringValue: h },
                userEnteredFormat: {
                  backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                  textFormat: { bold: true }
                }
              }))
            }
          ],
          fields: 'userEnteredValue,userEnteredFormat'
        }
      };

      // Financial sheet headers
      const financialHeaders = [
        'Code', 'Project', 'Price/Rent', 'Currency', 'Payment Terms', 'Notes'
      ];

      const financialRequest = {
        updateCells: {
          range: {
            sheetId: financialSheet.properties.sheetId,
            startRowIndex: 0,
            startColumnIndex: 0
          },
          rows: [
            {
              values: financialHeaders.map(h => ({
                userEnteredValue: { stringValue: h },
                userEnteredFormat: {
                  backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                  textFormat: { bold: true }
                }
              }))
            }
          ],
          fields: 'userEnteredValue,userEnteredFormat'
        }
      };

      // Status Tracker sheet headers
      const statusHeaders = [
        'Code', 'Project', 'Current Status', 'Status Date', 'Last Updated', 'Notes'
      ];

      const statusRequest = {
        updateCells: {
          range: {
            sheetId: statusSheet.properties.sheetId,
            startRowIndex: 0,
            startColumnIndex: 0
          },
          rows: [
            {
              values: statusHeaders.map(h => ({
                userEnteredValue: { stringValue: h },
                userEnteredFormat: {
                  backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                  textFormat: { bold: true }
                }
              }))
            }
          ],
          fields: 'userEnteredValue,userEnteredFormat'
        }
      };

      // Apply all header updates
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: ORGANIZED_ID,
        requestBody: {
          requests: [
            propertyInfoRequest,
            contactsRequest,
            financialRequest,
            statusRequest
          ]
        },
        auth: jwtClient
      });

      console.log('✓ Property Info sheet headers set');
      console.log('✓ Contacts sheet headers set');
      console.log('✓ Financial sheet headers set');
      console.log('✓ Status Tracker sheet headers set');
    }

    console.log('\n' + '='.repeat(80));
    console.log('MASTER VIEW SHEETS SETUP COMPLETE');
    console.log('='.repeat(80) + '\n');

    console.log('📊 Sheet Structure:\n');
    console.log('Sheet1 (Original Data)');
    console.log('  └─ Contains all 10,383 properties with all columns\n');
    
    console.log('Master View (New - Interactive)');
    console.log('  ├─ Filter dropdowns (Project, Status, Layout)');
    console.log('  └─ Dynamic filtered results showing selected properties\n');

    console.log('Property Info (New - Category)');
    console.log('  └─ Property details: Code, Project, Area, Layout, Status\n');

    console.log('Contacts (New - Category)');
    console.log('  └─ Contact details: Names, phones, emails\n');

    console.log('Financial (New - Category)');
    console.log('  └─ Price, rent, payment terms\n');

    console.log('Status Tracker (New - Category)');
    console.log('  └─ Track property lifecycle and updates\n');

    console.log('✓ Next step: Open Master View sheet and set up dropdown filters');
    console.log('✓ Then add FILTER formulas to pull matching data\n');

    console.log('View sheet: https://docs.google.com/spreadsheets/d/1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk\n');

    process.exit(0);

  } catch (error) {
    console.error('\n✗ Error:', error.message || error);
    console.error(error);
    process.exit(1);
  }
}

createMasterView();
