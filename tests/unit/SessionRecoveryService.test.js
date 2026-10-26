import { EventEmitter } from 'node:events';
import { getSessionRecovery } from '../../code/utils/SessionRecoveryService.js';
import { SessionManager } from '../../code/utils/SessionManager.js';
import { setupClientFlow } from '../../code/WhatsAppBot/ClientFlowSetup.js';
import AutoSessionRestoreManager from '../../code/utils/AutoSessionRestoreManager.js';

jest.mock('../../code/utils/SessionManager.js', () => ({
  SessionManager: {
    resolveClientId: jest.fn((phone, metadata) => metadata.clientId || 'configured-profile'),
    canRestoreSession: jest.fn(() => true),
    hasAuthenticatedSession: jest.fn(() => true),
    waitForAuthenticatedSession: jest.fn(async () => true),
  },
}));

const phone = '+15550000001';
const makeClient = () => Object.assign(new EventEmitter(), {
  options: {},
  authStrategy: { clientId: 'saved-master' },
  initialize: jest.fn().mockResolvedValue(undefined),
  getState: jest.fn().mockResolvedValue('DISCONNECTED'),
  destroy: jest.fn().mockResolvedValue(undefined),
});

describe('Shared session recovery lifecycle (real flow and connection manager)', () => {
  let deps;
  let accounts;
  let createClient;
  let recovery;
  let client;
  let metadata;

  beforeEach(() => {
    jest.useFakeTimers();
    SessionManager.canRestoreSession.mockReturnValue(true);
    metadata = { clientId: 'saved-master', deviceLinked: true, status: 'offline' };
    accounts = new Map();
    client = makeClient();
    createClient = jest.fn().mockResolvedValue(client);
    deps = {
      logBot: jest.fn(),
      connectionManagers: new Map(),
      allInitializedAccounts: [],
      sharedContext: {
        accountConfigManager: {
          getAllAccounts: () => [{ phoneNumber: phone, id: 'configured-profile', role: 'primary' }],
          getMasterPhoneNumber: () => phone,
        },
        setMasterRef: jest.fn(),
      },
      sessionStateManager: {
        state: { accounts: { [phone]: metadata } },
        getDeviceMetadata: () => metadata,
        saveDeviceMetadata: jest.fn(async (number, value) => { metadata = { ...metadata, ...value }; return true; }),
        setMasterPhoneNumber: jest.fn().mockResolvedValue(true),
      },
      deviceLinkedManager: {
        getDevice: () => ({}),
        updateDeviceMetadata: jest.fn(),
        markDeviceLinked: jest.fn(),
        markDeviceUnlinked: jest.fn(),
        startLinkingAttempt: jest.fn(),
      },
      accountHealthMonitor: { registerAccount: jest.fn() },
      setupMessageListeners: jest.fn(),
      updateDeviceStatus: jest.fn(),
      setIsInitializing: jest.fn(),
      terminalHealthDashboard: {
        selectLinkingMethod: jest.fn(),
        setLinkingChallenge: jest.fn(),
        requestDashboardRefresh: jest.fn(),
      },
      enhancedQRCodeDisplayV2: { display: jest.fn() },
    };
    recovery = getSessionRecovery({
      getFlowDeps: () => deps, setupClientFlow, createClient, accountClients: accounts,
    });
  });

  afterEach(async () => {
    recovery.stop();
    for (const manager of deps.connectionManagers.values()) await manager.destroy();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  const flush = () => jest.advanceTimersByTimeAsync(0);

  test('all entry points share one service and concurrent requests share one account operation', async () => {
    expect(getSessionRecovery({ getFlowDeps: () => deps })).toBe(recovery);
    const first = recovery.recover(phone);
    const second = recovery.recover(phone.slice(1), { source: 'startup' });
    expect(second).toBe(first);
    await flush();
    expect(createClient).toHaveBeenCalledTimes(1);
    client.emit('ready');
    expect(await first).toBe(true);
    expect(recovery.pending.size).toBe(0);
    expect(deps.sharedContext.setMasterRef).toHaveBeenCalledWith(client);
  });

  test('launch completion and authentication are not reported as successful recovery before ready', async () => {
    let finished = false;
    const result = recovery.recover(phone).then(value => { finished = true; return value; });
    await flush();
    expect(client.initialize).toHaveBeenCalledTimes(1);
    expect(finished).toBe(false);
    client.emit('authenticated');
    await flush();
    expect(finished).toBe(false);
    expect(deps.deviceLinkedManager.markDeviceLinked).not.toHaveBeenCalled();
    client.emit('ready');
    expect(await result).toBe(true);
    expect(createClient).toHaveBeenCalledWith('saved-master');
    expect(deps.connectionManagers.get(phone).state).toBe('CONNECTED');
  });

  test('startup and manual recovery join the same operation instead of launching two clients', async () => {
    const startup = new AutoSessionRestoreManager(deps.logBot);
    const result = startup.autoRestoreAllSessions(
      deps.sessionStateManager, accounts, deps.deviceLinkedManager,
      setupClientFlow, () => deps, createClient,
    );
    const manual = recovery.recover(phone);
    await flush();
    client.emit('ready');
    expect(await manual).toBe(true);
    expect((await result).restored).toBe(1);
    expect(createClient).toHaveBeenCalledTimes(1);
  });

  test('a disconnected ready account reconnects through the same coordinator and lifecycle', async () => {
    const first = recovery.recover(phone);
    await flush();
    client.emit('ready');
    await first;
    const manager = deps.connectionManagers.get(phone);
    const next = makeClient();
    next.initialize.mockImplementation(async () => { next.emit('ready'); });
    createClient.mockResolvedValue(next);
    client.emit('disconnected', 'browser disconnected');
    await flush();
    expect(manager.state).toBe('DISCONNECTED');
    await jest.advanceTimersByTimeAsync(6001);
    expect(client.destroy).toHaveBeenCalledTimes(1);
    expect(accounts.get(phone)).toBe(next);
    expect(deps.connectionManagers.get(phone)).toBe(manager);
    expect(manager.state).toBe('CONNECTED');
    expect(manager.reconnectAttempts).toBe(0);
    expect(next.initialize).toHaveBeenCalledTimes(1);
    expect(deps.allInitializedAccounts).toEqual([next]);
  });

  test('local disconnect keeps authentication metadata and blocks automatic but not explicit recovery', async () => {
    const result = recovery.recover(phone);
    await flush();
    client.emit('ready');
    await result;
    const disconnected = recovery.disconnect(phone);
    await expect(recovery.recover(phone)).rejects.toThrow('Local disconnect in progress');
    await disconnected;
    expect(metadata.status).toBe('paused');
    expect(metadata.clientId).toBe('saved-master');
    expect(accounts.has(phone)).toBe(false);
    expect(client.destroy).toHaveBeenCalledTimes(1);
    expect(deps.connectionManagers.has(phone)).toBe(false);
    await expect(recovery.recover(phone, { source: 'automatic' })).rejects.toThrow('Automatic recovery is paused');
    const next = makeClient();
    next.initialize.mockImplementation(async () => { next.emit('ready'); });
    createClient.mockResolvedValue(next);
    expect(await recovery.recover(phone)).toBe(true);
    expect(metadata.status).toBe('linked');
  });

  test('local disconnect never clears confirmed authentication-required metadata', async () => {
    metadata.status = 'auth_failed';
    accounts.set(phone, client);
    await recovery.disconnect(phone);
    expect(metadata.status).toBe('auth_failed');
    await expect(recovery.recover(phone)).rejects.toThrow('auth_failed');
  });

  test('saved-only accounts normalize phone input to the same recovery operation', async () => {
    deps.sharedContext.accountConfigManager.getAllAccounts = () => [];
    const first = recovery.recover(phone);
    expect(recovery.recover(phone.slice(1))).toBe(first);
    await flush();
    client.emit('ready');
    await first;
  });

  test('startup retries a previous authentication-required profile but QR stops without device linking', async () => {
    metadata.status = 'auth_required';
    const result = recovery.recover(phone, { source: 'startup' });
    const rejected = expect(result).rejects.toThrow('WhatsApp requested fresh authentication');
    await flush();
    client.emit('qr', 'fake-qr');
    await rejected;
    expect(deps.enhancedQRCodeDisplayV2.display).not.toHaveBeenCalled();
    expect(deps.terminalHealthDashboard.selectLinkingMethod).not.toHaveBeenCalled();
    expect(deps.deviceLinkedManager.startLinkingAttempt).not.toHaveBeenCalled();
    expect(deps.connectionManagers.get(phone).reconnectTimer).toBeNull();
  });

  test('automatic recovery respects authentication-required without opening a browser', async () => {
    metadata.status = 'auth_required';
    await expect(recovery.recover(phone, { source: 'automatic' })).rejects.toThrow('Automatic recovery is paused');
    expect(createClient).not.toHaveBeenCalled();
  });

  test.each(['logged_out', 'auth_failed'])('all recovery sources respect confirmed %s', async status => {
    metadata.status = status;
    for (const source of ['startup', 'manual', 'automatic']) {
      await expect(recovery.recover(phone, { source })).rejects.toThrow(status);
    }
    expect(createClient).not.toHaveBeenCalled();
  });

  test('offline replacement closes the old browser before creating the new one and retains profile ID', async () => {
    const old = makeClient();
    let close;
    old.destroy.mockImplementation(() => new Promise(resolve => { close = resolve; }));
    accounts.set(phone, old);
    const result = recovery.recover(phone);
    await flush();
    expect(createClient).not.toHaveBeenCalled();
    await expect(recovery.stopAccount(phone)).rejects.toThrow('already in progress');
    close();
    await flush();
    expect(old.destroy).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith('saved-master');
    client.emit('ready');
    await result;
  });

  test('an already connected account overrides stale logout metadata without reopening it', async () => {
    metadata.status = 'logged_out';
    client.getState.mockResolvedValue('CONNECTED');
    accounts.set(phone, client);
    expect(await recovery.recover(phone)).toBe(true);
    expect(client.destroy).not.toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });

  test('missing artifacts identify the selected profile without guessing another account', async () => {
    SessionManager.canRestoreSession.mockReturnValue(false);
    await expect(recovery.recover(phone)).rejects.toThrow('session-saved-master');
    expect(createClient).not.toHaveBeenCalled();
  });

  test('another account cannot reuse a profile already owned by a client', async () => {
    accounts.set('+15550000002', makeClient());
    await expect(recovery.recover(phone)).rejects.toThrow('already owned by +15550000002');
    expect(createClient).not.toHaveBeenCalled();
  });

  test('pending client construction also reserves its profile against other accounts', async () => {
    let finish;
    createClient.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const first = recovery.recover(phone);
    await flush();
    await expect(recovery.recover('+15550000002')).rejects.toThrow('already owned by');
    finish(client);
    await flush();
    client.emit('ready');
    await first;
  });

  test('an unresolved browser launch is not replaced after the readiness deadline', async () => {
    client.initialize.mockImplementation(() => new Promise(() => {}));
    const first = recovery.recover(phone);
    const firstRejected = expect(first).rejects.toThrow('readiness timeout');
    await jest.advanceTimersByTimeAsync(300000);
    await firstRejected;
    await expect(recovery.recover(phone)).rejects.toThrow('Previous browser initialization is still running');
    expect(createClient).toHaveBeenCalledTimes(1);
  });

  test('failure persistence cannot hide the original reconnect error', async () => {
    createClient.mockRejectedValue(new Error('Browser launch failed'));
    deps.sessionStateManager.saveDeviceMetadata.mockRejectedValue(new Error('Disk unavailable'));
    await expect(recovery.recover(phone)).rejects.toThrow('Browser launch failed');
    expect(deps.logBot).toHaveBeenCalledWith(expect.stringContaining('Disk unavailable'), 'error');
  });

  test('late ready after readiness timeout cannot mark the account active', async () => {
    const result = recovery.recover(phone);
    const rejected = expect(result).rejects.toThrow('readiness timeout');
    await jest.advanceTimersByTimeAsync(300000);
    await rejected;
    client.emit('ready');
    expect(deps.deviceLinkedManager.markDeviceLinked).not.toHaveBeenCalled();
    expect(deps.connectionManagers.get(phone).state).not.toBe('CONNECTED');
  });

  test('shutdown during client construction closes the constructed client without initializing it', async () => {
    let finish;
    createClient.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const result = recovery.recover(phone);
    const rejected = expect(result).rejects.toThrow('shutdown');
    await flush();
    recovery.stop();
    finish(client);
    await rejected;
    expect(client.destroy).toHaveBeenCalledTimes(1);
    expect(client.initialize).not.toHaveBeenCalled();
    expect(accounts.size).toBe(0);
  });

  test('shutdown cancels a readiness wait and blocks future recovery', async () => {
    const result = recovery.recover(phone);
    const rejected = expect(result).rejects.toThrow('cancelled');
    await flush();
    recovery.stop();
    await deps.connectionManagers.get(phone).destroy();
    await rejected;
    await expect(recovery.recover(phone)).rejects.toThrow('shutdown');
  });
});
