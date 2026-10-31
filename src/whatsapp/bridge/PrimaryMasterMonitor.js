/**
 * Primary-master monitoring (mixin for WhatsAppCommandBridge):
 * device event listeners and background polling that triggers recovery.
 */

import { POLL_INTERVAL_MS } from './bridgeConstants.js';

export const monitorMethods = {
  startRecoveryPolling() {
    if (this.pollingInterval) {
      return;
    }
    this.pollingInterval = setInterval(() => this._pollPrimaryMaster(), POLL_INTERVAL_MS);
    this.logBot('🔄 Recovery polling started (60s interval, session-aware)', 'info');
  },

  async _pollPrimaryMaster() {
    try {
      const masterPhone = this.accountConfigManager?.getMasterPhoneNumber();
      if (!masterPhone || this.recoveryInProgress || this.isLinkingInProgress(masterPhone)) {
        return;
      }
      const connected = await this.isPrimaryMasterConnected(masterPhone);

      if (!this.canRestorePrimaryMasterSession(masterPhone)) {
        if (!connected) {
          this.requestPrimaryMasterAuthentication(masterPhone);
        }
        return;
      }
      if (!connected) {
        this.logBot('⚠️ Polling detected primary master disconnected - attempting recovery...', 'warn');
        await this.autoRecoverPrimaryMaster();
      } else if (!this.botActive) {
        this.botActive = true;
        this.logBot('✅ Primary master reconnected - Bot active', 'success');
      }
    } catch (pollingError) {
      // Never let a polling error kill the interval — just log it
      this.logBot(`⚠️ Recovery polling error (will retry): ${pollingError.message}`, 'warn');
    }
  },

  stopRecoveryPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.logBot('⏹ Recovery polling stopped', 'info');
    }
  },

  setupEventListeners() {
    const dm = this.deviceLinkedManager;
    const masterPhone = this.accountConfigManager?.getMasterPhoneNumber();
    if (!dm || !dm.on) {
      return;
    }

    dm.on('device:unlinked', ({ phoneNumber, reason }) => {
      if (phoneNumber !== masterPhone) {
        return;
      }
      this.botActive = false;
      if (/AUTH_FAILURE|LOGOUT/i.test(String(reason))) {
        this.requestPrimaryMasterAuthentication(masterPhone);
        return;
      }
      this.logBot('Primary master disconnected; connection recovery is monitored by polling.', 'warn');
    });

    dm.on('device:linked', ({ phoneNumber }) => {
      if (phoneNumber === masterPhone) {
        this.botActive = true;
        this.authenticationPromptAttempted = false;
        this.logBot('✅ Primary master linked - Bot active', 'success');
        this.notifyAdmin('Primary master account restored! Linda bot is now active.');
      }
    });
  },
};

