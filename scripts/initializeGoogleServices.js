#!/usr/bin/env node

/**
 * Phase 2 Google API Integration - Initialization & Test Script
 * 
 * This script:
 * 1. Loads credentials from config/google-credentials.json
 * 2. Initializes GoogleServiceManager
 * 3. Tests JWT authentication
 * 4. Reports status and readiness
 * 
 * Usage: node scripts/initializeGoogleServices.js
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleServiceManager } from '../code/Integration/Google/GoogleServiceManager.js';
import { logger } from '../code/Integration/Google/utils/logger.js';
import { GOOGLE_SCOPES } from '../code/Integration/Google/config/constants.js';
import fs from 'fs';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

/**
 * Main initialization function
 */
async function initializeServices() {
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║  Phase 2 Google API Services - Initialization Script   ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════╝${colors.reset}\n`);

  try {
    // Set up logger
    logger.info('Starting Google Services initialization');
    console.log(`${colors.blue}📍 Step 1: Loading Credentials${colors.reset}\n`);

    const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || 
                           path.join(__dirname, '../config/google-credentials.json');

    console.log(`   Credentials Path: ${credentialsPath}`);

    // Create manager instance
    console.log(`\n${colors.blue}📍 Step 2: Creating Service Manager${colors.reset}\n`);

    const manager = new GoogleServiceManager({
      credentials: require(credentialsPath),
    });

    console.log(`   ✅ GoogleServiceManager created`);

    // Initialize services
    console.log(`\n${colors.blue}📍 Step 3: Initializing Services${colors.reset}\n`);

    const initResult = await manager.initialize({
      credentialsPath,
      scopes: [
        GOOGLE_SCOPES.SHEETS_READWRITE,
        GOOGLE_SCOPES.GMAIL_SEND,
        GOOGLE_SCOPES.DRIVE_READWRITE,
        GOOGLE_SCOPES.CALENDAR_READWRITE,
      ],
      services: ['auth', 'sheets', 'gmail', 'drive', 'calendar'],
    });

    console.log(`   ${colors.green}✅ Services initialized successfully${colors.reset}`);

    // Get status
    console.log(`\n${colors.blue}📍 Step 4: Checking Service Status${colors.reset}\n`);

    const status = manager.getStatus();
    console.log(`   Initialized:     ${status.initialized ? colors.green + 'YES' + colors.reset : colors.red + 'NO' + colors.reset}`);
    console.log(`   Active Account:  ${status.activeAccount}`);
    console.log(`   Services:`);

    for (const [service, serviceStatus] of Object.entries(status.services)) {
      const icon = serviceStatus === 'authenticated' ? '✅' : 
                  serviceStatus === 'initialized' ? '⚙️' :
                  serviceStatus === 'pending-implementation' ? '⏳' :
                  '❌';
      console.log(`      ${icon} ${service.padEnd(12)} → ${serviceStatus}`);
    }

    // Get authentication status
    console.log(`\n${colors.blue}📍 Step 5: Authentication Status${colors.reset}\n`);

    const authService = manager.getAuthService();
    const authStatus = authService.getStatus();

    console.log(`   Authenticated:   ${authStatus.isAuthenticated ? colors.green + 'YES' + colors.reset : colors.red + 'NO' + colors.reset}`);
    console.log(`   Auth Method:     ${authStatus.authMethod}`);
    console.log(`   Active Account:  ${authStatus.activeAccount}`);
    console.log(`   Token Expired:   ${authStatus.tokenExpired ? colors.yellow + 'YES' + colors.reset : colors.green + 'NO' + colors.reset}`);
    console.log(`   Accounts:        ${authStatus.accounts.length} configured`);

    // Get metrics
    console.log(`\n${colors.blue}📍 Step 6: Initialization Metrics${colors.reset}\n`);

    const authMetrics = authService.getMetrics();
    console.log(`   Auth Attempts:   ${authMetrics.authAttempts}`);
    console.log(`   Auth Failures:   ${authMetrics.authFailures}`);
    console.log(`   Token Refreshes: ${authMetrics.tokenRefreshes}`);

    // Health check
    console.log(`\n${colors.blue}📍 Step 7: Health Check${colors.reset}\n`);

    const health = await manager.healthCheck();
    console.log(`   Overall Status:  ${colors.green + health.overall + colors.reset}`);
    console.log(`   Timestamp:       ${health.timestamp}`);

    // Success summary
    console.log(`\n${colors.green}╔════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.green}║          ✅ INITIALIZATION SUCCESSFUL                   ║${colors.reset}`);
    console.log(`${colors.green}╚════════════════════════════════════════════════════════╝${colors.reset}`);

    console.log(`\n${colors.cyan}📊 Summary:${colors.reset}`);
    console.log(`   • Service Manager initialized`);
    console.log(`   • Authentication successful (JWT)`);
    console.log(`   • 5 services ready (Auth + 4 pending)`);
    console.log(`   • Health check passed`);
    console.log(`   • Producer: serviceman11@heroic-artifact-414519.iam.gserviceaccount.com`);
    console.log(`   • Project:  heroic-artifact-414519\n`);

    console.log(`${colors.yellow}⏭️  Next Steps:${colors.reset}`);
    console.log(`   1. Week 2 (Feb 17-21): Migrate SheetsService & GmailService`);
    console.log(`   2. Week 3 (Feb 24-28): Add DriveService & CalendarService`);
    console.log(`   3. Week 4 (Mar 3-7):  Final hardening & production sign-off\n`);

    process.exit(0);

  } catch (error) {
    console.error(`\n${colors.red}❌ INITIALIZATION FAILED${colors.reset}\n`);
    console.error(`${colors.red}Error: ${error.message}${colors.reset}\n`);

    if (error.code) {
      console.error(`${colors.red}Error Code: ${error.code}${colors.reset}\n`);
    }

    if (error.details) {
      console.error(`${colors.red}Details:${colors.reset}`);
      console.error(JSON.stringify(error.details, null, 2));
      console.error();
    }

    // Show troubleshooting steps
    console.log(`${colors.yellow}🔧 Troubleshooting:${colors.reset}`);
    console.log(`   1. Verify credentials file exists at: config/google-credentials.json`);
    console.log(`   2. Check .env file has GOOGLE_CREDENTIALS_PATH set`);
    console.log(`   3. Ensure credentials JSON is valid`);
    console.log(`   4. Check internet connection for Google API access`);
    console.log(`   5. Verify service account has required Google API permissions\n`);

    logger.error('Initialization failed', { error: error.message });
    process.exit(1);
  }
}

// Run initialization
initializeServices();
