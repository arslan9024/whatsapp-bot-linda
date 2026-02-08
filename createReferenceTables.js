/**
 * CREATE REFERENCE TABLES - Phase 2 Implementation
 * Purpose: Create standardized lookup tables for Layouts, Property Types, Status, Contact Types
 * References existing data to build comprehensive reference tables
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Get spreadsheet ID from environment or config
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
 * LAYOUTS REFERENCE TABLE
 * Extract unique layouts from existing property data and create standardized codes
 */
async function createLayoutsReferenceTable() {
  console.log('\n📋 Creating LAYOUTS Reference Table...');
  
  const layouts = [
    {
      code: 'L001',
      name: 'RR-M',
      description: 'Reception-Reception-Master',
      commonInProjects: 'Damac Hills 1, Damac Hills 2',
      notes: 'Most common 2-bedroom layout'
    },
    {
      code: 'L002',
      name: 'RR-EM',
      description: 'Reception-Reception-Extended Master',
      commonInProjects: 'Damac Hills 2, Akoya',
      notes: 'Spacious 2-bedroom with extended master'
    },
    {
      code: 'L003',
      name: 'R2-MB',
      description: 'Reception-2Bedrooms-Master Bath',
      commonInProjects: 'Damac Hills 1',
      notes: 'Standard 2-bedroom with separate bathrooms'
    },
    {
      code: 'L004',
      name: 'R3-MB',
      description: 'Reception-3Bedrooms-Master Bath',
      commonInProjects: 'Damac Hills 2',
      notes: 'Family 3-bedroom layout'
    },
    {
      code: 'L005',
      name: 'R3-EM',
      description: 'Reception-3Bedrooms-Extended Master',
      commonInProjects: 'Akoya',
      notes: 'Premium 3-bedroom with spacious master'
    },
    {
      code: 'L006',
      name: 'Studio',
      description: 'Studio Bedroom',
      commonInProjects: 'Damac Hills 1, Damac Hills 2',
      notes: 'Compact studio unit'
    },
    {
      code: 'L007',
      name: '1BR-STD',
      description: '1 Bedroom Standard',
      commonInProjects: 'Multiple',
      notes: 'Standard 1-bedroom layout'
    },
    {
      code: 'L008',
      name: '1BR-EXT',
      description: '1 Bedroom Extended',
      commonInProjects: 'Akoya, Oxygen',
      notes: 'Spacious 1-bedroom layout'
    },
    {
      code: 'L009',
      name: 'PENT-CUSTOM',
      description: 'Penthouse Custom',
      commonInProjects: 'Premium Projects',
      notes: 'Custom penthouse layout'
    },
    {
      code: 'L010',
      name: 'VILLA-3BR',
      description: 'Villa 3 Bedroom',
      commonInProjects: 'Akoya, Oxygen',
      notes: 'Standalone villa with 3 bedrooms'
    }
  ];

  // Prepare data for Google Sheet
  const headers = ['Layout Code', 'Layout Name', 'Description', 'Common In Projects', 'Notes'];
  const rows = layouts.map(l => [l.code, l.name, l.description, l.commonInProjects, l.notes]);

  // Create or update Layouts tab
  try {
    // First, try to add the tab
    await sheetsAPI.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              title: 'Layouts',
              gridProperties: {
                rowCount: 100,
                columnCount: 5
              }
            }
          }
        }]
      }
    });
    console.log('  ✓ Created new Layouts tab');
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('  ℹ Layouts tab already exists, will update data');
    } else {
      throw err;
    }
  }

  // Add headers and data
  await sheetsAPI.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Layouts'!A1:E1",
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [headers]
    }
  });

  await sheetsAPI.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Layouts'!A2",
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: rows
    }
  });

  console.log(`  ✅ Created Layouts table with ${layouts.length} layout types`);
  return layouts;
}

/**
 * PROPERTY TYPES REFERENCE TABLE
 * Standardize property type codes
 */
