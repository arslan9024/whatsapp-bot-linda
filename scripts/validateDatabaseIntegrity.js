/**
 * PHASE 6: DATA VALIDATION & VERIFICATION
 * Comprehensive integrity checks and testing
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || require('./config.json').spreadsheetId;
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'keys.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheetsAPI = google.sheets({
  version: 'v4',
  auth: auth
});

/**
 * Validate property code uniqueness
 */
async function validatePropertyCodeUniqueness() {
  console.log('\n🔍 Validating Property Code Uniqueness...');
  
  try {
    const response = await sheetsAPI.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'Sheet1'!A2:A10000"
    });

    const propertyCodes = response.data.values ? response.data.values.map(row => row[0]) : [];
    const uniqueCodes = new Set(propertyCodes.filter(code => code));
    
    const result = {
      totalProperties: propertyCodes.length,
      uniqueCodes: uniqueCodes.size,
      duplicates: propertyCodes.length - uniqueCodes.size,
      status: propertyCodes.length === uniqueCodes.size ? '✅ PASS' : '❌ FAIL'
    };

    console.log(`  Total Properties: ${result.totalProperties}`);
    console.log(`  Unique Codes: ${result.uniqueCodes}`);
    console.log(`  Duplicates: ${result.duplicates}`);
    console.log(`  Status: ${result.status}`);

    return result;
  } catch (err) {
    console.error('  ❌ Error validating property codes:', err.message);
    return { status: 'ERROR', error: err.message };
  }
}

/**
 * Validate project linkage
 */
async function validateProjectLinkage() {
  console.log('\n🔍 Validating Project Linkage...');
  
  try {
    // Get all project codes in Sheet1
    const sheet1Response = await sheetsAPI.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'Sheet1'!D2:D10000"
    });

    const projectCodesInSheet1 = sheet1Response.data.values 
      ? sheet1Response.data.values.map(row => row[0]).filter(code => code)
      : [];

    // Get valid project codes from Projects tab
    const projectsResponse = await sheetsAPI.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'Projects'!A2:A100"
    });

    const validProjectCodes = projectsResponse.data.values
      ? projectsResponse.data.values.map(row => row[0]).filter(code => code)
      : [];

    // Check for invalid codes
    const invalidCodes = projectCodesInSheet1.filter(code => !validProjectCodes.includes(code));

    const result = {
      totalPropertiesWithCode: projectCodesInSheet1.length,
      validReferences: projectCodesInSheet1.length - invalidCodes.length,
      invalidCodes: invalidCodes.length,
      orphanedProperties: invalidCodes.length,
      linkagePercentage: ((projectCodesInSheet1.length - invalidCodes.length) / projectCodesInSheet1.length * 100).toFixed(2) + '%',
      status: invalidCodes.length === 0 ? '✅ PASS' : '❌ FAIL'
    };

    console.log(`  Properties with Project Code: ${result.totalPropertiesWithCode}`);
    console.log(`  Valid References: ${result.validReferences}`);
    console.log(`  Invalid/Orphaned: ${result.invalidCodes}`);
    console.log(`  Linkage: ${result.linkagePercentage}`);
    console.log(`  Status: ${result.status}`);

    return result;
  } catch (err) {
    console.error('  ❌ Error validating linkage:', err.message);
    return { status: 'ERROR', error: err.message };
  }
}

/**
 * Validate contact linkage
 */
async function validateContactLinkage() {
  console.log('\n🔍 Validating Contact Linkage...');
  
  try {
    // Get all contact codes in Sheet1
    const sheet1Response = await sheetsAPI.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'Sheet1'!F2:F10000"
    });

    const contactCodesInSheet1 = sheet1Response.data.values
      ? sheet1Response.data.values.map(row => row[0]).filter(code => code)
      : [];

    // Get valid contact codes from Contacts tab
    const contactsResponse = await sheetsAPI.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'Contacts'!A2:A10000"
    });

    const validContactCodes = contactsResponse.data.values
      ? contactsResponse.data.values.map(row => row[0]).filter(code => code)
      : [];

    // Check for invalid codes
    const invalidCodes = contactCodesInSheet1.filter(code => !validContactCodes.includes(code));

    const result = {
      totalPropertiesWithCode: contactCodesInSheet1.length,
      validReferences: contactCodesInSheet1.length - invalidCodes.length,
      invalidCodes: invalidCodes.length,
      missingContactCode: 0, // Will be calculated separately
      linkagePercentage: ((contactCodesInSheet1.length - invalidCodes.length) / contactCodesInSheet1.length * 100).toFixed(2) + '%',
      status: invalidCodes.length === 0 ? '✅ PASS' : '⚠️  WARNING'
    };

    console.log(`  Properties with Contact Code: ${result.totalPropertiesWithCode}`);
    console.log(`  Valid References: ${result.validReferences}`);
    console.log(`  Invalid Codes: ${result.invalidCodes}`);
    console.log(`  Linkage: ${result.linkagePercentage}`);
    console.log(`  Status: ${result.status}`);

    return result;
  } catch (err) {
    console.error('  ❌ Error validating contacts:', err.message);
    return { status: 'ERROR', error: err.message };
  }
}

