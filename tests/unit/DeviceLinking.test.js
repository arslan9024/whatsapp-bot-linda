import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import readline from 'node:readline';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setupClientFlow } from '../../src/whatsapp/ClientFlowSetup.js';
import { TerminalHealthDashboard } from '../../src/terminal/TerminalHealthDashboard.js';
import { ManualLinkingHandler } from '../../src/linking/ManualLinkingHandler.js';
import { CreatingNewWhatsAppClient } from '../../src/whatsapp/CreatingNewWhatsAppClient.js';
import AutoSessionRestoreManager from '../../src/sessions/AutoSessionRestoreManager.js';
import { SessionManager } from '../../src/sessions/SessionManager.js';

jest.mock('../../src/whatsapp/CreatingNewWhatsAppClient.js', () => ({
  CreatingNewWhatsAppClient: jest.fn(),
}));

jest.mock('../../src/connection/browserCleanup.js', () => ({
  sleep: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/sessions/SessionManager.js', () => ({
  SessionManager: {
    canRestoreSession: jest.fn().mockReturnValue(true),
    hasSessionArtifacts: jest.fn().mockReturnValue(true),
    resolveClientId: jest.fn((phone, metadata, config) => metadata?.clientId || config?.id || phone.replace(/^\+/, '')),
  },
}));

jest.mock('../../src/accounts/AccountHealthMonitor.js', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../../src/connection/ConnectionManager.js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(true),
    clearQRTimer: jest.fn(),
    handleQR: jest.fn().mockReturnValue(true),
    setState: jest.fn(),
    stopHealthCheck: jest.fn(),
    stopKeepAlive: jest.fn(),
  })),
}));

const phone = '+15551234567';

function makeFlow(method = 'code', opts = {}, accountPhone = phone) {
  const client = new EventEmitter();
  client.options = {};
  client.pupPage = {};
  client.requestPairingCode = jest.fn().mockImplementation(async () => {
    client.emit('code', 'TEST-CODE');
  });
  const deps = {
    logBot: jest.fn(),
    connectionManagers: new Map(),
    sharedContext: {},
    terminalHealthDashboard: {
      selectLinkingMethod: jest.fn().mockImplementation(() =>
        method instanceof Error ? Promise.reject(method) : Promise.resolve(method)
      ),
    },
    enhancedQRCodeDisplayV2: { display: jest.fn().mockResolvedValue(undefined) },
    deviceLinkedManager: {
      startLinkingAttempt: jest.fn(),
      markDeviceLinked: jest.fn(),
      markDeviceUnlinked: jest.fn(),
      updateDeviceMetadata: jest.fn(),
    },
    updateDeviceStatus: jest.fn(),
    sessionStateManager: {
      getDeviceMetadata: jest.fn().mockReturnValue({}),
      saveDeviceMetadata: jest.fn().mockResolvedValue(true),
    },
  };
  const manager = setupClientFlow(client, accountPhone, 'master', opts, deps);
  return { client, deps, manager };
}

