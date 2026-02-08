/**
 * PHASE 3: ADD MISSING COLUMNS TO PROPERTY TABS
 * Purpose: Enhance existing property tabs with critical missing fields
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
 * Add missing columns to Properties - Confidential tab
 */
async function enhanceConfidentialPropertiesTab() {
  console.log('\n📋 Enhancing PROPERTIES - CONFIDENTIAL Tab...');
  
  // Get current headers
  const response = await sheetsAPI.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Properties - Confidential'!1:1"
  });

  const currentHeaders = response.data.values[0] || [];
  console.log(`  Current columns: ${currentHeaders.length}`);

  // Define required new columns
  const requiredColumns = [
    'Property Code',
    'Plot Number', 
    'Unit Number',
    'Registration Number',
    'Municipality Number', 
    'DEWA Premise Number',
    'Owner Name',
    'Owner Phone',
    'Current Status Code',
    'Financing Details',
    'Special Notes'
  ];

  // Find missing columns
  const missingColumns = requiredColumns.filter(col => !currentHeaders.includes(col));
  
  if (missingColumns.length === 0) {
    console.log('  ℹ All required columns already exist');
    return;
  }

  console.log(`  Found ${missingColumns.length} missing columns:`, missingColumns.join(', '));

  // Add missing columns to header row
  const newHeaders = [...currentHeaders];
  missingColumns.forEach(col => {
    if (!newHeaders.includes(col)) {
      newHeaders.push(col);
    }
  });

  // Update header row
  await sheetsAPI.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Properties - Confidential'!A1",
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [newHeaders]
    }
  });

  console.log(`  ✅ Added ${missingColumns.length} columns to Confidential tab`);
  return {
    addedColumns: missingColumns,
    totalColumns: newHeaders.length
  };
}

/**
 * Add missing columns to Properties - Non-Confidential tab
 */
async function enhanceNonConfidentialPropertiesTab() {
  console.log('\n📋 Enhancing PROPERTIES - NON-CONFIDENTIAL Tab...');
  
  const response = await sheetsAPI.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Properties - Non-Confidential'!1:1"
  });

  const currentHeaders = response.data.values[0] || [];
  console.log(`  Current columns: ${currentHeaders.length}`);

  const requiredColumns = [
    'Property Code',
    'Project Code',
    'Property Type Code',
    'Layout Code',
    'Size (SqFt)',
    'Area Name',
    'Number of Rooms',
    'Number of Bathrooms',
    'Floor Number',
    'Facing Direction',
    'Availability Status',
    'Last Updated'
  ];

  const missingColumns = requiredColumns.filter(col => !currentHeaders.includes(col));
  
  if (missingColumns.length === 0) {
    console.log('  ℹ All required columns already exist');
    return;
  }

  console.log(`  Found ${missingColumns.length} missing columns:`, missingColumns.join(', '));

  const newHeaders = [...currentHeaders];
  missingColumns.forEach(col => {
    if (!newHeaders.includes(col)) {
      newHeaders.push(col);
    }
  });

  await sheetsAPI.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Properties - Non-Confidential'!A1",
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [newHeaders]
    }
  });

  console.log(`  ✅ Added ${missingColumns.length} columns to Non-Confidential tab`);
  return {
    addedColumns: missingColumns,
    totalColumns: newHeaders.length
  };
}

/**
 * Enhance Contacts Information tab with additional fields
 */
async function enhanceContactInformationTab() {
  console.log('\n📋 Enhancing CONTACT INFORMATION Tab...');
  
  const response = await sheetsAPI.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Contacts'!1:1"
  });

  const currentHeaders = response.data.values[0] || [];
  console.log(`  Current columns: ${currentHeaders.length}`);

  const requiredColumns = [
    'Contact Code',
    'Contact Name',
    'Contact Type Code',
    'Phone Number',
    'Mobile',
    'Secondary Mobile',
    'Email',
    'Address',
    'Status',
    'Properties Count',
    'Last Contact Date',
    'Notes'
  ];

  const missingColumns = requiredColumns.filter(col => !currentHeaders.includes(col));
  
  if (missingColumns.length === 0) {
    console.log('  ℹ All required columns already exist');
    return;
  }

  console.log(`  Found ${missingColumns.length} missing columns:`, missingColumns.join(', '));

  const newHeaders = [...currentHeaders];
  missingColumns.forEach(col => {
    if (!newHeaders.includes(col)) {
      newHeaders.push(col);
    }
  });

  await sheetsAPI.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Contacts'!A1",
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [newHeaders]
    }
  });

  console.log(`  ✅ Added ${missingColumns.length} columns to Contacts tab`);
  return {
    addedColumns: missingColumns,
    totalColumns: newHeaders.length
  };
}

/**
 * Create or enhance Financial Information tab
 */
