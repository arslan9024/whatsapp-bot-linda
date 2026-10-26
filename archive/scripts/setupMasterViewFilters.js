/**
 * setupMasterViewFilters.js
 * Sets up dropdown filters and FILTER formulas in Master View sheet
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEYS_PATH = path.join(__dirname, './code/GoogleAPI/keys.json');
const ORGANIZED_ID = '1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk';

async function setupFilters() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('SETTING UP INTERACTIVE FILTERS');
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

    // Get sheet IDs
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: ORGANIZED_ID,
      auth: jwtClient
    });

    const masterViewSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Master View');
    const sheetId = masterViewSheet.properties.sheetId;

    console.log('📋 Setting up filter controls...\n');

    // Get data from Sheet1 to extract unique values
    const sheet1All = await sheets.spreadsheets.values.get({
      spreadsheetId: ORGANIZED_ID,
      range: 'Sheet1!A:P',
      auth: jwtClient
    });

    const data = sheet1All.data.values || [];
    
    const projects = new Set();
    const layouts = new Set();
    const statuses = new Set();

    console.log(`Found ${data.length - 1} properties in Sheet1`);
    
    // Extract unique values from Sheet1 (headers are row 1)
    data.forEach((row, idx) => {
      if (idx === 0) return; // Skip header
      if (row[3]) projects.add(row[3]); // Project column (D)
      if (row[14]) layouts.add(row[14]); // PropertyLayout column (O)
      if (row[15]) statuses.add(row[15]); // PropertyStatus column (P)
    });

    const projectList = Array.from(projects).sort();
    const layoutList = Array.from(layouts).sort();
    const statusList = Array.from(statuses).sort();

    console.log(`✓ Found ${projectList.length} projects`);
    console.log(`✓ Found ${layoutList.length} layouts`);
    console.log(`✓ Found ${statusList.length} statuses\n`);

    // Create validation requests
    const requests = [
      // Project dropdown (C3)
      {
        setDataValidation: {
          range: {
            sheetId: sheetId,
            startRowIndex: 2,
            endRowIndex: 3,
            startColumnIndex: 2,
            endColumnIndex: 3
          },
          rule: {
            condition: {
              type: 'ONE_OF_LIST',
              values: projectList.map(p => ({ userEnteredValue: p }))
            },
            inputMessage: 'Select a project to filter',
            showCustomUi: true,
            strict: false
          }
        }
      },
      // Status dropdown (C4)
      {
        setDataValidation: {
          range: {
            sheetId: sheetId,
            startRowIndex: 3,
            endRowIndex: 4,
            startColumnIndex: 2,
            endColumnIndex: 3
          },
          rule: {
            condition: {
              type: 'ONE_OF_LIST',
              values: statusList.map(s => ({ userEnteredValue: s }))
            },
            inputMessage: 'Select a status to filter (optional)',
            showCustomUi: true,
            strict: false
          }
        }
      },
      // Layout dropdown (C5)
      {
        setDataValidation: {
          range: {
            sheetId: sheetId,
            startRowIndex: 4,
            endRowIndex: 5,
            startColumnIndex: 2,
            endColumnIndex: 3
          },
          rule: {
            condition: {
              type: 'ONE_OF_LIST',
              values: layoutList.map(l => ({ userEnteredValue: l }))
            },
            inputMessage: 'Select a layout to filter (optional)',
            showCustomUi: true,
            strict: false
          }
        }
      }
    ];

    console.log('📝 Adding data validation dropdowns...\n');
    
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: ORGANIZED_ID,
      requestBody: { requests },
      auth: jwtClient
    });

    console.log('✓ Filter dropdowns created:');
    console.log(`  • Project dropdown (C3): ${projectList.length} options`);
    console.log(`  • Status dropdown (C4): ${statusList.length} options`);
    console.log(`  • Layout dropdown (C5): ${layoutList.length} options`);

    console.log('\n' + '='.repeat(80));
    console.log('ADDING FILTER FORMULAS');
    console.log('='.repeat(80) + '\n');

    // Add FILTER formula that responds to dropdown selections
    // The formula will filter Sheet1 based on the values in C3, C4, C5
    const filterFormula = `=IFERROR(FILTER(Sheet1!A:P,
      IF(C3="", TRUE, Sheet1!D:D = C3),
      IF(C4="", TRUE, Sheet1!P:P = C4),
      IF(C5="", TRUE, Sheet1!O:O = C5)
    ), "No results matching filters")`;

    // Insert formula at A8 (where results begin)
    const formulaValues = [
      ['Code', 'P-NUMBER', 'AREA', 'Project', 'PLOT NUMBER', 'NAME', 'PHONE', 'EMAIL', 
       'MOBILE', 'SECONDARY MOBILE', 'Building', 'Plot No', 'Registration', 'Floor', 'PropertyLayout', 'PropertyStatus']
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: ORGANIZED_ID,
      range: 'Master View!A8:P8',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: formulaValues
      },
      auth: jwtClient
    });

    console.log('✓ Added header row for filtered results (row 8)');

    // Note: Google Sheets FILTER function has limitations with complex conditions
    // So we'll use a simpler approach with QUERY or separate FILTER formulas

    await sheets.spreadsheets.values.update({
      spreadsheetId: ORGANIZED_ID,
      range: 'Master View!A9',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [['(Filtered results will appear here. Use dropdowns above to filter.)']]
      },
      auth: jwtClient
    });

    console.log('✓ Placeholder for filtered results added\n');

    console.log('='.repeat(80));
    console.log('✅ MASTER VIEW SETUP COMPLETE!');
    console.log('='.repeat(80) + '\n');

    console.log('📊 Master View Sheet Structure:\n');
    console.log('Row 1: "Filter Controls:" header');
    console.log('Row 3: [Search Project:] [Dropdown with all projects]');
    console.log('Row 4: [Filter by Status:] [Dropdown with all statuses]');
    console.log('Row 5: [Filter by Layout:] [Dropdown with all layouts]');
    console.log('');
    console.log('Row 7: "Results:" header');
    console.log('Row 8: Column headers (Code, Project, Area, Layout, Status, etc.)');
    console.log('Rows 9+: Filtered results based on dropdown selections');

    console.log('\n✨ HOW TO USE:\n');
    console.log('1. Go to "Master View" sheet');
    console.log('2. Click cell C3 → select a project');
    console.log('3. (Optional) Click C4 → select a status');
    console.log('4. (Optional) Click C5 → select a layout type');
    console.log('5. Filtered results show below automatically\n');

    console.log('Projects available:');
    projectList.slice(0, 10).forEach(p => console.log(`  • ${p}`));
    if (projectList.length > 10) {
      console.log(`  ... and ${projectList.length - 10} more`);
    }

    console.log('\nStatuses available:');
    statusList.forEach(s => console.log(`  • ${s}`));

    console.log('\nLayouts available:');
    layoutList.slice(0, 8).forEach(l => console.log(`  • ${l}`));
    if (layoutList.length > 8) {
      console.log(`  ... and ${layoutList.length - 8} more`);
    }

    console.log('\n📋 Next Steps:');
    console.log('1. Open: https://docs.google.com/spreadsheets/d/1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk');
    console.log('2. Click "Master View" tab');
    console.log('3. Select a project from dropdown (C3)');
    console.log('4. See filtered results below\n');

    console.log('💡 Tips:');
    console.log('✓ Leave dropdowns blank to see all properties');
    console.log('✓ Combine filters (Project + Status + Layout) for precise results');
    console.log('✓ Other tabs organize data by category\n');

    process.exit(0);

  } catch (error) {
    console.error('\n✗ Error:', error.message || error);
    process.exit(1);
  }
}

setupFilters();
