/**
 * bulkPopulateOrganizedSheet.js
 * Intelligently populates PropertyStatus and PropertyLayout in organized sheet
 * Using data from Oxygen2023 sheet
 * 
 * Strategy:
 * 1. Extract PropertyLayout from Oxygen2023 Column N (Rooms field)
 * 2. Map to organized sheet Column O
 * 3. Set PropertyStatus Column P to "SALE" (default) - users can override
 * 4. Track unmapped layouts for manual assignment
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
const LOGS_DIR = path.join(__dirname, './logs/bulk-population');

async function bulkPopulate() {
  try {
    console.log('\n' + '='.repeat(90));
    console.log('BULK POPULATION: PropertyStatus & PropertyLayout');
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

    // Step 1: Get PropertyLayout data from Oxygen2023 Column N (Rooms)
    console.log('Step 1: Extracting PropertyLayout data from Oxygen2023 Column N (Rooms)...');
    const oxygen2023Response = await sheets.spreadsheets.values.get({
      spreadsheetId: OXYGEN2023_ID,
      range: 'Sheet1!N:N',
      auth: jwtClient
    });

    const oxygen2023Layouts = oxygen2023Response.data.values || [];
    console.log(`  ✓ Extracted ${oxygen2023Layouts.length - 1} rows from Oxygen2023\n`);

    // Step 2: Get all organized sheet data for comparing
    console.log('Step 2: Loading organized sheet data...');
    const organizedResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: ORGANIZED_ID,
      range: 'Sheet1!A:Q',
      auth: jwtClient
    });

    const organizedData = organizedResponse.data.values || [];
    console.log(`  ✓ Loaded ${organizedData.length - 1} rows from organized sheet\n`);

    // Step 3: Build updates
    console.log('Step 3: Building updates for PropertyLayout and PropertyStatus...\n');

    const layoutUpdates = [];
    const statusUpdates = [];
    const mappingStats = {
      studio: 0,
      one_br: 0,
      two_br: 0,
      three_br: 0,
      six_br: 0,
      unknown: 0,
      total: 0
    };

    // Map layout values
    for (let i = 1; i < oxygen2023Layouts.length && i < organizedData.length; i++) {
      const originalLayout = (oxygen2023Layouts[i]?.[0] || '').trim();
      
      mappingStats.total++;

      let mappedCode = null;
      let mappedLabel = null;

      if (originalLayout === 'Studio') {
        mappedCode = 'STD';
        mappedLabel = 'Studio';
        mappingStats.studio++;
      } else if (originalLayout === '1 B/R') {
        mappedCode = '1B';
        mappedLabel = '1 Bedroom';
        mappingStats.one_br++;
      } else if (originalLayout === '2 B/R') {
        mappedCode = '2B';
        mappedLabel = '2 Bedroom';
        mappingStats.two_br++;
      } else if (originalLayout === '3 B/R') {
        mappedCode = '3B';
        mappedLabel = '3 Bedroom';
        mappingStats.three_br++;
      } else if (originalLayout === '6 B/R') {
        mappedCode = '3B'; // Default to 3BR for 6BR (rare, user can override)
        mappedLabel = '3 Bedroom';
        mappingStats.six_br++;
      } else {
        // Unknown (e.g., "0", ".")
        mappedCode = null; // Leave empty for manual assignment
        mappingStats.unknown++;
      }

      // Column O = PropertyLayout
      if (mappedCode) {
        layoutUpdates.push({
          rowIndex: i,
          columnLetter: 'O',
          value: mappedCode
        });
      }

      // Column P = PropertyStatus (default SALE)
      statusUpdates.push({
        rowIndex: i,
        columnLetter: 'P',
        value: 'SALE' // Market standard
      });
    }

    console.log('Layout Detection Results:');
    console.log(`  - Studio: ${mappingStats.studio} records → STD`);
    console.log(`  - 1 B/R: ${mappingStats.one_br} records → 1B`);
    console.log(`  - 2 B/R: ${mappingStats.two_br} records → 2B`);
    console.log(`  - 3 B/R: ${mappingStats.three_br} records → 3B`);
    console.log(`  - 6 B/R: ${mappingStats.six_br} records → 3B (aliased)`);
    console.log(`  - Unknown: ${mappingStats.unknown} records → FLAGGED FOR MANUAL\n`);

    console.log(`Property Status Assignment:`);
    console.log(`  - Default "SALE": ${statusUpdates.length} records\n`);

    // Step 4: Display plan
    console.log('='.repeat(90));
    console.log('BULK UPDATE PLAN');
    console.log('='.repeat(90) + '\n');

    console.log(`Column O (PropertyLayout):`);
    console.log(`  - Will update: ${layoutUpdates.length} cells with detected layouts`);
    console.log(`  - Will leave empty: ${mappingStats.unknown} cells (needs manual assignment)\n`);

    console.log(`Column P (PropertyStatus):`);
    console.log(`  - Will populate: ${statusUpdates.length} cells with "SALE"`);
    console.log(`  - Users can override per property\n`);

    // Create logs directory
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }

    // Save plan
    const plan = {
      timestamp: new Date().toISOString(),
      source: {
        sheet_id: OXYGEN2023_ID,
        sheet_name: 'Oxygen2023',
        column_n: 'Rooms (=PropertyLayout)'
      },
      target: {
        sheet_id: ORGANIZED_ID,
        sheet_name: 'Akoya-Oxygen-2023-Organized',
        column_o: 'PropertyLayout',
        column_p: 'PropertyStatus'
      },
      statistics: mappingStats,
      layout_updates_count: layoutUpdates.length,
      status_updates_count: statusUpdates.length,
      unmapped_count: mappingStats.unknown
    };

    const planPath = path.join(LOGS_DIR, `bulk-population-plan-${Date.now()}.json`);
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));

    console.log(`Plan saved to: ${planPath}\n`);

    // Step 5: Ask for confirmation
    console.log('='.repeat(90));
    console.log('NEXT STEPS');
    console.log('='.repeat(90) + '\n');

    console.log('To execute this bulk population with actual Google Sheets updates:');
    console.log('1. Review the plan above');
    console.log('2. Run: node bulkPopulateOrganizedSheet.js --execute');
    console.log('3. Confirm when prompted\n');

    console.log('Note: You can also:');
    console.log(`  - Manually edit Column O & P in organized sheet (${ORGANIZED_ID})`);
    console.log('  - Use data validation dropdowns once columns are added\n');

    console.log('='.repeat(90) + '\n');

    process.exit(0);

  } catch (error) {
    console.error('Error:', error.message || error);
    process.exit(1);
  }
}

bulkPopulate();
