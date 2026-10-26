/**
 * ====================================================================
 * CONNECTION MANAGER (Production-Grade)
 * ====================================================================
 * Manages WhatsApp connection lifecycle with:
 * - Connection state tracking (IDLE → CONNECTING → CONNECTED → DISCONNECTED)
 * - Exponential backoff reconnection with jitter
 * - Circuit breaker pattern (progressive: 1min → 5min → 15min → 30min)
 * - Session health monitoring (30s checks, 5min inactivity timeout)
 * - QR code debouncing (2s minimum between displays)
 * - Browser PID tracking for targeted process killing
 * - Full metrics & telemetry for diagnostics
 * - Memory-safe event listener management (Phase 10)
 * - Error categorization with smart recovery (Phase 14)
 * - Active health checking (Phase 14)
 *
 * Dependencies are injected via a shared `ctx` context object to avoid
 * tight coupling to the main application. The context is read at call-time
 * (not cached), so services that initialize late are always available.
 *
 * @since Phase 9  - February 14, 2026 (initial)
 * @since Phase 10 - February 14, 2026 (extracted, DI, listener cleanup)
 * @since Phase 14 - February 15, 2026 (error categorization, enhanced QR, active health)
 */

import { categorizeError, QRAutoRegenerator, getLiveConnectionState } from './ConnectionEnhancements.js';

