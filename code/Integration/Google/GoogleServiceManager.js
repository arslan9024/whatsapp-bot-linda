/**
 * Google Service Manager
 * Centralized orchestrator for all Google API services
 * 
 * Version: 1.0.0
 * Last Updated: February 7, 2026
 */

const { logger } = require('./utils/logger');
const { errorHandler } = require('./utils/errorHandler');
const { getCredentialsManager } = require('./config/credentials');
const { AuthenticationService } = require('./services/AuthenticationService');
const { GOOGLE_SCOPES } = require('./config/constants');

// ============================================================================
// CLASS: GoogleServiceManager
// ============================================================================

class GoogleServiceManager {
  /**
   * Initialize service manager
   * @param {Object} config - Configuration
   * @param {Object} config.credentials - Google credentials
   * @param {string[]} config.scopes - OAuth scopes
   * @param {Object} config.services - Service configuration (optional)
   */
  constructor(config = {}) {
    this.config = config;
    this.initialized = false;
    
    // Service instances
    this.authService = null;
    this.sheetsService = null;
    this.gmailService = null;
    this.driveService = null;
    this.calendarService = null;
    
    // Credentials manager
    this.credentialsManager = null;
    
    // Multi-account support
    this.accounts = new Map();
    this.activeAccountEmail = null;
    
    // Service status
    this.serviceStatus = {
      auth: 'not-initialized',
      sheets: 'not-initialized',
      gmail: 'not-initialized',
      drive: 'not-initialized',
      calendar: 'not-initialized',
    };
    
    // Metrics
    this.metrics = {
      initialized: new Date(),
      serviceInitializations: 0,
      serviceErrors: 0,
      totalRequests: 0,
    };
    
    logger.info('GoogleServiceManager initialized');
  }

