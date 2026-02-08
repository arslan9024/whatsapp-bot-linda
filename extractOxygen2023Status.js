/**
 * extractOxygen2023Status.js
 * Extracts PropertyStatus values from original Oxygen2023 sheet (Column N)
 * Maps them to comprehensive enum
 * Run with: node extractOxygen2023Status.js
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEYS_PATH = path.join(__dirname, './code/GoogleAPI/keys.json');
const OXYGEN2023_SHEET_ID = '1wBX2zhUaBg082BUmGCvqCSPI6w8eDJFtxZAsH2LjiaY';
const LOGS_DIR = path.join(__dirname, './logs/sheet-analysis');

async function extractOxygen2023Status() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('OXYGEN2023 SHEET - PROPERTYSTATUS EXTRACTION');
    console.log('Extracting Column N (PropertyStatus) from original data');
    console.log('='.repeat(80) + '\n');

    // Create auth
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

    // Get headers first
    console.log('Fetching sheet headers...');
    const headersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: OXYGEN2023_SHEET_ID,
      range: 'Sheet1!1:1',
      auth: jwtClient
    });

    const headers = headersResponse.data.values?.[0] || [];
    console.log(`Found ${headers.length} columns`);
    console.log(`Column headers: ${headers.slice(0, 15).join(' | ')}\n`);

    // Find PropertyStatus column
    const statusColumnIndex = headers.findIndex(h => 
      h && h.toLowerCase().includes('status')
    );
    
    const statusColumnLetter = statusColumnIndex >= 0 
      ? String.fromCharCode(65 + statusColumnIndex)
      : 'N';

    console.log(`PropertyStatus column: ${statusColumnLetter} (index ${statusColumnIndex})`);

    // Get all data from PropertyStatus column
    console.log(`\nFetching Column ${statusColumnLetter} data...\n`);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: OXYGEN2023_SHEET_ID,
      range: `Sheet1!${statusColumnLetter}:${statusColumnLetter}`,
      auth: jwtClient
    });

    const columnValues = response.data.values || [];
    console.log(`Total rows: ${columnValues.length - 1} (excluding header)\n`);

    // Analyze unique values
    const uniqueValues = new Map();
    const exampleRows = new Map(); // Store first few rows for each status

    columnValues.forEach((row, rowIndex) => {
      if (rowIndex === 0) return; // Skip header

      const value = (row[0] || '').trim();
      if (value) {
        if (!uniqueValues.has(value)) {
          uniqueValues.set(value, 0);
          exampleRows.set(value, rowIndex + 1); // Store row number
        }
        uniqueValues.set(value, uniqueValues.get(value) + 1);
      }
    });

    // Display findings
    console.log('UNIQUE PROPERTYSTATUS VALUES FOUND:');
    console.log('-'.repeat(80));

    const sorted = Array.from(uniqueValues.entries())
      .sort((a, b) => b[1] - a[1]);

    const detailedAnalysis = [];

    sorted.forEach(([value, count], index) => {
      const percentage = ((count / (columnValues.length - 1)) * 100).toFixed(2);
      const rowExample = exampleRows.get(value);

      detailedAnalysis.push({
        rank: index + 1,
        value: value,
        count: count,
        percentage: percentage,
        example_row: rowExample
      });

      console.log(`\n${index + 1}. "${value}"`);
      console.log(`   Count: ${count} (${percentage}%)`);
      console.log(`   First Example: Row ${rowExample}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('STATUS MAPPING RECOMMENDATIONS');
    console.log('='.repeat(80) + '\n');

    const mappingRecommendations = {};
    const unmapped = [];

    // Suggest mappings based on keywords
    sorted.forEach(([value, _]) => {
      const lower = value.toLowerCase();
      let suggestion = null;

      if (lower.includes('sale') || lower.includes('buy') || lower.includes('sell')) {
        suggestion = 'SALE';
      } else if (lower.includes('rent') || lower.includes('lease')) {
        suggestion = 'RENT';
      } else if (lower.includes('sold') || lower.includes('closed')) {
        suggestion = 'SOLD';
      } else if (lower.includes('rent') && (lower.includes('ed') || lower.includes('ed'))) {
        suggestion = 'RENTED';
      } else if (lower.includes('pending') || lower.includes('offer')) {
        suggestion = 'PENDING';
      } else if (lower.includes('vacant') || lower.includes('unlisted') || lower.trim() === '') {
        suggestion = 'VACANT';
      }

      if (suggestion) {
        if (!mappingRecommendations[suggestion]) {
          mappingRecommendations[suggestion] = [];
        }
        mappingRecommendations[suggestion].push(value);
      } else {
        unmapped.push(value);
      }
    });

    console.log('RECOMMENDED MAPPINGS TO ENUM:\n');

    Object.entries(mappingRecommendations).forEach(([enumValue, originalValues]) => {
      console.log(`${enumValue}`);
      originalValues.forEach(orig => {
        const count = uniqueValues.get(orig);
        console.log(`  ← "${orig}" (${count} records)`);
      });
      console.log();
    });

    if (unmapped.length > 0) {
      console.log('⚠️  UNMAPPED VALUES (Require Manual Review):');
      unmapped.forEach(value => {
        const count = uniqueValues.get(value);
        console.log(`  - "${value}" (${count} records) - NEEDS MAPPING`);
      });
      console.log();
    }

    // Save analysis report
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      source_sheet: {
        sheet_id: OXYGEN2023_SHEET_ID,
        sheet_name: 'Oxygen2023',
        sheet_tab: 'Sheet1'
      },
      column: {
        letter: statusColumnLetter,
        index: statusColumnIndex,
        name: headers[statusColumnIndex] || 'PropertyStatus'
      },
      analysis: {
        total_rows: columnValues.length - 1,
        unique_values: uniqueValues.size,
        distinct_statuses: detailedAnalysis
      },
      mapping_recommendations: mappingRecommendations,
      unmapped_values: unmapped,
      enum_targets: ['SALE', 'RENT', 'SOLD', 'RENTED', 'PENDING', 'VACANT']
    };

    const reportPath = path.join(LOGS_DIR, 'oxygen2023-status-analysis.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('='.repeat(80));
    console.log(`Report saved to: ${reportPath}\n`);

    // Create mapping file
    const mappingFilePath = path.join(__dirname, './code/Mappings/PropertyStatusMapping.js');
    const mappingFileDir = path.dirname(mappingFilePath);

    if (!fs.existsSync(mappingFileDir)) {
      fs.mkdirSync(mappingFileDir, { recursive: true });
    }

    const mappingFileContent = `/**
 * PropertyStatusMapping.js
 * Maps original Oxygen2023 PropertyStatus values to comprehensive enum
 * Auto-generated from oxygen2023-status-analysis.json
 * Generated: ${new Date().toISOString()}
 */

const PROPERTY_STATUS_MAPPING = {
${Object.entries(mappingRecommendations)
  .map(([enumValue, originalValues]) =>
    `  // Maps to: ${enumValue}\n` +
    originalValues
      .map(orig => `  '${orig}': '${enumValue}'`)
      .join(',\n')
  )
  .join(',\n')}
};

const UNMAPPED_VALUES = [
${unmapped.map(v => `  '${v}'`).join(',\n')}
];

export { PROPERTY_STATUS_MAPPING, UNMAPPED_VALUES };

export default {
  PROPERTY_STATUS_MAPPING,
  UNMAPPED_VALUES
};
`;

    fs.writeFileSync(mappingFilePath, mappingFileContent);
    console.log(`Mapping file created: ${mappingFilePath}\n`);

    console.log('='.repeat(80) + '\n');
    process.exit(0);

  } catch (error) {
    console.error('\nError extracting PropertyStatus:', error.message || error);
    process.exit(1);
  }
}

extractOxygen2023Status();
