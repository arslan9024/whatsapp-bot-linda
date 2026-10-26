import { PassThrough } from 'node:stream';
import readline from 'node:readline';
import TerminalNumberMenu from '../../src/terminal/TerminalNumberMenu.js';
import { TerminalHealthDashboard } from '../../src/terminal/TerminalHealthDashboard.js';
import registry from '../../src/commands/LindaCommandRegistry.js';
import services from '../../src/core/ServiceRegistry.js';

jest.mock('../../src/accounts/AccountHealthMonitor.js', () => ({
  __esModule: true, default: {},
}));
jest.mock('../../src/sessions/SessionManager.js', () => ({
  SessionManager: { hasSessionArtifacts: () => false, resolveClientId: phone => phone },
}));

describe('Counted hierarchical terminal menus', () => {
  let accounts;
  let devices;
  let menu;
  let output;

  beforeEach(() => {
    accounts = [
      { phoneNumber: '+15551234567', displayName: 'Master', role: 'primary' },
      { phoneNumber: '+15557654321', displayName: 'Office', role: 'servant' },
    ];
    devices = [
      { phoneNumber: '+15551234567', name: 'Master', role: 'master' },
      { phoneNumber: '+15558887777', name: 'Tracked device', role: 'servant' },
    ];
    output = jest.fn();
    menu = new TerminalNumberMenu({
      accountConfigManager: { getAllAccounts: () => accounts },
      deviceManager: { getAllDevices: () => devices },
    }, output);
    menu.refresh();
  });

  afterEach(() => {
    services.clear();
  });

  function leaves(node) {
    return node.children ? node.children.flatMap(leaves) : [node];
  }

  test('counts accounts, devices, terminal actions and every registered command exactly once', () => {
    expect(menu.summary).toContain('Accounts: 2 | Devices: 2');
    expect(menu.summary).toContain(`WhatsApp commands: ${registry.getAllCommands().length}`);
    const catalog = menu.root.children[6];
    expect(leaves(catalog)).toHaveLength(registry.getAllCommands().length);
    expect(new Set(leaves(catalog).map(item => item.label)).size).toBe(registry.getAllCommands().length);
    const terminalLeaves = menu.root.children.filter(node => node !== catalog).flatMap(leaves);
    expect(menu.summary).toContain(`Terminal actions: ${terminalLeaves.length}`);
    expect(output).toHaveBeenCalledWith(expect.stringContaining('[2 items; 2 actions/references]'));
  });

  test('direct and step-by-step navigation execute the same existing command', () => {
    expect(menu.handleInput('2').handled).toBe(true);
    expect(menu.path).toEqual([2]);
    expect(menu.handleInput('1').command).toBe('link-code');
    expect(menu.handleInput('2.1').command).toBe('link-code');
    expect(menu.handleInput('2.2').command).toBe('link-qr');
  });

  test('zero goes back and double zero returns home', () => {
    menu.handleInput('1.8.1');
    expect(menu.path).toEqual([1, 8, 1]);
    menu.handleInput('0');
    expect(menu.path).toEqual([1, 8]);
    menu.handleInput('00');
    expect(menu.path).toEqual([]);
    menu.handleInput('0');
    expect(menu.path).toEqual([]);
  });

  test('selects a device by number without retyping its phone', () => {
    expect(menu.nodeAt([1, 8]).children).toHaveLength(3);
    expect(menu.handleInput('1.8.1.5').command).toBe('relink master +15551234567');
    expect(menu.handleInput('1.8.2.5').command).toBe('relink servant +15557654321');
    expect(menu.handleInput('1.8.3.6').command).toBeUndefined();
    expect(menu.handleInput('1').command).toBe('disconnect +15558887777');
  });

  test('active account actions avoid redundant recovery or authentication and expose selected-chat analysis', () => {
    menu.dashboard.accountClients = new Map([['+15551234567', {}]]);
    menu.dashboard.connectionManagers = new Map([['+15551234567', { state: 'CONNECTED' }]]);
    menu.refresh();
    expect(menu.handleInput('1.8.1.4').command).toBeUndefined();
    expect(menu.handleInput('1.8.1.5').command).toBeUndefined();
    expect(menu.handleInput('1.8.1.8.1').command).toBe('chats +15551234567');
    menu.handleInput('1.8.1.8.3');
    menu.handleInput('2');
    expect(menu.handleInput('100').command).toBe('analyze +15551234567 2 100');
  });

  test('keeps codes stable until explicit refresh and rejects removed accounts', () => {
    accounts.reverse();
    expect(menu.handleInput('1.8.1.1').command).toBe('device +15551234567');
    accounts = accounts.filter(account => account.phoneNumber !== '+15551234567');
    devices = [];
    expect(menu.handleInput('1.8.1.1').command).toBeUndefined();
    expect(output).toHaveBeenCalledWith(expect.stringContaining('no longer available'));
    menu.handleInput('menu');
    expect(menu.handleInput('1.8.1.1').command).toBe('device +15557654321');
    expect(menu.summary).toContain('Accounts: 1 | Devices: 0');
  });

  test('prompts for data, preserves case, and uses default range', () => {
    menu.handleInput('5.1');
    expect(menu.pending).not.toBe(null);
    expect(menu.handleInput('AbC123SheetID').command).toBeUndefined();
    expect(menu.handleInput('').command).toBe('sheets read AbC123SheetID Sheet1');
    expect(menu.pending).toBe(null);
  });

  test('requires valid data and allows numeric phone data inside a pending prompt', () => {
    menu.handleInput('1.9');
    expect(menu.handleInput('invalid').command).toBeUndefined();
    expect(menu.pending).not.toBe(null);
    expect(menu.handleInput('15551234567').command).toBe('relink master 15551234567');
    menu.handleInput('5.6');
    menu.handleInput('');
    expect(output).toHaveBeenCalledWith('A value is required.');
    expect(menu.handleInput('ABC').command).toBe('sheets info ABC');
  });

  test('new account can use an optional display name', () => {
    menu.handleInput('1.6');
    menu.handleInput('+15551234567');
    expect(menu.handleInput('').command).toBe('link master +15551234567');
  });

  test('cancel clears pending data without executing an action', () => {
    menu.handleInput('5.2');
    menu.handleInput('SheetID');
    expect(menu.handleInput('0').command).toBeUndefined();
    expect(menu.pending).toBe(null);
    expect(menu.handleInput('2.2').command).toBe('link-qr');
  });

  test('delete row requires numeric confirmation and validates row input', () => {
    menu.handleInput('5.4');
    menu.handleInput('AbC');
    menu.handleInput('Sheet1');
    menu.handleInput('-5');
    expect(menu.pending.values).toHaveLength(2);
    menu.handleInput('2');
    expect(menu.pending.confirmation).toBe('sheets delete AbC Sheet1 2');
    expect(menu.handleInput('yes').command).toBeUndefined();
    expect(menu.handleInput('1').command).toBe('sheets delete AbC Sheet1 2');
    menu.handleInput('6.3');
    expect(menu.handleInput('0').command).toBeUndefined();
  });

  test.each(['999', '1.0', '1..2', '1.', '1.999', '999999999999999999999999'])(
    'invalid number code %s never runs an action', text => {
      expect(menu.handleInput(text)).toEqual({ handled: true });
      expect(output).toHaveBeenCalledWith(expect.stringMatching(/Invalid number code|Unknown number code/));
    }
  );

  test('ordinary typed commands pass through unchanged', () => {
    expect(menu.handleInput('status')).toEqual({ handled: false });
    expect(menu.handleInput('link-method qr')).toEqual({ handled: false });
  });

  test('command catalog is reference-only and reports registered-handler availability honestly', () => {
    services.register('commandHandler', { commandHandlers: new Map([['link-method', jest.fn()]]) });
    menu.refresh();
    const catalog = menu.root.children[6];
    const categoryIndex = catalog.children.findIndex(category => category.children.some(item => item.label === '!link-method'));
    const commandIndex = catalog.children[categoryIndex].children.findIndex(item => item.label === '!link-method');
    const result = menu.handleInput(`7.${categoryIndex + 1}.${commandIndex + 1}`);
    expect(result).toEqual({ handled: true });
    expect(output).toHaveBeenCalledWith(expect.stringContaining('Handler registered: yes (may still be a placeholder)'));
    expect(output).toHaveBeenCalledWith(expect.stringContaining('not executed by this terminal menu'));
  });

  test('empty account/device lists remain navigable without inventing any counts', () => {
    accounts = [];
    devices = [];
    menu.refresh();
    expect(menu.summary).toContain('Accounts: 0 | Devices: 0');
    expect(menu.handleInput('1.8')).toEqual({ handled: true });
    expect(menu.nodeAt(menu.path).children).toEqual([]);
    expect(menu.handleInput('1')).toEqual({ handled: true });
    expect(menu.handleInput('00')).toEqual({ handled: true });
    expect(menu.path).toEqual([]);
  });

  test('disabled commands remain counted but visibly marked as disabled in the reference catalog', () => {
    const command = registry.getAllCommands()[0];
    const originalEnabled = command.enabled;
    try {
      command.enabled = false;
      menu.refresh();
      const references = leaves(menu.root.children[6]);
      const reference = references.find(item => item.label === `!${command.name} [disabled]`);
      expect(reference.info).toContain('Enabled: no');
      expect(reference.info).toContain('Handler registered: no');
      expect(references).toHaveLength(registry.getAllCommands().length);
    } finally {
      command.enabled = originalEnabled;
    }
  });

  test('restored messaging and intelligence actions are reachable as 8.x', () => {
    expect(menu.handleInput('8.2')).toEqual({ handled: true });
    expect(menu.handleInput('0501234567').command).toBe('validate 0501234567');
    menu.handleInput('8.6');
    expect(menu.handleInput('Ali Khan | Aly Khan').command).toBe('similar Ali Khan | Aly Khan');
    expect(menu.handleInput('8.3').command).toBe('score');
    expect(menu.handleInput('6.5').command).toBe('features');
  });

  test('appended by-phone actions keep existing codes and support optional fields', () => {
    expect(menu.handleInput('1.17')).toEqual({ handled: true });
    expect(menu.handleInput('+15551234567')).toEqual({ handled: true });
    expect(menu.handleInput('1').command).toBe('disconnect +15551234567');
    expect(menu.handleInput('1.18').command).toBe('health');
    expect(menu.handleInput('1.19').command).toBe('restore master');
    expect(menu.handleInput('1.20').command).toBe('master check');
    expect(menu.handleInput('1.21').command).toBe('master ready');
    menu.handleInput('8.9');
    menu.handleInput('+15551234567');
    expect(menu.handleInput('').command).toBe('chats +15551234567');
    menu.handleInput('8.10');
    menu.handleInput('+15551234567');
    menu.handleInput('3');
    expect(menu.handleInput('').command).toBe('analyze +15551234567 3');
    menu.handleInput('8.8');
    expect(menu.handleInput('+15551234567').command).toBe('score +15551234567');
  });

  test('full numbered list shows every terminal action with its dotted code and counter', () => {
    const lines = menu.fullListLines(command => (command === 'link-code' ? 4 : 0));
    const text = lines.join('\n');
    expect(text).toContain('[1] DEVICES AND ACCOUNTS');
    expect(text).toContain('2.1  Link with pairing code  → link-code  ×4');
    expect(text).toContain('8.2  Validate a number  → validate <…>  ×0');
    expect(text).toContain('1.8.1.8.3  Analyze selected chat');
    expect(text).toContain('7.x');
    expect(text).not.toContain('!');
    const catalog = menu.root.children[6];
    const terminalLeaves = menu.root.children.filter(node => node !== catalog).flatMap(leaves).filter(item => !item.info);
    expect(lines.filter(line => line.includes('→'))).toHaveLength(terminalLeaves.length);
    const cells = menu.gridCells(() => 1);
    expect(cells).toContain('2.2 link-qr ×1');
    expect(cells.some(cell => cell.startsWith('1.8 ') || cell.startsWith('7.'))).toBe(false);
  });

  test('sections group every code with action and usage counters for the INPUT board', () => {
    const sections = menu.sections(command => (command === 'recover' ? 2 : 0));
    expect(sections.map(section => section.code)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
    expect(sections[0].cells).toContain('1.16 recover ×2');
    expect(sections[0].cells).toContain('1.19 restore master ×0');
    expect(sections[0].cells.find(cell => cell.startsWith('1.8 '))).toMatch(/^1\.8 ▸Select account\/device \(\d+\)$/);
    expect(sections[0].uses).toBe(2);
    expect(sections[6]).toMatchObject({ reference: true, cells: [] });
  });

  test('all canonical terminal actions are present', () => {
    const commands = new Set(menu.root.children.slice(0, 6).flatMap(leaves).map(item => item.command));
    for (const command of [
      'accounts', 'list', 'masters', 'servants', 'link master', 'restore-sessions',
      'relink master', 'relink servant', 'relink', 'code', 'device', 'health', 'stats', 'recover',
      'link-code', 'link-qr',
      'goraha status', 'goraha verify', 'goraha contacts', 'goraha filter',
      'analytics', 'analytics report', 'analytics uptime', 'analytics account',
      'sheets read', 'sheets add', 'sheets update', 'sheets delete', 'sheets search', 'sheets info',
      'status', 'help', 'quit',
    ]) {
      expect(commands.has(command)).toBe(true);
    }
  });
});

describe('Numbered input reaches the real terminal command dispatcher', () => {
  let dashboard;
  let input;
  let onRead;
  let onLink;

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'clear').mockImplementation(() => {});
    dashboard = new TerminalHealthDashboard();
    input = new PassThrough();
    dashboard.rl = readline.createInterface({ input, output: new PassThrough(), terminal: false });
    dashboard.displayHealthDashboard = jest.fn();
    dashboard.startAutoRefresh = jest.fn();
    dashboard.stopAutoRefresh = jest.fn();
    onRead = jest.fn().mockResolvedValue(undefined);
    onLink = jest.fn().mockResolvedValue(undefined);
    await dashboard.startInteractiveMonitoring({ onGoogleSheetsRead: onRead, onLinkMaster: onLink });
  });

  afterEach(() => {
    dashboard.rl?.close();
    input.destroy();
  });

  const flush = () => new Promise(resolve => setImmediate(resolve));

  test('startup checks the master first and numbered readiness commands reach their callback', async () => {
    dashboard.rl.close();
    dashboard.rl = readline.createInterface({ input, output: new PassThrough(), terminal: false });
    const checkMaster = jest.fn().mockResolvedValue(false);
    await dashboard.startInteractiveMonitoring({ onCheckMaster: checkMaster });
    expect(checkMaster).toHaveBeenCalledTimes(1);
    expect(checkMaster).toHaveBeenLastCalledWith();
    input.write('1.20\n');
    await flush();
    expect(checkMaster).toHaveBeenLastCalledWith({ recover: false });
    input.write('1.21\n');
    await flush();
    expect(checkMaster).toHaveBeenLastCalledWith({ recover: true });
    input.write('MASTER CHECK\n');
    await flush();
    expect(checkMaster).toHaveBeenLastCalledWith({ recover: false });
    expect(checkMaster).toHaveBeenCalledTimes(4);
  });

  test('the actual prompt keeps all-command help visible', () => {
    dashboard.rl.close();
    dashboard.rl = null;
    const create = jest.spyOn(readline, 'createInterface').mockReturnValue({
      close: jest.fn(),
    });
    dashboard.initializeInput();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.stringContaining('features = all commands | help'),
    }));
  });

  test('numbered spreadsheet read preserves ID and range case in the real callback', async () => {
    input.write('5.1\nAbC123\nSheetOne!A1:B9\n');
    await flush();
    expect(onRead).toHaveBeenCalledWith('AbC123', 'SheetOne!A1:B9');
  });

  test('link action dispatches once and linking choice input is not interpreted as menu navigation', async () => {
    input.write('1.5\n');
    await flush();
    expect(onLink).toHaveBeenCalledTimes(1);
    dashboard.isSelectingLinkingMethod = true;
    input.write('2\n');
    expect(dashboard.numberMenu.path).toEqual([]);
    dashboard.isSelectingLinkingMethod = false;
  });

  test('both numeric direct-link actions pass a method immediately to the existing callback', async () => {
    input.write('2.1\n');
    await flush();
    input.write('2.2\n');
    await flush();
    expect(onLink).toHaveBeenNthCalledWith(1, 'code');
    expect(onLink).toHaveBeenNthCalledWith(2, 'qr');
  });

  test('restore master and playbook steps reactivate the master without relinking', async () => {
    dashboard.rl.close();
    dashboard.rl = readline.createInterface({ input, output: new PassThrough(), terminal: false });
    dashboard.masterPhoneNumber = '+15551234567';
    const restoreAccount = jest.fn().mockResolvedValue(true);
    await dashboard.startInteractiveMonitoring({ onRestoreAccount: restoreAccount });
    input.write('restore master\n');
    await flush();
    input.write('p1.1\n');
    await flush();
    expect(restoreAccount).toHaveBeenNthCalledWith(1, '+15551234567');
    expect(restoreAccount).toHaveBeenNthCalledWith(2, '+15551234567');
    expect(dashboard.features.actionCount('p1')).toBe(1);
    expect(dashboard.features.actionCount('restore master')).toBe(1);
  });

  test('typed local session and conversation commands dispatch without sending WhatsApp messages', async () => {
    dashboard.rl.close();
    dashboard.rl = readline.createInterface({ input, output: new PassThrough(), terminal: false });
    const disconnect = jest.fn().mockResolvedValue(true);
    const chats = jest.fn().mockResolvedValue(2);
    const analyze = jest.fn().mockResolvedValue({});
    await dashboard.startInteractiveMonitoring({
      onDisconnectAccount: disconnect, onListChats: chats, onAnalyzeChat: analyze,
    });
    input.write('chats +15551234567 2\n');
    await flush();
    input.write('analyze +15551234567 1 50\n');
    await flush();
    input.write('disconnect +15551234567\n');
    await flush();
    expect(chats).toHaveBeenCalledWith('+15551234567', '2');
    expect(analyze).toHaveBeenCalledWith('+15551234567', '1', '50');
    expect(disconnect).toHaveBeenCalledWith('+15551234567');
  });

  test('typed commands still execute and per-account health is not shadowed by dashboard case', async () => {
    input.write('status\n');
    await flush();
    expect(dashboard.displayHealthDashboard).toHaveBeenCalledTimes(3);
    input.write('health +15551234567\n');
    await flush();
    expect(dashboard.displayHealthDashboard).toHaveBeenCalledTimes(4);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Device manager not available'));
  });

  test('case-insensitive typed analytics aliases still dispatch while data retains its case', async () => {
    const analytics = jest.fn().mockResolvedValue(undefined);
    dashboard.rl.close();
    dashboard.rl = readline.createInterface({ input, output: new PassThrough(), terminal: false });
    await dashboard.startInteractiveMonitoring({ onAnalyticsReportRequested: analytics });
    input.write('METRICS REPORT\n');
    await flush();
    expect(analytics).toHaveBeenCalledWith('full');
  });

  test('6.4 opens terminal campaigns; active campaign numbers bypass the main menu and dashboard redraw', async () => {
    dashboard.rl.close();
    dashboard.rl = readline.createInterface({ input, output: new PassThrough(), terminal: false });
    let active = false;
    const onCampaigns = jest.fn(() => { active = true; });
    const onCampaignInput = jest.fn(async text => { if (text === '0') active = false; });
    await dashboard.startInteractiveMonitoring({ onCampaigns, onCampaignInput, isCampaignMenuActive: () => active });
    input.write('6.4\n');
    await flush();
    expect(onCampaigns).toHaveBeenCalledTimes(1);
    dashboard.displayHealthDashboard.mockClear();
    dashboard.refreshDashboard();
    expect(dashboard.displayHealthDashboard).not.toHaveBeenCalled();
    input.write('1\n');
    await flush();
    expect(onCampaignInput).toHaveBeenCalledWith('1');
    expect(dashboard.numberMenu.path).toEqual([]);
    input.write('0\n');
    await flush();
    expect(dashboard.displayHealthDashboard).toHaveBeenCalledWith(true);
  });
});
