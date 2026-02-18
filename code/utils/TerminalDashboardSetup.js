/**
 * ====================================================================
 * TERMINAL DASHBOARD SETUP (Extracted from index.js — Phase 13)
 * ====================================================================
 * Sets up the interactive terminal input listener for health dashboard
 * and device management (re-link, status, 6-digit auth).
 *
 * @since Phase 13 — February 14, 2026
 */

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

      onRelinkMaster: async (masterPhone) => {
        if (!masterPhone && accountConfigManager) {
          masterPhone = accountConfigManager.getMasterPhoneNumber();
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
        if (deviceLinkedManager) {
          deviceLinkedManager.resetDeviceStatus(masterPhone);
        }

        // CRITICAL FIX: Destroy old client and create a fresh one to guarantee QR code display
        const oldClient = accountClients.get(masterPhone);
        if (oldClient) {
          try {
            logBot(`  Clearing old session...`, 'info');
            await oldClient.destroy();
          } catch (destroyError) {
            logBot(`  Warning: Could not cleanly destroy old session: ${destroyError.message}`, 'warn');
          }
        }

        try {
          // Create a fresh new client
          logBot(`  Creating new client for fresh QR code...`, 'info');
          const newClient = createClient(masterPhone);
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
            deviceLinkedManager.failLinkingAttempt(masterPhone, error.message);
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
    };

    terminalHealthDashboard.startInteractiveMonitoring(callbacks);
  } catch (error) {
    logBot(`Terminal input setup warning: ${error.message}`, 'warn');
  }
}
