/**
 * Akoya-Oxygen-2023 Sheet Organizer - Main Execution Script
 * 
 * Creates organized version of Akoya-Oxygen-2023-Arslan-only sheet
 * 
 * Usage: node organizeAkoyaSheet.js
 */

import 'dotenv/config';
import SheetOrganizer from './code/Services/SheetOrganizer.js';
import { MyProjectsWMN } from './code/MyProjects/MyProjectsWMN.js';
import { google } from 'googleapis';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

async function main() {
  try {
    console.clear();
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   AKOYA-OXYGEN-2023-ARSLAN SHEET ORGANIZER                ║');
    console.log('║   Creating Interactive Data Viewer Version                ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Step 1: Find original sheet
    console.log('📋 Step 1: Locating original sheet...\n');
    const project = MyProjectsWMN.find(
      p => p.ProjectName === 'Akoya-Oxygen-2023-Arslan-only'
    );

    if (!project) {
      throw new Error('❌ Sheet "Akoya-Oxygen-2023-Arslan-only" not found in MyProjectsWMN.js');
    }

    console.log(`✅ Found: ${project.ProjectName}`);
    console.log(`📄 Sheet ID: ${project.ProjectSheetID}\n`);

    // Step 2: Setup Google Auth
    console.log('🔐 Step 2: Setting up Google authentication...\n');
    const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || './code/GoogleAPI/keys.json';
    
    if (!credentialsPath) {
      throw new Error('❌ GOOGLE_CREDENTIALS_PATH not set in .env');
    }

    let credentials;
    try {
      credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));
      console.log(`✅ Credentials loaded from: ${credentialsPath}\n`);
    } catch (error) {
      throw new Error(`❌ Failed to load credentials: ${error.message}`);
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
      ],
    });

    // Step 3: Organize sheet
    console.log('🔄 Step 3: Organizing sheet...\n');
    console.log('   This will:');
    console.log('   • Read original sheet data');
    console.log('   • Create new organized sheet');
    console.log('   • Add 3 tabs (Data Viewer, Organized Data, Metadata)');
    console.log('   • Populate with formatted data\n');
    console.log('   ⏳ Processing...\n');

    const result = await SheetOrganizer.organizeSheet({
      originalSheetId: project.ProjectSheetID,
      originalProjectName: project.ProjectName,
      newSheetName: 'Akoya-Oxygen-2023-Arslan-Organized',
      auth,
    });

    // Step 4: Display results
    console.log('\n✅ SHEET ORGANIZATION COMPLETE!\n');
    console.log('📊 Results:\n');
    console.log(`   Original Sheet: ${project.ProjectSheetID}`);
    console.log(`   New Sheet: ${result.newSheetId}`);
    console.log(`   Total Data Rows: ${result.dataRows}`);
    console.log(`   Total Columns: ${result.columns}\n`);

    // Step 5: Create entry for MyProjects.js
    console.log('📝 Step 5: Generating MyProjects.js entry...\n');
    
    const newEntry = {
      ProjectID: 51,
      ProjectName: result.newSheetName,
      ProjectSheetID: result.newSheetId,
    };

    console.log('Add this to MyProjects.js:\n');
    console.log(`{ ProjectID: ${newEntry.ProjectID}, ProjectName: "${newEntry.ProjectName}", ProjectSheetID: "${newEntry.ProjectSheetID}" },\n`);

    // Step 6: Save to file
    const logData = {
      timestamp: new Date().toISOString(),
      status: 'completed',
      result,
      newEntry,
      credentials_used: {
        project_id: credentials.project_id,
        service_account: credentials.client_email,
      },
    };

    // Create logs directory if needed
    mkdirSync('./logs/sheet-organization', { recursive: true });

    const logPath = './logs/sheet-organization/akoya-oxygen-2023-org.json';
    writeFileSync(logPath, JSON.stringify(logData, null, 2));

    console.log(`📄 Full log saved to: ${logPath}\n`);

    // Display instructions
    console.log('\n═════════════════════════════════════════════════════════════');
    console.log('📖 NEXT STEPS:\n');
    console.log('1️⃣  Copy the NewProjectEntry above to code/MyProjects/MyProjects.js');
    console.log('   Location: After the last entry in the MyProjects array\n');
    console.log('2️⃣  Open the new sheet in Google Drive:');
    console.log(`   https://docs.google.com/spreadsheets/d/${result.newSheetId}\n`);
    console.log('3️⃣  Test the Data Viewer tab:');
    console.log('   • Enter a row number in cell B3');
    console.log('   • Check/uncheck columns in the visibility section');
    console.log('   • Selected row data displays below\n');
    console.log('4️⃣  Run this command to update MyProjects.js:');
    console.log('   npm run update-projects\n');
    console.log('═════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ ERROR:\n');
    console.error(error.message);
    console.error('\n📋 Troubleshooting:\n');
    console.error('1. Verify GOOGLE_CREDENTIALS_PATH is set in .env');
    console.error('2. Check credentials file is valid and accessible');
    console.error('3. Ensure service account has Google Sheets API access');
    console.error('4. Verify original sheet ID is correct\n');
    process.exit(1);
  }
}

main();
