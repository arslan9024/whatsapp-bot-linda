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
 * - Automatic session recovery for primary master
 *
 * Usage: Send "linda health" to the primary master's WhatsApp number
 *
 * @since Phase 31 — February 21, 2026
 */

import services from '../utils/ServiceRegistry.js';
import { SessionManager } from '../utils/SessionManager.js';

// Move botActive to module scope, not inside class or function
let botActive = false;
const COMMAND_GROUPS = {
  '1': {
    name: 'WhatsApp Features',
    commands: [
      'health', 'status', 'accounts', 'stats', 'list', 'device', 'link', 'relink', 'recover', 'restore', 'bridge-stats'
    ]
  },
  '2': {
    name: 'Real Estate Database',
    commands: [
      'analytics', 'metrics', 'sheets', 'database', 'report', 'summary'
    ]
  },
  '3': {
    name: 'GorahaBot',
    commands: [
      'goraha', 'contacts', 'verify', 'filter', 'search'
    ]
  },
  '4': {
    name: 'Linda Main',
    commands: [
      'help', 'menu', 'about', 'info', 'settings'
    ]
  }
};

function isPrimaryMasterLinked(accountConfigManager, deviceLinkedManager) {
  const acm = accountConfigManager || services.get('accountConfigManager');
  const dm = deviceLinkedManager || services.get('deviceLinkedManager');
  if (!acm || !dm) return false;
  const masterPhone = acm.getMasterPhoneNumber();
  const device = dm.getDevice(masterPhone);
  return device && device.status === 'linked';
}

// Enhanced: Automatic event-driven and polling-based primary master recovery
export class WhatsAppCommandBridge {
  constructor(opts = {}) {
    this.logBot = opts.logBot || console.log;
    this.accountConfigManager = opts.accountConfigManager || null;
    this.deviceLinkedManager = opts.deviceLinkedManager || null;
    this.sessionStateManager = opts.sessionStateManager || null; // Renamed for clarity
    this.adminPhone = opts.adminPhone || null;
    this.recoveryRetries = opts.recoveryRetries || 10; // Increased retries
    this.recoveryDelay = opts.recoveryDelay || 3000; // 3 seconds delay
    this.terminalHealthDashboard = opts.terminalHealthDashboard || null;
    this.prefix = 'linda'; // Command prefix
    this.isInitialized = false;
    this.recoveryInProgress = false;
    this.pollingInterval = null;
    this.lastRecoveryAttempt = 0;
    // Backward-compatible command stats (used by test suite and bridge diagnostics)
    this.stats = {
      totalCommands: 0,
      errors: 0,
      lastCommand: null,
      lastCommandTime: null,
      commandsByName: {},
    };
    this.logBot('✅ WhatsApp Command Bridge initialized', 'info');
  }

