/**
 * migrateDataToRelational.js
 * 
 * Phase 2: Migrates data from Sheet1 to relational database
 * - Extracts unique projects → Projects tab
 * - Extracts unique contacts → Contacts tab
 * - Splits properties across all Property tabs
 * - Creates linking data
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEYS_PATH = path.join(__dirname, './code/GoogleAPI/keys.json');
const ORGANIZED_ID = '1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk';

// Column indices from Sheet1
const COLUMNS = {
  PROJECT: 0,     // Column A
  PROPERTY_CODE: 1,    // Column B (like P001)
  PROJECT_CODE: 2,     // Column C (like PJ001)
  ADDRESS: 3,     // Column D
  UNIT_NUMBER: 4, // Column E
  BEDROOMS: 5,    // Column F
  BATHROOMS: 6,   // Column G
  LAYOUT: 7,      // Column H
  FLOOR_PLAN: 8,  // Column I
  SIZE: 9,        // Column J
  STATUS: 10,     // Column K
  PRICE: 11,      // Column L
  RENTAL_RATE: 12,     // Column M
  OWNER_NAME: 13, // Column N
  OWNER_PHONE: 14,     // Column O
  OWNER_EMAIL: 15,     // Column P
  NOTES: 16,      // Column Q
};

async function migrateDataToRelational() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 2: MIGRATING DATA TO RELATIONAL DATABASE');
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

    // Get Sheet1 data
    console.log('📖 Reading Sheet1 data...\n');

    const sheet1Data = await sheets.spreadsheets.values.get({
      spreadsheetId: ORGANIZED_ID,
      range: 'Sheet1!A:Q',
      auth: jwtClient
    });

    const rows = sheet1Data.data.values || [];
    const headers = rows[0];
    const dataRows = rows.slice(1);

    console.log(`✓ Found ${dataRows.length} properties in Sheet1\n`);

    // Extract unique projects
    console.log('📊 Step 1: Extracting unique projects...\n');

    const projectsMap = {};
    const projects = [];

    dataRows.forEach((row, idx) => {
      const projectName = row[COLUMNS.PROJECT]?.trim();
      const projectCode = row[COLUMNS.PROJECT_CODE]?.trim();
      
      if (projectName && projectCode && !projectsMap[projectCode]) {
        projectsMap[projectCode] = true;
        projects.push([
          projectCode,           // Project Code
          projectName,           // Project Name
          '',                    // Location
          '',                    // Developer
          '',                    // Status
          '',                    // Start Date
          '',                    // Completion Date
          ''                     // Units Total
        ]);
      }
    });

    console.log(`  Found ${projects.length} unique projects\n`);
    if (projects.length > 0) {
      console.log('  Sample projects:');
      projects.slice(0, 5).forEach(p => {
        console.log(`    • ${p[0]}: ${p[1]}`);
      });
      if (projects.length > 5) {
        console.log(`    ... and ${projects.length - 5} more`);
      }
    }

    // Extract unique contacts
    console.log('\n📇 Step 2: Extracting unique contacts...\n');

    const contactsMap = {};
    const contacts = [];
    let contactCounter = 1;

    dataRows.forEach((row) => {
      const ownerName = row[COLUMNS.OWNER_NAME]?.trim();
      const ownerPhone = row[COLUMNS.OWNER_PHONE]?.trim();

      if (ownerName) {
        const contactKey = ownerName.toLowerCase().replace(/\s+/g, '');
        
        if (!contactsMap[contactKey]) {
          contactsMap[contactKey] = true;
          const contactCode = `C${String(contactCounter).padStart(3, '0')}`;
          contactCounter++;

          contacts.push([
            contactCode,           // Contact Code
            ownerName,             // Name
            ownerPhone || '',      // Phone
            row[COLUMNS.OWNER_EMAIL]?.trim() || '',  // Email
            '',                    // Mobile
            '',                    // Secondary Mobile
            'Owner',               // Contact Type
            ''                     // Preferred Method
          ]);
        }
      }
    });

    console.log(`  Found ${contacts.length} unique contacts\n`);
    if (contacts.length > 0) {
      console.log('  Sample contacts:');
      contacts.slice(0, 5).forEach(c => {
        console.log(`    • ${c[0]}: ${c[1]} (${c[2]})`);
      });
      if (contacts.length > 5) {
        console.log(`    ... and ${contacts.length - 5} more`);
      }
    }

    // Prepare property data splits
    console.log('\n🔄 Step 3: Splitting property data across tabs...\n');

    const propertiesConfidential = [];
    const propertiesNonConfidential = [];
    const propertiesFinancial = [];
    const propertiesProjectsLink = [];
    const propertiesStatusTracker = [];

    // Create reverse lookup maps
    const contactCodeMap = {};
    contacts.forEach((c, idx) => {
      if (c[1]) {
        contactCodeMap[c[1].toLowerCase().replace(/\s+/g, '')] = c[0];
      }
    });

    dataRows.forEach((row) => {
      const propertyCode = row[COLUMNS.PROPERTY_CODE]?.trim();
      const projectCode = row[COLUMNS.PROJECT_CODE]?.trim();
      const ownerName = row[COLUMNS.OWNER_NAME]?.trim();
      const ownerPhone = row[COLUMNS.OWNER_PHONE]?.trim();

      if (propertyCode) {
        // Confidential data
        propertiesConfidential.push([
          propertyCode,
          '',                                        // Registration Number
          '',                                        // Municipality Number
          '',                                        // P-Number
          '',                                        // Plot Number
          row[COLUMNS.UNIT_NUMBER]?.trim() || '',  // Unit Number
          '',                                        // Building
          ''                                         // Floor
        ]);

        // Non-Confidential data
        propertiesNonConfidential.push([
          propertyCode,
          '',                                        // Property Type
          row[COLUMNS.LAYOUT]?.trim() || '',       // Layout
          row[COLUMNS.BEDROOMS]?.trim() || '',     // Bedrooms
          row[COLUMNS.BATHROOMS]?.trim() || '',    // Bathrooms
          row[COLUMNS.FLOOR_PLAN]?.trim() || '',   // Floor Plan
          row[COLUMNS.SIZE]?.trim() || '',         // Size
          row[COLUMNS.STATUS]?.trim() || ''        // Status
        ]);

        // Financial data
        propertiesFinancial.push([
          propertyCode,
          row[COLUMNS.PRICE]?.trim() || '',        // Price (Sale)
          row[COLUMNS.RENTAL_RATE]?.trim() || '',  // Rental Rate
          'AED',                                    // Currency
          '',                                        // Payment Terms
          '',                                        // Discount
          '',                                        // Commission
          row[COLUMNS.NOTES]?.trim() || ''         // Notes
        ]);

        // Projects Link data
        const ownerKey = ownerName ? ownerName.toLowerCase().replace(/\s+/g, '') : '';
        const contactCode = contactCodeMap[ownerKey] || '';

        propertiesProjectsLink.push([
          propertyCode,
          projectCode,
          contactCode,                              // Owner Contact Code
          '',                                        // Agent Contact Code
          new Date().toISOString().split('T')[0],  // Date Listed
          ''                                         // Special Notes
        ]);

        // Status Tracker data
        propertiesStatusTracker.push([
          propertyCode,
          row[COLUMNS.STATUS]?.trim() || 'Active', // Current Status
          new Date().toISOString().split('T')[0],  // Status Date
          '',                                        // Previous Status
          new Date().toISOString().split('T')[0],  // Last Updated
          'Migration',                               // Updated By
          'Migrated from Sheet1'                    // Notes
        ]);
      }
    });

    console.log(`  Properties to migrate:`);
    console.log(`    • Confidential records:         ${propertiesConfidential.length}`);
    console.log(`    • Non-Confidential records:     ${propertiesNonConfidential.length}`);
    console.log(`    • Financial records:            ${propertiesFinancial.length}`);
    console.log(`    • Project Link records:         ${propertiesProjectsLink.length}`);
    console.log(`    • Status Tracker records:       ${propertiesStatusTracker.length}\n`);

    // Upload to sheets
    console.log('📤 Step 4: Uploading data to sheets...\n');

    const uploadRequests = [];

    // Projects
    if (projects.length > 0) {
      uploadRequests.push({
        range: `Projects!A2`,
        values: projects
      });
      console.log(`  ✓ Projects tab: ${projects.length} records`);
    }

    // Contacts
    if (contacts.length > 0) {
      uploadRequests.push({
        range: `Contacts!A2`,
        values: contacts
      });
      console.log(`  ✓ Contacts tab: ${contacts.length} records`);
    }

    // Properties - Confidential
    if (propertiesConfidential.length > 0) {
      uploadRequests.push({
        range: `Properties - Confidential!A2`,
        values: propertiesConfidential
      });
      console.log(`  ✓ Properties - Confidential: ${propertiesConfidential.length} records`);
    }

    // Properties - Non-Confidential
    if (propertiesNonConfidential.length > 0) {
      uploadRequests.push({
        range: `Properties - Non-Confidential!A2`,
        values: propertiesNonConfidential
      });
      console.log(`  ✓ Properties - Non-Confidential: ${propertiesNonConfidential.length} records`);
    }

    // Properties - Financial
    if (propertiesFinancial.length > 0) {
      uploadRequests.push({
        range: `Properties - Financial!A2`,
        values: propertiesFinancial
      });
      console.log(`  ✓ Properties - Financial: ${propertiesFinancial.length} records`);
    }

    // Properties - Projects Link
    if (propertiesProjectsLink.length > 0) {
      uploadRequests.push({
        range: `Properties - Projects Link!A2`,
        values: propertiesProjectsLink
      });
      console.log(`  ✓ Properties - Projects Link: ${propertiesProjectsLink.length} records`);
    }

    // Properties - Status Tracker
    if (propertiesStatusTracker.length > 0) {
      uploadRequests.push({
        range: `Properties - Status Tracker!A2`,
        values: propertiesStatusTracker
      });
      console.log(`  ✓ Properties - Status Tracker: ${propertiesStatusTracker.length} records`);
    }

    if (uploadRequests.length > 0) {
      const batchUpdateRequest = {
        data: uploadRequests,
        valueInputOption: 'RAW'
      };

      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: ORGANIZED_ID,
        requestBody: batchUpdateRequest,
        auth: jwtClient
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ PHASE 2 COMPLETE: DATA MIGRATION SUCCESSFUL');
    console.log('='.repeat(80) + '\n');

    console.log('📊 DATA SUMMARY:\n');
    console.log(`  Projects:                       ${projects.length}`);
    console.log(`  Contacts:                       ${contacts.length}`);
    console.log(`  Properties:                     ${propertiesConfidential.length}\n`);

    console.log('📋 DATABASE STRUCTURE:\n');
    console.log('Reference Data:');
    console.log(`  • Projects tab:                 ${projects.length} records`);
    console.log(`  • Contacts tab:                 ${contacts.length} records\n`);

    console.log('Property Information (Split):');
    console.log(`  • Confidential:                 ${propertiesConfidential.length} records`);
    console.log(`  • Non-Confidential:             ${propertiesNonConfidential.length} records`);
    console.log(`  • Financial:                    ${propertiesFinancial.length} records`);
    console.log(`  • Status Tracker:               ${propertiesStatusTracker.length} records\n`);

    console.log('Relationships:');
    console.log(`  • Projects Link:                ${propertiesProjectsLink.length} records\n`);

    console.log('='.repeat(80));
    console.log('NEXT STEPS');
    console.log('='.repeat(80) + '\n');

    console.log('Phase 3: Build Master View Formulas');
    console.log('  • Create lookup formulas to pull data from all tabs');
    console.log('  • Set up drop-down filters');
    console.log('  • Test all data connections\n');

    console.log('Phase 4: Validation & Testing');
    console.log('  • Verify data integrity');
    console.log('  • Test lookup formulas');
    console.log('  • Document any issues\n');

    console.log(`📋 View your sheet:`);
    console.log(`   https://docs.google.com/spreadsheets/d/1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk\n`);

    console.log('✅ Data migration complete! Ready for Phase 3.');
    console.log('👉 Next: Run Phase 3 to build Master View formulas\n');

    process.exit(0);

  } catch (error) {
    console.error('\n✗ Error:', error.message || error);
    if (error.code) console.error('Code:', error.code);
    process.exit(1);
  }
}

migrateDataToRelational();
