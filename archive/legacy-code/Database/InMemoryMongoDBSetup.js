/**
 * In-Memory MongoDB Setup for Phase 3 Testing
 * 
 * This script:
 * 1. Starts an in-memory MongoDB instance
 * 2. Imports owners.json and contacts.json data
 * 3. Provides connection details for API testing
 * 4. Validates data integrity
 * 
 * Usage: node InMemoryMongoDBSetup.js
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// SCHEMAS
// ============================================================================

const ownerSchema = new mongoose.Schema({
  ownerId: String,
  name: String,
  email: String,
  phone: String,
  status: String,
  joinDate: Date,
  propertyCount: Number,
  totalInvestment: Number,
  _id: mongoose.Types.ObjectId,
}, { collection: 'propertyowners' });

const contactSchema = new mongoose.Schema({
  contactId: String,
  name: String,
  email: String,
  phone: String,
  linkedOwnerId: String,
  role: String,
  status: String,
  createdAt: Date,
  _id: mongoose.Types.ObjectId,
}, { collection: 'propertycontacts' });

// ============================================================================
// SETUP FUNCTION
// ============================================================================

export async function setupInMemoryMongoDB() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🗄️  PHASE 3: IN-MEMORY MONGODB SETUP                       ║');
  console.log('║      DAMAC Hills 2 Property Management System             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Start in-memory MongoDB
    console.log('🚀 Starting in-memory MongoDB instance...');
    const mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();
    
    console.log('✅ In-memory MongoDB started successfully!');
    console.log(`   Connection: ${mongoUri}\n`);

    // Connect Mongoose
    console.log('🔗 Connecting Mongoose...');
    await mongoose.connect(mongoUri);
    console.log('✅ Mongoose connected!\n');

    // Create models
    const Owner = mongoose.model('PropertyOwner', ownerSchema);
    const Contact = mongoose.model('PropertyContact', contactSchema);

    // Load JSON data
    console.log('📂 Loading JSON data files...');
    const dataDir = path.join(__dirname, '../../data/local');
    
    const ownersPath = path.join(dataDir, 'owners.json');
    const contactsPath = path.join(dataDir, 'contacts.json');

    if (!await isFileExists(ownersPath)) {
      throw new Error(`owners.json not found at ${ownersPath}`);
    }
    if (!await isFileExists(contactsPath)) {
      throw new Error(`contacts.json not found at ${contactsPath}`);
    }

    const ownersData = JSON.parse(await fs.readFile(ownersPath, 'utf-8'));
    const contactsData = JSON.parse(await fs.readFile(contactsPath, 'utf-8'));

    console.log(`✅ Loaded ${ownersData.length} owner records`);
    console.log(`✅ Loaded ${contactsData.length} contact records\n`);

    // Import data
    console.log('💾 Importing data into in-memory database...');
    
    const insertedOwners = await Owner.insertMany(ownersData);
    console.log(`✅ Imported ${insertedOwners.length} owners`);

    const insertedContacts = await Contact.insertMany(contactsData);
    console.log(`✅ Imported ${insertedContacts.length} contacts\n`);

    // Validate data
    console.log('🔍 Validating data integrity...');
    const ownerCount = await Owner.countDocuments();
    const contactCount = await Contact.countDocuments();

    console.log(`✅ Verified: ${ownerCount} owners in database`);
    console.log(`✅ Verified: ${contactCount} contacts in database\n`);

    // Sample data
    console.log('📊 Sample Data:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const sampleOwner = await Owner.findOne();
    if (sampleOwner) {
      console.log('OWNER SAMPLE:');
      console.log(JSON.stringify(sampleOwner.toObject(), null, 2));
      console.log('');
    }

    const sampleContact = await Contact.findOne();
    if (sampleContact) {
      console.log('CONTACT SAMPLE:');
      console.log(JSON.stringify(sampleContact.toObject(), null, 2));
      console.log('');
    }

    // Statistics
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📈 STATISTICS:');
    
    const avgPropertiesPerOwner = ownersData.reduce((sum, o) => sum + (o.propertyCount || 0), 0) / ownerCount;
    console.log(`✓ Avg properties per owner: ${avgPropertiesPerOwner.toFixed(2)}`);

    const activeOwners = ownersData.filter(o => o.status === 'active').length;
    console.log(`✓ Active owners: ${activeOwners}/${ownerCount}`);

    const verifiedContacts = contactsData.filter(c => c.status === 'verified').length;
    console.log(`✓ Verified contacts: ${verifiedContacts}/${contactCount}\n`);

    // Connection info for Express server
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('🎯 CONNECTION DETAILS FOR EXPRESS SERVER:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`MongoDB URI: ${mongoUri}`);
    console.log(`Database: ${mongoUri.split('/').pop()}`);
    console.log(`Collections: propertyowners, propertycontacts`);
    console.log(`Records: ${ownerCount + contactCount} total\n`);

    console.log('✅ IN-MEMORY MONGODB READY FOR TESTING!\n');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Return connection info and models for use in Express server
    return {
      mongoUri,
      mongod,
      models: { Owner, Contact },
      stats: {
        owners: ownerCount,
        contacts: contactCount,
        totalRecords: ownerCount + contactCount,
        avgPropertiesPerOwner,
        activeOwners,
        verifiedContacts
      }
    };

  } catch (error) {
    console.error('❌ Error setting up in-memory MongoDB:');
    console.error(error.message);
    process.exit(1);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function isFileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// STANDALONE EXECUTION
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  const { mongoUri, mongod, models, stats } = await setupInMemoryMongoDB();
  
  console.log('🎯 NEXT STEPS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('1. Use this MongoDB URI in your Express server:');
  console.log(`   MONGODB_URI="${mongoUri}"\n`);
  console.log('2. Alternatively, use InMemoryMongoDBSetup as a module:');
  console.log('   import { setupInMemoryMongoDB } from "./InMemoryMongoDBSetup.js";\n');
  console.log('3. Run API tests against the live in-memory database\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Keep the server running for 30 seconds to demonstrate
  console.log('⏱️  In-memory MongoDB will run for 30 seconds...');
  console.log('You can test API endpoints during this time.\n');
  
  setTimeout(async () => {
    console.log('\n🛑 Shutting down in-memory MongoDB...');
    await mongod.stop();
    process.exit(0);
  }, 30000);
}

// ============================================================================
// MODULE EXPORT
// ============================================================================

export default setupInMemoryMongoDB;
