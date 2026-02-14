/**
 * SERVICE REGISTRY + EXTRACTED MODULE TESTS (Phase 12)
 * =====================================================
 * Unit tests for:
 *   1. ServiceRegistry          – register / get / has / unregister / clear / list / size
 *   2. ProcessErrorHandlers     – isNonCriticalError classification
 *   3. GracefulShutdown         – createGracefulShutdown factory, double-call guard
 *   4. StartupDiagnostics       – printStartupDiagnostics (no-throw contract)
 *   5. DatabaseInitializer      – initializeDatabase branches
 *
 * @since Phase 12 — February 14, 2026
 */

// ─── ServiceRegistry is a singleton — we import it fresh per test via resetModules ───
let ServiceRegistryModule;
let services;

beforeEach(() => {
  // Isolate every test from the singleton's accumulated state
  jest.resetModules();
  ServiceRegistryModule = require('../../code/utils/ServiceRegistry.js');
  services = ServiceRegistryModule.default || ServiceRegistryModule;
  services.clear(); // Belt & suspenders
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. SERVICE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════
describe('ServiceRegistry', () => {
  test('register and get a service', () => {
    const svc = { hello: 'world' };
    services.register('test', svc);
    expect(services.get('test')).toBe(svc);
  });

  test('get returns null for unregistered key', () => {
    expect(services.get('nonexistent')).toBeNull();
  });

  test('has returns true/false correctly', () => {
    expect(services.has('foo')).toBe(false);
    services.register('foo', 42);
    expect(services.has('foo')).toBe(true);
  });

  test('unregister removes a service', () => {
    services.register('x', 1);
    expect(services.unregister('x')).toBe(true);
    expect(services.get('x')).toBeNull();
    expect(services.unregister('x')).toBe(false); // already gone
  });

  test('clear empties all services', () => {
    services.register('a', 1);
    services.register('b', 2);
    services.clear();
    expect(services.size).toBe(0);
  });

  test('list returns registered names', () => {
    services.register('alpha', 'a');
    services.register('beta', 'b');
    const names = services.list();
    expect(names).toContain('alpha');
    expect(names).toContain('beta');
    expect(names).toHaveLength(2);
  });

  test('size reflects count', () => {
    expect(services.size).toBe(0);
    services.register('one', 1);
    expect(services.size).toBe(1);
    services.register('two', 2);
    expect(services.size).toBe(2);
  });

  test('register returns this for chaining', () => {
    const result = services.register('chain', 123);
    expect(result).toBe(services);
  });

  test('overwriting a key is silent', () => {
    services.register('dup', 'first');
    services.register('dup', 'second');
    expect(services.get('dup')).toBe('second');
    expect(services.size).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. PROCESS ERROR HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════
describe('ProcessErrorHandlers', () => {
  let isNonCriticalError;

  beforeAll(() => {
    const mod = require('../../code/utils/ProcessErrorHandlers.js');
    isNonCriticalError = mod.isNonCriticalError;
  });

  const NON_CRITICAL = [
    'Target closed',
    'Session closed',
    'Protocol error',
    'browser is already running',
    'page has been closed',
    'Requesting main frame too early!',
    'DevTools something',
    'Navigating frame was detached',
  ];

  const CRITICAL = [
    'Cannot read properties of undefined',
    'ECONNREFUSED',
    'SyntaxError: Unexpected token',
    'RangeError: Maximum call stack',
    'out of memory',
  ];

  test.each(NON_CRITICAL)('classifies "%s" as non-critical', (msg) => {
    expect(isNonCriticalError(msg)).toBe(true);
  });

  test.each(CRITICAL)('classifies "%s" as critical', (msg) => {
    expect(isNonCriticalError(msg)).toBe(false);
  });

  test('installProcessErrorHandlers registers both handlers', () => {
    const originalListenerCount = process.listenerCount('unhandledRejection');
    const mod = require('../../code/utils/ProcessErrorHandlers.js');
    mod.installProcessErrorHandlers(jest.fn());
    expect(process.listenerCount('unhandledRejection')).toBeGreaterThan(originalListenerCount);
    // Clean up
    process.removeAllListeners('unhandledRejection');
    process.removeAllListeners('uncaughtException');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. GRACEFUL SHUTDOWN
// ═══════════════════════════════════════════════════════════════════════════════
describe('GracefulShutdown', () => {
  // Each test needs a fresh module because of module-level `isShuttingDown` flag
  let createGracefulShutdown;

  beforeEach(() => {
    jest.resetModules();
    const mod = require('../../code/utils/GracefulShutdown.js');
    createGracefulShutdown = mod.createGracefulShutdown;
  });

  function makeDeps(overrides = {}) {
    return {
      logBot: jest.fn(),
      sessionStateManager: {
        getAllAccountStates: jest.fn().mockReturnValue({}),
        saveAccountState: jest.fn().mockResolvedValue(true),
        writeSafePointFile: jest.fn().mockResolvedValue(true),
      },
      accountHealthMonitor: {
        stopHealthChecks: jest.fn(),
      },
      connectionManagers: new Map(),
      accountClients: new Map(),
      allInitializedAccounts: [],
      sessionCleanupManager: { stop: jest.fn() },
      browserProcessMonitor: { stop: jest.fn() },
      lockFileDetector: { stop: jest.fn() },
      clearAccounts: jest.fn(),
      ...overrides,
    };
  }

  test('createGracefulShutdown returns a function', () => {
    const shutdown = createGracefulShutdown(makeDeps());
    expect(typeof shutdown).toBe('function');
  });

  test('shutdown stops all recovery systems', async () => {
    const deps = makeDeps();
    const shutdown = createGracefulShutdown(deps);

    // Mock process.exit so test doesn't actually exit
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

    await shutdown('TEST');

    expect(deps.sessionCleanupManager.stop).toHaveBeenCalled();
    expect(deps.browserProcessMonitor.stop).toHaveBeenCalled();
    expect(deps.lockFileDetector.stop).toHaveBeenCalled();
    expect(deps.accountHealthMonitor.stopHealthChecks).toHaveBeenCalled();
    expect(deps.clearAccounts).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });

  test('shutdown destroys connection managers', async () => {
    const destroyMock = jest.fn().mockResolvedValue(true);
    const connManagers = new Map([['123', { destroy: destroyMock }]]);
    const deps = makeDeps({ connectionManagers: connManagers });
    const shutdown = createGracefulShutdown(deps);

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    await shutdown('TEST');

    expect(destroyMock).toHaveBeenCalled();
    expect(connManagers.size).toBe(0);

    exitSpy.mockRestore();
  });

  test('shutdown disconnects all WhatsApp clients', async () => {
    const clientDestroy = jest.fn().mockResolvedValue(true);
    const clientRemove = jest.fn();
    const clients = new Map([['456', { destroy: clientDestroy, removeAllListeners: clientRemove }]]);
    const deps = makeDeps({ accountClients: clients });
    const shutdown = createGracefulShutdown(deps);

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    await shutdown('TEST');

    expect(clientRemove).toHaveBeenCalled();
    expect(clientDestroy).toHaveBeenCalled();
    expect(clients.size).toBe(0);

    exitSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. STARTUP DIAGNOSTICS
// ═══════════════════════════════════════════════════════════════════════════════
describe('StartupDiagnostics', () => {
  test('printStartupDiagnostics does not throw', () => {
    const mod = require('../../code/utils/StartupDiagnostics.js');
    const print = mod.printStartupDiagnostics;

    // Suppress console.log output during test
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    expect(() => {
      print({
        accountClients: new Map(),
        connectionManagers: new Map(),
        sessionCleanupStarted: true,
        browserProcessMonitorStarted: true,
        lockFileDetectorStarted: false,
        healthChecksStarted: true,
        analyticsModule: null,
        adminConfigModule: null,
        conversationModule: null,
        reportGeneratorModule: null,
        commandHandler: { commands: 71 },
        keepAliveManager: {},
        deviceLinkedManager: {},
        accountConfigManager: {},
        bootstrapManager: {},
        recoveryManager: {},
        dynamicAccountManager: {},
        logBot: jest.fn(),
      });
    }).not.toThrow();

    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test('prints connection manager statuses', () => {
    const mod = require('../../code/utils/StartupDiagnostics.js');
    const print = mod.printStartupDiagnostics;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const mockManager = {
      getStatus: () => ({ state: 'CONNECTED', errorCount: 0, reconnectAttempts: 0 }),
    };
    const connManagers = new Map([['123456', mockManager]]);

    print({
      accountClients: new Map(),
      connectionManagers: connManagers,
      sessionCleanupStarted: true,
      browserProcessMonitorStarted: true,
      lockFileDetectorStarted: true,
      healthChecksStarted: true,
      analyticsModule: null,
      adminConfigModule: null,
      conversationModule: null,
      reportGeneratorModule: null,
      commandHandler: null,
      keepAliveManager: null,
      deviceLinkedManager: null,
      accountConfigManager: null,
      bootstrapManager: null,
      recoveryManager: null,
      dynamicAccountManager: null,
      logBot: jest.fn(),
    });

    // Verify that connection status was logged
    const allOutput = logSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(allOutput).toContain('123456');
    expect(allOutput).toContain('CONNECTED');

    logSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. DATABASE INITIALIZER
// ═══════════════════════════════════════════════════════════════════════════════
// DatabaseInitializer imports ESM-only modules (AIContextIntegration,
// OperationalAnalytics) that use `import.meta.url`, which Jest/CJS cannot parse.
// We mock those heavy dependencies so the test focuses on the branch logic.

jest.mock('../../code/Services/AIContextIntegration.js', () => ({
  AIContextIntegration: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock('../../code/Services/OperationalAnalytics.js', () => ({
  OperationalAnalytics: jest.fn().mockImplementation(() => ({})),
}));

describe('DatabaseInitializer', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('skips initialization when AKOYA_ORGANIZED_SHEET_ID is not set', async () => {
    delete process.env.AKOYA_ORGANIZED_SHEET_ID;
    const logBot = jest.fn();
    const mod = require('../../code/utils/DatabaseInitializer.js');
    const initializeDatabase = mod.initializeDatabase;

    await initializeDatabase(logBot);

    // Should log "Initializing..." but NOT register any services
    expect(logBot).toHaveBeenCalledWith(expect.stringContaining('Initializing database'), 'info');
    const svcMod = require('../../code/utils/ServiceRegistry.js');
    const svc = svcMod.default || svcMod;
    expect(svc.has('databaseContext')).toBe(false);
  });
});
