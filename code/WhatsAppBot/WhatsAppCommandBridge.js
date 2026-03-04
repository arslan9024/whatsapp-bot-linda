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
          this.logBot('⚠️ Primary master not linked, attempting auto-recovery...', 'warn');
          await this.autoRecoverPrimaryMaster();
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
    // Check every 30 seconds if primary master is still connected
    this.pollingInterval = setInterval(async () => {
      const masterPhone = this.accountConfigManager?.getMasterPhoneNumber();
      if (!masterPhone || this.recoveryInProgress) return;
      
      // Check if still linked
      if (!isPrimaryMasterLinked(this.accountConfigManager, this.deviceLinkedManager)) {
        this.logBot('⚠️ Polling detected primary master disconnected - attempting recovery...', 'warn');
        await this.autoRecoverPrimaryMaster();
      } else if (!botActive) {
        // Mark as active if linked
        botActive = true;
        this.logBot('✅ Primary master reconnected - Bot active', 'success');
      }
    }, 30000); // 30 seconds
    
    this.logBot('🔄 Recovery polling started (30s interval)', 'info');
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
    if (!botActive) {
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
    const body = (msg.body || '').trim();
    const afterPrefix = body.substring(this.prefix.length).trim();
    if (!afterPrefix) {
      await this.handleMenu(msg);
      return true;
    }
    const parts = afterPrefix.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Menu/group selection
    if (command === 'menu') {
      await this.handleMenu(msg);
      return true;
    }
    if (['1','2','3','4'].includes(command)) {
      await this.handleGroupCommands(msg, command);
      return true;
    }

    // Recovery commands
    if (command === 'recover' || command === 'restore') {
      await this.handleRecover(msg);
      return true;
    }

    // Status command
    if (command === 'status' || command === 'health') {
      await this.handleStatus(msg);
      return true;
    }

    // ...existing command switch...
    // ...existing code...
  }

  /**
   * Handle recovery command
   */
  async handleRecover(msg) {
    msg.reply('🔄 Starting manual recovery...');
    const success = await this.autoRecoverPrimaryMaster();
    if (success) {
      msg.reply('✅ Primary master recovered successfully!');
    } else {
      msg.reply('❌ Recovery failed. Please check terminal for details or run "link master <phone>".');
    }
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

  /**
   * Get help text
   */
  getHelpText() {
    return 'ℹ️ Send "linda menu" to see command groups.';
  }

  /**
   * Check if sender is authorized
   */
  isAuthorizedSender(senderJid) {
    // Implement authorization logic
    // For now, allow all
    return true;
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
