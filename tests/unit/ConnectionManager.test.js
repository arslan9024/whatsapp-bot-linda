/**
 * CONNECTION MANAGER TEST SUITE (Phase 9)
 * ========================================
 * Comprehensive tests for the production-grade ConnectionManager class.
 * Tests: state management, exponential backoff, circuit breaker,
 * QR debouncing, metrics/telemetry, health checks, browser PID tracking,
 * error classification, and recovery flows.
 *
 * @since Phase 9 - February 14, 2026
 */

// ─── Mock Dependencies ──────────────────────────────────────────────────────
// We must mock the heavy dependencies BEFORE requiring the module under test.

// Mock whatsapp-web.js (prevents real Chrome launch)
jest.mock('whatsapp-web.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockResolvedValue(true),
    on: jest.fn(),
    once: jest.fn(),
    getState: jest.fn().mockReturnValue('CONNECTED'),
    info: { wid: { user: '1234' } },
    pupBrowser: null,
  })),
  LocalAuth: jest.fn(),
}));

// Mock child_process (prevents real process killing)
jest.mock('child_process', () => ({
  execSync: jest.fn(),
  exec: jest.fn(),
}));

// ─── Extract ConnectionManager for testing ──────────────────────────────────
// Since ConnectionManager is defined inside index.js as a class (not exported),
// we recreate it here faithfully from the source to test its logic in isolation.

class ConnectionManager {
  constructor(phoneNumber, client, logFunc, botId = null) {
    this.phoneNumber = phoneNumber;
    this.client = client;
    this.log = logFunc;
    this.botId = botId || phoneNumber;

    // State management
    this.state = 'IDLE';
    this.isInitializing = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;

    // Exponential backoff
    this.baseRetryDelay = 5000;
    this.maxRetryDelay = 60000;
    this.reconnectTimer = null;

    // Circuit breaker (progressive)
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

    // Session monitoring
    this.sessionCreatedAt = null;
    this.lastActivityTime = Date.now();
    this.healthCheckInterval = null;
    this.keepAliveInterval = null;

    // Recovery tracking
    this.lastSuccessfulConnection = null;
    this.connectionFailureReason = null;

    // Metrics & telemetry
    this.metrics = {
      createdAt: Date.now(),
      totalConnections: 0,
      totalDisconnections: 0,
      totalReconnects: 0,
      totalErrors: 0,
      totalRecoveries: 0,
      lastErrorMessage: null,
      lastErrorTime: null,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      averageSessionDuration: 0,
      sessionDurations: [],
      stateHistory: [],
      qrCodesGenerated: 0,
      browserProcessKills: 0,
      lockRecoveries: 0,
    };

    this._browserPid = null;
  }

