/**
 * enrichOrganizedSheet.js
 * Main script to execute the organized sheet enrichment process
 * Adds PropertyStatus and PropertyLayout columns intelligently
 * 
 * Usage:
 *   node enrichOrganizedSheet.js --dry-run        (preview changes)
 *   node enrichOrganizedSheet.js --execute        (apply changes)
 *   node enrichOrganizedSheet.js --validate       (validate changes)
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import EnrichedSheetBuilder from './code/Services/EnrichedSheetBuilder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEYS_PATH = path.join(__dirname, './code/GoogleAPI/keys.json');
const LOGS_DIR = path.join(__dirname, './logs/enrichment');

async function main() {
  try {
    // Parse command line arguments
    const mode = (process.argv[2] || '--dry-run').toLowerCase();
    const execute = mode === '--execute';
    const validate = mode === '--validate';
    const dryRun = !execute && !validate;

    console.log('\n' + '='.repeat(80));
    console.log('ORGANIZED SHEET ENRICHMENT');
    console.log(`Mode: ${mode.toUpperCase()}`);
    console.log('='.repeat(80) + '\n');

    // Create auth client
    console.log('Authenticating with Google Sheets API...');
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

    // Initialize builder
    const builder = new EnrichedSheetBuilder();
    builder.setAuthClient(jwtClient);

    // Load data
    console.log('Loading organized sheet data...');
    const sheetData = await builder.loadSheetData();
    console.log(`Loaded ${sheetData.rowCount} data rows\n`);

    // Analyze and build enrichment mappings
    console.log('Analyzing data and detecting PropertyStatus & PropertyLayout...');
    const analysis = await builder.analyzeAndMap(sheetData.data, dryRun);

    // Generate report
    const report = builder.generateReport(analysis);

    // Create logs directory if needed
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }

    // Save report
    const reportPath = path.join(LOGS_DIR, `enrichment-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nReport saved to: ${reportPath}`);

    // Display summary
    console.log('\n' + '='.repeat(80));
    console.log('ENRICHMENT SUMMARY');
    console.log('='.repeat(80) + '\n');

    console.log(`Total Records Processed: ${analysis.stats.total_processed}`);
    console.log(`\nPropertyStatus Column (N):`);
    console.log(`  - High Confidence (>80%): ${analysis.stats.confidence_high}`);
    console.log(`  - Medium Confidence (>=50%): ${analysis.stats.confidence_medium}`);
    console.log(`  - Low Confidence (<50%): ${analysis.stats.confidence_low}`);
    console.log(`  - Total Populated: ${analysis.stats.status_populated}`);

    console.log(`\nPropertyLayout Column (New):`);
    console.log(`  - Layouts Detected: ${analysis.stats.layout_populated}`);
    console.log(`  - Unable to Detect: ${analysis.stats.flagged}`);
    console.log(`  - Detection Rate: ${((analysis.stats.layout_populated / analysis.stats.total_processed) * 100).toFixed(2)}%`);

    // Show recommendations
    if (report.recommendations.length > 0) {
      console.log(`\nRecommendations:`);
      report.recommendations.forEach(rec => {
        console.log(`  - ${rec.issue}`);
        if (rec.count) console.log(`    Count: ${rec.count}`);
        console.log(`    Action: ${rec.action}`);
      });
    }

    // Execute if requested
    if (execute) {
      console.log('\n' + '='.repeat(80));
      console.log('EXECUTING UPDATES');
      console.log('='.repeat(80) + '\n');

      const result = await builder.applyUpdates(
        analysis.statusUpdates || [],
        analysis.layoutUpdates || []
      );

      console.log(`\nUpdates Applied: ${result.updatesApplied}`);
      console.log('✓ Organized sheet enrichment complete!');
    } else if (dryRun) {
      console.log('\n' + '='.repeat(80));
      console.log('DRY RUN MODE - NO CHANGES APPLIED');
      console.log('To apply changes, run: node enrichOrganizedSheet.js --execute');
      console.log('='.repeat(80) + '\n');
    }

    // Show flagged rows if any
    if (analysis.flaggedRows.length > 0 && analysis.flaggedRows.length <= 10) {
      console.log('\nFlagged Rows for Review (first 10):');
      analysis.flaggedRows.slice(0, 10).forEach(flagged => {
        console.log(`  Row ${flagged.row}: ${flagged.issue}`);
      });
    } else if (analysis.flaggedRows.length > 10) {
      console.log(`\n${analysis.flaggedRows.length} rows flagged for review`);
      console.log('See full list in report JSON file');
    }

    console.log('\n' + '='.repeat(80) + '\n');
    process.exit(0);

  } catch (error) {
    console.error('\nError during enrichment:', error);
    process.exit(1);
  }
}

main();
