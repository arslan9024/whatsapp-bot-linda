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
import accountHealthMonitor from './AccountHealthMonitor.js';

class TerminalHealthDashboard {
  constructor() {
    this.rl = null;
    this.isMonitoring = false;
    this.deviceManager = null; // Will be set by index.js
    this.accountConfigManager = null; // NEW: Will be set by index.js
    this.autoRefreshInterval = null;
    this.autoRefreshDelay = 60000; // 60 seconds
    this.masterPhoneNumber = null; // Set by index.js
  }

  /**
   * Set device manager reference
   */
  setDeviceManager(deviceManager) {
    this.deviceManager = deviceManager;
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

  /**
   * Initialize readline interface for user input
   */
  initializeInput() {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '▶ Linda Bot > '
      });
    }
    return this.rl;
  }

  /**
   * Display comprehensive health dashboard with device tracking
   */
  displayHealthDashboard() {
    const report = accountHealthMonitor.generateDetailedHealthReport();
    const timestamp = new Date().toLocaleTimeString();
    
    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║         📱 LINDA BOT - REAL-TIME DEVICE DASHBOARD         ║`);
    console.log(`║              Last Updated: ${timestamp.padEnd(42)} ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);
    
    // Device Summary (if device manager available)
    if (this.deviceManager) {
      const deviceCount = this.deviceManager.getDeviceCount();
      console.log(`📊 DEVICE SUMMARY`);
      console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  Total Devices: ${deviceCount.total} | Linked: ${deviceCount.linked} | Unlinked: ${deviceCount.unlinked} | Linking: ${deviceCount.linking}`);
      console.log(`  System Uptime: ${report.systemStatus.uptime} | Server Status: 🟢 HEALTHY\n`);
    }
    
    // Linked Devices
    if (this.deviceManager) {
      const linkedDevices = this.deviceManager.getLinkedDevices();
      if (linkedDevices.length > 0) {
        console.log(`🔗 LINKED DEVICES (${linkedDevices.length})`);
        console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        linkedDevices.forEach(device => {
          const formatted = this.deviceManager.formatDeviceForDisplay(device.phoneNumber);
          if (formatted) {
            console.log(`  ${formatted.main}`);
            formatted.details.forEach(detail => console.log(`  ${detail}`));
          }
        });
        console.log();
      }
    }
    
    // Unlinked Devices
    if (this.deviceManager) {
      const unlinkedDevices = this.deviceManager.getUnlinkedDevices();
      if (unlinkedDevices.length > 0) {
        console.log(`🔴 UNLINKED DEVICES (${unlinkedDevices.length})`);
        console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        unlinkedDevices.forEach(device => {
          const formatted = this.deviceManager.formatDeviceForDisplay(device.phoneNumber);
          if (formatted) {
            console.log(`  ${formatted.main}`);
            formatted.details.forEach(detail => console.log(`  ${detail}`));
          }
        });
        console.log();
      }
    }
    
    // System Status
    console.log(`🤖 SYSTEM STATUS`);
    console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  Uptime: ${report.systemStatus.uptime} | Health Checks: ${report.systemStatus.totalChecks}`);
    console.log(`  Recovery Success Rate: ${report.systemStatus.recoverySuccess}\n`);
    
    // Available Commands
    console.log(`⚙️  AVAILABLE COMMANDS`);
    console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  'status' / 'health'         → Show this dashboard`);
    console.log(`  'relink master'             → Re-link default master account`);
    console.log(`  'relink master <phone>'     → Re-link specific master account`);
    console.log(`  'relink <phone>'            → Re-link specific device`);
    console.log(`  'device <phone>'            → Show device details`);
    console.log(`  'code <phone>'              → Switch to 6-digit auth`);
    console.log(`  'list'                      → List all devices`);
    console.log(`  'quit' / 'exit'             → Exit monitoring\n`);
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
      onRelinkMaster,
      onRelinkDevice,
      onSwitchTo6Digit,
      onShowDeviceDetails,
      onListDevices,
    } = callbacks;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🤖 LINDA BOT - INTERACTIVE DEVICE MANAGER STARTED`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`Type a command or press Enter to refresh. Type 'help' for commands.`);
    console.log(`${'═'.repeat(60)}\n`);

    // Start auto-refresh
    this.startAutoRefresh(() => {
      console.clear();
      this.displayHealthDashboard();
      if (this.isMonitoring) {
        this.rl.prompt();
      }
    });

    this.rl.on('line', async (input) => {
      const input_lower = input.trim().toLowerCase();
      const parts = input_lower.split(/\s+/);
      const command = parts[0];

      switch (command) {
        // NEW: Link master account with health check (Phase 21)
        case 'link':
          if (parts[1] === 'master') {
            console.log(`\n⏳ Initiating master account linking...`);
            if (onLinkMaster) {
              await onLinkMaster();
            } else {
              console.log(`❌ Linking handler not available\n`);
            }
          } else {
            console.log(`\n⚠️  Usage: 'link master'\n`);
          }
          break;

        case 'health':
        case 'status':
          console.clear();
          this.displayHealthDashboard();
          break;

        case 'relink':
          if (parts[1] === 'master') {
            // NEW: Support "relink master <phone>" for specific master account
            const masterPhone = parts[2] || this.masterPhoneNumber;
            if (masterPhone) {
              console.log(`\n⏳ Re-linking master account: ${masterPhone}...`);
              if (onRelinkMaster) {
                await onRelinkMaster(masterPhone);
              }
            } else {
              console.log(`\n⚠️  No master account specified.`);
              console.log(`   Usage: 'relink master [+phone-number]'`);
              console.log(`   Example: 'relink master +971505760056'\n`);
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
            console.log(`\n⏳ Switching to 6-digit auth for ${phoneNumber}...`);
            if (onSwitchTo6Digit) {
              await onSwitchTo6Digit(phoneNumber);
            }
          } else {
            console.log(`\n⚠️  Usage: 'code <phone>'\n`);
          }
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

        case 'help':
          console.log(`\n📚 Available Commands:`);
          console.log(`  link master               → Link master WhatsApp account (with health check)`);
          console.log(`  status / health           → Display full dashboard`);
          console.log(`  relink master [+phone]    → Re-link master account (optional: specify phone)`);
          console.log(`  relink servant [+phone]   → Re-link servant account`);
          console.log(`  relink <phone>            → Re-link specific device`);
          console.log(`  code <phone>              → Switch to 6-digit authentication`);
          console.log(`  device <phone>            → Show detailed device information`);
          console.log(`  list                      → List all devices`);
          console.log(`  masters                   → Show all master accounts`);
          console.log(`  servants                  → Show all servant accounts`);
          console.log(`  help                      → Show this help message`);
          console.log(`  quit / exit               → Exit monitoring\n`);
          break;

        case 'quit':
        case 'exit':
          console.log(`\n👋 Exiting device manager...\n`);
          this.isMonitoring = false;
          this.stopAutoRefresh();
          if (this.rl) {
            this.rl.close();
            this.rl = null;
          }
          return;

        case '':
          // Empty input - refresh display
          console.clear();
          this.displayHealthDashboard();
          break;

        default:
          if (input.trim()) {
            console.log(`\n❓ Unknown command: '${command}'. Type 'help' for available commands.\n`);
          }
      }

      if (this.isMonitoring) {
        this.rl.prompt();
      }
    });

    this.rl.on('close', () => {
      this.isMonitoring = false;
      this.stopAutoRefresh();
    });

    // Initial display
    this.displayHealthDashboard();
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
   * Close the dashboard
   */
  close() {
    this.stopAutoRefresh();
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
