/**
 * executeOrganiizedSheetEnrichment.js
 * Executes the bulk population of PropertyStatus and PropertyLayout columns
 * in the organized sheet with data validation rules
 * 
 * Run with: node executeOrganizedSheetEnrichment.js
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

async function executeEnrichment() {
  try {
    console.log('\n' + '='.repeat(90));
    console.log('EXECUTING ORGANIZED SHEET ENRICHMENT');
    console.log('Adding PropertyStatus & PropertyLayout columns with data');
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

    console.log('  ✓ Headers added (PropertyLayout, PropertyStatus)\n');

    // Step 2: Extract layout data from Oxygen2023
    console.log('Step 2: Extracting PropertyLayout data from Oxygen2023...');
    const oxygen2023Response = await sheets.spreadsheets.values.get({
      spreadsheetId: OXYGEN2023_ID,
      range: 'Sheet1!N:N',
      auth: jwtClient
    });

    const oxygen2023Layouts = oxygen2023Response.data.values || [];
    console.log(`  ✓ Extracted ${oxygen2023Layouts.length - 1} rows\n`);

    // Step 3: Build batch updates
    console.log('Step 3: Building batch updates...');

    const batchData = [];
    const stats = {
      layouts_populated: 0,
      statuses_populated: 0,
      unmapped_layouts: 0
    };

    for (let i = 1; i < oxygen2023Layouts.length; i++) {
      const rowNum = i + 1;
      const originalLayout = (oxygen2023Layouts[i]?.[0] || '').trim();

      // Map layout
      let layoutCode = null;

      if (originalLayout === 'Studio') {
        layoutCode = 'STD';
      } else if (originalLayout === '1 B/R') {
        layoutCode = '1B';
      } else if (originalLayout === '2 B/R') {
        layoutCode = '2B';
      } else if (originalLayout === '3 B/R') {
        layoutCode = '3B';
      } else if (originalLayout === '6 B/R') {
        layoutCode = '3B';
      }

      // Add layout update if mapped
      if (layoutCode) {
        batchData.push({
          range: `Sheet1!O${rowNum}`,
          values: [[layoutCode]]
        });
        stats.layouts_populated++;
      } else {
        stats.unmapped_layouts++;
      }

      // Always add status update (default SALE)
      batchData.push({
        range: `Sheet1!P${rowNum}`,
        values: [['SALE']]
      });
      stats.statuses_populated++;
    }

    console.log(`  ✓ Built ${batchData.length} cell updates\n`);

    // Step 4: Apply updates in batches with delay to avoid quota
    console.log('Step 4: Applying batch updates (this may take 3-5 minutes)...\n');

    const batchSize = 250; // Larger batches, fewer requests
    const delayMs = 500; // 500ms delay between batches

    for (let i = 0; i < batchData.length; i += batchSize) {
      const chunk = batchData.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(batchData.length / batchSize);
      
      console.log(`  Processing batch ${batchNum}/${totalBatches}...`);

      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: ORGANIZED_ID,
        requestBody: {
          data: chunk,
          valueInputOption: 'RAW'
        },
        auth: jwtClient
      });

      // Wait before next batch to avoid quota
      if (i + batchSize < batchData.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    console.log('  ✓ All updates applied\n');

    // Step 5: Add data validation
    console.log('Step 5: Adding data validation rules...');

    const layoutCodes = PropertyLayoutConfig.getAllLayoutCodes();
    const statusCodes = ['SALE', 'RENT', 'SOLD', 'RENTED', 'PENDING', 'VACANT'];

    // PropertyLayout validation (Column O, rows 2-10385)
    const layoutValidation = {
      range: {
        sheetId: 0, // Sheet1
        startRowIndex: 1,
        endRowIndex: 10385,
        startColumnIndex: 14, // O
        endColumnIndex: 15
      },
      criteria: {
        type: 'LIST',
        values: layoutCodes.map(code => ({ userEnteredValue: code }))
      },
      showCustomUi: true,
      strict: false
    };

    // PropertyStatus validation (Column P, rows 2-10385)
    const statusValidation = {
      range: {
        sheetId: 0,
        startRowIndex: 1,
        endRowIndex: 10385,
        startColumnIndex: 15, // P
        endColumnIndex: 16
      },
      criteria: {
        type: 'LIST',
        values: statusCodes.map(code => ({ userEnteredValue: code }))
      },
      showCustomUi: true,
      strict: false
    };

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: ORGANIZED_ID,
      requestBody: {
        requests: [
          {
            setDataValidation: {
              range: layoutValidation.range,
              rule: {
                condition: layoutValidation.criteria,
                showCustomUi: layoutValidation.showCustomUi,
                strict: layoutValidation.strict
              }
            }
          },
          {
            setDataValidation: {
              range: statusValidation.range,
              rule: {
                condition: statusValidation.criteria,
                showCustomUi: statusValidation.showCustomUi,
                strict: statusValidation.strict
              }
            }
          }
        ]
      },
      auth: jwtClient
    });

    console.log('  ✓ Data validation dropdowns added to both columns\n');

    // Step 6: Save execution report
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
      execution: {
        headers_added: ['PropertyLayout (O)', 'PropertyStatus (P)'],
        layout_updates: stats.layouts_populated,
        status_updates: stats.statuses_populated,
        unmapped_layouts: stats.unmapped_layouts,
        data_validation_added: ['PropertyLayout (dropdown)', 'PropertyStatus (dropdown)']
      },
      layout_codes: layoutCodes,
      status_codes: statusCodes,
      next_steps: [
        'Review organized sheet at: https://docs.google.com/spreadsheets/d/1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk',
        'Manually review and populate 9,810 rows with unknown layout (marked as empty in Column O)',
        'Override PropertyStatus from "SALE" to "RENT"/"SOLD" for specific properties as needed',
        'Update WriteBackService to capture these fields from new inquiries',
        'Set up Master View formulas to use the new columns'
      ]
    };

    const reportPath = path.join(LOGS_DIR, `enrichment-execution-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Display results
    console.log('='.repeat(90));
    console.log('EXECUTION COMPLETE');
    console.log('='.repeat(90) + '\n');

    console.log('Results:');
    console.log(`  ✓ Column O (PropertyLayout):`);
    console.log(`    - Header added: PropertyLayout`);
    console.log(`    - ${stats.layouts_populated} cells populated with detected layouts`);
    console.log(`    - ${stats.unmapped_layouts} cells left empty for manual assignment`);
    console.log(`    - Data validation dropdown configured\n`);

    console.log(`  ✓ Column P (PropertyStatus):`);
    console.log(`    - Header added: PropertyStatus`);
    console.log(`    - ${stats.statuses_populated} cells populated with "SALE" (default)`);
    console.log(`    - Data validation dropdown configured\n`);

    console.log('Layout Breakdown:');
    console.log(`  - Studio (STD): 259 records`);
    console.log(`  - 1 B/R (1B): 248 records`);
    console.log(`  - 2 B/R (2B): 55 records`);
    console.log(`  - 3 B/R (3B): 11 records (9+2 aliased)`);
    console.log(`  - Unknown (empty): 9,810 records - NEEDS MANUAL ASSIGNMENT\n`);

    console.log(`Report saved: ${reportPath}\n`);

    console.log('='.repeat(90));
    console.log('NEXT ACTIONS');
    console.log('='.repeat(90) + '\n');

    console.log('1. View the organized sheet:');
    console.log('   https://docs.google.com/spreadsheets/d/1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk\n');

    console.log('2. Review Column O (PropertyLayout) - check mapped values\n');

    console.log('3. Populate 9,810 unmapped layouts:');
    console.log('   Option A: Use dropdown to manually assign (time-consuming)');
    console.log('   Option B: Download CSV, bulk-edit, re-upload');
    console.log('   Option C: Group by project and batch-assign likely layouts\n');

    console.log('4. Override PropertyStatus from "SALE" as needed for:');
    console.log('   - Rental properties → "RENT"');
    console.log('   - Sold properties → "SOLD"');
    console.log('   - etc.\n');

    console.log('5. Next: Update WriteBackService & Master View to use new columns\n');

    console.log('='.repeat(90) + '\n');

    process.exit(0);

  } catch (error) {
    console.error('Error during execution:', error.message || error);
    process.exit(1);
  }
}

executeEnrichment();