describe('Shared QR and pairing-code linking flow', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  test('configures country-code digits before initializing exactly once', async () => {
    const { client, deps, manager } = makeFlow();
    expect(manager.initialize).not.toHaveBeenCalled();
    expect(await manager.initializationPromise).toBe(true);
    expect(deps.terminalHealthDashboard.selectLinkingMethod).toHaveBeenCalledWith(phone);
    expect(client.options.pairWithPhoneNumber).toEqual({
      phoneNumber: '15551234567',
      showNotification: true,
      intervalMs: 180000,
    });
    expect(manager.initialize).toHaveBeenCalledTimes(1);
    expect(client.requestPairingCode).not.toHaveBeenCalled();
  });

  test.each(['code', 'qr'])('explicit %s starts without a choice prompt', async method => {
    const { client, deps, manager } = makeFlow(new Error('Must not prompt'), { linkingMethod: method });
    expect(await manager.initializationPromise).toBe(true);
    expect(deps.terminalHealthDashboard.selectLinkingMethod).not.toHaveBeenCalled();
    expect(client.options.pairWithPhoneNumber.phoneNumber).toBe(method === 'code' ? '15551234567' : '');
    expect(manager.initialize).toHaveBeenCalledTimes(1);
  });

  test('prints refreshed codes locally without logging the code or displaying QR', async () => {
    const { client, deps, manager } = makeFlow();
    await manager.initializationPromise;
    client.emit('code', 'TEST-CODE');
    client.emit('code', 'NEXT-CODE');
    await client.listeners('qr')[0]('qr-data');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('TEST-CODE'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('NEXT-CODE'));
    expect(deps.enhancedQRCodeDisplayV2.display).not.toHaveBeenCalled();
    expect(JSON.stringify(deps.logBot.mock.calls)).not.toContain('TEST-CODE');
    expect(JSON.stringify(deps.logBot.mock.calls)).not.toContain('NEXT-CODE');
  });

  test('preserves QR display when QR is selected', async () => {
    const { client, deps, manager } = makeFlow('qr');
    await manager.initializationPromise;
    await client.listeners('qr')[0]('qr-data');
    expect(client.options.pairWithPhoneNumber.phoneNumber).toBe('');
    expect(deps.enhancedQRCodeDisplayV2.display).toHaveBeenCalledWith(
      'qr-data', expect.objectContaining({ masterAccount: phone })
    );
    expect(client.requestPairingCode).not.toHaveBeenCalled();
  });

  test('valid saved sessions restore without a prompt', async () => {
    const { deps, manager } = makeFlow('code', { isRestore: true });
    expect(await manager.initializationPromise).toBe(true);
    expect(deps.terminalHealthDashboard.selectLinkingMethod).not.toHaveBeenCalled();
    expect(manager.initialize).toHaveBeenCalledTimes(1);
  });

  test('requesting a code cannot silently convert session recovery into device linking', async () => {
    const { client, manager } = makeFlow('code', { isRestore: true });
    await manager.initializationPromise;
    await expect(manager.requestPairingCode()).rejects.toThrow('cannot start device linking');
    expect(client.requestPairingCode).not.toHaveBeenCalled();
  });

  test('expired saved sessions require an explicit linking action without requesting a code', async () => {
    const { client, deps, manager } = makeFlow('code', { isRestore: true });
    await manager.initializationPromise;
    await client.listeners('qr')[0]('expired-session-qr');
    expect(client.requestPairingCode).not.toHaveBeenCalled();
    expect(deps.terminalHealthDashboard.selectLinkingMethod).not.toHaveBeenCalled();
    expect(manager.authRequired).toBe(true);
    expect(manager.setState).toHaveBeenCalledWith('AUTH_REQUIRED');
    expect(deps.enhancedQRCodeDisplayV2.display).not.toHaveBeenCalled();
  });

  test('restoration never displays a new QR or counts a device-link attempt', async () => {
    const { client, deps, manager } = makeFlow('qr', { isRestore: true });
    await manager.initializationPromise;
    await client.listeners('qr')[0]('expired-session-qr');
    expect(deps.enhancedQRCodeDisplayV2.display).not.toHaveBeenCalled();
    expect(deps.deviceLinkedManager.startLinkingAttempt).not.toHaveBeenCalled();
    expect(client.requestPairingCode).not.toHaveBeenCalled();
  });

  test('disconnect immediately clears live connection state before persistence finishes', async () => {
    const { client, deps, manager } = makeFlow('qr', { isRestore: true });
    await manager.initializationPromise;
    manager.setState.mockImplementation(state => { manager.state = state; });
    manager.state = 'CONNECTED';
    manager.stopHealthCheck = jest.fn();
    manager.stopKeepAlive = jest.fn();
    manager.scheduleReconnect = jest.fn();
    let finishSave;
    deps.sessionStateManager.saveDeviceMetadata.mockImplementation(() =>
      new Promise(resolve => { finishSave = resolve; }));
    const disconnected = client.listeners('disconnected')[0]('browser disconnected');
    expect(manager.state).toBe('DISCONNECTED');
    await Promise.resolve();
    finishSave(true);
    await disconnected;
    expect(manager.scheduleReconnect).toHaveBeenCalledTimes(1);
  });

  test('a subsequent disconnect cannot clear confirmed authentication failure', async () => {
    const { client, deps, manager } = makeFlow('qr', { isRestore: true });
    await manager.initializationPromise;
    manager.stopHealthCheck = jest.fn();
    manager.stopKeepAlive = jest.fn();
    manager.scheduleReconnect = jest.fn();
    await client.listeners('auth_failure')[0]('Credentials revoked');
    await client.listeners('disconnected')[0]('browser disconnected');
    expect(manager.authRequired).toBe(true);
    expect(manager.scheduleReconnect).not.toHaveBeenCalled();
    expect(deps.sessionStateManager.saveDeviceMetadata).toHaveBeenLastCalledWith(
      phone, expect.objectContaining({ status: 'auth_failed', isActive: false }),
    );
  });

  test('switches an active QR flow to pairing code and stops QR timers', async () => {
    const { client, deps, manager } = makeFlow('qr');
    await manager.initializationPromise;
    await manager.requestPairingCode();
    await client.listeners('qr')[0]('stale-qr');
    expect(client.requestPairingCode).toHaveBeenCalledTimes(1);
    expect(manager.clearQRTimer).toHaveBeenCalled();
    expect(deps.enhancedQRCodeDisplayV2.display).not.toHaveBeenCalled();
  });

  test('records code authentication and ignores late codes after authentication', async () => {
    const { client, deps, manager } = makeFlow();
    await manager.initializationPromise;
    await client.listeners('authenticated')[0]();
    client.emit('code', 'STALE-CODE');
    expect(deps.updateDeviceStatus).toHaveBeenCalledWith(
      phone, expect.objectContaining({ authMethod: 'code', deviceLinked: true })
    );
    expect(deps.deviceLinkedManager.markDeviceLinked).not.toHaveBeenCalled();
    expect(deps.deviceLinkedManager.updateDeviceMetadata).toHaveBeenCalledWith(
      phone, { status: 'authenticated', isOnline: false }
    );
    expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('STALE-CODE'));
    await expect(manager.requestPairingCode()).rejects.toThrow('already linked');
  });

  test('invalid phone fails explicitly before initialization', async () => {
    const { manager, deps } = makeFlow('code', {}, 'master-account');
    expect(await manager.initializationPromise).toBe(false);
    expect(manager.initialize).not.toHaveBeenCalled();
    expect(deps.logBot).toHaveBeenCalledWith(expect.stringContaining('country code'), 'error');
  });

  test('cancelled choice does not initialize a client', async () => {
    const { manager, deps } = makeFlow(new Error('Linking cancelled'));
    expect(await manager.initializationPromise).toBe(false);
    expect(manager.initialize).not.toHaveBeenCalled();
    expect(deps.logBot).toHaveBeenCalledWith(expect.stringContaining('Linking cancelled'), 'error');
  });

  test('reports a pairing request failure without falsely showing a code', async () => {
    const { client, deps, manager } = makeFlow('qr');
    client.requestPairingCode.mockRejectedValue(new Error('Pairing service unavailable'));
    await manager.initializationPromise;
    await expect(manager.requestPairingCode()).rejects.toThrow('Pairing service unavailable');
    expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('TEST-CODE'));
    expect(client.options.pairWithPhoneNumber.phoneNumber).toBe('');
  });

  test('reconnected clients reuse the manager but never silently switch recovery to device linking', async () => {
    const { deps, manager } = makeFlow();
    await manager.initializationPromise;
    const newClient = new EventEmitter();
    newClient.options = { pairWithPhoneNumber: { phoneNumber: '' } };
    newClient.pupPage = {};
    newClient.requestPairingCode = jest.fn().mockResolvedValue('TEST-CODE');
    manager.bindClientFlow(newClient);
    await newClient.listeners('qr')[0]('qr-data');
    expect(newClient.requestPairingCode).not.toHaveBeenCalled();
    expect(manager.authRequired).toBe(true);
    expect(manager.initialize).toHaveBeenCalledTimes(1);
    expect(deps.connectionManagers.get(phone)).toBe(manager);
  });

  test.each([undefined, 'code', 'qr'])('manual linking uses the configured master and explicit method %s', async linkingMethod => {
    const { client, deps, manager } = makeFlow();
    await manager.initializationPromise;
    deps.terminalHealthDashboard.selectLinkingMethod.mockClear();
    client.removeAllListeners();
    deps.connectionManagers.clear();
    deps.terminalHealthDashboard.setMasterPhoneNumber = jest.fn();
    CreatingNewWhatsAppClient.mockResolvedValue(client);
    const bootstrapManager = {
      getAccountConfigs: () => [
        { id: 'secondary', phoneNumber: '+15557654321' },
        { id: 'configured-master', phoneNumber: phone, displayName: 'Master', role: 'primary' },
      ],
      recordInitialization: jest.fn().mockResolvedValue(undefined),
    };
    const handler = new ManualLinkingHandler({
      ...deps,
      bootstrapManager,
      accountConfigManager: { getMasterPhoneNumber: () => phone },
      accountClients: new Map(),
      sharedContext: { accountClients: new Map(), setMasterRef: jest.fn() },
      clientHealthMonitor: { registerClient: jest.fn() },
      createDeviceStatusFile: jest.fn(),
      deviceLinkedManager: null,
      getFlowDeps: () => deps,
    });
    expect(await handler.initiateMasterAccountLinking(linkingMethod)).toBe(true);
    expect(CreatingNewWhatsAppClient).toHaveBeenCalledWith('configured-master');
    expect(deps.connectionManagers.get(phone).initialize).toHaveBeenCalledTimes(1);
    if (linkingMethod) {
      expect(deps.terminalHealthDashboard.selectLinkingMethod).not.toHaveBeenCalled();
      expect(client.options.pairWithPhoneNumber.phoneNumber).toBe(linkingMethod === 'code' ? '15551234567' : '');
    }
    expect(handler.isLinking).toBe(false);
  });

  test('startup restore uses the shared initialization once, not a second direct initialize', async () => {
    const { client, deps, manager } = makeFlow();
    await manager.initializationPromise;
    client.removeAllListeners();
    client.initialize = jest.fn();
    deps.terminalHealthDashboard.selectLinkingMethod.mockClear();
    SessionManager.canRestoreSession.mockReturnValue(true);
    const restore = new AutoSessionRestoreManager(deps.logBot);
    const result = await restore.autoRestoreAllSessions(
      { state: { accounts: { [phone]: { displayName: 'Master' } } } },
      new Map(),
      { markDeviceLinked: jest.fn(), recordLinkFailure: jest.fn() },
      setupClientFlow,
      () => deps,
      jest.fn().mockResolvedValue(client)
    );
    expect(result.restored).toBe(1);
    expect(deps.connectionManagers.get(phone).initialize).toHaveBeenCalledTimes(1);
    expect(client.initialize).not.toHaveBeenCalled();
    expect(deps.terminalHealthDashboard.selectLinkingMethod).not.toHaveBeenCalled();
  });

  test.each(['linked', 'offline', 'restore_failed', 'auth_required'])('restart automatically retries the saved profile after %s without linking', async status => {
    const { client, deps, manager } = makeFlow();
    await manager.initializationPromise;
    client.removeAllListeners();
    deps.terminalHealthDashboard.selectLinkingMethod.mockClear();
    SessionManager.canRestoreSession.mockReturnValue(true);
    const createClient = jest.fn().mockResolvedValue(client);
    const flowSetup = jest.fn(setupClientFlow);
    const devices = { updateDeviceMetadata: jest.fn(), startLinkingAttempt: jest.fn() };
    const restore = new AutoSessionRestoreManager(deps.logBot);
    const result = await restore.autoRestoreAllSessions(
      { state: { accounts: { [phone]: { status, clientId: 'saved-master', deviceLinked: true } } } },
      new Map(), devices, flowSetup, () => deps, createClient,
    );
    expect(result.restored).toBe(1);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith('saved-master');
    expect(flowSetup).toHaveBeenCalledWith(client, phone, 'saved-master',
      expect.objectContaining({ isRestore: true }), expect.objectContaining({ sharedContext: deps.sharedContext }));
    expect(devices.startLinkingAttempt).not.toHaveBeenCalled();
    expect(deps.terminalHealthDashboard.selectLinkingMethod).not.toHaveBeenCalled();
  });

  test.each(['logged_out', 'auth_failed'])('restart respects confirmed %s without opening a browser', async status => {
    const { deps } = makeFlow();
    const createClient = jest.fn();
    const restore = new AutoSessionRestoreManager(deps.logBot);
    const result = await restore.autoRestoreAllSessions(
      { state: { accounts: { [phone]: { status, clientId: 'saved-master' } } } },
      new Map(), {}, setupClientFlow, () => deps, createClient,
    );
    expect(result.failed).toBe(1);
    expect(createClient).not.toHaveBeenCalled();
    expect(restore.failedRestores[0].reason).toContain(status);
    expect(restore.failedRestores[0].reason).not.toContain('no session artifacts');
  });

  test.each(['CONNECTED', 'DISCONNECTED'])('startup restore never opens a duplicate browser for an existing %s client', async state => {
    const { deps } = makeFlow();
    SessionManager.canRestoreSession.mockReturnValue(true);
    const createClient = jest.fn();
    const existing = { getState: jest.fn().mockResolvedValue(state) };
    const restore = new AutoSessionRestoreManager(deps.logBot);
    const result = await restore.autoRestoreAllSessions(
      { state: { accounts: { [phone]: { displayName: 'Master' } } } },
      new Map([[phone, existing]]),
      { recordLinkFailure: jest.fn() },
      setupClientFlow, () => deps, createClient,
    );
    expect(createClient).not.toHaveBeenCalled();
    expect(result.restored).toBe(state === 'CONNECTED' ? 1 : 0);
    expect(result.failed).toBe(state === 'CONNECTED' ? 0 : 1);
  });

  test('startup discovers configured LocalAuth profiles even when session-state accounts are empty', async () => {
    const { client, deps, manager } = makeFlow();
    await manager.initializationPromise;
    client.removeAllListeners();
    const setMasterRef = jest.fn();
    deps.sharedContext = {
      accountConfigManager: {
        getAllAccounts: () => [{ id: 'original-master', phoneNumber: phone, role: 'primary' }],
        getMasterPhoneNumber: () => phone,
      },
      setMasterRef,
    };
    SessionManager.canRestoreSession.mockReturnValue(true);
    const createClient = jest.fn().mockResolvedValue(client);
    const devices = { getDevice: () => ({}), startLinkingAttempt: jest.fn(), recordLinkFailure: jest.fn() };
    const restore = new AutoSessionRestoreManager(deps.logBot);
    const result = await restore.autoRestoreAllSessions(
      { state: { accounts: {} } }, new Map(), devices, setupClientFlow, () => deps, createClient,
    );
    expect(result.restored).toBe(1);
    expect(createClient).toHaveBeenCalledWith('original-master');
    expect(setMasterRef).toHaveBeenCalledWith(client);
  });

  test('startup restore failure preserves the original connection error and never counts as a failed device link', async () => {
    const { client, deps } = makeFlow();
    const restore = new AutoSessionRestoreManager(deps.logBot);
    const devices = {
      getDevice: () => ({}), updateDeviceMetadata: jest.fn(),
      startLinkingAttempt: jest.fn(), recordLinkFailure: jest.fn(),
    };
    SessionManager.canRestoreSession.mockReturnValue(true);
    const result = await restore.autoRestoreAllSessions(
      { state: { accounts: { [phone]: { clientId: 'saved-master', deviceLinked: true } } } },
      new Map(), devices,
      () => ({ initializationPromise: Promise.resolve(false), connectionFailureReason: 'Protocol error: Target closed' }),
      () => deps, jest.fn().mockResolvedValue(client),
    );
    expect(result.failed).toBe(1);
    expect(restore.failedRestores[0].reason).toContain('Protocol error: Target closed');
    expect(devices.startLinkingAttempt).not.toHaveBeenCalled();
    expect(devices.recordLinkFailure).not.toHaveBeenCalled();
    expect(devices.updateDeviceMetadata).toHaveBeenCalledWith(phone, expect.objectContaining({ status: 'restore_failed' }));
  });

  test('manual direct linking leaves an already connected master session intact', async () => {
    const client = { getState: jest.fn().mockResolvedValue('CONNECTED') };
    const { deps } = makeFlow();
    const handler = new ManualLinkingHandler({
      ...deps,
      bootstrapManager: { getAccountConfigs: () => [{ id: 'master-id', phoneNumber: phone }] },
      accountConfigManager: { getMasterPhoneNumber: () => phone },
      accountClients: new Map([[phone, client]]),
    });
    handler.runPreLinkingHealthCheck = jest.fn().mockResolvedValue(true);
    handler.cleanupExistingConnections = jest.fn();
    CreatingNewWhatsAppClient.mockClear();
    expect(await handler.initiateMasterAccountLinking('code')).toBe(true);
    expect(handler.cleanupExistingConnections).not.toHaveBeenCalled();
    expect(CreatingNewWhatsAppClient).not.toHaveBeenCalled();
  });

  test('ready persists the actual LocalAuth profile and master selection; logout cannot remain active', async () => {
    const { client, deps, manager } = makeFlow('code');
    await manager.initializationPromise;
    client.authStrategy = { clientId: 'real-local-auth-profile' };
    // The actual ID is captured at flow creation, just as the real client factory provides it.
    client.removeAllListeners();
    Object.assign(manager, {
      setState: jest.fn(state => { manager.state = state; }),
      _trackBrowserPid: jest.fn(), startHealthCheck: jest.fn(), startKeepAlive: jest.fn(),
      stopHealthCheck: jest.fn(), stopKeepAlive: jest.fn(), scheduleReconnect: jest.fn(),
    });
    Object.assign(deps, {
      allInitializedAccounts: [],
      accountHealthMonitor: { registerAccount: jest.fn() },
      setupMessageListeners: jest.fn(), setIsInitializing: jest.fn(),
      sharedContext: {
        accountConfigManager: {
          getAllAccounts: () => [{ phoneNumber: phone, role: 'primary' }],
          getMasterPhoneNumber: () => phone,
        },
      },
    });
    deps.sessionStateManager.setMasterPhoneNumber = jest.fn().mockResolvedValue(true);
    setupClientFlow(client, phone, 'wrong-legacy-id', { initialize: false, connectionManager: manager }, deps);
    manager.reconnectTimer = setTimeout(() => {}, 60000);
    manager.errorResetTimer = setTimeout(() => {}, 60000);
    await client.listeners('ready')[0]();
    expect(manager.reconnectTimer).toBeNull();
    expect(manager.errorResetTimer).toBeNull();
    expect(manager.state).toBe('CONNECTED');
    expect(deps.deviceLinkedManager.markDeviceLinked).toHaveBeenCalledWith(phone, { authMethod: 'qr' });
    expect(deps.sessionStateManager.saveDeviceMetadata).toHaveBeenCalledWith(phone, expect.objectContaining({
      clientId: 'real-local-auth-profile', status: 'linked', isActive: true, role: 'primary',
    }));
    expect(deps.sessionStateManager.setMasterPhoneNumber).toHaveBeenCalledWith(phone);
    await client.listeners('disconnected')[0]('LOGOUT');
    expect(manager.state).toBe('DISCONNECTED');
    expect(deps.sessionStateManager.saveDeviceMetadata).toHaveBeenLastCalledWith(phone, expect.objectContaining({
      status: 'logged_out', isActive: false,
    }));
    expect(manager.scheduleReconnect).not.toHaveBeenCalled();
  });
});

