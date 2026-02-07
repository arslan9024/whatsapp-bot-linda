/**
 * Google Integration Module - Index
 * Central entry point for all Google API operations
 * 
 * Provides:
 * - Consolidated Google Services (unified entry point)
 * - Service Manager (orchestrator)
 * - Account Manager (multi-account support)
 * - Account Switcher (context switching)
 * 
 * Version: 1.0.0
 * Last Updated: February 7, 2026
 */

// Main consolidated module
export { GoogleServicesConsolidated } from './GoogleServicesConsolidated.js';

// Service manager
export { GoogleServiceManager, getServiceManager, createServiceManager } from './GoogleServiceManager.js';

// Account management
export { AccountManager, getAccountManager } from './accounts/AccountManager.js';
export { AccountSwitcher, AccountContext } from './accounts/AccountSwitcher.js';

// Services
export { AuthenticationService } from './services/AuthenticationService.js';

// Utilities
export { logger } from './utils/logger.js';
export { errorHandler } from './utils/errorHandler.js';