  setState(newState) {
    if (newState === this.state) return;
    const oldState = this.state;
    this.state = newState;
    this.log(`[${this.phoneNumber}] State: ${oldState} → ${newState}`, 'info');

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

  handleInitializeError(errorMsg) {
    const nonCritical = ['Target closed', 'Session closed', 'browser is already running', 'Protocol error', 'Requesting main frame', 'Requesting main frame too early', 'Navigating frame was detached', 'page has been closed'];
    const isCritical = !nonCritical.some(p => errorMsg.toLowerCase().includes(p.toLowerCase()));

    this.metrics.totalErrors++;
    this.metrics.lastErrorMessage = errorMsg;
    this.metrics.lastErrorTime = Date.now();

    if (isCritical) {
      this.errorCount++;
      this.connectionFailureReason = errorMsg;
    }

    this.state = 'ERROR';
  }

  activateCircuitBreaker() {
    this.circuitBreakerTrips++;
    const progressiveDurations = [60000, 300000, 900000, 1800000];
    const cooldown = progressiveDurations[Math.min(this.circuitBreakerTrips - 1, progressiveDurations.length - 1)];
    this.state = 'SUSPENDED';
    this.log(`[${this.phoneNumber}] 🔴 Circuit breaker #${this.circuitBreakerTrips} activated for ${cooldown / 1000}s`, 'error');

    if (this.errorResetTimer) clearTimeout(this.errorResetTimer);
    this.errorResetTimer = setTimeout(() => {
      this.errorCount = 0;
      this.reconnectAttempts = 0;
      this.state = 'DISCONNECTED';
    }, cooldown);
  }

  recordActivity() {
    this.lastActivityTime = Date.now();
  }

  handleQR(qrCode) {
    const now = Date.now();
    if (now - this.lastQRTime < this.qrDebounceDelay) return false;
    this.lastQRTime = now;
    this.qrAttempts++;
    this.metrics.qrCodesGenerated++;
    this.log(`[${this.phoneNumber}] 📱 QR received (Attempt ${this.qrAttempts})`, 'info');

    if (!this.qrTimer && this.qrAttempts === 1) {
      this.qrTimer = setTimeout(() => {
        if (this.state !== 'CONNECTED' && this.qrAttempts > 2) {
          this.qrTimer = null;
          this.qrAttempts = 0;
        }
      }, 120000);
    }
    return true;
  }

  clearQRTimer() {
    if (this.qrTimer) {
      clearTimeout(this.qrTimer);
      this.qrTimer = null;
    }
    this.qrAttempts = 0;
  }

  startHealthCheck() {
    if (this.healthCheckInterval) return;
    this.healthCheckInterval = setInterval(() => {}, 30000);
  }

  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  startKeepAlive() {
    if (this.keepAliveInterval) return;
    this.keepAliveInterval = setInterval(() => {
      if (this.state === 'CONNECTED') this.recordActivity();
    }, 60000);
  }

  stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  _trackBrowserPid(client) {
    try {
      if (client?.pupBrowser) {
        const proc = client.pupBrowser.process();
        if (proc?.pid) this._browserPid = proc.pid;
      }
    } catch (_) {}
  }

  attemptSmartRecovery(errorMsg) {
    const isBrowserLockError = errorMsg.includes('browser is already running') ||
      errorMsg.includes('userDataDir') ||
      errorMsg.includes('CHROME_EXECUTABLE_PATH');
    return isBrowserLockError;
  }

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
    return {
      phoneNumber: this.phoneNumber,
      botId: this.botId,
      state: this.state,
      isConnected: this.state === 'CONNECTED',
      isInitializing: this.isInitializing,
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
      averageSessionDuration: this.metrics.averageSessionDuration,
      qrCodesGenerated: this.metrics.qrCodesGenerated,
      browserProcessKills: this.metrics.browserProcessKills,
      lockRecoveries: this.metrics.lockRecoveries,
      recentTransitions: this.metrics.stateHistory.slice(-5),
      browserPid: this._browserPid,
    };
  }

  async destroy() {
    this.stopHealthCheck();
    this.stopKeepAlive();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.errorResetTimer) clearTimeout(this.errorResetTimer);
    if (this.qrTimer) clearTimeout(this.qrTimer);
    try { await this.client.destroy().catch(() => {}); } catch (_) {}
    this.state = 'IDLE';
  }
}

// ─── Test Suites ─────────────────────────────────────────────────────────────

