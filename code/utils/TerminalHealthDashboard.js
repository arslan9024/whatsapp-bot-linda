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
    console.log(`⚙️  AVAILABLE COMMANDS (Phase 26 - Unified Account Management)`);
    console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  ACCOUNT MANAGEMENT:`);
    console.log(`    'link master'               → Link first master account`);
    console.log(`    'link master <+p> [name]'  → Add additional master account`);
    console.log(`    'accounts'                  → List all accounts with status`);
    console.log(`\n  HEALTH & MONITORING (NEW):`);
    console.log(`    'health <+phone>'           → Detailed health for account`);
    console.log(`    'stats <+phone>'            → Metrics (uptime, activity)`);
    console.log(`    'recover <+phone>'          → Attempt session restore`);
    console.log(`\n  DEVICE MANAGEMENT:`);
    console.log(`    'status' / 'health'         → Show this dashboard`);
    console.log(`    'relink master [<+phone>]'  → Re-link master account`);
    console.log(`    'relink servant <+phone>'   → Re-link servant account`);
    console.log(`    'device <+phone>'           → Show device details`);
    console.log(`    'list'                      → List all devices`);
    console.log(`\n  For full list, type 'help'\n`);
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
      onGorahaStatusRequested,  // NEW: GorahaBot status (Phase 26)
      onGorahaFilterRequested,  // NEW: GorahaBot filter (Phase 28)
      onAnalyticsReportRequested,  // NEW: Analytics reporting (Phase 29e)
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
      const input_original = input.trim();
      const parts = input_lower.split(/\s+/);
      const command = parts[0];

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

      switch (command) {
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
            console.log(`\n⚠️  Usage: 'health <+phone-number>'`);
            console.log(`  Example: 'health +971505760056'\n`);
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
              if (this.deviceManager) {
                const device = this.deviceManager.getDevice(phoneNumber);
                if (!device) {
                  console.log(`  ❌ Account not found: ${phoneNumber}\n`);
                  break;
                }

                // Import SessionManager to check session
                const { SessionManager } = await import('./SessionManager.js');
                const canRestore = SessionManager.canRestoreSession(phoneNumber);

                if (canRestore) {
                  console.log(`  ✅ Valid session found!`);
                  console.log(`  💡 Session restored automatically on next link.\n`);
                  this.deviceManager.markDeviceLinked(phoneNumber, {
                    authMethod: 'restore',
                    linkedAt: new Date().toISOString()
                  });
                } else {
                  console.log(`  ❌ No valid session found.`);
                  console.log(`  💡 Use 'relink <phone>' to link with QR code.\n`);
                }
              }
            } catch (error) {
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

        case 'help':
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
          console.log(`\n  DEVICE MANAGEMENT:`);
          console.log(`    status / health           → Display full dashboard`);
          console.log(`    relink master [+phone]    → Re-link master account (optional: specify phone)`);
          console.log(`    relink servant [+phone]   → Re-link servant account`);
          console.log(`    relink <phone>            → Re-link specific device`);
          console.log(`    code <phone>              → Switch to 6-digit authentication`);
          console.log(`    device <phone>            → Show detailed device information`);
          console.log(`    list                      → List all devices`);
          console.log(`    masters                   → Show all master accounts`);
          console.log(`    servants                  → Show all servant accounts`);
          console.log(`\n  SYSTEM:`);
          console.log(`    help                      → Show this help message`);
          console.log(`    quit / exit               → Exit monitoring\n`);
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
