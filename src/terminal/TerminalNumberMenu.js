import registry from '../commands/LindaCommandRegistry.js';
import services from '../core/ServiceRegistry.js';

const action = (label, command, fields = [], extra = {}) => ({ label, command, fields, ...extra });
const field = (label, defaultValue, pattern) => ({ label, defaultValue, pattern });
const phoneField = field('Phone number including country code', undefined, /^\+?[1-9]\d{6,14}$/);
const spreadsheetField = field('Spreadsheet ID (no spaces)', undefined, /^\S+$/);
const sheetField = field('Sheet name (no spaces)', undefined, /^\S+$/);

export default class TerminalNumberMenu {
  constructor(dashboard, output = console.log) {
    this.dashboard = dashboard;
    this.output = output;
    this.path = [];
    this.pending = null;
    this.root = null;
  }

  refresh() {
    const accounts = this.dashboard.accountConfigManager?.getAllAccounts() || [];
    const devices = this.dashboard.deviceManager?.getAllDevices() || [];
    const commands = registry.getAllCommands();
    const handler = services.get('commandHandler');
    const categories = [...new Set(commands.map(command => command.category))].sort();
    const knownPhones = new Set(accounts.map(account => account.phoneNumber));
    const entries = [...accounts, ...devices.filter(device => !knownPhones.has(device.phoneNumber))];
    const accountNodes = entries.map(account => {
      const phone = account.phoneNumber;
      const role = ['primary', 'master'].includes(account.role) ? 'master' : 'servant';
      const manager = this.dashboard.connectionManagers?.get(phone);
      const active = this.dashboard.accountClients?.has(phone) && manager?.state === 'CONNECTED';
      const busy = manager?.isInitializing || manager?.isReconnecting;
      return {
        label: `${account.displayName || account.name || phone} (${phone})`,
        children: [
          action('Device details', `device ${phone}`),
          action('Account health', `health ${phone}`),
          action('Account metrics', `stats ${phone}`),
          busy ? { label: 'Recovery in progress', info: 'Wait for the current connection attempt to finish.' } :
            active ? { label: 'Session is active', info: 'No session recovery is needed.' } : action('Recover saved session', `recover ${phone}`),
          active || busy ? { label: 'Device linking not needed', info: 'Keep the current active or connecting session.' } :
            action(`Authenticate ${role} (choose QR/code)`, `relink ${role} ${phone}`),
          action('Disconnect locally (keep session)', `disconnect ${phone}`, [], { confirm: true }),
          action('Account analytics', `analytics account ${phone}`),
          { label: 'Conversations (local, read-only)', children: [
            action('List chats (refresh numbers)', `chats ${phone}`),
            action('More chats by page', `chats ${phone}`, [field('Page number', '2', /^[1-9]\d*$/)]),
            action('Analyze selected chat', `analyze ${phone}`, [
              field('Chat number from current list', undefined, /^[1-9]\d*$/),
              field('Message sample limit (1-500)', '100', /^(?:[1-9]\d?|[1-4]\d{2}|500)$/),
            ]),
          ] },
        ].map(item => ({ ...item, phone })),
      };
    });
    this.summary = `Accounts: ${accounts.length} | Devices: ${devices.length} | WhatsApp commands: ${commands.length}`;
    this.root = {
      label: 'Linda numbered menu',
      children: [
        { label: 'Devices and accounts', children: [
          action('All accounts', 'accounts'),
          action('All devices', 'list'),
          action('Master accounts', 'masters'),
          action('Servant accounts', 'servants'),
          action('Link primary master', 'link master'),
          action('Add master account', 'link master', [phoneField, field('Display name', '')]),
          action('Restore all sessions', 'restore-sessions'),
          { label: `Select account/device (${entries.length})`, children: accountNodes },
          action('Relink master by phone', 'relink master', [phoneField]),
          action('Relink servant by phone', 'relink servant', [phoneField]),
          action('Relink device by phone', 'relink', [phoneField]),
          action('Request pairing code by phone', 'code', [phoneField]),
          action('Device details by phone', 'device', [phoneField]),
          action('Account health by phone', 'health', [phoneField]),
          action('Account metrics by phone', 'stats', [phoneField]),
          action('Recover session by phone', 'recover', [phoneField]),
        ] },
        { label: 'Link master directly (no saved preference)', children: [
          action('Link with pairing code', 'link-code'),
          action('Link with QR code', 'link-qr'),
        ] },
        { label: 'Contacts / Goraha', children: [
          action('Contact status', 'goraha status'),
          action('Verify and recount', 'goraha verify'),
          action('Contact count', 'goraha contacts'),
          action('Search contacts', 'goraha filter', [field('Search text')]),
        ] },
        { label: 'Analytics', children: [
          action('Real-time dashboard', 'analytics'),
          action('Full report', 'analytics report'),
          action('Uptime report', 'analytics uptime'),
          action('Account analytics by phone', 'analytics account', [phoneField]),
        ] },
        { label: 'Google Sheets', children: [
          action('Read data', 'sheets read', [spreadsheetField, field('Range (no spaces)', 'Sheet1', /^\S+$/)]),
          action('Add row', 'sheets add', [spreadsheetField, sheetField, field('Row values separated by spaces')]),
          action('Update cell', 'sheets update', [spreadsheetField, field('Cell, e.g. Sheet1!A1 (no spaces)', undefined, /^\S+$/), field('Value')]),
          action('Delete row', 'sheets delete', [spreadsheetField, sheetField, field('Positive row number', '1', /^[1-9]\d*$/)], { confirm: true }),
          action('Search data', 'sheets search', [spreadsheetField, field('Range (no spaces)', 'Sheet1', /^\S+$/), field('Search text')]),
          action('Spreadsheet metadata', 'sheets info', [spreadsheetField]),
        ] },
        { label: 'System', children: [
          action('Health dashboard', 'status'),
          action('Text command help', 'help'),
          action('Exit terminal monitoring', 'quit', [], { confirm: true }),
          action('Campaigns (terminal only; headless sending)', 'campaigns'),
        ] },
        { label: `WhatsApp command catalog (${commands.length}; reference only)`, children: categories.map(category => ({
          label: category,
          children: commands.filter(command => command.category === category)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(command => ({
              label: `!${command.name}${command.enabled ? '' : ' [disabled]'}`,
              info: [
                command.description, `Usage: ${command.usage}`,
                `Examples: ${(command.examples || []).join(' | ')}`,
                `Enabled: ${command.enabled ? 'yes' : 'no'} | Authentication: ${command.requiresAuth ? 'required' : 'not required'}`,
                `Handler registered: ${handler?.commandHandlers?.has(command.name) ? 'yes (may still be a placeholder)' : 'no'}`,
                command.helpText,
                'WhatsApp-only reference: not executed by this terminal menu.',
              ].filter(Boolean).join('\n'),
            })),
        })) },
      ],
    };
    const terminalActions = this.root.children.slice(0, 6)
      .reduce((total, node) => total + this.countActions(node), 0);
    this.summary += ` | Terminal actions: ${terminalActions}`;
    this.path = [];
    this.pending = null;
    this.render();
  }

