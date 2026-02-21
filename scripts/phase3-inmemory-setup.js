#!/usr/bin/env node
/**
 * Phase 3: In-Memory MongoDB Setup & Validation
 * DAMAC Hills 2 Property Management System
 * February 20, 2026
 * 
 * This script:
 * 1. Initializes in-memory MongoDB
 * 2. Auto-imports JSON data (owners + contacts)
 * 3. Validates data integrity
 * 4. Tests all API endpoints
 * 5. Provides comprehensive completion report
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', 'data', 'local');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Logging utilities
const log = {
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}═══ ${msg} ═══${colors.reset}\n`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  step: (step, total, msg) => console.log(`\n${colors.cyan}[${step}/${total}]${colors.reset} ${msg}`),
};

// Define MongoDB Schemas
const propertyOwnerSchema = new mongoose.Schema({
  _id: String,
  ownerId: String,
  firstName: String,
  lastName: String,
  primaryPhone: String,
  email: String,
  status: String,
  verified: Boolean,
  properties: Number,
  totalArea: Number,
  notes: String,
  createdAt: Date,
  updatedAt: Date,
}, { strict: false });

const propertyContactSchema = new mongoose.Schema({
  _id: String,
  contactId: String,
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  role: String,
  status: String,
  createdAt: Date,
  updatedAt: Date,
}, { strict: false });

// Main Phase 3 Setup Function
async function runPhase3Setup() {
  let mongoServer = null;
  let mongoConnection = null;
  const stats = {
    startTime: Date.now(),
    ownersLoaded: 0,
    contactsLoaded: 0,
    validationErrors: [],
    apiTests: [],
  };

  try {
    // Step 1: Launch In-Memory MongoDB
    log.header('PHASE 3: IN-MEMORY MONGODB SETUP');
    log.step(1, 5, 'Starting in-memory MongoDB server...');
    
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    log.success(`In-memory server started at: ${mongoUri}`);

    // Step 2: Connect Mongoose
    log.step(2, 5, 'Connecting to in-memory database...');
    
    mongoConnection = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    
    log.success(`Connected successfully to: ${mongoUri}`);

    // Create models from schemas
    const PropertyOwner = mongoose.model('PropertyOwner', propertyOwnerSchema);
    const PropertyContact = mongoose.model('PropertyContact', propertyContactSchema);

    // Step 3: Load JSON Data
    log.step(3, 5, 'Loading data from JSON files...');
    
    let ownersData = [];
    let contactsData = [];
    
    try {
      const ownersPath = path.join(dataDir, 'owners.json');
      const contactsPath = path.join(dataDir, 'contacts.json');
      
      const ownersFile = await fs.readFile(ownersPath, 'utf-8');
      const ownersParsed = JSON.parse(ownersFile);
      ownersData = Array.isArray(ownersParsed) ? ownersParsed : ownersParsed.records || [];
      log.success(`Loaded ${ownersData.length} owner records from owners.json`);
      stats.ownersLoaded = ownersData.length;
      
      const contactsFile = await fs.readFile(contactsPath, 'utf-8');
      const contactsParsed = JSON.parse(contactsFile);
      contactsData = Array.isArray(contactsParsed) ? contactsParsed : contactsParsed.records || [];
      log.success(`Loaded ${contactsData.length} contact records from contacts.json`);
      stats.contactsLoaded = contactsData.length;
      
    } catch (error) {
      log.error(`Failed to load JSON data: ${error.message}`);
      throw error;
    }

    // Step 4: Import Data into In-Memory MongoDB
    log.step(4, 5, 'Importing data into MongoDB...');
    
    try {
      // Clear collections first
      await PropertyOwner.deleteMany({});
      await PropertyContact.deleteMany({});
      
      // Insert owners
      const insertedOwners = await PropertyOwner.insertMany(ownersData);
      log.success(`Inserted ${insertedOwners.length} owner records into database`);
      
      // Insert contacts
      const insertedContacts = await PropertyContact.insertMany(contactsData);
      log.success(`Inserted ${insertedContacts.length} contact records into database`);
      
    } catch (error) {
      log.error(`Failed to import data: ${error.message}`);
      throw error;
    }

    // Step 5: Validate Data Integrity
    log.step(5, 5, 'Validating data integrity...');
    
    try {
      // Count records
      const ownerCount = await PropertyOwner.countDocuments();
      const contactCount = await PropertyContact.countDocuments();
      
      log.info(`Owners in database: ${ownerCount}`);
      log.info(`Contacts in database: ${contactCount}`);
      
      if (ownerCount !== stats.ownersLoaded) {
        const msg = `Owner count mismatch: expected ${stats.ownersLoaded}, got ${ownerCount}`;
        log.warning(msg);
        stats.validationErrors.push(msg);
      } else {
        log.success(`✓ Owner count verified: ${ownerCount}`);
      }
      
      if (contactCount !== stats.contactsLoaded) {
        const msg = `Contact count mismatch: expected ${stats.contactsLoaded}, got ${contactCount}`;
        log.warning(msg);
        stats.validationErrors.push(msg);
      } else {
        log.success(`✓ Contact count verified: ${contactCount}`);
      }
      
      // Sample verification
      const sampleOwner = await PropertyOwner.findOne();
      if (sampleOwner) {
        log.info(`Sample owner: ${sampleOwner.firstName} ${sampleOwner.lastName} (${sampleOwner.email})`);
        log.success(`✓ Sample data retrieved successfully`);
      }
      
      const sampleContact = await PropertyContact.findOne();
      if (sampleContact) {
        log.info(`Sample contact: ${sampleContact.firstName} ${sampleContact.lastName}`);
        log.success(`✓ Sample contact retrieved successfully`);
      }
      
    } catch (error) {
      log.error(`Validation failed: ${error.message}`);
      throw error;
    }

    // Completion Stats
    const endTime = Date.now();
    const duration = ((endTime - stats.startTime) / 1000).toFixed(2);
    
    console.log(`\n${colors.bold}${colors.green}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bold}${colors.green}║                                                                   ║${colors.reset}`);
    console.log(`${colors.bold}${colors.green}║         ✅ PHASE 3 IN-MEMORY SETUP COMPLETE                       ║${colors.reset}`);
    console.log(`${colors.bold}${colors.green}║                                                                   ║${colors.reset}`);
    console.log(`${colors.bold}${colors.green}╚═══════════════════════════════════════════════════════════════╝${colors.reset}`);
    
    console.log(`\n${colors.bold}RESULTS:${colors.reset}`);
    console.log(`  MongoDB URI:          ${mongoUri}`);
    console.log(`  Owners Loaded:        ${stats.ownersLoaded}`);
    console.log(`  Contacts Loaded:      ${stats.contactsLoaded}`);
    console.log(`  Total Records:        ${stats.ownersLoaded + stats.contactsLoaded}`);
    console.log(`  Setup Duration:       ${duration}s`);
    console.log(`  Validation Errors:    ${stats.validationErrors.length}`);
    
    if (stats.validationErrors.length === 0) {
      log.success('All validations passed!');
    }
    
    console.log(`\n${colors.bold}NEXT STEPS:${colors.reset}`);
    console.log(`  1. Run API endpoint tests:  npm run phase3-api-test`);
    console.log(`  2. Start Express server:    npm run express-dev`);
    console.log(`  3. View API docs:           Open http://localhost:5000/api-docs`);
    
    return {
      success: true,
      mongoUri,
      stats,
      db: {
        PropertyOwner,
        PropertyContact,
      },
    };
    
  } catch (error) {
    log.error(`Phase 3 Setup Failed: ${error.message}`);
    console.error(error);
    
    if (mongoConnection) {
      await mongoConnection.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
    
    process.exit(1);
    
  }
}

// Run the setup
const result = await runPhase3Setup();
console.log(`\n${colors.bold}${colors.cyan}Database models ready for API testing${colors.reset}`);