  /**
   * Initialize the WhatsApp Command Bridge
   * Sets up event listeners and starts the auto-recovery process
   * @returns {Promise<boolean>} - Success status
   */
  async initializeBot() {
    try {
      this.logBot('🔧 Initializing WhatsApp Command Bridge...', 'info');

      // Get dependencies from services registry if not provided
      if (!this.accountConfigManager) {
        this.accountConfigManager = services.get('accountConfigManager');
      }
      if (!this.deviceLinkedManager) {
        this.deviceLinkedManager = services.get('deviceLinkedManager');
      }
      if (!this.sessionStateManager) {
        this.sessionStateManager = services.get('sessionStateManager');
      }
      if (!this.terminalHealthDashboard) {
        this.terminalHealthDashboard = services.get('terminalHealthDashboard');
      }

      // Set up event listeners for device status changes
      this.setupEventListeners();

      // Check if primary master is linked, if not try to recover
      const masterPhone = this.accountConfigManager?.getMasterPhoneNumber();
      if (masterPhone) {
        this.logBot(`📱 Primary master phone: ${masterPhone}`, 'info');
        
        if (!isPrimaryMasterLinked(this.accountConfigManager, this.deviceLinkedManager)) {
          // Only attempt auto-recovery if a session has previously existed
          // (i.e. there's a session folder). If never linked, skip silently.
          const hasExistingSession = SessionManager.hasSessionArtifacts(masterPhone);
          if (hasExistingSession) {
            this.logBot('⚠️ Primary master not linked, attempting auto-recovery...', 'warn');
            await this.autoRecoverPrimaryMaster();
          } else {
            this.logBot('ℹ️  No previous session — waiting for manual linking (type: link master)', 'info');
          }
        } else {
          botActive = true;
          this.logBot('✅ Primary master is linked - Command Bridge active', 'success');
        }
        
        // Start background polling for continuous recovery monitoring
        this.startRecoveryPolling();
      } else {
        this.logBot('⚠️ No master phone configured', 'warn');
      }

      this.isInitialized = true;
      this.logBot('✅ WhatsApp Command Bridge initialized successfully', 'success');
      return true;
    } catch (error) {
      this.logBot(`❌ Failed to initialize WhatsApp Command Bridge: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Start background polling for continuous recovery monitoring
   * @private
   */
  startRecoveryPolling() {
    // Poll every 60 seconds to check if primary master is still connected
    this.pollingInterval = setInterval(async () => {
      try {
        const masterPhone = this.accountConfigManager?.getMasterPhoneNumber();
        if (!masterPhone || this.recoveryInProgress) return;

        // Skip polling entirely if the account has never been linked (no session folder)
        const hasExistingSession = SessionManager.hasSessionArtifacts(masterPhone);
        if (!hasExistingSession) return; // Silently skip — waiting for manual link

        // Check if still linked
        if (!isPrimaryMasterLinked(this.accountConfigManager, this.deviceLinkedManager)) {
          this.logBot('⚠️ Polling detected primary master disconnected - attempting recovery...', 'warn');
          await this.autoRecoverPrimaryMaster();
        } else if (!botActive) {
          // Mark as active if linked
          botActive = true;
          this.logBot('✅ Primary master reconnected - Bot active', 'success');
        }
      } catch (pollingError) {
        // Never let a polling error kill the interval — just log it
        this.logBot(`⚠️ Recovery polling error (will retry): ${pollingError.message}`, 'warn');
      }
    }, 60000); // 60 seconds

    this.logBot('🔄 Recovery polling started (60s interval, session-aware)', 'info');
  }

  /**
   * Stop background polling
   * @private
   */
  stopRecoveryPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.logBot('⏹ Recovery polling stopped', 'info');
    }
  }

  /**
   * Set up event listeners for device status changes
   * @private
   */
  setupEventListeners() {
    const dm = this.deviceLinkedManager;
    const acm = this.accountConfigManager;
    const masterPhone = acm?.getMasterPhoneNumber();

    if (dm && dm.on) {
      // Listen for disconnection events
      dm.on('disconnected', (phone, reason) => {
        if (phone === masterPhone) {
          this.logBot(`❌ Primary master disconnected: ${reason}`, 'error');
          this.handleSessionLoss(masterPhone);
        }
      });

      // Listen for auth failure events
      dm.on('auth_failure', (phone, reason) => {
        if (phone === masterPhone) {
          this.logBot(`❌ Primary master auth failure: ${reason}`, 'error');
          this.handleSessionLoss(masterPhone);
        }
      });

      // Listen for device state changes
      dm.on('change_state', (phone, state) => {
        this.logBot(`📡 Device state change: ${phone} -> ${state}`, 'info');
        if (phone === masterPhone && state === 'CONNECTED') {
          botActive = true;
          this.logBot('✅ Primary master reconnected via event - Bot active', 'success');
        } else if (phone === masterPhone && state === 'DISCONNECTED') {
          botActive = false;
          this.logBot('❌ Primary master disconnected via event', 'error');
        }
      });

      // Listen for successful linking
      dm.on('linked', (phone, data) => {
        if (phone === masterPhone) {
          botActive = true;
          this.logBot('✅ Primary master linked - Bot active', 'success');
          this.notifyAdmin('Primary master account restored! Linda bot is now active.');
        }
      });
    }
  }

  /**
   * Automatic primary master recovery with multiple strategies
   * @private
   */
  async autoRecoverPrimaryMaster() {
    if (this.recoveryInProgress) {
      this.logBot('⚠️ Recovery already in progress, skipping...', 'warn');
      return false;
    }

    this.recoveryInProgress = true;
    const acm = this.accountConfigManager;
    const dm = this.deviceLinkedManager;
    const masterPhone = acm?.getMasterPhoneNumber();
    
    if (!masterPhone) {
      this.logBot('❌ No master phone configured for recovery', 'error');
      this.recoveryInProgress = false;
      return false;
    }

    this.logBot(`🔄 Starting auto-recovery for primary master: ${masterPhone}`, 'info');
    this.lastRecoveryAttempt = Date.now();

    let attempt = 0;

    // Strategy 1: Try to restore from saved session files
    while (attempt < this.recoveryRetries && !isPrimaryMasterLinked(acm, dm)) {
      attempt++;
      this.logBot(`🔄 Recovery attempt ${attempt}/${this.recoveryRetries}...`, 'info');
      
      // Check if session files exist and can be restored
      const canRestore = SessionManager.canRestoreSession(masterPhone);
      this.logBot(`📁 Session restore check: ${canRestore ? 'Available' : 'Not found'}`, 'info');
      
      if (canRestore) {
        this.logBot('🔄 Attempting session restore...', 'info');
        // The session will be restored by the main bot initialization
        // We just need to wait for it to complete
        try {
          // Try to get the account client and initialize it
          const accountClients = services.get('accountClients');
          if (accountClients && accountClients.has(masterPhone)) {
            const client = accountClients.get(masterPhone);
            if (client && client.initialize) {
              await client.initialize();
              this.logBot('✅ Session restored via existing client', 'success');
              botActive = true;
              this.recoveryInProgress = false;
              await this.notifyAdmin('Primary master session restored successfully!');
              return true;
            }
          }
        } catch (err) {
          this.logBot(`⚠️ Session restore error: ${err.message}`, 'warn');
        }
      }

      // Strategy 2: Check if device manager has a way to reconnect
      if (dm && dm.reconnectDevice) {
        this.logBot('🔄 Attempting device reconnection...', 'info');
        try {
          const reconnected = await dm.reconnectDevice(masterPhone);
          if (reconnected) {
            botActive = true;
            this.logBot('✅ Device reconnected successfully', 'success');
            this.recoveryInProgress = false;
            await this.notifyAdmin('Primary master reconnected!');
            return true;
          }
        } catch (err) {
          this.logBot(`⚠️ Reconnection error: ${err.message}`, 'warn');
        }
      }

      // Strategy 3: Wait and retry (polling approach)
      this.logBot(`⏳ Waiting ${this.recoveryDelay}ms before next attempt...`, 'info');
      await new Promise(res => setTimeout(res, this.recoveryDelay));
      
      // Check if linked after waiting
      if (isPrimaryMasterLinked(acm, dm)) {
        botActive = true;
        this.logBot('✅ Primary master became available', 'success');
        this.recoveryInProgress = false;
        return true;
      }
    }

    // All retries exhausted
    botActive = false;
    this.recoveryInProgress = false;
    this.logBot('❌ Primary master recovery failed after all retries', 'error');
    await this.notifyAdmin('Primary master recovery failed. Please run "link master <phone>" to manually link.');
    return false;
  }

  /**
   * Handle session loss - triggers automatic recovery
   * @private
   */
  handleSessionLoss(masterPhone) {
    if (!masterPhone) {
      const acm = this.accountConfigManager || services.get('accountConfigManager');
      masterPhone = acm?.getMasterPhoneNumber();
    }
    
    if (!masterPhone) {
      this.logBot('❌ Cannot handle session loss - no master phone', 'error');
      return;
    }
    
    botActive = false;
    this.logBot('❌ Primary master session lost. Starting auto-recovery...', 'error');
    
    // Trigger recovery asynchronously
    this.autoRecoverPrimaryMaster().catch(err => {
      this.logBot(`❌ Recovery error: ${err.message}`, 'error');
    });
  }

  /**
   * Send notification to admin
   * @private
   */
  async notifyAdmin(message) {
    try {
      if (this.adminPhone && this.deviceLinkedManager && this.deviceLinkedManager.sendWhatsAppMessage) {
        await this.deviceLinkedManager.sendWhatsAppMessage(this.adminPhone, message);
        this.logBot(`📱 Admin notification sent: ${message}`, 'info');
      } else {
        this.logBot(`[ADMIN NOTIFY] ${message}`, 'warn');
      }
    } catch (error) {
      this.logBot(`❌ Admin notification failed: ${error.message}`, 'error');
    }
  }

  /**
   * Check if message should be handled
   */
  shouldHandle(msg, phoneNumber) {
    if (!botActive && this.deviceLinkedManager) {
      // If bot is inactive, prompt for relink/restore
      if (msg && msg.reply) {
        msg.reply('❌ Bot inactive. Please use "linda relink master <phone>" or "linda restore" to activate primary master WhatsApp account.');
      }
      return false;
    }
    // ...existing shouldHandle logic...
    const acm = this.accountConfigManager || services.get('accountConfigManager');
    if (!acm) return false;
    const masterPhone = acm.getMasterPhoneNumber();
    if (phoneNumber !== masterPhone) return false;
    if (msg.from?.includes('@g.us')) return false;
    if (msg.fromMe) return false;
    const body = (msg.body || '').trim().toLowerCase();
    if (body !== this.prefix && !body.startsWith(this.prefix + ' ')) return false;
    return this.isAuthorizedSender(msg.from);
  }

  /**
   * Handle incoming message
   */
  async handleMessage(msg) {
    try {
      const body = (msg.body || '').trim();
      const lower = body.toLowerCase();

      // Accept both "linda" and "Linda" etc.
      if (lower === this.prefix) {
        this._trackCommand('help');
        await msg.reply(this.getHelpText());
        return true;
      }

      const afterPrefix = body.substring(this.prefix.length).trim();
      if (!afterPrefix) {
        this._trackCommand('help');
        await msg.reply(this.getHelpText());
        return true;
      }

      const parts = afterPrefix.split(/\s+/);
      const command = (parts[0] || '').toLowerCase();
      const args = parts.slice(1);
      this._trackCommand(command || 'help');

      switch (command) {
        case 'help':
          await msg.reply(this.getHelpText());
          return true;
        case 'menu':
          await this.handleMenu(msg);
          return true;
        case '1':
        case '2':
        case '3':
        case '4':
          await this.handleGroupCommands(msg, command);
          return true;
        case 'recover':
          await this.handleRecover(msg, args);
          return true;
        case 'restore':
          await this.handleRestore(msg, services.get('terminalCallbacks'));
          return true;
        case 'status':
          await this.handleStatus(msg);
          return true;
        case 'health':
          await this.handleHealthStatus(msg, args);
          return true;
        case 'accounts':
          await this.handleAccounts(msg);
          return true;
        case 'stats':
          await this.handleStats(msg, args);
          return true;
        case 'relink':
          await this.handleRelink(msg, args, services.get('terminalCallbacks'));
          return true;
        case 'goraha':
          await this.handleGoraha(msg, args, services.get('terminalCallbacks'));
          return true;
        case 'analytics':
          await this.handleAnalytics(msg, args, services.get('terminalCallbacks'));
          return true;
        case 'sheets':
          await this.handleSheets(msg, args, services.get('terminalCallbacks'));
          return true;
        case 'link':
          await this.handleLink(msg, args, services.get('terminalCallbacks'));
          return true;
        case 'list':
          await this.handleList(msg);
          return true;
        case 'device':
          await this.handleDevice(msg, args);
          return true;
        case 'bridge-stats':
          await this.handleBridgeStats(msg);
          return true;
        default:
          await msg.reply(`❌ Unknown command: ${command}. Send \"linda help\" for command list.`);
          return true;
      }
    } catch (error) {
      this.stats.errors++;
      await msg.reply(`❌ Command error: ${error.message}`);
      return true;
    }
  }

