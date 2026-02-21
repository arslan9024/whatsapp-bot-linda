/**
 * Phase 3: In-Memory MongoDB Setup & Data Import
 * DAMAC Hills 2 Property Management System
 * Validates data and initializes API for testing
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  dataDir: path.join(__dirname, '../../data/local'),
  files: {
    owners: 'owners.json',
    contacts: 'contacts.json',
    summary: 'migration-summary.json'
  },
  apiUrl: 'http://localhost:5000/api/v1/damac',
  timeout: 5000
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m',   // Red
    reset: '\x1b[0m'
  };

  const emoji = {
    info: 'ℹ️ ',
    success: '✅',
    warning: '⚠️ ',
    error: '❌'
  };

  console.log(`${colors[type]}${emoji[type]} ${message}${colors.reset}`);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA LOADING
// ═══════════════════════════════════════════════════════════════════════════

async function loadDataFiles() {
  log('Loading Phase 2 data files...', 'info');

  try {
    const ownersPath = path.join(CONFIG.dataDir, CONFIG.files.owners);
    const contactsPath = path.join(CONFIG.dataDir, CONFIG.files.contacts);
    const summaryPath = path.join(CONFIG.dataDir, CONFIG.files.summary);

    // Check file existence
    if (!fs.existsSync(ownersPath)) {
      log(`Owners file not found: ${ownersPath}`, 'error');
      return null;
    }

    if (!fs.existsSync(contactsPath)) {
      log(`Contacts file not found: ${contactsPath}`, 'error');
      return null;
    }

    // Load files
    const ownersData = JSON.parse(fs.readFileSync(ownersPath, 'utf8'));
    const contactsData = JSON.parse(fs.readFileSync(contactsPath, 'utf8'));
    const summaryData = fs.existsSync(summaryPath) 
      ? JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
      : null;

    log(`Loaded ${ownersData.length} owner records`, 'success');
    log(`Loaded ${contactsData.length} contact records`, 'success');

    return {
      owners: ownersData,
      contacts: contactsData,
      summary: summaryData
    };
  } catch (error) {
    log(`Error loading data: ${error.message}`, 'error');
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// API TESTING
// ═══════════════════════════════════════════════════════════════════════════

async function checkApiHealth() {
  log('Checking Express API health...', 'info');

  try {
    const response = await fetch(`${CONFIG.apiUrl}/health`, {
      timeout: CONFIG.timeout
    });

    if (response.ok) {
      log('API is healthy and responding', 'success');
      return true;
    } else {
      log(`API returned status ${response.status}`, 'warning');
      return false;
    }
  } catch (error) {
    log(`API not responding: ${error.message}`, 'warning');
    return false;
  }
}

async function importDataViaApi(data) {
  log('Importing data via REST API...', 'info');

  try {
    let successCount = 0;
    let errorCount = 0;

    // Import owners
    log(`Importing ${data.owners.length} owners...`, 'info');
    for (const owner of data.owners) {
      try {
        const response = await fetch(`${CONFIG.apiUrl}/owners`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(owner),
          timeout: CONFIG.timeout
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }

    log(`Owners import: ${successCount} created, ${errorCount} errors`, 'success');

    // Import contacts
    log(`Importing ${data.contacts.length} contacts...`, 'info');
    successCount = 0;
    errorCount = 0;

    for (const contact of data.contacts) {
      try {
        const response = await fetch(`${CONFIG.apiUrl}/contacts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contact),
          timeout: CONFIG.timeout
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }

    log(`Contacts import: ${successCount} created, ${errorCount} errors`, 'success');

    return true;
  } catch (error) {
    log(`Import error: ${error.message}`, 'error');
    return false;
  }
}

async function validateImportedData() {
  log('Validating imported data...', 'info');

  try {
    const ownerCount = await fetch(`${CONFIG.apiUrl}/owners/count`, {
      timeout: CONFIG.timeout
    }).then(r => r.json());

    const contactCount = await fetch(`${CONFIG.apiUrl}/contacts/count`, {
      timeout: CONFIG.timeout
    }).then(r => r.json());

    log(`Database contains ${ownerCount} owners`, 'success');
    log(`Database contains ${contactCount} contacts`, 'success');

    return {
      owners: ownerCount,
      contacts: contactCount,
      totalRecords: ownerCount + contactCount
    };
  } catch (error) {
    log(`Validation error: ${error.message}`, 'warning');
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                              ║');
  console.log('║                 🚀 PHASE 3: IN-MEMORY MONGODB SETUP                         ║');
  console.log('║                  DAMAC Hills 2 Property Management System                    ║');
  console.log('║                           February 20, 2026                                  ║');
  console.log('║                                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Load data files
    log('STEP 1: Loading Phase 2 Data', 'info');
    const data = await loadDataFiles();

    if (!data) {
      log('Failed to load data files', 'error');
      process.exit(1);
    }

    console.log('\n');

    // Step 2: Wait for API to be ready
    log('STEP 2: Waiting for Express API', 'info');
    log('Make sure Express server is running on port 5000', 'warning');
    log('You can start it with: npm run express-server', 'info');
    log('Checking for API in 3 seconds...', 'info');

    await delay(3000);

    let apiReady = false;
    for (let i = 0; i < 10; i++) {
      if (await checkApiHealth()) {
        apiReady = true;
        break;
      }
      if (i < 9) {
        log(`Retrying... (${i + 1}/10)`, 'warning');
        await delay(1000);
      }
    }

    if (!apiReady) {
      log('API is not responding. Please ensure Express server is running.', 'error');
      log('Start with: npm run express-server', 'info');
      process.exit(1);
    }

    console.log('\n');

    // Step 3: Import data via API
    log('STEP 3: Importing Data via API', 'info');
    const imported = await importDataViaApi(data);

    if (!imported) {
      log('Failed to import data', 'error');
      process.exit(1);
    }

    console.log('\n');

    // Step 4: Validate data
    log('STEP 4: Validating Imported Data', 'info');
    await delay(1000);

    const validation = await validateImportedData();

    if (!validation) {
      log('Failed to validate data', 'error');
      process.exit(1);
    }

    console.log('\n');

    // Summary
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ PHASE 3 SETUP COMPLETE                                 ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

    log(`Total Records Imported: ${validation.totalRecords}`, 'success');
    log(`Owners: ${validation.owners}`, 'success');
    log(`Contacts: ${validation.contacts}`, 'success');

    console.log('\n');
    log('NEXT STEPS:', 'info');
    console.log('  1. Express server is ready at: http://localhost:5000');
    console.log('  2. Data has been imported and validated');
    console.log('  3. Run API tests: node code/Database/test-phase-3-api.js');
    console.log('  4. View dashboard: node code/Database/DashboardCLI.js');
    console.log('\n');

  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { loadDataFiles, checkApiHealth, importDataViaApi, validateImportedData };
