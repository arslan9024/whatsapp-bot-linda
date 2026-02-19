/**
 * DatabaseManager.js
 * ===================
 * MongoDB database layer for WhatsApp Bot persistence
 * 
 * Features:
 * - Connection pooling to MongoDB
 * - Lightweight schema models for accounts, sessions, contact references, errors
 * - CRUD operations with error handling
 * - Index management
 * - Database pruning
 * 
 * Models:
 * - Account: WhatsApp accounts, credentials, metadata, status
 * - Session: Session history, connection status, device info, events
 * - ContactReference: Just phone number references for quick lookup
 * - ErrorLog: Error tracking with auto-expiry
 * 
 * Note: Messages stored in WhatsApp Web, Contacts in Google Contacts
 * This DB is for account/session/error tracking only
 * 
 * @since Phase 29b - February 19, 2026 (Refactored)
 */

import mongoose from 'mongoose';

// Define Schemas
const AccountSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true, index: true },
  displayName: { type: String },
  role: { type: String, enum: ['primary', 'secondary'], default: 'primary' },
  status: { type: String, enum: ['linked', 'unlinked', 'error'], default: 'unlinked' },
  linkedAt: { type: Date },
  lastActivity: { type: Date, index: true },
  
  // Google Account Info
  googleServiceAccount: { type: String }, // 'goraha', 'poweragent', etc.
  googleContactCount: { type: Number, default: 0 },
  
  // Session Info
  sessionPath: { type: String },
  sessionLastChecked: { type: Date },
  
  // Metadata
  deviceIP: { type: String },
  deviceUserAgent: { type: String },
  batteryLevel: { type: Number },
  connectionStatus: { type: String },
  
  // Stats
  messageCount: { type: Number, default: 0 },
  totalUptime: { type: Number, default: 0 }, // minutes
  errorCount: { type: Number, default: 0 },
  
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

const SessionSchema = new mongoose.Schema({
  accountPhone: { type: String, required: true, index: true },
  sessionId: { type: String, unique: true, sparse: true },
  
  // Session lifecycle
  startedAt: { type: Date, required: true, index: true },
  endedAt: { type: Date, sparse: true },
  duration: { type: Number }, // milliseconds
  
  // Connection info
  status: { type: String, enum: ['active', 'inactive', 'error', 'restored'], required: true, index: true },
  reason: { type: String }, // Why session ended
  
  // Events during session
  events: [{
    event: String, // 'message_received', 'error', 'reconnect', etc.
    timestamp: { type: Date, default: Date.now },
    data: mongoose.Schema.Types.Mixed,
  }],
  
  // Error tracking
  lastError: { type: String },
  errorStackTrace: { type: String },
  errorCount: { type: Number, default: 0 },
  
  // Performance metrics
  messageCount: { type: Number, default: 0 },
  cpuUsage: { type: Number }, // percent
  memoryUsage: { type: Number }, // MB
  
  createdAt: { type: Date, default: Date.now, index: true },
});

