/**
 * ====================================================================
 * DATABASE INITIALIZER (Extracted from index.js — Phase 12)
 * ====================================================================
 * Initializes the AI Context Integration and Operational Analytics
 * services from Google Sheets data.
 *
 * @since Phase 12 — February 14, 2026
 */

import { AIContextIntegration } from '../Services/AIContextIntegration.js';
import { OperationalAnalytics } from '../Services/OperationalAnalytics.js';
import services from './ServiceRegistry.js';

/**
 * Initialize database context and analytics from the organized sheet.
 * @param {Function} logBot - (msg, level) => void
 */
export async function initializeDatabase(logBot) {
  logBot('Initializing database and analytics...', 'info');

  try {
    const AKOYA_SHEET_ID = process.env.AKOYA_ORGANIZED_SHEET_ID;

    if (AKOYA_SHEET_ID) {
      try {
        const { quickValidateSheet } = await import('./sheetValidation.js');
        const sheetValid = await quickValidateSheet(AKOYA_SHEET_ID);

        if (sheetValid) {
          const contextIntegration = new AIContextIntegration();
          try {
            await contextIntegration.initialize(AKOYA_SHEET_ID, { cacheExpiry: 3600 });
            logBot('Database context loaded into memory', 'success');
            services.register('databaseContext', contextIntegration);
          } catch (error) {
            logBot(`Context initialization failed: ${error.message}`, 'warn');
          }

          try {
            const operationalAnalytics = new OperationalAnalytics(AKOYA_SHEET_ID);
            services.register('operationalAnalytics', operationalAnalytics);
            logBot('Operational Analytics service initialized', 'success');
          } catch (error) {
            logBot(`Analytics initialization failed: ${error.message}`, 'warn');
          }
        } else {
          logBot('Sheet validation failed - using legacy mode', 'warn');
        }
      } catch (error) {
        logBot(`Database initialization error: ${error.message}`, 'warn');
      }
    }
  } catch (error) {
    logBot(`Database error: ${error.message}`, 'warn');
  }
}
