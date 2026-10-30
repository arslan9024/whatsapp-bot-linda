/**
 * ====================================================================
 * WHATSAPP COMMAND BRIDGE (Phase 31)
 * ====================================================================
 * Lets authorized master accounts send "linda <command>" messages to the
 * primary master (Linda) for remote command execution.
 *
 * This file only holds construction, lifecycle, message gating and
 * dispatch. Everything else lives in single-purpose modules under
 * ./bridge/ and is mixed into the class prototype below:
 *
 *   bridgeConstants.js            command groups, menu/help text
 *   bridgeUtils.js                pure helpers (phone, uptime, chunking)
 *   BridgeOutput.js               reply/capture helpers + stats tracking
 *   PrimaryMasterConnectionState  read-only connection checks
 *   PrimaryMasterAuthentication   reconnect/relink prompt
 *   PrimaryMasterRecovery         auto-recovery, session loss, admin notify
 *   PrimaryMasterMonitor          device events + background polling
 *   MonitoringCommands            health/status/accounts/stats/list/device
 *   AccountCommands               relink/link/restore
 *   IntegrationCommands           goraha/analytics/sheets
 *   MenuCommands                  menu/groups/help
 *   commandRouter.js              command -> handler dispatch table
 *
 * Usage: Send "linda health" to the primary master's WhatsApp number.
 *
 * @since Phase 31 — February 21, 2026
 */

import services from '../core/ServiceRegistry.js';
import { COMMAND_PREFIX } from './bridge/bridgeConstants.js';
import { outputMethods } from './bridge/BridgeOutput.js';
import { connectionStateMethods } from './bridge/PrimaryMasterConnectionState.js';
import { authenticationMethods } from './bridge/PrimaryMasterAuthentication.js';
import { recoveryMethods } from './bridge/PrimaryMasterRecovery.js';
import { monitorMethods } from './bridge/PrimaryMasterMonitor.js';
import { monitoringCommands } from './bridge/MonitoringCommands.js';
import { accountCommands } from './bridge/AccountCommands.js';
import { integrationCommands } from './bridge/IntegrationCommands.js';
import { menuCommands } from './bridge/MenuCommands.js';
import { COMMAND_HANDLERS, parseCommand } from './bridge/commandRouter.js';

