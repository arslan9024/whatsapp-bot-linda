/**
 * TerminalHealthDashboard.js
 * 
 * Interactive health dashboard for terminal monitoring with device tracking
 * - Display WhatsApp and Google account status
 * - Real-time device linking status and metadata
 * - Prompt for account re-linking
 * - Health summary with auto-refresh every 60 seconds
 * - Device management commands
 * 
 * Version: 2.0
 * Created: February 11, 2026
 * Status: Production Ready - Enhanced with Device Tracking
 */

import readline from 'readline';
import accountHealthMonitor from '../accounts/AccountHealthMonitor.js';
import TerminalNumberMenu from './TerminalNumberMenu.js';
import services from '../core/ServiceRegistry.js';
import { SessionManager } from '../sessions/SessionManager.js';
import TerminalLayout, { colorize, PANEL_COLORS } from './TerminalLayout.js';
import FeatureCatalog from './FeatureCatalog.js';
import {
  dedupeLines, intentLines, pickClient, scoreLines, sendSingleMessage, sentimentLines, similarLines, validateLines,
} from './TerminalFeatureCommands.js';

const COMMAND_HINT = 'link-code | link-qr | recover <phone> | restore-sessions | campaigns | features | f<id> | menu | help';

class TerminalHealthDashboard {
  constructor() {
    this.rl = null;
    this.isMonitoring = false;
    this.deviceManager = null; // Will be set by index.js
    this.accountConfigManager = null; // NEW: Will be set by index.js
    this.autoRefreshInterval = null;
    this.autoRefreshDelay = 60000; // 60 seconds
    this.masterPhoneNumber = null; // Set by index.js
    this.isSelectingLinkingMethod = false;
    this.linkingPromptQueue = Promise.resolve();
    this.numberMenu = new TerminalNumberMenu(this);
    this.linkingChallenges = new Set();
    this.lastDashboard = '';
    this.lastCommand = '';
    this.lastNotice = '';
    this.dashboardRefreshTimer = null;
    this.commandRunning = false;
    this.layout = new TerminalLayout(process.stdout);
    this.layout.onResize = () => this.displayHealthDashboard(true);
    this.activeQuestion = null;
    this.pairingCodes = new Map();
    this.features = new FeatureCatalog();
  }

  /** FEATURES panel: numbered features with usage counters (compact summary on short windows). */
  featurePanel() {
    return {
      title: 'FEATURES · F<id> COUNTERS (* restored)',
      lines: width => [this.features.summaryLine(), ...this.features.gridLines(width)],
      compactLines: [this.features.summaryLine()],
    };
  }

  /** Pinned, colored OUTPUT/INPUT panels are used only in an interactive terminal. */
  get usePanels() {
    return process.env.NODE_ENV !== 'test' && this.layout.enabled;
  }

  inputPanelLines() {
    if (this.activeQuestion) {
      return [...this.activeQuestion.split('\n').map(line => line.trimEnd()).filter(Boolean),
        '→ Type your answer at the prompt below and press Enter.'];
    }
    if (this.pairingCodes.size) {
      return [
        ...[...this.pairingCodes].map(([phone, code]) => `Pairing code for ${phone}: ${code}`),
        'Phone: WhatsApp > Linked devices > Link a device > Link with phone number instead.',
        'Code delayed, expired, or failed? Type r (or code <phone>) and press Enter for a new code.',
      ];
    }
    return ['Type a command at the prompt below and press Enter.', COMMAND_HINT];
  }

  /** Redraw only the INPUT panel (questions/codes can change while the dashboard is frozen). */
  renderInputPanel() {
    if (!this.usePanels) return;
    this.layout.updateInput({ title: 'INPUT · YOUR ACTION', lines: this.inputPanelLines() });
  }

  /**
   * Set device manager reference
   */
  setDeviceManager(deviceManager) {
    if (this.deviceManager && this.deviceStatusListener) {
      for (const event of this.deviceEvents) this.deviceManager.removeListener(event, this.deviceStatusListener);
    }
    this.deviceManager = deviceManager;
    this.deviceEvents = ['device:status-changed', 'device:linking-started', 'device:reset', 'device:added'];
    this.deviceStatusListener = () => this.requestDashboardRefresh();
    for (const event of this.deviceEvents) deviceManager.on(event, this.deviceStatusListener);
  }

  /**
   * Accounts whose device-linking flow is currently waiting for a pairing code.
   */
  getAccountsAwaitingPairingCode() {
    return [...(this.connectionManagers?.entries() || [])]
      .filter(([, manager]) => manager?.isAwaitingPairingCode?.())
      .map(([phone]) => phone);
  }

  /**
   * Handles pairing-code refresh input even while the linking command is still running.
   * @returns {false|Promise<true>} false when the input should be handled normally.
   */
  handlePairingCodeInput(input, requestCode) {
    const words = String(input).trim().toLowerCase().split(/\s+/);
    const refresh = ['r', 'refresh', 'new-code'].includes(words[0]) && words.length === 1 ||
      words.join(' ') === 'new code' || words[0] === 'code' && words.length <= 2;
    if (!refresh) return false;
    const waiting = this.getAccountsAwaitingPairingCode();
    // Only intercept while a pairing-code link is waiting; otherwise input keeps its normal meaning.
    if (!waiting.length) return false;
    const requested = words[0] === 'code' ? words[1] : null;
    const normalize = phone => String(phone).replace(/^\+/, '');
    const phone = requested
      ? waiting.find(entry => normalize(entry) === normalize(requested))
      : waiting.length === 1 ? waiting[0] : null;
    if (requested && !phone) return false;
    return this.refreshPairingCode(phone, waiting, requestCode);
  }

  async refreshPairingCode(phone, waiting, requestCode) {
    if (!phone) {
      console.log(`Several accounts are linking. Use: code <phone> (${waiting.join(', ')})`);
      return true;
    }
    if (this.refreshingPairingCode) {
      console.log('A new pairing code is already being requested. Please wait.');
      return true;
    }
    this.refreshingPairingCode = true;
    console.log(`\nRequesting a new WhatsApp pairing code for ${phone}...`);
    try {
      await requestCode?.(phone);
    } catch (error) {
      console.log(`Could not refresh the pairing code: ${error.message}`);
    } finally {
      this.refreshingPairingCode = false;
    }
    return true;
  }

  setLinkingChallenge(phoneNumber, active, details = {}) {
    if (active) this.linkingChallenges.add(phoneNumber);
    else this.linkingChallenges.delete(phoneNumber);
    if (active && details.kind === 'code' && details.code) this.pairingCodes.set(phoneNumber, details.code);
    else if (!active || details.kind === 'qr') this.pairingCodes.delete(phoneNumber);
    // A QR code needs the whole screen; panels are pinned again on the next dashboard render.
    if (active && details.kind === 'qr') this.layout.release();
    else this.renderInputPanel();
  }

  recordNotice(message, level = 'info') {
    if (!this.isMonitoring || this.isSelectingLinkingMethod || this.linkingChallenges.size) return false;
    if (message.trim() && ['error', 'warn', 'ready', 'success'].includes(level)) {
      this.lastNotice = message.replace(/\s+/g, ' ').slice(0, 180);
      this.requestDashboardRefresh();
    }
    return true;
  }

  requestDashboardRefresh() {
    if (!this.isMonitoring || this.dashboardRefreshTimer) return;
    this.dashboardRefreshTimer = setTimeout(() => {
      this.dashboardRefreshTimer = null;
      this.refreshDashboard();
    }, 100);
  }

  refreshDashboard(force = false) {
    if (!this.isMonitoring || this.commandRunning || this.isSelectingLinkingMethod ||
        this.numberMenu.pending || this.linkingChallenges.size || this.isCampaignMenuActive?.()) return;
    this.displayHealthDashboard(force);
  }

  /**
   * NEW: Set account config manager reference
   */
  setAccountConfigManager(accountConfigManager) {
    this.accountConfigManager = accountConfigManager;
  }

  /**
   * Set master phone number for re-link commands
   */
  setMasterPhoneNumber(phoneNumber) {
    this.masterPhoneNumber = phoneNumber;
  }

  setConnectionSources(accountClients, connectionManagers) {
    this.accountClients = accountClients;
    this.connectionManagers = connectionManagers;
  }

  /**
   * NEW: Show master account selection UI (Phase 10)
   * Displays available master accounts and prompts user to select one
   */
  async showMasterSelection(onRelinkMaster) {
    try {
      if (!this.accountConfigManager) {
        console.log(`\n❌ Account manager not available\n`);
        return;
      }

      // Get all master accounts
      const masterAccounts = this.accountConfigManager.getAllAccounts?.()?.filter(a => a.role === 'master') || [];
      
      if (masterAccounts.length === 0) {
        console.log(`\n⚠️  No master accounts found.\n`);
        console.log(`   Use 'link master <+phone>' to add a master account.\n`);
        return;
      }

      if (masterAccounts.length === 1) {
        // Only one master - auto-select
        const master = masterAccounts[0];
        console.log(`\n⏳ Auto-relinking: ${master.displayName} (${master.phoneNumber})`);
        if (onRelinkMaster) {
          await onRelinkMaster(master.phoneNumber);
        }
        return;
      }

      // Multiple masters - show selection UI
      console.log(`\n📱 Available Master Accounts:`);
      console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      
      masterAccounts.forEach((account, index) => {
        console.log(`  [${index + 1}] ${account.displayName}`);
        console.log(`       └─ Phone: ${account.phoneNumber}`);
        if (account.servants && account.servants.length > 0) {
          console.log(`       └─ Servants: ${account.servants.length}`);
        }
      });
      console.log();
      console.log(`  💡 Usage: 'relink master <phone>'`);
      console.log(`     (e.g., 'relink master ${masterAccounts[0].phoneNumber}')\n`);

    } catch (error) {
      console.log(`\n❌ Error showing master selection: ${error.message}\n`);
    }
  }

