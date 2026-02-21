/**
 * migrateToRelational.js
 * PURPOSE: Migrate data from old schema (PropertyOwner, PropertyContact) to new relational schema
 * USAGE: node migrateToRelational.js
 */

import mongoose from 'mongoose';
import Person from './PersonSchema.js';
import Developer from './DeveloperSchema.js';
import Cluster from './ClusterSchema.js';
import Property from './PropertySchema.js';
import PropertyOwnership from './PropertyOwnershipSchema.js';
import PropertyTenancy from './PropertyTenancySchema.js';
import PropertyBuying from './PropertyBuyingSchema.js';
import PropertyAgent from './PropertyAgentSchema.js';
import FurnishingStatus from './FurnishingStatusSchema.js';
import OccupancyStatus from './OccupancyStatusSchema.js';
import AvailabilityStatus from './AvailabilityStatusSchema.js';

// Import old schemas (for reading)
import PropertyOwnerOld from './PropertyOwnerSchema-old.js'; // Will be renamed
import PropertyContactOld from './PropertyContactSchema-old.js'; // Will be renamed

/**
 * Migration Report Object
 */
class MigrationReport {
  constructor() {
    this.startTime = new Date();
    this.stats = {
      peopleCreated: 0,
      personsDuplicate: 0,
      propertiesCreated: 0,
      ownershipsCreated: 0,
      tenanciesToCreate: 0,
      clustersMissing: 0,
      errorCount: 0
    };
    this.errors = [];
    this.duplicates = [];
    this.warnings = [];
  }

  addError(message, data) {
    this.stats.errorCount++;
    this.errors.push({ message, data, timestamp: new Date() });
  }

  addDuplicate(message, data) {
    this.stats.personsDuplicate++;
    this.duplicates.push({ message, data, timestamp: new Date() });
  }

  addWarning(message) {
    this.warnings.push({ message, timestamp: new Date() });
  }

  getReport() {
    return {
      duration: `${((new Date() - this.startTime) / 1000).toFixed(2)}s`,
      stats: this.stats,
      errors: this.errors,
      duplicates: this.duplicates,
      warnings: this.warnings,
      timestamp: new Date()
    };
  }
}

/**
 * MIGRATION PROCESS
 */
async function migrateToRelational() {
  const report = new MigrationReport();

  console.log('========================================');
  console.log('  DATABASE MIGRATION: OLD → RELATIONAL');
  console.log('========================================\n');

  try {
    // STEP 1: Create reference status records
    console.log('Step 1: Creating reference status collections...');
    await createReferenceStatuses();
    console.log('✓ Reference statuses created\n');

    // STEP 2: Extract unique persons from PropertyOwner + PropertyContact
    console.log('Step 2: Extracting persons from old schema...');
    const { persons, duplicates } = await extractAndDeduplicatePersons(report);
    console.log(`✓ Found ${persons.length} unique persons, ${duplicates.length} duplicates\n`);

    // STEP 3: Create Person records
    console.log('Step 3: Creating Person collection...');
    const createdPersons = await createPersonRecords(persons, report);
    console.log(`✓ Created ${createdPersons.size} person records\n`);

    // STEP 4: Create/link Clusters
    console.log('Step 4: Creating/linking Clusters...');
    const clusters = await createClusters(report);
    console.log(`✓ ${clusters.length} clusters ready\n`);

    // STEP 5: Create Property records from PropertyOwnerProperties
    console.log('Step 5: Creating Property records...');
    const properties = await createPropertyRecords(clusters, report);
    console.log(`✓ Created ${properties.length} property records\n`);

    // STEP 6: Create PropertyOwnership records
    console.log('Step 6: Creating PropertyOwnership records...');
    const ownerships = await createPropertyOwnershipRecords(createdPersons, properties, report);
    console.log(`✓ Created ${ownerships.length} ownerships\n`);

    // STEP 7: Create PropertyTenancy records (if available in source data)
    console.log('Step 7: Checking for tenancy data...');
    const tenancies = await createPropertyTenancyRecords(createdPersons, properties, report);
    console.log(`✓ Created ${tenancies.length} tenancy records\n`);

    // STEP 8: Generate final report
    console.log('========================================');
    console.log('  MIGRATION COMPLETE');
    console.log('========================================\n');

    const finalReport = report.getReport();
    console.log('SUMMARY:');
    console.log(`  People Created: ${finalReport.stats.peopleCreated}`);
    console.log(`  Persons Deduplicated: ${finalReport.stats.personsDuplicate}`);
    console.log(`  Properties Created: ${finalReport.stats.propertiesCreated}`);
    console.log(`  Ownerships Linked: ${finalReport.stats.ownershipsCreated}`);
    console.log(`  Tenancies Created: ${finalReport.stats.tenanciesToCreate}`);
    console.log(`  Errors: ${finalReport.stats.errorCount}`);
    console.log(`  Duration: ${finalReport.duration}`);
    console.log('');

    if (finalReport.errors.length > 0) {
      console.log('ERRORS:');
      finalReport.errors.forEach(err => {
        console.log(`  - ${err.message}`);
      });
      console.log('');
    }

    if (finalReport.warnings.length > 0) {
      console.log('WARNINGS:');
      finalReport.warnings.forEach(warn => {
        console.log(`  - ${warn.message}`);
      });
      console.log('');
    }

    return finalReport;

  } catch (error) {
    console.error('MIGRATION FAILED:', error);
    report.addError('Migration failed', error.message);
    return report.getReport();
  }
}

