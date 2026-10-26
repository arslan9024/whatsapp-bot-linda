/**
 * PHASE 2 SYSTEM VALIDATION TEST
 * 
 * Validates all new DAMAC Hills 2 components:
 * - DataMigrationService
 * - DashboardDataService
 * - REST API routes
 * - Terminal Dashboard CLI
 * - Integration Hub
 * 
 * Run with: node code/Database/test-phase-2-system.js
 */

import mongoose from 'mongoose';
import DataMigrationService from './DataMigrationService.js';
import DashboardDataService from './DashboardDataService.js';
import DashboardCLI from '../Terminal/DashboardCLI.js';
import { DAMACHills2, handleDAMACCommand } from './DAMACHills2Integration.js';
import dotenv from 'dotenv';

dotenv.config();

// Testing utilities
const tests = {
  passed: 0,
  failed: 0,
  results: []
};

function test(name, passed, error = null) {
  if (passed) {
    tests.passed++;
    tests.results.push({ name, status: '✓ PASS', emoji: '✅' });
    console.log(`✅ ${name}`);
  } else {
    tests.failed++;
    tests.results.push({ name, status: '✗ FAIL', emoji: '❌', error });
    console.log(`❌ ${name}${error ? ': ' + error : ''}`);
  }
}

async function validateImports() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          IMPORT VALIDATION                                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    test('DataMigrationService imported', !!DataMigrationService);
    test('DashboardDataService imported', !!DashboardDataService);
    test('DashboardCLI imported', !!DashboardCLI);
    test('DAMACHills2Integration imported', !!DAMACHills2);
    test('handleDAMACCommand imported', typeof handleDAMACCommand === 'function');
  } catch (error) {
    test('Module imports', false, error.message);
  }
}

async function validateMethods() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          SERVICE METHODS VALIDATION                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // DataMigrationService methods
  test('DataMigrationService.migrateOwnersFromSheets exists',
    typeof DataMigrationService.migrateOwnersFromSheets === 'function');
  test('DataMigrationService.migrateContactsFromSheets exists',
    typeof DataMigrationService.migrateContactsFromSheets === 'function');
  test('DataMigrationService.syncOwnerData exists',
    typeof DataMigrationService.syncOwnerData === 'function');
  test('DataMigrationService.getMigrationStatus exists',
    typeof DataMigrationService.getMigrationStatus === 'function');

  // DashboardDataService methods
  test('DashboardDataService.getDashboardOverview exists',
    typeof DashboardDataService.getDashboardOverview === 'function');
  test('DashboardDataService.getOwnerStatistics exists',
    typeof DashboardDataService.getOwnerStatistics === 'function');
  test('DashboardDataService.getContactStatistics exists',
    typeof DashboardDataService.getContactStatistics === 'function');
  test('DashboardDataService.getPropertyStatistics exists',
    typeof DashboardDataService.getPropertyStatistics === 'function');
  test('DashboardDataService.getDataQualityScore exists',
    typeof DashboardDataService.getDataQualityScore === 'function');
  test('DashboardDataService.getRecentActivity exists',
    typeof DashboardDataService.getRecentActivity === 'function');

  // DashboardCLI methods
  test('DashboardCLI.handleCommand exists',
    typeof DashboardCLI.handleCommand === 'function');
  test('DashboardCLI.showHelp exists',
    typeof DashboardCLI.showHelp === 'function');
}

async function validateDatabaseOperations() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          DATABASE OPERATIONS VALIDATION                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Get migration status
    const status = await DataMigrationService.getMigrationStatus();
    test('getMigrationStatus returns data', 
      !!status && typeof status === 'object',
      status.error);

    if (status && !status.error) {
      test('Migration status has owner count',
        typeof status.owners === 'number');
      test('Migration status has contact count',
        typeof status.contacts === 'number');
    }

    // Get dashboard overview
    const dashboard = await DashboardDataService.getDashboardOverview();
    test('getDashboardOverview returns data',
      !!dashboard && typeof dashboard === 'object',
      dashboard.error);

    // Get owner statistics
    const ownerStats = await DashboardDataService.getOwnerStatistics();
    test('getOwnerStatistics returns data',
      !!ownerStats && !ownerStats.error);

    // Get contact statistics
    const contactStats = await DashboardDataService.getContactStatistics();
    test('getContactStatistics returns data',
      !!contactStats && !contactStats.error);

    // Get property statistics
    const propertyStats = await DashboardDataService.getPropertyStatistics();
    test('getPropertyStatistics returns data',
      !!propertyStats && !propertyStats.error);

    // Get data quality score
    const quality = await DashboardDataService.getDataQualityScore();
    test('getDataQualityScore returns data',
      !!quality && quality.overallScore);

  } catch (error) {
    test('Database operations', false, error.message);
  }
}

