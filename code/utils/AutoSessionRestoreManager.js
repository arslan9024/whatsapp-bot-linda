/**
 * AutoSessionRestoreManager.js
 * ==============================
 * Automatically restores WhatsApp sessions on server restart (nodemon).
 * 
 * Features:
 * - Detects saved sessions from SessionStateManager
 * - Restores each session if valid via SessionManager.canRestoreSession()
 * - Creates WhatsApp clients with isRestore flag (skips QR scanning)
 * - Updates DeviceLinkedManager to reflect restored status
 * - Provides visual feedback in terminal dashboard
 * - Handles failures gracefully (falls back to manual linking)
 * 
 * Flow:
 * 1. Load SessionStateManager (has master phone + account list)
 * 2. For each saved account:
 *    a. Check if session can be restored (SessionManager.canRestoreSession)
 *    b. If yes, initialize WhatsApp client with isRestore=true
 *    c. On success, mark as "linked" in DeviceLinkedManager
 *    d. On failure, mark as "error" and prompt user
 * 3. Display summary in dashboard
 * 
 * @since Phase 26/27 - February 19, 2026
 */

import { SessionManager } from './SessionManager.js';

class AutoSessionRestoreManager {
  constructor(logBotFn) {
    this.logBot = logBotFn || console.log;
    this.restoredAccounts = [];
    this.failedRestores = [];
  }

  /**
   * Attempt to auto-restore all saved sessions
   * 
   * @param {Object} sessionStateManager - SessionStateManager instance (has saved state)
   * @param {Map} accountClients - Map of phoneNumber → WhatsApp client
   * @param {Object} deviceLinkedManager - DeviceLinkedManager instance
   * @param {Function} setupClientFlow - Function to initialize WhatsApp client flow
   * @param {Function} getFlowDeps - Function to get flow dependencies
   * @param {Function} createClient - Function to create new WhatsApp client
   * @returns {Promise<Object>} - {success: boolean, restored: number, failed: number}
   */
  async autoRestoreAllSessions(
    sessionStateManager,
    accountClients,
    deviceLinkedManager,
    setupClientFlow,
    getFlowDeps,
    createClient
  ) {
    try {
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║         🔄 AUTO-RESTORE: Previous WhatsApp Sessions       ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');

      // Get saved state
      if (!sessionStateManager || !sessionStateManager.state) {
        this.logBot('⚠️  SessionStateManager not initialized', 'warn');
        return { success: false, restored: 0, failed: 0 };
      }

      const state = sessionStateManager.state;
      const savedAccounts = state.accounts || {};
      const accountNumbers = Object.keys(savedAccounts);

      if (accountNumbers.length === 0) {
        console.log('ℹ️  No saved sessions found.\n');
        return { success: false, restored: 0, failed: 0 };
      }

      console.log(`📱 Found ${accountNumbers.length} saved account(s) to restore:\n`);

      // Iterate through saved accounts
      for (const phoneNumber of accountNumbers) {
        const account = savedAccounts[phoneNumber];
        
        console.log(`  ▶ ${phoneNumber} (${account.displayName || 'Unknown'})`);

        // Step 1: Check if session can be restored
        const canRestore = SessionManager.canRestoreSession(phoneNumber);
        
        if (!canRestore) {
          console.log(`    ❌ Session not found or corrupted - manual linking required`);
          this.failedRestores.push({
            phoneNumber,
            reason: 'Session files not found',
          });
          continue;
        }

        console.log(`    ✅ Session found - attempting restore...`);

        try {
          // Step 2: Create WhatsApp client with session restoration flag
          const client = await createClient(phoneNumber);
          accountClients.set(phoneNumber, client);

          // Step 3: Setup client flow with restore flag
          const flowDeps = getFlowDeps();
          setupClientFlow(
            client,
            phoneNumber,
            account.role || 'primary',
            { isRestore: true },  // Key flag: this tells setupClientFlow to restore, not show QR
            flowDeps
          );

          // Step 4: Initialize client (will restore from saved session without QR prompt)
          console.log(`    ⏳ Initializing with saved session...`);
          await client.initialize();

          // Step 5: Mark device as linked immediately (optimistic)
          deviceLinkedManager.markDeviceLinked(phoneNumber, {
            authMethod: 'restore',
            linkedAt: account.linkedAt || new Date().toISOString(),
            restoredAt: new Date().toISOString(),
          });

          console.log(`    ✅ RESTORED SUCCESSFULLY\n`);
          this.restoredAccounts.push({
            phoneNumber,
            displayName: account.displayName,
            role: account.role,
          });

        } catch (error) {
          console.log(`    ❌ Restore failed: ${error.message}`);
          this.failedRestores.push({
            phoneNumber,
            displayName: account.displayName,
            reason: error.message,
          });
          
          // Mark device as error state
          deviceLinkedManager.recordLinkFailure(phoneNumber, error);
        }
      }

      // Print summary
      this.printRestoreSummary();

      const success = this.restoredAccounts.length > 0;
      return {
        success,
        restored: this.restoredAccounts.length,
        failed: this.failedRestores.length,
      };

    } catch (error) {
      this.logBot(`❌ Error during auto-restore: ${error.message}`, 'error');
      return { success: false, restored: 0, failed: 0 };
    }
  }

  /**
   * Print summary of restore results
   * @private
   */
  printRestoreSummary() {
    console.log('╭────────────────────────────────────────────────────────────╮');
    console.log('│              AUTO-RESTORE SUMMARY                          │');
    console.log('├────────────────────────────────────────────────────────────┤');

    if (this.restoredAccounts.length > 0) {
      console.log(`│  ✅ RESTORED: ${this.restoredAccounts.length} account(s)                             │`);
      this.restoredAccounts.forEach(acc => {
        const name = acc.displayName || acc.phoneNumber;
        console.log(`│     • ${name.padEnd(52)} │`);
      });
      console.log('│                                                            │');
    }

    if (this.failedRestores.length > 0) {
      console.log(`│  ❌ FAILED: ${this.failedRestores.length} account(s)                              │`);
      this.failedRestores.forEach(acc => {
        const name = acc.displayName || acc.phoneNumber;
        console.log(`│     • ${name.substring(0, 52).padEnd(52)} │`);
      });
      console.log('│                                                            │');
      console.log('│  💡 Tip: Use terminal command:                            │');
      console.log('│     link master <+phone>      → Add new account           │');
      console.log('│     relink <+phone>           → Re-link specific account  │');
      console.log('│                                                            │');
    }

    if (this.restoredAccounts.length === 0 && this.failedRestores.length === 0) {
      console.log('│  ℹ️  No previous sessions saved.                           │');
      console.log('│                                                            │');
    }

    console.log('╰────────────────────────────────────────────────────────────╯\n');
  }

  /**
   * Get list of restored accounts
   */
  getRestoredAccounts() {
    return this.restoredAccounts;
  }

  /**
   * Get list of failed restores
   */
  getFailedRestores() {
    return this.failedRestores;
  }

  /**
   * Get restore status summary
   */
  getSummary() {
    return {
      totalSaved: this.restoredAccounts.length + this.failedRestores.length,
      restored: this.restoredAccounts.length,
      failed: this.failedRestores.length,
      success: this.restoredAccounts.length > 0,
    };
  }
}

export default AutoSessionRestoreManager;
