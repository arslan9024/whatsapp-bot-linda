import { EventEmitter } from 'node:events';
import { TerminalHealthDashboard } from '../../src/terminal/TerminalHealthDashboard.js';
import { setupTerminalInputListener } from '../../src/terminal/TerminalDashboardSetup.js';
import { SessionManager } from '../../src/sessions/SessionManager.js';
import services from '../../src/core/ServiceRegistry.js';

jest.mock('../../src/accounts/AccountHealthMonitor.js', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('../../src/sessions/SessionManager.js', () => ({
  SessionManager: {
    hasSessionArtifacts: jest.fn().mockReturnValue(true),
    canRestoreSession: jest.fn().mockReturnValue(true),
    resolveClientId: jest.fn(
      (phone, metadata) => metadata.clientId || phone.replace(/^\+/, ''),
    ),
  },
}));

describe('Compact truthful terminal device dashboard', () => {
  let dashboard;
  let devices;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    dashboard = new TerminalHealthDashboard();
    dashboard.isMonitoring = true;
    devices = [
      {
        phoneNumber: '+15550000001',
        name: 'Master',
        status: 'linked',
        isOnline: true,
      },
      {
        phoneNumber: '+15550000002',
        name: 'Office',
        status: 'unlinked',
        isOnline: false,
      },
      {
        phoneNumber: '+15550000003',
        name: 'Logged out',
        status: 'logged_out',
        isOnline: false,
      },
    ];
    dashboard.setAccountConfigManager({
      getAllAccounts: () => [{ phoneNumber: devices[0].phoneNumber }],
    });
    dashboard.deviceManager = { getAllDevices: () => devices };
    services.register('sessionStateManager', {
      getDeviceMetadata: () => ({ clientId: 'saved-profile' }),
    });
  });

  afterEach(() => {
    clearTimeout(dashboard.dashboardRefreshTimer);
    services.clear();
    jest.useRealTimers();
  });

  test('deduplicates configured/tracked accounts and distinguishes active, offline, logged-out, and saved profiles', () => {
    dashboard.displayHealthDashboard();
    const screen = console.log.mock.calls.at(-1)[0];
    expect(screen).toContain(
      'Devices: 3 | Linked: 1 | Active (online): 1 | Offline: 2 | Saved sessions: 2',
    );
    expect(screen.match(/\+15550000001/g)).toHaveLength(1);
    expect(screen).toContain('Master | +15550000001 | Link: LINKED | Connection: ACTIVE | session: saved');
    expect(screen).toContain(
      'Office | +15550000002 | Link: NOT LINKED | Connection: OFFLINE | session: saved',
    );
    expect(screen).toContain(
      'Logged out | +15550000003 | Link: NOT LINKED (logged out) | Connection: LOGGED OUT | session: relink needed',
    );
    dashboard.displayHealthDashboard();
    expect(console.log).toHaveBeenCalledTimes(1);
    devices[1].status = 'linked';
    devices[1].isOnline = true;
    dashboard.displayHealthDashboard();
    expect(console.log.mock.calls.at(-1)[0]).toContain('Active (online): 2');
  });

  test('does not treat authenticated or existing profile files as online', () => {
    devices[0].status = 'authenticated';
    dashboard.displayHealthDashboard();
    expect(console.log.mock.calls.at(-1)[0]).toContain('Active (online): 0');
    expect(console.log.mock.calls.at(-1)[0]).toContain('AUTHENTICATED');
  });

  test('lists previously linked offline accounts separately from a restore failure or new linking attempt', () => {
    const phone = devices[0].phoneNumber;
    services.register('sessionStateManager', {
      getDeviceMetadata: number => number === phone ? {
        clientId: 'original-master', deviceLinked: true, status: 'offline', linkedAt: '2026-10-26T10:00:00Z',
      } : {},
    });
    devices[0].status = 'restore_failed';
    devices[0].isOnline = false;
    devices[0].lastError = 'Protocol error: Target closed';
    dashboard.setConnectionSources(new Map([[phone, {}]]), new Map([[phone, { state: 'ERROR' }]]));
    dashboard.displayHealthDashboard();
    const screen = console.log.mock.calls.at(-1)[0];
    expect(screen).toContain('Linked: 1');
    expect(screen).toContain('Link: LINKED | Connection: RESTORE FAILED | session: saved (original-master)');
    expect(screen).toContain(`Reactivate (no relink): recover ${phone}`);
    expect(screen).toContain('Protocol error: Target closed');
    expect(screen).not.toContain('Link attempt');
    expect(screen).toContain('2. Office');
  });

  test('uses the live master connection instead of stale persisted logout/device flags', () => {
    const phone = devices[0].phoneNumber;
    dashboard.accountConfigManager.getMasterPhoneNumber = () => phone;
    services.register('sessionStateManager', { getDeviceMetadata: () => ({ status: 'logged_out', clientId: 'master-profile' }) });
    devices[0].status = 'unlinked';
    devices[0].isOnline = false;
    dashboard.setConnectionSources(new Map([[phone, {}]]), new Map([[phone, { state: 'CONNECTED' }]]));
    dashboard.displayHealthDashboard();
    const screen = console.log.mock.calls.at(-1)[0];
    expect(screen).toContain(`Master [MASTER] | ${phone} | Link: LINKED | Connection: ACTIVE | session: saved (master-profile)`);
    expect(screen).toContain('Active (online): 1');
  });

  test('shows the master conversation report in OUTPUT and runs it automatically after login', async () => {
    jest.useFakeTimers();
    const phone = devices[0].phoneNumber;
    dashboard.accountConfigManager.getMasterPhoneNumber = () => phone;
    const report = {
      phone, generatedAt: 0, durationMs: 1200, perChatLimit: 200, totalChats: 2, individualChats: 1, groupChats: 1,
      unreadChats: 0, unreadMessages: 0, countedChats: 2, skippedChats: 0, totalMessages: 7, incoming: 4, outgoing: 3,
      cappedChats: 0, busiest: null,
      entries: [
        { number: 1, name: 'Ali', group: false, unread: 0, timestamp: 0, lastFromMe: true, lastPreview: 'ok', messages: 5, incoming: 3, outgoing: 2, capped: false },
        { number: 2, name: 'Team', group: true, unread: 0, timestamp: 0, lastFromMe: null, lastPreview: '', messages: 2, incoming: 1, outgoing: 1, capped: false },
      ],
    };
    report.last = report.entries[0];
    let stored = null;
    const reporter = { run: jest.fn(async () => (stored = report)), get: jest.fn(() => stored) };
    dashboard.setConversationReporter(reporter);

    dashboard.displayHealthDashboard();
    const first = console.log.mock.calls.at(-1)[0];
    expect(first).toContain(`MESSAGE ANALYZER · MASTER ${phone} ONLINE`);
    expect(first).toContain('No report yet');
    expect(first).not.toContain('RELINK ·');

    dashboard.onAccountReady(phone, 1000);
    expect(reporter.run).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    expect(reporter.run).toHaveBeenCalledWith(phone, expect.objectContaining({ onProgress: expect.any(Function) }));
    await dashboard.conversationJobs.get(phone)?.promise;
    expect(console.log.mock.calls.flat().join('\n')).toContain('Conversations: 2 (1 people, 1 groups)');

    dashboard.displayHealthDashboard(true);
    const screen = console.log.mock.calls.at(-1)[0];
    expect(screen).toContain(`MESSAGE ANALYZER · MASTER ${phone} ONLINE`);
    expect(screen).toContain('Last conversation: #1 Ali');
    expect(screen).toContain('#1 Ali 5 | #2 Team 2');
    expect(screen).toContain(`8.10 analyze ${phone} <#>`);

    process.env.LINDA_AUTO_CHAT_REPORT = '0';
    reporter.run.mockClear();
    dashboard.onAccountReady(phone, 10);
    jest.advanceTimersByTime(50);
    expect(reporter.run).not.toHaveBeenCalled();
    delete process.env.LINDA_AUTO_CHAT_REPORT;
  });

  test('offline master shows the RELINK section (reactivate first) instead of the message analyzer', () => {
    const phone = devices[0].phoneNumber;
    dashboard.accountConfigManager.getMasterPhoneNumber = () => phone;
    dashboard.setConversationReporter({ run: jest.fn(), get: () => null });
    services.register('sessionStateManager', {
      getDeviceMetadata: number => number === phone ? { clientId: 'master-profile', deviceLinked: true, lastError: 'Target closed' } : {},
    });
    devices[0].status = 'unlinked';
    devices[0].isOnline = false;
    dashboard.setConnectionSources(new Map(), new Map());
    dashboard.displayHealthDashboard();
    let screen = console.log.mock.calls.at(-1)[0];
    expect(screen).toContain(`RELINK · MASTER ${phone} OFFLINE`);
    expect(screen).toContain(`1.16 recover ${phone} (reactivate, no new code)`);
    expect(screen).toContain(`1.9 relink master ${phone}`);
    expect(screen).toContain('Last error: Target closed');
    expect(screen.match(/Target closed/g)).toHaveLength(1);
    expect(screen).not.toContain('MESSAGE ANALYZER');

    devices[0].status = 'logged_out';
    dashboard.displayHealthDashboard();
    screen = console.log.mock.calls.at(-1)[0];
    expect(screen).toContain(`RELINK · MASTER ${phone} LOGGED OUT`);
    expect(screen).toContain('Removed or logged out on the phone');
    expect(screen).toContain('2.1 link-code | 2.2 link-qr');
    expect(screen).not.toContain('1.16 recover');
  });

  test('no configured master shows link options', () => {
    expect(dashboard.masterSectionLines(null).join('\n')).toContain('NO MASTER ACCOUNT LINKED');
  });

  test('header panel carries Linda details and master status', () => {
    const header = dashboard.headerPanel({ phone: '+1555', online: true, status: 'ACTIVE', link: 'LINKED' }, 'Devices: 1');
    expect(header.title).toContain('LINDA');
    expect(header.lines[0]).toMatch(/Linda v\S+ · Node v\d+/);
    expect(header.lines[1]).toContain('Master: +1555 · ONLINE · LINKED | Devices: 1');
    expect(header.compactLines).toHaveLength(1);
  });

  test('linked history includes a device which has subsequently logged out', () => {
    devices[2].linkedAt = '2026-10-26T10:00:00Z';
    dashboard.setConnectionSources(new Map(), new Map());
    dashboard.displayHealthDashboard();
    const screen = console.log.mock.calls.at(-1)[0];
    expect(screen).toContain('Linked: 0');
    expect(screen).toContain('Link: NOT LINKED (logged out) | Connection: LOGGED OUT');
    expect(screen).toContain('Relink: relink servant +15550000003');
  });
  test('never reports an active device from stale tracking when no live client exists', () => {
    dashboard.setConnectionSources(new Map(), new Map());
    dashboard.displayHealthDashboard();
    expect(console.log.mock.calls.at(-1)[0]).toContain('Active (online): 0');
    expect(console.log.mock.calls.at(-1)[0]).toContain('Master | +15550000001 | Link: NOT LINKED | Connection: OFFLINE');
  });

  test('live recovery progress takes priority over stale authentication metadata', () => {
    const phone = devices[0].phoneNumber;
    services.register('sessionStateManager', {
      getDeviceMetadata: () => ({ status: 'auth_required', clientId: 'saved-profile' }),
    });
    devices[0].status = 'auth_required';
    dashboard.setConnectionSources(new Map([[phone, {}]]),
      new Map([[phone, { state: 'CONNECTING', isInitializing: true }]]));
    dashboard.displayHealthDashboard();
    expect(console.log.mock.calls.at(-1)[0]).toContain(`Master | ${phone} | Link: NOT LINKED | Connection: CONNECTING`);
  });

  test('displays persisted connection errors when no live manager exists', () => {
    services.register('sessionStateManager', {
      getDeviceMetadata: () => ({ lastError: 'Browser launch failed', clientId: 'saved-profile' }),
    });
    dashboard.setConnectionSources(new Map(), new Map());
    dashboard.displayHealthDashboard();
    expect(console.log.mock.calls.at(-1)[0]).toContain('Connection error: Browser launch failed');
  });

  test('debounces lifecycle events and preserves linking or pending campaign input', () => {
    jest.useFakeTimers();
    const manager = Object.assign(new EventEmitter(), {
      getAllDevices: () => devices,
    });
    dashboard.setDeviceManager(manager);
    manager.emit('device:status-changed');
    manager.emit('device:status-changed');
    jest.advanceTimersByTime(100);
    expect(console.log).toHaveBeenCalledTimes(1);
    console.log.mockClear();
    dashboard.setLinkingChallenge(devices[0].phoneNumber, true);
    manager.emit('device:status-changed');
    jest.advanceTimersByTime(100);
    expect(console.log).not.toHaveBeenCalled();
    dashboard.setLinkingChallenge(devices[0].phoneNumber, false);
    dashboard.isCampaignMenuActive = () => true;
    dashboard.refreshDashboard(true);
    expect(console.log).not.toHaveBeenCalled();
  });
});