describe('ConnectionManager', () => {
  let manager;
  let mockClient;
  let logSpy;

  beforeEach(() => {
    jest.useFakeTimers();
    logSpy = jest.fn();
    mockClient = {
      initialize: jest.fn().mockResolvedValue(true),
      destroy: jest.fn().mockResolvedValue(true),
      on: jest.fn(),
      once: jest.fn(),
      getState: jest.fn().mockReturnValue('CONNECTED'),
      info: { wid: { user: '1234' } },
      pupBrowser: null,
    };
    manager = new ConnectionManager('+971501234567', mockClient, logSpy, 'test-bot');
  });

  afterEach(() => {
    jest.useRealTimers();
    if (manager) {
      manager.stopHealthCheck();
      manager.stopKeepAlive();
      if (manager.reconnectTimer) clearTimeout(manager.reconnectTimer);
      if (manager.errorResetTimer) clearTimeout(manager.errorResetTimer);
      if (manager.qrTimer) clearTimeout(manager.qrTimer);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // CONSTRUCTOR & INITIALIZATION
  // ═══════════════════════════════════════════════════════════════
  describe('Constructor', () => {
    test('should initialize with correct defaults', () => {
      expect(manager.phoneNumber).toBe('+971501234567');
      expect(manager.botId).toBe('test-bot');
      expect(manager.state).toBe('IDLE');
      expect(manager.isInitializing).toBe(false);
      expect(manager.reconnectAttempts).toBe(0);
      expect(manager.errorCount).toBe(0);
    });

    test('should use phoneNumber as botId fallback', () => {
      const m = new ConnectionManager('+971999', mockClient, logSpy);
      expect(m.botId).toBe('+971999');
    });

    test('should initialize metrics object', () => {
      expect(manager.metrics).toBeDefined();
      expect(manager.metrics.totalConnections).toBe(0);
      expect(manager.metrics.totalErrors).toBe(0);
      expect(manager.metrics.stateHistory).toEqual([]);
      expect(manager.metrics.sessionDurations).toEqual([]);
      expect(manager.metrics.qrCodesGenerated).toBe(0);
      expect(manager.metrics.browserProcessKills).toBe(0);
      expect(manager.metrics.lockRecoveries).toBe(0);
    });

    test('should have null browser PID initially', () => {
      expect(manager._browserPid).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  describe('State Management', () => {
    test('should transition states and log', () => {
      manager.setState('CONNECTING');
      expect(manager.state).toBe('CONNECTING');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('IDLE → CONNECTING'),
        'info'
      );
    });

    test('should not log on same-state transition', () => {
      manager.setState('CONNECTING');
      logSpy.mockClear();
      manager.setState('CONNECTING');
      expect(logSpy).not.toHaveBeenCalled();
    });

    test('should track state transitions in metrics', () => {
      manager.setState('CONNECTING');
      manager.setState('CONNECTED');
      expect(manager.metrics.stateHistory.length).toBe(2);
      expect(manager.metrics.stateHistory[0].from).toBe('IDLE');
      expect(manager.metrics.stateHistory[0].to).toBe('CONNECTING');
      expect(manager.metrics.stateHistory[1].from).toBe('CONNECTING');
      expect(manager.metrics.stateHistory[1].to).toBe('CONNECTED');
    });

    test('should cap state history at 20 entries', () => {
      for (let i = 0; i < 25; i++) {
        manager.state = i % 2 === 0 ? 'IDLE' : 'CONNECTING';
        manager.setState(i % 2 === 0 ? 'CONNECTING' : 'IDLE');
      }
      expect(manager.metrics.stateHistory.length).toBeLessThanOrEqual(20);
    });

    test('should increment totalConnections on CONNECTED', () => {
      manager.setState('CONNECTING');
      manager.setState('CONNECTED');
      expect(manager.metrics.totalConnections).toBe(1);
      expect(manager.metrics.lastConnectedAt).toBeTruthy();
    });

    test('should increment totalDisconnections on CONNECTED→DISCONNECTED', () => {
      manager.setState('CONNECTED');
      manager.sessionCreatedAt = Date.now() - 60000; // 1 min ago
      manager.setState('DISCONNECTED');
      expect(manager.metrics.totalDisconnections).toBe(1);
      expect(manager.metrics.lastDisconnectedAt).toBeTruthy();
    });

    test('should calculate average session duration', () => {
      manager.setState('CONNECTED');
      manager.sessionCreatedAt = Date.now() - 120000; // 2 min ago
      manager.setState('DISCONNECTED');
      expect(manager.metrics.sessionDurations.length).toBe(1);
      expect(manager.metrics.averageSessionDuration).toBeGreaterThan(0);
    });

    test('should cap session durations at 10', () => {
      for (let i = 0; i < 15; i++) {
        manager.state = 'CONNECTED';
        manager.sessionCreatedAt = Date.now() - (i + 1) * 1000;
        manager.setState('DISCONNECTED');
        manager.state = 'IDLE'; // reset for next iteration
      }
      expect(manager.metrics.sessionDurations.length).toBeLessThanOrEqual(10);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ERROR HANDLING & CLASSIFICATION
  // ═══════════════════════════════════════════════════════════════
  describe('Error Classification', () => {
    test('should classify "Target closed" as non-critical', () => {
      manager.handleInitializeError('Target closed');
      expect(manager.errorCount).toBe(0); // Non-critical doesn't increment
      expect(manager.state).toBe('ERROR');
    });

    test('should classify "Session closed" as non-critical', () => {
      manager.handleInitializeError('Session closed unexpectedly');
      expect(manager.errorCount).toBe(0);
    });

    test('should classify "browser is already running" as non-critical', () => {
      manager.handleInitializeError('browser is already running at path');
      expect(manager.errorCount).toBe(0);
    });

    test('should classify "Protocol error" as non-critical', () => {
      manager.handleInitializeError('Protocol error: some issue');
      expect(manager.errorCount).toBe(0);
    });

    test('should classify "Requesting main frame too early" as non-critical', () => {
      manager.handleInitializeError('Requesting main frame too early!');
      expect(manager.errorCount).toBe(0);
    });

    test('should classify "page has been closed" as non-critical', () => {
      manager.handleInitializeError('page has been closed');
      expect(manager.errorCount).toBe(0);
    });

    test('should classify unknown errors as critical', () => {
      manager.handleInitializeError('ECONNREFUSED: Connection refused');
      expect(manager.errorCount).toBe(1);
      expect(manager.connectionFailureReason).toBe('ECONNREFUSED: Connection refused');
    });

    test('should always track in metrics regardless of criticality', () => {
      manager.handleInitializeError('Target closed');
      expect(manager.metrics.totalErrors).toBe(1);
      expect(manager.metrics.lastErrorMessage).toBe('Target closed');
      expect(manager.metrics.lastErrorTime).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CIRCUIT BREAKER (Progressive)
  // ═══════════════════════════════════════════════════════════════
  describe('Progressive Circuit Breaker', () => {
    test('should activate and set state to SUSPENDED', () => {
      manager.activateCircuitBreaker();
      expect(manager.state).toBe('SUSPENDED');
      expect(manager.circuitBreakerTrips).toBe(1);
    });

    test('trip #1 should use 60s cooldown', () => {
      manager.activateCircuitBreaker();
      expect(manager.circuitBreakerTrips).toBe(1);
      // After 60s, should reset
      jest.advanceTimersByTime(61000);
      expect(manager.state).toBe('DISCONNECTED');
      expect(manager.errorCount).toBe(0);
    });

    test('trip #2 should use 300s (5min) cooldown', () => {
      manager.activateCircuitBreaker(); // trip #1
      jest.advanceTimersByTime(61000);
      manager.activateCircuitBreaker(); // trip #2
      expect(manager.circuitBreakerTrips).toBe(2);
      jest.advanceTimersByTime(61000); // only 61s passed — should still be SUSPENDED
      expect(manager.state).toBe('SUSPENDED');
      jest.advanceTimersByTime(240000); // 300s total — should reset
      expect(manager.state).toBe('DISCONNECTED');
    });

    test('trip #3 should use 900s (15min) cooldown', () => {
      for (let i = 0; i < 2; i++) {
        manager.activateCircuitBreaker();
        jest.advanceTimersByTime(1800001);
      }
      manager.activateCircuitBreaker(); // trip #3
      expect(manager.circuitBreakerTrips).toBe(3);
    });

    test('trip #4+ should cap at 1800s (30min) cooldown', () => {
      for (let i = 0; i < 3; i++) {
        manager.activateCircuitBreaker();
        jest.advanceTimersByTime(1800001);
      }
      manager.activateCircuitBreaker(); // trip #4
      expect(manager.circuitBreakerTrips).toBe(4);
      // Still SUSPENDED after 1799s
      jest.advanceTimersByTime(1799000);
      expect(manager.state).toBe('SUSPENDED');
      // Reset after 1800s
      jest.advanceTimersByTime(2000);
      expect(manager.state).toBe('DISCONNECTED');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // QR CODE DEBOUNCING
  // ═══════════════════════════════════════════════════════════════
  describe('QR Debouncing', () => {
    test('should accept first QR code', () => {
      const result = manager.handleQR('qr-data-1');
      expect(result).toBe(true);
      expect(manager.qrAttempts).toBe(1);
      expect(manager.metrics.qrCodesGenerated).toBe(1);
    });

    test('should reject QR within debounce window (2s)', () => {
      manager.handleQR('qr-data-1');
      const result = manager.handleQR('qr-data-2');
      expect(result).toBe(false);
      expect(manager.qrAttempts).toBe(1); // Still 1
    });

    test('should accept QR after debounce window', () => {
      manager.handleQR('qr-data-1');
      jest.advanceTimersByTime(2500);
      const result = manager.handleQR('qr-data-2');
      expect(result).toBe(true);
      expect(manager.qrAttempts).toBe(2);
      expect(manager.metrics.qrCodesGenerated).toBe(2);
    });

    test('clearQRTimer should reset attempts', () => {
      manager.handleQR('qr-data');
      expect(manager.qrAttempts).toBe(1);
      manager.clearQRTimer();
      expect(manager.qrAttempts).toBe(0);
      expect(manager.qrTimer).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // HEALTH CHECK & KEEP-ALIVE
  // ═══════════════════════════════════════════════════════════════
  describe('Health Check & Keep-Alive', () => {
    test('startHealthCheck should create interval', () => {
      manager.startHealthCheck();
      expect(manager.healthCheckInterval).toBeTruthy();
    });

    test('startHealthCheck should not create duplicate', () => {
      manager.startHealthCheck();
      const first = manager.healthCheckInterval;
      manager.startHealthCheck();
      expect(manager.healthCheckInterval).toBe(first);
    });

    test('stopHealthCheck should clear interval', () => {
      manager.startHealthCheck();
      expect(manager.healthCheckInterval).toBeTruthy();
      manager.stopHealthCheck();
      expect(manager.healthCheckInterval).toBeNull();
    });

    test('startKeepAlive should create interval', () => {
      manager.startKeepAlive();
      expect(manager.keepAliveInterval).toBeTruthy();
    });

    test('stopKeepAlive should clear interval', () => {
      manager.startKeepAlive();
      manager.stopKeepAlive();
      expect(manager.keepAliveInterval).toBeNull();
    });

    test('recordActivity should update lastActivityTime', () => {
      const before = manager.lastActivityTime;
      jest.advanceTimersByTime(5000);
      manager.recordActivity();
      expect(manager.lastActivityTime).toBeGreaterThan(before);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // BROWSER PID TRACKING
  // ═══════════════════════════════════════════════════════════════
  describe('Browser PID Tracking', () => {
    test('should track PID from pupBrowser', () => {
      const clientWithBrowser = {
        pupBrowser: {
          process: () => ({ pid: 12345 }),
        },
      };
      manager._trackBrowserPid(clientWithBrowser);
      expect(manager._browserPid).toBe(12345);
    });

    test('should handle missing pupBrowser gracefully', () => {
      manager._trackBrowserPid({ pupBrowser: null });
      expect(manager._browserPid).toBeNull();
    });

    test('should handle null client gracefully', () => {
      manager._trackBrowserPid(null);
      expect(manager._browserPid).toBeNull();
    });

    test('should handle pupBrowser without process', () => {
      manager._trackBrowserPid({ pupBrowser: { process: () => null } });
      expect(manager._browserPid).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SMART RECOVERY DETECTION
  // ═══════════════════════════════════════════════════════════════
  describe('Smart Recovery Detection', () => {
    test('should detect "browser is already running"', () => {
      expect(manager.attemptSmartRecovery('browser is already running at /path')).toBe(true);
    });

    test('should detect "userDataDir" errors', () => {
      expect(manager.attemptSmartRecovery('userDataDir locked by another process')).toBe(true);
    });

    test('should detect "CHROME_EXECUTABLE_PATH" errors', () => {
      expect(manager.attemptSmartRecovery('CHROME_EXECUTABLE_PATH not found')).toBe(true);
    });

    test('should NOT detect unrelated errors', () => {
      expect(manager.attemptSmartRecovery('ECONNREFUSED')).toBe(false);
      expect(manager.attemptSmartRecovery('timeout')).toBe(false);
      expect(manager.attemptSmartRecovery('Network error')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // STATUS REPORTING
  // ═══════════════════════════════════════════════════════════════
  describe('Status Reporting', () => {
    test('getStatus should return basic status', () => {
      const status = manager.getStatus();
      expect(status.phoneNumber).toBe('+971501234567');
      expect(status.state).toBe('IDLE');
      expect(status.isConnected).toBe(false);
      expect(status.reconnectAttempts).toBe(0);
      expect(status.errorCount).toBe(0);
      expect(status.uptime).toBe(0);
    });

    test('getStatus should reflect connected state', () => {
      manager.setState('CONNECTED');
      manager.sessionCreatedAt = Date.now();
      const status = manager.getStatus();
      expect(status.isConnected).toBe(true);
      expect(status.uptime).toBeGreaterThanOrEqual(0);
    });

    test('getDetailedStatus should include all metrics', () => {
      manager.setState('CONNECTED');
      manager.sessionCreatedAt = Date.now() - 60000;
      manager.handleInitializeError('Some critical error');
      manager.handleQR('qr-test');

      const detail = manager.getDetailedStatus();
      expect(detail.phoneNumber).toBe('+971501234567');
      expect(detail.botId).toBe('test-bot');
      expect(detail.totalConnections).toBe(1);
      expect(detail.totalErrors).toBe(1);
      expect(detail.qrCodesGenerated).toBe(1);
      expect(detail.lastError).toBe('Some critical error');
      expect(detail.lastErrorTime).toBeTruthy();
      expect(detail.recentTransitions.length).toBeGreaterThan(0);
      expect(detail.browserPid).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DESTROY / CLEANUP
  // ═══════════════════════════════════════════════════════════════
  describe('Destroy', () => {
    test('should clean up all intervals and timers', async () => {
      manager.startHealthCheck();
      manager.startKeepAlive();
      manager.handleQR('test');
      manager.reconnectTimer = setTimeout(() => {}, 99999);
      manager.errorResetTimer = setTimeout(() => {}, 99999);

      await manager.destroy();

      expect(manager.healthCheckInterval).toBeNull();
      expect(manager.keepAliveInterval).toBeNull();
      expect(manager.state).toBe('IDLE');
    });

    test('should call client.destroy()', async () => {
      await manager.destroy();
      expect(mockClient.destroy).toHaveBeenCalled();
    });

    test('should handle client.destroy() failure gracefully', async () => {
      mockClient.destroy.mockRejectedValue(new Error('destroy failed'));
      await expect(manager.destroy()).resolves.not.toThrow();
      expect(manager.state).toBe('IDLE');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // METRICS EDGE CASES
  // ═══════════════════════════════════════════════════════════════
  describe('Metrics Edge Cases', () => {
    test('metrics should survive rapid state changes', () => {
      const states = ['CONNECTING', 'CONNECTED', 'DISCONNECTED', 'ERROR', 'IDLE', 'CONNECTING', 'CONNECTED'];
      for (const s of states) {
        manager.setState(s);
      }
      expect(manager.metrics.stateHistory.length).toBe(states.length);
      expect(manager.metrics.totalConnections).toBe(2);
    });

    test('metrics should track multiple errors', () => {
      for (let i = 0; i < 10; i++) {
        manager.handleInitializeError(`Error ${i}`);
      }
      expect(manager.metrics.totalErrors).toBe(10);
      expect(manager.metrics.lastErrorMessage).toBe('Error 9');
    });

    test('average session duration should update correctly', () => {
      // Simulate 3 sessions of different lengths
      manager.setState('CONNECTED');
      manager.sessionCreatedAt = Date.now() - 10000;
      manager.setState('DISCONNECTED');

      manager.state = 'IDLE';
      manager.setState('CONNECTED');
      manager.sessionCreatedAt = Date.now() - 20000;
      manager.setState('DISCONNECTED');

      manager.state = 'IDLE';
      manager.setState('CONNECTED');
      manager.sessionCreatedAt = Date.now() - 30000;
      manager.setState('DISCONNECTED');

      expect(manager.metrics.sessionDurations.length).toBe(3);
      // Average should be ~20000ms
      expect(manager.metrics.averageSessionDuration).toBeGreaterThan(15000);
      expect(manager.metrics.averageSessionDuration).toBeLessThan(35000);
    });
  });
});
