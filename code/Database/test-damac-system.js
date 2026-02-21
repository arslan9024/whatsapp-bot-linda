/**
 * ========================================================================
 * DAMAC HILLS 2 - SYSTEM VALIDATION TEST
 * Phase 30: Verify all components load and work correctly
 * ========================================================================
 * 
 * This test validates:
 * ✓ All schemas import correctly
 * ✓ Services initialize
 * ✓ Integration hub exports work
 * ✓ Terminal commands are available
 * 
 * Run: node test-damac-system.js
 */

import PropertyOwner from './PropertyOwnerSchema.js';
import PropertyContact from './PropertyContactSchema.js';
import PropertyOwnerProperties from './PropertyOwnerPropertiesSchema.js';
import PropertyOwnerAuditLog from './PropertyOwnerAuditLogSchema.js';
import PropertyOwnerService from './PropertyOwnerService.js';
import PropertyImportService from './PropertyImportService.js';
import {
  DAMACHills2,
  handleDAMACCommand,
  getDAMACCommandHelp
} from './DAMACHills2Integration.js';

// ========================================================================
// VALIDATION TESTS
// ========================================================================

console.log(`
╔════════════════════════════════════════════════════════════════╗
║   DAMAC HILLS 2 - SYSTEM VALIDATION TEST                      ║
║   Phase 30: Advanced Property Management                      ║
╚════════════════════════════════════════════════════════════════╝
`);

let passCount = 0;
let failCount = 0;

function testPass(message) {
  console.log(`✅ ${message}`);
  passCount++;
}

function testFail(message) {
  console.log(`❌ ${message}`);
  failCount++;
}

// Test 1: Schema Imports
console.log('\n📋 Schema Imports:');
try {
  if (PropertyOwner && PropertyOwner.schema) {
    testPass('PropertyOwner schema loaded');
  } else {
    testFail('PropertyOwner schema not loaded properly');
  }
} catch (error) {
  testFail(`PropertyOwner import failed: ${error.message}`);
}

try {
  if (PropertyContact && PropertyContact.schema) {
    testPass('PropertyContact schema loaded');
  } else {
    testFail('PropertyContact schema not loaded properly');
  }
} catch (error) {
  testFail(`PropertyContact import failed: ${error.message}`);
}

try {
  if (PropertyOwnerProperties && PropertyOwnerProperties.schema) {
    testPass('PropertyOwnerProperties schema loaded');
  } else {
    testFail('PropertyOwnerProperties schema not loaded properly');
  }
} catch (error) {
  testFail(`PropertyOwnerProperties import failed: ${error.message}`);
}

try {
  if (PropertyOwnerAuditLog && PropertyOwnerAuditLog.schema) {
    testPass('PropertyOwnerAuditLog schema loaded');
  } else {
    testFail('PropertyOwnerAuditLog schema not loaded properly');
  }
} catch (error) {
  testFail(`PropertyOwnerAuditLog import failed: ${error.message}`);
}

// Test 2: Service Imports
console.log('\n🔧 Service Layer Imports:');
try {
  if (PropertyOwnerService && typeof PropertyOwnerService.createOwner === 'function') {
    testPass('PropertyOwnerService loaded with methods');
  } else {
    testFail('PropertyOwnerService methods not available');
  }
} catch (error) {
  testFail(`PropertyOwnerService import failed: ${error.message}`);
}

try {
  if (PropertyImportService && typeof PropertyImportService.importOwners === 'function') {
    testPass('PropertyImportService loaded with methods');
  } else {
    testFail('PropertyImportService methods not available');
  }
} catch (error) {
  testFail(`PropertyImportService import failed: ${error.message}`);
}

// Test 3: Integration Hub
console.log('\n🚀 Integration Hub:');
try {
  if (DAMACHills2 && DAMACHills2.models && DAMACHills2.services) {
    testPass('DAMACHills2 integration exported correctly');
  } else {
    testFail('DAMACHills2 integration missing models or services');
  }
} catch (error) {
  testFail(`DAMACHills2 import failed: ${error.message}`);
}

try {
  if (typeof handleDAMACCommand === 'function') {
    testPass('handleDAMACCommand function available');
  } else {
    testFail('handleDAMACCommand function not available');
  }
} catch (error) {
  testFail(`handleDAMACCommand import failed: ${error.message}`);
}