const ContactReferenceSchema = new mongoose.Schema({
  accountPhone: { type: String, required: true, index: true },
  phoneNumber: { type: String, required: true, index: true },
  displayName: { type: String },
  source: { type: String }, // 'whatsapp', 'import', 'manual', etc.
  
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

const ErrorLogSchema = new mongoose.Schema({
  accountPhone: { type: String, index: true },
  level: { type: String, enum: ['info', 'warn', 'error', 'fatal'], required: true, index: true },
  message: { type: String, required: true },
  context: mongoose.Schema.Types.Mixed,
  stackTrace: { type: String },
  resolved: { type: Boolean, default: false },
  
  createdAt: { type: Date, default: Date.now, index: true, expires: 7776000 }, // 90 days TTL
});

// Create models
const Account = mongoose.model('Account', AccountSchema);
const Session = mongoose.model('Session', SessionSchema);
const ContactReference = mongoose.model('ContactReference', ContactReferenceSchema);
const ErrorLog = mongoose.model('ErrorLog', ErrorLogSchema);

class DatabaseManager {
  constructor(options = {}) {
    this.mongoUri = options.mongoUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp-bot';
    this.options = options;
    this.isConnected = false;
    this.logger = this.createLogger();
  }

  /**
   * Create a simple logger
   */
  createLogger() {
    return {
      info: (msg) => console.log(`ℹ️  [DB] ${msg}`),
      success: (msg) => console.log(`✅ [DB] ${msg}`),
      warn: (msg) => console.warn(`⚠️  [DB] ${msg}`),
      error: (msg) => console.error(`❌ [DB] ${msg}`),
    };
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    try {
      if (this.isConnected) {
        this.logger.info('Already connected to MongoDB');
        return true;
      }

      this.logger.info(`Connecting to MongoDB: ${this.mongoUri.split('@')[1] || this.mongoUri}`);
      
      await mongoose.connect(this.mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      this.isConnected = true;
      this.logger.success('Connected to MongoDB');
      
      // Create indexes
      await this.createIndexes();
      
      return true;
    } catch (error) {
      this.logger.error(`Connection failed: ${error.message}`);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      if (this.isConnected) {
        await mongoose.disconnect();
        this.isConnected = false;
        this.logger.success('Disconnected from MongoDB');
      }
      return true;
    } catch (error) {
      this.logger.error(`Disconnect failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Create database indexes
   */
  async createIndexes() {
    try {
      // Account indexes
      await Account.collection.createIndex({ phoneNumber: 1 });
      await Account.collection.createIndex({ status: 1, lastActivity: -1 });
      
      // Session indexes
      await Session.collection.createIndex({ accountPhone: 1, startedAt: -1 });
      await Session.collection.createIndex({ status: 1 });
      
      // ContactReference indexes
      await ContactReference.collection.createIndex({ accountPhone: 1, phoneNumber: 1 });
      
      // Error log indexes
      await ErrorLog.collection.createIndex({ level: 1, createdAt: -1 });
      
      this.logger.success('Indexes created');
    } catch (error) {
      this.logger.warn(`Index creation warning: ${error.message}`);
    }
  }

  /**
   * Save or update an account
   */
  async upsertAccount(phoneNumber, data) {
    try {
      const account = await Account.findOneAndUpdate(
        { phoneNumber },
        { ...data, updatedAt: new Date() },
        { upsert: true, new: true }
      );
      return account;
    } catch (error) {
      this.logger.error(`Upsert account error: ${error.message}`);
      return null;
    }
  }

  /**
   * Get account by phone number
   */
  async getAccount(phoneNumber) {
    try {
      return await Account.findOne({ phoneNumber });
    } catch (error) {
      this.logger.error(`Get account error: ${error.message}`);
      return null;
    }
  }

  /**
   * Start a session
   */
  async startSession(accountPhone, metadata = {}) {
    try {
      const session = new Session({
        accountPhone,
        status: 'active',
        startedAt: new Date(),
        ...metadata,
      });
      
      await session.save();
      return session;
    } catch (error) {
      this.logger.error(`Start session error: ${error.message}`);
      return null;
    }
  }

  /**
   * End a session
   */
  async endSession(sessionId, reason = 'normal', metadata = {}) {
    try {
      const duration = Date.now() - (await Session.findById(sessionId)).startedAt.getTime();
      
      const session = await Session.findByIdAndUpdate(
        sessionId,
        {
          status: 'inactive',
          endedAt: new Date(),
          duration: duration,
          reason: reason,
          ...metadata,
        },
        { new: true }
      );
      
      return session;
    } catch (error) {
      this.logger.error(`End session error: ${error.message}`);
      return null;
    }
  }

  /**
   * Log an error
   */
  async logError(level, message, context = {}, stackTrace = '') {
    try {
      const errorLog = new ErrorLog({
        level,
        message,
        context,
        stackTrace,
      });
      
      await errorLog.save();
      return errorLog;
    } catch (error) {
      this.logger.warn(`Error logging failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get health status
   */
  async getHealthStatus() {
    try {
      const accountCount = await Account.countDocuments();
      const sessionCount = await Session.countDocuments({ status: 'active' });
      const errorCount = await ErrorLog.countDocuments({ resolved: false });
      const contactRefCount = await ContactReference.countDocuments();
      
      return {
        connected: this.isConnected,
        database: 'whatsapp-bot',
        accounts: accountCount,
        activeSessions: sessionCount,
        contactReferences: contactRefCount,
        unresolvedErrors: errorCount,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Health check error: ${error.message}`);
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  /**
   * Clear old data (older than X days)
   */
  async pruneOldData(daysOld = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      
      const sessionResult = await Session.deleteMany({ createdAt: { $lt: cutoffDate } });
      const errorResult = await ErrorLog.deleteMany({ createdAt: { $lt: cutoffDate } });
      
      this.logger.success(`Pruned ${sessionResult.deletedCount} sessions and ${errorResult.deletedCount} errors`);
      
      return {
        sessionsDeleted: sessionResult.deletedCount,
        errorsDeleted: errorResult.deletedCount,
      };
    } catch (error) {
      this.logger.error(`Prune error: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Export data to JSON
   */
  async exportData(accountPhone) {
    try {
      const account = await Account.findOne({ phoneNumber: accountPhone });
      const sessions = await Session.find({ accountPhone });
      const contactRefs = await ContactReference.find({ accountPhone });
      
      return {
        account,
        sessions,
        contactReferences: contactRefs,
        exportedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Export error: ${error.message}`);
      return null;
    }
  }
}

export default DatabaseManager;
