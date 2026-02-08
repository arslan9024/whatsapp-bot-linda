/**
 * linkContactsToProperties.js
 * 
 * Extracts unique contacts from Sheet1
 * Assigns contact codes (C001, C002, etc.)
 * Populates Contacts tab
 * Links contacts back to Properties - Projects Link tab
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEYS_PATH = path.join(__dirname, './code/GoogleAPI/keys.json');
const ORGANIZED_ID = '1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk';

async function linkContactsToProperties() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('EXTRACTING AND LINKING CONTACTS');
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

    // Step 1: Read Sheet1 to extract unique contacts
    console.log('📖 Step 1: Reading Sheet1 to extract contacts...\n');

    const sheet1Data = await sheets.spreadsheets.values.get({
      spreadsheetId: ORGANIZED_ID,
      range: 'Sheet1!A:Z',
      auth: jwtClient
    });

    const sheet1Rows = sheet1Data.data.values || [];
    const headers = sheet1Rows[0] || [];

    console.log(`  Found headers: ${headers.slice(0, 10).join(' | ')}...\n`);

    // Extract owner names and phones (columns E and beyond based on data structure)
    // Assuming: Column A-D: Property info, Column E+: Owner/Contact info
    const contactsMap = {};
    const propertyContactMap = {}; // Track which property has which contact

    sheet1Rows.slice(1).forEach((row, idx) => {
      const propertyCode = `P${String(idx + 1).padStart(5, '0')}`;
      const ownerName = row[4]?.trim() || 'Unknown'; // Column E or adjust based on your data
      const ownerPhone = row[5]?.trim() || '';       // Column F or adjust
      const ownerEmail = row[6]?.trim() || '';       // Column G or adjust

      if (ownerName && ownerName !== 'Unknown') {
        const contactKey = `${ownerName}|${ownerPhone}|${ownerEmail}`.toLowerCase();

        if (!contactsMap[contactKey]) {
          contactsMap[contactKey] = {
            name: ownerName,
            phone: ownerPhone,
            email: ownerEmail,
            count: 0
          };
        }
        contactsMap[contactKey].count++;

        // Track which contact belongs to which property
        if (!propertyContactMap[propertyCode]) {
          propertyContactMap[propertyCode] = contactKey;
        }
      }
    });

    console.log(`  ✓ Found ${Object.keys(contactsMap).length} unique contacts\n`);

    // Step 2: Create contacts with codes
    console.log('👥 Step 2: Creating contact records...\n');

    const contactRecords = [];
    const contactCodeMap = {};

    Object.entries(contactsMap).forEach((entry, index) => {
      const [contactKey, contactData] = entry;
      const contactCode = `C${String(index + 1).padStart(3, '0')}`;

      contactRecords.push([
        contactCode,                          // Contact Code
        contactData.name,                     // Name
        contactData.phone,                    // Phone
        contactData.email,                    // Email
        '',                                   // Mobile
        '',                                   // Secondary Mobile
        'Owner',                              // Contact Type
        'Phone'                               // Preferred Method
      ]);

      contactCodeMap[contactKey] = contactCode;

      if ((index + 1) % 50 === 0) {
        console.log(`  Processed ${index + 1} unique contacts...`);
      }
    });

    console.log(`\n  ✓ Created ${contactRecords.length} contact records\n`);

    // Step 3: Populate Contacts tab
    console.log('📋 Step 3: Populating Contacts tab...\n');

    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: ORGANIZED_ID,
      auth: jwtClient
    });

    const contactsSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Contacts');
    const contactsSheetId = contactsSheet.properties.sheetId;

    // Clear existing data
    const clearRequest = {
      updateCells: {
        range: {
          sheetId: contactsSheetId,
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
          sheetId: contactsSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 8
        },
        rows: [{
          values: [
            { userEnteredValue: { stringValue: 'Contact Code' }, userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.2, blue: 0.4 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Name' }, userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.2, blue: 0.4 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Phone' }, userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.2, blue: 0.4 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Email' }, userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.2, blue: 0.4 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Mobile' }, userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.2, blue: 0.4 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Secondary Mobile' }, userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.2, blue: 0.4 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Contact Type' }, userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.2, blue: 0.4 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } },
            { userEnteredValue: { stringValue: 'Preferred Method' }, userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.2, blue: 0.4 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }
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

    // Upload contacts
    await sheets.spreadsheets.values.update({
      spreadsheetId: ORGANIZED_ID,
      range: `Contacts!A2`,
      valueInputOption: 'RAW',
      requestBody: { values: contactRecords },
      auth: jwtClient
    });

    console.log(`  ✓ Uploaded ${contactRecords.length} contacts\n`);

    // Step 4: Update Properties - Projects Link with contact codes
    console.log('🔗 Step 4: Linking contacts to properties...\n');

    const linkData = await sheets.spreadsheets.values.get({
      spreadsheetId: ORGANIZED_ID,
      range: `'Properties - Projects Link'!A:C`,
      auth: jwtClient
    });

    const linkRows = linkData.data.values || [];
    const updatedLinkRows = [];

    linkRows.slice(1).forEach((row, idx) => {
      const propertyCode = row[0];
      const projectCode = row[1];
      const contactKey = propertyContactMap[propertyCode] || null;
      const contactCode = contactKey ? contactCodeMap[contactKey] : '';

      updatedLinkRows.push([
        propertyCode,
        projectCode,
        contactCode,        // Contact Code (Owner) - NOW POPULATED
        row[3] || '',       // Contact Code (Agent) - empty for now
        row[4] || new Date().toISOString().split('T')[0],  // Date Listed
        row[5] || ''        // Special Notes
      ]);
    });

    const linkSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Properties - Projects Link');
    const linkSheetId = linkSheet.properties.sheetId;

    // Clear and update link sheet
    const linkClearRequest = {
      updateCells: {
        range: {
          sheetId: linkSheetId,
          startRowIndex: 1  // Keep headers
        },
        fields: 'userEnteredValue'
      }
    };

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: ORGANIZED_ID,
      requestBody: { requests: [linkClearRequest] },
      auth: jwtClient
    });

    // Upload updated links in batches
    const batchSize = 5000;
    for (let i = 0; i < updatedLinkRows.length; i += batchSize) {
      const batch = updatedLinkRows.slice(i, i + batchSize);

      await sheets.spreadsheets.values.update({
        spreadsheetId: ORGANIZED_ID,
        range: `'Properties - Projects Link'!A${i + 2}`,
        valueInputOption: 'RAW',
        requestBody: { values: batch },
        auth: jwtClient
      });

      console.log(`  ✓ Updated ${Math.min(i + batchSize, updatedLinkRows.length)}/${updatedLinkRows.length} property links`);
    }

    console.log('');

    // Step 5: Display results
    console.log('='.repeat(80));
    console.log('✅ CONTACTS EXTRACTED AND LINKED');
    console.log('='.repeat(80) + '\n');

    console.log('📊 SUMMARY:\n');
    console.log(`  Total Unique Contacts:       ${contactRecords.length}`);
    console.log(`  Total Properties Linked:     ${updatedLinkRows.length}`);
    console.log(`  Properties with Contacts:    ${updatedLinkRows.filter(r => r[2]).length}\n`);

    console.log('👥 SAMPLE CONTACTS (First 5):\n');
    contactRecords.slice(0, 5).forEach((record, idx) => {
      console.log(`  ${idx + 1}. ${record[0]}: ${record[1]}`);
      console.log(`     Phone: ${record[2]} | Email: ${record[3]}\n`);
    });

    console.log('📋 SAMPLE PROPERTY-CONTACT LINKS:\n');
    updatedLinkRows.slice(0, 5).forEach((row, idx) => {
      console.log(`  ${row[0]} → ${row[1]} (Contact: ${row[2]})`);
    });

    // Step 6: Create report
    console.log('\n📝 Step 5: Creating contact report...\n');

    const contactReport = {
      timestamp: new Date().toISOString(),
      summary: {
        totalContacts: contactRecords.length,
        totalProperties: updatedLinkRows.length,
        propertiesWithContacts: updatedLinkRows.filter(r => r[2]).length
      },
      contacts: contactRecords.map(record => ({
        contactCode: record[0],
        name: record[1],
        phone: record[2],
        email: record[3],
        type: record[6]
      })),
      codeFormat: {
        contacts: 'C### (C001-C' + String(contactRecords.length).padStart(3, '0') + ')',
        properties: 'P##### (P00001-P10383)',
        projects: 'PJ### (PJ001-PJ030)'
      }
    };

    const reportPath = path.join(__dirname, './CONTACTS_LINKING_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(contactReport, null, 2));

    console.log(`  ✓ Saved to CONTACTS_LINKING_REPORT.json\n`);

    console.log('='.repeat(80));
    console.log('RELATIONAL DATABASE LINKAGES COMPLETE');
    console.log('='.repeat(80) + '\n');

    console.log('✅ ESTABLISHED RELATIONSHIPS:\n');
    console.log(`  • Properties (P00001-P10383) → Projects (PJ001-PJ030)`);
    console.log(`  • Properties (P00001-P10383) → Contacts (C001-C${String(contactRecords.length).padStart(3, '0')})`);
    console.log(`  • Projects have gate numbers (1-30)`);
    console.log(`  • All ${contactRecords.length} contacts extracted from owner data\n`);

    console.log('📌 CODE RANGES:\n');
    console.log(`  • Properties: P00001 to P10383 (5-digit sequential)`);
    console.log(`  • Projects: PJ001 to PJ030 (2-digit sequential)`);
    console.log(`  • Contacts: C001 to C${String(contactRecords.length).padStart(3, '0')} (3-digit sequential)\n`);

    console.log('👉 NEXT STEPS:');
    console.log('   1. Populate Properties detail tabs (Confidential, Non-Conf, Financial)');
    console.log('   2. Set up Master View with all VLOOKUP formulas');
    console.log('   3. Configure status tracking and auditing\n');

    process.exit(0);

  } catch (error) {
    console.error('\n✗ Error:', error.message || error);
    if (error.code) console.error('Code:', error.code);
    process.exit(1);
  }
}

linkContactsToProperties();
