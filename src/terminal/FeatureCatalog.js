/**
 * FeatureCatalog.js
 *
 * Every terminal feature with a stable numeric ID (F1..Fn) and a usage counter.
 * Type `features` to list them, or `f<id>` / `#<id>` (e.g. f7, #7, f7 +971...) to run one.
 * Usage counters are kept in data/feature-usage.json so they survive restarts.
 */

import fs from 'fs';
import path from 'path';

export const FEATURES = Object.freeze([
  // Devices & linking
  { id: 1, command: 'status', name: 'Dashboard', category: 'Devices', aliases: [''] },
  { id: 2, command: 'link-code', name: 'Link master (code)', category: 'Devices' },
  { id: 3, command: 'link-qr', name: 'Link master (QR)', category: 'Devices' },
  { id: 4, command: 'link', name: 'Add master account', category: 'Devices', usage: 'link master [+phone] [name]' },
  { id: 5, command: 'relink', name: 'Relink device', category: 'Devices', usage: 'relink master|servant [+phone]' },
  { id: 6, command: 'code', name: 'New pairing code', category: 'Devices', usage: 'code <+phone>', needsArgs: true },
  { id: 7, command: 'recover', name: 'Reactivate device', category: 'Devices', usage: 'recover <+phone>', needsArgs: true },
  { id: 8, command: 'restore', name: 'Restore all sessions', category: 'Devices', aliases: ['restore-sessions'] },
  { id: 9, command: 'disconnect', name: 'Disconnect (keep session)', category: 'Devices', usage: 'disconnect <+phone>', needsArgs: true },
  { id: 10, command: 'device', name: 'Device details', category: 'Devices', usage: 'device <+phone>', needsArgs: true },
  { id: 11, command: 'list', name: 'List devices', category: 'Devices' },
  { id: 12, command: 'masters', name: 'Master accounts', category: 'Devices' },
  { id: 13, command: 'servants', name: 'Servant accounts', category: 'Devices' },
  { id: 14, command: 'accounts', name: 'All accounts', category: 'Devices' },
  // Health & analytics
  { id: 15, command: 'health', name: 'Account health', category: 'Health', usage: 'health [+phone]' },
  { id: 16, command: 'stats', name: 'Account metrics', category: 'Health', usage: 'stats <+phone>' },
  { id: 17, command: 'score', name: 'Health score 0-100', category: 'Health', usage: 'score [+phone]', restored: true },
  { id: 18, command: 'analytics', name: 'Analytics', category: 'Health', aliases: ['metrics'], usage: 'analytics [report|uptime|account <phone>]' },
  // Messaging
  { id: 19, command: 'campaigns', name: 'Message Sender', category: 'Messaging' },
  { id: 20, command: 'send', name: 'Send one message', category: 'Messaging', usage: 'send <number> <message>', needsArgs: true },
  { id: 21, command: 'validate', name: 'Validate number', category: 'Messaging', usage: 'validate <number>', needsArgs: true },
  { id: 22, command: 'chats', name: 'List chats', category: 'Messaging', usage: 'chats [+phone] [page]' },
  { id: 23, command: 'analyze', name: 'Analyze chat', category: 'Messaging', usage: 'analyze <+phone> <n> [max]', needsArgs: true },
  // Intelligence (restored from archive)
  { id: 24, command: 'sentiment', name: 'Sentiment of text', category: 'Intelligence', usage: 'sentiment <text>', needsArgs: true, restored: true },
  { id: 25, command: 'intent', name: 'Intent of text', category: 'Intelligence', usage: 'intent <text>', needsArgs: true, restored: true },
  { id: 26, command: 'similar', name: 'Compare names/phones', category: 'Intelligence', usage: 'similar <a> | <b>', needsArgs: true, restored: true },
  { id: 27, command: 'dedupe', name: 'Find duplicate contacts', category: 'Intelligence', usage: 'dedupe <file.csv|file.json>', needsArgs: true, restored: true },
  // Data
  { id: 28, command: 'goraha', name: 'Goraha contacts', category: 'Data', usage: 'goraha [verify|contacts|filter <text>]' },
  { id: 29, command: 'sheets', name: 'Google Sheets', category: 'Data', aliases: ['google'], usage: 'sheets read|add|update|delete|search|info ...' },
  // System
  { id: 30, command: 'menu', name: 'Numbered menu', category: 'System' },
  { id: 31, command: 'features', name: 'Feature list', category: 'System' },
  { id: 32, command: 'help', name: 'Help', category: 'System' },
  { id: 33, command: 'quit', name: 'Quit', category: 'System', aliases: ['exit'] },
]);

const DEFAULT_FILE = path.join(process.cwd(), 'data', 'feature-usage.json');

