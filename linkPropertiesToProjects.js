/**
 * linkPropertiesToProjects.js
 * 
 * Links properties from Sheet1 to projects:
 * - Reads each property and its project from Sheet1
 * - Assigns property codes (P001, P002, etc.)
 * - Maps to project codes (PJ###)
 * - Populates Properties - Projects Link tab
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEYS_PATH = path.join(__dirname, './code/GoogleAPI/keys.json');
const ORGANIZED_ID = '1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk';

async function linkPropertiesToProjects() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('LINKING PROPERTIES TO PROJECTS');
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

    // Step 1: Read Projects tab to create project name → code mapping
    console.log('📖 Step 1: Reading Projects tab...\n');

    const projectsData = await sheets.spreadsheets.values.get({
      spreadsheetId: ORGANIZED_ID,
      range: 'Projects!A:B',
      auth: jwtClient
    });

    const projectsRows = projectsData.data.values || [];
    const projectNameToCodeMap = {};

    projectsRows.slice(1).forEach(row => {
      const projectCode = row[0];   // PJ###
      const projectName = row[1];   // Project name
      if (projectCode && projectName) {
        projectNameToCodeMap[projectName] = projectCode;
      }
    });

    console.log(`  ✓ Loaded ${Object.keys(projectNameToCodeMap).length} projects\n`);

    // Step 2: Read all data from Sheet1
    console.log('📊 Step 2: Reading Sheet1 data...\n');

    const sheet1Data = await sheets.spreadsheets.values.get({
      spreadsheetId: ORGANIZED_ID,
      range: 'Sheet1!A:E',
      auth: jwtClient
    });

    const sheet1Rows = sheet1Data.data.values || [];
    const headers = sheet1Rows[0];
    const dataRows = sheet1Rows.slice(1);

    console.log(`  ✓ Found ${dataRows.length} properties in Sheet1\n`);

    // Step 3: Create property-to-project links
    console.log('🔗 Step 3: Creating property-to-project links...\n');

    const propertyLinks = [];
    const projectStats = {};

    dataRows.forEach((row, index) => {
      const propertyCode = `P${String(index + 1).padStart(5, '0')}`; // P00001, P00002, etc.
      const projectName = row[3]?.trim() || '';  // Column D: Project
      const projectCode = projectNameToCodeMap[projectName] || 'UNKNOWN';
      const ownerName = row[4]?.trim() || '';    // Column E: Owner

      // Find or create contact code (for now, we'll use placeholder)
      const contactCode = ''; // Will be linked later

      propertyLinks.push([
        propertyCode,       // Property Code
        projectCode,        // Project Code
        contactCode,        // Contact Code (Owner)
        '',                 // Contact Code (Agent)
        new Date().toISOString().split('T')[0], // Date Listed
        ''                  // Special Notes
      ]);

      // Track stats
      if (!projectStats[projectCode]) {
        projectStats[projectCode] = 0;
      }
      projectStats[projectCode]++;

      if ((index + 1) % 1000 === 0) {
        console.log(`  Processed ${index + 1} properties...`);
      }
    });

    console.log(`\n  ✓ Created ${propertyLinks.length} property-to-project links\n`);

    // Step 4: Get Properties - Projects Link sheet ID
    console.log('🔄 Step 4: Updating Properties - Projects Link tab...\n');

    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: ORGANIZED_ID,
      auth: jwtClient
    });

    const linkSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Properties - Projects Link');
    if (!linkSheet) {
      throw new Error('Properties - Projects Link tab not found');
    }

    const linkSheetId = linkSheet.properties.sheetId;

    // Clear existing data
    const clearRequest = {
      updateCells: {
        range: {
          sheetId: linkSheetId,
          startRowIndex: 0
        },
        fields: 'userEnteredValue,userEnteredFormat'
      }
    };

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: ORGANIZED_ID,
      requestBody: { requests: [clearRequest] },
      auth: jwtClient
    });

    console.log('  ✓ Cleared existing content');

    // Add headers
    const headerRequest = {
      updateCells: {
        range: {
          sheetId: linkSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 6
        },
        rows: [{
          values: [
            { userEnteredValue: { stringValue: 'Property Code' }, userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.2, blue: 0.4 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, horizontalAlignment: 'CENTER' } },
            { userEnteredValue: { stringValue: 'Project Code' }, userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.2, blue: 0.4 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, horizontalAlignment: 'CENTER' } },
            { userEnteredValue: { stringValue: 'Contact Code (Owner)' }, userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.2, blue: 0.4 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, horizontalAlignment: 'CENTER' } },
            { userEnteredValue: { stringValue: 'Contact Code (Agent)' }, userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.2, blue: 0.4 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, horizontalAlignment: 'CENTER' } },
            { userEnteredValue: { stringValue: 'Date Listed' }, userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.2, blue: 0.4 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, horizontalAlignment: 'CENTER' } },
            { userEnteredValue: { stringValue: 'Special Notes' }, userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.2, blue: 0.4 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, horizontalAlignment: 'CENTER' } }
          ]
        }],
        fields: 'userEnteredValue,userEnteredFormat'
      }
    };

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: ORGANIZED_ID,
      requestBody: { requests: [headerRequest] },
      auth: jwtClient
    });

    console.log('  ✓ Added headers');

    // Upload property links in batches
    const batchSize = 5000;
    for (let i = 0; i < propertyLinks.length; i += batchSize) {
      const batch = propertyLinks.slice(i, i + batchSize);
      const startRow = i / batchSize === 0 ? 2 : i + 2;

      await sheets.spreadsheets.values.update({
        spreadsheetId: ORGANIZED_ID,
        range: `'Properties - Projects Link'!A${startRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: batch },
        auth: jwtClient
      });

      console.log(`  ✓ Uploaded ${Math.min(i + batchSize, propertyLinks.length)}/${propertyLinks.length} links`);
    }

    console.log('');

    // Step 5: Display summary
    console.log('='.repeat(80));
    console.log('✅ PROPERTIES LINKED TO PROJECTS');
    console.log('='.repeat(80) + '\n');

    console.log('📊 LINKING SUMMARY:\n');
    console.log(`  Total Properties Linked:     ${propertyLinks.length}`);
    console.log(`  Total Projects:              ${Object.keys(projectStats).length}\n`);

    console.log('📈 UNITS PER PROJECT:\n');

    const sortedProjects = Object.entries(projectStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    sortedProjects.forEach((entry, idx) => {
      const [projectCode, count] = entry;
      const bar = '█'.repeat(Math.min(Math.ceil(count / 100), 40));
      console.log(`  ${String(idx + 1).padStart(2)}. ${projectCode}: ${String(count).padStart(5)} units ${bar}`);
    });

    console.log(`\n  ... and ${Math.max(0, Object.keys(projectStats).length - 10)} more projects\n`);

    // Step 6: Create detailed link report
    console.log('📝 Step 5: Creating link report...\n');

    const linkReport = {
      timestamp: new Date().toISOString(),
      summary: {
        totalPropertiesLinked: propertyLinks.length,
        totalProjects: Object.keys(projectStats).length,
        unitsPerProject: projectStats
      },
      codeRanges: {
        propertyCodeRange: `P00001 to P${String(propertyLinks.length).padStart(5, '0')}`,
        projectCodeRange: 'PJ001 to PJ030'
      },
      sampleLinks: propertyLinks.slice(0, 10)
    };

    const reportPath = path.join(__dirname, './PROPERTY_PROJECT_LINKS_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(linkReport, null, 2));

    console.log(`  ✓ Saved to PROPERTY_PROJECT_LINKS_REPORT.json\n`);

    // Step 7: Display sample data
    console.log('📋 SAMPLE LINKS (First 5 Properties):\n');
    propertyLinks.slice(0, 5).forEach((link, idx) => {
      console.log(`  ${idx + 1}. ${link[0]} → ${link[1]} | Listed: ${link[4]}`);
    });

    console.log('\n='.repeat(80));
    console.log('PROPERTIES AND PROJECTS LINKED');
    console.log('='.repeat(80) + '\n');

    console.log('✅ Properties - Projects Link tab populated with:');
    console.log(`  • ${propertyLinks.length} property codes (P00001-P${String(propertyLinks.length).padStart(5, '0')})`);
    console.log(`  • Project code mapping (PJ001-PJ030)`);
    console.log('  • Date listed information');
    console.log('  • Ready for contact code linking\n');

    console.log('📌 Code Format:');
    console.log(`  • Properties: P00001 (5-digit sequential)`);
    console.log(`  • Projects: PJ001-PJ030 (from Projects tab)`);
    console.log(`  • Contacts: C### (to be populated next)\n`);

    console.log('👉 NEXT STEPS:');
    console.log('   1. Link Properties to Contacts (extract from owner data)');
    console.log('   2. Populate remaining tabs with property details');
    console.log('   3. Set up Master View with all relationships\n');

    process.exit(0);

  } catch (error) {
    console.error('\n✗ Error:', error.message || error);
    if (error.code) console.error('Code:', error.code);
    process.exit(1);
  }
}

linkPropertiesToProjects();
