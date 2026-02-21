/**
 * ====================================================================
 * WHATSAPP COMMAND BRIDGE (Phase 31)
 * ====================================================================
 * Bridges terminal dashboard commands to WhatsApp chat.
 *
 * Allows authorized master accounts to send "linda <command>" messages
 * to the primary master account (Linda) for remote command execution.
 *
 * Features:
 * - Console.log output capture → WhatsApp reply
 * - Authorization: only known accounts (excluding primary) can send
 * - All terminal dashboard commands supported
 * - Minimal WhatsApp-friendly text formatting
 * - Message chunking for long outputs
 *
 * Usage: Send "linda health" to the primary master's WhatsApp number
 *
 * @since Phase 31 — February 21, 2026
 */

import services from '../utils/ServiceRegistry.js';

export class WhatsAppCommandBridge {
  /**
   * @param {Object} opts
   * @param {Function}   opts.logBot                 - Logging function
   * @param {object|null} opts.accountConfigManager   - Account configuration
   * @param {object|null} opts.terminalHealthDashboard - Health dashboard instance
   * @param {object|null} opts.deviceLinkedManager     - Device tracking manager
   */
  constructor(opts = {}) {
    this.logBot = opts.logBot || console.log;
    this.accountConfigManager = opts.accountConfigManager || null;
    this.terminalHealthDashboard = opts.terminalHealthDashboard || null;
    this.deviceLinkedManager = opts.deviceLinkedManager || null;

    // Command prefix (case-insensitive)
    this.prefix = 'linda';

    // Activity tracking
    this.stats = {
      totalCommands: 0,
      commandsByName: {},
      lastCommand: null,
      lastCommandTime: null,
      errors: 0,
    };

    this.logBot('✅ WhatsAppCommandBridge initialized (Phase 31)', 'success');
  }

  // ═══════════════════════════════════════════════════════════════════
  // AUTHORIZATION & ROUTING
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Normalize a phone number for comparison.
   * Strips +, spaces, dashes, and WhatsApp suffixes.
   */
  normalizePhone(phone) {
    if (!phone) return '';
    return phone
      .replace(/[\+\-\s]/g, '')
      .replace(/@c\.us$/, '')
      .replace(/@s\.whatsapp\.net$/, '');
  }

  /**
   * Check if a sender's WhatsApp ID belongs to an authorized account.
   * Returns true for any known account EXCEPT the primary (Linda herself).
   */
  isAuthorizedSender(senderWhatsAppId) {
    const acm = this.accountConfigManager || services.get('accountConfigManager');
    if (!acm) return false;

    const senderNormalized = this.normalizePhone(senderWhatsAppId);
    const primaryPhone = this.normalizePhone(acm.getMasterPhoneNumber());

    // Don't allow primary to trigger commands on itself
    if (senderNormalized === primaryPhone) return false;

    // Check if sender is a known account
    const allAccounts = acm.getAllAccounts();
    return allAccounts.some(
      (acc) => this.normalizePhone(acc.phoneNumber) === senderNormalized
    );
  }

  /**
   * Check if a message should be handled by this bridge.
   *
   * Conditions:
   *  1. Message received on the primary master's client
   *  2. Direct message (not group)
   *  3. Not from ourselves
   *  4. Body starts with "linda" (case-insensitive)
   *  5. Sender is a known account (not the primary)
   */
  shouldHandle(msg, phoneNumber) {
    const acm = this.accountConfigManager || services.get('accountConfigManager');
    if (!acm) return false;

    // Only on the primary master's client
    const masterPhone = acm.getMasterPhoneNumber();
    if (phoneNumber !== masterPhone) return false;

    // Only direct messages
    if (msg.from?.includes('@g.us')) return false;

    // Not our own messages
    if (msg.fromMe) return false;

    // Check prefix: "linda" or "linda <command>"
    const body = (msg.body || '').trim().toLowerCase();
    if (body !== this.prefix && !body.startsWith(this.prefix + ' ')) return false;

    // Check authorization
    return this.isAuthorizedSender(msg.from);
  }

