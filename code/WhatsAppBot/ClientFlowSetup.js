/**
 * ====================================================================
 * CLIENT FLOW SETUP (Unified Restore + New Linking)
 * ====================================================================
 * Handles WhatsApp client lifecycle events for both:
 *   - Session restore (previously linked devices)
 *   - New device linking (QR code flow)
 *
 * Eliminates ~120 lines of duplication that existed when these were
 * two separate functions (setupRestoreFlow / setupNewLinkingFlow).
 *
 * Dependencies are injected via a `deps` object so this module has
 * zero coupling to index.js globals.
 *
 * @since Phase 11 – February 14, 2026
 */

import ConnectionManager from '../utils/ConnectionManager.js';

/**
 * @typedef {Object} FlowDeps
 * @property {Function}  logBot                - (msg, level) => void
 * @property {Map}       connectionManagers    - phone → ConnectionManager
 * @property {Array}     allInitializedAccounts - mutable array of active clients
 * @property {object}    sessionStateManager   - SessionStateManager singleton
 * @property {object}    accountHealthMonitor  - AccountHealthMonitor singleton
 * @property {object}    sharedContext         - DI context for ConnectionManager
 * @property {Function}  setupMessageListeners - (client, phone, connMgr) => void
 * @property {Function}  updateDeviceStatus    - (phone, data) => void
 * @property {object}    enhancedQRCodeDisplayV2 - EnhancedQRCodeDisplayV2 singleton (Phase 26)
 * @property {Function}  createDeviceStatusFile - (phone) => void
 * @property {object|null} deviceLinkedManager - DeviceLinkedManager or null
 * @property {object|null} keepAliveManager    - SessionKeepAliveManager or null
 * @property {object|null} terminalHealthDashboard - Dashboard for showing status (Phase 26)
 * @property {object|null} contactHandler      - ContactLookupHandler or null (ref container)
 * @property {Function|null} ContactLookupHandler - Constructor for lazy init
 * @property {Function}  setIsInitializing     - (bool) => void
 * @property {object|null} analyticsManager    - AnalyticsManager for metrics (Phase 29e)
 * @property {object|null} uptimeTracker       - UptimeTracker for SLA tracking (Phase 29e)
 */

/**
 * Setup a WhatsApp client with all lifecycle event handlers.
 *
 * @param {object}  client      - whatsapp-web.js Client instance
 * @param {string}  phoneNumber - Account phone number
 * @param {string}  botId       - Bot identifier for session folder
 * @param {object}  opts
 * @param {boolean} opts.isRestore          - true = restore existing session; false = QR linking
 * @param {string}  [opts.displayName]      - Human-readable account name
 * @param {object}  deps                    - Injected dependencies (see FlowDeps above)
 */