async function enhanceFinancialPropertiesTab() {
  console.log('\n📋 Enhancing PROPERTIES - FINANCIAL Tab...');
  
  try {
    const response = await sheetsAPI.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'Properties - Financial'!1:1"
    });

    const currentHeaders = response.data.values[0] || [];
    console.log(`  Current columns: ${currentHeaders.length}`);

    const requiredColumns = [
      'Property Code',
      'Price (AED)',
      'Price per SqFt',
      'Listing Status',
      'Commission Rate (%)',
      'Commission Amount (AED)',
      'Payment Terms',
      'Financing Available',
      'Down Payment Required',
      'Monthly Payment (Rent)',
      'Annual ROI (%)',
      'Listed Date',
      'Last Updated',
      'Notes'
    ];

    const missingColumns = requiredColumns.filter(col => !currentHeaders.includes(col));

    const newHeaders = [...currentHeaders];
    missingColumns.forEach(col => {
      if (!newHeaders.includes(col)) {
        newHeaders.push(col);
      }
    });

    await sheetsAPI.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: "'Properties - Financial'!A1",
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [newHeaders]
      }
    });

    console.log(`  ✅ Ensured ${newHeaders.length} columns in Financial tab`);
    return {
      addedColumns: missingColumns,
      totalColumns: newHeaders.length
    };
  } catch (err) {
    console.log(`  ⚠ Financial tab issue: ${err.message}`);
  }
}

/**
 * Add helper columns to Sheet1 for data validation
 */
async function enhanceSheet1WithValidationColumns() {
  console.log('\n📋 Enhancing SHEET1 with Validation Columns...');
  
  try {
    const response = await sheetsAPI.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'Sheet1'!1:1"
    });

    const currentHeaders = response.data.values[0] || [];
    
    // Add validation helper columns (hidden)
    const validationColumns = [
      'Project Exists (Validation)',
      'Contact Exists (Validation)',
      'Data Quality Score'
    ];

    const newHeaders = [...currentHeaders];
    validationColumns.forEach(col => {
      if (!newHeaders.includes(col)) {
        newHeaders.push(col);
      }
    });

    // Only update if we added new headers
    if (newHeaders.length > currentHeaders.length) {
      await sheetsAPI.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: "'Sheet1'!A1",
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [newHeaders]
        }
      });

      console.log(`  ✅ Added ${validationColumns.length} validation columns`);
    }

  } catch (err) {
    console.log(`  ℹ Sheet1 validation columns: ${err.message}`);
  }
}

/**
 * Create missing columns summary report
 */
async function generateEnhancementReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    phase: 3,
    phaseName: 'Adding Missing Columns',
    tabsEnhanced: {
      confidential: results.confidential,
      nonConfidential: results.nonConfidential,
      contacts: results.contacts,
      financial: results.financial,
      sheet1: results.sheet1
    },
    summary: {
      totalColumnsAdded: [
        results.confidential?.addedColumns?.length || 0,
        results.nonConfidential?.addedColumns?.length || 0,
        results.contacts?.addedColumns?.length || 0,
        results.financial?.addedColumns?.length || 0,
        results.sheet1?.addedColumns?.length || 0
      ].reduce((a, b) => a + b, 0)
    }
  };

  // Save report
  const logsDir = path.join(__dirname, 'logs', 'implementation');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(logsDir, 'phase-3-add-columns.json'),
    JSON.stringify(report, null, 2)
  );

  return report;
}

/**
 * RUN ALL ENHANCEMENTS
 */
async function runPhase3() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('PHASE 3: ADDING MISSING COLUMNS TO PROPERTY TABS');
  console.log('═══════════════════════════════════════════════════════════════');
  
  try {
    const results = {
      confidential: await enhanceConfidentialPropertiesTab(),
      nonConfidential: await enhanceNonConfidentialPropertiesTab(),
      contacts: await enhanceContactInformationTab(),
      financial: await enhanceFinancialPropertiesTab(),
      sheet1: await enhanceSheet1WithValidationColumns()
    };

    const report = await generateEnhancementReport(results);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ PHASE 3 COMPLETE: All Missing Columns Added');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\nSummary:`);
    console.log(`  • Confidential tab: +${results.confidential?.addedColumns?.length || 0} columns`);
    console.log(`  • Non-Confidential tab: +${results.nonConfidential?.addedColumns?.length || 0} columns`);
    console.log(`  • Contacts tab: +${results.contacts?.addedColumns?.length || 0} columns`);
    console.log(`  • Financial tab: +${results.financial?.addedColumns?.length || 0} columns`);
    console.log(`  • Sheet1 validation: +${results.sheet1?.addedColumns?.length || 0} columns`);
    console.log(`\n✓ Total columns added: ${report.summary.totalColumnsAdded}`);

  } catch (err) {
    console.error('❌ Error in Phase 3:', err.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runPhase3();
}

module.exports = {
  enhanceConfidentialPropertiesTab,
  enhanceNonConfidentialPropertiesTab,
  enhanceContactInformationTab,
  enhanceFinancialPropertiesTab,
  enhanceSheet1WithValidationColumns,
  runPhase3
};
