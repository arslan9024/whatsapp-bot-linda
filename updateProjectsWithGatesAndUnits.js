/**
 * updateProjectsWithGatesAndUnits.js
 * 
 * Updates Projects tab with:
 * 1. Gate Number column (inserted after Project Name)
 * 2. Total Units calculated from Sheet1 data
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEYS_PATH = path.join(__dirname, './code/GoogleAPI/keys.json');
const ORGANIZED_ID = '1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk';

async function updateProjectsWithGatesAndUnits() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('UPDATING PROJECTS TAB: GATE NUMBERS & UNIT COUNTS');
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

    // Step 1: Read all Sheet1 data to count units per project
    console.log('📖 Step 1: Reading Sheet1 to count units per project...\n');

    const sheet1Data = await sheets.spreadsheets.values.get({
      spreadsheetId: ORGANIZED_ID,
      range: 'Sheet1!D:D',
      auth: jwtClient
    });

    const columnD = sheet1Data.data.values || [];
    const projectEntries = columnD.slice(1).map(row => row[0]?.trim()).filter(Boolean);

    console.log(`  Total rows in Sheet1: ${projectEntries.length}`);

    // Count units per project
    const projectUnitsMap = {};
    projectEntries.forEach(projectName => {
      projectUnitsMap[projectName] = (projectUnitsMap[projectName] || 0) + 1;
    });

    console.log(`  Counted units for ${Object.keys(projectUnitsMap).length} unique projects\n`);

    // Step 2: Read current Projects tab
    console.log('📋 Step 2: Reading current Projects tab...\n');

    const projectsData = await sheets.spreadsheets.values.get({
      spreadsheetId: ORGANIZED_ID,
      range: 'Projects!A:I',
      auth: jwtClient
    });

    const projectsRows = projectsData.data.values || [];
    const currentHeaders = projectsRows[0] || [];
    const projectDataRows = projectsRows.slice(1);

    console.log(`  Found ${projectDataRows.length} projects in current tab\n`);

    // Step 3: Build updated projects with new structure (Gate Number + Units)
    console.log('🔧 Step 3: Building updated records with Gate Numbers...\n');

    const newHeaders = [
      'Project Code',
      'Project Name',
      'Gate Number',      // NEW - Column C
      'Location',
      'Developer',
      'Status',
      'Start Date',
      'Completion Date',
      'Total Units'
    ];

    const updatedProjects = [];

    projectDataRows.forEach((row, index) => {
      const projectCode = row[0];      // Column A: PJ###
      const projectName = row[1];      // Column B: Project Name
      const gateNumber = String(index + 1);  // Column C: Gate Number (1, 2, 3, ...)
      const location = row[2] || '';   // Column D: Location
      const developer = row[3] || '';  // Column E: Developer
      const status = row[4] || 'Active'; // Column F: Status
      const startDate = row[5] || '';  // Column G: Start Date
      const completionDate = row[6] || ''; // Column H: Completion Date
      
      // Get actual unit count from Sheet1
      const totalUnits = projectUnitsMap[projectName] || 0;

      updatedProjects.push([
        projectCode,
        projectName,
        gateNumber,         // NEW
        location,
        developer,
        status,
        startDate,
        completionDate,
        String(totalUnits)  // UPDATED with actual count
      ]);

      const bar = '█'.repeat(Math.min(Math.ceil(totalUnits / 100), 40));
      console.log(`  ${projectCode}: Gate ${gateNumber} | ${totalUnits} units ${bar}`);
    });

    console.log('');

    // Step 4: Get Projects sheet ID
    console.log('🔄 Step 4: Updating Projects tab in Google Sheets...\n');

    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: ORGANIZED_ID,
      auth: jwtClient
    });

    const projectsSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Projects');
    if (!projectsSheet) {
      throw new Error('Projects tab not found');
    }

    const projectsSheetId = projectsSheet.properties.sheetId;

    // Clear the entire sheet
    const clearRequest = {
      updateCells: {
        range: {
          sheetId: projectsSheetId,
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

    // Add new headers with formatting
    const headerRequest = {
      updateCells: {
        range: {
          sheetId: projectsSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: newHeaders.length
        },
        rows: [{
          values: newHeaders.map(header => ({
            userEnteredValue: { stringValue: header },
            userEnteredFormat: {
              backgroundColor: { red: 0.2, green: 0.2, blue: 0.4 },
              textFormat: {
                bold: true,
                foregroundColor: { red: 1, green: 1, blue: 1 }
              },
              horizontalAlignment: 'CENTER'
            }
          }))
        }],
        fields: 'userEnteredValue,userEnteredFormat'
      }
    };

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: ORGANIZED_ID,
      requestBody: { requests: [headerRequest] },
      auth: jwtClient
    });

    console.log('  ✓ Added new headers with formatting');

    // Add updated project data
    await sheets.spreadsheets.values.update({
      spreadsheetId: ORGANIZED_ID,
      range: `Projects!A2`,
      valueInputOption: 'RAW',
      requestBody: { values: updatedProjects },
      auth: jwtClient
    });

    console.log(`  ✓ Updated ${updatedProjects.length} projects with new structure\n`);

    // Step 5: Calculate statistics
    console.log('📊 Step 5: Calculating statistics...\n');

    const totalUnits = updatedProjects.reduce((sum, row) => sum + parseInt(row[8] || 0), 0);
    const projectsWithUnits = updatedProjects.filter(r => parseInt(r[8] || 0) > 0).length;
    const projectsWithoutUnits = updatedProjects.filter(r => parseInt(r[8] || 0) === 0).length;

    // Step 6: Create detailed report
    console.log('📝 Step 6: Creating detailed project report...\n');

    const detailedReport = {
      timestamp: new Date().toISOString(),
      summary: {
        totalProjects: updatedProjects.length,
        totalUnits: totalUnits,
        projectsWithUnits: projectsWithUnits,
        projectsWithoutUnits: projectsWithoutUnits,
        averageUnitsPerProject: Math.round(totalUnits / updatedProjects.length)
      },
      projects: updatedProjects.map((row, idx) => ({
        projectCode: row[0],
        projectName: row[1],
        gateNumber: row[2],
        location: row[3],
        developer: row[4],
        status: row[5],
        startDate: row[6],
        completionDate: row[7],
        totalUnits: parseInt(row[8] || 0)
      })),
      unitDistribution: updatedProjects
        .map((row, idx) => ({
          projectCode: row[0],
          projectName: row[1],
          gateNumber: row[2],
          units: parseInt(row[8] || 0)
        }))
        .sort((a, b) => b.units - a.units)
    };

    const reportPath = path.join(__dirname, './PROJECT_DETAILED_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));

    console.log(`  ✓ Saved to PROJECT_DETAILED_REPORT.json\n`);

    // Step 7: Display summary
    console.log('='.repeat(80));
    console.log('✅ PROJECTS TAB SUCCESSFULLY UPDATED');
    console.log('='.repeat(80) + '\n');

    console.log('📊 NEW COLUMN STRUCTURE:\n');
    newHeaders.forEach((header, idx) => {
      const column = String.fromCharCode(65 + idx);
      console.log(`  Column ${column}: ${header}`);
    });

    console.log('\n📋 SAMPLE DATA (First 5 Projects):\n');
    updatedProjects.slice(0, 5).forEach((row, idx) => {
      console.log(`  ${String(idx + 1).padStart(2)}. ${row[0]}: ${row[1]}`);
      console.log(`      Gate: ${row[2]} | Location: ${row[3]} | Units: ${row[8]}\n`);
    });

    console.log('📈 STATISTICS:\n');
    console.log(`  Total Projects:              ${updatedProjects.length}`);
    console.log(`  Total Units:                 ${totalUnits}`);
    console.log(`  Average Units per Project:   ${Math.round(totalUnits / updatedProjects.length)}`);
    console.log(`  Projects with Units:         ${projectsWithUnits}`);
    console.log(`  Projects without Units:      ${projectsWithoutUnits}\n`);

    // Top projects by units
    console.log('🏢 TOP 10 PROJECTS BY UNITS:\n');
    
    detailedReport.unitDistribution.slice(0, 10).forEach((item, idx) => {
      const barLength = Math.ceil(item.units / 100);
      const bar = '█'.repeat(Math.min(barLength, 45));
      console.log(`  ${String(idx + 1).padStart(2)}. ${item.projectCode} (Gate ${item.gateNumber}): ${item.projectName}`);
      console.log(`      ${String(item.units).padStart(5)} units ${bar}\n`);
    });

    if (detailedReport.unitDistribution.length > 10) {
      console.log(`  ... and ${detailedReport.unitDistribution.length - 10} more projects\n`);
    }

    console.log('='.repeat(80));
    console.log('CHANGES MADE');
    console.log('='.repeat(80) + '\n');

    console.log('✅ Added NEW Column C: "Gate Number"');
    console.log('   • Sequential numbers 1-30');
    console.log('   • Inserted between Project Name and Location');
    console.log('   • Represents the gate/identification number for each project\n');

    console.log('✅ Updated Column I: "Total Units"');
    console.log('   • Calculated actual unit count from Sheet1');
    console.log('   • Counts how many properties belong to each project');
    console.log(`   • Total: ${totalUnits} units across all projects\n`);

    console.log('📌 Reference Files:');
    console.log('   • PROJECT_DETAILED_REPORT.json - Complete project data with statistics\n');

    console.log('👉 NEXT STEPS:');
    console.log('   1. View Projects tab to verify all changes');
    console.log('   2. Update Properties - Projects Link tab (if needed)');
    console.log('   3. Verify gate numbers match expected sequence\n');

    process.exit(0);

  } catch (error) {
    console.error('\n✗ Error:', error.message || error);
    if (error.code) console.error('Code:', error.code);
    process.exit(1);
  }
}

updateProjectsWithGatesAndUnits();
