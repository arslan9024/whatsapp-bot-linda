/**
 * ====================================================================
 * CLIENT FLOW SETUP (Unified Restore + New Linking)
 * ====================================================================
 * Handles WhatsApp client lifecycle events for both:
 *   - Session restore (previously linked devices)
 *   - New device linking (pairing code or QR code)
 *
 * Eliminates ~120 lines of duplication that existed when these were
 * two separate functions (setupRestoreFlow / setupNewLinkingFlow).
 *
 * Dependencies are injected via a `deps` object so this module has
 * zero coupling to index.js globals.
 *
 * @since Phase 11 – February 14, 2026
 */

import ConnectionManager from '../connection/ConnectionManager.js';
import { SessionManager } from '../sessions/SessionManager.js';

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
 * @param {boolean} opts.isRestore          - true = restore existing session; false = new linking
 * @param {string}  [opts.displayName]      - Human-readable account name
 * @param {'code'|'qr'} [opts.linkingMethod] - Explicit method for this attempt only; otherwise prompt
 * @param {ConnectionManager} [opts.connectionManager] - Reuse manager when reconnecting
 * @param {boolean} [opts.initialize]      - false = only bind events for an existing manager
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

  let mode = isRestore ? 'restore' : 'qr';
  logBot(`Setting up ${mode} flow for ${phoneNumber}...`, 'info');

  let readyFired = false;
  let authenticated = false;

  // ───────────────────────── Connection Manager ─────────────────────────
  const connManager = opts.connectionManager ||
    new ConnectionManager(phoneNumber, client, logBot, botId, sharedContext);
  connManager.client = client;
  connManager.isRestore = isRestore;
  connManager.acceptEvents = true;
  const isCurrent = () => !connManager.isDestroyed && connManager.client === client && connManager.acceptEvents;
  const clientId = client.authStrategy?.clientId ||
    String(botId).replace(/^\+/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const persist = (status, extra = {}) => {
    const operation = (connManager.persistenceQueue || Promise.resolve()).then(async () => {
      if (connManager.isDestroyed || connManager.client !== client) return;
      try {
        const account = sharedContext.accountConfigManager?.getAllAccounts()
          .find(entry => entry.phoneNumber === phoneNumber);
        const saved = await sessionStateManager.saveDeviceMetadata(phoneNumber, {
          ...sessionStateManager.getDeviceMetadata(phoneNumber),
          ...(account?.role ? { role: account.role } : {}),
          displayName, clientId, sessionPath: `sessions/session-${clientId}`,
          status, authMethod: mode, ...extra,
        });
        if (!saved) logBot(`Could not save session state for ${phoneNumber}`, 'error');
      } catch (error) {
        logBot(`Could not save session state for ${phoneNumber}: ${error.message}`, 'error');
      }
    });
    connManager.persistenceQueue = operation;
    return operation;
  };
  connectionManagers.set(phoneNumber, connManager);
  connManager.botId = clientId;

  // Optional analytics must never abort connection setup or skip other trackers.
  const track = (label, record) => {
    try {
      record();
    } catch (error) {
      logBot(`${label} tracking skipped (${phoneNumber}): ${error.message}`, 'warn');
    }
  };

  // Confirms the WhatsApp login was written to the local profile so the next start restores it.
  const verifySessionSaved = async () => {
    const saved = await SessionManager.waitForAuthenticatedSession(clientId, {
      timeoutMs: opts.sessionSaveTimeoutMs ?? 60000,
      intervalMs: opts.sessionSaveIntervalMs ?? 3000,
    });
    if (!isCurrent()) return saved;
    if (saved) {
      await persist('linked', { sessionSavedAt: new Date().toISOString(), sessionSaved: true });
      if (!isRestore) logBot(`💾 Session saved on this computer (sessions/session-${clientId}); restarts will reconnect without relinking`, 'success');
    } else {
      await persist('linked', { sessionSaved: false });
      logBot(`Session for ${phoneNumber} is online but not confirmed on disk yet (sessions/session-${clientId}). Keep Linda running and avoid closing it right after linking.`, 'warn');
    }
    return saved;
  };
  logBot(`✅ Connection manager created for ${phoneNumber} (${mode})`, 'success');

  let selectionPromise;
  const chooseMethod = () => {
    if (!selectionPromise) {
      selectionPromise = opts.linkingMethod
        ? Promise.resolve(opts.linkingMethod)
        : terminalHealthDashboard.selectLinkingMethod(phoneNumber);
    }
    return selectionPromise;
  };

  const configureMethod = (method) => {
    if (!['code', 'qr'].includes(method)) {
      throw new Error(`Invalid linking method: ${method}`);
    }
    if (method === 'code' && !/^\+?[1-9]\d{6,14}$/.test(phoneNumber)) {
      throw new Error('Pairing requires a phone number with country code (7-15 digits)');
    }
    Object.assign(client.options.pairWithPhoneNumber ??= {}, {
      phoneNumber: method === 'code' ? phoneNumber.replace(/^\+/, '') : '',
      showNotification: true,
      intervalMs: 180000,
    });
    mode = method;
  };

  let requestingCode = false;
  connManager.requestPairingCode = async () => {
    if (isRestore || connManager.isDestroyed || !connManager.acceptEvents) {
      throw new Error('Session recovery cannot start device linking. Use link-code or an explicit account relink command.');
    }
    if (requestingCode) {
      return;
    }
    if (authenticated || readyFired || client.info) {
      throw new Error('Account is already linked; no pairing code is needed');
    }
    if (!client.pupPage) {
      throw new Error('WhatsApp is still loading. Wait for the linking screen and try again.');
    }
    const previousMode = mode;
    const previousOptions = {
      phoneNumber: '', showNotification: true, intervalMs: 180000,
      ...client.options.pairWithPhoneNumber,
    };
    requestingCode = true;
    try {
      configureMethod('code');
      connManager.clearQRTimer();
      await client.requestPairingCode(client.options.pairWithPhoneNumber.phoneNumber, true, 180000);
    } catch (error) {
      Object.assign(client.options.pairWithPhoneNumber ??= {}, previousOptions);
      mode = previousMode;
      throw error;
    } finally {
      requestingCode = false;
    }
  };

  connManager.isAwaitingPairingCode = () =>
    !isRestore && mode === 'code' && isCurrent() && !authenticated && !readyFired;

  const clearCodeReminder = () => {
    clearTimeout(connManager.pairingCodeReminder);
    connManager.pairingCodeReminder = null;
  };
  const scheduleCodeReminder = () => {
    clearCodeReminder();
    connManager.pairingCodeReminder = setTimeout(() => {
      if (!connManager.isAwaitingPairingCode()) return;
      console.log(`\nStill waiting for ${phoneNumber} to link. If the code was delayed or rejected, type r and press Enter for a new code.\n`);
    }, 90000);
    connManager.pairingCodeReminder.unref?.();
  };

  client.on('code', (code) => {
    if (!isCurrent() || authenticated || readyFired || mode !== 'code') {
      return;
    }
    connManager.clearQRTimer();
    deviceLinkedManager?.startLinkingAttempt(phoneNumber);
    terminalHealthDashboard?.setLinkingChallenge?.(phoneNumber, true, { kind: 'code', code });
    // Pairing codes belong only in the local terminal, not persistent logs.
    console.log(`\nWhatsApp pairing code for ${phoneNumber}: ${code}`);
    console.log('On that phone: WhatsApp > Settings (iPhone) or menu (Android) > Linked devices');
    console.log('Choose Link a device > Link with phone number instead, then enter this code.');
    console.log('Codes refresh automatically while waiting. Do not share this code.');
    console.log('Code delayed, expired, or linking failed? Type r and press Enter for a new code.\n');
    scheduleCodeReminder();
  });

  client.on('qr', async (qr) => {
    try {
      if (!isCurrent() || authenticated || readyFired) {
        return;
      }
      // Recovery must never silently become new device registration.
      if (isRestore && mode === 'restore') {
        connManager.authRequired = true;
        connManager.isInitializing = false;
        connManager.setState('AUTH_REQUIRED');
        clearTimeout(connManager.reconnectTimer);
        connManager.reconnectTimer = null;
        connManager.clearQRTimer();
        deviceLinkedManager?.updateDeviceMetadata(phoneNumber, { status: 'auth_required', isOnline: false });
        await persist('auth_required', { isActive: false });
        terminalHealthDashboard?.setLinkingChallenge?.(phoneNumber, false);
        terminalHealthDashboard?.requestDashboardRefresh?.();
        logBot(`Saved session for ${phoneNumber} requires authentication. Recovery stopped without deleting it. Use an explicit link-code/link-qr or account relink command.`, 'warn');
        return;
      }
      if (mode === 'code' || !connManager.handleQR(qr)) {
        return;
      }
      terminalHealthDashboard?.setLinkingChallenge?.(phoneNumber, true, { kind: 'qr' });

      if (deviceLinkedManager) {
        deviceLinkedManager.startLinkingAttempt(phoneNumber);
      }

      await QRCodeDisplay.display(qr, {
        method: 'auto',
        fallback: true,
        masterAccount: phoneNumber,
        timeout: 120000,
      });
    } catch (error) {
      logBot(`Device linking failed (${phoneNumber}): ${error.message}`, 'error');
    }
  });

  // ───────────────────────── Authenticated ──────────────────────────────
  client.once('authenticated', async () => {
    if (!isCurrent()) return;
    authenticated = true;
    clearCodeReminder();
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

    deviceLinkedManager?.updateDeviceMetadata(phoneNumber, { status: 'authenticated', isOnline: false });
    await persist('authenticated', { deviceLinked: true, isActive: false });
    terminalHealthDashboard?.setLinkingChallenge?.(phoneNumber, false);
    terminalHealthDashboard?.requestDashboardRefresh?.();
  });

  // ───────────────────────── Ready ──────────────────────────────────────
  client.once('ready', async () => {
    if (!isCurrent() || readyFired) return;
    readyFired = true;
    clearCodeReminder();
    connManager.authRequired = false;
    connManager.authenticationFailed = false;
    connManager.connectionFailureReason = null;
    clearTimeout(connManager.reconnectTimer);
    clearTimeout(connManager.errorResetTimer);
    connManager.reconnectTimer = null;
    connManager.errorResetTimer = null;

    logBot(`🟢 READY - ${phoneNumber} is online`, 'ready');

    // Update ConnectionManager state
    connManager.setState('CONNECTED');
    connManager.sessionCreatedAt = Date.now();
    connManager.lastSuccessfulConnection = Date.now();
    connManager.isInitializing = false;
    connManager.reconnectAttempts = 0;
    connManager.errorCount = 0;
    connManager.recordActivity?.();
    if (isRestore && connManager.metrics) connManager.metrics.totalRecoveries++;
    connManager._trackBrowserPid(client);

    // Mark account as active
    if (!allInitializedAccounts.includes(client)) allInitializedAccounts.push(client);
    deviceLinkedManager?.markDeviceLinked(phoneNumber, { authMethod: mode });
    deviceLinkedManager?.updateDeviceMetadata(phoneNumber, { lastError: null });
    await persist('linked', { deviceLinked: true, isActive: true, lastError: null });
    if (!isCurrent() || connManager.state !== 'CONNECTED') return;
    connManager.sessionSaveVerification = verifySessionSaved().catch(error => {
      logBot(`Could not verify saved session for ${phoneNumber}: ${error.message}`, 'warn');
      return false;
    });
    if (sharedContext.accountConfigManager?.getMasterPhoneNumber?.() === phoneNumber &&
        sessionStateManager.setMasterPhoneNumber) {
      const saved = await sessionStateManager.setMasterPhoneNumber(phoneNumber);
      if (!saved) logBot(`Could not save master account selection for ${phoneNumber}`, 'error');
    }
    terminalHealthDashboard?.setLinkingChallenge?.(phoneNumber, false);
    terminalHealthDashboard?.requestDashboardRefresh?.();

    // Register for health monitoring
    if (!isCurrent() || connManager.state !== 'CONNECTED') return;
    accountHealthMonitor.registerAccount(phoneNumber, client);

    track('Analytics', () => analyticsManager?.recordStatusChange(phoneNumber, {
      event: 'ready',
      status: 'online',
      timestamp: new Date(),
    }));
    track('Uptime', () => uptimeTracker?.recordAccountOnline(phoneNumber));

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

    terminalHealthDashboard?.requestDashboardRefresh?.();
    terminalHealthDashboard?.onAccountReady?.(phoneNumber);
  });

  // ───────────────────────── Auth Failure ────────────────────────────────
  client.once('auth_failure', async (msg) => {
    if (!isCurrent()) return;
    connManager.authRequired = true;
    connManager.authenticationFailed = true;
    connManager.connectionFailureReason = String(msg);
    clearTimeout(connManager.reconnectTimer);
    connManager.reconnectTimer = null;
    connManager.isInitializing = false;
    connManager.setState('ERROR');

    deviceLinkedManager?.markDeviceUnlinked(phoneNumber, 'AUTH_FAILURE');
    await persist('auth_failed', { deviceLinked: false, isActive: false, lastError: String(msg) });
    terminalHealthDashboard?.setLinkingChallenge?.(phoneNumber, false);
    logBot(`Authentication failed (${phoneNumber}): ${msg}. Use link-code or link-qr.`, 'error');
    terminalHealthDashboard?.requestDashboardRefresh?.();
  });

  // ───────────────────────── Disconnected ────────────────────────────────
  client.on('disconnected', async (reason) => {
    if (!isCurrent()) return;
    connManager.isInitializing = false;
    const reasonStr = reason || 'unknown';
    connManager.connectionFailureReason = String(reasonStr);
    const loggedOut = String(reasonStr).toUpperCase().includes('LOGOUT');
    connManager.authRequired = loggedOut || connManager.authRequired === true;
    connManager.setState(connManager.authRequired && !loggedOut ? 'AUTH_REQUIRED' : 'DISCONNECTED');
    if (connManager.authRequired) {
      clearTimeout(connManager.reconnectTimer);
      connManager.reconnectTimer = null;
    }
    logBot(`Disconnected (${phoneNumber}): ${reasonStr}`, 'warn');

    track('Analytics', () => analyticsManager?.recordStatusChange(phoneNumber, {
      event: 'disconnected',
      status: 'offline',
      reason: reasonStr,
      timestamp: new Date(),
    }));
    track('Uptime', () => uptimeTracker?.recordAccountDowntime(phoneNumber, String(reasonStr)));

    // Mark device as unlinked
    if (deviceLinkedManager) {
      deviceLinkedManager.markDeviceUnlinked(phoneNumber, reasonStr);
    }

    // Stop monitoring
    connManager.stopHealthCheck();
    connManager.stopKeepAlive();
    keepAliveManager?.stopKeepAlive(phoneNumber);
    if (loggedOut) deviceLinkedManager?.updateDeviceMetadata(phoneNumber, { status: 'logged_out' });
    const status = loggedOut ? 'logged_out' : connManager.authenticationFailed ? 'auth_failed' :
      connManager.authRequired ? 'auth_required' : 'offline';
    deviceLinkedManager?.updateDeviceMetadata(phoneNumber, { status, lastError: String(reasonStr) });
    await persist(status, {
      deviceLinked: !loggedOut && !connManager.authenticationFailed, isActive: false, lastError: String(reasonStr),
    });
    terminalHealthDashboard?.setLinkingChallenge?.(phoneNumber, false);
    terminalHealthDashboard?.requestDashboardRefresh?.();

    // Decide recovery strategy
    if (loggedOut) {
      logBot(`User logged out from ${phoneNumber} - manual re-auth needed`, 'warn');
      connManager.setState('DISCONNECTED');
      connManager.reconnectAttempts = 0;
    } else if (!connManager.authRequired) {
      if (reasonStr.toLowerCase().includes('session closed')) {
        logBot(`Session closed unexpectedly for ${phoneNumber}`, 'warn');
      }
      connManager.setState('DISCONNECTED');
      connManager.scheduleReconnect();
    }
  });

  // ───────────────────────── Client Error ────────────────────────────────
  client.on('error', (error) => {
    if (!isCurrent()) return;
    const msg = error?.message || String(error);
    logBot(`Client error (${phoneNumber}): ${msg}`, 'error');
    
    // NEW: Record error metric (Phase 29e)
    if (analyticsManager) {
      analyticsManager.recordError(phoneNumber, {
        type: 'client_error',
        message: msg,
        timestamp: new Date(),
      });
    }

    if (!connManager.isInitializing) connManager.handleInitializeError(msg);
  });

  // ───────────────────────── Initialize ─────────────────────────────────
  connManager.bindClientFlow = (newClient) => {
    setupClientFlow(newClient, phoneNumber, botId, {
      isRestore: true, displayName, connectionManager: connManager, initialize: false,
    }, deps);
  };
  if (opts.initialize !== false) {
    connManager.initializationPromise = (async () => {
      if (!isRestore) {
        configureMethod(await chooseMethod());
        if (mode === 'code') {
          console.log(`Preparing a pairing code for ${phoneNumber}. If it is slow or linking fails, type r and press Enter for a new code.`);
          scheduleCodeReminder();
        }
      }
      logBot(`Initializing WhatsApp client for ${phoneNumber} (${mode})...`, 'info');
      const initialized = await connManager.initialize();
      clearCodeReminder();
      return initialized && !connManager.authRequired;
    })().catch((error) => {
      clearCodeReminder();
      logBot(`Failed to initialize (${mode}): ${error?.message || String(error)}`, 'error');
      return false;
    });
  }

  return connManager;
}
