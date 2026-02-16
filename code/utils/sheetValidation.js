/**
 * Sheet Validation Service (Session 16 - Phase 2)
 * 
 * Validates that serviceman11 account has proper read/write access
 * to the organized Akoya sheet before bot starts processing messages
 * 
 * Usage:
 *   import { validateSheetAccess } from './sheetValidation.js';
 *   const validation = await validateSheetAccess(sheetId);
 *   if (!validation.hasReadAccess || !validation.hasWriteAccess) {
 *     throw new Error('Sheet access validation failed');
 *   }
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Paths to credential files
const SERVICEMAN11_CREDS_PATH = path.join(__dirname, '../Integration/Google/accounts/serviceman11/keys.json');
const POWER_AGENT_CREDS_PATH = path.join(__dirname, '../Integration/Google/keys.json');

/**
 * Validate sheet access for serviceman11 account
 * @param {string} sheetId - Google Sheet ID to validate
 * @param {Object} options - Validation options
 * @param {boolean} [options.requireWrite=true] - Require write access
 * @param {boolean} [options.checkTabs=true] - Verify required tabs exist
 * @returns {Promise<Object>} Validation result
 */
export async function validateSheetAccess(sheetId, options = {}) {
  const {
    requireWrite = true,
    checkTabs = true,
    tabsToCheck = ['Master Data', 'Code Reference Map', 'Data Viewer']
  } = options;

  console.log('\n📋 Validating sheet access for serviceman11...\n');

  const result = {
    sheetId,
    hasReadAccess: false,
    hasWriteAccess: false,
    hasRequiredTabs: false,
    foundTabs: [],
    errors: [],
    warnings: [],
    timestamp: new Date().toISOString()
  };

  try {
    // Step 1: Load serviceman11 credentials
    if (!fs.existsSync(SERVICEMAN11_CREDS_PATH)) {
      console.log('\n⚠️  serviceman11 credentials not configured');
      console.log('   Expected: ' + SERVICEMAN11_CREDS_PATH);
      console.log('   To set up Google Sheets integration, run:');
      console.log('   → node setup-serviceman11.js path/to/keys.json sheet-id\n');
      result.errors.push(`serviceman11 credentials not found at ${SERVICEMAN11_CREDS_PATH}`);
      result.errors.push('Run: node setup-serviceman11.js path/to/keys.json sheet-id');
      return result;
    }

    const credentials = JSON.parse(fs.readFileSync(SERVICEMAN11_CREDS_PATH, 'utf8'));
    
    // Step 2: Test read access
    console.log('🔍 Testing read access (get metadata)...');
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });

    let sheetMetadata;
    try {
      sheetMetadata = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });
      result.hasReadAccess = true;
      console.log('✅ Read access confirmed');
      console.log(`   Sheet Name: ${sheetMetadata.data.properties.title}`);
    } catch (error) {
      result.errors.push(`Cannot read sheet: ${error.message}`);
      console.error('❌ Read access failed:', error.message);
      return result;
    }

    // Step 3: Check for required tabs
    if (checkTabs && sheetMetadata) {
      console.log('\n📑 Checking for required tabs...');
      const foundTabNames = sheetMetadata.data.sheets.map(s => s.properties.title);
      result.foundTabs = foundTabNames;

      const hasAllTabs = tabsToCheck.every(tab => foundTabNames.includes(tab));
      result.hasRequiredTabs = hasAllTabs;

      if (hasAllTabs) {
        console.log('✅ All required tabs found:');
        tabsToCheck.forEach(tab => console.log(`   ✓ ${tab}`));
      } else {
        const missingTabs = tabsToCheck.filter(tab => !foundTabNames.includes(tab));
        result.warnings.push(`Missing tabs: ${missingTabs.join(', ')}`);
        console.warn('⚠️  Missing tabs:', missingTabs.join(', '));
        console.log('   Found tabs:', foundTabNames.join(', '));
      }
    }

    // Step 4: Test write access
    if (requireWrite) {
      console.log('\n✍️  Testing write access (update test cell)...');
      try {
        const testValue = `✅ serviceman11 write test - ${new Date().toISOString()}`;
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: 'Data Viewer!A1',
          valueInputOption: 'RAW',
          requestBody: {
            values: [[testValue]],
          },
        });
        result.hasWriteAccess = true;
        console.log('✅ Write access confirmed');
        console.log('   Test value written to Data Viewer!A1');
      } catch (error) {
        result.errors.push(`Cannot write to sheet: ${error.message}`);
        console.error('❌ Write access failed:', error.message);
        if (requireWrite) {
          return result;
        }
      }
    }

    // Step 5: Test Drive API access
    console.log('\n🔐 Testing Drive API access...');
    try {
      const fileMetadata = await drive.files.get({
        fileId: sheetId,
        fields: 'name, owners, permissions',
      });
      console.log('✅ Drive API access confirmed');
      console.log(`   File: ${fileMetadata.data.name}`);
      console.log(`   Owner: ${fileMetadata.data.owners?.[0]?.emailAddress || 'Unknown'}`);
    } catch (error) {
      result.warnings.push(`Drive API access limited: ${error.message}`);
      console.warn('⚠️  Drive API warning:', error.message);
    }

    // Step 6: Check record count in Master Data
    if (result.hasReadAccess) {
      console.log('\n📊 Checking Master Data records...');
      try {
        const masterData = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: 'Master Data!A:A',
        });
        const recordCount = (masterData.data.values?.length || 0) - 1; // Subtract header
        console.log(`✅ Master Data loaded: ${recordCount} records found`);
        result.recordCount = recordCount;
      } catch (error) {
        result.warnings.push(`Could not read Master Data: ${error.message}`);
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    if (result.hasReadAccess && result.hasWriteAccess) {
      console.log('✅ VALIDATION PASSED - Sheet is ready to use');
    } else if (result.hasReadAccess && !result.hasWriteAccess) {
      console.log('⚠️  PARTIAL VALIDATION - Read-only mode');
    } else {
      console.log('❌ VALIDATION FAILED - Cannot access sheet');
    }
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    result.errors.push(`Unexpected error: ${error.message}`);
    console.error('❌ Validation error:', error.message);
  }

  return result;
}

/**
 * Quick validation check during bot startup
 * Used in index.js to ensure sheet is accessible before processing messages
 */
export async function quickValidateSheet(sheetId) {
  try {
    const validation = await validateSheetAccess(sheetId, {
      requireWrite: true,
      checkTabs: true,
    });

    // Fail fast if critical checks fail
    if (!validation.hasReadAccess) {
      console.error('\n❌ FATAL: Cannot read from organized sheet');
      console.error('   serviceman11 read access failed');
      console.error('   Bot will start in FALLBACK MODE (legacy sheets only)\n');
      return false;
    }

    if (!validation.hasWriteAccess) {
      console.warn('\n⚠️  WARNING: Cannot write to organized sheet');
      console.warn('   serviceman11 write access failed');
      console.warn('   Bot will run in READ-ONLY mode (no new data saves)\n');
      // Don't fail - allow read-only operation
    }

    return true;

  } catch (error) {
    console.error('Sheet validation exception:', error.message);
    return false;
  }
}

export default { validateSheetAccess, quickValidateSheet };
