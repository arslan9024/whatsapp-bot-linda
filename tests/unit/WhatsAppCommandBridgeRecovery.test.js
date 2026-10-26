import { WhatsAppCommandBridge } from '../../code/WhatsAppBot/WhatsAppCommandBridge.js';
import DeviceLinkedManager from '../../code/utils/DeviceLinkedManager.js';
import { SessionManager } from '../../code/utils/SessionManager.js';
import services from '../../code/utils/ServiceRegistry.js';

jest.mock('../../code/utils/SessionManager.js', () => ({
  SessionManager: {
    canRestoreSession: jest.fn(),
    resolveClientId: jest.fn(),
  },
}));

const phone = '+15551234567';
const otherPhone = '+15557654321';

describe('Primary master session recovery', () => {
  let bridge;
  let devices;
  let clients;
  let managers;
  let metadata;
  let restore;
  let log;

  beforeEach(() => {
    jest.useFakeTimers();
    services.clear();
    log = jest.fn();
    devices = new DeviceLinkedManager(log);
    devices.addDevice(phone);
    devices.addDevice(otherPhone);
    clients = new Map();
    managers = new Map();
    metadata = { clientId: 'saved-master', status: 'offline' };
    SessionManager.canRestoreSession.mockReturnValue(true);
    SessionManager.resolveClientId.mockReturnValue('saved-master');
    restore = jest.fn().mockResolvedValue(true);
    services.register('terminalCallbacks', { onRestoreAccount: restore });
    bridge = new WhatsAppCommandBridge({
      logBot: log,
      accountConfigManager: {
        getMasterPhoneNumber: () => phone,
        getAllAccounts: () => [{ phoneNumber: phone, id: 'master' }],
      },
      deviceLinkedManager: devices,
      sessionStateManager: { getDeviceMetadata: () => metadata },
      accountClients: clients,
      connectionManagers: managers,
      recoveryRetries: 2,
      recoveryDelay: 3000,
    });
    jest.spyOn(bridge, 'notifyAdmin').mockResolvedValue(undefined);
  });

  afterEach(() => {
    bridge.stopRecoveryPolling();
    services.clear();
    jest.useRealTimers();
  });

  test('restores through the shared terminal flow even when no client exists', async () => {
    restore.mockImplementation(async () => {
      clients.set(phone, { getState: jest.fn().mockResolvedValue('CONNECTED') });
      devices.markDeviceLinked(phone);
      return true;
    });

    expect(await bridge.autoRecoverPrimaryMaster()).toBe(true);
    expect(restore).toHaveBeenCalledTimes(1);
    expect(restore).toHaveBeenCalledWith(phone);
    expect(SessionManager.canRestoreSession).toHaveBeenCalledWith('saved-master');
    expect(bridge.recoveryInProgress).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('an already connected master is not initialized or reported as failed', async () => {
    const client = { getState: jest.fn().mockResolvedValue('CONNECTED'), initialize: jest.fn() };
    clients.set(phone, client);

    expect(await bridge.autoRecoverPrimaryMaster()).toBe(true);
    expect(client.initialize).not.toHaveBeenCalled();
    expect(restore).not.toHaveBeenCalled();
    expect(bridge.notifyAdmin).not.toHaveBeenCalled();
  });

  test('uses the live connection rather than a stale linked device flag', async () => {
    devices.markDeviceLinked(phone);
    const client = { getState: jest.fn().mockResolvedValue('DISCONNECTED'), initialize: jest.fn() };
    clients.set(phone, client);
    restore.mockImplementation(async () => {
      client.getState.mockResolvedValue('CONNECTED');
      return true;
    });

    expect(await bridge.autoRecoverPrimaryMaster()).toBe(true);
    expect(restore).toHaveBeenCalledTimes(1);
    expect(client.initialize).not.toHaveBeenCalled();
  });

  test.each(['logged_out', 'auth_failed', 'auth_required', 'paused'])('does not retry a %s session', async status => {
    metadata.status = status;

    expect(await bridge.autoRecoverPrimaryMaster()).toBe(false);
    expect(restore).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining(status === 'paused' ? 'is paused' : 'Use link-code or link-qr'),
      status === 'paused' ? 'info' : 'warn'
    );
    expect(jest.getTimerCount()).toBe(0);
    expect(bridge.recoveryInProgress).toBe(false);
  });

  test('fresh authentication offers reconnect first and relinks only if reconnect fails', async () => {
    const relink = jest.fn().mockResolvedValue(undefined);
    services.register('terminalCallbacks', { onRestoreAccount: restore, onRelinkMaster: relink });
    restore.mockImplementation(async () => {
      metadata.status = 'auth_required';
      throw new Error('WhatsApp requested fresh authentication; saved profile retained');
    });

    expect(await bridge.autoRecoverPrimaryMaster()).toBe(false);
    await bridge.authenticationPrompt;
    expect(restore).toHaveBeenCalledTimes(2);
    expect(relink).toHaveBeenCalledWith(phone);
    expect(bridge.notifyAdmin).not.toHaveBeenCalled();

    bridge.startRecoveryPolling();
    await jest.advanceTimersByTimeAsync(120000);
    expect(relink).toHaveBeenCalledTimes(1);

    devices.markDeviceLinked(otherPhone);
    bridge.setupEventListeners();
    devices.markDeviceLinked(phone);
    expect(bridge.authenticationPromptAttempted).toBe(false);
  });

  test('reconnecting a linked master does not relink it', async () => {
    const relink = jest.fn();
    services.register('terminalCallbacks', { onRestoreAccount: restore, onRelinkMaster: relink });
    bridge.terminalHealthDashboard = { selectMasterActivation: jest.fn().mockResolvedValue('reconnect') };
    restore.mockImplementation(async () => {
      clients.set(phone, { getState: jest.fn().mockResolvedValue('CONNECTED') });
    });

    expect(bridge.requestPrimaryMasterAuthentication(phone)).toBe(true);
    await bridge.authenticationPrompt;
    expect(restore).toHaveBeenCalledWith(phone);
    expect(relink).not.toHaveBeenCalled();
  });

  test.each(['code', 'qr'])('relink choice %s is passed to the master relink flow', async method => {
    const relink = jest.fn();
    services.register('terminalCallbacks', { onRestoreAccount: restore, onRelinkMaster: relink });
    bridge.terminalHealthDashboard = { selectMasterActivation: jest.fn().mockResolvedValue(method) };

    bridge.requestPrimaryMasterAuthentication(phone);
    await bridge.authenticationPrompt;
    expect(relink).toHaveBeenCalledWith(phone, method);
    expect(restore).not.toHaveBeenCalled();
  });

  test('a logged-out master goes straight to relinking', async () => {
    metadata.status = 'logged_out';
    const relink = jest.fn();
    const select = jest.fn();
    services.register('terminalCallbacks', { onRestoreAccount: restore, onRelinkMaster: relink });
    bridge.terminalHealthDashboard = { selectMasterActivation: select };

    bridge.requestPrimaryMasterAuthentication(phone);
    await bridge.authenticationPrompt;
    expect(select).not.toHaveBeenCalled();
    expect(restore).not.toHaveBeenCalled();
    expect(relink).toHaveBeenCalledWith(phone);
  });

  test('does not open a second prompt while one is active', () => {
    const relink = jest.fn(() => new Promise(() => {}));
    services.register('terminalCallbacks', { onRelinkMaster: relink });

    expect(bridge.requestPrimaryMasterAuthentication(phone)).toBe(true);
    bridge.authenticationPromptAttempted = false;
    expect(bridge.requestPrimaryMasterAuthentication(phone)).toBe(false);
  });

  test('does not retry an authentication-required client even before persisted metadata catches up', async () => {
    managers.set(phone, { authRequired: true, state: 'AUTH_REQUIRED' });
    expect(await bridge.autoRecoverPrimaryMaster()).toBe(false);
    expect(restore).not.toHaveBeenCalled();
  });

  test('does not retry when saved artifacts are missing', async () => {
    SessionManager.canRestoreSession.mockReturnValue(false);

    expect(await bridge.autoRecoverPrimaryMaster()).toBe(false);
    expect(restore).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  test.each([
    ['initializing', () => managers.set(phone, { isInitializing: true })],
    ['connecting', () => managers.set(phone, { state: 'CONNECTING' })],
    ['scheduled reconnect', () => managers.set(phone, { reconnectTimer: 123 })],
    ['linking', () => devices.startLinkingAttempt(phone)],
    ['method prompt', () => { bridge.terminalHealthDashboard = { isSelectingLinkingMethod: true }; }],
    ['QR challenge', () => { bridge.terminalHealthDashboard = { linkingChallenges: new Set([phone]) }; }],
  ])('does not interrupt an active %s flow', async (_name, arrange) => {
    arrange();

    expect(await bridge.autoRecoverPrimaryMaster()).toBe(false);
    expect(restore).not.toHaveBeenCalled();
    expect(bridge.notifyAdmin).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  test('does not treat loaded session files as a connected WhatsApp account', async () => {
    restore.mockImplementation(async () => {
      managers.set(phone, { isInitializing: true });
      return true;
    });

    expect(await bridge.autoRecoverPrimaryMaster()).toBe(false);
    expect(restore).toHaveBeenCalledTimes(1);
    expect(bridge.notifyAdmin).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  test('a stale linking flag does not prevent retrying a failed connection', async () => {
    devices.startLinkingAttempt(phone);
    managers.set(phone, { state: 'ERROR', isInitializing: false });
    restore.mockImplementation(async () => {
      clients.set(phone, { getState: jest.fn().mockResolvedValue('CONNECTED') });
      return true;
    });

    expect(await bridge.autoRecoverPrimaryMaster()).toBe(true);
    expect(restore).toHaveBeenCalledTimes(1);
  });

  test('reports a missing restore handler without performing empty retries', async () => {
    services.unregister('terminalCallbacks');

    expect(await bridge.autoRecoverPrimaryMaster()).toBe(false);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('handler is not registered'), 'error');
    expect(jest.getTimerCount()).toBe(0);
  });

  test('stops retrying when restoration discovers an expired authentication', async () => {
    restore.mockImplementation(async () => {
      metadata.status = 'auth_failed';
      throw new Error('Session expired');
    });

    expect(await bridge.autoRecoverPrimaryMaster()).toBe(false);
    expect(restore).toHaveBeenCalledTimes(1);
    expect(bridge.notifyAdmin).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  test('retries actual failures and waits only between attempts', async () => {
    restore.mockRejectedValue(new Error('Browser failed to start'));
    const recovering = bridge.autoRecoverPrimaryMaster();
    await jest.advanceTimersByTimeAsync(3000);

    expect(await recovering).toBe(false);
    expect(restore).toHaveBeenCalledTimes(2);
    expect(bridge.notifyAdmin).toHaveBeenCalledTimes(1);
    expect(bridge.recoveryInProgress).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('recognizes a master restored by another flow during the retry delay', async () => {
    restore.mockRejectedValue(new Error('Temporary browser error'));
    const recovering = bridge.autoRecoverPrimaryMaster();
    await jest.advanceTimersByTimeAsync(0);
    clients.set(phone, { getState: jest.fn().mockResolvedValue('CONNECTED') });
    await jest.advanceTimersByTimeAsync(3000);

    expect(await recovering).toBe(true);
    expect(restore).toHaveBeenCalledTimes(1);
    expect(bridge.notifyAdmin).not.toHaveBeenCalled();
  });

  test('does not run duplicate restoration attempts concurrently', async () => {
    let complete;
    restore.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    const recovering = bridge.autoRecoverPrimaryMaster();
    await jest.advanceTimersByTimeAsync(0);

    expect(await bridge.autoRecoverPrimaryMaster()).toBe(false);
    clients.set(phone, { getState: jest.fn().mockResolvedValue('CONNECTED') });
    complete(true);
    expect(await recovering).toBe(true);
    expect(restore).toHaveBeenCalledTimes(1);
  });

  test('responds to actual device-manager events without starting competing recovery', () => {
    bridge.setupEventListeners();
    const handleLoss = jest.spyOn(bridge, 'handleSessionLoss');
    devices.markDeviceLinked(otherPhone);
    expect(bridge.notifyAdmin).not.toHaveBeenCalled();
    devices.markDeviceLinked(phone);
    expect(bridge.notifyAdmin).toHaveBeenCalledTimes(1);
    devices.markDeviceUnlinked(phone, 'LOGOUT');
    expect(log).toHaveBeenCalledWith(expect.stringContaining('needs authentication'), 'warn');
    expect(handleLoss).not.toHaveBeenCalled();
    expect(restore).not.toHaveBeenCalled();
  });

  test('polling skips invalid sessions and accounts awaiting authentication', async () => {
    bridge.startRecoveryPolling();
    bridge.startRecoveryPolling();
    expect(jest.getTimerCount()).toBe(1);
    metadata.status = 'logged_out';
    await jest.advanceTimersByTimeAsync(60000);
    metadata.status = 'offline';
    devices.startLinkingAttempt(phone);
    await jest.advanceTimersByTimeAsync(60000);
    expect(restore).not.toHaveBeenCalled();
  });

  test('polling checks live state even when the device is marked linked', async () => {
    devices.markDeviceLinked(phone);
    const client = { getState: jest.fn().mockResolvedValue('DISCONNECTED') };
    clients.set(phone, client);
    restore.mockImplementation(async () => {
      client.getState.mockResolvedValue('CONNECTED');
      return true;
    });
    bridge.startRecoveryPolling();
    await jest.advanceTimersByTimeAsync(60000);

    expect(restore).toHaveBeenCalledTimes(1);
    expect(bridge.notifyAdmin).not.toHaveBeenCalled();
  });

  test('a different connected account does not satisfy primary master recovery', async () => {
    clients.set(otherPhone, { getState: jest.fn().mockResolvedValue('CONNECTED') });
    SessionManager.canRestoreSession.mockReturnValue(false);

    expect(await bridge.autoRecoverPrimaryMaster()).toBe(false);
    expect(restore).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('needs authentication'), 'warn');
  });

  test('initialization is idempotent and uses the saved client ID', async () => {
    metadata.status = 'logged_out';
    expect(await bridge.initializeBot()).toBe(true);
    expect(await bridge.initializeBot()).toBe(true);
    expect(devices.listenerCount('device:linked')).toBe(1);
    expect(jest.getTimerCount()).toBe(1);
    expect(SessionManager.resolveClientId).toHaveBeenCalledWith(
      phone, metadata, { phoneNumber: phone, id: 'master' }
    );
    expect(restore).not.toHaveBeenCalled();
  });
});