  /**
   * Handle recovery command
   */
  async handleRecover(msg, args = []) {
    if (!args.length) {
      await msg.reply('Usage: linda recover <+phone>');
      return;
    }
    const phone = args[0];
    const device = this.deviceLinkedManager?.getDevice?.(phone);
    if (!device) {
      await msg.reply(`❌ Device not found: ${phone}`);
      return;
    }
    await msg.reply(`🔄 Recovery requested for ${phone}`);
    const success = await this.autoRecoverPrimaryMaster();
    await msg.reply(success ? '✅ Recovery completed.' : '⚠️ Recovery attempted. Check terminal for details.');
  }

  /**
   * Handle status command
   */
  async handleStatus(msg) {
    const masterPhone = this.accountConfigManager?.getMasterPhoneNumber();
    const isLinked = isPrimaryMasterLinked(this.accountConfigManager, this.deviceLinkedManager);
    
    const status = `
📊 WhatsApp Bridge Status:
━━━━━━━━━━━━━━━━━━━━━
• Bot Active: ${botActive ? '✅ Yes' : '❌ No'}
• Master: ${masterPhone || 'Not set'}
• Linked: ${isLinked ? '✅ Yes' : '❌ No'}
• Recovery: ${this.recoveryInProgress ? '🔄 In Progress' : '✅ Idle'}
• Polling: ${this.pollingInterval ? '✅ Active' : '❌ Stopped'}
━━━━━━━━━━━━━━━━━━━━━
`;
    msg.reply(status);
  }