export class FeatureCatalog {
  /**
   * @param {{file?: string|null}} options - file=null disables persistence (tests).
   */
  constructor({ file = process.env.NODE_ENV === 'test' ? null : DEFAULT_FILE } = {}) {
    this.file = file;
    this.features = FEATURES;
    this.byCommand = new Map();
    for (const feature of FEATURES) {
      for (const key of [feature.command, ...(feature.aliases || [])]) this.byCommand.set(key, feature);
    }
    this.counts = new Map(FEATURES.map(feature => [feature.id, 0]));
    this.sessionCounts = new Map();
    this.lastUsed = null;
    this.saveTimer = null;
    this.dirty = false;
    this.load();
    // Write the last counter changes synchronously when the process exits normally.
    if (this.file) process.once('exit', () => this.dirty && this.flush());
  }

  load() {
    if (!this.file) return;
    try {
      const saved = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      for (const [id, count] of Object.entries(saved.counts || {})) {
        if (this.counts.has(Number(id)) && Number.isFinite(count)) this.counts.set(Number(id), count);
      }
    } catch {
      // No saved counters yet.
    }
  }

  save() {
    if (!this.file) return;
    this.dirty = true;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), 1000);
    this.saveTimer.unref?.();
  }

  flush() {
    if (!this.file || !this.dirty) return;
    clearTimeout(this.saveTimer);
    this.dirty = false;
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify({ updatedAt: new Date().toISOString(), counts: Object.fromEntries(this.counts) }, null, 2));
      fs.renameSync(tmp, this.file);
    } catch {
      // Counters are informational; never break a command because of them.
    }
  }

  get(idOrCommand) {
    if (typeof idOrCommand === 'number') return this.features.find(feature => feature.id === idOrCommand) || null;
    return this.byCommand.get(String(idOrCommand).toLowerCase()) || null;
  }

  /** Count one use of a command. Returns the matching feature or null. */
  record(command) {
    const feature = this.get(command);
    if (!feature) return null;
    this.counts.set(feature.id, this.counts.get(feature.id) + 1);
    this.sessionCounts.set(feature.id, (this.sessionCounts.get(feature.id) || 0) + 1);
    this.lastUsed = feature;
    this.save();
    return feature;
  }

  /**
   * Translate `f7 args`, `#7 args` or `F7` into the real command line.
   * Returns null when the input is not a feature shortcut.
   */
  resolve(input) {
    const match = /^(?:f|#)(\d{1,3})(?:\s+(.*))?$/i.exec(String(input).trim());
    if (!match) return null;
    const feature = this.get(Number(match[1]));
    if (!feature) return { error: `No feature F${match[1]}. Type features to see F1-F${this.features.length}.` };
    const args = (match[2] || '').trim();
    if (feature.needsArgs && !args) {
      return { error: `F${feature.id} ${feature.name} needs input. Usage: f${feature.id} ${feature.usage.split(' ').slice(1).join(' ')}` };
    }
    return { feature, command: args ? `${feature.command} ${args}` : feature.command };
  }

  totals() {
    let total = 0;
    let used = 0;
    for (const count of this.counts.values()) {
      total += count;
      if (count) used++;
    }
    const session = [...this.sessionCounts.values()].reduce((sum, count) => sum + count, 0);
    return { features: this.features.length, used, total, session, restored: this.features.filter(f => f.restored).length };
  }

  summaryLine() {
    const t = this.totals();
    return `Features: ${t.features} (F1-F${t.features}) | Used: ${t.used} | Total uses: ${t.total} | This session: ${t.session}` +
      `${this.lastUsed ? ` | Last: F${this.lastUsed.id} ${this.lastUsed.command}` : ''} | Run: f<id> or features`;
  }

  /** Compact multi-column grid of `F<id> command ×count`, fitted to `width` characters. */
  gridLines(width = 100) {
    const cells = this.features.map(feature => `F${feature.id} ${feature.command}${feature.restored ? '*' : ''} ×${this.counts.get(feature.id)}`);
    const cellWidth = Math.max(...cells.map(cell => cell.length)) + 2;
    const columns = Math.max(1, Math.floor((width + 2) / cellWidth));
    const lines = [];
    for (let i = 0; i < cells.length; i += columns) {
      lines.push(cells.slice(i, i + columns).map(cell => cell.padEnd(cellWidth)).join('').trimEnd());
    }
    return lines;
  }

  /** Full list grouped by category, for the `features` command. */
  listLines() {
    const lines = [];
    let category = '';
    for (const feature of this.features) {
      if (feature.category !== category) {
        category = feature.category;
        lines.push('', `  ${category.toUpperCase()}`);
      }
      const usage = feature.usage || feature.command || '(Enter)';
      lines.push(`   F${String(feature.id).padEnd(3)} ${feature.name.padEnd(26)} ${usage.padEnd(42)} used ×${this.counts.get(feature.id)}${feature.restored ? '  [restored]' : ''}`);
    }
    return ['', this.summaryLine(), ...lines, '', '  * = restored from the archived version. Run any feature with f<id> [args], e.g. f21 0501234567', ''];
  }
}

export default FeatureCatalog;