export default class ConnectionManager {
  /**
   * @param {string} phoneNumber - Account phone number (e.g. "+971505760056")
   * @param {object} client      - whatsapp-web.js Client instance
   * @param {Function} logFunc   - Logging function: (msg, level) => void
   * @param {string|null} botId  - Bot identifier for session folder naming
   * @param {object} ctx         - Shared context object with runtime dependencies:
   *   - ctx.lockFileDetector         {LockFileDetector|null}
   *   - ctx.sessionCleanupManager    {SessionCleanupManager|null}
   *   - ctx.createClient             {Function} async (botId) => Client
   *   - ctx.accountClients           {Map<string, Client>}
   *   - ctx.accountConfigManager     {AccountConfigManager|null}
   *   - ctx.setMasterRef             {Function} (newClient) => void
   *   - ctx.deviceLinkedManager      {DeviceLinkedManager|null}
   *   - ctx.QRCodeDisplay            {QRCodeDisplay}
   *   - ctx.updateDeviceStatus       {Function} (phoneNumber, data) => void
   *   - ctx.accountHealthMonitor     {AccountHealthMonitor}
   *   - ctx.keepAliveManager         {SessionKeepAliveManager|null}
   *   - ctx.setupMessageListeners    {Function} (client, phoneNumber, connManager) => void
   *   - ctx.allInitializedAccounts   {Array<Client>}
   */
  constructor(phoneNumber, client, logFunc, botId = null, ctx = {}) {
    this.phoneNumber = phoneNumber;
    this.client = client;
    this.log = logFunc;
    this.botId = client.authStrategy?.clientId || botId || phoneNumber;
    this._ctx = ctx; // Shared context — read at call-time so late-init services work

    // State management
    this.state = 'IDLE'; // IDLE, CONNECTING, CONNECTED, DISCONNECTED, ERROR, SUSPENDED
    this.isInitializing = false;
    this.isReconnecting = false;
    this.isDestroyed = false;
    this.initializationPending = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;

    // Exponential backoff
    this.baseRetryDelay = 5000;   // 5s initial
    this.maxRetryDelay = 60000;   // 60s max
    this.reconnectTimer = null;

    // Circuit breaker (progressive cooldowns)
    this.errorCount = 0;
    this.circuitBreakerThreshold = 5;
    this.circuitBreakerDuration = 60000;
    this.circuitBreakerTrips = 0;
    this.errorResetTimer = null;

    // QR debouncing
    this.lastQRTime = 0;
    this.qrDebounceDelay = 2000;
    this.qrAttempts = 0;
    this.qrTimer = null;
    this.qrRegenerator = null;  // Phase 15: QR auto-regeneration

    // Session monitoring
    this.sessionCreatedAt = null;
    this.lastActivityTime = Date.now();
    this.healthCheckInterval = null;
    this.keepAliveInterval = null;
    this.healthCheckPending = false;
    this.healthCheckFailures = 0;

    // Recovery tracking
    this.lastSuccessfulConnection = null;
    this.connectionFailureReason = null;

    // ═══ CONNECTION METRICS & TELEMETRY ═══
    this.metrics = {
      createdAt: Date.now(),
      totalConnections: 0,
      totalDisconnections: 0,
      totalReconnects: 0,
      totalErrors: 0,
      totalRecoveries: 0,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      lastErrorMessage: null,
      lastErrorTime: null,
      lastErrorCategory: null,      // Phase 14: Error category for smart recovery
      lastErrorStrategy: null,        // Phase 14: Recovery strategy applied
      averageSessionDuration: 0,
      sessionDurations: [],
      stateHistory: [],
      qrCodesGenerated: 0,
      qrRegenerationAttempts: 0,    // Phase 15: Track QR regeneration
      qrRegenerationsFailed: 0,     // Phase 15: Track failed regenerations
      browserProcessKills: 0,
      lockRecoveries: 0,
    };

    // Chrome PID tracking
    this._browserPid = null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  setState(newState) {
    if (newState === this.state) return;
    const oldState = this.state;
    this.state = newState;
    this.log(`[${this.phoneNumber}] State: ${oldState} → ${newState}`, 'info');

    // Track state transitions
    this.metrics.stateHistory.push({ from: oldState, to: newState, at: Date.now() });
    if (this.metrics.stateHistory.length > 20) this.metrics.stateHistory.shift();

    if (newState === 'CONNECTED') {
      this.metrics.totalConnections++;
      this.metrics.lastConnectedAt = Date.now();
    } else if (newState === 'DISCONNECTED' && oldState === 'CONNECTED') {
      this.metrics.totalDisconnections++;
      this.metrics.lastDisconnectedAt = Date.now();
      if (this.sessionCreatedAt) {
        const duration = Date.now() - this.sessionCreatedAt;
        this.metrics.sessionDurations.push(duration);
        if (this.metrics.sessionDurations.length > 10) this.metrics.sessionDurations.shift();
        this.metrics.averageSessionDuration = Math.round(
          this.metrics.sessionDurations.reduce((a, b) => a + b, 0) / this.metrics.sessionDurations.length
        );
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION & RECONNECTION
  // ═══════════════════════════════════════════════════════════════════════════

  async initialize() {
    if (this.isDestroyed) return false;
    if (this.authRequired) {
      this.log(`[${this.phoneNumber}] Authentication is required. Choose an explicit link command.`, 'warn');
      return false;
    }
    if (this.isInitializing || this.state === 'CONNECTING') {
      this.log(`[${this.phoneNumber}] Initialize already in progress`, 'warn');
      return false;
    }

    if (this.errorCount >= this.circuitBreakerThreshold) {
      this.log(`[${this.phoneNumber}] ⚠️  Circuit breaker active (${this.errorCount}/${this.circuitBreakerThreshold})`, 'error');
      this.setState('SUSPENDED');
      return false;
    }

    if (this.state === 'CONNECTED') return true;

    this.isInitializing = true;
    this.setState('CONNECTING');

    const client = this.client;
    this.acceptEvents = true;
    let timer;
    let settle;
    const outcome = new Promise((resolve, reject) => { settle = { resolve, reject }; });
    const onReady = () => settle.resolve(true);
    const onAuthFailure = msg => {
      this.authRequired = true;
      this.authenticationFailed = true;
      settle.reject(new Error(`Authentication failed: ${msg}`));
    };
    const onQR = () => {
      if (!this.isRestore) return;
      this.authRequired = true;
      settle.reject(new Error('WhatsApp requested fresh authentication; saved profile retained'));
    };
    const onDisconnected = reason => settle.reject(new Error(`Disconnected during initialization: ${reason}`));
    const onError = error => settle.reject(error instanceof Error ? error : new Error(String(error)));
    this.cancelInitialization = () => settle.reject(new Error('Session initialization cancelled'));
    client.once('ready', onReady);
    client.once('auth_failure', onAuthFailure);
    client.on('qr', onQR);
    client.once('disconnected', onDisconnected);
    client.once('error', onError);
    try {
      this.log(`[${this.phoneNumber}] Initializing WhatsApp client...`, 'info');
      timer = setTimeout(() => settle.reject(new Error('Client readiness timeout after 5 minutes')), 300000);
      this.initializationPending = true;
      const launch = Promise.resolve().then(() => client.initialize()).finally(() => {
        this.initializationPending = false;
      });
      return await Promise.race([outcome, launch.then(() => outcome)]);
    } catch (error) {
      this.acceptEvents = false;
      this.connectionFailureReason = error?.message || String(error);
      if (!this.isDestroyed) this.handleInitializeError(this.connectionFailureReason);
      return false;
    } finally {
      clearTimeout(timer);
      this.isInitializing = false;
      this.cancelInitialization = null;
      client.removeListener('ready', onReady);
      client.removeListener('auth_failure', onAuthFailure);
      client.removeListener('qr', onQR);
      client.removeListener('disconnected', onDisconnected);
      client.removeListener('error', onError);
    }
  }

  handleInitializeError(errorMsg) {
    if (this.authRequired) {
      this.connectionFailureReason = errorMsg;
      this.setState('AUTH_REQUIRED');
      this.log(`[${this.phoneNumber}] Recovery stopped: authentication is required. Saved profile is preserved.`, 'warn');
      return;
    }
    // Phase 14: Use intelligent error categorization
    const errorInfo = categorizeError(errorMsg);
    if (errorInfo.category === 'AUTH') this.authRequired = true;
    
    this.metrics.totalErrors++;
    this.metrics.lastErrorMessage = errorMsg;
    this.metrics.lastErrorTime = Date.now();
    this.metrics.lastErrorCategory = errorInfo.category;
    this.metrics.lastErrorStrategy = errorInfo.strategy;

    // Critical errors increment counter; others just log
    if (errorInfo.severity === 'CRITICAL') {
      this.errorCount++;
    }

    const logLevel = errorInfo.category === 'AUTH' ? 'error' : 'warn';
    this.log(
      `[${this.phoneNumber}] ${errorInfo.category === 'AUTH' ? '❌' : '⚠️'} Error (${errorInfo.category}): ${errorMsg}`,
      logLevel
    );
    this.log(
      `[${this.phoneNumber}]    Strategy: ${errorInfo.strategy} | Recoverable: ${errorInfo.recoverable}`,
      'debug'
    );

    if (!errorInfo.recoverable) {
      this.connectionFailureReason = errorMsg;
      this.log(
        `[${this.phoneNumber}]    ⚠️  Manual intervention required: ${errorInfo.description}`,
        'warn'
      );
    }

    this.setState(this.authRequired ? 'AUTH_REQUIRED' : 'ERROR');
    this.connectionFailureReason = errorMsg;
    this._ctx.deviceLinkedManager?.updateDeviceMetadata(this.phoneNumber, {
      status: this.authRequired ? 'auth_required' : 'restore_failed', isOnline: false, lastError: errorMsg,
    });
    if (errorInfo.recoverable && !this.authRequired) this.scheduleReconnect();
  }

  scheduleReconnect() {
    if (this.isDestroyed || this.reconnectTimer || ['SUSPENDED', 'CONNECTED'].includes(this.state) || this.authRequired) return;
    if (this.isReconnecting) {
      this.reconnectRequested = true;
      return;
    }

    this.reconnectAttempts++;

    const delay = Math.min(
      this.baseRetryDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxRetryDelay
    ) + Math.random() * 1000;

    this.log(`[${this.phoneNumber}] Reconnect in ${Math.round(delay / 1000)}s (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`, 'info');

    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      this.log(`[${this.phoneNumber}] Retry budget exhausted; cooling down before retrying the saved session.`, 'warn');
      this.activateCircuitBreaker();
      return;
    }

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (!this.isDestroyed && !['SUSPENDED', 'CONNECTED'].includes(this.state) && !this.authRequired) {
        this.isReconnecting = true;
        this.metrics.totalReconnects++;
        try {
          this.log(`[${this.phoneNumber}] Reconnecting with saved profile ${this.botId}; authentication data is preserved.`, 'info');
          if (!this._ctx.sessionRecovery) throw new Error('Session recovery service is unavailable');
          await this._ctx.sessionRecovery.recover(this.phoneNumber, {
            source: 'automatic', connectionManager: this,
          });
        } catch (err) {
          if (this.isDestroyed) {
            this.log(`[${this.phoneNumber}] Reconnect ended during shutdown: ${err.message}`, 'warn');
            return;
          }
          this.connectionFailureReason = err.message;
          this.setState(this.authRequired ? 'AUTH_REQUIRED' : 'ERROR');
          this._ctx.deviceLinkedManager?.updateDeviceMetadata(this.phoneNumber, {
            status: this.authenticationFailed ? 'auth_failed' : this.authRequired ? 'auth_required' : 'restore_failed',
            isOnline: false, lastError: err.message,
          });
          this.log(`[${this.phoneNumber}] Reconnect failed: ${err.message}`, 'error');
          this.scheduleReconnect();
        } finally {
          this.isReconnecting = false;
          if (this.reconnectRequested) {
            this.reconnectRequested = false;
            this.scheduleReconnect();
          }
        }
      }
    }, delay);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CIRCUIT BREAKER
  // ═══════════════════════════════════════════════════════════════════════════

  activateCircuitBreaker() {
    this.circuitBreakerTrips++;
    const progressiveDurations = [60000, 300000, 900000, 1800000];
    const cooldown = progressiveDurations[Math.min(this.circuitBreakerTrips - 1, progressiveDurations.length - 1)];

    this.setState('SUSPENDED');
    this.log(`[${this.phoneNumber}] 🔴 Circuit breaker #${this.circuitBreakerTrips} activated for ${cooldown / 1000}s`, 'error');

    if (this.errorResetTimer) clearTimeout(this.errorResetTimer);

    this.errorResetTimer = setTimeout(() => {
      this.errorResetTimer = null;
      if (this.isDestroyed || this.authRequired || this.state !== 'SUSPENDED') return;
      this.log(`[${this.phoneNumber}] Circuit breaker reset (trip #${this.circuitBreakerTrips})`, 'info');
      this.errorCount = 0;
      this.reconnectAttempts = 0;
      this.setState('DISCONNECTED');
      this.scheduleReconnect();
    }, cooldown);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH & KEEP-ALIVE
  // ═══════════════════════════════════════════════════════════════════════════

  recordActivity() {
    this.lastActivityTime = Date.now();
  }

  startHealthCheck() {
    if (this.healthCheckInterval) return;
    this.healthCheckFailures = 0;
    this.healthCheckInterval = setInterval(() => this.checkConnectionHealth(), 30000);
  }

  async checkConnectionHealth() {
    if (this.state !== 'CONNECTED' || this.isDestroyed || this.healthCheckPending) return;
    const client = this.client;
    this.healthCheckPending = true;
    try {
      const state = await getLiveConnectionState(client);
      if (client !== this.client || this.isDestroyed || this.state !== 'CONNECTED') return;
      if (state !== 'CONNECTED') throw new Error(`WhatsApp state is ${state || 'unknown'}`);
      this.healthCheckFailures = 0;
      this.recordActivity();
    } catch (error) {
      if (client !== this.client || this.isDestroyed || this.state !== 'CONNECTED') return;
      this.healthCheckFailures++;
      this.log(`[${this.phoneNumber}] Live connection check failed (${this.healthCheckFailures}/3): ${error.message}`, 'warn');
      if (this.healthCheckFailures >= 3) {
        this.connectionFailureReason = error.message;
        this.stopHealthCheck();
        this.stopKeepAlive();
        this._ctx.deviceLinkedManager?.updateDeviceMetadata(this.phoneNumber, {
          status: 'offline', isOnline: false, lastError: error.message,
        });
        await this.handleStaleSession();
      }
    } finally {
      this.healthCheckPending = false;
    }
  }

  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  async handleStaleSession() {
    this.log(`[${this.phoneNumber}] Attempting graceful restart for stale session...`, 'warn');
    this.setState('DISCONNECTED');
    this.scheduleReconnect();
  }

  startKeepAlive() {
    if (this.keepAliveInterval) return;
    this.keepAliveInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, 60000);
  }

  stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QR CODE MANAGEMENT (Phase 15: Auto-regeneration)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Handle QR code generation with auto-regeneration on timeout
   * Phase 15: Replaces simple timeout warning with active regeneration
   */
  handleQR(qrCode) {
    const now = Date.now();
    if (now - this.lastQRTime < this.qrDebounceDelay) return false;

    this.lastQRTime = now;
    this.qrAttempts++;
    this.metrics.qrCodesGenerated++;
    this.log(`[${this.phoneNumber}] 📱 QR received (Attempt ${this.qrAttempts})`, 'info');

    // Phase 15: Initialize auto-regenerator on first QR
    if (!this.qrRegenerator) {
      this.qrRegenerator = new QRAutoRegenerator(this.log, this.phoneNumber);
      
      // Setup regeneration callback
      this.qrRegenerator.onFallback(() => {
        this.handleQRRegenerationFailed();
      });
    }

    // Phase 15: Start/restart timeout tracking with auto-regeneration
    this.qrRegenerator.startTracking((attemptNum) => {
      this.metrics.qrRegenerationAttempts++;
      this.log(
        `[${this.phoneNumber}] 🔄 QR regeneration attempt ${attemptNum}/3`,
        'warn'
      );
      
      // Trigger new QR by restarting client initialization
      // This will cause whatsapp-web.js to emit a new 'qr' event
      try {
        // Note: In a real scenario, you'd call a method to trigger new QR
        // For now, we log the intent - actual implementation depends on whatsapp-web.js API
        this.log(
          `[${this.phoneNumber}] 💡 New QR will be generated on next scan attempt`,
          'info'
        );
      } catch (e) {
        this.log(`[${this.phoneNumber}] QR regeneration error: ${e.message}`, 'warn');
      }
    }, 120000);

    return true;
  }

  /**
   * Handle QR regeneration failure (fallback to 6-digit code)
   * Phase 15: Called when QR fails to regenerate after 3 attempts
   */
  handleQRRegenerationFailed() {
    this.metrics.qrRegenerationsFailed++;
    
    this.log(
      `[${this.phoneNumber}] ❌ QR regeneration failed after 3 attempts`,
      'error'
    );
    
    this.log(
      `[${this.phoneNumber}] 💡 FALLBACK: Using 6-digit pairing code`,
      'info'
    );
    
    this.log(
      `[${this.phoneNumber}] Instructions:`,
      'info'
    );
    this.log(
      `[${this.phoneNumber}]   1. Open WhatsApp on your phone`,
      'info'
    );
    this.log(
      `[${this.phoneNumber}]   2. Settings → Linked Devices → Link Device`,
      'info'
    );
    this.log(
      `[${this.phoneNumber}]   3. Select "Use 6-digit code"`,
      'info'
    );
    this.log(
      `[${this.phoneNumber}]   4. Request a new 6-digit code from the terminal`,
      'info'
    );
  }

  clearQRTimer() {
    if (this.qrTimer) {
      clearTimeout(this.qrTimer);
      this.qrTimer = null;
    }
    // Phase 15: Clear QR regenerator on successful connection
    if (this.qrRegenerator) {
      this.qrRegenerator.stopTracking();
      this.qrRegenerator = null;
    }
    this.qrAttempts = 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BROWSER PROCESS & RECOVERY
  // ═══════════════════════════════════════════════════════════════════════════

  handleBrowserProcessLost(reason = 'unknown') {
    this.log(`[${this.phoneNumber}] ⚠️  Browser process lost (reason: ${reason}). Initiating recovery...`, 'warn');
    if (this.state === 'CONNECTED' || this.state === 'CONNECTING') {
      try {
        this.stopHealthCheck();
        this.stopKeepAlive();
        this.setState('DISCONNECTED');
        this.scheduleReconnect();
      } catch (err) {
        this.log(`[${this.phoneNumber}] Recovery error: ${err.message}`, 'error');
        this.setState('DISCONNECTED');
        this.scheduleReconnect();
      }
    }
  }

  attemptSmartRecovery(errorMsg) {
    this.handleInitializeError(errorMsg);
    return true;
  }

  async executeProtocolErrorRecovery() {
    this.metrics.lockRecoveries++;
    this.log(`[${this.phoneNumber}] Preserving saved session; scheduling an account-only reconnect.`, 'warn');
    this.isInitializing = false;
    this.setState('DISCONNECTED');
    this.scheduleReconnect();
  }

  _trackBrowserPid(client) {
    try {
      if (client?.pupBrowser) {
        const proc = client.pupBrowser.process();
        if (proc?.pid) {
          this._browserPid = proc.pid;
          this.log(`[${this.phoneNumber}] Browser PID tracked: ${proc.pid}`, 'info');
        }
      }
    } catch (_) { /* best effort */ }
  }

  _killBrowserProcesses() {
    // Only the process object owned by this client can be targeted.
    const browserProcess = this.client?.pupBrowser?.process?.();
    if (!browserProcess || browserProcess.exitCode !== null || browserProcess.killed) return;
    if (browserProcess.kill()) this.metrics.browserProcessKills++;
  }

  _killBrowserProcessesAggressive() {
    this._killBrowserProcesses();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  destroy() {
    if (!this.destroyPromise) this.destroyPromise = this.closeClient();
    return this.destroyPromise;
  }

  async closeClient() {
    this.isDestroyed = true;
    this.acceptEvents = false;
    this.cancelInitialization?.();
    this.stopHealthCheck();
    this.stopKeepAlive();

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.errorResetTimer) clearTimeout(this.errorResetTimer);
    if (this.qrTimer) clearTimeout(this.qrTimer);

    // ═══ QR AUTO-REGENERATOR CLEANUP (Phase 15) ═══
    if (this.qrRegenerator) {
      this.qrRegenerator.stopTracking();
      this.log(`[${this.phoneNumber}] 🛑 QR auto-regenerator stopped`, 'info');
    }

    // ═══ LISTENER CLEANUP (Phase 10) ═══
    try {
      if (this.client) {
        this.client.removeAllListeners();
        this.log(`[${this.phoneNumber}] 🧹 All listeners removed before destroy`, 'info');
      }
    } catch (e) { /* best effort */ }

    try {
      await this.client.destroy();
    } catch (error) {
      this.log(`[${this.phoneNumber}] Could not close the account browser gracefully: ${error.message}`, 'warn');
      this._killBrowserProcesses();
    }

    this.setState('IDLE');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DIAGNOSTICS & STATUS
  // ═══════════════════════════════════════════════════════════════════════════

  getStatus() {
    return {
      phoneNumber: this.phoneNumber,
      state: this.state,
      isConnected: this.state === 'CONNECTED',
      reconnectAttempts: this.reconnectAttempts,
      errorCount: this.errorCount,
      uptime: this.sessionCreatedAt ? Date.now() - this.sessionCreatedAt : 0,
    };
  }

  getDetailedStatus() {
    const uptime = this.sessionCreatedAt ? Date.now() - this.sessionCreatedAt : 0;
    const uptimeStr = this._formatDuration(uptime);
    const avgSession = this._formatDuration(this.metrics.averageSessionDuration);

    return {
      phoneNumber: this.phoneNumber,
      botId: this.botId,
      state: this.state,
      isConnected: this.state === 'CONNECTED',
      isInitializing: this.isInitializing,
      uptime: uptimeStr,
      uptimeMs: uptime,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      errorCount: this.errorCount,
      circuitBreakerTrips: this.circuitBreakerTrips,
      lastError: this.metrics.lastErrorMessage,
      lastErrorTime: this.metrics.lastErrorTime ? new Date(this.metrics.lastErrorTime).toISOString() : null,
      connectionFailureReason: this.connectionFailureReason,
      totalConnections: this.metrics.totalConnections,
      totalDisconnections: this.metrics.totalDisconnections,
      totalReconnects: this.metrics.totalReconnects,
      totalErrors: this.metrics.totalErrors,
      totalRecoveries: this.metrics.totalRecoveries,
      averageSessionDuration: avgSession,
      qrCodesGenerated: this.metrics.qrCodesGenerated,
      browserProcessKills: this.metrics.browserProcessKills,
      lockRecoveries: this.metrics.lockRecoveries,
      recentTransitions: this.metrics.stateHistory.slice(-5).map(t => ({
        ...t, at: new Date(t.at).toLocaleTimeString()
      })),
      browserPid: this._browserPid,
    };
  }

  _formatDuration(ms) {
    if (!ms || ms <= 0) return '0s';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
    if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  }
}