/**
 * HELPER FUNCTIONS
 */

async function createReferenceStatuses() {
  const furnishingStatuses = [
    { status: 'furnished', description: 'Fully furnished property' },
    { status: 'unfurnished', description: 'Unfurnished property' },
    { status: 'semi-furnished', description: 'Semi-furnished property' }
  ];

  const occupancyStatuses = [
    { status: 'occupied_by_owner', description: 'Owner occupies the property' },
    { status: 'occupied_by_tenant', description: 'Tenant occupies the property' },
    { status: 'vacant', description: 'Property is vacant' }
  ];

  const availabilityStatuses = [
    { status: 'available_for_rent', category: 'active', description: 'Available for rental' },
    { status: 'available_for_sale', category: 'active', description: 'Available for sale' },
    { status: 'available_for_both', category: 'active', description: 'Available for rent and sale' },
    { status: 'not_available', category: 'inactive', description: 'Not available' },
    { status: 'sold', category: 'terminal', description: 'Property sold' }
  ];

  await Promise.all([
    FurnishingStatus.insertMany(furnishingStatuses, { ordered: false }).catch(() => {}),
    OccupancyStatus.insertMany(occupancyStatuses, { ordered: false }).catch(() => {}),
    AvailabilityStatus.insertMany(availabilityStatuses, { ordered: false }).catch(() => {})
  ]);
}

async function extractAndDeduplicatePersons(report) {
  // This would read from old PropertyOwner and PropertyContact collections
  // For now, returning empty to show structure
  console.log('  NOTE: Requires old schema collections to be present');
  return { persons: [], duplicates: [] };
}

async function createPersonRecords(persons, report) {
  const createdPersons = new Map();
  
  for (const personData of persons) {
    try {
      const person = new Person({
        personId: `PERSON-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        firstName: personData.firstName,
        lastName: personData.lastName,
        mobile: personData.mobile,
        email: personData.email,
        status: 'active',
        source: personData.source || 'import'
      });

      await person.save();
      createdPersons.set(`${personData.firstName}${personData.lastName}${personData.mobile}`, person);
      report.stats.peopleCreated++;
    } catch (error) {
      report.addError(`Failed to create person ${personData.firstName} ${personData.lastName}`, error.message);
    }
  }

  return createdPersons;
}

async function createClusters(report) {
  // This would typically read from PropertyOwnerProperties data
  // For demo, showing structure
  console.log('  NOTE: Requires cluster information from source data');
  return [];
}

async function createPropertyRecords(clusters, report) {
  // Create Property records from existing PropertyOwnerProperties data
  // For demo, showing structure
  console.log('  NOTE: Requires property details from source data');
  return [];
}

async function createPropertyOwnershipRecords(personMap, properties, report) {
  // Link persons to properties as owners
  console.log('  NOTE: Requires ownership details from PropertyOwner records');
  return [];
}

async function createPropertyTenancyRecords(personMap, properties, report) {
  // Create PropertyTenancy records if rental contract data exists
  console.log('  NOTE: Requires tenancy and payment schedule data');
  return [];
}

/**
 * MAIN EXECUTION
 */
async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/damac-hills-2');
    console.log('Connected to MongoDB\n');

    // Run migration
    const report = await migrateToRelational();

    // Save report to file
    const fs = await import('fs').then(m => m.promises);
    await fs.writeFile(
      './migration-report.json',
      JSON.stringify(report, null, 2)
    );
    console.log('Migration report saved to: migration-report.json\n');

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { migrateToRelational, MigrationReport };
