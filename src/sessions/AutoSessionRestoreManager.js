import { SessionManager } from './SessionManager.js';
import { getSessionRecovery } from './SessionRecoveryService.js';

export default class AutoSessionRestoreManager {
  constructor(logBotFn) {
    this.logBot = logBotFn || console.log;
    this.restoredAccounts = [];
    this.failedRestores = [];
  }

  async autoRestoreAllSessions(
    sessionStateManager, accountClients, deviceLinkedManager,
    setupClientFlow, getFlowDeps, createClient
  ) {
    this.restoredAccounts = [];
    this.failedRestores = [];
    if (!sessionStateManager?.state) {
      const reason = 'SessionStateManager not initialized';
      this.logBot(reason, 'error');
      return { success: false, restored: 0, failed: 0, error: reason };
    }
    const configured = getFlowDeps().sharedContext?.accountConfigManager?.getAllAccounts() || [];
    const accounts = { ...sessionStateManager.state.accounts };
    for (const config of configured) {
      if (config.enabled === false || !config.phoneNumber || accounts[config.phoneNumber]) continue;
      const clientId = SessionManager.resolveClientId(config.phoneNumber, {}, config);
      if (SessionManager.canRestoreSession(clientId)) accounts[config.phoneNumber] = { ...config, clientId };
    }
    const recovery = getSessionRecovery({
      getFlowDeps: () => ({
        ...getFlowDeps(), sessionStateManager, deviceLinkedManager,
      }),
      setupClientFlow, createClient, accountClients,
    });
    const masterPhone = getFlowDeps().sharedContext?.accountConfigManager?.getMasterPhoneNumber?.() ||
      sessionStateManager.state?.masterPhoneNumber;
    const entries = Object.entries(accounts);
    if (masterPhone) {
      entries.sort(([phoneA], [phoneB]) => {
        if (phoneA === masterPhone) return -1;
        if (phoneB === masterPhone) return 1;
        return 0;
      });
    }
    for (const [phoneNumber, account] of entries) {
      if (configured.find(config => config.phoneNumber === phoneNumber)?.enabled === false) continue;
      try {
        await recovery.recover(phoneNumber, { source: 'startup' });
        this.restoredAccounts.push({ phoneNumber, displayName: account.displayName, role: account.role });
      } catch (error) {
        this.failedRestores.push({ phoneNumber, displayName: account.displayName, reason: error.message });
        this.logBot(`Restore ${phoneNumber}: ${error.message}`, 'warn');
      }
    }
    this.printRestoreSummary();
    return {
      success: this.restoredAccounts.length > 0,
      restored: this.restoredAccounts.length,
      failed: this.failedRestores.length,
    };
  }

  printRestoreSummary() {
    this.logBot(
      `Session recovery: ${this.restoredAccounts.length} ready, ${this.failedRestores.length} need attention. Dashboard shows live state.`,
      this.failedRestores.length ? 'warn' : 'info'
    );
  }

  getRestoredAccounts() {
    return this.restoredAccounts;
  }

  getFailedRestores() {
    return this.failedRestores;
  }

  getSummary() {
    return {
      totalSaved: this.restoredAccounts.length + this.failedRestores.length,
      restored: this.restoredAccounts.length,
      failed: this.failedRestores.length,
      success: this.restoredAccounts.length > 0,
    };
  }
}
