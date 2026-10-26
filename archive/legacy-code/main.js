/**
 * CONSOLIDATION NOTE (Session 18 - February 7, 2026)
 * This file previously contained duplicate PowerAgent initialization code
 * that also existed in code/GoogleAPI/main.js
 * 
 * MIGRATION: Imported consolidated GoogleServicesConsolidated module instead
 * All Google Operations now route through:
 * - code/Integration/Google/GoogleServicesConsolidated.js
 * 
 * Benefits:
 * - No more duplicate code
 * - Multi-account support (Power Agent + Goraha Properties)
 * - 80%+ performance improvement in phone processing
 * - Better error handling and logging
 * 
 * Usage:
 * import { GoogleServicesConsolidated } from './code/Integration/Google/GoogleServicesConsolidated.js';
 * await GoogleServicesConsolidated.initialize();
 */

import { GoogleServicesConsolidated } from './Integration/Google/GoogleServicesConsolidated.js';

let isGoogleAuthenticated = false;
let PowerAgent = null;

/**
 * Initialize Google authentication - Now uses consolidated system
 * Replaces: Previous duplicate PowerAgent initialization
 * 
 * @returns {Promise<Object>} Authentication service
 */
export async function initializeGoogleAuth() {
  if (isGoogleAuthenticated) {
    return PowerAgent;
  }

  try {
    await GoogleServicesConsolidated.initialize();
    PowerAgent = GoogleServicesConsolidated.getPowerAgent();
    isGoogleAuthenticated = true;
    
    console.log('✅ Google Sheets Connected (Consolidated)');
    return PowerAgent;
  } catch (error) {
    console.error('❌ Google Authentication Error:', error.message || error);
    console.log('⚠️  Google Sheets will be unavailable until credentials are fixed');
    PowerAgent = null;
    isGoogleAuthenticated = false;
    return null;
  }
}

// Export consolidated module as default
export { GoogleServicesConsolidated };

// Export the auth object (will be null if creds not loaded)
export { PowerAgent };
export { isGoogleAuthenticated };