describe('Terminal recovery opens the real saved headless session', () => {
  let callbacks;
  let options;
  let deps;
  const phone = '+15550000001';
  const newClient = {};

  beforeEach(() => {
    SessionManager.canRestoreSession.mockReturnValue(true);
    deps = {
      sessionStateManager: {
        getDeviceMetadata: () => ({ clientId: 'original-master-profile' }),
      },
      sharedContext: { setMasterRef: jest.fn() },
      connectionManagers: new Map(),
      keepAliveManager: { stopKeepAlive: jest.fn() },
      allInitializedAccounts: [],
    };
    options = {
      logBot: jest.fn(),
      terminalHealthDashboard: {
        startInteractiveMonitoring: value => {
          callbacks = value;
        },
      },
      accountConfigManager: {
        getAllAccounts: () => [
          { phoneNumber: phone, id: 'configured-id', role: 'primary' },
        ],
        getMasterPhoneNumber: () => phone,
      },
      accountClients: new Map(),
      createClient: jest.fn().mockResolvedValue(newClient),
      setupClientFlow: jest
        .fn()
        .mockReturnValue({ initializationPromise: Promise.resolve(true) }),
      getFlowDeps: () => deps,
      deviceLinkedManager: {
        getDevice: () => ({}),
        markDeviceLinked: jest.fn(),
        startLinkingAttempt: jest.fn(),
        resetDeviceStatus: jest.fn(),
        recordLinkFailure: jest.fn(),
      },
    };
    setupTerminalInputListener(options);
  });

  afterEach(() => services.clear());

  test('recover reuses persisted LocalAuth ID and initialization promise, never optimistically marks online', async () => {
    expect(await callbacks.onRestoreAccount(phone)).toBe(true);
    expect(options.createClient).toHaveBeenCalledWith(
      'original-master-profile',
    );
    expect(options.setupClientFlow).toHaveBeenCalledWith(
      newClient,
      phone,
      'original-master-profile',
      expect.objectContaining({ isRestore: true }),
      deps,
    );
    expect(deps.sharedContext.setMasterRef).toHaveBeenCalledWith(newClient);
    expect(options.deviceLinkedManager.markDeviceLinked).not.toHaveBeenCalled();
  });

  test('active accounts are not reopened; offline clients are destroyed exactly once before recovery', async () => {
    const old = {
      getState: jest.fn().mockResolvedValue('CONNECTED'),
      removeAllListeners: jest.fn(),
      destroy: jest.fn(),
    };
    options.accountClients.set(phone, old);
    await callbacks.onRestoreAccount(phone);
    expect(options.createClient).not.toHaveBeenCalled();
    old.getState.mockResolvedValue('DISCONNECTED');
    await callbacks.onRestoreAccount(phone);
    expect(old.removeAllListeners).toHaveBeenCalledTimes(1);
    expect(old.destroy).toHaveBeenCalledTimes(1);
  });

  test('manual recovery cannot race an account replacement already closing its browser', async () => {
    deps.connectionManagers.set(phone, { isReconnecting: true });
    await expect(callbacks.onRestoreAccount(phone)).rejects.toThrow('Connection already in progress');
    expect(options.createClient).not.toHaveBeenCalled();
  });

  test('relink without restorable files stops old client once instead of double destruction', async () => {
    SessionManager.canRestoreSession.mockReturnValue(false);
    const old = { removeAllListeners: jest.fn(), destroy: jest.fn() };
    options.accountClients.set(phone, old);
    await callbacks.onRelinkMaster(phone);
    expect(old.removeAllListeners).toHaveBeenCalledTimes(1);
    expect(old.destroy).toHaveBeenCalledTimes(1);
    expect(options.createClient).toHaveBeenCalledTimes(1);
  });

  test('explicit recovery retries a saved auth-required profile without starting device linking', async () => {
    deps.sessionStateManager.getDeviceMetadata = () => ({
      status: 'auth_required', clientId: 'original-master-profile',
    });
    expect(await callbacks.onRestoreAccount(phone)).toBe(true);
    expect(options.createClient).toHaveBeenCalledWith('original-master-profile');
    expect(options.setupClientFlow).toHaveBeenCalledWith(
      newClient, phone, 'original-master-profile',
      expect.objectContaining({ isRestore: true }), deps,
    );
    expect(options.deviceLinkedManager.startLinkingAttempt).not.toHaveBeenCalled();
  });

  test('missing artifacts report the selected profile instead of a metadata authentication error', async () => {
    SessionManager.canRestoreSession.mockReturnValue(false);
    await expect(callbacks.onRestoreAccount(phone)).rejects.toThrow(
      'Saved profile session-original-master-profile',
    );
    expect(options.createClient).not.toHaveBeenCalled();
  });

  test.each([
    [{ authRequired: true }, 'WhatsApp requested fresh authentication'],
    [{ connectionFailureReason: 'Protocol error: Target closed' }, 'Protocol error: Target closed'],
  ])('failed recovery preserves the actual initialization reason: %s', async (state, reason) => {
    options.setupClientFlow.mockReturnValue({
      ...state, initializationPromise: Promise.resolve(false),
    });
    await expect(callbacks.onRestoreAccount(phone)).rejects.toThrow(reason);
  });

  test('failed initialization and logged-out saved sessions report failures instead of claiming restored', async () => {
    options.setupClientFlow.mockReturnValue({
      initializationPromise: Promise.resolve(false),
    });
    await expect(callbacks.onRestoreAccount(phone)).rejects.toThrow(
      'Session restore failed',
    );
    deps.sessionStateManager.getDeviceMetadata = () => ({
      status: 'logged_out',
    });
    options.accountClients.clear();
    options.createClient.mockClear();
    await expect(callbacks.onRestoreAccount(phone)).rejects.toThrow(
      'is marked logged_out',
    );
    expect(options.createClient).not.toHaveBeenCalled();
  });
});