describe('Terminal linking method selection', () => {
  let dashboard;
  let input;
  let ttyDescriptor;
  let savedMethod;
  let preferencesDirectory;
  let preferencesPath;

  beforeEach(() => {
    ttyDescriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
    Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: true });
    savedMethod = process.env.WHATSAPP_LINK_METHOD;
    delete process.env.WHATSAPP_LINK_METHOD;
    jest.spyOn(console, 'log').mockImplementation(() => {});
    preferencesDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'linda-linking-'));
    preferencesPath = path.join(preferencesDirectory, 'linking-preferences.json');
    dashboard = new TerminalHealthDashboard({ linkingPreferencesPath: preferencesPath });
    input = new PassThrough();
    dashboard.rl = readline.createInterface({ input, output: new PassThrough(), terminal: false });
  });

  afterEach(() => {
    dashboard.rl.close();
    input.destroy();
    if (ttyDescriptor) {
      Object.defineProperty(process.stdin, 'isTTY', ttyDescriptor);
    } else {
      delete process.stdin.isTTY;
    }
    if (savedMethod === undefined) {
      delete process.env.WHATSAPP_LINK_METHOD;
    } else {
      process.env.WHATSAPP_LINK_METHOD = savedMethod;
    }
    if (fs.existsSync(preferencesPath)) {
      fs.unlinkSync(preferencesPath);
    }
    fs.rmdirSync(preferencesDirectory);
  });

  test.each([['', 'code'], ['1', 'code'], ['code', 'code'], ['2', 'qr'], ['QR', 'qr']])(
    'choice %j selects %s', async (answer, expected) => {
      const selection = dashboard.selectLinkingMethod(phone);
      await Promise.resolve();
      input.write(`${answer}\n`);
      expect(await selection).toBe(expected);
      expect(dashboard.isSelectingLinkingMethod).toBe(false);
      expect(fs.existsSync(preferencesPath)).toBe(false);
    }
  );

  test('rejects invalid input and prompts again', async () => {
    const selection = dashboard.selectLinkingMethod(phone);
    await Promise.resolve();
    input.write('invalid\n');
    await Promise.resolve();
    input.write('2\n');
    expect(await selection).toBe('qr');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Invalid choice'));
  });

  test('cancel rejects and the next queued selection remains usable', async () => {
    const first = dashboard.selectLinkingMethod(phone);
    const second = dashboard.selectLinkingMethod('+15557654321');
    const rejected = expect(first).rejects.toThrow('cancelled by user');
    await Promise.resolve();
    input.write('cancel\n');
    await rejected;
    await Promise.resolve();
    input.write('1\n');
    expect(await second).toBe('code');
  });

  test('closing the terminal rejects instead of hanging', async () => {
    const selection = dashboard.selectLinkingMethod(phone);
    await Promise.resolve();
    dashboard.rl.close();
    await expect(selection).rejects.toThrow('terminal closed');
    expect(dashboard.isSelectingLinkingMethod).toBe(false);
  });

  test('selection timeout rejects and releases the terminal', async () => {
    jest.useFakeTimers();
    try {
      const selection = dashboard.selectLinkingMethod(phone);
      const rejected = expect(selection).rejects.toThrow('timed out');
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(120000);
      await rejected;
      expect(dashboard.isSelectingLinkingMethod).toBe(false);
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  test('forwarded stdin without a TTY still accepts a choice without saving it', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: false });
    const selection = dashboard.selectLinkingMethod(phone);
    await Promise.resolve();
    input.write('qr\n');
    expect(await selection).toBe('qr');
    expect(fs.existsSync(preferencesPath)).toBe(false);
  });

  test('each prompted attempt can choose a different method without remembering the last', async () => {
    const selection = dashboard.selectLinkingMethod(phone);
    await Promise.resolve();
    input.write('qr\n');
    expect(await selection).toBe('qr');
    const second = dashboard.selectLinkingMethod(phone);
    await Promise.resolve();
    input.write('code\n');
    expect(await second).toBe('code');
    expect(fs.existsSync(preferencesPath)).toBe(false);
  });

  test('closed stdin reports direct commands instead of silently selecting a method', async () => {
    dashboard.rl.close();
    await expect(dashboard.selectLinkingMethod(phone)).rejects.toThrow('link-code or link-qr');
  });

  test('old preferences and environment setting do not override this attempt', async () => {
    fs.writeFileSync(preferencesPath, '{"method":"qr"}', 'utf8');
    process.env.WHATSAPP_LINK_METHOD = 'qr';
    const selection = dashboard.selectLinkingMethod(phone);
    await Promise.resolve();
    input.write('code\n');
    expect(await selection).toBe('code');
    expect(JSON.parse(fs.readFileSync(preferencesPath, 'utf8'))).toEqual({ method: 'qr' });
  });

  test('direct commands pass their method immediately without prompting or saving', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: false });
    dashboard.displayHealthDashboard = jest.fn();
    dashboard.startAutoRefresh = jest.fn();
    dashboard.stopAutoRefresh = jest.fn();
    const onLinkMaster = jest.fn().mockResolvedValue(undefined);
    await dashboard.startInteractiveMonitoring({ onLinkMaster });
    input.write('link-code\n');
    await new Promise(resolve => setImmediate(resolve));
    expect(onLinkMaster).toHaveBeenNthCalledWith(1, 'code');
    input.write('link-qr\n');
    await new Promise(resolve => setImmediate(resolve));
    expect(onLinkMaster).toHaveBeenNthCalledWith(2, 'qr');
    input.write('link-method code\n');
    expect(onLinkMaster).toHaveBeenCalledTimes(2);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('no longer saved'));
    expect(fs.existsSync(preferencesPath)).toBe(false);
  });
});