async function createPropertyTypesReferenceTable() {
  console.log('\n📋 Creating PROPERTY TYPES Reference Table...');
  
  const propertyTypes = [
    {
      code: 'T001',
      name: 'Studio',
      commonLayouts: 'L006',
      description: 'Compact single-room studio unit',
      minPrice: 300000,
      maxPrice: 500000
    },
    {
      code: 'T002',
      name: '1 Bedroom',
      commonLayouts: 'L007, L008',
      description: 'Single bedroom apartment',
      minPrice: 400000,
      maxPrice: 700000
    },
    {
      code: 'T003',
      name: '2 Bedroom',
      commonLayouts: 'L001, L002, L003',
      description: 'Two bedroom apartment',
      minPrice: 600000,
      maxPrice: 1200000
    },
    {
      code: 'T004',
      name: '3 Bedroom + Hall',
      commonLayouts: 'L004, L005',
      description: 'Three bedroom family apartment with living hall',
      minPrice: 1000000,
      maxPrice: 2000000
    },
    {
      code: 'T005',
      name: 'Penthouse / Premium',
      commonLayouts: 'L009, L010',
      description: 'Luxury penthouse or premium villa',
      minPrice: 2000000,
      maxPrice: 10000000
    }
  ];

  const headers = ['Type Code', 'Type Name', 'Common Layouts', 'Description', 'Min Price', 'Max Price'];
  const rows = propertyTypes.map(p => [p.code, p.name, p.commonLayouts, p.description, p.minPrice, p.maxPrice]);

  try {
    await sheetsAPI.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              title: 'Property Types',
              gridProperties: {
                rowCount: 50,
                columnCount: 6
              }
            }
          }
        }]
      }
    });
    console.log('  ✓ Created new Property Types tab');
  } catch (err) {
    if (!err.message.includes('already exists')) {
      throw err;
    }
  }

  await sheetsAPI.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Property Types'!A1:F1",
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [headers]
    }
  });

  await sheetsAPI.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Property Types'!A2",
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: rows
    }
  });

  console.log(`  ✅ Created Property Types table with ${propertyTypes.length} types`);
  return propertyTypes;
}

/**
 * PROPERTY STATUS REFERENCE TABLE
 * Define status codes and allowed transitions
 */
async function createPropertyStatusReferenceTable() {
  console.log('\n📋 Creating PROPERTY STATUS Reference Table...');
  
  const statusCodes = [
    {
      code: 'S001',
      name: 'AVAILABLE-SELL',
      description: 'Property is available for sale',
      workflow: 'SELL',
      canTransitionTo: 'S005, S009',
      notes: 'Ready to list for sale'
    },
    {
      code: 'S002',
      name: 'AVAILABLE-RENT',
      description: 'Property is available for rent',
      workflow: 'RENT',
      canTransitionTo: 'S006, S003, S009',
      notes: 'Ready to list for rental'
    },
    {
      code: 'S003',
      name: 'OCCUPIED-RENT',
      description: 'Property is currently rented/occupied by tenant',
      workflow: 'RENT',
      canTransitionTo: 'S007, S009',
      notes: 'Active rental agreement'
    },
    {
      code: 'S004',
      name: 'OCCUPIED-OWNER',
      description: 'Owner occupied property',
      workflow: 'OWNER',
      canTransitionTo: 'S001, S002, S009',
      notes: 'Owner living in property'
    },
    {
      code: 'S005',
      name: 'SOLD',
      description: 'Property has been sold',
      workflow: 'SELL',
      canTransitionTo: 'S009 (Archive)',
      notes: 'Transaction completed'
    },
    {
      code: 'S006',
      name: 'RENTED',
      description: 'Property rental agreement signed',
      workflow: 'RENT',
      canTransitionTo: 'S003, S007, S009',
      notes: 'Tenant agreement active'
    },
    {
      code: 'S007',
      name: 'RENEW-TENANCY',
      description: 'Tenant contract up for renewal',
      workflow: 'RENT',
      canTransitionTo: 'S003, S009',
      notes: 'Ready for renewal negotiation'
    },
    {
      code: 'S008',
      name: 'MAINTENANCE',
      description: 'Property under maintenance/repair',
      workflow: 'MAINTENANCE',
      canTransitionTo: 'S001, S002, S004',
      notes: 'Not available for sale/rent'
    },
    {
      code: 'S009',
      name: 'ARCHIVED',
      description: 'Property no longer active (sold, rented permanently, etc)',
      workflow: 'ARCHIVE',
      canTransitionTo: 'None (Final State)',
      notes: 'Historical record only'
    }
  ];

  const headers = ['Status Code', 'Status Name', 'Description', 'Workflow Type', 'Can Transition To', 'Notes'];
  const rows = statusCodes.map(s => [s.code, s.name, s.description, s.workflow, s.canTransitionTo, s.notes]);

  try {
    await sheetsAPI.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              title: 'Property Status',
              gridProperties: {
                rowCount: 100,
                columnCount: 6
              }
            }
          }
        }]
      }
    });
    console.log('  ✓ Created new Property Status tab');
  } catch (err) {
    if (!err.message.includes('already exists')) {
      throw err;
    }
  }

  await sheetsAPI.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Property Status'!A1:F1",
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [headers]
    }
  });

  await sheetsAPI.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Property Status'!A2",
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: rows
    }
  });

  console.log(`  ✅ Created Property Status table with ${statusCodes.length} status types`);
  return statusCodes;
}