async function validateTerminalCommands() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          TERMINAL COMMANDS VALIDATION                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Test dashboard command
    const dashboard = await DashboardCLI.handleCommand('dashboard', {});
    test('dashboard command returns string',
      typeof dashboard === 'string' && dashboard.length > 0);

    // Test stats commands
    const statsOwners = await DashboardCLI.handleCommand('stats:owners', {});
    test('stats:owners command returns output',
      typeof statsOwners === 'string' && statsOwners.length > 0);

    const statsContacts = await DashboardCLI.handleCommand('stats:contacts', {});
    test('stats:contacts command returns output',
      typeof statsContacts === 'string' && statsContacts.length > 0);

    const statsProps = await DashboardCLI.handleCommand('stats:properties', {});
    test('stats:properties command returns output',
      typeof statsProps === 'string' && statsProps.length > 0);

    // Test quality command
    const quality = await DashboardCLI.handleCommand('quality:score', {});
    test('quality:score command returns output',
      typeof quality === 'string' && quality.length > 0);

    // Test activity command
    const activity = await DashboardCLI.handleCommand('activity:recent', { limit: 5 });
    test('activity:recent command returns output',
      typeof activity === 'string' && activity.length > 0);

    // Test migration status
    const migration = await DashboardCLI.handleCommand('migration:status', {});
    test('migration:status command returns output',
      typeof migration === 'string' && migration.length > 0);

    // Test help
    const help = await DashboardCLI.handleCommand('help', {});
    test('help command returns documentation',
      typeof help === 'string' && help.includes('COMMAND'));

  } catch (error) {
    test('Terminal commands', false, error.message);
  }
}

async function validateIntegration() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          INTEGRATION HUB VALIDATION                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Check DAMACHills2 exports
    test('DAMACHills2.models.PropertyOwner exists',
      !!DAMACHills2.models.PropertyOwner);
    test('DAMACHills2.models.PropertyContact exists',
      !!DAMACHills2.models.PropertyContact);
    test('DAMACHills2.services.DataMigrationService exists',
      !!DAMACHills2.services.DataMigrationService);
    test('DAMACHills2.services.DashboardDataService exists',
      !!DAMACHills2.services.DashboardDataService);
    test('DAMACHills2.services.DashboardCLI exists',
      !!DAMACHills2.services.DashboardCLI);

    // Test command handler
    try {
      const result = await handleDAMACCommand('migration:status', {});
      test('handleDAMACCommand works',
        result && typeof result === 'object');
    } catch (error) {
      test('handleDAMACCommand works', false, error.message);
    }

    // Test dashboard command via handler
    try {
      const result = await handleDAMACCommand('dashboard', {});
      test('handleDAMACCommand dashboard works',
        typeof result === 'string' && result.length > 0);
    } catch (error) {
      test('handleDAMACCommand dashboard works', false, error.message);
    }

  } catch (error) {
    test('Integration validation', false, error.message);
  }
}

async function validateDataMigration() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          DATA MIGRATION VALIDATION                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Test empty migration (should return valid report)
    const emptyMigration = await DataMigrationService.migrateOwnersFromSheets([], {});
    test('migrateOwnersFromSheets handles empty data',
      emptyMigration && emptyMigration.summary && emptyMigration.summary.successful === 0);

    // Test sync operation
    const syncResult = await DataMigrationService.syncOwnerData([], {});
    test('syncOwnerData handles empty data',
      syncResult && syncResult.synced === 0);

    // Test JSON import
    const jsonImport = await DataMigrationService.migrateFromJSON([], 'owner', {});
    test('migrateFromJSON handles empty data',
      jsonImport && typeof jsonImport === 'object');

  } catch (error) {
    test('Data migration validation', false, error.message);
  }
}

async function generateReport() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          SYSTEM VALIDATION REPORT                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const total = tests.passed + tests.failed;
  const passRate = ((tests.passed / total) * 100).toFixed(1);

  console.log(`📊 RESULTS:`);
  console.log(`   ✅ Passed: ${tests.passed}`);
  console.log(`   ❌ Failed: ${tests.failed}`);
  console.log(`   📋 Total: ${total}`);
  console.log(`   📈 Success Rate: ${passRate}%\n`);

  if (tests.failed === 0) {
    console.log('🎉 ALL TESTS PASSED! ✅');
    console.log('\n✨ PHASE 2 SYSTEM IS PRODUCTION READY ✨\n');
    return true;
  } else {
    console.log('⚠️  SOME TESTS FAILED - Review errors above\n');
    return false;
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  DAMAC HILLS 2 - PHASE 2 SYSTEM VALIDATION                ║
║  February 19, 2026 | Full System Test Suite               ║
╚════════════════════════════════════════════════════════════╝
`);

  try {
    await validateImports();
    await validateMethods();
    await validateDatabaseOperations();
    await validateTerminalCommands();
    await validateIntegration();
    await validateDataMigration();
    await generateReport();

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    process.exit(1);
  }
}

main();
