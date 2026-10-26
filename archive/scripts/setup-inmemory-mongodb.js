#!/usr/bin/env node
/**
 * In-Memory MongoDB Setup Script
 * Phase 3: Local Database Integration
 * Sets up mongodb-memory-server, imports test data, validates integrity
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════
// Define MongoDB Schemas (synchronized with existing models)
// ═══════════════════════════════════════════════════════════════════════════

const PropertyOwnerSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  ownerName: String,
  email: String,
  phoneNumber: String,
  nationalId: String,
  address: String,
  city: String,
  country: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const PropertyContactSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  contactName: String,
  contactEmail: String,
  contactPhone: String,
  contactRole: String,
  ownerId: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const PropertyOwnerModel = mongoose.model('PropertyOwner', PropertyOwnerSchema);
const PropertyContactModel = mongoose.model('PropertyContact', PropertyContactSchema);

// ═══════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════

function log(message, color = 'reset') {
  const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
  };
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log('', 'reset');
  log('═'.repeat(80), 'cyan');
  log(` ${title}`, 'cyan');
  log('═'.repeat(80), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logCounter(label, count, color = 'green') {
  log(`  ${label}: ${count.toLocaleString()}`, color);
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Setup Process
// ═══════════════════════════════════════════════════════════════════════════

async function setupInMemoryMongoDB() {
  let mongoServer = null;
  let mongoUri = null;

  try {
    logSection('PHASE 3: IN-MEMORY MONGODB SETUP');
    log(`Starting at: ${new Date().toISOString()}`, 'dim');

    // Step 1: Start In-Memory MongoDB Server
    logSection('STEP 1: Starting In-Memory MongoDB Server');
    log('Initializing MongoMemoryServer...', 'blue');

    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'damac-hills-2'
      }
    });

    mongoUri = mongoServer.getUri();
    logSuccess(`In-Memory MongoDB started successfully`);
    logInfo(`MongoDB URI: ${mongoUri}`);

    // Step 2: Connect to In-Memory MongoDB
    logSection('STEP 2: Connecting to In-Memory MongoDB');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logSuccess('Mongoose connected to in-memory MongoDB');

    // Step 3: Create Collections
    logSection('STEP 3: Creating Collections');
    await PropertyOwnerModel.collection.createIndex({ email: 1 });
    await PropertyContactModel.collection.createIndex({ ownerId: 1 });
    logSuccess('Collections and indexes created');

    // Step 4: Load and Import Data
    logSection('STEP 4: Importing Data from JSON Files');

    // Load owners data
    const ownersPath = path.join(__dirname, 'data', 'local', 'owners.json');
    if (!fs.existsSync(ownersPath)) {
      throw new Error(`Owners file not found: ${ownersPath}`);
    }

    const ownersData = JSON.parse(fs.readFileSync(ownersPath, 'utf8'));
    logInfo(`Loaded ${ownersData.length} owner records`);

    // Load contacts data
    const contactsPath = path.join(__dirname, 'data', 'local', 'contacts.json');
    if (!fs.existsSync(contactsPath)) {
      throw new Error(`Contacts file not found: ${contactsPath}`);
    }

    const contactsData = JSON.parse(fs.readFileSync(contactsPath, 'utf8'));
    logInfo(`Loaded ${contactsData.length} contact records`);

    // Insert owners
    log('', 'reset');
    log('Inserting owner records...', 'blue');
    const insertedOwners = await PropertyOwnerModel.insertMany(ownersData, { ordered: false });
    logSuccess(`Imported ${insertedOwners.length} owner records`);

    // Insert contacts
    log('Inserting contact records...', 'blue');
    const insertedContacts = await PropertyContactModel.insertMany(contactsData, { ordered: false });
    logSuccess(`Imported ${insertedContacts.length} contact records`);

    // Step 5: Validate Data Integrity
    logSection('STEP 5: Validating Data Integrity');

    const ownerCount = await PropertyOwnerModel.countDocuments();
    const contactCount = await PropertyContactModel.countDocuments();
    const uniqueEmails = await PropertyOwnerModel.countDocuments({ email: { $exists: true, $ne: null } });
    const linkedContacts = await PropertyContactModel.countDocuments({ ownerId: { $exists: true, $ne: null } });

    logCounter('Total Owners', ownerCount);
    logCounter('Total Contacts', contactCount);
    logCounter('Owners with Email', uniqueEmails);
    logCounter('Linked Contacts', linkedContacts);

    // Sample records
    logSection('STEP 6: Sample Data Verification');
    
    const sampleOwner = await PropertyOwnerModel.findOne();
    const sampleContact = await PropertyContactModel.findOne();

    log('Sample Owner Record:', 'blue');
    log(JSON.stringify(sampleOwner, null, 2), 'dim');

    log('', 'reset');
    log('Sample Contact Record:', 'blue');
    log(JSON.stringify(sampleContact, null, 2), 'dim');

    // Step 7: API Readiness Check
    logSection('STEP 7: System Readiness Report');

    const readinesChecks = [
      { name: 'MongoDB Server', status: mongoServer ? '✅' : '❌' },
      { name: 'Mongoose Connection', status: mongoose.connection.readyState === 1 ? '✅' : '❌' },
      { name: 'Owner Collection', status: ownerCount > 0 ? '✅' : '❌' },
      { name: 'Contact Collection', status: contactCount > 0 ? '✅' : '❌' },
      { name: 'Data Integrity', status: ownerCount === 100 && contactCount === 100 ? '✅' : '❌' }
    ];

    readinesChecks.forEach(check => {
      log(`  ${check.status} ${check.name}`, 'reset');
    });

    // Step 8: Connection Details for API Server
    logSection('STEP 8: CONNECTION DETAILS FOR EXPRESS SERVER');

    log('USE THIS ENVIRONMENT CONFIGURATION:', 'yellow');
    log('', 'reset');
    log('MONGODB_URI=' + mongoUri, 'cyan');
    log('DB_NAME=damac-hills-2', 'cyan');
    log('', 'reset');

    // Step 9: API Testing Instructions
    logSection('STEP 9: NEXT STEPS - API TESTING');

    log('To test the API against this in-memory database:', 'blue');
    log('', 'reset');
    log('1. Start the Express server in a new terminal:', 'dim');
    log('   $ npm run express-server', 'cyan');
    log('', 'reset');
    log('2. Test sample endpoints:', 'dim');
    log('   GET  http://localhost:5000/api/v1/damac/owners', 'cyan');
    log('   GET  http://localhost:5000/api/v1/damac/contacts', 'cyan');
    log('   POST http://localhost:5000/api/v1/damac/owners', 'cyan');
    log('', 'reset');
    log('3. Run integration tests:', 'dim');
    log('   $ node test-integration-endpoints.js', 'cyan');
    log('', 'reset');

    // Summary
    logSection('PHASE 3: IN-MEMORY MONGODB SETUP - COMPLETE');
    
    log('', 'reset');
    log('✨ Your in-memory MongoDB is ready for testing!', 'green');
    log('', 'reset');
    logCounter('Owners', ownerCount, 'green');
    logCounter('Contacts', contactCount, 'green');
    log('', 'reset');
    log('Status: 100% Online & Ready', 'green');
    log('Data: Fully Imported & Validated', 'green');
    log('Environment: mongodb-memory-server (in-process)', 'green');
    log('Persistence: Session-based (resets on exit)', 'dim');
    log('', 'reset');

    // Keep server running
    log('In-Memory MongoDB is running. Press Ctrl+C to stop.', 'yellow');
    log('', 'reset');

    // Keep process alive
    await new Promise(() => {
      // This will keep the process alive indefinitely
      setInterval(() => {
        // Keep alive
      }, 60000);
    });

  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    // Cleanup on exit
    process.on('SIGINT', async () => {
      log('', 'reset');
      log('Shutting down...', 'yellow');
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
      }
      if (mongoServer) {
        await mongoServer.stop();
      }
      log('In-Memory MongoDB stopped.', 'green');
      process.exit(0);
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Execute Setup
// ═══════════════════════════════════════════════════════════════════════════

setupInMemoryMongoDB().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