  /**
   * Handle an incoming "linda <command>" message.
   * @returns {boolean} true if the message was handled
   */
  async handleMessage(msg) {
    const body = (msg.body || '').trim();

    // Parse: "linda <command> [args...]"
    const afterPrefix = body.substring(this.prefix.length).trim();
    if (!afterPrefix) {
      await msg.reply(this.getHelpText());
      return true;
    }

    const parts = afterPrefix.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Track stats
    this.stats.totalCommands++;
    this.stats.commandsByName[command] = (this.stats.commandsByName[command] || 0) + 1;
    this.stats.lastCommand = command;
    this.stats.lastCommandTime = new Date();

    this.logBot(`📱 WhatsApp Bridge: "${command}" from ${msg.from}`, 'info');

    try {
      const callbacks = services.get('terminalCallbacks');

      switch (command) {
        case 'help':
          await msg.reply(this.getHelpText());
          break;

        case 'health':
        case 'status':
          await this.handleHealthStatus(msg, args);
          break;

        case 'accounts':
          await this.handleAccounts(msg);
          break;

        case 'stats':
          await this.handleStats(msg, args);
          break;

        case 'relink':
          await this.handleRelink(msg, args, callbacks);
          break;

        case 'recover':
          await this.handleRecover(msg, args);
          break;

        case 'restore':
          await this.handleRestore(msg, callbacks);
          break;

        case 'goraha':
          await this.handleGoraha(msg, args, callbacks);
          break;

        case 'analytics':
        case 'metrics':
          await this.handleAnalytics(msg, args, callbacks);
          break;

        case 'sheets':
          await this.handleSheets(msg, args, callbacks);
          break;

        case 'link':
          await this.handleLink(msg, args, callbacks);
          break;

        case 'list':
          await this.handleList(msg);
          break;

        case 'device':
          await this.handleDevice(msg, args);
          break;

        case 'bridge-stats':
          await this.handleBridgeStats(msg);
          break;

        default:
          await msg.reply(
            `❓ Unknown command: "${command}"\n\nType "linda help" for available commands.`
          );
          break;
      }

      return true;
    } catch (error) {
      this.stats.errors++;
      this.logBot(`❌ WhatsApp Bridge error: ${error.message}`, 'error');
      await msg.reply(`❌ Command error: ${error.message}`);
      return true;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // OUTPUT CAPTURE
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Capture all console.log output during a function's execution.
   * Temporarily replaces console.log/console.clear, restores after.
   */
  async captureOutput(fn) {
    const logs = [];
    const originalLog = console.log;
    const originalClear = console.clear;

    console.log = (...args) => {
      const line = args
        .map((a) => (typeof a === 'string' ? a : String(a)))
        .join(' ');
      logs.push(line);
    };
    console.clear = () => {}; // No-op for WhatsApp

    try {
      await fn();
    } finally {
      console.log = originalLog;
      console.clear = originalClear;
    }

    // Clean output
    let output = logs.join('\n');

    // Strip ANSI escape codes
    output = output.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');

    // Collapse multiple blank lines
    output = output.replace(/\n{3,}/g, '\n\n');

    return output.trim();
  }

  /**
   * Send output to WhatsApp, splitting into chunks if too long.
   */
  async sendOutput(msg, output, fallback = '✅ Done.') {
    if (!output || output.trim().length === 0) {
      await msg.reply(fallback);
      return;
    }

    const MAX_LENGTH = 4000;

    if (output.length <= MAX_LENGTH) {
      await msg.reply(output);
    } else {
      // Split into readable chunks
      const chunks = [];
      let remaining = output;
      while (remaining.length > 0) {
        if (remaining.length <= MAX_LENGTH) {
          chunks.push(remaining);
          break;
        }
        let splitAt = remaining.lastIndexOf('\n', MAX_LENGTH);
        if (splitAt === -1 || splitAt < MAX_LENGTH / 2) splitAt = MAX_LENGTH;
        chunks.push(remaining.substring(0, splitAt));
        remaining = remaining.substring(splitAt + 1);
      }

      for (let i = 0; i < chunks.length; i++) {
        const header = chunks.length > 1 ? `📄 (${i + 1}/${chunks.length})\n` : '';
        await msg.reply(header + chunks[i]);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // COMMAND HANDLERS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * health / status — Show health dashboard or per-account health
   */
  async handleHealthStatus(msg, args) {
    if (args[0]) {
      // Per-account health
      const phone = args[0];
      const dm = this.deviceLinkedManager || services.get('deviceLinkedManager');
      if (!dm) {
        await msg.reply('⚠️ Device manager not available');
        return;
      }

      const device = dm.getDevice(phone);
      if (!device) {
        await msg.reply(`❌ Account not found: ${phone}`);
        return;
      }

      const healthScore = this._calculateHealthScore(device);
      const statusIcon = device.isOnline ? '🟢' : '🔴';

      await msg.reply(
        `📊 *Health: ${phone}*\n` +
        `${statusIcon} ${device.isOnline ? 'Online' : 'Offline'}\n` +
        `🔗 Status: ${(device.status || '--').toUpperCase()}\n` +
        `💯 Health: ${healthScore}/100\n` +
        `🔐 Auth: ${device.authMethod || '--'}\n` +
        `📅 Linked: ${device.linkedAt ? new Date(device.linkedAt).toLocaleString() : '--'}\n` +
        `💓 Heartbeat: ${device.lastHeartbeat ? new Date(device.lastHeartbeat).toLocaleTimeString() : '--'}` +
        (device.lastError ? `\n⚠️ Error: ${(device.lastError.message || device.lastError).substring(0, 100)}` : '')
      );
    } else {
      // Full health dashboard (capture terminal output)
      const output = await this.captureOutput(() => {
        const thd = this.terminalHealthDashboard;
        if (thd) {
          thd.displayHealthDashboard();
        } else {
          console.log('⚠️ Health dashboard not available');
        }
      });
      await this.sendOutput(msg, output, '⚠️ No health data available');
    }
  }

  /**
   * Calculate a simple health score for a device.
   */
  _calculateHealthScore(device) {
    if (!device) return 0;
    let score = 0;
    if (device.isOnline) score += 40;
    if (device.status === 'linked') score += 30;
    if (device.lastHeartbeat) {
      const ago = Date.now() - new Date(device.lastHeartbeat).getTime();
      if (ago < 60000) score += 30;
      else if (ago < 300000) score += 20;
      else if (ago < 600000) score += 10;
    }
    return Math.min(score, 100);
  }

  /**
   * accounts — List all accounts with status
   */
  async handleAccounts(msg) {
    const acm = this.accountConfigManager || services.get('accountConfigManager');
    const dm = this.deviceLinkedManager || services.get('deviceLinkedManager');

    if (!acm) {
      await msg.reply('⚠️ Account manager not available');
      return;
    }

    const accounts = acm.getAllAccounts();
    if (accounts.length === 0) {
      await msg.reply('No accounts configured.');
      return;
    }

    let text = `📱 *Accounts (${accounts.length})*\n`;
    accounts.forEach((acc, i) => {
      const device = dm?.getDevice(acc.phoneNumber);
      const statusIcon = device?.isOnline ? '🟢' : '🔴';
      const statusText = device?.status?.toUpperCase() || 'UNKNOWN';
      text += `\n${i + 1}. ${statusIcon} ${acc.phoneNumber}\n`;
      text += `   ${acc.displayName} · ${acc.role.toUpperCase()} · ${statusText}`;
    });

    await msg.reply(text);
  }

  /**
   * stats <+phone> — Show per-account metrics
   */
  async handleStats(msg, args) {
    const phone = args[0];
    if (!phone) {
      await msg.reply('⚠️ Usage: linda stats <+phone>');
      return;
    }

    const dm = this.deviceLinkedManager || services.get('deviceLinkedManager');
    if (!dm) {
      await msg.reply('⚠️ Device manager not available');
      return;
    }

    const device = dm.getDevice(phone);
    if (!device) {
      await msg.reply(`❌ Account not found: ${phone}`);
      return;
    }

    const uptime = device.uptime || 0;
    const uptimeMins = Math.floor(uptime / 60000);
    const uptimeHours = Math.floor(uptimeMins / 60);
    const uptimeDays = Math.floor(uptimeHours / 24);

    let uptimeStr = `${uptimeMins}m`;
    if (uptimeDays > 0) uptimeStr = `${uptimeDays}d ${uptimeHours % 24}h ${uptimeMins % 60}m`;
    else if (uptimeHours > 0) uptimeStr = `${uptimeHours}h ${uptimeMins % 60}m`;

    const online = device.isOnline ? '🟢 Online' : '🔴 Offline';

    await msg.reply(
      `📈 *Stats: ${phone}*\n` +
      `${online}\n` +
      `⏱️ Uptime: ${uptimeStr}\n` +
      `🔗 Status: ${(device.status || '--').toUpperCase()}\n` +
      `📊 Heartbeats: ${device.heartbeatCount || 0}\n` +
      `🔄 Link attempts: ${device.linkAttempts || 0}/${device.maxLinkAttempts || 5}\n` +
      `🕐 Last activity: ${device.lastActivity ? new Date(device.lastActivity).toLocaleTimeString() : '--'}\n` +
      `🛠️ Recovery: ${device.recoveryMode ? '⚠️ Yes' : '✅ No'}`
    );
  }

  /**
   * relink master|servant|<phone> — Re-link an account
   */
  async handleRelink(msg, args, callbacks) {
    if (!callbacks) {
      await msg.reply('⚠️ Terminal callbacks not available');
      return;
    }

    const sub = args[0];
    const phone = args[1];

    if (sub === 'master') {
      await msg.reply(`⏳ Re-linking master${phone ? ': ' + phone : ''}...`);
      const output = await this.captureOutput(() => callbacks.onRelinkMaster?.(phone));
      await this.sendOutput(msg, output, '✅ Relink initiated.');
    } else if (sub === 'servant') {
      if (!phone) {
        await msg.reply('⚠️ Usage: linda relink servant <+phone>');
        return;
      }
      await msg.reply(`⏳ Re-linking servant: ${phone}...`);
      const output = await this.captureOutput(() => callbacks.onRelinkServant?.(phone));
      await this.sendOutput(msg, output, '✅ Relink initiated.');
    } else if (sub) {
      // Treat first arg as phone number
      await msg.reply(`⏳ Re-linking: ${sub}...`);
      const output = await this.captureOutput(() => callbacks.onRelinkDevice?.(sub));
      await this.sendOutput(msg, output, '✅ Relink initiated.');
    } else {
      await msg.reply(
        '⚠️ *Relink Usage:*\n' +
        'linda relink master [+phone]\n' +
        'linda relink servant <+phone>\n' +
        'linda relink <+phone>'
      );
    }
  }

  /**
   * recover <+phone> — Attempt session restoration
   */
  async handleRecover(msg, args) {
    const phone = args[0];
    if (!phone) {
      await msg.reply('⚠️ Usage: linda recover <+phone>');
      return;
    }

    const dm = this.deviceLinkedManager || services.get('deviceLinkedManager');
    if (!dm) {
      await msg.reply('⚠️ Device manager not available');
      return;
    }

    const device = dm.getDevice(phone);
    if (!device) {
      await msg.reply(`❌ Account not found: ${phone}`);
      return;
    }

    await msg.reply(`⏳ Attempting session restore for ${phone}...`);

    try {
      const { SessionManager } = await import('../utils/SessionManager.js');
      const canRestore = SessionManager.canRestoreSession(phone);

      if (canRestore) {
        dm.markDeviceLinked(phone, {
          authMethod: 'restore',
          linkedAt: new Date().toISOString(),
        });
        await msg.reply(`✅ Valid session found for ${phone}.\nSession restored.`);
      } else {
        await msg.reply(
          `❌ No valid session for ${phone}.\n💡 Use "linda relink ${phone}" to re-link.`
        );
      }
    } catch (err) {
      await msg.reply(`❌ Recovery error: ${err.message}`);
    }
  }

  /**
   * restore — Restore all previous sessions
   */
  async handleRestore(msg, callbacks) {
    if (!callbacks?.onRestoreAllSessions) {
      await msg.reply('⚠️ Restore handler not available');
      return;
    }

    await msg.reply('⏳ Restoring all sessions...');
    const output = await this.captureOutput(() => callbacks.onRestoreAllSessions());
    await this.sendOutput(msg, output, '✅ Restore complete.');
  }

  /**
   * goraha [status|verify|contacts|filter <text>]
   */
  async handleGoraha(msg, args, callbacks) {
    const sub = args[0] || 'status';

    if (sub === 'verify' || sub === 'v') {
      if (!callbacks?.onGorahaStatusRequested) {
        await msg.reply('⚠️ Goraha service not available');
        return;
      }
      await msg.reply('⏳ Verifying GorahaBot...');
      const output = await this.captureOutput(() => callbacks.onGorahaStatusRequested(true));
      await this.sendOutput(msg, output, '✅ Verification complete.');
    } else if (sub === 'contacts' || sub === 'count') {
      if (!callbacks?.onGorahaStatusRequested) {
        await msg.reply('⚠️ Goraha service not available');
        return;
      }
      await msg.reply('⏳ Fetching contacts count...');
      const output = await this.captureOutput(() => callbacks.onGorahaStatusRequested(false));
      await this.sendOutput(msg, output, '✅ Count loaded.');
    } else if (sub === 'filter' || sub === 'search') {
      const filterString = args.slice(1).join(' ');
      if (!filterString) {
        await msg.reply('⚠️ Usage: linda goraha filter <search_string>');
        return;
      }
      if (!callbacks?.onGorahaFilterRequested) {
        await msg.reply('⚠️ Goraha filter not available');
        return;
      }
      await msg.reply(`🔍 Searching: "${filterString}"...`);
      const output = await this.captureOutput(() =>
        callbacks.onGorahaFilterRequested(filterString)
      );
      await this.sendOutput(msg, output, '✅ Search complete.');
    } else if (sub === 'status') {
      if (!callbacks?.onGorahaStatusRequested) {
        await msg.reply('⚠️ Goraha service not available');
        return;
      }
      await msg.reply('⏳ Loading Goraha status...');
      const output = await this.captureOutput(() => callbacks.onGorahaStatusRequested(false));
      await this.sendOutput(msg, output, '✅ Status loaded.');
    } else {
      await msg.reply(
        '📱 *Goraha Commands:*\n' +
        'linda goraha\n' +
        'linda goraha verify\n' +
        'linda goraha contacts\n' +
        'linda goraha filter <text>'
      );
    }
  }

  /**
   * analytics / metrics — report|uptime|account <phone>
   */
  async handleAnalytics(msg, args, callbacks) {
    const sub = args[0] || 'realtime';

    if (!callbacks?.onAnalyticsReportRequested) {
      await msg.reply('⚠️ Analytics not available');
      return;
    }

    if (sub === 'report') {
      await msg.reply('⏳ Generating analytics report...');
      const output = await this.captureOutput(() =>
        callbacks.onAnalyticsReportRequested('report')
      );
      await this.sendOutput(msg, output, '✅ Report generated.');
    } else if (sub === 'uptime') {
      await msg.reply('⏳ Loading uptime metrics...');
      const output = await this.captureOutput(() =>
        callbacks.onAnalyticsReportRequested('uptime')
      );
      await this.sendOutput(msg, output, '✅ Uptime loaded.');
    } else if (sub === 'account') {
      const phone = args[1];
      if (!phone) {
        await msg.reply('⚠️ Usage: linda analytics account <+phone>');
        return;
      }
      await msg.reply(`⏳ Loading analytics for ${phone}...`);
      const output = await this.captureOutput(() =>
        callbacks.onAnalyticsReportRequested('account', phone)
      );
      await this.sendOutput(msg, output, `✅ Analytics loaded.`);
    } else {
      // Default: realtime
      await msg.reply('⏳ Loading metrics...');
      const output = await this.captureOutput(() =>
        callbacks.onAnalyticsReportRequested('realtime')
      );
      await this.sendOutput(msg, output, '✅ Metrics loaded.');
    }
  }

  /**
   * sheets read|add|update|delete|search|info
   */
  async handleSheets(msg, args, callbacks) {
    const sub = args[0];

    if (!sub) {
      await msg.reply(
        '📊 *Google Sheets Commands:*\n' +
        'linda sheets read <id> [range]\n' +
        'linda sheets add <id> <sheet> <values...>\n' +
        'linda sheets update <id> <cell> <value>\n' +
        'linda sheets delete <id> <sheet> [row]\n' +
        'linda sheets search <id> [range] <text>\n' +
        'linda sheets info <id>'
      );
      return;
    }

    if (sub === 'read') {
      const sheetId = args[1];
      const range = args[2] || 'Sheet1';
      if (!sheetId) {
        await msg.reply('⚠️ Usage: linda sheets read <id> [range]');
        return;
      }
      if (!callbacks?.onGoogleSheetsRead) {
        await msg.reply('❌ Google Sheets not available');
        return;
      }
      await msg.reply('⏳ Reading sheet...');
      const output = await this.captureOutput(() =>
        callbacks.onGoogleSheetsRead(sheetId, range)
      );
      await this.sendOutput(msg, output, '✅ Read complete.');
      return;
    }

    if (sub === 'add' || sub === 'create') {
      const sheetId = args[1];
      const sheetName = args[2] || 'Sheet1';
      const values = args.slice(3);
      if (!sheetId || values.length === 0) {
        await msg.reply('⚠️ Usage: linda sheets add <id> <sheet> <value1> [value2]...');
        return;
      }
      if (!callbacks?.onGoogleSheetsCreate) {
        await msg.reply('❌ Google Sheets not available');
        return;
      }
      await msg.reply('⏳ Adding row...');
      const output = await this.captureOutput(() =>
        callbacks.onGoogleSheetsCreate(sheetId, sheetName, values)
      );
      await this.sendOutput(msg, output, '✅ Row added.');
      return;
    }

    if (sub === 'update') {
      const sheetId = args[1];
      const cell = args[2];
      const value = args.slice(3).join(' ');
      if (!sheetId || !cell || !value) {
        await msg.reply('⚠️ Usage: linda sheets update <id> <cell> <value>');
        return;
      }
      if (!callbacks?.onGoogleSheetsUpdate) {
        await msg.reply('❌ Google Sheets not available');
        return;
      }
      await msg.reply('⏳ Updating cell...');
      const output = await this.captureOutput(() =>
        callbacks.onGoogleSheetsUpdate(sheetId, cell, value)
      );
      await this.sendOutput(msg, output, '✅ Cell updated.');
      return;
    }

    if (sub === 'delete' || sub === 'remove') {
      const sheetId = args[1];
      const sheetName = args[2] || 'Sheet1';
      const rowIndex = parseInt(args[3]) || 1;
      if (!sheetId) {
        await msg.reply('⚠️ Usage: linda sheets delete <id> <sheet> [row]');
        return;
      }
      if (!callbacks?.onGoogleSheetsDelete) {
        await msg.reply('❌ Google Sheets not available');
        return;
      }
      await msg.reply('⏳ Deleting row...');
      const output = await this.captureOutput(() =>
        callbacks.onGoogleSheetsDelete(sheetId, sheetName, rowIndex)
      );
      await this.sendOutput(msg, output, '✅ Row deleted.');
      return;
    }

    if (sub === 'search') {
      const sheetId = args[1];
      const range = args[2] || 'Sheet1';
      const searchValue = args.slice(3).join(' ');
      if (!sheetId || !searchValue) {
        await msg.reply('⚠️ Usage: linda sheets search <id> [range] <text>');
        return;
      }
      if (!callbacks?.onGoogleSheetsSearch) {
        await msg.reply('❌ Google Sheets not available');
        return;
      }
      await msg.reply(`🔍 Searching: "${searchValue}"...`);
      const output = await this.captureOutput(() =>
        callbacks.onGoogleSheetsSearch(sheetId, range, searchValue)
      );
      await this.sendOutput(msg, output, '✅ Search complete.');
      return;
    }

    if (sub === 'info' || sub === 'meta' || sub === 'metadata') {
      const sheetId = args[1];
      if (!sheetId) {
        await msg.reply('⚠️ Usage: linda sheets info <id>');
        return;
      }
      if (!callbacks?.onGoogleSheetsMetadata) {
        await msg.reply('❌ Google Sheets not available');
        return;
      }
      await msg.reply('⏳ Fetching metadata...');
      const output = await this.captureOutput(() =>
        callbacks.onGoogleSheetsMetadata(sheetId)
      );
      await this.sendOutput(msg, output, '✅ Metadata fetched.');
      return;
    }

    await msg.reply('❓ Unknown sheets command. Type "linda sheets" for usage.');
  }

  /**
   * link master [+phone] [name] — Add/link a master account
   */
  async handleLink(msg, args, callbacks) {
    const sub = args[0];

    if (sub !== 'master') {
      await msg.reply('⚠️ Usage: linda link master [+phone] [name]');
      return;
    }

    const phone = args[1];
    const name = args.slice(2).join(' ');

    if (phone) {
      if (!callbacks?.onAddNewMaster) {
        await msg.reply('⚠️ Add master handler not available');
        return;
      }
      await msg.reply(`⏳ Adding master: ${phone}${name ? ' (' + name + ')' : ''}...`);
      const output = await this.captureOutput(() => callbacks.onAddNewMaster(phone, name));
      await this.sendOutput(msg, output, '✅ Master account added.');
    } else {
      if (!callbacks?.onLinkMaster) {
        await msg.reply('⚠️ Link handler not available');
        return;
      }
      await msg.reply('⏳ Initiating master linking...');
      const output = await this.captureOutput(() => callbacks.onLinkMaster());
      await this.sendOutput(msg, output, '✅ Linking initiated.');
    }
  }

  /**
   * list — List all devices
   */
  async handleList(msg) {
    const output = await this.captureOutput(() => {
      const thd = this.terminalHealthDashboard;
      if (thd) {
        thd.listAllDevices();
      } else {
        console.log('⚠️ Dashboard not available');
      }
    });
    await this.sendOutput(msg, output, 'No devices found.');
  }

  /**
   * device <+phone> — Show device details
   */
  async handleDevice(msg, args) {
    const phone = args[0];
    if (!phone) {
      await msg.reply('⚠️ Usage: linda device <+phone>');
      return;
    }

    const output = await this.captureOutput(() => {
      const thd = this.terminalHealthDashboard;
      if (thd) {
        thd.displayDeviceDetails(phone);
      } else {
        console.log('⚠️ Dashboard not available');
      }
    });
    await this.sendOutput(msg, output, `❌ Device not found: ${phone}`);
  }

  /**
   * bridge-stats — Show bridge activity stats
   */
  async handleBridgeStats(msg) {
    const topCmds = Object.entries(this.stats.commandsByName)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => `  ${name}: ${count}`)
      .join('\n');

    await msg.reply(
      `📊 *Bridge Stats*\n` +
      `Total commands: ${this.stats.totalCommands}\n` +
      `Errors: ${this.stats.errors}\n` +
      `Last: ${this.stats.lastCommand || '--'}\n` +
      `At: ${this.stats.lastCommandTime?.toLocaleString() || '--'}` +
      (topCmds ? `\n\n📈 Top commands:\n${topCmds}` : '')
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // HELP TEXT
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Generate help text formatted for WhatsApp
   */
  getHelpText() {
    return (
      `🤖 *Linda WhatsApp Bridge*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `\n📱 *Monitoring:*\n` +
      `linda health [+phone]\n` +
      `linda status\n` +
      `linda accounts\n` +
      `linda stats <+phone>\n` +
      `linda list\n` +
      `linda device <+phone>\n` +
      `\n🔗 *Account Management:*\n` +
      `linda link master [+phone] [name]\n` +
      `linda relink master [+phone]\n` +
      `linda relink servant <+phone>\n` +
      `linda recover <+phone>\n` +
      `linda restore\n` +
      `\n📱 *Goraha:*\n` +
      `linda goraha [status|verify|contacts]\n` +
      `linda goraha filter <text>\n` +
      `\n📊 *Analytics:*\n` +
      `linda analytics [report|uptime]\n` +
      `linda analytics account <+phone>\n` +
      `\n📋 *Google Sheets:*\n` +
      `linda sheets [read|add|update|delete|search|info]\n` +
      `\n📈 *Bridge:*\n` +
      `linda bridge-stats\n` +
      `linda help`
    );
  }
}

export default WhatsAppCommandBridge;
