/**
 * Quick Akoya Sheet Analysis
 * Direct analysis using existing GoogleSheet functions
 */

import 'dotenv/config';
import { google } from 'googleapis';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load credentials
const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || './code/GoogleAPI/keys.json';
console.log(`\n📄 Using credentials from: ${credentialsPath}\n`);

const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));

// Authenticate
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function analyzeSheet() {
  try {
    console.log('🔍 ANALYZING AKOYA-OXYGEN-2023-ARSLAN-ONLY SHEET\n');

    const sheetId = '1gV4-hSAhDyWsivajBb2E2DSs25CMbqhc-6oufP1ZX04';
    
    console.log(`📄 Sheet ID: ${sheetId}`);
    console.log('⏳ Fetching data...\n');

    // Get all data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Sheet1',
    });

    const values = response.data.values || [];
    
    if (values.length === 0) {
      throw new Error('Sheet is empty');
    }

    const totalRows = values.length;
    const totalColumns = Math.max(...values.map(row => row.length));
    const headerRow = values[0] || [];
    const dataRows = totalRows - 1;

    console.log(`✅ Data fetched successfully\n`);

    // Display header row
    console.log('📋 COLUMN HEADERS:\n');
    headerRow.forEach((header, idx) => {
      const colLetter = String.fromCharCode(65 + (idx % 26));
      const colNum = (idx + 1);
      console.log(`  ${colNum.toString().padEnd(2)} (${colLetter.padEnd(2)}) ${header || '(empty)'}`);
    });

    // Analyze each column
    console.log('\n📊 COLUMN ANALYSIS:\n');
    
    const columnData = [];
    for (let colIdx = 0; colIdx < totalColumns; colIdx++) {
      const header = headerRow[colIdx] || `Column_${colIdx + 1}`;
      const col = values.slice(1).map(row => row[colIdx] || null);
      const nonEmpty = col.filter(v => v).length;
      const fillRate = Math.round((nonEmpty / dataRows) * 100);

      columnData.push({
        index: colIdx,
        header: header.trim(),
        nonEmpty,
        fillRate,
        sampleValues: col.filter(v => v).slice(0, 2),
      });

      console.log(`
  Column ${colIdx + 1}: "${header}"
    ├─ Fill Rate: ${fillRate}%
    ├─ Non-Empty: ${nonEmpty}/${dataRows}
    └─ Sample: ${col.filter(v => v).slice(0, 1).join(', ') || '(empty)'}`);
    }

    // Summary
    console.log('\n📈 SUMMARY:\n');
    console.log(`  Total Rows: ${totalRows}`);
    console.log(`  Data Rows: ${dataRows}`);
    console.log(`  Total Columns: ${totalColumns}`);
    console.log(`  Non-Empty Columns: ${columnData.filter(c => c.fillRate > 0).length}`);
    console.log(`  Empty Columns: ${columnData.filter(c => c.fillRate === 0).length}\n`);

    // Important columns
    const importantCols = columnData.filter(c => c.fillRate >= 50);
    console.log('🎯 IMPORTANT COLUMNS (Fill >= 50%):\n');
    importantCols.forEach(col => {
      console.log(`  • "${col.header}" (${col.fillRate}% filled)`);
    });

    console.log('\n✅ Analysis complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

analyzeSheet();