  nodeAt(path) {
    return path.reduce((node, number) => node?.children?.[number - 1], this.root);
  }

  countActions(node) {
    return node.children ? node.children.reduce((sum, child) => sum + this.countActions(child), 0) : 1;
  }

  render() {
    const node = this.nodeAt(this.path);
    this.output(`\n${node.label}\n${this.summary}`);
    node.children.forEach((child, index) => {
      const code = [...this.path, index + 1].join('.');
      const counts = child.children
        ? ` [${child.children.length} items; ${this.countActions(child)} actions/references]` : '';
      this.output(`  ${index + 1}. [${code}] ${child.label}${counts}`);
    });
    this.output('Number = select | dotted code = direct | 0 = back/cancel | 00 = home | menu = refresh counts');
    this.output('Typed commands still work. Codes stay fixed until you refresh the menu.');
  }

  promptField() {
    const { item, values } = this.pending;
    const next = item.fields[values.length];
    this.output(`${next.label}${next.defaultValue !== undefined ? ` [${next.defaultValue || 'optional'}]` : ''} (0 cancels):`);
  }

  finishAction(item, values) {
    if (item.phone) {
      const accounts = this.dashboard.accountConfigManager?.getAllAccounts() || [];
      const devices = this.dashboard.deviceManager?.getAllDevices() || [];
      if (![...accounts, ...devices].some(account => account.phoneNumber === item.phone)) {
        this.output('That account/device is no longer available. Type menu to refresh the list.');
        return { handled: true };
      }
    }
    const command = [item.command, ...values].filter(value => value !== '').join(' ');
    if (item.confirm) {
      this.pending = { confirmation: command };
      this.output(`Confirm "${command}": 1 = execute, 0 = cancel`);
      return { handled: true };
    }
    this.output(`Selected: ${command}`);
    return { handled: true, command };
  }

  handleInput(input) {
    const text = input.trim();
    if (this.pending) {
      if (text === '0' || text.toLowerCase() === 'cancel') {
        this.pending = null;
        this.output('Cancelled.');
        this.render();
        return { handled: true };
      }
      if (this.pending.confirmation) {
        if (text !== '1') {
          this.output('Enter 1 to confirm, or 0 to cancel.');
          return { handled: true };
        }
        const command = this.pending.confirmation;
        this.pending = null;
        return { handled: true, command };
      }
      const next = this.pending.item.fields[this.pending.values.length];
      const value = text || next.defaultValue;
      if (value === undefined) {
        this.output('A value is required.');
        this.promptField();
        return { handled: true };
      }
      if (/\r|\n/.test(value) || (next.pattern && !next.pattern.test(value))) {
        this.output(`Invalid value for ${next.label}. Enter a valid single-line value, or 0 to cancel.`);
        return { handled: true };
      }
      this.pending.values.push(value);
      if (this.pending.values.length < this.pending.item.fields.length) {
        this.promptField();
        return { handled: true };
      }
      const { item, values } = this.pending;
      this.pending = null;
      return this.finishAction(item, values);
    }
    if (text.toLowerCase() === 'menu') {
      this.refresh();
      return { handled: true };
    }
    if (!/^\d+(?:\.\d+)*$/.test(text)) {
      if (/^\d+\./.test(text)) {
        this.output('Invalid number code. Use whole-number paths such as 1.8.1.');
        return { handled: true };
      }
      return { handled: false };
    }
    if (!this.root) {
      this.refresh();
    }
    if (text === '0' || text === '00') {
      this.path = text === '00' ? [] : this.path.slice(0, -1);
      this.render();
      return { handled: true };
    }
    const selectedPath = text.includes('.') ? text.split('.').map(Number) : [...this.path, Number(text)];
    if (selectedPath.some(number => !Number.isSafeInteger(number) || number < 1)) {
      this.output('Invalid number code. Type menu to view available choices.');
      return { handled: true };
    }
    const item = this.nodeAt(selectedPath);
    if (!item) {
      this.output('Unknown number code. Type menu to view available choices.');
      return { handled: true };
    }
    if (item.children) {
      this.path = selectedPath;
      this.render();
    } else if (item.info) {
      this.output(item.info);
    } else if (item.fields.length) {
      this.pending = { item, values: [] };
      this.promptField();
    } else {
      return this.finishAction(item, []);
    }
    return { handled: true };
  }
}