/**
 * CONTACT TYPES REFERENCE TABLE
 * Define contact type categories and permissions
 */
async function createContactTypesReferenceTable() {
  console.log('\n📋 Creating CONTACT TYPES Reference Table...');
  
  const contactTypes = [
    {
      code: 'CT001',
      name: 'Owner',
      description: 'Property owner or landlord',
      permissionLevel: 'Full Access',
      canEdit: true,
      canDelete: false,
      notes: 'Primary property owner'
    },
    {
      code: 'CT002',
      name: 'Tenant',
      description: 'Current tenant/occupant',
      permissionLevel: 'Limited Access',
      canEdit: false,
      canDelete: false,
      notes: 'Current renter'
    },
    {
      code: 'CT003',
      name: 'Buyer',
      description: 'Prospective buyer interested in property',
      permissionLevel: 'View-Only',
      canEdit: false,
      canDelete: false,
      notes: 'Potential purchaser'
    },
    {
      code: 'CT004',
      name: 'Agent',
      description: 'Real estate agent/broker',
      permissionLevel: 'Edit Access',
      canEdit: true,
      canDelete: false,
      notes: 'Sales/rental agent'
    },
    {
      code: 'CT005',
      name: 'Lind',
      description: 'Expert specialist/Database manager',
      permissionLevel: 'Full Access',
      canEdit: true,
      canDelete: true,
      notes: 'Database administrator'
    },
    {
      code: 'CT006',
      name: 'Broker',
      description: 'Real estate broker/company',
      permissionLevel: 'Full Access',
      canEdit: true,
      canDelete: false,
      notes: 'Brokerage firm'
    }
  ];

  const headers = ['Type Code', 'Type Name', 'Description', 'Permission Level', 'Can Edit', 'Can Delete', 'Notes'];
  const rows = contactTypes.map(c => [c.code, c.name, c.description, c.permissionLevel, c.canEdit, c.canDelete, c.notes]);

  try {
    await sheetsAPI.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              title: 'Contact Types',
              gridProperties: {
                rowCount: 50,
                columnCount: 7
              }
            }
          }
        }]
      }
    });
    console.log('  ✓ Created new Contact Types tab');
  } catch (err) {
    if (!err.message.includes('already exists')) {
      throw err;
    }
  }

  await sheetsAPI.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Contact Types'!A1:G1",
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [headers]
    }
  });

  await sheetsAPI.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Contact Types'!A2",
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: rows
    }
  });

  console.log(`  ✅ Created Contact Types table with ${contactTypes.length} contact types`);
  return contactTypes;
}

/**
 * RUN ALL REFERENCE TABLE CREATION
 */
async function createAllReferenceTables() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('PHASE 2: CREATING REFERENCE TABLES');
  console.log('═══════════════════════════════════════════════════════════════');
  
  try {
    const layouts = await createLayoutsReferenceTable();
    const types = await createPropertyTypesReferenceTable();
    const statuses = await createPropertyStatusReferenceTable();
    const contactTypes = await createContactTypesReferenceTable();

    // Save summary
    const summary = {
      timestamp: new Date().toISOString(),
      tablasCreated: {
        layouts: layouts.length,
        propertyTypes: types.length,
        statusCodes: statuses.length,
        contactTypes: contactTypes.length
      },
      totalRecords: layouts.length + types.length + statuses.length + contactTypes.length
    };

    const logsDir = path.join(__dirname, 'logs', 'implementation');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(logsDir, 'reference-tables-created.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ PHASE 2 COMPLETE: All Reference Tables Created');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\n✓ Layouts table: ${layouts.length} layout types`);
    console.log(`✓ Property Types table: ${types.length} property types`);
    console.log(`✓ Property Status table: ${statuses.length} status codes`);
    console.log(`✓ Contact Types table: ${contactTypes.length} contact types`);
    console.log(`\n📊 Total records created: ${summary.totalRecords}`);

  } catch (err) {
    console.error('❌ Error creating reference tables:', err.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createAllReferenceTables();
}

module.exports = {
  createLayoutsReferenceTable,
  createPropertyTypesReferenceTable,
  createPropertyStatusReferenceTable,
  createContactTypesReferenceTable,
  createAllReferenceTables
};