describe('Real connection initialization deadline', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('allows more than 45 seconds to link and clears its timeout after success', async () => {
    const RealConnectionManager = jest.requireActual('../../src/connection/ConnectionManager.js').default;
    let finish;
     const client = Object.assign(new EventEmitter(), {
       initialize: jest.fn(() => new Promise(resolve => {
         finish = resolve;
       })),
     });
    const manager = new RealConnectionManager(phone, client, jest.fn());
    const result = manager.initialize();
    await jest.advanceTimersByTimeAsync(60000);
    expect(manager.isInitializing).toBe(true);
    expect(client.initialize).toHaveBeenCalledTimes(1);
    finish();
    client.emit('ready');
    expect(await result).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('times out at five minutes and reports the failure', async () => {
    const RealConnectionManager = jest.requireActual('../../src/connection/ConnectionManager.js').default;
    const client = Object.assign(new EventEmitter(), { initialize: jest.fn(() => new Promise(() => {})) });
    const manager = new RealConnectionManager(phone, client, jest.fn());
    manager.attemptSmartRecovery = jest.fn().mockReturnValue(false);
    manager.handleInitializeError = jest.fn();
    const result = manager.initialize();
    await jest.advanceTimersByTimeAsync(299999);
    expect(manager.handleInitializeError).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(await result).toBe(false);
    expect(manager.handleInitializeError).toHaveBeenCalledWith('Client readiness timeout after 5 minutes');
    expect(jest.getTimerCount()).toBe(0);
  });
});