  /**
   * Initialize readline interface for user input
   */
  initializeInput() {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: colorize('▶ Linda Bot > ', PANEL_COLORS.input, { bold: true })
      });
    }
    return this.rl;
  }

  selectLinkingMethod(phoneNumber) {
    return this.queuedChoice(
      `\nLink ${phoneNumber}\n  [1] Pairing code (default)\n  [2] QR code\nChoose 1/code or 2/qr [1], or cancel: `,
      { '': 'code', 1: 'code', code: 'code', 2: 'qr', qr: 'qr' },
      'Invalid choice. Enter 1/code, 2/qr, or cancel.',
      'Linking selection timed out. Run link master to try again.',
      'Linking cancelled by user'
    );
  }

  /**
   * Ask how to activate a linked-but-offline master: reconnect keeps the
   * existing linked device; relinking registers it again with code/QR.
   */
  selectMasterActivation(phoneNumber) {
    return this.queuedChoice(
      `\nMaster ${phoneNumber} is offline\n  [1] Reconnect saved linked session (default, no relink)\n` +
        '  [2] Relink with pairing code\n  [3] Relink with QR code\nChoose 1/reconnect, 2/code or 3/qr [1], or cancel: ',
      { '': 'reconnect', 1: 'reconnect', reconnect: 'reconnect', 2: 'code', code: 'code', 3: 'qr', qr: 'qr' },
      'Invalid choice. Enter 1/reconnect, 2/code, 3/qr, or cancel.',
      `Master activation prompt timed out. Use recover ${phoneNumber} or relink master ${phoneNumber}.`,
      'Master activation cancelled by user'
    );
  }

  queuedChoice(question, choices, invalidText, timeoutText, cancelText) {
    const select = async () => {
      const input = this.rl?.input || process.stdin;
      if (this.rl?.closed || input.destroyed || input.readable === false) {
        throw new Error('Terminal input is unavailable. Start linking with link-code or link-qr.');
      }

      const rl = this.initializeInput();
      this.isSelectingLinkingMethod = true;
      this.activeQuestion = question;
      this.renderInputPanel();
      // While the question is pinned in the INPUT panel, the prompt line stays short.
      const prompt = this.layout.current && this.usePanels
        ? colorize('▶ Answer > ', PANEL_COLORS.input, { bold: true })
        : question;
      try {
        while (true) {
          const answer = await new Promise((resolve, reject) => {
            const onClose = () => {
              clearTimeout(timer);
              reject(new Error('Linking selection cancelled: terminal closed'));
            };
            const timer = setTimeout(() => {
              rl.removeListener('close', onClose);
              controller.abort();
              reject(new Error(timeoutText));
            }, 120000);
            const controller = new AbortController();
            rl.once('close', onClose);
            rl.question(
              prompt,
              { signal: controller.signal },
              (input) => {
                clearTimeout(timer);
                rl.removeListener('close', onClose);
                resolve(input.trim().toLowerCase());
              }
            );
          });
          if (Object.hasOwn(choices, answer)) {
            return choices[answer];
          }
          if (answer === 'cancel') {
            throw new Error(cancelText);
          }
          console.log(invalidText);
        }
      } finally {
        this.isSelectingLinkingMethod = false;
        this.activeQuestion = null;
        this.renderInputPanel();
      }
    };
    const selection = this.linkingPromptQueue.then(select);
    // A cancelled prompt must not block other accounts waiting for a choice.
    this.linkingPromptQueue = selection.then(() => undefined, () => undefined);
    return selection;
  }

  /**
   * Display comprehensive health dashboard with device tracking
   */
  displayHealthDashboard(force = false) {
    const accounts = this.accountConfigManager?.getAllAccounts() || [];
    const devices = this.deviceManager?.getAllDevices() || [];
    const rows = new Map(accounts.map(account => [account.phoneNumber, account]));
    for (const device of devices) rows.set(device.phoneNumber, { ...rows.get(device.phoneNumber), ...device });
    const sessionState = services.get('sessionStateManager');
    const lines = [];
    let active = 0;
    let saved = 0;
    let linked = 0;
    let deviceNumber = 0;
    for (const [phone, device] of rows) {
      const metadata = sessionState?.getDeviceMetadata(phone) || {};
      const clientId = SessionManager.resolveClientId(phone, metadata, device);
      const manager = this.connectionManagers?.get(phone);
      const connected = this.accountClients?.has(phone) && manager?.state === 'CONNECTED';
      const inProgress = manager && !manager.authRequired &&
        (manager.isInitializing || manager.isReconnecting || manager.state === 'CONNECTING');
      const authRequired = !connected && !inProgress && (manager?.authRequired ||
        device.status === 'auth_required' || metadata.status === 'auth_required');
      const loggedOut = !connected && !inProgress && (['logged_out', 'auth_failed'].includes(device.status) ||
        ['logged_out', 'auth_failed'].includes(metadata.status));
      const canRestore = !loggedOut && SessionManager.canRestoreSession(clientId);
      const online = this.accountClients ? connected :
        device.status === 'linked' && device.isOnline === true;
      const previouslyLinked = Boolean(online || metadata.deviceLinked || metadata.linkedAt || device.linkedAt);
      if (previouslyLinked && !loggedOut) linked++;
      const status = loggedOut ? 'LOGGED OUT' : online ? 'ACTIVE' : authRequired ? 'AUTH REQUIRED' :
        inProgress ? (manager.isReconnecting ? 'RECONNECTING' : 'CONNECTING') :
        device.status === 'paused' || metadata.status === 'paused' ? 'PAUSED' :
        device.status === 'restoring' || device.status === 'restore_failed' && manager?.reconnectTimer ? 'RECONNECTING' :
          device.status === 'restore_failed' ? 'RESTORE FAILED' :
        device.status === 'authenticated' ? 'AUTHENTICATED' :
          manager?.state === 'CONNECTING' ? 'CONNECTING' :
            device.status === 'linking' ? 'LINKING' :
              ['ERROR', 'SUSPENDED'].includes(manager?.state) || device.status === 'error' ? 'ERROR' : 'OFFLINE';
      if (online && !loggedOut) active++;
      if (canRestore) saved++;
      const master = phone === (this.accountConfigManager?.getMasterPhoneNumber?.() || this.masterPhoneNumber);
      const link = loggedOut ? 'NOT LINKED (logged out)' : previouslyLinked ? 'LINKED' :
        status === 'LINKING' ? 'LINKING' : 'NOT LINKED';
      lines.push(`${++deviceNumber}. ${device.displayName || device.name || phone}${master ? ' [MASTER]' : ''} | ${phone} | Link: ${link} | Connection: ${status} | session: ${canRestore ? `saved (${clientId})` : online ? 'active; save pending' : 'relink needed'}`);
      if (previouslyLinked && !online && !loggedOut && !inProgress) {
        lines.push(`   Linked device; currently offline. ${
          !canRestore ? `No saved WhatsApp login on this computer; relink needed: relink ${master ? 'master' : 'servant'} ${phone}` :
            authRequired ? `WhatsApp Web asked to verify this session. Reactivate first: recover ${phone} | relink only if it fails: relink ${master ? 'master' : 'servant'} ${phone}` :
              `Reactivate (no relink): recover ${phone}`}`);
      } else if (loggedOut) {
        lines.push(`   Device was removed or logged out. Relink: relink ${master ? 'master' : 'servant'} ${phone}`);
      }
      const lastError = manager?.connectionFailureReason || device.lastError || metadata.lastError;
      if (!online && !inProgress && lastError) {
        lines.push(`   Connection error: ${String(lastError).replace(/\s+/g, ' ').slice(0, 240)}`);
      }
    }
    const screen = [
      'LINDA | DEVICE DASHBOARD',
      `Devices: ${rows.size} | Linked: ${linked} | Active (online): ${active} | Offline: ${rows.size - active} | Saved sessions: ${saved}`,
      'Linked = registered on the phone (last known). Active = connected now. Reactivating an offline linked device does not need relinking.',
      ...lines,
      this.lastCommand ? `Last command: ${this.lastCommand}` : '',
      this.lastNotice ? `Notice: ${this.lastNotice}` : '',
      this.features.summaryLine(),
      COMMAND_HINT,
    ].filter(Boolean).join('\n');
    const usePanels = this.usePanels;
    if (!force && screen === this.lastDashboard && (!usePanels || this.layout.current)) return;
    this.lastDashboard = screen;
    if (usePanels) {
      // Feature counters get their own panel; drop the summary and hint lines from OUTPUT.
      const outputLines = screen.split('\n').slice(1, -2);
      const result = this.layout.render(
        { title: 'OUTPUT · LINDA DEVICE DASHBOARD', lines: outputLines },
        { title: 'INPUT · YOUR ACTION', lines: this.inputPanelLines() },
        this.featurePanel(),
      );
      // A full re-pin clears the log area, so put the prompt back.
      if (result === 'repinned' && this.isMonitoring && !this.commandRunning && !this.isSelectingLinkingMethod) {
        this.rl?.prompt(true);
      }
      return;
    }
    // Replace the terminal viewport, never the scrollback or redirected output.
    if (process.stdout.isTTY) {
      readline.cursorTo(process.stdout, 0, 0);
      readline.clearScreenDown(process.stdout);
    }
    console.log(`\n${screen}\n`);
  }

  /**
   * Display GorahaBot contact status information
   * Called when user types 'goraha status' or 'goraha verify'
   */
  displayGorahaStatus(stats, validation) {
    try {
      const timestamp = new Date().toLocaleTimeString();
      
      // Section 1: Contact Statistics
      console.log(`\n📊 GORAHA BOT - CONTACT STATISTICS`);
      console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      
      if (stats.error) {
        console.log(`  ⚠️  ERROR: ${stats.error}`);
        if (stats.lastFetched) {
          console.log(`  Last Successful Fetch: ${new Date(stats.lastFetched).toLocaleString()}`);
        }
      } else {
        console.log(`  Total Contacts:          ${stats.total || 0}`);
        console.log(`  "D2 Security" Contacts:  ${stats.d2SecurityCount || 0}`);
        const d2Percentage = stats.total > 0 ? Math.round((stats.d2SecurityCount / stats.total) * 100) : 0;
        console.log(`  Percentage:              ${d2Percentage}%`);
        console.log(`  Data Status:             ${stats.cached ? '📦 Cached' : '🔄 Fresh'}`);
        console.log(`  Last Fetched:            ${new Date(stats.lastFetched).toLocaleString()}`);
      }
      console.log();

      // Section 2: Account Status
      console.log(`📱 GOOGLE SERVICE ACCOUNT STATUS`);
      console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      
      if (validation.error) {
        console.log(`  ❌ Account Status: INVALID`);
        console.log(`  Error: ${validation.error}`);
      } else {
        const accountStatusSymbol = validation.isActive ? '✅' : '❌';
        const accountStatusText = validation.isActive ? 'ACTIVE & VALID' : 'INVALID / UNREACHABLE';
        
        console.log(`  Account Status:          ${accountStatusSymbol} ${accountStatusText}`);
        console.log(`  Structure Valid:         ${validation.structureValid ? '✅ Yes' : '❌ No'}`);
        console.log(`  API Access Valid:        ${validation.apiAccessValid ? '✅ Yes' : '❌ No'}`);
      }
      
      if (validation.details && validation.details.email) {
        console.log(`  Service Account Email:   ${validation.details.email}`);
      }
      if (validation.details && validation.details.project) {
        console.log(`  Google Cloud Project:    ${validation.details.project}`);
      }
      
      console.log(`  Last Checked:            ${new Date().toLocaleTimeString()}`);
      console.log();

      // Section 3: Next Steps
      console.log(`💡 COMMANDS:`);
      console.log(`  goraha status            → Refresh contact stats (uses cache if recent)`);
      console.log(`  goraha verify            → Force full verification and recount`);
      console.log(`  goraha filter <string>   → Search for specific contacts`);
      console.log();

    } catch (error) {
      console.log(`\n❌ Error displaying GorahaBot status: ${error.message}\n`);
    }
  }

  /**
   * Display GorahaBot filter results
   * Called when user types 'goraha filter <search_string>'
   */
  displayGorahaFilterResults(result) {
    try {
      const timestamp = new Date().toLocaleTimeString();
      
      console.log(`\n🔍 GORAHA BOT - FILTERED CONTACT SEARCH`);
      console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  Search Filter:           "${result.filterString}"`);
      console.log();
      
      if (result.error) {
        console.log(`  ⚠️  ERROR: ${result.error}`);
        console.log();
      } else {
        console.log(`  📱 RESULTS`);
        console.log(`  ────────────────────────────────────────────────────`);
        console.log(`  Total Matches Found:     ${result.totalMatched}`);
        console.log();

        if (result.totalMatched > 0 && result.contacts && result.contacts.length > 0) {
          console.log(`  📋 MATCHING CONTACTS:`);
          console.log(`  ────────────────────────────────────────────────────`);
          
          result.contacts.slice(0, 50).forEach((contact, index) => {
            // Extract contact name/email
            let displayName = contact.names?.[0]?.displayName || 'Unknown';
            let emails = contact.emailAddresses?.map(e => e.value).join(', ') || 'No email';
            let phones = contact.phoneNumbers?.map(p => p.value).join(', ') || 'No phone';
            
            console.log(`  ${index + 1}. ${displayName}`);
            if (emails !== 'No email') {
              console.log(`     📧 ${emails}`);
            }
            if (phones !== 'No phone') {
              console.log(`     ☎️  ${phones}`);
            }
          });

          if (result.totalMatched > 50) {
            console.log(`  ... and ${result.totalMatched - 50} more contacts`);
          }
        } else {
          console.log(`  ❌ No contacts found matching "${result.filterString}"`);
        }
        
        console.log();
        console.log(`  Fetched:                 ${new Date(result.lastFetched).toLocaleString()}`);
      }
      console.log();

      // Section 2: Commands
      console.log(`💡 NEXT STEPS:`);
      console.log(`  goraha filter <string>   → Search with different filter`);
      console.log(`  goraha status            → View overview statistics`);
      console.log(`  goraha verify            → Force full verification`);
      console.log();

    } catch (error) {
      console.log(`\n❌ Error displaying filtered results: ${error.message}\n`);
    }
  }

  /**
   * Prompt user to re-link an inactive account
   */
  async promptForReLink() {
    const report = accountHealthMonitor.generateDetailedHealthReport();
    const inactiveAccounts = report.whatsappAccounts.details.filter(a => a.status === 'unhealthy');

    if (inactiveAccounts.length === 0) {
      console.log(`\n✅ All WhatsApp accounts are active. No re-linking needed.\n`);
      return;
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`⚠️  INACTIVE ACCOUNTS DETECTED (${inactiveAccounts.length})`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`\nThe following accounts need to be re-linked:\n`);
    
    inactiveAccounts.forEach((account, index) => {
      console.log(`${index + 1}. ${account.phoneNumber} (Status: ${account.status}, Attempts: ${account.recoveryAttempts})`);
    });

    console.log(`\nOptions:`);
    console.log(`1. Re-link an account (will be linked on next bot restart)`);
    console.log(`2. View detailed health report`);
    console.log(`3. Cancel\n`);

    return new Promise((resolve) => {
      this.initializeInput().question('Choose option (1-3): ', async (answer) => {
        if (answer === '1') {
          console.log(`\nWhich account to re-link?\n`);
          inactiveAccounts.forEach((account, index) => {
            console.log(`${index + 1}. ${account.phoneNumber}`);
          });
          
          this.rl.question('\nEnter account number (or press Enter to cancel): ', async (accountChoice) => {
            const idx = parseInt(accountChoice) - 1;
            
            if (idx >= 0 && idx < inactiveAccounts.length) {
              const selectedAccount = inactiveAccounts[idx];
              const success = await accountHealthMonitor.promptReLinkAccount(selectedAccount.phoneNumber);
              
              if (success) {
                console.log(`\n✅ Re-linking process initiated for ${selectedAccount.phoneNumber}`);
              } else {
                console.log(`\n❌ Re-linking process failed for ${selectedAccount.phoneNumber}`);
              }
            } else if (accountChoice.trim() !== '') {
              console.log(`\n⚠️  Invalid selection`);
            } else {
              console.log(`\nCancelled.`);
            }
            
            resolve();
          });
        } else if (answer === '2') {
          this.displayHealthDashboard();
          resolve();
        } else {
          console.log(`\nCancelled.`);
          resolve();
        }
      });
    });
  }

  /**
   * Start auto-refresh timer (every 60 seconds)
   */
  startAutoRefresh(onRefresh) {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }
    
    this.autoRefreshInterval = setInterval(() => {
      if (this.isMonitoring && onRefresh) {
        onRefresh();
      }
    }, this.autoRefreshDelay);
  }

  /**
   * Stop auto-refresh timer
   */
  stopAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  }

  /**
   * Start interactive monitoring with user input and auto-refresh
   */
  async startInteractiveMonitoring(callbacks = {}) {
    this.initializeInput();
    this.isMonitoring = true;

    const {
      onLinkMaster,  // NEW: Manual linking with health check (Phase 21)
      onAddNewMaster,  // NEW: Add new master account (Phase 25)
      onRelinkMaster,
      onRelinkServant,  // NEW: Add servant relink support (Phase 24)
      onRelinkDevice,
      onSwitchTo6Digit,
      onShowDeviceDetails,
      onListDevices,
      onRestoreAllSessions,  // NEW: Restore all previous sessions (Phase 28)
      onRestoreAccount,
      onDisconnectAccount,
      onListChats,
      onAnalyzeChat,
      onCampaigns,
      onCampaignInput,
      isCampaignMenuActive,
      onGorahaStatusRequested,  // NEW: GorahaBot status (Phase 26)
      onGorahaFilterRequested,  // NEW: GorahaBot filter (Phase 28)
      onAnalyticsReportRequested,  // NEW: Analytics reporting (Phase 29e)
      onGoogleSheetsRead,  // NEW: Google Sheets read (Phase 30)
      onGoogleSheetsCreate,  // NEW: Google Sheets create (Phase 30)
      onGoogleSheetsUpdate,  // NEW: Google Sheets update (Phase 30)
      onGoogleSheetsDelete,  // NEW: Google Sheets delete (Phase 30)
      onGoogleSheetsSearch,  // NEW: Google Sheets search (Phase 30)
      onGoogleSheetsMetadata,  // NEW: Google Sheets metadata (Phase 30)
    } = callbacks;
    this.isCampaignMenuActive = isCampaignMenuActive;

    // Start auto-refresh
    this.startAutoRefresh(() => {
      this.refreshDashboard();
    });

    this.rl.on('line', async (input) => {
      if (this.isSelectingLinkingMethod) {
        return;
      }
      const pairingRefresh = this.handlePairingCodeInput(input, onSwitchTo6Digit);
      if (pairingRefresh) {
        await pairingRefresh;
        return;
      }
      if (this.commandRunning) {
        console.log('A command is still running. Wait for it to finish.');
        return;
      }
      if (this.isCampaignMenuActive?.()) {
        this.commandRunning = true;
        try {
          await onCampaignInput(input);
        } catch (error) {
          console.error(`Campaign command failed: ${error.message}`);
        } finally {
          this.commandRunning = false;
          if (!this.isCampaignMenuActive()) this.refreshDashboard(true);
          this.rl.prompt();
        }
        return;
      }
      const shortcut = this.features.resolve(input);
      if (shortcut?.error) {
        console.log(shortcut.error);
        if (this.isMonitoring) this.rl.prompt();
        return;
      }
      if (shortcut) input = shortcut.command;
      try {
        const selection = shortcut ? {} : this.numberMenu.handleInput(input);
        if (selection.command) {
          input = selection.command;
        } else if (selection.handled) {
          if (/^menu$/i.test(input.trim())) {
            this.features.record('menu');
            this.renderInputPanel();
          }
          if (this.isMonitoring) {
            this.rl.prompt();
          }
          return;
        }
      } catch (error) {
        console.error(`Numbered menu failed: ${error.message}`);
        return;
      }
      const input_original = input.trim();
      const parts = input_original.split(/\s+/);
      const command = parts[0].toLowerCase();
      if (['link', 'relink', 'link-method', 'goraha', 'analytics', 'metrics', 'google', 'sheets'].includes(command) && parts[1]) {
        parts[1] = parts[1].toLowerCase();
      }

      // Helper function to extract display name with quoted string support
      const extractDisplayName = (originalInput, phoneNumber) => {
        // Find the phone number in the original input
        const phoneIndex = originalInput.indexOf(phoneNumber);
        if (phoneIndex === -1) return '';
        
        // Get everything after the phone number
        let afterPhone = originalInput.substring(phoneIndex + phoneNumber.length).trim();
        
        // Remove quotes if present
        if ((afterPhone.startsWith('"') && afterPhone.endsWith('"')) ||
            (afterPhone.startsWith("'") && afterPhone.endsWith("'"))) {
          afterPhone = afterPhone.slice(1, -1);
        }
        
        return afterPhone;
      };

      if (this.commandRunning) {
        console.log('A command is still running. Wait for it to finish.');
        return;
      }
      this.commandRunning = true;
      this.lastCommand = input_original;
      this.features.record(command);
      try {
      switch (command) {
        case 'features':
          for (const line of this.features.listLines()) console.log(line);
          break;

        case 'sentiment':
        case 'intent': {
          const text = input_original.slice(parts[0].length).trim();
          if (!text) {
            console.log(`Usage: ${command} <text>`);
            break;
          }
          for (const line of command === 'sentiment' ? sentimentLines(text) : intentLines(text)) console.log(line);
          break;
        }

        case 'similar':
          for (const line of similarLines(input_original.slice(parts[0].length))) console.log(line);
          break;

        case 'dedupe': {
          const file = input_original.slice(parts[0].length).trim().replace(/^["']|["']$/g, '');
          if (!file) {
            console.log('Usage: dedupe <contacts.csv|contacts.xlsx|contacts.json>');
            break;
          }
          for (const line of await dedupeLines(file)) console.log(line);
          break;
        }

        case 'score':
          for (const line of await scoreLines(this.connectionManagers, parts[1] || null)) console.log(line);
          break;

        case 'validate': {
          if (!parts[1]) {
            console.log('Usage: validate <number>');
            break;
          }
          const sender = pickClient(this.accountClients, this.connectionManagers,
            this.accountConfigManager?.getMasterPhoneNumber?.() || this.masterPhoneNumber);
          for (const line of await validateLines(parts.slice(1).join(''), sender?.client)) console.log(line);
          break;
        }

        case 'send': {
          const number = parts[1];
          const message = number ? input_original.slice(input_original.indexOf(number) + number.length).trim() : '';
          if (!number || !message) {
            console.log('Usage: send <number> <message>');
            break;
          }
          const sender = pickClient(this.accountClients, this.connectionManagers,
            this.accountConfigManager?.getMasterPhoneNumber?.() || this.masterPhoneNumber);
          if (!sender) {
            console.log('No active WhatsApp connection. Reactivate a device first (recover <phone>).');
            break;
          }
          const preview = message.length > 60 ? `${message.slice(0, 57)}...` : message;
          const answer = await this.queuedChoice(
            `\nSend from ${sender.phone} to ${number}:\n  "${preview}"\nConfirm y/yes or n/no [n]: `,
            { '': 'no', n: 'no', no: 'no', y: 'yes', yes: 'yes' },
            'Enter y/yes or n/no.',
            'Send confirmation timed out; nothing was sent.',
            'Send cancelled; nothing was sent.',
          );
          if (answer !== 'yes') {
            console.log('Send cancelled; nothing was sent.');
            break;
          }
          const result = await sendSingleMessage(sender.client, number, message);
          this.lastNotice = `Sent to ${result.to} from ${sender.phone}`;
          console.log(`✅ Sent to ${result.to} from ${sender.phone}${result.id ? ` (id ${result.id})` : ''}`);
          break;
        }

        case 'campaigns':
          if (!onCampaigns) throw new Error('Terminal campaigns are unavailable.');
          await onCampaigns();
          break;
        case 'link-code':
        case 'link-qr':
          if (parts.length !== 1) {
            console.error('Use link-code or link-qr without arguments to link the configured master.');
            break;
          }
          if (!onLinkMaster) {
            console.error('Master linking handler is not available.');
            break;
          }
          await onLinkMaster(command === 'link-code' ? 'code' : 'qr');
          break;

        case 'link-method':
          console.log('Linking preferences are no longer saved. Use link-code or link-qr to start linking directly.');
          break;

        // NEW: Link master account with health check (Phase 21 & enhanced Phase 25)
        case 'link':
          if (parts[1] === 'master') {
            const phoneNumber = parts[2]; // e.g., +971553633595
            const displayName = extractDisplayName(input_original, phoneNumber); // e.g., Big Broker
            
            if (phoneNumber) {
              // NEW: Link new master account (Phase 25)
              console.log(`\n⏳ Adding new master account...`);
              if (onAddNewMaster) {
                await onAddNewMaster(phoneNumber, displayName);
              } else {
                console.log(`❌ Add master handler not available\n`);
              }
            } else {
              // Original: Link first/default master (Phase 21)
              console.log(`\n⏳ Initiating master account linking...`);
              if (onLinkMaster) {
                await onLinkMaster();
              } else {
                console.log(`❌ Linking handler not available\n`);
              }
            }
          } else {
            console.log(`\n⚠️  Usage: 'link master' or 'link master <+phone> [name]'\n`);
          }
          break;

        case 'status':
          this.displayHealthDashboard(true);
          break;

        case 'relink':
          if (parts[1] === 'master') {
            // NEW: Support "relink master <phone>" for specific master account
            const masterPhone = parts[2];
            
            if (masterPhone) {
              // Specific master requested - relink directly
              console.log(`\n⏳ Re-linking master account: ${masterPhone}...`);
              if (onRelinkMaster) {
                await onRelinkMaster(masterPhone);
              }
            } else {
              // No phone specified - show master selection UI
              if (this.accountConfigManager) {
                await this.showMasterSelection(onRelinkMaster);
              } else {
                // Fallback: use default master phone
                const defaultMasterPhone = this.masterPhoneNumber;
                if (defaultMasterPhone) {
                  console.log(`\n⏳ Re-linking master account: ${defaultMasterPhone}...`);
                  if (onRelinkMaster) {
                    await onRelinkMaster(defaultMasterPhone);
                  }
                } else {
                  console.log(`\n⚠️  No master account specified.`);
                  console.log(`   Usage: 'relink master [+phone-number]'`);
                  console.log(`   Example: 'relink master +971505760056'\n`);
                }
              }
            }
          } else if (parts[1] === 'servant') {
            // NEW: Support "relink servant <phone>" for servant account relinking
            const servantPhone = parts[2];
            if (servantPhone) {
              console.log(`\n⏳ Re-linking servant account: ${servantPhone}...`);
              if (onRelinkServant) {
                await onRelinkServant(servantPhone);
              }
            } else {
              console.log(`\n⚠️  No servant account specified.`);
              console.log(`   Usage: 'relink servant <+phone-number>'`);
              console.log(`   Example: 'relink servant +971553633595'\n`);
            }
          } else if (parts[1]) {
            const phoneNumber = parts[1];
            console.log(`\n⏳ Re-linking device ${phoneNumber}...`);
            if (onRelinkDevice) {
              await onRelinkDevice(phoneNumber);
            }
          } else {
            console.log(`\n⚠️  Usage:`);
            console.log(`   'relink master [+phone]'          → Re-link master account`);
            console.log(`   'relink <phone>'                  → Re-link specific device\n`);
          }
          break;

        case 'code':
          if (parts[1]) {
            const phoneNumber = parts[1];
            console.log(`\nRequesting WhatsApp pairing code for ${phoneNumber}...`);
            if (onSwitchTo6Digit) {
              await onSwitchTo6Digit(phoneNumber);
            }
          } else {
            console.log(`\n⚠️  Usage: 'code <phone>'\n`);
          }
          break;

        case 'disconnect':
          if (!parts[1] || parts.length !== 2) throw new Error('Usage: disconnect <phone> (keeps the local session)');
          if (!onDisconnectAccount) throw new Error('Local disconnect is unavailable');
          await onDisconnectAccount(parts[1]);
          this.lastNotice = 'Disconnected locally; saved session retained. Recover explicitly or restart to reconnect.';
          break;

        case 'chats':
          if (!onListChats) throw new Error('Local conversation inspection is unavailable');
          if (parts.length > 3) throw new Error('Usage: chats [phone] [page]');
          await onListChats(parts[1], parts[2]);
          break;

        case 'analyze':
          if (!onAnalyzeChat) throw new Error('Local conversation analysis is unavailable');
          if (parts.length < 3 || parts.length > 4) throw new Error('Usage: analyze <phone> <chat-number> [message-limit]');
          await onAnalyzeChat(parts[1], parts[2], parts[3]);
          break;

        case 'device':
          if (parts[1]) {
            const phoneNumber = parts[1];
            this.displayDeviceDetails(phoneNumber);
          } else {
            console.log(`\n⚠️  Usage: 'device <phone>'\n`);
          }
          break;

        case 'list':
          if (onListDevices) {
            onListDevices();
          } else {
            this.listAllDevices();
          }
          break;

        case 'masters':
          // NEW: Show all master accounts
          if (this.accountConfigManager) {
            this.accountConfigManager.listAllAccountsWithRoles();
          } else {
            console.log(`\n⚠️  Account manager not available\n`);
          }
          break;

        case 'servants':
          // NEW: Show all servant accounts
          if (this.accountConfigManager) {
            this.accountConfigManager.listAllAccountsWithRoles();
          } else {
            console.log(`\n⚠️  Account manager not available\n`);
          }
          break;

        // NEW COMMANDS: Per-account health & monitoring (Phase 26)
        case 'accounts':
          // List all accounts with per-account status
          console.clear();
          console.log(`\n╔════════════════════════════════════════════════════════════╗`);
          console.log(`║           📱 ALL ACCOUNTS - STATUS OVERVIEW                 ║`);
          console.log(`╚════════════════════════════════════════════════════════════╝\n`);
          
          if (this.accountConfigManager && this.deviceManager) {
            try {
              const accounts = this.accountConfigManager.getAllAccounts();
              
              if (accounts.length === 0) {
                console.log(`  No accounts configured yet.\n`);
                break;
              }

              accounts.forEach((account, index) => {
                const device = this.deviceManager.getDevice(account.phoneNumber);
                const statusSymbol = device ? ({
                  'linked': '✅',
                  'linking': '⏳',
                  'error': '❌',
                  'unlinked': '❌'
                }[device.status] || '❓') : '❓';

                const onlineSymbol = device?.isOnline ? '🟢' : '🔴';
                const uptime = device?.uptime ? `${Math.floor(device.uptime / 60)}m` : '--';

                console.log(`  ${index + 1}. ${statusSymbol} ${account.phoneNumber}`);
                console.log(`     Name: ${account.displayName}`);
                console.log(`     Role: ${account.role.toUpperCase()}`);
                console.log(`     Status: ${device?.status?.toUpperCase() || 'UNKNOWN'} ${onlineSymbol}`);
                console.log(`     Uptime: ${uptime}`);
                console.log(`     Last Sync: ${device?.lastHeartbeat ? new Date(device.lastHeartbeat).toLocaleTimeString() : '--'}`);
                console.log();
              });
            } catch (error) {
              console.log(`  ❌ Error loading accounts: ${error.message}\n`);
            }
          } else {
            console.log(`  ⚠️  Account manager or device manager not available\n`);
          }
          break;

        case 'health':
          // Show detailed health for specific account
          if (parts[1]) {
            const phoneNumber = parts[1];
            console.clear();
            console.log(`\n╔════════════════════════════════════════════════════════════╗`);
            console.log(`║         📊 ACCOUNT HEALTH REPORT                          ║`);
            console.log(`╚════════════════════════════════════════════════════════════╝\n`);

            if (this.deviceManager) {
              const device = this.deviceManager.getDevice(phoneNumber);
              
              if (!device) {
                console.log(`  ❌ Account not found: ${phoneNumber}\n`);
                break;
              }

              try {
                const healthScore = this._calculateHealthScore(device);
                const healthStatus = this._getHealthStatus(healthScore);
                
                console.log(`  Account: ${phoneNumber}`);
                console.log(`  Display: ${device.name}`);
                console.log(`  Role: ${device.role.toUpperCase()}`);
                console.log();
                console.log(`  Status: ${device.status.toUpperCase()}`);
                console.log(`  Online: ${device.isOnline ? '🟢 YES' : '🔴 NO'}`);
                console.log(`  Health: ${healthStatus} (${healthScore}/100)`);
                console.log();
                console.log(`  Connection:`);
                console.log(`    Auth Method: ${device.authMethod || '--'}`);
                console.log(`    Linked At: ${device.linkedAt ? new Date(device.linkedAt).toLocaleString() : '--'}`);
                console.log(`    Last Heartbeat: ${device.lastHeartbeat ? new Date(device.lastHeartbeat).toLocaleTimeString() : '--'}`);
                console.log(`    Uptime: ${device.uptime ? Math.floor(device.uptime / 60) + 'm' : '--'}`);
                console.log();
                
                if (device.lastError) {
                  console.log(`  Last Error: ${device.lastError.message || device.lastError}`);
                  console.log();
                }

                console.log(`  IP Address: ${device.ipAddress || '--'}`);
                console.log(`  Create: ${device.createdAt ? new Date(device.createdAt).toLocaleDateString() : '--'}`);
                console.log();
              } catch (error) {
                console.log(`  ❌ Error generating health report: ${error.message}\n`);
              }
            } else {
              console.log(`  ⚠️  Device manager not available\n`);
            }
          } else {
            this.displayHealthDashboard(true);
          }
          break;

        case 'stats':
          // Show metrics for specific account
          if (parts[1]) {
            const phoneNumber = parts[1];
            console.clear();
            console.log(`\n╔════════════════════════════════════════════════════════════╗`);
            console.log(`║         📈 ACCOUNT METRICS                                 ║`);
            console.log(`╚════════════════════════════════════════════════════════════╝\n`);

            if (this.deviceManager) {
              const device = this.deviceManager.getDevice(phoneNumber);
              
              if (!device) {
                console.log(`  ❌ Account not found: ${phoneNumber}\n`);
                break;
              }

              try {
                const uptime = device.uptime || 0;
                const uptimeMins = Math.floor(uptime / 60000);
                const uptimeHours = Math.floor(uptimeMins / 60);
                const uptimeDays = Math.floor(uptimeHours / 24);
                
                // Get metrics from accountHealthMonitor if available
                const healthMetrics = accountHealthMonitor?.getMetrics?.(phoneNumber) || {};

                console.log(`  Account: ${phoneNumber}`);
                console.log(`  Display: ${device.name}`);
                console.log();
                console.log(`  UPTIME:`);
                if (device.isOnline) {
                  if (uptimeDays > 0) {
                    console.log(`    ${uptimeDays} days, ${uptimeHours % 24} hours, ${uptimeMins % 60} minutes`);
                  } else if (uptimeHours > 0) {
                    console.log(`    ${uptimeHours} hours, ${uptimeMins % 60} minutes`);
                  } else {
                    console.log(`    ${uptimeMins} minutes`);
                  }
                } else {
                  console.log(`    --  (offline)`);
                }
                console.log();
                
                console.log(`  ACTIVITY:`);
                console.log(`    Last Activity: ${device.lastActivity ? new Date(device.lastActivity).toLocaleTimeString() : '--'}`);
                console.log(`    Heartbeats: ${device.heartbeatCount || 0}`);
                console.log(`    Link Attempts: ${device.linkAttempts || 0}/${device.maxLinkAttempts || 5}`);
                console.log();

                console.log(`  HEALTH:`);
                console.log(`    Status: ${device.status.toUpperCase()}`);
                console.log(`    Online: ${device.isOnline ? 'YES' : 'NO'}`);
                console.log(`    Recovery Mode: ${device.recoveryMode ? 'YES' : 'NO'}`);
                console.log();

                if (healthMetrics.messageCount !== undefined) {
                  console.log(`  MESSAGES:`);
                  console.log(`    Messages Sent: ${healthMetrics.messageCount || 0}`);
                  console.log(`    Errors: ${healthMetrics.errorCount || 0}`);
                  console.log();
                }
              } catch (error) {
                console.log(`  ❌ Error generating stats: ${error.message}\n`);
              }
            } else {
              console.log(`  ⚠️  Device manager not available\n`);
            }
          } else {
            console.log(`\n⚠️  Usage: 'stats <+phone-number>'`);
            console.log(`  Example: 'stats +971505760056'\n`);
          }
          break;

        case 'recover':
          // Attempt session restoration for account
          if (parts[1]) {
            const phoneNumber = parts[1];
            console.log(`\n⏳ Attempting session restoration for ${phoneNumber}...`);
            
            try {
              if (!onRestoreAccount) throw new Error('Session restore handler is unavailable');
              await onRestoreAccount(phoneNumber);
            } catch (error) {
              this.lastNotice = `Restore failed: ${error.message}`;
              console.log(`  ❌ Error during recovery: ${error.message}\n`);
            }
          } else {
            console.log(`\n⚠️  Usage: 'recover <+phone-number>'`);
            console.log(`  Example: 'recover +971505760056'\n`);
          }
          break;

        case 'restore-sessions':
        case 'restore':
          // Restore all previous WhatsApp sessions
          console.clear();
          console.log(`\n╔════════════════════════════════════════════════════════════╗`);
          console.log(`║       🔄 RESTORING ALL PREVIOUS WHATSAPP SESSIONS            ║`);
          console.log(`╚════════════════════════════════════════════════════════════╝\n`);
          console.log(`⏳ Loading all saved sessions...\n`);
          
          if (onRestoreAllSessions) {
            try {
              await onRestoreAllSessions();
            } catch (error) {
              console.log(`  ❌ Error during restore: ${error.message}\n`);
            }
          } else {
            console.log(`  ⚠️  Restore function not available\n`);
          }
          break;

        // NEW: GorahaBot status (Phase 26 & 28)
        case 'goraha':
          if (parts[1] === 'verify' || parts[1] === 'v') {
            // Force verification
            console.clear();
            console.log(`\n╔════════════════════════════════════════════════════════════╗`);
            console.log(`║       📱 GORAHA BOT - VERIFICATION & STATUS CHECK           ║`);
            console.log(`╚════════════════════════════════════════════════════════════╝\n`);
            console.log(`⏳ Verifying GorahaBot service account...\n`);
            
            if (onGorahaStatusRequested) {
              try {
                await onGorahaStatusRequested(true); // true = force refresh
              } catch (error) {
                console.log(`  ❌ Error during verification: ${error.message}\n`);
              }
            } else {
              console.log(`  ⚠️  Goraha bridge not available\n`);
            }
          } else if (parts[1] === 'contacts' || parts[1] === 'count') {
            // Show total contacts count
            console.clear();
            console.log(`\n╔════════════════════════════════════════════════════════════╗`);
            console.log(`║          📱 GORAHA BOT - TOTAL CONTACTS COUNT               ║`);
            console.log(`╚════════════════════════════════════════════════════════════╝\n`);
            console.log(`⏳ Fetching total contacts count...\n`);
            
            if (onGorahaStatusRequested) {
              try {
                await onGorahaStatusRequested(false); // Get stats with total count
                console.log(`\n💡 Use 'goraha filter <string>' to find specific contacts`);
                console.log(`   Example: 'goraha filter D2 Security'\n`);
              } catch (error) {
                console.log(`  ❌ Error fetching contacts: ${error.message}\n`);
              }
            } else {
              console.log(`  ⚠️  Goraha bridge not available\n`);
            }
          } else if (parts[1] === 'filter' || parts[1] === 'search') {
            // Filter contacts by string
            const filterString = parts.slice(2).join(' ');
            
            if (!filterString || filterString.trim().length === 0) {
              console.log(`\n⚠️  Usage: 'goraha filter <search_string>'`);
              console.log(`   Example: 'goraha filter D2 Security'`);
              console.log(`   Example: 'goraha filter Broker'\n`);
              break;
            }

            console.clear();
            console.log(`\n╔════════════════════════════════════════════════════════════╗`);
            console.log(`║       📱 GORAHA BOT - FILTERED CONTACT SEARCH               ║`);
            console.log(`╚════════════════════════════════════════════════════════════╝\n`);
            console.log(`🔍 Searching for contacts matching: "${filterString}"\n`);
            console.log(`⏳ Loading...\n`);

            if (onGorahaFilterRequested) {
              try {
                await onGorahaFilterRequested(filterString);
              } catch (error) {
                console.log(`  ❌ Error during search: ${error.message}\n`);
              }
            } else {
              console.log(`  ⚠️  Goraha filter not available\n`);
            }
          } else if (!parts[1] || parts[1] === 'status') {
            // Display status (default command)
            console.clear();
            console.log(`\n╔════════════════════════════════════════════════════════════╗`);
            console.log(`║              📱 GORAHA BOT - CONTACT STATUS                ║`);
            console.log(`╚════════════════════════════════════════════════════════════╝\n`);
            console.log(`⏳ Fetching GorahaBot contact stats...\n`);
            
            if (onGorahaStatusRequested) {
              try {
                await onGorahaStatusRequested(false); // false = use cache if available
              } catch (error) {
                console.log(`  ❌ Error fetching status: ${error.message}\n`);
              }
            } else {
              console.log(`  ⚠️  Goraha bridge not available\n`);
            }
          } else {
            console.log(`\n⚠️  Usage:`);
            console.log(`  'goraha' or 'goraha status'     → Display contact stats (cached)`);
            console.log(`  'goraha verify'                 → Force verification and recount`);
            console.log(`  'goraha contacts' or 'count'    → Show total contacts count`);
            console.log(`  'goraha filter <string>'        → Search for specific contacts`);
            console.log(`\n  Examples:`);
            console.log(`    goraha filter D2 Security`);
            console.log(`    goraha filter Broker`);
            console.log(`    goraha filter Developer\n`);
          }
          break;

        // NEW: Analytics commands (Phase 29e)
        case 'analytics':
        case 'metrics':
          if (parts[1] === 'report') {
            // Generate full analytics report
            console.clear();
            console.log(`\n╔════════════════════════════════════════════════════════════╗`);
            console.log(`║           📊 FULL ANALYTICS REPORT - PHASE 29e              ║`);
            console.log(`╚════════════════════════════════════════════════════════════╝\n`);
            console.log(`⏳ Generating full analytics report...\n`);
            
            if (onAnalyticsReportRequested) {
              try {
                await onAnalyticsReportRequested('full');
              } catch (error) {
                console.log(`  ❌ Error generating report: ${error.message}\n`);
              }
            } else {
              console.log(`  ⚠️  Analytics engine not available\n`);
            }
          } else if (parts[1] === 'uptime') {
            // Show uptime metrics for all accounts
            console.clear();
            console.log(`\n╔════════════════════════════════════════════════════════════╗`);
            console.log(`║        ⏱️  UPTIME METRICS - ALL ACCOUNTS (Phase 29e)         ║`);
            console.log(`╚════════════════════════════════════════════════════════════╝\n`);
            console.log(`⏳ Loading uptime metrics...\n`);
            
            if (onAnalyticsReportRequested) {
              try {
                await onAnalyticsReportRequested('uptime');
              } catch (error) {
                console.log(`  ❌ Error fetching uptime metrics: ${error.message}\n`);
              }
            } else {
              console.log(`  ⚠️  Analytics engine not available\n`);
            }
          } else if (parts[1] === 'account' && parts[2]) {
            // Account-specific analytics
            const phoneNumber = parts[2];
            console.clear();
            console.log(`\n╔════════════════════════════════════════════════════════════╗`);
            console.log(`║        📈 ACCOUNT ANALYTICS - ${phoneNumber}                   ║`);
            console.log(`╚════════════════════════════════════════════════════════════╝\n`);
            console.log(`⏳ Loading account analytics...\n`);
            
            if (onAnalyticsReportRequested) {
              try {
                await onAnalyticsReportRequested('account', phoneNumber);
              } catch (error) {
                console.log(`  ❌ Error fetching account analytics: ${error.message}\n`);
              }
            } else {
              console.log(`  ⚠️  Analytics engine not available\n`);
            }
          } else {
            // Show real-time metrics dashboard
            console.clear();
            console.log(`\n╔════════════════════════════════════════════════════════════╗`);
            console.log(`║         📊 REAL-TIME METRICS DASHBOARD - Phase 29e          ║`);
            console.log(`╚════════════════════════════════════════════════════════════╝\n`);
            console.log(`⏳ Loading real-time metrics...\n`);
            
            if (onAnalyticsReportRequested) {
              try {
                await onAnalyticsReportRequested('realtime');
              } catch (error) {
                console.log(`  ❌ Error loading metrics: ${error.message}\n`);
              }
            } else {
              console.log(`  ⚠️  Analytics engine not available\n`);
            }
          }
          break;

        // NEW: Phase 30 - Google Sheets CRUD operations
        case 'google':
        case 'sheets':
          if (parts[1] === 'read') {
            const sheetId = parts[2];
            const range = parts[3] || 'Sheet1';
            if (sheetId) {
              if (onGoogleSheetsRead) {
                await onGoogleSheetsRead(sheetId, range);
              }
            } else {
              console.log(`\n⚠️  Usage: 'sheets read <spreadsheet-id> [range]'`);
              console.log(`     Example: 'sheets read 1A2B3C4D5E6F7G8H Sheet1!A1:Z100'\n`);
            }
          } else if (parts[1] === 'add' || parts[1] === 'create') {
            const sheetId = parts[2];
            const sheetName = parts[3] || 'Sheet1';
            const values = parts.slice(4);
            if (sheetId && values.length > 0) {
              if (onGoogleSheetsCreate) {
                await onGoogleSheetsCreate(sheetId, sheetName, values);
              }
            } else {
              console.log(`\n⚠️  Usage: 'sheets add <spreadsheet-id> <sheet-name> <value1> [value2] ...'`);
              console.log(`     Example: 'sheets add 1A2B3C4D5E6F7G8H Sheet1 John Doe john@example.com'\n`);
            }
          } else if (parts[1] === 'update') {
            const sheetId = parts[2];
            const cell = parts[3];
            const value = parts.slice(4).join(' ');
            if (sheetId && cell && value) {
              if (onGoogleSheetsUpdate) {
                await onGoogleSheetsUpdate(sheetId, cell, value);
              }
            } else {
              console.log(`\n⚠️  Usage: 'sheets update <spreadsheet-id> <cell> <value>'`);
              console.log(`     Example: 'sheets update 1A2B3C4D5E6F7G8H Sheet1!A1 Updated Value'\n`);
            }
          } else if (parts[1] === 'delete' || parts[1] === 'remove') {
            const sheetId = parts[2];
            const sheetName = parts[3] || 'Sheet1';
            const rowIndex = parseInt(parts[4]) || 1;
            if (sheetId) {
              if (onGoogleSheetsDelete) {
                await onGoogleSheetsDelete(sheetId, sheetName, rowIndex);
              }
            } else {
              console.log(`\n⚠️  Usage: 'sheets delete <spreadsheet-id> <sheet-name> [row-index]'`);
              console.log(`     Example: 'sheets delete 1A2B3C4D5E6F7G8H Sheet1 1'\n`);
            }
          } else if (parts[1] === 'search') {
            const sheetId = parts[2];
            const range = parts[3] || 'Sheet1';
            const searchValue = parts.slice(4).join(' ');
            if (sheetId && searchValue) {
              if (onGoogleSheetsSearch) {
                await onGoogleSheetsSearch(sheetId, range, searchValue);
              }
            } else {
              console.log(`\n⚠️  Usage: 'sheets search <spreadsheet-id> [range] <search-value>'`);
              console.log(`     Example: 'sheets search 1A2B3C4D5E6F7G8H Sheet1 John'\n`);
            }
          } else if (parts[1] === 'info' || parts[1] === 'meta' || parts[1] === 'metadata') {
            const sheetId = parts[2];
            if (sheetId) {
              if (onGoogleSheetsMetadata) {
                await onGoogleSheetsMetadata(sheetId);
              }
            } else {
              console.log(`\n⚠️  Usage: 'sheets info <spreadsheet-id>'`);
              console.log(`     Example: 'sheets info 1A2B3C4D5E6F7G8H'\n`);
            }
          } else {
            console.log(`\n📊 Google Sheets Operations (Phase 30):`);
            console.log(`   sheets read <id> [range]                → Read sheet data`);
            console.log(`   sheets add <id> <sheet> <values...>     → Add row to sheet`);
            console.log(`   sheets update <id> <cell> <value>       → Update cell value`);
            console.log(`   sheets delete <id> <sheet> [row]        → Delete row`);
            console.log(`   sheets search <id> [range] <text>       → Search for value`);
            console.log(`   sheets info <id>                        → Get sheet metadata\n`);
          }
          break;

        case 'help':
          console.log('Numbered menu: menu | 0 = back | 00 = home | dotted code = direct selection');
          console.log(`\n📚 Available Commands:`);
          console.log(`\n  ACCOUNT MANAGEMENT:`);
          console.log(`    link master               → Link first master WhatsApp account (with health check)`);
          console.log(`    link master <+phone> [n]  → Add additional master WhatsApp account`);
          console.log(`    accounts                  → List all accounts with per-account status`);
          console.log(`\n  ACCOUNT HEALTH & MONITORING:`);
          console.log(`    health <+phone>           → Show detailed health for specific account`);
          console.log(`    stats <+phone>            → Show metrics (uptime, messages, errors)`);
          console.log(`    recover <+phone>          → Attempt session restoration for one account`);
          console.log(`    restore-sessions / restore → Restore ALL previous WhatsApp sessions`);
          console.log(`\n  GORAHA BOT (Phase 28):`);
          console.log(`    goraha (or 'goraha status')  → Display contact stats (cached)`);
          console.log(`    goraha verify                → Force verification and recount`);
          console.log(`    goraha contacts (count)      → Show total contacts count`);
          console.log(`    goraha filter <string>       → Search contacts by name`);
          console.log(`\n  ANALYTICS (Phase 29e):`);
          console.log(`    analytics or metrics      → Show real-time metrics dashboard`);
          console.log(`    analytics report          → Generate full analytics report`);
          console.log(`    analytics uptime          → Show uptime metrics for all accounts`);
          console.log(`    analytics account <phone> → Show account-specific analytics`);
          console.log(`\n  GOOGLE SHEETS (Phase 30):`);
          console.log(`    sheets read <id> [range]                → Read sheet data`);
          console.log(`    sheets add <id> <sheet> <values...>     → Add row to sheet`);
          console.log(`    sheets update <id> <cell> <value>       → Update cell value`);
          console.log(`    sheets delete <id> <sheet> [row]        → Delete row`);
          console.log(`    sheets search <id> [range] <text>       → Search for value`);
          console.log(`    sheets info <id>                        → Get sheet metadata`);
          console.log(`\n  DEVICE MANAGEMENT:`);
          console.log(`    status / health           → Display full dashboard`);
          console.log(`    relink master [+phone]    → Re-link master account (optional: specify phone)`);
          console.log(`    relink servant [+phone]   → Re-link servant account`);
          console.log(`    relink <phone>            → Re-link specific device`);
          console.log(`    code <phone>              → Request WhatsApp pairing code`);
          console.log('    link-code                 → Link master with a pairing code (this attempt only)');
          console.log('    link-qr                   → Link master with a QR code (this attempt only)');
          console.log(`    device <phone>            → Show detailed device information`);
          console.log('    disconnect <phone>        → Close locally; keep the saved session');
          console.log('    chats [phone] [page]      → List available chats; no message history read');
          console.log('    analyze <phone> <n> [max] → Locally analyze selected chat (1-500 messages)');
          console.log(`    list                      → List all devices`);
          console.log(`    masters                   → Show all master accounts`);
          console.log(`    servants                  → Show all servant accounts`);
          console.log(`\n  MESSAGING & INTELLIGENCE (restored):`);
          console.log(`    send <number> <message>   → Send one message from the master (asks to confirm)`);
          console.log(`    validate <number>         → Normalize/validate a number; checks WhatsApp when online`);
          console.log(`    score [+phone]            → Health score 0-100 with trend and recommendations`);
          console.log(`    sentiment <text>          → Sentiment score, label and mood of a text`);
          console.log(`    intent <text>             → Classify intent and suggested reply strategy`);
          console.log(`    similar <a> | <b>         → Compare two names or phone numbers`);
          console.log(`    dedupe <file>             → Find duplicate contacts in CSV/XLSX/JSON`);
          console.log(`\n  SYSTEM:`);
          console.log(`    features                  → List all features with IDs (F1-F${this.features.features.length}) and usage counters`);
          console.log(`    f<id> [args] / #<id>      → Run a feature by number, e.g. f8 or f21 0501234567`);
          console.log(`    help                      → Show this help message`);
          console.log(`    quit / exit               → Exit monitoring\n`);
          break;

        case 'quit':
        case 'exit':
          console.log(`\n👋 Exiting device manager...\n`);
          this.features.flush();
          this.isMonitoring = false;
          this.stopAutoRefresh();
          clearTimeout(this.dashboardRefreshTimer);
          this.layout.close();
          if (this.rl) {
            this.rl.close();
            this.rl = null;
          }
          return;

        case '':
          // Empty input - refresh display
          this.displayHealthDashboard(true);
          break;

        default:
          if (input.trim()) {
            console.log(`\n❓ Unknown command: '${command}'. Type 'help' for available commands.\n`);
          }
      }
      } catch (error) {
        this.lastNotice = error.message;
        console.error(`Command failed: ${error.message}`);
      } finally {
        this.commandRunning = false;
        if (!['help', 'menu', 'campaigns', 'features'].includes(command)) this.refreshDashboard();
      }
      if (this.isMonitoring && !this.isSelectingLinkingMethod) {
        this.rl.prompt();
      }
    });

    this.rl.on('close', () => {
      this.isMonitoring = false;
      this.layout.close();
      this.stopAutoRefresh();
      clearTimeout(this.dashboardRefreshTimer);
    });

    // Initial display
    this.displayHealthDashboard();
    console.log('Type menu for numbered actions (2.1 = link-code, 2.2 = link-qr).');
    this.rl.prompt();
  }

  /**
   * Display quick status summary
   */
  displayQuickStatus() {
    const report = accountHealthMonitor.generateDetailedHealthReport();
    
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📊 QUICK STATUS`);
    console.log(`${'─'.repeat(60)}`);

    if (this.deviceManager) {
      const count = this.deviceManager.getDeviceCount();
      console.log(`Devices: ${count.linked}/${count.total} linked | Status: ${count.unlinked} unlinked, ${count.linking} linking`);
    }

    console.log(`WhatsApp: ${report.whatsappAccounts.active} active, ${report.whatsappAccounts.inactive} inactive, ${report.whatsappAccounts.warning} warning`);
    console.log(`Google: ${report.googleAccounts.connected} of ${report.googleAccounts.total} connected`);
    console.log(`System Uptime: ${report.systemStatus.uptime}`);
    console.log(`${'─'.repeat(60)}\n`);
  }

  /**
   * Display device details
   */
  displayDeviceDetails(phoneNumber) {
    if (!this.deviceManager) {
      console.log(`\n❌ Device manager not available\n`);
      return;
    }

    const device = this.deviceManager.getDevice(phoneNumber);
    if (!device) {
      console.log(`\n❌ Device not found: ${phoneNumber}\n`);
      return;
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📱 DEVICE DETAILS: ${device.name}`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`Phone Number:     ${device.phoneNumber}`);
    console.log(`Device ID:        ${device.deviceId}`);
    console.log(`Role:             ${device.role}`);
    console.log(`Status:           ${device.status}`);
    console.log(`Online:           ${device.isOnline ? '✅ Yes' : '❌ No'}`);
    console.log(`\nAuthentication:`);
    console.log(`  Method:         ${device.authMethod || 'Not set'}`);
    console.log(`  Linked At:      ${device.linkedAt || 'Never'}`);
    console.log(`  Link Attempts:  ${device.linkAttempts}/${device.maxLinkAttempts}`);
    console.log(`\nActivity:`);
    console.log(`  Uptime:         ${Math.floor(device.uptime / 3600000)}h ${Math.floor((device.uptime % 3600000) / 60000)}m`);
    console.log(`  Last Heartbeat: ${device.lastHeartbeat || 'N/A'}`);
    console.log(`  Last Activity:  ${device.lastActivity || 'N/A'}`);
    console.log(`  Heartbeat Count:${device.heartbeatCount}`);
    console.log(`\nNetwork:`);
    console.log(`  IP Address:     ${device.ipAddress || 'N/A'}`);
    console.log(`\nStatus:`);
    console.log(`  Last Error:     ${device.lastError || 'None'}`);
    console.log(`  Recovery Mode:  ${device.recoveryMode ? '🟡 Yes' : '🟢 No'}`);
    console.log(`${'═'.repeat(60)}\n`);
  }

  /**
   * List all devices
   */
  listAllDevices() {
    if (!this.deviceManager) {
      console.log(`\n❌ Device manager not available\n`);
      return;
    }

    const devices = this.deviceManager.getAllDevices();
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📱 ALL DEVICES (${devices.length} total)`);
    console.log(`${'═'.repeat(60)}`);

    devices.forEach((device, idx) => {
      const statusSymbol = {
        linked: '✅',
        unlinked: '❌',
        linking: '⏳',
        error: '⚠️',
      }[device.status] || '❓';

      console.log(`${idx + 1}. ${statusSymbol} ${device.phoneNumber} - ${device.name} [${device.role}]`);
    });

    console.log(`${'═'.repeat(60)}\n`);
  }

  /**
   * Calculate health score for a device (0-100)
   * NEW: Added in Phase 26 for enhanced health monitoring
   */
  _calculateHealthScore(device) {
    try {
      if (!device) return 0;

      let score = 0;

      // Status points (40)
      if (device.status === 'linked') score += 40;
      else if (device.status === 'linking') score += 20;

      // Online status points (30)
      if (device.isOnline) score += 30;

      // Uptime points (20)
      if (device.uptime > 3600000) score += 20; // > 1 hour
      else if (device.uptime > 600000) score += 10; // > 10 mins

      // Error penalty (-10)
      if (device.lastError) score -= 10;

      return Math.max(0, Math.min(100, score));
    } catch (error) {
      console.error(`  ❌ Error calculating health score: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get health status label based on health score
   * NEW: Added in Phase 26 for enhanced health monitoring
   */
  _getHealthStatus(healthScore) {
    if (healthScore >= 80) return '🟢 HEALTHY';
    if (healthScore >= 50) return '🟡 FAIR';
    if (healthScore >= 20) return '🟠 POOR';
    return '🔴 CRITICAL';
  }

  /**
   * Display real-time metrics dashboard (Phase 29e)
   */
  displayAnalyticsMetrics(metrics) {
    try {
      console.clear();
      console.log(`\n╔════════════════════════════════════════════════════════════╗`);
      console.log(`║         📊 REAL-TIME METRICS DASHBOARD - PHASE 29e          ║`);
      console.log(`╚════════════════════════════════════════════════════════════╝\n`);

      if (!metrics) {
        console.log(`  ⚠️  No metrics available\n`);
        return;
      }

      // Overall metrics
      console.log(`📈 OVERALL METRICS`);
      console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  Total Messages Sent:     ${metrics.totalMessages || 0}`);
      console.log(`  Total Errors:            ${metrics.totalErrors || 0}`);
      console.log(`  System Uptime:           ${metrics.systemUptime || '--'}`);
      console.log(`  Active Accounts:         ${metrics.activeAccounts || 0}`);
      console.log();

      // Per-account metrics
      if (metrics.accountMetrics && Object.keys(metrics.accountMetrics).length > 0) {
        console.log(`📱 PER-ACCOUNT METRICS`);
        console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        Object.entries(metrics.accountMetrics).forEach(([phone, data]) => {
          console.log(`  ${phone}:`);
          console.log(`    Messages:             ${data.messageCount || 0}`);
          console.log(`    Errors:               ${data.errorCount || 0}`);
          console.log(`    Success Rate:         ${data.successRate?.toFixed(2) || '--'}%`);
          console.log(`    Uptime:               ${data.uptime || '--'}`);
        });
        console.log();
      }

      console.log(`💡 Commands:`);
      console.log(`  • 'analytics report'           → Generate full report`);
      console.log(`  • 'analytics uptime'           → Show uptime metrics`);
      console.log(`  • 'analytics account <phone>'  → Account-specific metrics\n`);
    } catch (error) {
      console.log(`\n❌ Error displaying metrics: ${error.message}\n`);
    }
  }

  /**
   * Display uptime metrics (Phase 29e)
   */
  displayUptimeMetrics(metrics) {
    try {
      console.clear();
      console.log(`\n╔════════════════════════════════════════════════════════════╗`);
      console.log(`║         ⏱️  UPTIME METRICS - ALL ACCOUNTS (Phase 29e)        ║`);
      console.log(`╚════════════════════════════════════════════════════════════╝\n`);

      if (!metrics || !metrics.accountMetrics) {
        console.log(`  ⚠️  No uptime data available\n`);
        return;
      }

      console.log(`📊 ACCOUNT UPTIME SUMMARY`);
      console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  Total Accounts:          ${Object.keys(metrics.accountMetrics).length}`);
      console.log();

      Object.entries(metrics.accountMetrics).forEach(([phone, data]) => {
        const uptime = data.uptime || '--';
        const uptimePercent = data.uptimePercentage?.toFixed(2) || '--';
        const statusSymbol = data.isOnline ? '🟢' : '🔴';
        
        console.log(`  ${statusSymbol} ${phone}`);
        console.log(`     Uptime:               ${uptime}`);
        console.log(`     SLA Compliance:       ${uptimePercent}%`);
        console.log(`     Last Check:           ${data.lastCheck ? new Date(data.lastCheck).toLocaleTimeString() : '--'}`);
      });
      console.log();

      console.log(`💡 SLA Target: 99.9% availability\n`);
    } catch (error) {
      console.log(`\n❌ Error displaying uptime metrics: ${error.message}\n`);
    }
  }

  /**
   * Display account-specific analytics (Phase 29e)
   */
  displayAccountAnalytics(phoneNumber, metrics) {
    try {
      console.clear();
      console.log(`\n╔════════════════════════════════════════════════════════════╗`);
      console.log(`║         📈 ACCOUNT ANALYTICS - ${phoneNumber}                   ║`);
      console.log(`╚════════════════════════════════════════════════════════════╝\n`);

      if (!metrics) {
        console.log(`  ⚠️  No analytics data for ${phoneNumber}\n`);
        return;
      }

      console.log(`📊 ACCOUNT PERFORMANCE`);
      console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  Phone Number:            ${phoneNumber}`);
      console.log(`  Status:                  ${metrics.status || '--'}`);
      console.log(`  Connection:              ${metrics.isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}`);
      console.log();

      console.log(`📈 ACTIVITY METRICS`);
      console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  Messages Sent:           ${metrics.messageCount || 0}`);
      console.log(`  Errors Encountered:      ${metrics.errorCount || 0}`);
      console.log(`  Success Rate:            ${metrics.successRate?.toFixed(2) || '--'}%`);
      console.log();

      console.log(`⏱️  UPTIME METRICS`);
      console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  Total Uptime:            ${metrics.uptime || '--'}`);
      console.log(`  SLA Compliance:          ${metrics.uptimePercentage?.toFixed(2) || '--'}%`);
      console.log(`  Last Heartbeat:          ${metrics.lastHeartbeat ? new Date(metrics.lastHeartbeat).toLocaleTimeString() : '--'}`);
      console.log();

      if (metrics.lastError) {
        console.log(`⚠️  RECENT ISSUE`);
        console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`  Error:                   ${metrics.lastError.message || metrics.lastError}`);
        console.log(`  Time:                    ${metrics.lastError.timestamp ? new Date(metrics.lastError.timestamp).toLocaleTimeString() : '--'}`);
        console.log();
      }

      console.log(`💡 Commands:`);
      console.log(`  • 'analytics'            → Real-time metrics dashboard`);
      console.log(`  • 'analytics report'     → Full analytics report`);
      console.log(`  • 'health <phone>'       → Detailed health report\n`);
    } catch (error) {
      console.log(`\n❌ Error displaying account analytics: ${error.message}\n`);
    }
  }

  /**
   * Close the dashboard
   */
  close() {
    this.stopAutoRefresh();
    this.features.flush();
    this.layout.close();
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
    this.isMonitoring = false;
  }
}

// Create singleton instance
const terminalHealthDashboard = new TerminalHealthDashboard();

export default terminalHealthDashboard;
export { TerminalHealthDashboard };
