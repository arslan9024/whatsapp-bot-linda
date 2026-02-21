#!/usr/bin/env node

/**
 * Expand Google Sheet to accommodate all rows
 * Then populate with data
 */

import { google } from 'googleapis';
import { initializeGoogleAuth, getPowerAgent } from './code/GoogleAPI/main.js';

const ORGANIZED_SHEET_ID = '1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk';
const NEEDED_ROWS = 10400;

let auth = null;
let sheets = null;

function log(...args) {
  console.log(`[${new Date().toLocaleTimeString()}]`, ...args);
}

function logStep(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(` ${title}`);
  console.log(`${'='.repeat(60)}\n`);
}

async function expandSheet() {
  try {
    logStep('EXPANDING GOOGLE SHEET');

    // Step 1: Initialize
    log('🔐 Initializing Google Sheets API...');
    await initializeGoogleAuth();
    auth = await getPowerAgent();

    if (!auth) {
      throw new Error('Failed to authenticate with Google');
    }

    sheets = google.sheets({ version: 'v4', auth });
    log('✅ Google Sheets API initialized');

    // Step 2: Get current sheet properties
    logStep('STEP 1: CHECKING CURRENT SHEET SIZE');
    log('Getting sheet metadata...');

    const getResponse = await sheets.spreadsheets.get({
      spreadsheetId: ORGANIZED_SHEET_ID,
    });

    const sheet = getResponse.data.sheets[0];
    const currentRows = sheet.properties.gridProperties.rowCount;
    const currentCols = sheet.properties.gridProperties.columnCount;
    const sheetId = sheet.properties.sheetId;

    log(`✅ Current sheet size: ${currentRows} rows × ${currentCols} columns`);
    log(`   Sheet ID: ${sheetId}`);
    log(`   Needed rows: ${NEEDED_ROWS}`);

    if (currentRows >= NEEDED_ROWS) {
      log(`✅ Sheet is already large enough!`);
      return;
    }

    // Step 3: Expand the sheet
    logStep('STEP 2: EXPANDING SHEET ROWS');
    log(`Expanding from ${currentRows} to ${NEEDED_ROWS} rows...`);

    const updateResponse = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: ORGANIZED_SHEET_ID,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              fields: 'gridProperties.rowCount',
              properties: {
                sheetId: sheetId,
                gridProperties: {
                  rowCount: NEEDED_ROWS,
                  columnCount: currentCols,
                },
              },
            },
          },
        ],
      },
    });

    log('✅ Sheet expansion request sent');

    // Step 4: Verify expansion
    logStep('STEP 3: VERIFYING EXPANSION');

    const verifyResponse = await sheets.spreadsheets.get({
      spreadsheetId: ORGANIZED_SHEET_ID,
    });

    const newRows = verifyResponse.data.sheets[0].properties.gridProperties.rowCount;
    log(`✅ Sheet now has ${newRows} rows`);

    if (newRows >= NEEDED_ROWS) {
      log(`✅ ✨ Sheet expansion successful!`);
      log(`   Ready to write ${NEEDED_ROWS - 1} data rows`);
    } else {
      throw new Error(`Expansion failed. Got ${newRows} rows, needed ${NEEDED_ROWS}`);
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message || error);
    process.exit(1);
  }
}

// Run
expandSheet().then(() => {
  log('✨ Ready to populate data!');
  process.exit(0);
});