  /**
   * Initialize all services
   * @param {Object} options - Initialization options
   * @returns {Promise<Object>} Initialization result
   */
  async initialize(options = {}) {
    try {
      logger.info('Initializing Google Services Manager');

      const {
        credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH,
        scopes = [],
        services = ['auth', 'sheets', 'gmail', 'drive'],
      } = options;

      // Initialize credentials manager
      this.credentialsManager = getCredentialsManager({
        credentialsPath,
      });

      // Load credentials
      await this.credentialsManager.loadCredentials();
      logger.info('Credentials loaded successfully');

      // Initialize authentication service
      const credentials = this.credentialsManager.getCredentials();
      const scopesToUse = scopes.length > 0 ? scopes : this.getDefaultScopes();

      this.authService = new AuthenticationService({
        credentials,
        scopes: scopesToUse,
      });

      logger.info('AuthenticationService initialized');
      this.serviceStatus.auth = 'initialized';

      // Authenticate
      try {
        await this.authService.authenticateJWT(credentials, scopesToUse);
        this.serviceStatus.auth = 'authenticated';
        this.activeAccountEmail = credentials.client_email;
      } catch (error) {
        logger.warn('Authentication during initialization failed', { error: error.message });
        this.serviceStatus.auth = 'auth-failed';
      }

      // Initialize requested services (stub implementations)
      for (const serviceName of services) {
        this.initializeService(serviceName);
      }

      this.initialized = true;
      this.metrics.serviceInitializations++;

      logger.info('GoogleServiceManager initialization complete', {
        initializedServices: services,
        activeAccount: this.activeAccountEmail,
      });

      return {
        success: true,
        initializedServices: services,
        activeAccount: this.activeAccountEmail,
        status: this.serviceStatus,
      };
    } catch (error) {
      this.metrics.serviceErrors++;
      logger.error('GoogleServiceManager initialization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize specific service
   * @param {string} serviceName - Service name
   * @private
   */
  initializeService(serviceName) {
    try {
      logger.info(`Initializing ${serviceName} service`);

      switch (serviceName.toLowerCase()) {
        case 'sheets':
          // Will import SheetsService in Week 2
          this.serviceStatus.sheets = 'pending-implementation';
          logger.info('SheetsService scheduled for Week 2 implementation');
          break;

        case 'gmail':
          // Will import GmailService in Week 2
          this.serviceStatus.gmail = 'pending-implementation';
          logger.info('GmailService scheduled for Week 2 implementation');
          break;

        case 'drive':
          // Will import DriveService in Week 3
          this.serviceStatus.drive = 'pending-implementation';
          logger.info('DriveService scheduled for Week 3 implementation');
          break;

        case 'calendar':
          // Will import CalendarService in Week 3
          this.serviceStatus.calendar = 'pending-implementation';
          logger.info('CalendarService scheduled for Week 3 implementation');
          break;

        default:
          logger.warn(`Unknown service: ${serviceName}`);
      }
    } catch (error) {
      this.metrics.serviceErrors++;
      logger.error(`Failed to initialize ${serviceName}`, { error: error.message });
      this.serviceStatus[serviceName] = 'initialization-failed';
    }
  }

  /**
   * Get authentication service
   * @returns {AuthenticationService} Authentication service instance
   */
  getAuthService() {
    if (!this.authService) {
      throw errorHandler.handleAuthError(
        new Error('AuthenticationService not initialized. Call initialize() first.')
      );
    }
    return this.authService;
  }

  /**
   * Get sheets service
   * @returns {Object} Sheets service instance
   */
  getSheetsService() {
    if (!this.sheetsService) {
      throw new Error('SheetsService not initialized');
    }
    return this.sheetsService;
  }

  /**
   * Get Gmail service
   * @returns {Object} Gmail service instance
   */
  getGmailService() {
    if (!this.gmailService) {
      throw new Error('GmailService not initialized');
    }
    return this.gmailService;
  }

  /**
   * Get drive service
   * @returns {Object} Drive service instance
   */
  getDriveService() {
    if (!this.driveService) {
      throw new Error('DriveService not initialized');
    }
    return this.driveService;
  }

  /**
   * Get calendar service
   * @returns {Object} Calendar service instance
   */
  getCalendarService() {
    if (!this.calendarService) {
      throw new Error('CalendarService not initialized');
    }
    return this.calendarService;
  }

  /**
   * Get service by name
   * @param {string} serviceName - Service name (auth, sheets, gmail, drive, calendar)
   * @returns {Object} Service instance
   */
  getService(serviceName) {
    switch (serviceName.toLowerCase()) {
      case 'auth':
        return this.getAuthService();
      case 'sheets':
        return this.getSheetsService();
      case 'gmail':
        return this.getGmailService();
      case 'drive':
        return this.getDriveService();
      case 'calendar':
        return this.getCalendarService();
      default:
        throw new Error(`Unknown service: ${serviceName}`);
    }
  }

  /**
   * Add account for multi-account support
   * @param {Object} credentials - Account credentials
   * @param {string} email - Account email (optional)
   */
  addAccount(credentials, email = null) {
    const accountEmail = email || credentials.client_email;

    if (!accountEmail) {
      throw errorHandler.handleValidationError('Account email is required');
    }

    this.accounts.set(accountEmail, {
      credentials,
      createdAt: new Date(),
      status: 'pending',
    });

    logger.info('Account added', { email: accountEmail });
  }

  /**
   * Remove account
   * @param {string} email - Account email
   */
  removeAccount(email) {
    if (this.activeAccountEmail === email) {
      throw errorHandler.handleAuthError(
        new Error('Cannot remove active account. Switch to another account first.')
      );
    }

    if (this.accounts.has(email)) {
      this.accounts.delete(email);
      logger.info('Account removed', { email });
    }
  }

  /**
   * Set active account
   * @param {string} email - Account email
   * @returns {Promise<boolean>} True if successful
   */
  async setActiveAccount(email) {
    try {
      if (!this.accounts.has(email) && !this.credentialsManager?.listAccounts().includes(email)) {
        throw errorHandler.handleValidationError(`Account not found: ${email}`);
      }

      this.activeAccountEmail = email;

      // If auth service exists, switch account
      if (this.authService && this.accounts.has(email)) {
        this.authService.switchAccount(email);
      }

      logger.info('Active account switched', { email });
      return true;
    } catch (error) {
      logger.error('Failed to switch account', { email, error: error.message });
      throw error;
    }
  }

  /**
   * List all accounts
   * @returns {Object} Accounts information
   */
  listAccounts() {
    return {
      activeAccount: this.activeAccountEmail,
      accounts: Array.from(this.accounts.keys()),
      total: this.accounts.size,
    };
  }

  /**
   * Get active account email
   * @returns {string} Active account email
   */
  getActiveAccount() {
    return this.activeAccountEmail;
  }

  /**
   * Perform health check on services
   * @returns {Promise<Object>} Health check result
   */
  async healthCheck() {
    try {
      logger.info('Running health check');

      const health = {
        timestamp: new Date().toISOString(),
        overall: 'healthy',
        services: {},
      };

      // Check auth service
      if (this.authService) {
        try {
          const status = this.authService.getStatus();
          health.services.auth = {
            status: status.isAuthenticated ? 'authenticated' : 'not-authenticated',
            details: status,
          };
        } catch (error) {
          health.services.auth = { status: 'error', error: error.message };
          health.overall = 'degraded';
        }
      }

      // Check other services
      health.services.sheets = {
        status: this.serviceStatus.sheets,
      };
      health.services.gmail = {
        status: this.serviceStatus.gmail,
      };
      health.services.drive = {
        status: this.serviceStatus.drive,
      };
      health.services.calendar = {
        status: this.serviceStatus.calendar,
      };

      logger.info('Health check complete', { overall: health.overall });
      return health;
    } catch (error) {
      logger.error('Health check failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get service status
   * @returns {Object} Current service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      activeAccount: this.activeAccountEmail,
      services: { ...this.serviceStatus },
      accounts: this.listAccounts(),
    };
  }

  /**
   * Get default scopes
   * @returns {string[]} Default scopes
   * @private
   */
  getDefaultScopes() {
    return [
      GOOGLE_SCOPES.SHEETS_READWRITE,
      GOOGLE_SCOPES.GMAIL_SEND,
      GOOGLE_SCOPES.DRIVE_READWRITE,
      GOOGLE_SCOPES.CALENDAR_READWRITE,
    ];
  }

  /**
   * Get manager metrics
   * @returns {Object} Metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Shutdown manager
   * @returns {Promise<boolean>} True if successful
   */
  async shutdown() {
    try {
      logger.info('Shutting down GoogleServiceManager');

      // Revoke tokens if auth service exists
      if (this.authService) {
        try {
          await this.authService.revokeToken();
        } catch (error) {
          logger.warn('Token revocation during shutdown failed', {
            error: error.message,
          });
        }
      }

      // Clear service instances
      this.authService = null;
      this.sheetsService = null;
      this.gmailService = null;
      this.driveService = null;
      this.calendarService = null;

      this.initialized = false;

      logger.info('GoogleServiceManager shutdown complete');
      return true;
    } catch (error) {
      logger.error('Shutdown failed', { error: error.message });
      return false;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let managerInstance = null;

/**
 * Get or create service manager instance
 * @param {Object} config - Configuration
 * @returns {GoogleServiceManager} Manager instance
 */
function getServiceManager(config = {}) {
  if (!managerInstance) {
    managerInstance = new GoogleServiceManager(config);
  }
  return managerInstance;
}

/**
 * Create new service manager instance (non-singleton)
 * @param {Object} config - Configuration
 * @returns {GoogleServiceManager} New manager instance
 */
function createServiceManager(config = {}) {
  return new GoogleServiceManager(config);
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  GoogleServiceManager,
  getServiceManager,
  createServiceManager,
};
