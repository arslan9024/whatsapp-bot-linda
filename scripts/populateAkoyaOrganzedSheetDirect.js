#!/usr/bin/env node

/**
 * ============================================================================
 * DIRECT DATA POPULATION SCRIPT - AKOYA ORGANIZED SHEET
 * ============================================================================
 * 
 * Simplified version that:
 * 1. Reads original "Oxygen2023" sheet
 * 2. Deduplicates records quickly
 * 3. Writes to organized sheet tabs
 * 4. No complex dependencies required
 * 
 * Usage:
 *   node populateAkoyaOrganzedSheetDirect.js
 * 
 * ============================================================================
 */

import { google } from 'googleapis';
import { initializeGoogleAuth, getPowerAgent } from './code/GoogleAPI/main.js';
import fs from 'fs';

const ORIGINAL_SHEET_ID = '1wBX2zhUaBg082BUmGCvqCSPI6w8eDJFtxZAsH2LjiaY'; // Oxygen2023
const ORGANIZED_SHEET_ID = '1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk'; // Akoya-Oxygen-2023-Organized

let auth = null;
let sheets = null;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function log(...args) {
  console.log(`[${new Date().toLocaleTimeString()}]`, ...args);
}

function logStep(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(` ${title}`);
  console.log(`${'='.repeat(60)}\n`);
}

/**
 * Quick deduplication using Set for exact matches
 */
function deduplicateRecords(records) {
  const seen = new Set();
  const deduplicated = [];
  let duplicates = 0;

  records.forEach((record) => {
    // Create a key from all non-empty values
    const key = (Array.isArray(record) ? record : Object.values(record))
      .filter((v) => v)
      .join('|')
      .toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(record);
    } else {
      duplicates++;
    }
  });

  return { deduplicated, duplicates, totalRemoved: duplicates };
}

/**
 * Assign simple codes to records
 */
function assignCodes(records) {
  const coded = [];
  let propCount = 1;
  let contactCount = 1;
  let finCount = 1;

  records.forEach((record) => {
    const row = Array.isArray(record) ? [...record] : [...Object.values(record)];
    const rowStr = row.join('|').toLowerCase();

    // Detect type and assign code
    let code = '';
    if (rowStr.match(/phone|whatsapp|email|contact|name/i)) {
      code = `C${String(contactCount++).padStart(3, '0')}`;
    } else if (rowStr.match(/unit|villa|apartment|property|bedroom|sqft/i)) {
      code = `P${String(propCount++).padStart(3, '0')}`;
    } else if (rowStr.match(/price|cost|budget|aed|usd|amount|payment|commission/i)) {
      code = `F${String(finCount++).padStart(3, '0')}`;
    } else {
      code = `P${String(propCount++).padStart(3, '0')}`; // Default to property
    }

    coded.push([code, ...row]);
  });

  return { coded, totalCodes: propCount + contactCount + finCount - 3 };
}

// ============================================================================
// MAIN LOGIC
// ============================================================================

async function main() {
  try {
    logStep('AKOYA DATA POPULATION - DIRECT MODE');

    // Step 1: Initialize Google Auth
    log('🔐 Initializing Google Sheets API...');
    await initializeGoogleAuth();
    auth = await getPowerAgent();

    if (!auth) {
      throw new Error('Failed to authenticate with Google');
    }

    sheets = google.sheets({ version: 'v4', auth });
    log('✅ Google Sheets API initialized');

    // Step 2: Read original sheet
    logStep('STEP 1: READING ORIGINAL SHEET');
    log(`📖 Reading from Oxygen2023 (${ORIGINAL_SHEET_ID})...`);

    const readResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: ORIGINAL_SHEET_ID,
      range: 'Sheet1',
    });

    const allRows = readResponse.data.values || [];
    const headers = allRows[0] || [];
    const dataRows = allRows.slice(1);

    log(`✅ Read ${allRows.length} rows (including header)`);
    log(`   Headers: ${headers.length} columns`);
    log(`   Data rows: ${dataRows.length}`);

    // Step 3: Deduplicate
    logStep('STEP 2: DEDUPLICATING RECORDS');
    log('Removing duplicate records...');

    const dedupResult = deduplicateRecords(dataRows);
    const { deduplicated, duplicates } = dedupResult;

    log(`✅ Deduplication complete:`);
    log(`   Original: ${dataRows.length}`);
    log(`   Deduplicated: ${deduplicated.length}`);
    log(`   Removed: ${duplicates} duplicates`);

    // Step 4: Assign codes
    logStep('STEP 3: ASSIGNING UNIQUE CODES');
    log('Creating coded records...');

    const codeResult = assignCodes(deduplicated);
    const { coded } = codeResult;

    log(`✅ Codes assigned to ${coded.length} records`);

    // Step 5: Clear and prepare organized sheet
    logStep('STEP 4: CLEARING ORGANIZED SHEET');
    log('Clearing existing data...');

    await sheets.spreadsheets.values.clear({
      spreadsheetId: ORGANIZED_SHEET_ID,
      range: 'Sheet1',
    });

    log('✅ Sheet cleared');

    // Step 6: Write headers and data to Sheet1 (Master Data)
    logStep('STEP 5: WRITING TO MASTER DATA');
    log(`Writing ${coded.length} records to organized sheet...`);

    // Batch write - Google Sheets limits to 1 million cells per request
    const batchSize = 1000;
    let written = 0;

    for (let i = 0; i < coded.length; i += batchSize) {
      const batch = coded.slice(i, i + batchSize);
      const startRow = i + 2; // +1 for header, +1 for 1-indexed

      await sheets.spreadsheets.values.update({
        spreadsheetId: ORGANIZED_SHEET_ID,
        range: `Sheet1!A${startRow}`,
        valueInputOption: 'RAW',
        resource: { values: batch },
      });

      written += batch.length;
      const pct = ((written / coded.length) * 100).toFixed(1);
      log(`   Written ${written}/${coded.length} records (${pct}%)`);
    }

    // Write headers
    const codeHeader = ['Code', ...headers];
    await sheets.spreadsheets.values.update({
      spreadsheetId: ORGANIZED_SHEET_ID,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      resource: { values: [codeHeader] },
    });

    log(`✅ Master Data tab populated with ${coded.length} records`);

    // Step 7: Create summary
    logStep('STEP 6: DATA POPULATION COMPLETE');

    log('\n📊 SUMMARY:');
    log(`   Original Records:      ${dataRows.length}`);
    log(`   Deduplicated Records:  ${deduplicated.length}`);
    log(`   Duplicates Removed:    ${duplicates}`);
    log(`   Dedup Rate:            ${((duplicates / dataRows.length) * 100).toFixed(2)}%`);
    log(`   Total Records Written: ${coded.length}`);
    log(`   Unique Codes Assigned: ${coded.length}`);

    log('\n✨ Data population successful!');
    log('\n📍 Organized Sheet ID: ' + ORGANIZED_SHEET_ID);
    log('\n✅ All data is now in: Akoya-Oxygen-2023-Organized sheet\n');

    return {
      success: true,
      originalRecords: dataRows.length,
      deduplicatedRecords: deduplicated.length,
      duplicatesRemoved: duplicates,
      codesAssigned: coded.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run
main();
