/**
 * ====================================================================
 * TERMINAL DASHBOARD SETUP (Extracted from index.js — Phase 13)
 * ====================================================================
 * Sets up the interactive terminal input listener for health dashboard
 * and device management (re-link, status, 6-digit auth).
 *
 * @since Phase 13 — February 14, 2026
 */

import services from '../core/ServiceRegistry.js';
import { SessionManager } from '../sessions/SessionManager.js';
import { getSessionRecovery } from '../sessions/SessionRecoveryService.js';
import { TerminalConversationAnalysis } from './TerminalConversationAnalysis.js';
import { getLiveConnectionState } from '../connection/ConnectionEnhancements.js';

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
    onOpenCampaigns,
    onCampaignInput,
    isCampaignMenuActive,
  } = opts;

  try {
    const savedClientId = (phone) => SessionManager.resolveClientId(
      phone, getFlowDeps().sessionStateManager.getDeviceMetadata(phone) || {},
      accountConfigManager?.getAllAccounts().find(account => account.phoneNumber === phone)
    );
    const canRestoreSaved = phone => {
      const metadata = getFlowDeps().sessionStateManager.getDeviceMetadata(phone) || {};
      const clientId = savedClientId(phone);
      // A status recorded for a different (empty) profile does not apply to the resolved login profile.
      const statusApplies = !metadata.clientId || metadata.clientId === clientId;
      return !(statusApplies && ['logged_out', 'auth_failed', 'auth_required'].includes(metadata.status)) &&
        SessionManager.canRestoreSession(clientId);
    };
    const recovery = getSessionRecovery({
      getFlowDeps, setupClientFlow, createClient, accountClients, accountConfigManager,
    });
    const stopAccountClient = phone => recovery.stopAccount(phone);
    const restoreAccount = phone => recovery.recover(phone);
    const conversationAnalysis = new TerminalConversationAnalysis({
      accountClients, getFlowDeps,
      onInboxChange: () => terminalHealthDashboard?.requestDashboardRefresh?.(),
    });
    terminalHealthDashboard?.setConversationReporter?.({
      run: (phone, options) => conversationAnalysis.overview(phone, options),
      get: phone => conversationAnalysis.getReport(phone),
      counts: (phone, options) => conversationAnalysis.counts(phone, options),
      getCounts: phone => conversationAnalysis.getCounts(phone),
    });
    const callbacks = {
      onCampaigns: onOpenCampaigns,
      onCampaignInput,
      isCampaignMenuActive,
      onRestoreAccount: restoreAccount,
      onCheckMaster: async ({ recover = false } = {}) => {
        const phone = accountConfigManager?.getMasterPhoneNumber?.() || terminalHealthDashboard.masterPhoneNumber;
        if (!phone) {
          logBot('MASTER NOT CONFIGURED. Choose link-code or link-qr. All options: features | help.', 'warn');
          return false;
        }
        const account = accountConfigManager?.getAllAccounts().find(item => item.phoneNumber === phone);
        if (account?.enabled === false) {
          logBot(`MASTER ${phone} IS DISABLED. Enable the account before recovery. All options: features | help.`, 'warn');
          return false;
        }
        const client = accountClients.get(phone);
        if (client) {
          try {
            if (await getLiveConnectionState(client) === 'CONNECTED' && accountClients.get(phone) === client) {
              logBot(`MASTER ${phone} ONLINE (live check). Ready to continue. All options: features | menu | help.`, 'success');
              return true;
            }
          } catch (error) {
            logBot(`Master connection check failed: ${error.message}`, 'warn');
          }
        }
        const manager = getFlowDeps().connectionManagers.get(phone);
        if (manager?.isInitializing || manager?.isReconnecting || recovery.pending.has(phone)) {
          logBot(`MASTER ${phone} CONNECTING. Wait, then run master check. All options: features | help.`, 'info');
          return false;
        }
        if (!canRestoreSaved(phone)) {
          logBot(`MASTER ${phone} OFFLINE; fresh authentication is required. Choose link-code or link-qr. All options: features | help.`, 'warn');
          return false;
        }
        if (!recover) {
          logBot(`MASTER ${phone} OFFLINE. First: master ready (restore saved session, no new code). If restore fails: relink master ${phone}. All options: features | help.`, 'warn');
          return false;
        }
        logBot(`Restoring master ${phone} from its saved session...`, 'info');
        try {
          await restoreAccount(phone);
        } catch (error) {
          logBot(`Master restore failed: ${error.message}. Retry master ready, or choose relink master ${phone} to authenticate.`, 'error');
          throw error;
        }
        const restored = accountClients.get(phone);
        if (!restored || await getLiveConnectionState(restored) !== 'CONNECTED') {
          throw new Error(`Master ${phone} is not online after restore. Run master check; if needed, relink master ${phone}.`);
        }
        logBot(`MASTER ${phone} ONLINE (live check). Ready to continue. All options: features | menu | help.`, 'success');
        return true;
      },
      onDisconnectAccount: async phone => {
        await recovery.disconnect(phone);
        conversationAnalysis.clear(phone);
      },
      onListChats: (phone, page) => conversationAnalysis.list(phone, page),
      onAnalyzeChat: (phone, number, limit) => conversationAnalysis.analyze(phone, number, limit),
      // NEW: Manual linking command (Phase 21)
      onLinkMaster: async (linkingMethod) => {
        if (!manualLinkingHandler) {
          logBot('❌ Manual linking handler not initialized', 'error');
          return;
        }
        
        logBot('', 'info');
        logBot('🔗 Initiating master account linking...', 'info');
        logBot('', 'info');
        
        const success = await manualLinkingHandler.initiateMasterAccountLinking(linkingMethod);
        
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
          
          const canRestore = canRestoreSaved(phoneNumber);
          
          if (canRestore) {
            logBot(`  ✅ Valid session found for ${phoneNumber}`, 'success');
            logBot(`  💡 Attempting to restore session instead of QR code...`, 'info');
            
            return await restoreAccount(phoneNumber);
          }
          
          logBot(`  No existing session found - choose pairing code or QR code`, 'info');

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
            deviceLinkedManager.addDevice(phoneNumber, {
              role: 'master',
              name: displayName,
              status: 'pending'
            });
          }
          logBot(`  ✅ Registered in device tracker`, 'info');

          logBot(`  [4/5] Creating WhatsApp client...`, 'info');
          const newClient = await createClient(savedClientId(phoneNumber));
          accountClients.set(phoneNumber, newClient);
          logBot(`  ✅ Client created`, 'info');

          logBot(`  [5/5] Choose a device linking method...`, 'info');
          const flow = setupClientFlow(newClient, phoneNumber, 'master', { isRestore: false }, getFlowDeps());

          if (deviceLinkedManager) {
            deviceLinkedManager.startLinkingAttempt(phoneNumber);
          }

          logBot(`  Starting client initialization...\n`, 'info');
          if (!await flow.initializationPromise) {
            throw new Error('Client initialization failed; see linking error above');
          }

          logBot('', 'info');
          logBot(`Master account configured. Complete linking on your phone using the selected method.`, 'info');
          logBot('', 'info');

        } catch (error) {
          logBot(`❌ Failed to add master account: ${error.message}`, 'error');
          if (deviceLinkedManager) {
            deviceLinkedManager.recordLinkFailure(phoneNumber, error);
          }
          logBot('', 'info');
        }
      },

      onRelinkMaster: async (masterPhone, linkingMethod) => {
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
          const canRestore = !linkingMethod && canRestoreSaved(masterPhone);
          
          if (canRestore) {
            logBot(`  ✅ Valid session found for ${masterPhone}`, 'success');
            logBot(`  💡 Restoring session instead of showing new QR code...`, 'info');
            
            return await restoreAccount(masterPhone);
          }
          
          logBot(`  No valid session found - choose pairing code or QR code`, 'info');
        } catch (sessionCheckError) {
          logBot(`Could not restore master session: ${sessionCheckError.message}`, 'error');
          return;
        }

        // CRITICAL FIX: Reset device status
        logBot(`  [2/4] Resetting device state...`, 'info');
        if (deviceLinkedManager) {
          deviceLinkedManager.resetDeviceStatus(masterPhone);
        }
        logBot(`  ✅ Device state reset`, 'info');

        try {
          // Create a fresh new client
          logBot(`  [4/4] Creating client for pairing code or QR linking...`, 'info');
          await stopAccountClient(masterPhone);
          const newClient = await createClient(savedClientId(masterPhone));
          accountClients.set(masterPhone, newClient);
          if (masterPhone === accountConfigManager?.getMasterPhoneNumber()) {
            getFlowDeps().sharedContext.setMasterRef(newClient);
          }

          // Set up the flow (this registers QR event listener)
          const flow = setupClientFlow(newClient, masterPhone, 'master', {
            isRestore: false, ...(linkingMethod ? { linkingMethod } : {}),
          }, getFlowDeps());

          // Mark as linking
          if (deviceLinkedManager) {
            deviceLinkedManager.startLinkingAttempt(masterPhone);
          }

          // Initialize fresh client to display new QR code
          logBot(`  Choose your linking method below:\n`, 'info');
          if (!await flow.initializationPromise) {
            throw new Error('Client initialization failed; see linking error above');
          }

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
          const canRestore = canRestoreSaved(servantPhone);
          
          if (canRestore) {
            logBot(`  ✅ Valid session found for ${servantPhone}`, 'success');
            logBot(`  💡 Restoring session instead of showing new QR code...`, 'info');
            
            // Get existing client or use restored session
            return await restoreAccount(servantPhone);
          }
          
          logBot(`  No valid session found - choose pairing code or QR code`, 'info');
        } catch (sessionCheckError) {
          logBot(`Could not restore servant session: ${sessionCheckError.message}`, 'error');
          return;
        }

        // CRITICAL FIX: Reset device status
        logBot(`  [2/4] Resetting device state...`, 'info');
        if (deviceLinkedManager) {
          deviceLinkedManager.resetDeviceStatus(servantPhone);
        }
        logBot(`  ✅ Device state reset`, 'info');

        try {
          logBot(`  [4/4] Creating client for pairing code or QR linking...`, 'info');
          await stopAccountClient(servantPhone);
          const newClient = await createClient(savedClientId(servantPhone));
          accountClients.set(servantPhone, newClient);

          const flow = setupClientFlow(newClient, servantPhone, 'servant', { isRestore: false }, getFlowDeps());

          if (deviceLinkedManager) {
            deviceLinkedManager.startLinkingAttempt(servantPhone);
          }

          logBot(`  Choose your linking method below:\n`, 'info');
          if (!await flow.initializationPromise) {
            throw new Error('Client initialization failed; see linking error above');
          }

        } catch (error) {
          logBot(`Failed to relink servant account: ${error.message}`, 'error');
          if (deviceLinkedManager) {
            deviceLinkedManager.recordLinkFailure(servantPhone, error);
          }
        }
      },

      onRelinkDevice: async (phoneNumber) => {
        const config = accountConfigManager?.getAllAccounts().find(account => account.phoneNumber === phoneNumber);
        return ['master', 'primary'].includes(config?.role)
          ? callbacks.onRelinkMaster(phoneNumber) : callbacks.onRelinkServant(phoneNumber);
      },

      onSwitchTo6Digit: async (phoneNumber) => {
        const managers = getFlowDeps().connectionManagers;
        const normalized = phoneNumber.replace(/^\+/, '');
        const entry = [...managers.entries()].find(([phone]) => phone.replace(/^\+/, '') === normalized);
        if (!entry?.[1].requestPairingCode) {
          logBot("No active linking flow for that phone. Use 'link master' or 'relink master <phone>' first.", 'error');
          return;
        }
        try {
          await entry[1].requestPairingCode();
        } catch (error) {
          logBot(`Could not request pairing code: ${error.message}`, 'error');
          return;
        }
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
        const saved = getFlowDeps().sessionStateManager.state?.accounts || {};
        const phones = new Set([
          ...Object.keys(saved),
          ...(accountConfigManager?.getAllAccounts() || []).map(account => account.phoneNumber),
        ]);
        let restored = 0;
        let failed = 0;
        for (const phone of phones) {
          try {
            await restoreAccount(phone);
            restored++;
          } catch (error) {
            failed++;
            logBot(`Restore ${phone}: ${error.message}`, 'error');
          }
        }
        logBot(`Restore complete: ${restored} loaded/active, ${failed} need attention.`, failed ? 'warn' : 'success');
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
