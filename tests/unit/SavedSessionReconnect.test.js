import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import ConnectionManager from '../../src/connection/ConnectionManager.js';
import SessionCleanupManager from '../../src/sessions/SessionCleanupManager.js';
import DeviceLinkedManager from '../../src/linking/DeviceLinkedManager.js';
import LockFileDetector from '../../src/sessions/LockFileDetector.js';
import { SessionRecoveryService } from '../../src/sessions/SessionRecoveryService.js';

jest.mock('../../src/sessions/SessionManager.js', () => ({
  SessionManager: {
    resolveClientId: () => 'persisted-master-id',
    canRestoreSession: () => true,
    hasAuthenticatedSession: () => true,
    waitForAuthenticatedSession: async () => true,
  },
}));

describe('Non-destructive saved-session reconnect', () => {
  let manager;
  let client;
  let context;
  let log;

  beforeEach(() => {
    jest.useFakeTimers();
    log = jest.fn();
    client = Object.assign(new EventEmitter(), {
      authStrategy: { clientId: 'persisted-master-id' },
      initialize: jest
        .fn()
        .mockRejectedValue(new Error('Protocol error: Target closed')),
      destroy: jest.fn().mockResolvedValue(undefined),
      getState: jest.fn().mockResolvedValue('DISCONNECTED'),
    });
    context = {
      createClient: jest.fn(),
      accountClients: new Map([['+15550000001', client]]),
      allInitializedAccounts: [client],
      accountConfigManager: { getMasterPhoneNumber: () => '+15550000001', getAllAccounts: () => [] },
      setMasterRef: jest.fn(),
      sessionCleanupManager: { forceCleanSession: jest.fn() },
      lockFileDetector: { forceCleanLocks: jest.fn() },
      deviceLinkedManager: {
        updateDeviceMetadata: jest.fn(),
        recordLinkFailure: jest.fn(),
      },
    };
    manager = new ConnectionManager(
      '+15550000001',
      client,
      log,
      'wrong-legacy-id',
      context,
    );
    const deps = {
      sharedContext: context, logBot: log,
      connectionManagers: new Map([['+15550000001', manager]]),
      sessionStateManager: { getDeviceMetadata: () => ({ clientId: 'persisted-master-id' }) },
      allInitializedAccounts: context.allInitializedAccounts,
      deviceLinkedManager: context.deviceLinkedManager,
    };
    context.sessionRecovery = new SessionRecoveryService({
      getFlowDeps: () => deps, accountClients: context.accountClients,
      createClient: context.createClient,
      setupClientFlow: (next, phone, id, options) => {
        const flow = options.connectionManager;
        flow.isRestore = true;
        next.once('ready', () => flow.setState('CONNECTED'));
        flow.initializationPromise = flow.initialize();
        return flow;
      },
    });
  });

  afterEach(() => {
    clearTimeout(manager.reconnectTimer);
    clearTimeout(manager.errorResetTimer);
    jest.useRealTimers();
  });

  test('protocol errors schedule one reconnect and expose the original error without deleting data or counting linking attempts', async () => {
    expect(await manager.initialize()).toBe(false);
    expect(manager.botId).toBe('persisted-master-id');
    expect(manager.connectionFailureReason).toBe(
      'Protocol error: Target closed',
    );
    expect(manager.reconnectTimer).not.toBeNull();
    expect(manager.state).toBe('ERROR');
    expect(
      context.sessionCleanupManager.forceCleanSession,
    ).not.toHaveBeenCalled();
    expect(context.lockFileDetector.forceCleanLocks).not.toHaveBeenCalled();
    expect(
      context.deviceLinkedManager.recordLinkFailure,
    ).not.toHaveBeenCalled();
    expect(
      context.deviceLinkedManager.updateDeviceMetadata,
    ).toHaveBeenCalledWith(
      '+15550000001',
      expect.objectContaining({
        status: 'restore_failed',
        lastError: 'Protocol error: Target closed',
      }),
    );
    expect(jest.getTimerCount()).toBe(1);
  });

  test('reconnect replaces only the affected client using exactly the same LocalAuth profile', async () => {
    const next = Object.assign(new EventEmitter(), {
      authStrategy: { clientId: 'persisted-master-id' },
      initialize: jest.fn().mockImplementation(async () => { next.emit('ready'); }),
    });
    context.createClient.mockResolvedValue(next);
    manager.bindClientFlow = jest.fn();
    manager.scheduleReconnect();
    await jest.advanceTimersByTimeAsync(6001);
    expect(client.destroy).toHaveBeenCalledTimes(1);
    expect(context.createClient).toHaveBeenCalledWith('persisted-master-id');
    expect(context.accountClients.get('+15550000001')).toBe(next);
    expect(context.setMasterRef).toHaveBeenCalledWith(next);
    expect(next.initialize).toHaveBeenCalledTimes(1);
    expect(context.allInitializedAccounts).not.toContain(client);
    expect(context.lockFileDetector.forceCleanLocks).not.toHaveBeenCalled();
  });

  test('failed client closure prevents opening a duplicate browser and reports why', async () => {
    client.destroy.mockRejectedValue(new Error('Browser closure failed'));
    manager.scheduleReconnect();
    await jest.advanceTimersByTimeAsync(6001);
    expect(context.createClient).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('Browser closure failed'),
      'error',
    );
    expect(manager.reconnectTimer).not.toBeNull();
    expect(manager.connectionFailureReason).toContain('Browser closure failed');
  });

  test.each(['CONNECTED', 'SUSPENDED', 'AUTH_REQUIRED'])('a queued reconnect does not reopen a client now in %s', async state => {
    manager.scheduleReconnect();
    manager.state = state;
    manager.authRequired = state === 'AUTH_REQUIRED';
    await jest.advanceTimersByTimeAsync(6001);
    expect(client.destroy).not.toHaveBeenCalled();
    expect(context.createClient).not.toHaveBeenCalled();
  });

  test('initialization without ready does not reset the retry budget', async () => {
    client.initialize.mockResolvedValue(undefined);
    manager.reconnectAttempts = 4;
    const result = manager.initialize();
    await jest.advanceTimersByTimeAsync(300000);
    expect(await result).toBe(false);
    expect(manager.connectionFailureReason).toContain('readiness timeout');
    expect(manager.reconnectAttempts).toBe(5);
    expect(manager.state).not.toBe('CONNECTED');
  });

  test('reconnect exposes its in-flight ownership until the old browser closes', async () => {
    let finishClose;
    client.destroy.mockImplementation(() => new Promise(resolve => { finishClose = resolve; }));
    manager.scheduleReconnect();
    await jest.advanceTimersByTimeAsync(6001);
    expect(manager.isReconnecting).toBe(true);
    manager.scheduleReconnect();
    expect(manager.reconnectTimer).toBeNull();
    manager.isDestroyed = true;
    finishClose();
    await jest.advanceTimersByTimeAsync(0);
    expect(context.createClient).not.toHaveBeenCalled();
    expect(manager.isReconnecting).toBe(false);
  });

  test('a destroyed manager cannot restart its client', async () => {
    await Promise.all([manager.destroy(), manager.destroy()]);
    expect(client.destroy).toHaveBeenCalledTimes(1);
    manager.scheduleReconnect();
    expect(await manager.initialize()).toBe(false);
    expect(client.initialize).not.toHaveBeenCalled();
    expect(context.createClient).not.toHaveBeenCalled();
  });

  test('restoration finishes promptly when WhatsApp requests authentication', async () => {
    context.deviceLinkedManager.startLinkingAttempt = jest.fn();
    context.QRCodeDisplay = { display: jest.fn() };
    manager.isRestore = true;
    client.initialize.mockResolvedValue(undefined);
    const result = manager.initialize();
    client.emit('qr', 'not-real-authentication-data');
    expect(await result).toBe(false);
    expect(manager.authRequired).toBe(true);
    expect(manager.state).toBe('AUTH_REQUIRED');
    expect(context.QRCodeDisplay.display).not.toHaveBeenCalled();
    expect(context.deviceLinkedManager.startLinkingAttempt).not.toHaveBeenCalled();
  });

  test('authentication-required state cannot start automatic reconnect or initialize', async () => {
    manager.authRequired = true;
    manager.scheduleReconnect();
    expect(manager.reconnectTimer).toBeNull();
    expect(await manager.initialize()).toBe(false);
    expect(client.initialize).not.toHaveBeenCalled();
  });

  test('legacy protocol-recovery entry point preserves sessions and schedules instead of racing initialization', async () => {
    await manager.executeProtocolErrorRecovery();
    expect(client.initialize).not.toHaveBeenCalled();
    expect(
      context.sessionCleanupManager.forceCleanSession,
    ).not.toHaveBeenCalled();
    expect(manager.reconnectTimer).not.toBeNull();
    expect(jest.getTimerCount()).toBe(1);
  });

  test('browser fallback targets only the process object owned by this client and does nothing without one', () => {
    const kill = jest.fn().mockReturnValue(true);
    client.pupBrowser = {
      process: () => ({ exitCode: null, killed: false, kill }),
    };
    manager._killBrowserProcessesAggressive();
    expect(kill).toHaveBeenCalledTimes(1);
    client.pupBrowser = null;
    manager._killBrowserProcessesAggressive();
    expect(kill).toHaveBeenCalledTimes(1);
  });

  test('routine disconnect retains linked history instead of claiming the device was unlinked', () => {
    const devices = new DeviceLinkedManager(log);
    devices.addDevice('+15550000001');
    devices.markDeviceLinked('+15550000001');
    devices.markDeviceUnlinked('+15550000001', 'browser disconnected');
    expect(devices.getDevice('+15550000001')).toMatchObject({
      status: 'offline',
      isOnline: false,
      linkedAt: expect.any(String),
    });
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('saved session retained'),
      'warn',
    );
    devices.markDeviceUnlinked('+15550000001', 'LOGOUT');
    expect(devices.getDevice('+15550000001').status).toBe('logged_out');
  });
});

test('periodic cleanup never deletes an old LocalAuth profile or its lock files', () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'linda-session-preserve-'),
  );
  const profile = path.join(directory, 'session-persisted-master');
  fs.mkdirSync(path.join(profile, 'Default'), { recursive: true });
  const credentials = path.join(profile, 'Default', 'test-auth-placeholder');
  const lock = path.join(profile, 'SingletonLock');
  fs.writeFileSync(credentials, 'placeholder-not-real-credentials');
  fs.writeFileSync(lock, 'owned-browser');
  const old = new Date(Date.now() - 30 * 24 * 3600000);
  fs.utimesSync(profile, old, old);
  const cleanup = new SessionCleanupManager(jest.fn());
  cleanup.sessionDir = directory;
  try {
    cleanup.performCleanup();
    const detector = new LockFileDetector(jest.fn());
    detector.sessionDir = directory;
    fs.utimesSync(lock, old, old);
    detector.performCheck();
    expect(fs.readFileSync(credentials, 'utf8')).toBe(
      'placeholder-not-real-credentials',
    );
    expect(fs.readFileSync(lock, 'utf8')).toBe('owned-browser');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