export class WhatsAppCommandBridge {
  constructor(opts = {}) {
    this.logBot = opts.logBot || console.log;
    this.accountConfigManager = opts.accountConfigManager || null;
    this.deviceLinkedManager = opts.deviceLinkedManager || null;
    this.sessionStateManager = opts.sessionStateManager || null;
    this.accountClients = opts.accountClients || null;
    this.connectionManagers = opts.connectionManagers || null;
    this.adminPhone = opts.adminPhone || null;
    this.recoveryRetries = opts.recoveryRetries || 10;
    this.recoveryDelay = opts.recoveryDelay || 3000;
    this.terminalHealthDashboard = opts.terminalHealthDashboard || null;
    this.prefix = COMMAND_PREFIX;
    this.botActive = false;
    this.isInitialized = false;
    this.recoveryInProgress = false;
    this.pollingInterval = null;
    this.lastRecoveryAttempt = 0;
    this.authenticationPrompt = null;
    this.authenticationPromptAttempted = false;
    // Command stats (used by the test suite and bridge diagnostics)
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
   * Set up listeners and start the auto-recovery process.
   * @returns {Promise<boolean>} success status
   */
  async initializeBot() {
    if (this.isInitialized) {
      return true;
    }
    try {
      this.logBot('🔧 Initializing WhatsApp Command Bridge...', 'info');
      this._resolveDependencies();
      this.setupEventListeners();

      const masterPhone = this.accountConfigManager?.getMasterPhoneNumber();
      if (masterPhone) {
        await this._checkPrimaryMasterOnStartup(masterPhone);
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

  /** Fill missing dependencies from the ServiceRegistry. */
  _resolveDependencies() {
    this.accountConfigManager ||= services.get('accountConfigManager');
    this.deviceLinkedManager ||= services.get('deviceLinkedManager');
    this.sessionStateManager ||= services.get('sessionStateManager');
    this.terminalHealthDashboard ||= services.get('terminalHealthDashboard');
  }

  async _checkPrimaryMasterOnStartup(masterPhone) {
    this.logBot(`📱 Primary master phone: ${masterPhone}`, 'info');
    if (await this.isPrimaryMasterConnected(masterPhone)) {
      this.botActive = true;
      this.logBot('✅ Primary master is linked - Command Bridge active', 'success');
      return;
    }
    // Only auto-recover if a session previously existed; otherwise ask to authenticate.
    if (this.canRestorePrimaryMasterSession(masterPhone)) {
      this.logBot('⚠️ Primary master not linked, attempting auto-recovery...', 'warn');
      await this.autoRecoverPrimaryMaster();
    } else {
      this.requestPrimaryMasterAuthentication(masterPhone);
    }
  }

  /**
   * Should this inbound message be processed as a bridge command?
   * Cheap checks run first so unrelated chats never trigger a reply.
   */
  shouldHandle(msg, phoneNumber) {
    const acm = this.accountConfigManager || services.get('accountConfigManager');
    if (!acm) {
      return false;
    }
    if (this.normalizePhone(phoneNumber) !== this.normalizePhone(acm.getMasterPhoneNumber())) {
      return false;
    }
    if (msg.from?.includes('@g.us') || msg.fromMe) {
      return false;
    }
    const body = (msg.body || '').trim().toLowerCase();
    if (body !== this.prefix && !body.startsWith(this.prefix + ' ')) {
      return false;
    }
    if (!this.isAuthorizedSender(msg.from)) {
      return false;
    }
    if (!this.botActive && this.deviceLinkedManager) {
      msg.reply?.('❌ Bot inactive. Please use "linda relink master <phone>" or "linda restore" to activate primary master WhatsApp account.');
      return false;
    }
    return true;
  }

  /** Execute a "linda <command>" message. Always returns true (message consumed). */
  async handleMessage(msg) {
    try {
      const { command, args } = parseCommand((msg.body || '').trim(), this.prefix);
      this._trackCommand(command || 'help');

      if (!command) {
        await msg.reply(this.getHelpText());
        return true;
      }
      const handler = Object.hasOwn(COMMAND_HANDLERS, command) ? COMMAND_HANDLERS[command] : null;
      if (!handler) {
        await msg.reply(`❌ Unknown command: ${command}. Send "linda help" for command list.`);
        return true;
      }
      await handler(this, msg, args);
      return true;
    } catch (error) {
      this.stats.errors++;
      await msg.reply(`❌ Command error: ${error.message}`);
      return true;
    }
  }

  /** Only known accounts (other than the primary master) may send commands. */
  isAuthorizedSender(senderJid) {
    const acm = this.accountConfigManager || services.get('accountConfigManager');
    if (!acm?.getAllAccounts || !acm?.getMasterPhoneNumber) {
      return false;
    }

    let sender = this.normalizePhone(senderJid);
    // WhatsApp privacy IDs (LIDs) are mapped to real numbers by InboundDeviceLinkingService.
    const lidStore = services.get('lidPhoneStore');
    if (lidStore?.has(sender)) {
      sender = this.normalizePhone(lidStore.get(sender));
    }
    const master = this.normalizePhone(acm.getMasterPhoneNumber());
    if (!sender || !master || sender === master) {
      return false;
    }
    return (acm.getAllAccounts() || []).some((a) => this.normalizePhone(a.phoneNumber) === sender);
  }

  destroy() {
    this.stopRecoveryPolling();
    this.isInitialized = false;
    this.botActive = false;
    this.logBot('🧹 WhatsApp Command Bridge destroyed', 'info');
  }
}

Object.assign(
  WhatsAppCommandBridge.prototype,
  outputMethods,
  connectionStateMethods,
  authenticationMethods,
  recoveryMethods,
  monitorMethods,
  monitoringCommands,
  accountCommands,
  integrationCommands,
  menuCommands,
);
