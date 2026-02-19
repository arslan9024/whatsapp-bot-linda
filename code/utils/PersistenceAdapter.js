/**
 * PersistenceAdapter.js
 * ====================
 * Adapts DatabaseManager to existing bot systems
 * 
 * Integrates with:
 * - UnifiedAccountManager (account lifecycle)
 * - SessionManager (session events)
 * - Message handling (inbound/outbound)
 * - Error tracking
 * 
 * Features:
 * - Auto-sync to database
 * - Lazy initialization
 * - Graceful degradation (works without DB)
 * - Event listeners for all systems
 * 
 * @since Phase 29b - February 19, 2026
 */

class PersistenceAdapter {
  constructor(databaseManager) {
    this.db = databaseManager;
    this.initialized = false;
    this.activeSessions = new Map(); // sessionId -> session object
    this.accountPhones = new Set();
    this.logger = this.createLogger();
  }

  createLogger() {
    return {
      info: (msg) => console.log(`💾 [Persistence] ${msg}`),
      success: (msg) => console.log(`✅ [Persistence] ${msg}`),
      warn: (msg) => console.warn(`⚠️  [Persistence] ${msg}`),
      error: (msg) => console.error(`❌ [Persistence] ${msg}`),
    };
  }

  /**
   * Initialize adapter
   */
  async initialize() {
    try {
      if (this.initialized) return true;

      this.logger.info('Initializing persistence layer...');
      
      // Try to connect, but don't fail if DB is unavailable
      const connected = await this.db.connect();
      
      if (connected) {
        this.logger.success('Persistence layer ready');
        this.initialized = true;
      } else {
        this.logger.warn('Running in degraded mode (no database)');
        this.initialized = true; // Still mark as initialized; we gracefully degrade
      }

      return true;
    } catch (error) {
      this.logger.error(`Initialization error: ${error.message}`);
      this.initialized = true; // Still allow operation
      return false;
    }
  }

  /**
   * Register account
   */
  async onAccountLinked(phoneNumber, metadata) {
    try {
      this.accountPhones.add(phoneNumber);

      const data = {
        phoneNumber,
        displayName: metadata.displayName || phoneNumber,
        linkedAt: new Date(),
        status: 'linked',
        sessionPath: metadata.sessionPath,
        lastActivity: new Date(),
        ...metadata,
      };

      await this.db.upsertAccount(phoneNumber, data);
      this.logger.success(`Account registered: ${phoneNumber}`);

      return true;
    } catch (error) {
      this.logger.warn(`Account registration warning: ${error.message}`);
      return false;
    }
  }

  /**
   * Update account status
   */
  async onAccountStatusChange(phoneNumber, status, metadata = {}) {
    try {
      await this.db.upsertAccount(phoneNumber, {
        status,
        lastActivity: new Date(),
        ...metadata,
      });

      this.logger.info(`Account status updated: ${phoneNumber} -> ${status}`);
      return true;
    } catch (error) {
      this.logger.warn(`Status update warning: ${error.message}`);
      return false;
    }
  }

  /**
   * Start tracking a session
   */
  async onSessionStart(accountPhone, sessionMetadata = {}) {
    try {
      const session = await this.db.startSession(accountPhone, sessionMetadata);

      if (session) {
        this.activeSessions.set(session._id.toString(), {
          sessionId: session._id,
          accountPhone,
          startTime: Date.now(),
        });

        this.logger.info(`Session started: ${accountPhone}`);
      }

      return session;
    } catch (error) {
      this.logger.warn(`Session start warning: ${error.message}`);
      return null;
    }
  }

  /**
   * End tracking a session
   */
  async onSessionEnd(sessionId, reason = 'normal') {
    try {
      await this.db.endSession(sessionId, reason);
      this.activeSessions.delete(sessionId.toString());

      this.logger.info(`Session ended: ${sessionId}`);
      return true;
    } catch (error) {
      this.logger.warn(`Session end warning: ${error.message}`);
      return false;
    }
  }

  /**
   * Log an error
   */
  async onError(level, message, context = {}, stackTrace = '') {
    try {
      await this.db.logError(level, message, context, stackTrace);
      // Don't log the log itself
      return true;
    } catch (error) {
      // Silently fail to avoid recursion
      return false;
    }
  }

  /**
   * Update account stats
   */
  async onAccountStatsUpdate(phoneNumber, stats = {}) {
    try {
      await this.db.upsertAccount(phoneNumber, {
        messageCount: stats.messageCount,
        totalUptime: stats.totalUptime,
        errorCount: stats.errorCount,
        lastActivity: new Date(),
      });

      return true;
    } catch (error) {
      this.logger.warn(`Stats update warning: ${error.message}`);
      return false;
    }
  }

  /**
   * Get account history (account and sessions only)
   */
  async getAccountHistory(phoneNumber) {
    try {
      const account = await this.db.getAccount(phoneNumber);
      const sessions = await this.db.Session?.find({ accountPhone: phoneNumber }) || [];

      return {
        account,
        sessions,
      };
    } catch (error) {
      this.logger.error(`History fetch error: ${error.message}`);
      return null;
    }
  }

  /**
   * Get database health status
   */
  async getHealthStatus() {
    try {
      const status = await this.db.getHealthStatus();
      status.activeSessions = this.activeSessions.size;
      status.trackedAccounts = this.accountPhones.size;
      return status;
    } catch (error) {
      this.logger.error(`Health check error: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Gracefully shutdown
   */
  async shutdown() {
    try {
      this.logger.info('Shutting down persistence layer...');

      // End all active sessions
      for (const [sessionId, session] of this.activeSessions) {
        await this.db.endSession(sessionId, 'shutdown');
      }

      // Disconnect from DB
      await this.db.disconnect();
      this.logger.success('Persistence layer shutdown complete');

      return true;
    } catch (error) {
      this.logger.error(`Shutdown error: ${error.message}`);
      return false;
    }
  }
}

export default PersistenceAdapter;
