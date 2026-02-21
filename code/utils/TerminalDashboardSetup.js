/**
 * ====================================================================
 * TERMINAL DASHBOARD SETUP (Extracted from index.js — Phase 13)
 * ====================================================================
 * Sets up the interactive terminal input listener for health dashboard
 * and device management (re-link, status, 6-digit auth).
 *
 * @since Phase 13 — February 14, 2026
 */

import services from './ServiceRegistry.js';

/**
 * @param {Object} opts
 * @param {Function}   opts.logBot
 * @param {object}     opts.terminalHealthDashboard
 * @param {object|null} opts.accountConfigManager
 * @param {object|null} opts.deviceLinkedManager
 * @param {Map}        opts.accountClients
 * @param {Function}   opts.setupClientFlow
 * @param {Function}   opts.getFlowDeps
 * @param {object|null} opts.manualLinkingHandler - NEW: Manual linking with health checks (Phase 21)
 * @param {object|null} opts.gorahaServicesBridge - NEW: GorahaBot contact stats (Phase 26)
 * @param {object|null} opts.googleServiceAccountManager - NEW: Service account validation (Phase 26)
 * @param {object|null} opts.analyticsManager - NEW: Analytics metrics (Phase 29e)
 * @param {object|null} opts.reportGenerator - NEW: Report generation (Phase 29e)
 * @param {object|null} opts.googleSheetsManager - NEW: Google Sheets CRUD operations (Phase 30)
 */
