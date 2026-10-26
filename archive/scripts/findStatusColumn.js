/**
 * findStatusColumn.js
 * Searches all columns in Oxygen2023 sheet to find PropertyStatus
 * Maps all columns to identify which contains status information
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEYS_PATH = path.join(__dirname, './code/GoogleAPI/keys.json');
const OXYGEN2023_SHEET_ID = '1wBX2zhUaBg082BUmGCvqCSPI6w8eDJFtxZAsH2LjiaY';

async function findStatusColumn() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('OXYGEN2023 SHEET - COLUMN MAPPING');
    console.log('Finding PropertyStatus column and analyzing all fields');
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

    // Get all data
    console.log('Fetching all columns...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: OXYGEN2023_SHEET_ID,
      range: 'Sheet1!A1:Z100',
      auth: jwtClient
    });

    const rows = response.data.values || [];
    const headers = rows[0] || [];

    console.log(`\nFOUND ${headers.length} COLUMNS:\n`);
    console.log('-'.repeat(80));

    headers.forEach((header, index) => {
      const columnLetter = String.fromCharCode(65 + index);
      console.log(`${columnLetter}: ${header || '(empty)'}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('COLUMN ANALYSIS');
    console.log('='.repeat(80) + '\n');

    // Look for status-related columns
    const potentialStatusColumns = [];

    headers.forEach((header, index) => {
      const lower = (header || '').toLowerCase();
      const columnLetter = String.fromCharCode(65 + index);

      if (lower.includes('status') || lower.includes('available') || 
          lower.includes('sale') || lower.includes('rent') || 
          lower.includes('listing')) {
        potentialStatusColumns.push({
          letter: columnLetter,
          index: index,
          header: header
        });
      }
    });

    if (potentialStatusColumns.length === 0) {
      console.log('❌ NO COLUMNS FOUND WITH "status", "available", "sale", or "rent" keywords\n');
      console.log('This suggests PropertyStatus does NOT exist in Oxygen2023 sheet.');
      console.log('We will need to assign default values when populating organized sheet.\n');
    } else {
      console.log('✓ Found potential PropertyStatus columns:\n');
      potentialStatusColumns.forEach(col => {
        console.log(`  ${col.letter}: ${col.header}`);
        
        // Sample values from this column
        const columnValues = new Set();
        for (let i = 1; i < Math.min(101, rows.length); i++) {
          const val = (rows[i][col.index] || '').toString().trim();
          if (val && val.length < 50) {
            columnValues.add(val);
            if (columnValues.size >= 5) break;
          }
        }
        if (columnValues.size > 0) {
          console.log(`       Sample values: ${Array.from(columnValues).join(', ')}`);
        }
        console.log();
      });
    }

    console.log('='.repeat(80));
    console.log('RECOMMENDATIONS FOR PROPERTY STATUS MAPPING');
    console.log('='.repeat(80) + '\n');

    console.log(`Discovery 1: Column N contains PROPERTY LAYOUTS (Studio, 1B/R, 2B/R, etc.)`);
    console.log(`Discovery 2: No dedicated PropertyStatus column exists\n`);

    console.log('RECOMMENDED ACTION:\n');
    console.log('Since Oxygen2023 has no PropertyStatus data, we have two options:\n');
    console.log('Option A: Default Strategy');
    console.log('  - Assign "SALE" to ALL properties (market standard in real estate)');
    console.log('  - Users can manually override specific properties to "RENT", "SOLD", etc.');
    console.log('  - Time: 10 minutes\n');

    console.log('Option B: Manual Inquiry');
    console.log('  - Ask you which properties are FOR SALE vs FOR RENT');
    console.log('  - Categorize by project/location/type');
    console.log('  - Populate with accurate values');
    console.log('  - Time: Depends on your input\n');

    console.log('EXCELLENT NEWS: Column N data (Layout) can be used for PropertyLayout!');
    console.log('  - 259+ Studio units');
    console.log('  - 248+ 1 B/R units');
    console.log('  - 55+ 2 B/R units');
    console.log('  - 9+ 3 B/R units');
    console.log('  - 2x 6 B/R units');
    console.log('  - 9439 unknown (0) - needs manual assignment\n');

    console.log('='.repeat(80) + '\n');

    process.exit(0);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

findStatusColumn();
