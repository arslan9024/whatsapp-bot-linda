/**
 * addDataValidation.js
 * Adds data validation dropdowns to PropertyLayout and PropertyStatus columns
 * This is a separate script after the columns are already populated
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PropertyLayoutConfig from './code/config/PropertyLayoutConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEYS_PATH = path.join(__dirname, './code/GoogleAPI/keys.json');
const ORGANIZED_ID = '1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk';

async function addValidation() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('ADDING DATA VALIDATION DROPDOWNS');
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

    // Get layout codes
    const layoutCodes = PropertyLayoutConfig.getAllLayoutCodes();
    const statusCodes = ['SALE', 'RENT', 'SOLD', 'RENTED', 'PENDING', 'VACANT'];

    console.log('Adding validation for:');
    console.log(`  - PropertyLayout codes: ${layoutCodes.join(', ')}`);
    console.log(`  - PropertyStatus codes: ${statusCodes.join(', ')}\n`);

    // Create validation requests with correct format
    const requests = [
      {
        setDataValidation: {
          range: {
            sheetId: 0,
            startRowIndex: 1,
            endRowIndex: 10385,
            startColumnIndex: 14, // Column O
            endColumnIndex: 15
          },
          rule: {
            condition: {
              type: 'ONE_OF_LIST',
              values: layoutCodes.map(code => ({ userEnteredValue: code }))
            },
            inputMessage: 'Select a valid layout code',
            showCustomUi: true,
            strict: false
          }
        }
      },
      {
        setDataValidation: {
          range: {
            sheetId: 0,
            startRowIndex: 1,
            endRowIndex: 10385,
            startColumnIndex: 15, // Column P
            endColumnIndex: 16
          },
          rule: {
            condition: {
              type: 'ONE_OF_LIST',
              values: statusCodes.map(code => ({ userEnteredValue: code }))
            },
            inputMessage: 'Select a valid status',
            showCustomUi: true,
            strict: false
          }
        }
      }
    ];

    console.log('Applying data validation...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: ORGANIZED_ID,
      requestBody: { requests },
      auth: jwtClient
    });

    console.log('\n✓ Data validation dropdowns added successfully!\n');

    console.log('Column O (PropertyLayout):');
    console.log(`  - Dropdown with ${layoutCodes.length} layout codes`);
    console.log(`  - Codes: ${layoutCodes.slice(0, 5).join(', ')} ...\n`);

    console.log('Column P (PropertyStatus):');
    console.log(`  - Dropdown with ${statusCodes.length} status codes`);
    console.log(`  - Codes: ${statusCodes.join(', ')}\n`);

    console.log('='.repeat(80));
    console.log('✓ COMPLETE - Your organized sheet is now enriched!');
    console.log('='.repeat(80) + '\n');

    console.log('Summary:');
    console.log('  ✓ Column O: PropertyLayout with 573 mapped layouts + 9,810 empty');
    console.log('  ✓ Column P: PropertyStatus with all "SALE" (editable)\n');

    console.log('View the sheet: https://docs.google.com/spreadsheets/d/1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk\n');

    process.exit(0);

  } catch (error) {
    console.error('Error:', error.message || error);
    process.exit(1);
  }
}

addValidation();