describe('Pairing code refresh during linking', () => {
  let dashboard;
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    dashboard = new TerminalHealthDashboard();
  });
  afterEach(() => jest.restoreAllMocks());

  const waitingManager = (waiting = true) => ({ isAwaitingPairingCode: () => waiting });

  it('refreshes the code with r even while the linking command is running', async () => {
    dashboard.commandRunning = true;
    dashboard.setConnectionSources(new Map(), new Map([['+15550000001', waitingManager()]]));
    const requestCode = jest.fn().mockResolvedValue();
    await expect(dashboard.handlePairingCodeInput('r', requestCode)).resolves.toBe(true);
    await expect(dashboard.handlePairingCodeInput('new code', requestCode)).resolves.toBe(true);
    expect(requestCode).toHaveBeenCalledWith('+15550000001');
    expect(requestCode).toHaveBeenCalledTimes(2);
  });

  it('requires a phone when several accounts are linking and routes code <phone>', async () => {
    dashboard.setConnectionSources(new Map(), new Map([
      ['+15550000001', waitingManager()], ['+15550000002', waitingManager()],
    ]));
    const requestCode = jest.fn().mockResolvedValue();
    await dashboard.handlePairingCodeInput('refresh', requestCode);
    expect(requestCode).not.toHaveBeenCalled();
    await dashboard.handlePairingCodeInput('code 15550000002', requestCode);
    expect(requestCode).toHaveBeenCalledWith('+15550000002');
  });

  it('leaves input untouched when no pairing-code link is waiting', async () => {
    dashboard.setConnectionSources(new Map(), new Map([['+15550000001', waitingManager(false)]]));
    const requestCode = jest.fn();
    expect(dashboard.handlePairingCodeInput('r', requestCode)).toBe(false);
    expect(dashboard.handlePairingCodeInput('status', requestCode)).toBe(false);
    expect(requestCode).not.toHaveBeenCalled();
  });

  it('reports refresh errors without throwing', async () => {
    dashboard.setConnectionSources(new Map(), new Map([['+15550000001', waitingManager()]]));
    const requestCode = jest.fn().mockRejectedValue(new Error('WhatsApp is still loading'));
    await expect(dashboard.handlePairingCodeInput('r', requestCode)).resolves.toBe(true);
    expect(console.log).toHaveBeenCalledWith('Could not refresh the pairing code: WhatsApp is still loading');
    expect(dashboard.refreshingPairingCode).toBe(false);
  });
});