  /**
   * Handle menu command
   */
  async handleMenu(msg) {
    const menu = `
📋 WhatsApp Command Bridge Menu:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣  WhatsApp Features
   health, status, accounts, stats

2️⃣  Real Estate Database  
   analytics, metrics, sheets

3️⃣  GorahaBot
   goraha, contacts, verify

4️⃣  Linda Main
   help, menu, about

🔧 Recovery Commands:
   recover - Manual recovery
   restore - Restore session

💡 Tip: Send "linda <command>"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    msg.reply(menu);
  }

  /**
   * Handle group commands
   */
  async handleGroupCommands(msg, group) {
    const groupInfo = COMMAND_GROUPS[group];
    if (!groupInfo) {
      msg.reply('❌ Invalid group. Send "linda menu" for options.');
      return;
    }

    const commands = groupInfo.commands.join(', ');
    msg.reply(`📁 ${groupInfo.name}:\n${commands}`);
  }

  normalizePhone(value) {
    if (!value) return '';
    return String(value)
      .replace('@c.us', '')
      .replace('@s.whatsapp.net', '')
      .replace(/[^\d+]/g, '')
      .replace(/^\+/, '');
  }

  _trackCommand(command) {
    this.stats.totalCommands += 1;
    this.stats.lastCommand = command;
    this.stats.lastCommandTime = new Date();
    this.stats.commandsByName[command] = (this.stats.commandsByName[command] || 0) + 1;
  }

  async captureOutput(fn) {
    const originalLog = console.log;
    const originalClear = console.clear;
    const lines = [];
    console.log = (...args) => {
      const text = args.map((a) => String(a)).join(' ');
      // Strip ANSI escape codes
      lines.push(text.replace(/\x1B\[[0-9;]*m/g, ''));
    };
    console.clear = () => {};
    try {
      await fn();
      const output = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
      return output;
    } finally {
      console.log = originalLog;
      console.clear = originalClear;
    }
  }

  async sendOutput(msg, output, fallback = 'No output') {
    if (!output || typeof output !== 'string' || !output.trim()) {
      await msg.reply(fallback);
      return;
    }
    const chunkSize = 4000;
    if (output.length <= chunkSize) {
      await msg.reply(output);
      return;
    }
    const chunks = [];
    for (let i = 0; i < output.length; i += chunkSize) {
      chunks.push(output.slice(i, i + chunkSize));
    }
    for (let i = 0; i < chunks.length; i++) {
      await msg.reply(`(${i + 1}/${chunks.length}) ${chunks[i]}`);
    }
  }

  _calculateHealthScore(device) {
    if (!device) return 0;
    let score = 0;
    if (device.isOnline) score += 40;
    if (device.status === 'linked') score += 30;
    if (device.lastHeartbeat) {
      const age = Date.now() - new Date(device.lastHeartbeat).getTime();
      if (age <= 60_000) score += 30;
      else if (age <= 300_000) score += 10;
      else score += 10; // stale heartbeat still indicates prior liveness
    }
    return Math.min(100, score);
  }

  async handleHealthStatus(msg, args = []) {
    if (args.length) {
      if (!this.deviceLinkedManager?.getDevice) {
        await msg.reply('❌ Device health not available (device manager missing).');
        return;
      }
      const phone = args[0];
      const device = this.deviceLinkedManager.getDevice(phone);
      if (!device) {
        await msg.reply(`❌ Device not found: ${phone}`);
        return;
      }
      const score = this._calculateHealthScore(device);
      await msg.reply(`📊 Health for ${phone}\nOnline: ${device.isOnline ? 'Yes' : 'No'}\nStatus: ${device.status || 'unknown'}\nScore: ${score}/100`);
      return;
    }
    if (this.terminalHealthDashboard?.displayHealthDashboard) {
      const out = await this.captureOutput(() => this.terminalHealthDashboard.displayHealthDashboard());
      await this.sendOutput(msg, out, 'HEALTH DASHBOARD unavailable');
      return;
    }
    await msg.reply('❌ Health dashboard not available.');
  }

  async handleAccounts(msg) {
    if (!this.accountConfigManager?.getAllAccounts) {
      await msg.reply('❌ Account configuration not available.');
      return;
    }
    const accounts = this.accountConfigManager.getAllAccounts() || [];
    if (!accounts.length) {
      await msg.reply('ℹ️ No accounts configured.');
      return;
    }
    const lines = accounts.map((a) => {
      const device = this.deviceLinkedManager?.getDevice?.(a.phoneNumber);
      const icon = device?.isOnline ? '🟢' : '🔴';
      return `${icon} ${a.displayName} (${a.phoneNumber}) [${a.role || 'unknown'}]`;
    });
    await msg.reply(`📱 Accounts (${accounts.length})\n${lines.join('\n')}`);
  }

  _formatUptime(ms = 0) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  async handleStats(msg, args = []) {
    if (!args.length) {
      await msg.reply('Usage: linda stats <+phone>');
      return;
    }
    const phone = args[0];
    const device = this.deviceLinkedManager?.getDevice?.(phone);
    if (!device) {
      await msg.reply(`❌ Device not found: ${phone}`);
      return;
    }
    await msg.reply(
      `📈 Stats for ${phone}\n` +
      `Status: ${device.isOnline ? 'Online' : 'Offline'}\n` +
      `Uptime: ${this._formatUptime(device.uptime || 0)}\n` +
      `Heartbeats: ${device.heartbeatCount || 0}\n` +
      `Attempts: ${device.linkAttempts || 0}/${device.maxLinkAttempts || 5}`
    );
  }

  async handleRelink(msg, args = [], callbacks = null) {
    if (!callbacks) {
      await msg.reply('❌ Relink command not available (callbacks missing).');
      return;
    }
    if (!args.length) {
      await msg.reply('Usage: linda relink master [phone] | linda relink servant <phone> | linda relink <phone>');
      return;
    }
    const [target, maybePhone] = args;
    if (target === 'master') {
      await callbacks.onRelinkMaster?.(maybePhone);
      await msg.reply('✅ Relink master requested.');
      return;
    }
    if (target === 'servant') {
      if (!maybePhone) {
        await msg.reply('Usage: linda relink servant <+phone>');
        return;
      }
      await callbacks.onRelinkServant?.(maybePhone);
      await msg.reply(`✅ Relink servant requested for ${maybePhone}.`);
      return;
    }
    if (String(target).startsWith('+')) {
      await callbacks.onRelinkDevice?.(target);
      await msg.reply(`✅ Relink requested for ${target}.`);
      return;
    }
    await msg.reply('Usage: linda relink master [phone] | linda relink servant <phone> | linda relink <phone>');
  }

  async handleGoraha(msg, args = [], callbacks = null) {
    if (!callbacks || !callbacks.onGorahaStatusRequested) {
      await msg.reply('❌ Goraha command not available (callbacks missing).');
      return;
    }
    const sub = (args[0] || 'status').toLowerCase();
    if (sub === 'verify') {
      await callbacks.onGorahaStatusRequested(true);
      await msg.reply('✅ Goraha verification requested.');
      return;
    }
    if (sub === 'filter') {
      const q = args.slice(1).join(' ').trim();
      if (!q) {
        await msg.reply('Usage: linda goraha filter <text>');
        return;
      }
      await callbacks.onGorahaFilterRequested?.(q);
      await msg.reply(`✅ Goraha filter requested: ${q}`);
      return;
    }
    if (sub === 'contacts') {
      await msg.reply('📇 Goraha contacts command accepted.');
      return;
    }
    await callbacks.onGorahaStatusRequested(false);
    await msg.reply('✅ Goraha status requested.');
  }

  async handleAnalytics(msg, args = [], callbacks = null) {
    if (!callbacks || !callbacks.onAnalyticsReportRequested) {
      await msg.reply('❌ Analytics command not available (callbacks missing).');
      return;
    }
    const type = (args[0] || 'realtime').toLowerCase();
    if (type === 'account') {
      const phone = args[1];
      if (!phone) {
        await msg.reply('Usage: linda analytics account <+phone>');
        return;
      }
      await callbacks.onAnalyticsReportRequested('account', phone);
      await msg.reply(`✅ Analytics requested for account ${phone}.`);
      return;
    }
    await callbacks.onAnalyticsReportRequested(type);
    await msg.reply(`✅ Analytics requested: ${type}`);
  }

  async handleSheets(msg, args = [], callbacks = null) {
    if (!args.length) {
      await msg.reply('📄 Google Sheets usage: read|add|update|delete|search|info|conversations');
      return;
    }
    const [sub, ...rest] = args;
    const lower = sub.toLowerCase();
    if (!callbacks) {
      await msg.reply('❌ Google Sheets command not available (callbacks missing).');
      return;
    }
    if (lower === 'read') {
      if (!rest[0]) return msg.reply('Usage: linda sheets read <spreadsheetId>');
      if (!callbacks.onGoogleSheetsRead) return msg.reply('❌ Google Sheets read not available (callback missing).');
      await callbacks.onGoogleSheetsRead?.(...rest);
      return msg.reply('✅ Sheets read requested.');
    }
    if (lower === 'add') {
      if (!callbacks.onGoogleSheetsCreate) return msg.reply('❌ Google Sheets add not available (callback missing).');
      await callbacks.onGoogleSheetsCreate(...rest);
      return msg.reply('✅ Sheets add requested.');
    }
    if (lower === 'update') {
      if (!callbacks.onGoogleSheetsUpdate) return msg.reply('❌ Google Sheets update not available (callback missing).');
      await callbacks.onGoogleSheetsUpdate(...rest);
      return msg.reply('✅ Sheets update requested.');
    }
    if (lower === 'delete') {
      if (!callbacks.onGoogleSheetsDelete) return msg.reply('❌ Google Sheets delete not available (callback missing).');
      await callbacks.onGoogleSheetsDelete(...rest);
      return msg.reply('✅ Sheets delete requested.');
    }
    if (lower === 'search') {
      if (!callbacks.onGoogleSheetsSearch) return msg.reply('❌ Google Sheets search not available (callback missing).');
      await callbacks.onGoogleSheetsSearch(...rest);
      return msg.reply('✅ Sheets search requested.');
    }
    if (lower === 'info' || lower === 'metadata') {
      if (!callbacks.onGoogleSheetsMetadata) return msg.reply('❌ Google Sheets metadata not available (callback missing).');
      await callbacks.onGoogleSheetsMetadata(...rest);
      return msg.reply('✅ Sheets metadata requested.');
    }
    if (lower === 'conversations' || lower === 'conversation-meta') {
      if (!callbacks.onConversationMetadataExport) return msg.reply('❌ Conversation metadata export not available (callback missing).');
      await callbacks.onConversationMetadataExport(...rest);
      return msg.reply('✅ Conversation metadata export requested.');
    }
    return msg.reply(`❌ Unknown sheets sub-command: ${sub}`);
  }

  async handleLink(msg, args = [], callbacks = null) {
    if (!callbacks) {
      await msg.reply('❌ Link command not available (callbacks missing).');
      return;
    }
    const [target, phone, ...nameParts] = args;
    if (target === 'master' && phone) {
      await callbacks.onAddNewMaster?.(phone, nameParts.join(' '));
      await msg.reply(`✅ Add master requested for ${phone}.`);
      return;
    }
    if (target === 'master') {
      await callbacks.onLinkMaster?.();
      await msg.reply('✅ Link master requested.');
      return;
    }
    await msg.reply('Usage: linda link master [<+phone> <name>]');
  }

  async handleList(msg) {
    if (!this.terminalHealthDashboard?.listAllDevices) {
      await msg.reply('❌ Device list not available.');
      return;
    }
    const out = await this.captureOutput(() => this.terminalHealthDashboard.listAllDevices());
    await this.sendOutput(msg, out, 'Device list unavailable');
  }

  async handleDevice(msg, args = []) {
    if (!args.length) {
      await msg.reply('Usage: linda device <+phone>');
      return;
    }
    const phone = args[0];
    if (!this.terminalHealthDashboard?.displayDeviceDetails) {
      await msg.reply('❌ Device details not available.');
      return;
    }
    const out = await this.captureOutput(() => this.terminalHealthDashboard.displayDeviceDetails(phone));
    await this.sendOutput(msg, out, `No device details for ${phone}`);
  }

  async handleBridgeStats(msg) {
    const topCommands = Object.entries(this.stats.commandsByName)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => `${name}: ${count}`)
      .join(', ') || 'none';

    await msg.reply(
      `📊 Bridge Stats\n` +
      `Total commands: ${this.stats.totalCommands}\n` +
      `Errors: ${this.stats.errors}\n` +
      `Last command: ${this.stats.lastCommand || 'none'}\n` +
      `Top commands: ${topCommands}`
    );
  }

  async handleRestore(msg, callbacks = null) {
    if (!callbacks || !callbacks.onRestoreAllSessions) {
      await msg.reply('❌ Restore command not available (callbacks missing).');
      return;
    }
    await callbacks.onRestoreAllSessions();
    await msg.reply('✅ Restore-all-sessions requested.');
  }

  /**
   * Get help text
   */
  getHelpText() {
    return `
🤖 Linda WhatsApp Bridge
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Monitoring:
• linda health [phone]
• linda status
• linda stats <phone>

Account Management:
• linda accounts
• linda link master [phone name]
• linda relink master|servant <phone>
• linda recover <phone>

Goraha:
• linda goraha [verify|contacts|filter <text>]

Analytics:
• linda analytics [realtime|report|uptime|account <phone>]

Google Sheets:
• linda sheets read|add|update|delete|search|info|conversations ...

Diagnostics:
• linda bridge-stats
• linda help
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }

  /**
   * Check if sender is authorized
   */
  isAuthorizedSender(senderJid) {
    const acm = this.accountConfigManager || services.get('accountConfigManager');
    if (!acm?.getAllAccounts || !acm?.getMasterPhoneNumber) return false;

    const sender = this.normalizePhone(senderJid);
    const master = this.normalizePhone(acm.getMasterPhoneNumber());
    if (!sender || !master) return false;
    if (sender === master) return false;

    const accounts = acm.getAllAccounts() || [];
    return accounts.some((a) => this.normalizePhone(a.phoneNumber) === sender);
  }

  /**
   * Cleanup on shutdown
   */
  destroy() {
    this.stopRecoveryPolling();
    this.isInitialized = false;
    botActive = false;
    this.logBot('🧹 WhatsApp Command Bridge destroyed', 'info');
  }
}