export function setupClientFlow(client, phoneNumber, botId, opts, deps) {
  const { isRestore = false, displayName = 'WhatsApp Account' } = opts;
  const {
    logBot,
    connectionManagers,
    allInitializedAccounts,
    sessionStateManager,
    accountHealthMonitor,
    sharedContext,
    setupMessageListeners,
    updateDeviceStatus,
    enhancedQRCodeDisplayV2: QRCodeDisplay,
    createDeviceStatusFile,
    deviceLinkedManager,
    keepAliveManager,
    terminalHealthDashboard,
    contactHandlerRef,     // { current: ContactLookupHandler|null }
    ContactLookupHandler,  // Constructor
    setIsInitializing,
    analyticsManager,      // NEW: Phase 29e - Metrics collection
    uptimeTracker,         // NEW: Phase 29e - SLA tracking
  } = deps;

  const mode = isRestore ? 'restore' : 'qr';
  logBot(`Setting up ${mode} flow for ${phoneNumber}...`, 'info');

  let readyFired = false;

  // ───────────────────────── Connection Manager ─────────────────────────
  const connManager = new ConnectionManager(phoneNumber, client, logBot, botId, sharedContext);
  connectionManagers.set(phoneNumber, connManager);
  logBot(`✅ Connection manager created for ${phoneNumber} (${mode})`, 'success');

  // ───────────────────────── QR Code (new linking only) ─────────────────
  if (!isRestore) {
    client.on('qr', async (qr) => {
      if (!connManager.handleQR(qr)) return; // debounced

      if (deviceLinkedManager) {
        deviceLinkedManager.startLinkingAttempt(phoneNumber);
      }

      try {
        await QRCodeDisplay.display(qr, {
          method: 'auto',
          fallback: true,
          masterAccount: phoneNumber,
          timeout: 120000,
        });
      } catch (error) {
        logBot(`QR display error: ${error.message}`, 'warn');
        logBot('Please link device manually via WhatsApp Settings', 'warn');
      }
    });
  }

  // ───────────────────────── Authenticated ──────────────────────────────
  client.once('authenticated', () => {
    connManager.clearQRTimer();
    logBot(`✅ ${isRestore ? 'Session authenticated' : 'Device linked'} (${phoneNumber})`, 'success');

    const now = new Date().toISOString();
    updateDeviceStatus(phoneNumber, {
      deviceLinked: true,
      linkedAt: now,
      lastConnected: now,
      authMethod: mode,
    });

    // NEW: Record authentication event (Phase 29e)
    if (analyticsManager) {
      analyticsManager.recordStatusChange(phoneNumber, {
        event: 'authenticated',
        status: 'authenticated',
        timestamp: new Date(),
      });
    }

    if (deviceLinkedManager) {
      deviceLinkedManager.markDeviceLinked(phoneNumber, {
        linkedAt: now,
        authMethod: mode,
        ipAddress: null,
      });
      logBot(`📊 Device manager updated (${mode}) for ${phoneNumber}`, 'success');
    }

    sessionStateManager.saveAccountState(phoneNumber, {
      phoneNumber,
      displayName,
      deviceLinked: true,
      isActive: false,
      sessionPath: `sessions/session-${isRestore ? phoneNumber : botId}`,
      lastKnownState: 'authenticated',
    });

    sessionStateManager.recordDeviceLinkEvent(phoneNumber, 'success');
  });

  // ───────────────────────── Ready ──────────────────────────────────────
  client.once('ready', async () => {
    if (readyFired) return;
    readyFired = true;

    logBot(`🟢 READY - ${phoneNumber} is online`, 'ready');
    if (!isRestore) logBot('Session saved for future restarts', 'success');

    // Update ConnectionManager state
    connManager.setState('CONNECTED');
    connManager.sessionCreatedAt = Date.now();
    connManager.lastSuccessfulConnection = Date.now();
    connManager.isInitializing = false;
    connManager.reconnectAttempts = 0;
    connManager.errorCount = 0;
    connManager._trackBrowserPid(client);

    // Mark account as active
    allInitializedAccounts.push(client);
    await sessionStateManager.markRecoverySuccess(phoneNumber);

    // Register for health monitoring
    accountHealthMonitor.registerAccount(phoneNumber, client);

    // NEW: Record account online status (Phase 29e)
    if (analyticsManager) {
      analyticsManager.recordStatusChange(phoneNumber, {
        event: 'ready',
        status: 'online',
        timestamp: new Date(),
      });
    }

    // NEW: Start uptime tracking (Phase 29e)
    if (uptimeTracker) {
      uptimeTracker.startTracking(phoneNumber);
    }

    // Start keep-alive heartbeats for 24/7 operation
    if (keepAliveManager) {
      keepAliveManager.startKeepAlive(phoneNumber, client);
    }

    // Start connection health monitoring
    connManager.startHealthCheck();
    connManager.startKeepAlive();

    // Lazy-init contact handler (restore mode only had this, but it's harmless for both)
    if (ContactLookupHandler && contactHandlerRef && !contactHandlerRef.current) {
      try {
        contactHandlerRef.current = new ContactLookupHandler();
        await contactHandlerRef.current.initialize();
        logBot('✅ Contact lookup handler ready', 'success');
        // contactHandler is available via contactHandlerRef.current (no global needed)
      } catch (error) {
        logBot(`⚠️  Contact handler error: ${error.message}`, 'warn');
      }
    }

    setupMessageListeners(client, phoneNumber, connManager);
    setIsInitializing(false);

    // Update dashboard when device is linked and ready
    if (terminalHealthDashboard && deviceLinkedManager?.getDevice(phoneNumber)) {
      logBot('', 'info');
      logBot('═══════════════════════════════════════════════════════════', 'info');
      logBot('✅ DEVICE SUCCESSFULLY LINKED AND ONLINE', 'success');
      logBot('═══════════════════════════════════════════════════════════', 'info');
      logBot('', 'info');
      // Display updated dashboard showing new device status
      terminalHealthDashboard.displayHealthDashboard();
      logBot('', 'info');
    }
  });

  // ───────────────────────── Auth Failure ────────────────────────────────
  client.once('auth_failure', async (msg) => {
    connManager.isInitializing = false;
    connManager.setState('ERROR');

    if (isRestore) {
      logBot(`Session restore failed for ${phoneNumber}: ${msg}`, 'error');
      logBot('Falling back to new QR code authentication...', 'warn');
      // Re-enter this function in QR mode
      try {
        setupClientFlow(client, phoneNumber, botId, { isRestore: false, displayName }, deps);
      } catch (error) {
        logBot(`Fallback QR setup failed: ${error.message}`, 'error');
        setIsInitializing(false);
      }
    } else {
      logBot(`❌ Authentication failed for ${phoneNumber}: ${msg}`, 'error');
      logBot('Please restart and scan QR code again', 'warn');
    }
  });

  // ───────────────────────── Disconnected ────────────────────────────────
  client.on('disconnected', (reason) => {
    connManager.isInitializing = false;
    const reasonStr = reason || 'unknown';
    logBot(`Disconnected (${phoneNumber}): ${reasonStr}`, 'warn');

    // NEW: Record offline status (Phase 29e)
    if (analyticsManager) {
      analyticsManager.recordStatusChange(phoneNumber, {
        event: 'disconnected',
        status: 'offline',
        reason: reasonStr,
        timestamp: new Date(),
      });
    }

    // NEW: Stop uptime tracking (Phase 29e)
    if (uptimeTracker) {
      uptimeTracker.stopTracking(phoneNumber);
    }

    // Mark device as unlinked
    if (deviceLinkedManager) {
      deviceLinkedManager.markDeviceUnlinked(phoneNumber, reasonStr);
    }

    // Stop monitoring
    connManager.stopHealthCheck();
    connManager.stopKeepAlive();

    // Decide recovery strategy
    if (reasonStr.includes('LOGOUT')) {
      logBot(`User logged out from ${phoneNumber} - manual re-auth needed`, 'warn');
      connManager.setState('DISCONNECTED');
      connManager.reconnectAttempts = 0;
    } else {
      if (reasonStr.toLowerCase().includes('session closed')) {
        logBot(`Session closed unexpectedly for ${phoneNumber}`, 'warn');
      }
      connManager.setState('DISCONNECTED');
      connManager.scheduleReconnect();
    }
  });

  // ───────────────────────── Client Error ────────────────────────────────
  client.on('error', (error) => {
    const msg = error?.message || String(error);
    // Filter non-critical Puppeteer/Protocol errors
    if (msg.includes('Target') || msg.includes('Protocol') || msg.includes('Requesting')) return;

    logBot(`Client error (${phoneNumber}): ${msg}`, 'error');
    
    // NEW: Record error metric (Phase 29e)
    if (analyticsManager) {
      analyticsManager.recordError(phoneNumber, {
        type: 'client_error',
        message: msg,
        timestamp: new Date(),
      });
    }

    connManager.errorCount++;
    if (connManager.errorCount >= connManager.circuitBreakerThreshold) {
      connManager.activateCircuitBreaker();
    }
  });

  // ───────────────────────── Initialize ─────────────────────────────────
  logBot(`Initializing WhatsApp client for ${phoneNumber}...`, 'info');
  connManager.initialize().catch((error) => {
    logBot(`Failed to initialize (${mode}): ${error?.message || String(error)}`, 'error');
  });

  return connManager;
}