export function setupTerminalInputListener(opts) {
  const {
    logBot,
    terminalHealthDashboard,
    accountConfigManager,
    deviceLinkedManager,
    accountClients,
    setupClientFlow,
    getFlowDeps,
    manualLinkingHandler,  // NEW: Manual linking handler
    createClient,          // NEW: For fresh client creation on relink
    gorahaServicesBridge,  // NEW: GorahaBot integration (Phase 26)
    googleServiceAccountManager,  // NEW: Service account validation (Phase 26)
    analyticsManager,      // NEW: Analytics metrics (Phase 29e)
    reportGenerator,       // NEW: Report generation (Phase 29e)
    googleSheetsManager,   // NEW: Google Sheets CRUD (Phase 30)
  } = opts;

  try {
    const callbacks = {
      // NEW: Manual linking command (Phase 21)
      onLinkMaster: async () => {
        if (!manualLinkingHandler) {
          logBot('❌ Manual linking handler not initialized', 'error');
          return;
        }
        
        logBot('', 'info');
        logBot('🔗 Initiating master account linking...', 'info');
        logBot('', 'info');
        
        const success = await manualLinkingHandler.initiateMasterAccountLinking();
        
        if (!success) {
          logBot('', 'info');
          logBot('❌ Linking failed. Please try again.', 'error');
          logBot('', 'info');
        }
      },

      // ENHANCEMENT: Add a new master WhatsApp account (supports multiple masters)
      onAddNewMaster: async (phoneNumber, displayName) => {
        if (!phoneNumber) {
          logBot('⚠️  Phone number is required', 'error');
          logBot('   Usage: link master <+phone> <name>', 'info');
          logBot('   Example: link master +971553633595 MyAccount', 'info');
          return;
        }

        phoneNumber = phoneNumber.trim();
        displayName = (displayName || phoneNumber).trim();

        logBot('', 'info');
        logBot(`🔗 Adding new master account: ${phoneNumber} (${displayName})`, 'info');
        logBot('', 'info');

        try {
          if (!accountConfigManager) {
            logBot('❌ Account manager not initialized', 'error');
            return;
          }

          // CRITICAL FIX: Check if session can be restored BEFORE showing QR code
          logBot(`  [1/5] Checking for existing session...`, 'info');
          
          // Import SessionManager for session restoration check
          const { SessionManager } = await import('./SessionManager.js');
          const canRestore = SessionManager.canRestoreSession(phoneNumber);
          
          if (canRestore) {
            logBot(`  ✅ Valid session found for ${phoneNumber}`, 'success');
            logBot(`  💡 Attempting to restore session instead of QR code...`, 'info');
            
            // Update account status to 'linked' if session exists
            if (accountConfigManager) {
              const account = accountConfigManager.getAccountByPhone(phoneNumber);
              if (account) {
                await accountConfigManager.updateAccountStatus(account.id, 'linked');
                logBot(`  ✅ Account status updated to 'linked'`, 'info');
              }
            }
            
            // Mark device as successfully linked
            if (deviceLinkedManager) {
              deviceLinkedManager.markDeviceLinked(phoneNumber, { 
                authMethod: 'restore',
                linkedAt: new Date().toISOString()
              });
              logBot(`  ✅ Device marked as linked in tracker`, 'info');
            }
            
            logBot('', 'info');
            logBot(`✅ Account ${phoneNumber} restored from existing session!`, 'success');
            logBot('', 'info');
            return; // Exit early - no QR code needed
          }
          
          logBot(`  ℹ️  No existing session found - QR code required`, 'info');

          logBot(`  [2/5] Adding to configuration...`, 'info');
          const addResult = await accountConfigManager.addMasterAccount(phoneNumber, displayName);
          if (!addResult.success) {
            logBot(`  ❌ Failed to add account: ${addResult.error}`, 'error');
            logBot('', 'info');
            return;
          }
          logBot(`  ✅ Account added to config`, 'info');

          logBot(`  [3/5] Register in device manager...`, 'info');
          if (deviceLinkedManager) {
            deviceLinkedManager.registerDevice(phoneNumber, {
              role: 'master',
              displayName,
              status: 'pending'
            });
          }
          logBot(`  ✅ Registered in device tracker`, 'info');

          logBot(`  [4/5] Creating WhatsApp client...`, 'info');
          const newClient = await createClient(phoneNumber);
          accountClients.set(phoneNumber, newClient);
          logBot(`  ✅ Client created`, 'info');

          logBot(`  [5/5] Initializing with QR code...`, 'info');
          setupClientFlow(newClient, phoneNumber, 'master', { isRestore: false }, getFlowDeps());

          if (deviceLinkedManager) {
            deviceLinkedManager.startLinkingAttempt(phoneNumber);
          }

          logBot(`  Starting client initialization...\n`, 'info');
          await newClient.initialize();

          logBot('', 'info');
          logBot(`✅ Master account added! Please scan the QR code above with WhatsApp.`, 'success');
          logBot('', 'info');

        } catch (error) {
          logBot(`❌ Failed to add master account: ${error.message}`, 'error');
          if (deviceLinkedManager) {
            deviceLinkedManager.recordLinkFailure(phoneNumber, error);
          }
          logBot('', 'info');
        }
      },

      onRelinkMaster: async (masterPhone) => {
        // NEW: Support phone number parameter for dynamic master account relinking
        if (!masterPhone && accountConfigManager) {
          masterPhone = accountConfigManager.getMasterPhoneNumber();
        }
        
        // NEW: Sanitize phone number (remove + if provided dynamically)
        if (masterPhone && typeof masterPhone === 'string') {
          masterPhone = masterPhone.trim();
          // Keep + for display, but validation happens in client creation
        }

        if (!masterPhone) {
          logBot('⚠️  Master phone not configured', 'error');
          logBot('   💡 Use command: !set-master <account-id> to set master account', 'info');
          if (accountConfigManager) {
            const accounts = accountConfigManager.getAllAccounts();
            if (accounts.length > 0) {
              logBot('   Available accounts:', 'info');
              accounts.forEach((acc) => {
                logBot(`     • ${acc.id}: ${acc.displayName} (${acc.phoneNumber})`, 'info');
              });
            }
          }
          return;
        }

        logBot(`Re-linking master account: ${masterPhone}`, 'info');
        logBot('', 'info');
        
        // CRITICAL FIX: Check if session can be restored BEFORE creating new client
        logBot(`  [1/4] Checking for existing valid session...`, 'info');
        
        try {
          // Import SessionManager for session restoration check
          const { SessionManager } = await import('./SessionManager.js');
          const canRestore = SessionManager.canRestoreSession(masterPhone);
          
          if (canRestore) {
            logBot(`  ✅ Valid session found for ${masterPhone}`, 'success');
            logBot(`  💡 Restoring session instead of showing new QR code...`, 'info');
            
            // Get existing client or restored client
            let existingClient = accountClients.get(masterPhone);
            if (existingClient) {
              logBot(`  ℹ️  Using existing client connection...`, 'info');
              if (deviceLinkedManager) {
                deviceLinkedManager.markDeviceLinked(masterPhone, { 
                  authMethod: 'restore',
                  linkedAt: new Date().toISOString()
                });
              }
              logBot('', 'info');
              logBot(`✅ Master account ${masterPhone} restored successfully!`, 'success');
              logBot('', 'info');
              return; // Exit early - session restored
            }
          }
          
          logBot(`  ℹ️  No valid session found - QR code will be displayed`, 'info');
        } catch (sessionCheckError) {
          logBot(`  ⚠️  Could not check session: ${sessionCheckError.message}`, 'warn');
          logBot(`  ℹ️  Proceeding with QR code display...`, 'info');
        }

        // CRITICAL FIX: Reset device status
        logBot(`  [2/4] Resetting device state...`, 'info');
        if (deviceLinkedManager) {
          deviceLinkedManager.resetDeviceStatus(masterPhone);
        }
        logBot(`  ✅ Device state reset`, 'info');

        // CRITICAL FIX: Destroy old client and create a fresh one to guarantee QR code display
        const oldClient = accountClients.get(masterPhone);
        if (oldClient) {
          try {
            logBot(`  [3/4] Clearing old session data...`, 'info');
            await oldClient.destroy();
            logBot(`  ✅ Old session cleared`, 'info');
          } catch (destroyError) {
            logBot(`  ⚠️  Warning: Could not cleanly destroy old session: ${destroyError.message}`, 'warn');
          }
        }

        try {
          // Create a fresh new client
          logBot(`  [4/4] Creating new client for fresh QR code...`, 'info');
          const newClient = await createClient(masterPhone);
          accountClients.set(masterPhone, newClient);

          // Set up the flow (this registers QR event listener)
          setupClientFlow(newClient, masterPhone, 'master', { isRestore: false }, getFlowDeps());

          // Mark as linking
          if (deviceLinkedManager) {
            deviceLinkedManager.startLinkingAttempt(masterPhone);
          }

          // Initialize fresh client to display new QR code
          logBot(`  Initializing fresh client - QR code will display below:\n`, 'info');
          await newClient.initialize();

        } catch (error) {
          logBot(`Failed to relink master account: ${error.message}`, 'error');
          if (deviceLinkedManager) {
            deviceLinkedManager.recordLinkFailure(masterPhone, error);
          }
        }
      },

      onRelinkServant: async (servantPhone) => {
        // Support: relink servant +971553633595
        if (!servantPhone) {
          logBot('⚠️  No servant account specified', 'error');
          if (accountConfigManager) {
            const servants = accountConfigManager.getAllServantAccounts();
            if (servants.length > 0) {
              logBot('', 'info');
              logBot('📱 Available Servant Accounts:', 'info');
              servants.forEach((acc) => {
                const status = acc.status === 'active' ? '✅' : '⏳';
                logBot(`     • ${acc.phoneNumber} (${acc.displayName}) [${status}]`, 'info');
              });
              logBot('', 'info');
              logBot('💡 Usage: relink servant +<phone-number>', 'info');
            }
          }
          return;
        }

        servantPhone = servantPhone.trim();
        logBot(`Re-linking servant account: ${servantPhone}`, 'info');
        logBot('', 'info');
        
        // CRITICAL FIX: Check if session can be restored BEFORE creating new client
        logBot(`  [1/4] Checking for existing valid session...`, 'info');
        
        try {
          // Import SessionManager for session restoration check
          const { SessionManager } = await import('./SessionManager.js');
          const canRestore = SessionManager.canRestoreSession(servantPhone);
          
          if (canRestore) {
            logBot(`  ✅ Valid session found for ${servantPhone}`, 'success');
            logBot(`  💡 Restoring session instead of showing new QR code...`, 'info');
            
            // Get existing client or use restored session
            let existingClient = accountClients.get(servantPhone);
            if (existingClient) {
              logBot(`  ℹ️  Using existing client connection...`, 'info');
              if (deviceLinkedManager) {
                deviceLinkedManager.markDeviceLinked(servantPhone, { 
                  authMethod: 'restore',
                  linkedAt: new Date().toISOString()
                });
              }
              logBot('', 'info');
              logBot(`✅ Servant account ${servantPhone} restored successfully!`, 'success');
              logBot('', 'info');
              return; // Exit early - session restored
            }
          }
          
          logBot(`  ℹ️  No valid session found - QR code will be displayed`, 'info');
        } catch (sessionCheckError) {
          logBot(`  ⚠️  Could not check session: ${sessionCheckError.message}`, 'warn');
          logBot(`  ℹ️  Proceeding with QR code display...`, 'info');
        }

        // CRITICAL FIX: Reset device status
        logBot(`  [2/4] Resetting device state...`, 'info');
        if (deviceLinkedManager) {
          deviceLinkedManager.resetDeviceStatus(servantPhone);
        }
        logBot(`  ✅ Device state reset`, 'info');

        const oldClient = accountClients.get(servantPhone);
        if (oldClient) {
          try {
            logBot(`  [3/4] Clearing old session data...`, 'info');
            await oldClient.destroy();
            logBot(`  ✅ Old session cleared`, 'info');
          } catch (destroyError) {
            logBot(`  ⚠️  Warning: Could not cleanly destroy old session: ${destroyError.message}`, 'warn');
          }
        }

        try {
          logBot(`  [4/4] Creating new client for fresh QR code...`, 'info');
          const newClient = await createClient(servantPhone);
          accountClients.set(servantPhone, newClient);

          setupClientFlow(newClient, servantPhone, 'servant', { isRestore: false }, getFlowDeps());

          if (deviceLinkedManager) {
            deviceLinkedManager.startLinkingAttempt(servantPhone);
          }

          logBot(`  Initializing fresh client - QR code will display below:\n`, 'info');
          await newClient.initialize();

        } catch (error) {
          logBot(`Failed to relink servant account: ${error.message}`, 'error');
          if (deviceLinkedManager) {
            deviceLinkedManager.recordLinkFailure(servantPhone, error);
          }
        }
      },

      onRelinkDevice: async (phoneNumber) => {
        logBot(`Re-linking device: ${phoneNumber}`, 'info');
        if (deviceLinkedManager) {
          deviceLinkedManager.resetDeviceStatus(phoneNumber);
        }
      },

      onSwitchTo6Digit: async (phoneNumber) => {
        logBot(`6-digit auth requested for: ${phoneNumber}`, 'info');
        logBot('6-digit code feature coming soon', 'warn');
      },

      onShowDeviceDetails: (phoneNumber) => {
        terminalHealthDashboard.displayDeviceDetails(phoneNumber);
      },

      onListDevices: () => {
        terminalHealthDashboard.listAllDevices();
      },

      // NEW: GorahaBot status callback (Phase 26)
      onGorahaStatusRequested: async (forceRefresh = false) => {
        try {
          if (!gorahaServicesBridge) {
            logBot('❌ Goraha bridge not initialized', 'error');
            console.log('\n❌ GorahaBot service is not available\n');
            return;
          }

          // Fetch contact statistics
          const contactStats = await gorahaServicesBridge.getContactStats(forceRefresh);

          // Fetch account validation
          const accountValidation = await gorahaServicesBridge.validateAccount();

          // Display the results
          terminalHealthDashboard.displayGorahaStatus(contactStats, accountValidation);
        } catch (error) {
          logBot(`Error fetching GorahaBot status: ${error.message}`, 'error');
          console.log(`\n❌ Error fetching GorahaBot status: ${error.message}\n`);
        }
      },

      // NEW: GorahaBot filter callback (Phase 28)
      onGorahaFilterRequested: async (filterString) => {
        try {
          if (!gorahaServicesBridge) {
            logBot('❌ Goraha bridge not initialized', 'error');
            console.log('\n❌ GorahaBot service is not available\n');
            return;
          }

          // Fetch filtered contacts
          const filteredResult = await gorahaServicesBridge.getFilteredContacts(filterString);

          // Display the results
          terminalHealthDashboard.displayGorahaFilterResults(filteredResult);
        } catch (error) {
          logBot(`Error filtering GorahaBot contacts: ${error.message}`, 'error');
          console.log(`\n❌ Error filtering GorahaBot contacts: ${error.message}\n`);
        }
      },

      // NEW: Restore all sessions callback (Phase 28)
      onRestoreAllSessions: async () => {
        try {
          console.log(`📱 Scanning saved sessions...\n`);
          
          // Get all saved sessions from SessionManager
          const { SessionManager } = await import('./SessionManager.js');
          const allSessions = SessionManager.getAllSavedSessions();

          if (!allSessions || allSessions.length === 0) {
            console.log(`  ⚠️  No saved sessions found\n`);
            console.log(`  💡 Tip: Link accounts first using 'link-master' command\n`);
            return;
          }

          console.log(`  ✅ Found ${allSessions.length} saved session(s):\n`);
          allSessions.forEach(phone => console.log(`    • ${phone}`));

          console.log(`\n📊 RESTORE OPTIONS:\n`);
          console.log(`  1️⃣  Auto-restore: Restart the server (node index.js)`);
          console.log(`     → Automatically restores all ${allSessions.length} session(s)\n`);
          console.log(`  2️⃣  Manual restore: Relink specific accounts`);
          console.log(`     • recover <+phone>     → Attempt restore for one account`);
          console.log(`     • relink <+phone>      → Re-link with fresh QR code\n`);
          console.log(`  3️⃣  Check status: Monitor restore progress`);
          console.log(`     • health               → View all accounts`);
          console.log(`     • accounts             → List accounts & details\n`);

        } catch (error) {
          logBot(`Error restoring all sessions: ${error.message}`, 'error');
          console.log(`  ❌ Error scanning sessions: ${error.message}\n`);
        }
      },

      // NEW: Phase 29c - Auto-relinking command callback
      onAutoRelink: async () => {
        // This callback is invoked when user requests auto-relinking
        // The actual relinking is triggered from index.js after initialization
        console.log(`\n${'='.repeat(70)}`);
        console.log(`🔗 PHASE 29c: AUTO-RELINKING SCHEDULER`);
        console.log(`${'='.repeat(70)}\n`);
        
        console.log(`ℹ️  Auto-relinking happens automatically on server restart:`);
        console.log(`   • Command: node index.js`);
        console.log(`   • All previously linked accounts are restored\n`);
        
        console.log(`📊 To manually trigger relinking:`);
        console.log(`   • relink <+phone>        → Relink specific account`);
        console.log(`   • relink-all             → Force relink all accounts\n`);
        
        console.log(`📈 To check account status:`);
        console.log(`   • health                 → View health report`);
        console.log(`   • account-status         → Detailed account status\n`);
        console.log(`${'-'.repeat(70)}\n`);
      },

      // NEW: Phase 29c - Health monitoring dashboard
      onHealthMonitoring: async () => {
        // This callback shows Phase 29c health monitoring information
        console.log(`\n${'='.repeat(70)}`);
        console.log(`📊 PHASE 29c: REAL-TIME CONNECTION MONITORING`);
        console.log(`${'='.repeat(70)}\n`);
        
        console.log(`✅ Connection Monitor Features:`);
        console.log(`   • Real-time online/offline status tracking`);
        console.log(`   • Health checks every 30 seconds`);
        console.log(`   • Automatic dashboard status updates`);
        console.log(`   • Error recovery and diagnostics\n`);
        
        console.log(`📈 Monitor commands:`);
        console.log(`   • health                 → Full health dashboard`);
        console.log(`   • account-status <+phone> → Status for specific account`);
        console.log(`   • accounts               → List all accounts & status\n`);
        
        console.log(`🔄 Auto-recovery:`);
        console.log(`   • Monitors connection drops`);
        console.log(`   • Attempts automatic reconnection`);
        console.log(`   • Updates dashboard with current status\n`);
        console.log(`${'-'.repeat(70)}\n`);
      },

      // NEW: Phase 29d - Auto-reconnection system info
      onAutoReconnectInfo: async () => {
        console.log(`\n${'='.repeat(70)}`);
        console.log(`🔄 PHASE 29d: AUTO-RECONNECTION SYSTEM`);
        console.log(`${'='.repeat(70)}\n`);
        
        console.log(`✅ Auto-Reconnection Features:`);
        console.log(`   • Automatic detection of connection drops`);
        console.log(`   • Exponential backoff retry logic`);
        console.log(`   • Max 5 attempts with increasing delays`);
        console.log(`   • Real-time status updates to dashboard\n`);
        
        console.log(`📊 Monitoring Details:`);
        console.log(`   • Check interval: 5 seconds`);
        console.log(`   • Initial backoff: 2 seconds`);
        console.log(`   • Max backoff: 60 seconds`);
        console.log(`   • Integration with circuit breaker & degradation\n`);
        
        console.log(`💡 How It Works:`);
        console.log(`   1. Monitor detects account went offline`);
        console.log(`   2. Auto-reconnect initiates retry`);
        console.log(`   3. Circuit breaker prevents hammering`);
        console.log(`   4. Graceful degradation routes to fallback\n`);
        console.log(`${'-'.repeat(70)}\n`);
      },

      // NEW: Phase 29d - Circuit breaker status
      onCircuitStatus: async () => {
        console.log(`\n${'='.repeat(70)}`);
        console.log(`🔌 PHASE 29d: CIRCUIT BREAKER STATUS`);
        console.log(`${'='.repeat(70)}\n`);
        
        console.log(`✅ Circuit Breaker Pattern:`);
        console.log(`   • CLOSED: Normal operation (requests pass through)`);
        console.log(`   • OPEN: Too many failures (requests rejected)`);
        console.log(`   • HALF-OPEN: Testing recovery (limited requests)\n`);
        
        console.log(`📈 Configuration:`);
        console.log(`   • Failure threshold: 5 consecutive failures`);
        console.log(`   • Reset timeout: 30 seconds`);
        console.log(`   • Prevents cascading failures\n`);
        
        console.log(`🎯 Benefits:`);
        console.log(`   • Stops hammering broken endpoints`);
        console.log(`   • Allows time for recovery`);
        console.log(`   • Automatically tests recovery`);
        console.log(`   • Manual reset available\n`);
        console.log(`${'-'.repeat(70)}\n`);
      },

      // NEW: Phase 29d - Graceful degradation status
      onDegradationStatus: async () => {
        console.log(`\n${'='.repeat(70)}`);
        console.log(`📉 PHASE 29d: GRACEFUL DEGRADATION STATUS`);
        console.log(`${'='.repeat(70)}\n`);
        
        console.log(`✅ Graceful Degradation Features:`);
        console.log(`   • Continue with partial account availability`);
        console.log(`   • Smart fallback routing to available accounts`);
        console.log(`   • Master account priority in fallback chain`);
        console.log(`   • Automatic recovery tracking\n`);
        
        console.log(`📊 System Status:`);
        console.log(`   • Total degradation events tracked`);
        console.log(`   • Current degraded account count`);
        console.log(`   • Recovery success rate`);
        console.log(`   • Messages routed to fallback\n`);
        
        console.log(`🎯 How It Works:`);
        console.log(`   1. Accounts marked as available/unavailable`);
        console.log(`   2. Messages route to best available account`);
        console.log(`   3. Master account used as primary fallback`);
        console.log(`   4. System continues operating (degraded mode)\n`);
        console.log(`${'-'.repeat(70)}\n`);
      },

      // NEW: Phase 29e - Analytics reporting callback
      onAnalyticsReportRequested: async (reportType = 'realtime', phoneNumber = null) => {
        try {
          if (!analyticsManager) {
            logBot('❌ Analytics manager not initialized', 'error');
            console.log('\n❌ Analytics service is not available\n');
            return;
          }

          console.clear();

          switch (reportType) {
            case 'realtime':
              // Display real-time metrics dashboard
              const metrics = analyticsManager.getSummary();
              terminalHealthDashboard.displayAnalyticsMetrics(metrics);
              break;

            case 'report':
              // Generate full analytics report
              console.log(`\n📊 GENERATING FULL ANALYTICS REPORT...\n`);
              const fullReport = reportGenerator.generateFullReport();
              console.log(fullReport);
              break;

            case 'uptime':
              // Show uptime metrics for all accounts
              const uptimeMetrics = analyticsManager.getSummary();
              terminalHealthDashboard.displayUptimeMetrics(uptimeMetrics);
              break;

            case 'account':
              // Account-specific analytics
              if (phoneNumber) {
                const accountMetrics = analyticsManager.getAccountMetrics(phoneNumber);
                terminalHealthDashboard.displayAccountAnalytics(phoneNumber, accountMetrics);
              } else {
                console.log(`\n⚠️  Phone number required for account analytics\n`);
              }
              break;

            default:
              console.log(`\n⚠️  Unknown report type: ${reportType}\n`);
          }
        } catch (error) {
          logBot(`Error generating analytics report: ${error.message}`, 'error');
          console.log(`\n❌ Error generating analytics report: ${error.message}\n`);
        }
      },

      // NEW: Phase 30 - Google Sheets CRUD operations
      onGoogleSheetsRead: async (spreadsheetId, range = 'Sheet1') => {
        try {
          if (!googleSheetsManager) {
            logBot('❌ Google Sheets manager not initialized', 'error');
            console.log('\n❌ Google Sheets service is not available\n');
            return;
          }

          console.log(`\n📊 Reading Google Sheet...`);
          const result = await googleSheetsManager.readSheet(spreadsheetId, range);

          if (!result.success) {
            console.log(`\n❌ Error: ${result.error}\n`);
            return;
          }

          console.log(`\n✅ Successfully read ${result.rowCount} rows\n`);
          console.log(`Range: ${result.range}`);
          console.log(`Columns: ${result.columnCount}`);
          console.log(`\n📋 Data:\n`);
          
          if (result.data.length === 0) {
            console.log('  (empty)');
          } else {
            result.data.forEach((row, idx) => {
              console.log(`  ${idx + 1}. ${row.join(' | ')}`);
            });
          }
          console.log();
        } catch (error) {
          console.log(`\n❌ Error: ${error.message}\n`);
        }
      },

      onGoogleSheetsCreate: async (spreadsheetId, sheetName, values) => {
        try {
          if (!googleSheetsManager) {
            logBot('❌ Google Sheets manager not initialized', 'error');
            console.log('\n❌ Google Sheets service is not available\n');
            return;
          }

          console.log(`\n📝 Adding row to sheet...`);
          const result = await googleSheetsManager.appendRow(spreadsheetId, sheetName, values);

          if (!result.success) {
            console.log(`\n❌ Error: ${result.error}\n`);
            return;
          }

          console.log(`\n✅ Successfully added row`);
          console.log(`Sheet: ${sheetName}`);
          console.log(`Cells Updated: ${result.updatedCells}\n`);
        } catch (error) {
          console.log(`\n❌ Error: ${error.message}\n`);
        }
      },

      onGoogleSheetsUpdate: async (spreadsheetId, cellReference, value) => {
        try {
          if (!googleSheetsManager) {
            logBot('❌ Google Sheets manager not initialized', 'error');
            console.log('\n❌ Google Sheets service is not available\n');
            return;
          }

          console.log(`\n✏️  Updating cell...`);
          const result = await googleSheetsManager.updateCell(spreadsheetId, cellReference, value);

          if (!result.success) {
            console.log(`\n❌ Error: ${result.error}\n`);
            return;
          }

          console.log(`\n✅ Successfully updated`);
          console.log(`Cell: ${cellReference}`);
          console.log(`New Value: ${value}\n`);
        } catch (error) {
          console.log(`\n❌ Error: ${error.message}\n`);
        }
      },

      onGoogleSheetsDelete: async (spreadsheetId, sheetName, rowIndex) => {
        try {
          if (!googleSheetsManager) {
            logBot('❌ Google Sheets manager not initialized', 'error');
            console.log('\n❌ Google Sheets service is not available\n');
            return;
          }

          console.log(`\n🗑️  Deleting row...`);
          const result = await googleSheetsManager.deleteRow(spreadsheetId, sheetName, rowIndex);

          if (!result.success) {
            console.log(`\n❌ Error: ${result.error}\n`);
            return;
          }

          console.log(`\n✅ Successfully deleted row ${rowIndex} from ${sheetName}\n`);
        } catch (error) {
          console.log(`\n❌ Error: ${error.message}\n`);
        }
      },

      onGoogleSheetsSearch: async (spreadsheetId, range, searchValue) => {
        try {
          if (!googleSheetsManager) {
            logBot('❌ Google Sheets manager not initialized', 'error');
            console.log('\n❌ Google Sheets service is not available\n');
            return;
          }

          console.log(`\n🔍 Searching sheet for: "${searchValue}"...`);
          const result = await googleSheetsManager.searchSheet(spreadsheetId, range, searchValue);

          if (!result.success) {
            console.log(`\n❌ Error: ${result.error}\n`);
            return;
          }

          console.log(`\n✅ Found ${result.found} match(es)\n`);
          
          if (result.results.length === 0) {
            console.log('  (no matches)');
          } else {
            result.results.forEach((match, idx) => {
              console.log(`  ${idx + 1}. Cell: ${match.cell}`);
              console.log(`     Value: ${match.value}\n`);
            });
          }
          console.log();
        } catch (error) {
          console.log(`\n❌ Error: ${error.message}\n`);
        }
      },

      onGoogleSheetsMetadata: async (spreadsheetId) => {
        try {
          if (!googleSheetsManager) {
            logBot('❌ Google Sheets manager not initialized', 'error');
            console.log('\n❌ Google Sheets service is not available\n');
            return;
          }

          console.log(`\n📊 Fetching spreadsheet metadata...`);
          const result = await googleSheetsManager.getMetadata(spreadsheetId);

          if (!result.success) {
            console.log(`\n❌ Error: ${result.error}\n`);
            return;
          }

          console.log(`\n✅ Spreadsheet: ${result.spreadsheet}`);
          console.log(`Total Sheets: ${result.sheetCount}\n`);
          console.log(`📋 Sheets:\n`);

          result.sheets.forEach((sheet, idx) => {
            console.log(`  ${idx + 1}. ${sheet.name}`);
            console.log(`     ID: ${sheet.id}`);
            console.log(`     Size: ${sheet.rowCount} rows × ${sheet.columnCount} columns\n`);
          });
        } catch (error) {
          console.log(`\n❌ Error: ${error.message}\n`);
        }
      },
    };

    // Register callbacks for WhatsAppCommandBridge (Phase 31)
    // This allows the bridge to invoke the same callbacks from WhatsApp messages
    services.register('terminalCallbacks', callbacks);

    terminalHealthDashboard.startInteractiveMonitoring(callbacks);
  } catch (error) {
    logBot(`Terminal input setup warning: ${error.message}`, 'warn');
  }
}