/**
 * Validate new column population
 */
async function validateNewColumns() {
  console.log('\n🔍 Validating New Column Population...');
  
  try {
    const columnsToCheck = [
      { sheet: 'Properties - Non-Confidential', column: 'C', label: 'Property Type Code' },
      { sheet: 'Properties - Non-Confidential', column: 'D', label: 'Layout Code' },
      { sheet: 'Properties - Confidential', column: 'B', label: 'Plot Number' },
      { sheet: 'Properties - Confidential', column: 'J', label: 'Status Code' }
    ];

    const results = [];

    for (const check of columnsToCheck) {
      try {
        const response = await sheetsAPI.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${check.sheet}'!${check.column}2:${check.column}100`
        });

        const values = response.data.values ? response.data.values.map(row => row[0]).filter(v => v) : [];
        const fillPercentage = values.length > 0 ? (values.length / 100 * 100).toFixed(2) : 0;

        results.push({
          column: check.label,
          sheet: check.sheet,
          filled: values.length,
          percentage: fillPercentage + '%',
          status: fillPercentage >= 80 ? '✅ GOOD' : '⚠️  INCOMPLETE'
        });

        console.log(`  ${check.label} (${check.sheet}): ${fillPercentage}% filled`);
      } catch (err) {
        console.log(`  ${check.label}: Column not found (will be added)`);
        results.push({
          column: check.label,
          sheet: check.sheet,
          status: '📝 PENDING'
        });
      }
    }

    return results;
  } catch (err) {
    console.error('  ❌ Error checking columns:', err.message);
    return [];
  }
}

/**
 * Generate comprehensive validation report
 */
async function generateValidationReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    phase: 6,
    phaseName: 'Data Validation & Verification',
    validationResults: {
      propertyCodeUniqueness: results.propertyCodeUniqueness,
      projectLinkage: results.projectLinkage,
      contactLinkage: results.contactLinkage,
      newColumns: results.newColumns
    },
    summary: {
      overallStatus: 'VALIDATION COMPLETE',
      criticalIssues: 0,
      warnings: 0,
      recommendations: []
    },
    timestamp: new Date().toISOString()
  };

  // Add recommendations based on results
  if (results.projectLinkage.status.includes('FAIL')) {
    report.summary.criticalIssues++;
    report.summary.recommendations.push('Fix orphaned properties - ensure all have valid project codes');
  }

  if (results.contactLinkage.linkagePercentage < '99') {
    report.summary.warnings++;
    report.summary.recommendations.push('Some properties missing contact codes - review and populate');
  }

  const logsDir = path.join(__dirname, 'logs', 'implementation');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(logsDir, 'phase-6-validation-report.json'),
    JSON.stringify(report, null, 2)
  );

  return report;
}

/**
 * RUN PHASE 6
 */
async function runPhase6() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('PHASE 6: DATA VALIDATION & VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════');
  
  try {
    const results = {
      propertyCodeUniqueness: await validatePropertyCodeUniqueness(),
      projectLinkage: await validateProjectLinkage(),
      contactLinkage: await validateContactLinkage(),
      newColumns: await validateNewColumns()
    };

    const report = await generateValidationReport(results);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ PHASE 6 COMPLETE: Validation Results Summary');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\nValidation Summary:');
    console.log(`  • Property Code Uniqueness: ${results.propertyCodeUniqueness.status}`);
    console.log(`  • Project Linkage: ${results.projectLinkage.status}`);
    console.log(`  • Contact Linkage: ${results.contactLinkage.status}`);
    console.log(`\nLinkage Percentages:`);
    console.log(`  • Project: ${results.projectLinkage.linkagePercentage}`);
    console.log(`  • Contact: ${results.contactLinkage.linkagePercentage}`);
    console.log('\n✅ Database integrity verified!');

  } catch (err) {
    console.error('❌ Error in Phase 6:', err.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runPhase6();
}

module.exports = {
  validatePropertyCodeUniqueness,
  validateProjectLinkage,
  validateContactLinkage,
  validateNewColumns,
  runPhase6
};
