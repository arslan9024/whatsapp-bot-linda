/**
 * populateProjectsTab.js
 * 
 * Extracts unique projects from column D (Sheet1)
 * Assigns project codes (PJ001, PJ002, etc.)
 * Assigns project numbers
 * Populates the Projects tab
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEYS_PATH = path.join(__dirname, './code/GoogleAPI/keys.json');
const ORGANIZED_ID = '1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk';

async function populateProjectsTab() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('POPULATING PROJECTS TAB FROM COLUMN D');
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

    // Step 1: Read column D from Sheet1
    console.log('📖 Step 1: Reading column D from Sheet1...\n');

    const sheet1Data = await sheets.spreadsheets.values.get({
      spreadsheetId: ORGANIZED_ID,
      range: 'Sheet1!D:D',
      auth: jwtClient
    });

    const columnD = sheet1Data.data.values || [];
    const projectHeader = columnD[0]?.[0] || 'Project';
    const projectValues = columnD.slice(1).map(row => row[0]?.trim()).filter(Boolean);

    console.log(`  Found ${projectValues.length} project entries in column D`);
    console.log(`  Sample entries: ${projectValues.slice(0, 5).join(', ')}\n`);

    // Step 2: Extract unique projects
    console.log('🔍 Step 2: Extracting unique projects...\n');

    const projectsMap = {};
    const uniqueProjects = [];

    projectValues.forEach((project, index) => {
      if (project && !projectsMap[project]) {
        projectsMap[project] = true;
        uniqueProjects.push(project);
      }
    });

    console.log(`  Found ${uniqueProjects.length} unique projects\n`);
    if (uniqueProjects.length > 0) {
      uniqueProjects.forEach((p, i) => {
        console.log(`    ${i + 1}. ${p}`);
      });
    }
    console.log('');

    // Step 3: Assign codes and create project records
    console.log('📝 Step 3: Creating project records with codes...\n');

    const projectRecords = [];

    uniqueProjects.forEach((projectName, index) => {
      const projectCode = `PJ${String(index + 1).padStart(3, '0')}`; // PJ001, PJ002, etc.
      const projectNumber = index + 1; // 1, 2, 3, etc.

      projectRecords.push([
        projectCode,                    // Project Code
        projectName,                    // Project Name
        '',                            // Location (empty for now)
        '',                            // Developer (empty for now)
        'Active',                      // Status (default to Active)
        '',                            // Start Date
        '',                            // Completion Date
        String(projectNumber)          // Units Total (using project number as placeholder)
      ]);

      console.log(`  ${projectCode}: ${projectName} (${projectNumber})`);
    });

    console.log('');

    // Step 4: Clear existing Projects tab and add new data
    console.log('🔄 Step 4: Updating Projects tab...\n');

    // Get the Projects sheet ID
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: ORGANIZED_ID,
      auth: jwtClient
    });

    const projectsSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Projects');
    if (!projectsSheet) {
      throw new Error('Projects tab not found');
    }

    const projectsSheetId = projectsSheet.properties.sheetId;

    // Clear the sheet (rows 2 and beyond)
    const clearRequest = {
      updateCells: {
        range: {
          sheetId: projectsSheetId,
          startRowIndex: 1
        },
        fields: 'userEnteredValue'
      }
    };

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: ORGANIZED_ID,
      requestBody: { requests: [clearRequest] },
      auth: jwtClient
    });

    console.log('  ✓ Cleared existing data');

    // Upload new project data
    if (projectRecords.length > 0) {
      const uploadRequest = {
        range: `Projects!A2`,
        values: projectRecords
      };

      await sheets.spreadsheets.values.update({
        spreadsheetId: ORGANIZED_ID,
        range: uploadRequest.range,
        valueInputOption: 'RAW',
        requestBody: { values: projectRecords },
        auth: jwtClient
      });

      console.log(`  ✓ Added ${projectRecords.length} projects to Projects tab\n`);
    }

    // Step 5: Create a mapping file for reference
    console.log('📊 Step 5: Creating project mapping reference...\n');

    const projectMapping = {
      timestamp: new Date().toISOString(),
      totalProjects: uniqueProjects.length,
      projects: projectRecords.map(record => ({
        projectCode: record[0],
        projectNumber: record[7],
        projectName: record[1],
        status: record[4]
      }))
    };

    const mappingPath = path.join(__dirname, './PROJECT_MAPPING.json');
    fs.writeFileSync(mappingPath, JSON.stringify(projectMapping, null, 2));

    console.log(`  ✓ Saved project mapping to PROJECT_MAPPING.json\n`);

    // Step 6: Display summary
    console.log('='.repeat(80));
    console.log('✅ PROJECTS TAB POPULATED SUCCESSFULLY');
    console.log('='.repeat(80) + '\n');

    console.log('📊 SUMMARY:\n');
    console.log(`  Total Projects Found: ${uniqueProjects.length}`);
    console.log(`  Code Format: PJ### (PJ001, PJ002, etc.)\n`);

    console.log('📋 PROJECT LIST:\n');
    projectRecords.forEach((record, index) => {
      console.log(`  ${index + 1}. ${record[0]}: ${record[1]}`);
      console.log(`     Status: ${record[4]}`);
      console.log(`     Project Number: ${record[7]}\n`);
    });

    console.log('='.repeat(80));
    console.log('NEXT STEPS');
    console.log('='.repeat(80) + '\n');

    console.log('✓ Projects tab has been populated with:');
    console.log('  • Project codes (PJ###)');
    console.log('  • Project names from column D');
    console.log('  • Project numbers');
    console.log('  • Status (defaulted to Active)\n');

    console.log('💡 The Projects tab now contains ' + uniqueProjects.length + ' unique projects');
    console.log('📌 Reference file saved: PROJECT_MAPPING.json\n');

    console.log('👉 Next: Update Properties - Projects Link tab to use these project codes\n');

    process.exit(0);

  } catch (error) {
    console.error('\n✗ Error:', error.message || error);
    if (error.code) console.error('Code:', error.code);
    process.exit(1);
  }
}

populateProjectsTab();
