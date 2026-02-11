/**
 * TerminalHealthDashboard.js
 * 
 * Interactive health dashboard for terminal monitoring
 * - Display WhatsApp and Google account status
 * - Prompt for account re-linking
 * - Health summary with account details
 * 
 * Version: 1.0
 * Created: February 9, 2026
 * Status: Production Ready
 */

import readline from 'readline';
import accountHealthMonitor from './AccountHealthMonitor.js';

class TerminalHealthDashboard {
  constructor() {
    this.rl = null;
    this.isMonitoring = false;
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
   * Display comprehensive health dashboard
   */
  displayHealthDashboard() {
    const report = accountHealthMonitor.generateDetailedHealthReport();
    
    console.log(`\n${'╔'.padEnd(60, '═').replace(/./g, (m, i) => i === 0 ? '╔' : i === 59 ? '╗' : '═')}`);
    console.log(`║ ${'LINDA BOT - COMPREHENSIVE HEALTH DASHBOARD'.padEnd(56)} ║`);
    console.log(`╠${Array(59).fill('═').join('')}╣`);
    
    // System Status
    console.log(`║ 🤖 SYSTEM STATUS`.padEnd(60) + `║`);
    console.log(`║ ${'─'.repeat(55)} ║`);
    console.log(`║   Uptime: ${report.systemStatus.uptime.padEnd(45)} ║`);
    console.log(`║   Total Health Checks: ${report.systemStatus.totalChecks.toString().padEnd(34)} ║`);
    console.log(`║   Recovery Success Rate: ${report.systemStatus.recoverySuccess.padEnd(32)} ║`);
    
    // WhatsApp Accounts
    console.log(`║ ${'─'.repeat(55)} ║`);
    console.log(`║ 📱 WHATSAPP ACCOUNTS (${report.whatsappAccounts.total} total)`.padEnd(60) + `║`);
    console.log(`║ ${'─'.repeat(55)} ║`);
    console.log(`║   Active: ${report.whatsappAccounts.active.toString().padEnd(10)} | Inactive: ${report.whatsappAccounts.inactive.toString().padEnd(10)} | Warning: ${report.whatsappAccounts.warning.toString().padEnd(10)} ║`);
    
    if (report.whatsappAccounts.details.length > 0) {
      console.log(`║ ${'─'.repeat(55)} ║`);
      report.whatsappAccounts.details.forEach(account => {
        const status = account.status === 'healthy' ? '✅' : account.status === 'unhealthy' ? '❌' : '⚠️';
        const phoneDisplay = account.phoneNumber.slice(-10);
        const uptimeStr = `${account.uptime}%`;
        console.log(`║   ${status} ${phoneDisplay.padEnd(15)} Uptime: ${uptimeStr.padEnd(8)} Status: ${account.status.padEnd(10)} ║`);
      });
    }
    
    // Google Accounts
    if (report.googleAccounts.total > 0) {
      console.log(`║ ${'─'.repeat(55)} ║`);
      console.log(`║ 🔗 GOOGLE ACCOUNTS (${report.googleAccounts.total} total)`.padEnd(60) + `║`);
      console.log(`║ ${'─'.repeat(55)} ║`);
      console.log(`║   Connected: ${report.googleAccounts.connected.toString().padEnd(15)} | Services: ${report.googleAccounts.details.reduce((sum, a) => sum + a.services, 0).toString().padEnd(10)} ║`);
      
      report.googleAccounts.details.forEach(account => {
        const status = account.enabled ? '✅' : '⚠️';
        console.log(`║   ${status} ${account.name.padEnd(35)} (${account.services} services) ║`);
      });
    }
    
    console.log(`╚${Array(59).fill('═').join('')}╝\n`);
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
   * Start interactive monitoring with user input
   */
  async startInteractiveMonitoring() {
    this.initializeInput();
    this.isMonitoring = true;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🤖 LINDA BOT - INTERACTIVE HEALTH MONITOR STARTED`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`Available Commands:`);
    console.log(`  health   - Display detailed health dashboard`);
    console.log(`  relink   - Re-link an inactive WhatsApp account`);
    console.log(`  status   - Quick account status`);
    console.log(`  quit     - Exit monitoring mode`);
    console.log(`${'═'.repeat(60)}\n`);

    this.rl.on('line', async (input) => {
      const command = input.trim().toLowerCase();

      switch (command) {
        case 'health':
          this.displayHealthDashboard();
          break;
        case 'relink':
          await this.promptForReLink();
          break;
        case 'status':
          this.displayQuickStatus();
          break;
        case 'quit':
        case 'exit':
          console.log(`\nExiting interactive monitoring...\n`);
          this.isMonitoring = false;
          if (this.rl) {
            this.rl.close();
            this.rl = null;
          }
          return;
        case '':
          // Empty input - just show prompt
          break;
        default:
          console.log(`Unknown command: ${command}`);
          console.log(`Type 'health', 'relink', 'status', or 'quit'\n`);
      }

      if (this.isMonitoring) {
        this.rl.prompt();
      }
    });

    this.rl.on('close', () => {
      this.isMonitoring = false;
    });

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
    console.log(`WhatsApp Accounts: ${report.whatsappAccounts.active} active, ${report.whatsappAccounts.inactive} inactive, ${report.whatsappAccounts.warning} warning`);
    console.log(`Google Accounts: ${report.googleAccounts.connected} of ${report.googleAccounts.total} connected`);
    console.log(`System Uptime: ${report.systemStatus.uptime}`);
    console.log(`Last Health Check: ${report.systemStatus.lastCheck}`);
    console.log(`${'─'.repeat(60)}\n`);
  }

  /**
   * Close the dashboard
   */
  close() {
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
