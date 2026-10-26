/**
 * analyzeColumnN.js
 * Analyzes the current PropertyStatus values in Column N of the organized sheet
 * Shows what values exist now and how they map to the comprehensive enum
 * Run with: node analyzeColumnN.js
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PropertyStatusConfig from './code/config/PropertyStatusConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEYS_PATH = path.join(__dirname, './code/GoogleAPI/keys.json');
const SHEET_ID = '1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk'; // Organized sheet

async function analyzeColumnN() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('COLUMN N (PropertyStatus) ANALYSIS');
    console.log('='.repeat(70) + '\n');

    // Create auth client
    const keyFileData = fs.readFileSync(KEYS_PATH, 'utf8');
    const keyFile = JSON.parse(keyFileData);
    const jwtClient = new (google.auth.JWT)(
      keyFile.client_email,
      null,
      keyFile.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    jwtClient.authorize((err, tokens) => {
      if (err) throw err;
    });

    const sheets = google.sheets('v4');

    // Get all data from Column N
    console.log('Fetching Column N data...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Sheet1!N:N',
      auth: jwtClient
    });

    const columnValues = response.data.values || [];
    console.log(`Total rows: ${columnValues.length - 1} (excluding header)\n`);

    // Analyze unique values
    const uniqueValues = new Map();
    
    columnValues.forEach((row, index) => {
      if (index === 0) return; // Skip header
      
      const value = (row[0] || '').trim();
      if (value) {
        uniqueValues.set(value, (uniqueValues.get(value) || 0) + 1);
      }
    });

    // Display results
    console.log('UNIQUE STATUS VALUES IN COLUMN N:');
    console.log('-'.repeat(70));

    const sorted = Array.from(uniqueValues.entries())
      .sort((a, b) => b[1] - a[1]);

    let totalValidated = 0;
    let totalInvalid = 0;

    const analysisTable = [];

    sorted.forEach(([value, count]) => {
      const normalized = PropertyStatusConfig.normalizeStatus(value);
      const isValid = normalized ? 'YES' : 'NO';
      
      if (normalized) {
        totalValidated += count;
      } else {
        totalInvalid += count;
      }

      analysisTable.push({
        value: value,
        count: count,
        percentage: ((count / (columnValues.length - 1)) * 100).toFixed(2),
        valid: isValid,
        normalized_to: normalized ? normalized.code : 'INVALID',
        color: normalized ? normalized.color : 'N/A'
      });

      console.log(`\n"${value}"\n  Count: ${count} (${((count / (columnValues.length - 1)) * 100).toFixed(2)}%)`);
      if (normalized) {
        console.log(`  ✓ Valid - normalized to: ${normalized.code}`);
        console.log(`    Label: ${normalized.label}`);
      } else {
        console.log(`  ✗ INVALID - no match in enum`);
        console.log(`    Suggestion: Needs manual review or mapping`);
      }
    });

    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70) + '\n');
    console.log(`Unique values found: ${uniqueValues.size}`);
    console.log(`Valid (map to enum): ${totalValidated} records`);
    console.log(`Invalid (need review): ${totalInvalid} records`);
    console.log(`Valid percentage: ${((totalValidated / (columnValues.length - 1)) * 100).toFixed(2)}%\n`);

    // Show recommended enum values
    console.log('AVAILABLE STATUS ENUM VALUES:');
    console.log('-'.repeat(70));
    const validStatuses = PropertyStatusConfig.getAllValidStatuses();
    validStatuses.forEach(status => {
      const statusObj = PropertyStatusConfig.getStatusByCode(status);
      console.log(`\n${status}\n  ${statusObj.label}\n  Aliases: ${statusObj.aliases.join(', ')}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('RECOMMENDATIONS');
    console.log('='.repeat(70) + '\n');

    if (totalInvalid > 0) {
      console.log(`⚠️  Found ${totalInvalid} records with invalid status values`);
      console.log('Action Items:');
      console.log('1. Review the flagged rows manually');
      console.log('2. Map them to one of the 6 valid statuses: SALE, RENT, SOLD, RENTED, PENDING, VACANT');
      console.log('3. Update using SheetEnhancementService after mapping\n');
    } else {
      console.log('✓ All status values are valid!\n');
    }

    // Save analysis report
    const reportPath = path.join(__dirname, './logs/sheet-analysis/column-n-analysis.json');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      sheet_id: SHEET_ID,
      column: 'N',
      column_name: 'PropertyStatus',
      total_rows: columnValues.length - 1,
      unique_values_count: uniqueValues.size,
      valid_records: totalValidated,
      invalid_records: totalInvalid,
      valid_percentage: ((totalValidated / (columnValues.length - 1)) * 100).toFixed(2),
      unique_values: analysisTable,
      available_enum: validStatuses,
      recommendations: totalInvalid > 0 
        ? 'Review and map invalid values to SALE, RENT, SOLD, RENTED, PENDING, VACANT'
        : 'All values are valid'
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Report saved to: ${reportPath}\n`);

    process.exit(0);

  } catch (error) {
    console.error('Error analyzing Column N:', error);
    process.exit(1);
  }
}

analyzeColumnN();