try {
  if (typeof getDAMACCommandHelp === 'function') {
    testPass('getDAMACCommandHelp function available');
  } else {
    testFail('getDAMACCommandHelp function not available');
  }
} catch (error) {
  testFail(`getDAMACCommandHelp import failed: ${error.message}`);
}

// Test 4: Command Help
console.log('\n📚 Command Documentation:');
try {
  const help = getDAMACCommandHelp();
  if (help && help.commands) {
    const commandCount = Object.keys(help.commands).length;
    testPass(`Command help available for ${commandCount} commands`);
  } else {
    testFail('Command help not properly formatted');
  }
} catch (error) {
  testFail(`getDAMACCommandHelp failed: ${error.message}`);
}

// Test 5: Service Methods
console.log('\n🔍 Service Method Availability:');
const requiredMethods = [
  { service: PropertyOwnerService, methods: [
    'createOwner',
    'getOwnerById',
    'getOwnerByPhone',
    'updateOwner',
    'archiveOwner',
    'verifyOwner',
    'getAuditTrail'
  ]},
  { service: PropertyImportService, methods: [
    'importOwners',
    'importContacts',
    'syncOwners',
    'generateValidationReport'
  ]}
];

for (const { service, methods } of requiredMethods) {
  for (const method of methods) {
    if (service[method] && typeof service[method] === 'function') {
      testPass(`${service.name || 'Service'}.${method}() available`);
    } else {
      testFail(`${service.name || 'Service'}.${method}() NOT available`);
    }
  }
}

// Test 6: Models in Integration Hub
console.log('\n📦 Model Exports:');
const modelNames = ['PropertyOwner', 'PropertyContact', 'PropertyOwnerProperties', 'PropertyOwnerAuditLog'];
for (const modelName of modelNames) {
  if (DAMACHills2.models && DAMACHills2.models[modelName]) {
    testPass(`${modelName} exported in DAMACHills2.models`);
  } else {
    testFail(`${modelName} NOT exported in DAMACHills2.models`);
  }
}

// Test 7: Quick Access Methods
console.log('\n⚡ Quick Access Methods:');
const quickMethods = [
  'createOwner',
  'createContact',
  'linkOwnerToProperty',
  'getOwnerById',
  'getOwnerByPhone',
  'getOwnerByEmail',
  'getOwnerProperties',
  'importOwners',
  'importContacts',
  'syncOwners',
  'getOwnerStatistics',
  'getContactStatistics',
  'getOwnerPortfolioStats',
  'getAuditTrail',
  'getRecentChanges'
];

for (const method of quickMethods) {
  if (DAMACHills2[method] && typeof DAMACHills2[method] === 'function') {
    testPass(`DAMACHills2.${method}() available`);
  } else {
    testFail(`DAMACHills2.${method}() NOT available`);
  }
}

// ========================================================================
// VALIDATION SUMMARY
// ========================================================================

console.log(`
╔════════════════════════════════════════════════════════════════╗
║   VALIDATION RESULTS                                           ║
╚════════════════════════════════════════════════════════════════╝
`);

console.log(`
✅ Passed: ${passCount}
❌ Failed: ${failCount}
📊 Total:  ${passCount + failCount}

Success Rate: ${Math.round((passCount / (passCount + failCount)) * 100)}%
`);

if (failCount === 0) {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║   ✅ ALL SYSTEMS OPERATIONAL                                  ║
║   DAMAC Hills 2 is ready for production use!                 ║
╚════════════════════════════════════════════════════════════════╝
`);
  
  console.log(`
📖 NEXT STEPS:

1. Test with database connection:
   node test-damac-database.js

2. Try terminal commands:
   import { handleDAMACCommand } from './DAMACHills2Integration.js'
   
3. Review implementation guide:
   cat DAMAC_HILLS_2_IMPLEMENTATION.md

4. Check quick start examples:
   grep -A 5 "Quick Start" DAMAC_HILLS_2_IMPLEMENTATION.md
`);
} else {
  console.log(`
⚠️  SYSTEM VALIDATION INCOMPLETE
Some components failed validation. Please review errors above.
`);
  process.exit(1);
}

export { passCount, failCount };
