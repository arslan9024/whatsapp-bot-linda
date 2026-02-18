/**
 * GorahaServicesBridge.js
 * ========================
 * Unified interface for GorahaBot contact retrieval and account validation
 * 
 * Features:
 * - Fetch total contact count from GorahaBot Google account
 * - Filter contacts by "D2 Security" in name field
 * - Validate GorahaBot service account (structure + API access)
 * - Cache results to minimize Google API quota usage
 * - Graceful error handling with fallback to cached data
 * 
 * Integration:
 * - Used by TerminalHealthDashboard for 'goraha status' / 'goraha verify' commands
 * - Requires GoogleServiceAccountManager for credentials
 * - Requires GoogleContactsBridge for API access
 * 
 * @since Phase 26 - February 19, 2026
 */

class GorahaServicesBridge {
  constructor() {
    this.googleServiceAccountManager = null;
    this.googleContactsBridge = null;
    
    // Caching
    this.contactStatsCache = null;
    this.accountStatusCache = null;
    this.cacheTimestamp = null;
    
    this.logger = this.createLogger();
  }

  /**
   * Create a simple logger for this module
   */
  createLogger() {
    return {
      debug: (msg) => process.env.LOG_LEVEL === 'debug' && console.log(`🔗 [GORAHA] ${msg}`),
      info: (msg) => console.log(`ℹ️  [GORAHA] ${msg}`),
      warn: (msg) => console.warn(`⚠️  [GORAHA] ${msg}`),
      error: (msg) => console.error(`❌ [GORAHA] ${msg}`),
    };
  }

  /**
   * Initialize the bridge with required managers
   * @param {GoogleServiceAccountManager} gsam - Service account manager
   * @param {GoogleContactsBridge} gcb - Contacts API bridge (optional, can be null)
   * @returns {Promise<boolean>} - True if initialized successfully
   */
  async initialize(gsam, gcb) {
    try {
      if (!gsam) {
        throw new Error('GoogleServiceAccountManager is required');
      }

      this.googleServiceAccountManager = gsam;
      this.googleContactsBridge = gcb;

      // If GoogleContactsBridge is provided, ensure it's initialized
      // If not, we'll initialize API access directly when needed
      if (gcb && !gcb.initialized) {
        try {
          await gcb.initialize();
        } catch (err) {
          this.logger.warn(`GoogleContactsBridge initialization warning: ${err.message}`);
          // Continue anyway - we'll use direct API access
          this.googleContactsBridge = null;
        }
      }

      this.logger.info('GorahaServicesBridge initialized successfully');
      return true;
    } catch (error) {
      this.logger.error(`Failed to initialize GorahaServicesBridge: ${error.message}`);
      return false;
    }
  }

  /**
   * Get contact statistics
   * Returns total contacts + D2 Security contacts (with caching)
   * 
   * @param {boolean} forceRefresh - Force API call, ignore cache
   * @returns {Promise<Object>} - {total: number, d2SecurityCount: number, lastFetched: timestamp, cached: boolean, error?: string}
   */
  async getContactStats(forceRefresh = false) {
    try {
      // Return cached stats if available and not forced refresh
      if (this.contactStatsCache && !forceRefresh) {
        return {
          ...this.contactStatsCache,
          cached: true,
        };
      }

      this.logger.debug('Fetching GorahaBot contact statistics...');

      if (this.googleContactsBridge) {
        // Use GoogleContactsBridge if available
        try {
          // Step 1: Get total contact count via listAllContacts (returns totalCount from API)
          const allContactsResult = await this.googleContactsBridge.listAllContacts({ pageSize: 1 });
          const totalCount = allContactsResult.totalCount || 0;

          // Step 2: Search for "D2 Security" in contact names
          const d2SecurityContacts = await this.googleContactsBridge.searchContacts('D2 Security');
          const d2SecurityCount = d2SecurityContacts.length;

          // Create stats object
          const stats = {
            total: totalCount,
            d2SecurityCount: d2SecurityCount,
            lastFetched: new Date(),
            fetchedAt: new Date().toISOString(),
          };

          // Cache the results
          this.contactStatsCache = stats;
          this.cacheTimestamp = Date.now();

          this.logger.debug(`Contact stats fetched: Total=${totalCount}, D2 Security=${d2SecurityCount}`);

          return {
            ...stats,
            cached: false,
          };
        } catch (bridgeError) {
          this.logger.warn(`GoogleContactsBridge API call failed: ${bridgeError.message}`);
          // Fall through to direct API approach below
        }
      }

      // Direct API approach (when GoogleContactsBridge unavailable)
      this.logger.debug('Using direct Google People API approach...');
      const directStats = await this._fetchContactsViaDirectAPI();
      
      if (directStats) {
        // Cache the results
        this.contactStatsCache = directStats;
        this.cacheTimestamp = Date.now();
        
        return {
          ...directStats,
          cached: false,
        };
      }

      // Return cached data if available, with error message
      if (this.contactStatsCache) {
        return {
          ...this.contactStatsCache,
          cached: true,
          error: `API Error: Unable to fetch fresh data. Showing cached data.`,
        };
      }

      // Return empty stats with error if no cache
      return {
        total: 0,
        d2SecurityCount: 0,
        lastFetched: null,
        cached: false,
        error: `Unable to fetch contacts: Google Contacts API unavailable.`,
      };
    } catch (error) {
      this.logger.error(`Error fetching contact stats: ${error.message}`);

      // Return cached data if available, with error message
      if (this.contactStatsCache) {
        return {
          ...this.contactStatsCache,
          cached: true,
          error: `API Error: ${error.message}. Showing cached data.`,
        };
      }

      // Return empty stats with error if no cache
      return {
        total: 0,
        d2SecurityCount: 0,
        lastFetched: null,
        cached: false,
        error: `Unable to fetch contacts: ${error.message}`,
      };
    }
  }

