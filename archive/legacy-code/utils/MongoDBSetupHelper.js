/**
 * MongoDBSetupHelper.js
 * ====================
 * Helpers for MongoDB setup and configuration
 * 
 * Supports:
 * - Local MongoDB connection
 * - MongoDB Atlas cloud connection
 * - Docker MongoDB setup
 * - Connection validation
 * - Test data insertion
 * 
 * Usage:
 * - Run locally: node MongoDBSetupHelper.js setup
 * - Test connection: node MongoDBSetupHelper.js test
 * - Create sample data: node MongoDBSetupHelper.js sample
 * 
 * @since Phase 29b - February 19, 2026
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

class MongoDBSetupHelper {
  constructor() {
    this.logger = this.createLogger();
  }

  createLogger() {
    return {
      info: (msg) => console.log(`ℹ️  ${msg}`),
      success: (msg) => console.log(`✅ ${msg}`),
      warn: (msg) => console.warn(`⚠️  ${msg}`),
      error: (msg) => console.error(`❌ ${msg}`),
    };
  }

  /**
   * Generate environment configuration
   */
  generateEnvTemplate() {
    return `
# MongoDB Configuration
# Choose one:

# Option 1: Local MongoDB (default)
MONGODB_URI=mongodb://localhost:27017/whatsapp-bot

# Option 2: MongoDB Atlas (cloud)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/whatsapp-bot

# Option 3: Docker MongoDB
# MONGODB_URI=mongodb://mongodb:27017/whatsapp-bot

# Optional: Database backup path
DB_BACKUP_DIR=./db-backups
`;
  }

  /**
   * Setup instructions
   */
  printSetupInstructions() {
    const instructions = `
╔════════════════════════════════════════════════════════════════╗
║         MongoDB Setup for WhatsApp Bot - Phase 29b             ║
╚════════════════════════════════════════════════════════════════╝

Choose your MongoDB setup:

┌────────────────────────────────────────────────────────────────┐
│ OPTION 1: Local MongoDB (Easiest for Development)              │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Windows:                                                        │
│   1. Download MongoDB from mongodb.com/try/download            │
│   2. Run installer and choose "Run as a Service"              │
│   3. MongoDB will start automatically                          │
│   4. Set env: MONGODB_URI=mongodb://localhost:27017/whatsapp-bot│
│                                                                 │
│ macOS:                                                          │
│   $ brew tap mongodb/brew                                       │
│   $ brew install mongodb-community                              │
│   $ brew services start mongodb-community                       │
│                                                                 │
│ Linux:                                                          │
│   $ sudo apt-get install -y mongodb                             │
│   $ sudo systemctl start mongod                                 │
│                                                                 │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ OPTION 2: MongoDB Atlas (Cloud, Free tier available)           │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1. Go to mongodb.com/cloud/atlas                               │
│ 2. Create free account                                         │
│ 3. Create M0 (free) cluster                                    │
│ 4. Get connection string:                                      │
│    mongodb+srv://username:password@cluster.mongodb.net/whatsapp-bot│
│ 5. Set env: MONGODB_URI=<connection-string>                    │
│                                                                 │
│ Note: Free tier has limits (512MB storage)                     │
│                                                                 │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ OPTION 3: Docker (Production-like environment)                 │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1. Create docker-compose.yml:                                  │
│                                                                 │
│    version: '3'                                                │
│    services:                                                   │
│      mongodb:                                                  │
│        image: mongo:latest                                     │
│        ports:                                                  │
│          - "27017:27017"                                       │
│        volumes:                                                │
│          - mongo-data:/data/db                                 │
│        environment:                                            │
│          MONGO_INITDB_ROOT_USERNAME: admin                     │
│          MONGO_INITDB_ROOT_PASSWORD: password                  │
│    volumes:                                                    │
│      mongo-data:                                               │
│                                                                 │
│ 2. Run: docker-compose up -d                                   │
│ 3. Set env: MONGODB_URI=mongodb://admin:password@localhost:27017/whatsapp-bot│
│                                                                 │
└────────────────────────────────────────────────────────────────┘

Next Steps:
  1. Choose an option above
  2. Update .env with MONGODB_URI
  3. Run: npm test (to verify connection)
  4. Bot will auto-create collections on first use

Environment Variables:
  MONGODB_URI - Connection string (required)
  DB_BACKUP_DIR - Backup directory (optional, default: ./db-backups)
  NODE_ENV - 'production' or 'development'

Test Connection:
  $ node scripts/test-db-connection.js
    `;

    console.log(instructions);
  }

  /**
   * Test MongoDB connection
   */
  async testConnection(mongoUri) {
    try {
      this.logger.info('Testing MongoDB connection...');
      this.logger.info(`URI: ${mongoUri.split('@')[1] || mongoUri}`);

      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });

      this.logger.success('✓ Connection successful');

      const adminDb = mongoose.connection.db.admin();
      const serverStatus = await adminDb.serverStatus();

      console.log(`
Database Stats:
  Version: ${serverStatus.version}
  Uptime: ${serverStatus.uptime}s
  Connections: ${serverStatus.connections.current}
  Operations: ${serverStatus.opcounters.insert + serverStatus.opcounters.query + serverStatus.opcounters.update + serverStatus.opcounters.delete}
      `);

      await mongoose.disconnect();
      return true;
    } catch (error) {
      this.logger.error(`Connection failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Create sample data
   */
  async createSampleData(mongoUri) {
    try {
      this.logger.info('Creating sample data...');

      await mongoose.connect(mongoUri);

      // Create sample account
      const Account = mongoose.model('Account', new mongoose.Schema({
        phoneNumber: { type: String, unique: true },
        displayName: String,
        status: String,
        linkedAt: Date,
      }));

      await Account.updateOne(
        { phoneNumber: '+1234567890' },
        {
          phoneNumber: '+1234567890',
          displayName: 'Test Account',
          status: 'linked',
          linkedAt: new Date(),
        },
        { upsert: true }
      );

      this.logger.success('Sample data created');

      const count = await Account.countDocuments();
      this.logger.info(`Total accounts: ${count}`);

      await mongoose.disconnect();
      return true;
    } catch (error) {
      this.logger.error(`Sample data error: ${error.message}`);
      return false;
    }
  }

  /**
   * Create backup directory
   */
  createBackupDirectory() {
    const backupDir = process.env.DB_BACKUP_DIR || './db-backups';

    try {
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
        this.logger.success(`Created backup directory: ${backupDir}`);
      }
      return backupDir;
    } catch (error) {
      this.logger.warn(`Backup directory error: ${error.message}`);
      return null;
    }
  }

  /**
   * Update .env file
   */
  updateEnvFile(mongoUri) {
    try {
      const envPath = '.env';
      let envContent = '';

      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }

      // Update or add MONGODB_URI
      if (envContent.includes('MONGODB_URI=')) {
        envContent = envContent.replace(/MONGODB_URI=.+/g, `MONGODB_URI=${mongoUri}`);
      } else {
        envContent += `\n# MongoDB Configuration\nMONGODB_URI=${mongoUri}\n`;
      }

      fs.writeFileSync(envPath, envContent);
      this.logger.success('Updated .env file');
      return true;
    } catch (error) {
      this.logger.error(`Env update error: ${error.message}`);
      return false;
    }
  }

  /**
   * Run setup wizard
   */
  async interactiveSetup() {
    this.logger.info('╔════════════════════════════════════════════════════════════════╗');
    this.logger.info('║     MongoDB Setup Wizard for WhatsApp Bot - Phase 29b           ║');
    this.logger.info('╚════════════════════════════════════════════════════════════════╝');
    this.logger.info('');

    this.printSetupInstructions();

    // For manual setup, print template
    this.logger.info('\n📝 Add this to your .env file:\n');
    console.log(this.generateEnvTemplate());
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const helper = new MongoDBSetupHelper();
  const command = process.argv[2] || 'help';

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp-bot';

  switch (command) {
    case 'setup':
      await helper.interactiveSetup();
      helper.createBackupDirectory();
      break;

    case 'test':
      await helper.testConnection(mongoUri);
      break;

    case 'sample':
      await helper.createSampleData(mongoUri);
      break;

    case 'env':
      helper.updateEnvFile(mongoUri);
      break;

    default:
      console.log(`
Usage: node MongoDBSetupHelper.js <command>

Commands:
  setup   - Show setup instructions
  test    - Test MongoDB connection
  sample  - Create sample data
  env     - Update .env file
      `);
  }

  process.exit(0);
}

export default MongoDBSetupHelper;
