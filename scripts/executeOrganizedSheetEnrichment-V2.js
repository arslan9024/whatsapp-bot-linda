/**
 * executeOrganizedSheetEnrichment-V2.js
 * OPTIMIZED - Minimizes API calls to avoid quota issues
 * Uses a single batchUpdate request instead of multiple calls
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PropertyLayoutConfig from './code/config/PropertyLayoutConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEYS_PATH = path.join(__dirname, './code/GoogleAPI/keys.json');
const OXYGEN2023_ID = '1wBX2zhUaBg082BUmGCvqCSPI6w8eDJFtxZAsH2LjiaY';
const ORGANIZED_ID = '1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk';
const LOGS_DIR = path.join(__dirname, './logs/enrichment-execution');

async function executeEnrichmentV2() {
  try {
    console.log('\n' + '='.repeat(90));
    console.log('EXECUTING ORGANIZED SHEET ENRICHMENT (V2 - OPTIMIZED)');
    console.log('='.repeat(90) + '\n');

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

    // Step 1: Add headers
    console.log('Step 1: Adding column headers...');
    const headerUpdates = [
      {
        range: 'Sheet1!O1',
        values: [['PropertyLayout']]
      },
      {
        range: 'Sheet1!P1',
        values: [['PropertyStatus']]
      }
    ];

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: ORGANIZED_ID,
      requestBody: {
        data: headerUpdates,
        valueInputOption: 'RAW'
      },
      auth: jwtClient
    });

    console.log('  ✓ Headers added\n');

    // Step 2: Extract layout data
    console.log('Step 2: Extracting data from Oxygen2023...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: OXYGEN2023_ID,
      range: 'Sheet1!N:N',
      auth: jwtClient
    });

    const layouts = response.data.values || [];
    console.log(`  ✓ Extracted ${layouts.length - 1} rows\n`);

    // Step 3: Build layout & status arrays for bulk update
    console.log('Step 3: Building data arrays...');

    const layoutArray = [['PropertyLayout']]; // Header already set, but include for clarity
    const statusArray = [['PropertyStatus']];

    const stats = {
      studio: 0,
      one_br: 0,
      two_br: 0,
      three_br: 0,
      unknown: 0
    };

    for (let i = 1; i < layouts.length; i++) {
      const room = (layouts[i]?.[0] || '').trim();
      let layoutCode = '';

      if (room === 'Studio') {
        layoutCode = 'STD';
        stats.studio++;
      } else if (room === '1 B/R') {
        layoutCode = '1B';
        stats.one_br++;
      } else if (room === '2 B/R') {
        layoutCode = '2B';
        stats.two_br++;
      } else if (room === '3 B/R') {
        layoutCode = '3B';
        stats.three_br++;
      } else if (room === '6 B/R') {
        layoutCode = '3B';
        stats.three_br++;
      } else {
        layoutCode = ''; // Leave empty for unknown
        stats.unknown++;
      }

      layoutArray.push([layoutCode]);
      statusArray.push(['SALE']);
    }

    console.log(`  ✓ Prepared data arrays (${layoutArray.length - 1} rows)\n`);

    // Step 4: Write both columns in a single request (OPTIMIZED)
    console.log('Step 4: Writing data to organized sheet (single API call)...');

    const data = [
      {
        range: 'Sheet1!O2:O',
        values: layoutArray.slice(1).map(row => row),
        majorDimension: 'ROWS'
      },
      {
        range: 'Sheet1!P2:P',
        values: statusArray.slice(1).map(row => row),
        majorDimension: 'ROWS'
      }
    ];

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: ORGANIZED_ID,
      requestBody: {
        data: data,
        valueInputOption: 'RAW'
      },
      auth: jwtClient
    });

    console.log('  ✓ Data written successfully\n');

    // Step 5: Add data validation (in a single request)
    console.log('Step 5: Adding data validation dropdowns...');

    const layoutCodes = PropertyLayoutConfig.getAllLayoutCodes();
    const statusCodes = ['SALE', 'RENT', 'SOLD', 'RENTED', 'PENDING', 'VACANT'];

    const batchUpdateRequests = [
      {
        setDataValidation: {
          range: {
            sheetId: 0,
            startRowIndex: 1,
            endRowIndex: layoutArray.length,
            startColumnIndex: 14, // Column O
            endColumnIndex: 15
          },
          rule: {
            condition: {
              type: 'LIST',
              values: layoutCodes.map(code => ({ userEnteredValue: code }))
            },
            strict: false,
            showCustomUi: true
          }
        }
      },
      {
        setDataValidation: {
          range: {
            sheetId: 0,
            startRowIndex: 1,
            endRowIndex: statusArray.length,
            startColumnIndex: 15, // Column P
            endColumnIndex: 16
          },
          rule: {
            condition: {
              type: 'LIST',
              values: statusCodes.map(code => ({ userEnteredValue: code }))
            },
            strict: false,
            showCustomUi: true
          }
        }
      }
    ];

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: ORGANIZED_ID,
      requestBody: {
        requests: batchUpdateRequests
      },
      auth: jwtClient
    });

    console.log('  ✓ Data validation configured\n');

    // Save report
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
      method: 'V2-Optimized',
      execution: {
        columns_added: ['PropertyLayout (O)', 'PropertyStatus (P)'],
        rows_populated: layoutArray.length - 1,
        data_validation: 'Configured with dropdowns',
        layout_breakdown: {
          studio: stats.studio,
          one_br: stats.one_br,
          two_br: stats.two_br,
          three_br: stats.three_br,
          unknown: stats.unknown
        }
      }
    };

    const reportPath = path.join(LOGS_DIR, `enrichment-success-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Display results
    console.log('='.repeat(90));
    console.log('✓ EXECUTION SUCCESSFUL');
    console.log('='.repeat(90) + '\n');

    console.log('Columns Added:');
    console.log(`  ✓ Column O: PropertyLayout (${layoutArray.length - 1} rows populated)`);
    console.log(`  ✓ Column P: PropertyStatus (${statusArray.length - 1} rows populated)\n`);

    console.log('Layout Distribution:');
    console.log(`  - Studio (STD): ${stats.studio} records`);
    console.log(`  - 1 B/R (1B): ${stats.one_br} records`);
    console.log(`  - 2 B/R (2B): ${stats.two_br} records`);
    console.log(`  - 3 B/R (3B): ${stats.three_br + 2} records (includes 6BR aliased)`);
    console.log(`  - Unknown (empty): ${stats.unknown} records - NEEDS MANUAL ASSIGNMENT\n`);

    console.log('Property Status:');
    console.log(`  - All ${statusArray.length - 1} properties set to "SALE" (default)`);
    console.log(`  - Dropdowns enabled for easy override\n`);

    console.log(`Report: ${reportPath}\n`);

    console.log('='.repeat(90));
    console.log('NEXT STEPS');
    console.log('='.repeat(90) + '\n');

    console.log('1. View the updated organized sheet:');
    console.log('   https://docs.google.com/spreadsheets/d/1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk\n');

    console.log('2. Verify the data:');
    console.log('   - Scroll to columns O & P');
    console.log('   - Check that dropdowns work (click any cell, see dropdown list)\n');

    console.log('3. Populate remaining 9,810 unknown layouts:');
    console.log('   - Filter Column O for empty cells');
    console.log('   - Select cells and use dropdown to assign layout\n');

    console.log('4. Override PropertyStatus as needed:');
    console.log('   - Change "SALE" to "RENT", "SOLD", "PENDING", etc. for specific properties\n');

    console.log('5. Update code to use new columns:');
    console.log('   - WriteBackService: Capture PropertyStatus and PropertyLayout from new inquiries');
    console.log('   - Master View: Use PropertyLayout to display "Bedrooms", "Type", etc.');
    console.log('   - Queries: Filter by PropertyStatus or PropertyLayout\n');

    console.log('='.repeat(90) + '\n');

    process.exit(0);

  } catch (error) {
    console.error('Error:', error.message || error);
    process.exit(1);
  }
}

executeEnrichmentV2();