  /**
   * Fetch contacts via direct Google People API (fallback when GoogleContactsBridge unavailable)
   * @private
   * @returns {Promise<Object|null>} - {total: number, d2SecurityCount: number, lastFetched: timestamp}
   */
  async _fetchContactsViaDirectAPI() {
    try {
      const credentials = await this.googleServiceAccountManager.getCredentials('goraha');
      
      if (!credentials) {
        this.logger.error('GorahaBot credentials not found');
        return null;
      }

      const { google } = await import('googleapis');

      const auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: [
          'https://www.googleapis.com/auth/contacts.readonly',
        ],
      });

      const peopleAPI = google.people({
        version: 'v1',
        auth: auth,
      });

      // Step 1: Get total contact count
      const allContactsResult = await peopleAPI.people.connections.list({
        resourceName: 'people/me',
        pageSize: 1,
        personFields: 'names,phoneNumbers,emailAddresses',
      });

      const totalCount = allContactsResult.data.totalPeople || 0;

      // Step 2: Search for "D2 Security" in contact names
      const searchResult = await peopleAPI.people.searchContacts({
        query: 'D2 Security',
        readMask: 'names,phoneNumbers,emailAddresses',
      });

      const d2SecurityCount = (searchResult.data.results || []).length;

      return {
        total: totalCount,
        d2SecurityCount: d2SecurityCount,
        lastFetched: new Date(),
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Direct API approach failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Validate GorahaBot service account
   * Checks: (1) Credential structure, (2) API access via test call
   * 
   * @returns {Promise<Object>} - {structureValid: boolean, apiAccessValid: boolean, isActive: boolean, details: object, lastChecked: timestamp}
   */
  async validateAccount() {
    try {
      this.logger.debug('Validating GorahaBot service account...');

      // Get credentials
      const credentials = await this.googleServiceAccountManager.getCredentials('goraha');

      if (!credentials) {
        return {
          structureValid: false,
          apiAccessValid: false,
          isActive: false,
          details: {
            error: 'Credentials not found for GorahaBot account',
            email: null,
            project: null,
          },
          lastChecked: new Date().toISOString(),
        };
      }

      // Step 1: Validate structure
      const structureValid = this.googleServiceAccountManager.validateCredentials(credentials, 'goraha');

      if (!structureValid) {
        return {
          structureValid: false,
          apiAccessValid: false,
          isActive: false,
          details: {
            error: 'Credential structure validation failed',
            email: credentials.client_email,
            project: credentials.project_id,
          },
          lastChecked: new Date().toISOString(),
        };
      }

      // Step 2: Test API access via validateCredentialsWithAPITest if available
      let apiAccessValid = false;
      let validationResult = null;

      // Try to use the API test method if it exists, otherwise use structure-only validation
      if (typeof this.googleServiceAccountManager.validateCredentialsWithAPITest === 'function') {
        try {
          validationResult = await this.googleServiceAccountManager.validateCredentialsWithAPITest('goraha');
          apiAccessValid = validationResult.apiAccessValid;
        } catch (error) {
          // Fall back to listing contacts as API test
          this.logger.debug('API test method not available, using contact listing as API test');
          try {
            const testResult = await this.googleContactsBridge.listAllContacts({ pageSize: 1 });
            apiAccessValid = testResult.totalCount !== undefined;
          } catch (testError) {
            this.logger.debug(`API test via contact listing failed: ${testError.message}`);
            apiAccessValid = false;
          }
        }
      } else {
        // No API test method available, try API call directly
        try {
          const testResult = await this.googleContactsBridge.listAllContacts({ pageSize: 1 });
          apiAccessValid = testResult.totalCount !== undefined;
        } catch (testError) {
          this.logger.debug(`API access test failed: ${testError.message}`);
          apiAccessValid = false;
        }
      }

      return {
        structureValid: true,
        apiAccessValid: apiAccessValid,
        isActive: apiAccessValid, // Account is active only if API access works
        details: {
          email: credentials.client_email,
          project: credentials.project_id,
          type: credentials.type,
          validationMessage: apiAccessValid ? 'All validations passed' : 'API access test failed',
        },
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error validating account: ${error.message}`);

      return {
        structureValid: false,
        apiAccessValid: false,
        isActive: false,
        details: {
          error: error.message,
        },
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Get cached contact stats (without forcing API call)
   * Useful for checking if cache is stale
   */
  getCachedStats() {
    if (this.contactStatsCache) {
      return {
        ...this.contactStatsCache,
        cacheAge: Date.now() - this.cacheTimestamp,
      };
    }
    return null;
  }

  /**
   * Clear contact stats cache (force next call to fetch from API)
   */
  clearCache() {
    this.contactStatsCache = null;
    this.cacheTimestamp = null;
    this.logger.debug('Contact stats cache cleared');
  }
}

export default GorahaServicesBridge;
