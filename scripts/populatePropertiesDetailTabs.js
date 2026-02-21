/**
 * populatePropertiesDetailTabs.js
 * 
 * Extracts property details from Sheet1
 * Distributes to Confidential, Non-Confidential, and Financial tabs
 * Links with property codes, project codes, and contact codes
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEYS_PATH = path.join(__dirname, './code/GoogleAPI/keys.json');
const ORGANIZED_ID = '1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk';

async function populatePropertiesDetailTabs() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('POPULATING PROPERTIES DETAIL TABS');
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

    await new Promise((resolve, reject) => {
      jwtClient.authorize((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const sheets = google.sheets('v4');

    // Step 1: Read Sheet1
    console.log('📖 Step 1: Reading Sheet1 data...\n');

    const sheet1Data = await sheets.spreadsheets.values.get({
      spreadsheetId: ORGANIZED_ID,
      range: 'Sheet1!A:Z',
      auth: jwtClient
    });

    const sheet1Rows = sheet1Data.data.values || [];
    const headers = sheet1Rows[0] || [];

    console.log(`  Found headers: ${headers.slice(0, 10).join(' | ')}...\n`);
    console.log(`  Total rows: ${sheet1Rows.length - 1}\n`);

    // Step 2: Prepare property records for each tab
    console.log('📋 Step 2: Preparing property records...\n');

    const confidentialRecords = [];
    const nonConfidentialRecords = [];
    const financialRecords = [];

    const propertyContactMap = {};

    // Load contact mapping from report
    const reportPath = path.join(__dirname, './CONTACTS_LINKING_REPORT.json');
    let contactMapping = {};
    if (fs.existsSync(reportPath)) {
      const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      reportData.contacts.forEach(contact => {
        contactMapping[contact.name.toLowerCase()] = contact.contactCode;
      });
    }

    sheet1Rows.slice(1).forEach((row, idx) => {
      const propertyCode = `P${String(idx + 1).padStart(5, '0')}`;
      
      // Extract property details (adjust column indices based on your actual data structure)
      const code = row[0] || '';                    // Column A
      const plotNumber = row[1] || '';              // Column B (P-NUMBER)
      const area = row[2] || '';                    // Column C (AREA)
      const project = row[3] || '';                 // Column D (Project)
      const plotType = row[4] || '';                // Column E (PLOT NUMBER / Type)
      const ownerName = row[5] || '';               // Column F (NAME)
      const phone = row[6] || '';                   // Column G (PHONE)
      const email = row[7] || '';                   // Column H (EMAIL)
      const mobile = row[8] || '';                  // Column I (MOBILE)
      const secondaryMobile = row[9] || '';         // Column J (SECONDARY MOBILE)
      const price = row[10] || '';                  // Column K (PRICE or similar)
      const squareFootage = row[11] || '';          // Column L (SIZE)
      const bedrooms = row[12] || '';               // Column M (BEDROOMS)
      const bathrooms = row[13] || '';              // Column N (BATHROOMS)
      const amenities = row[14] || '';              // Column O (AMENITIES)

      // Find project code
      let projectCode = 'PJ001';  // Default
      if (project) {
        // Count projects seen so far to assign sequential code
        const projectIndex = Array.from(new Set(sheet1Rows.slice(1, idx + 2).map(r => r[3]))).indexOf(project);
        projectCode = `PJ${String(projectIndex + 1).padStart(3, '0')}`;
      }

      // Find contact code
      const contactCode = contactMapping[ownerName.toLowerCase()] || 'C001';

      // CONFIDENTIAL TAB: Sensitive info (prices, financial, personal identifiers)
      confidentialRecords.push([
        propertyCode,           // Property Code
        projectCode,            // Project Code
        contactCode,            // Contact Code
        ownerName,              // Owner Name
        phone,                  // Primary Phone
        mobile,                 // Mobile
        email,                  // Email
        '',                     // Agent Name (optional)
        '',                     // Agent Phone (optional)
        '',                     // Financing Details
        'Active'                // Status
      ]);

      // NON-CONFIDENTIAL TAB: Property details (location, size, features)
      nonConfidentialRecords.push([
        propertyCode,           // Property Code
        projectCode,            // Project Code
        plotNumber,             // Plot Number
        area,                   // Area
        plotType,               // Plot Type
        bedrooms || '',         // Bedrooms
        bathrooms || '',        // Bathrooms
        squareFootage || '',    // Square Footage
        amenities || '',        // Amenities
        'Available',            // Availability
        new Date().toISOString().split('T')[0]  // Date Listed
      ]);

      // FINANCIAL TAB: Pricing and transaction info
      const priceValue = price || '0';
      const pricePerSqft = squareFootage && priceValue !== '0' 
        ? (parseFloat(priceValue) / parseFloat(squareFootage)).toFixed(2)
        : '0';

      financialRecords.push([
        propertyCode,           // Property Code
        projectCode,            // Project Code
        contactCode,            // Contact Code
        price,                  // Price
        pricePerSqft,           // Price per Sq Ft
        '',                     // Down Payment
        '',                     // Financing Type
        '',                     // Payment Plan
        '',                     // Commission Rate
        '',                     // Commission Amount
        'Pending',              // Transaction Status
        new Date().toISOString().split('T')[0]  // Date Added
      ]);

      if ((idx + 1) % 2000 === 0) {
        console.log(`  Processed ${idx + 1}/${sheet1Rows.length - 1} properties...`);
      }
    });

    console.log(`\n  ✓ Created ${confidentialRecords.length} property records\n`);

    // Step 3: Get spreadsheet metadata
    console.log('📊 Step 3: Accessing spreadsheet sheets...\n');

    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: ORGANIZED_ID,
      auth: jwtClient
    });

    const confidentialSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Properties - Confidential');
    const nonConfSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Properties - Non-Confidential');
    const financialSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Properties - Financial');

    if (!confidentialSheet || !nonConfSheet || !financialSheet) {
      throw new Error('Required property tabs not found. Please create: Properties - Confidential, Properties - Non-Confidential, Properties - Financial');
    }

    const confidentialSheetId = confidentialSheet.properties.sheetId;
    const nonConfSheetId = nonConfSheet.properties.sheetId;
    const financialSheetId = financialSheet.properties.sheetId;

    console.log('  ✓ Located all property tabs\n');

    // Step 4: Populate CONFIDENTIAL tab
    console.log('🔒 Step 4: Populating Confidential tab...\n');

    // Clear existing
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: ORGANIZED_ID,
      requestBody: {
        requests: [{
          updateCells: {
            range: { sheetId: confidentialSheetId, startRowIndex: 0 },
            fields: 'userEnteredValue,userEnteredFormat'
          }
        }]
      },
      auth: jwtClient
    });

    // Add headers
    const confHeaders = {
      updateCells: {
        range: {
          sheetId: confidentialSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 11
        },
        rows: [{
          values: [
            { userEnteredValue: { stringValue: 'Property Code' }, userEnteredFormat: { backgroundColor: { red: 0.8, green: 0.2, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Project Code' }, userEnteredFormat: { backgroundColor: { red: 0.8, green: 0.2, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Contact Code' }, userEnteredFormat: { backgroundColor: { red: 0.8, green: 0.2, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Owner Name' }, userEnteredFormat: { backgroundColor: { red: 0.8, green: 0.2, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Phone' }, userEnteredFormat: { backgroundColor: { red: 0.8, green: 0.2, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Mobile' }, userEnteredFormat: { backgroundColor: { red: 0.8, green: 0.2, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Email' }, userEnteredFormat: { backgroundColor: { red: 0.8, green: 0.2, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Agent Name' }, userEnteredFormat: { backgroundColor: { red: 0.8, green: 0.2, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Agent Phone' }, userEnteredFormat: { backgroundColor: { red: 0.8, green: 0.2, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Financing Details' }, userEnteredFormat: { backgroundColor: { red: 0.8, green: 0.2, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Status' }, userEnteredFormat: { backgroundColor: { red: 0.8, green: 0.2, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }
          ]
        }],
        fields: 'userEnteredValue,userEnteredFormat'
      }
    };

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: ORGANIZED_ID,
      requestBody: { requests: [confHeaders] },
      auth: jwtClient
    });

    console.log('  ✓ Added headers');

    // Upload data in batches
    const batchSize = 5000;
    for (let i = 0; i < confidentialRecords.length; i += batchSize) {
      const batch = confidentialRecords.slice(i, i + batchSize);

      await sheets.spreadsheets.values.update({
        spreadsheetId: ORGANIZED_ID,
        range: `'Properties - Confidential'!A${i + 2}`,
        valueInputOption: 'RAW',
        requestBody: { values: batch },
        auth: jwtClient
      });

      console.log(`  ✓ Uploaded ${Math.min(i + batchSize, confidentialRecords.length)}/${confidentialRecords.length} records`);
    }

    console.log('');

    // Step 5: Populate NON-CONFIDENTIAL tab
    console.log('🔓 Step 5: Populating Non-Confidential tab...\n');

    // Clear and add headers
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: ORGANIZED_ID,
      requestBody: {
        requests: [{
          updateCells: {
            range: { sheetId: nonConfSheetId, startRowIndex: 0 },
            fields: 'userEnteredValue,userEnteredFormat'
          }
        }]
      },
      auth: jwtClient
    });

    const nonConfHeaders = {
      updateCells: {
        range: {
          sheetId: nonConfSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 11
        },
        rows: [{
          values: [
            { userEnteredValue: { stringValue: 'Property Code' }, userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.6, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Project Code' }, userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.6, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Plot Number' }, userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.6, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Area' }, userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.6, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Plot Type' }, userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.6, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Bedrooms' }, userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.6, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Bathrooms' }, userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.6, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Square Footage' }, userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.6, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Amenities' }, userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.6, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Availability' }, userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.6, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Date Listed' }, userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.6, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }
          ]
        }],
        fields: 'userEnteredValue,userEnteredFormat'
      }
    };

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: ORGANIZED_ID,
      requestBody: { requests: [nonConfHeaders] },
      auth: jwtClient
    });

    console.log('  ✓ Added headers');

    // Upload data in batches
    for (let i = 0; i < nonConfidentialRecords.length; i += batchSize) {
      const batch = nonConfidentialRecords.slice(i, i + batchSize);

      await sheets.spreadsheets.values.update({
        spreadsheetId: ORGANIZED_ID,
        range: `'Properties - Non-Confidential'!A${i + 2}`,
        valueInputOption: 'RAW',
        requestBody: { values: batch },
        auth: jwtClient
      });

      console.log(`  ✓ Uploaded ${Math.min(i + batchSize, nonConfidentialRecords.length)}/${nonConfidentialRecords.length} records`);
    }

    console.log('');

    // Step 6: Populate FINANCIAL tab
    console.log('💰 Step 6: Populating Financial tab...\n');

    // Clear and add headers
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: ORGANIZED_ID,
      requestBody: {
        requests: [{
          updateCells: {
            range: { sheetId: financialSheetId, startRowIndex: 0 },
            fields: 'userEnteredValue,userEnteredFormat'
          }
        }]
      },
      auth: jwtClient
    });

    const finHeaders = {
      updateCells: {
        range: {
          sheetId: financialSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 12
        },
        rows: [{
          values: [
            { userEnteredValue: { stringValue: 'Property Code' }, userEnteredFormat: { backgroundColor: { red: 0.8, green: 0.8, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 0, green: 0, blue: 0 } } } },
            { userEnteredValue: { stringValue: 'Project Code' }, userEnteredFormat: { backgroundColor: { red: 0.8, green: 0.8, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 0, green: 0, blue: 0 } } } },
            { userEnteredValue: { stringValue: 'Contact Code' }, userEnteredFormat: { backgroundColor: { red: 0.8, green: 0.8, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 0, green: 0, blue: 0 } } } },
            { userEnteredValue: { stringValue: 'Price' }, userEnteredFormat: { backgroundColor: { red: 0.8, green: 0.8, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 0, green: 0, blue: 0 } } } },
            { userEnteredValue: { stringValue: 'Price per Sq Ft' }, userEnteredFormat: { backgroundColor: { red: 0.8, green: 0.8, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 0, green: 0, blue: 0 } } } },
            { userEnteredValue: { stringValue: 'Down Payment' }, userEnteredFormat: { backgroundColor: { red: 0.8, green: 0.8, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 0, green: 0, blue: 0 } } } },
            { userEnteredValue: { stringValue: 'Financing Type' }, userEnteredFormat: { backgroundColor: { red: 0.8, green: 0.8, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 0, green: 0, blue: 0 } } } },
            { userEnteredValue: { stringValue: 'Payment Plan' }, userEnteredFormat: { backgroundColor: { red: 0.8, green: 0.8, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 0, green: 0, blue: 0 } } } },
            { userEnteredValue: { stringValue: 'Commission Rate' }, userEnteredFormat: { backgroundColor: { red: 0.8, green: 0.8, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 0, green: 0, blue: 0 } } } },
            { userEnteredValue: { stringValue: 'Commission Amount' }, userEnteredFormat: { backgroundColor: { red: 0.8, green: 0.8, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 0, green: 0, blue: 0 } } } },
            { userEnteredValue: { stringValue: 'Transaction Status' }, userEnteredFormat: { backgroundColor: { red: 0.8, green: 0.8, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 0, green: 0, blue: 0 } } } },
            { userEnteredValue: { stringValue: 'Date Added' }, userEnteredFormat: { backgroundColor: { red: 0.8, green: 0.8, blue: 0.2 }, textFormat: { bold: true, foregroundColor: { red: 0, green: 0, blue: 0 } } } }
          ]
        }],
        fields: 'userEnteredValue,userEnteredFormat'
      }
    };

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: ORGANIZED_ID,
      requestBody: { requests: [finHeaders] },
      auth: jwtClient
    });

    console.log('  ✓ Added headers');

    // Upload data in batches
    for (let i = 0; i < financialRecords.length; i += batchSize) {
      const batch = financialRecords.slice(i, i + batchSize);

      await sheets.spreadsheets.values.update({
        spreadsheetId: ORGANIZED_ID,
        range: `'Properties - Financial'!A${i + 2}`,
        valueInputOption: 'RAW',
        requestBody: { values: batch },
        auth: jwtClient
      });

      console.log(`  ✓ Uploaded ${Math.min(i + batchSize, financialRecords.length)}/${financialRecords.length} records`);
    }

    console.log('');

    // Step 7: Summary
    console.log('='.repeat(80));
    console.log('✅ PROPERTY DETAIL TABS POPULATED');
    console.log('='.repeat(80) + '\n');

    console.log('📊 DISTRIBUTION:\n');
    console.log(`  ✓ Confidential Tab:        ${confidentialRecords.length} properties`);
    console.log(`     (Owner info, contact details, financing status)`);
    console.log(`\n  ✓ Non-Confidential Tab:    ${nonConfidentialRecords.length} properties`);
    console.log(`     (Location, size, features, availability)`);
    console.log(`\n  ✓ Financial Tab:           ${financialRecords.length} properties`);
    console.log(`     (Pricing, payment terms, commissions)\n`);

    console.log('🔗 RELATIONSHIPS ESTABLISHED:\n');
    console.log(`  • Each property (P#####) linked to its project (PJ###)`);
    console.log(`  • Each property linked to its contact (C###)`);
    console.log(`  • Consistent codes across all tabs for relational integrity\n`);

    console.log('📌 DATA STRUCTURE:\n');
    console.log(`  Properties - Confidential:       [Property Code] → [Owner Contact]`);
    console.log(`  Properties - Non-Confidential:   [Property Code] → [Location & Features]`);
    console.log(`  Properties - Financial:          [Property Code] → [Pricing & Payment]\n`);

    console.log('👉 NEXT STEPS:');
    console.log('   1. Set up Master View with VLOOKUP formulas');
    console.log('   2. Create analytics dashboard');
    console.log('   3. Configure automated filters and sorting\n');

    process.exit(0);

  } catch (error) {
    console.error('\n✗ Error:', error.message || error);
    if (error.code) console.error('Code:', error.code);
    process.exit(1);
  }
}

populatePropertiesDetailTabs();
