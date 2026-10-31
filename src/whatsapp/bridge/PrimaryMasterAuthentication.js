/**
 * Primary-master authentication prompt (mixin for WhatsAppCommandBridge).
 * Offers reconnect (no relink) or relink once per offline episode.
 */

import services from '../../core/ServiceRegistry.js';

export const authenticationMethods = {
  requestPrimaryMasterAuthentication(masterPhone) {
    const status = this.sessionStateManager?.getDeviceMetadata(masterPhone)?.status;
    if (status === 'paused') {
      this.logBot('Primary master is paused. Use recover or relink master to activate it.', 'info');
      return false;
    }
    if (this.authenticationPrompt || this.authenticationPromptAttempted || this.isLinkingInProgress(masterPhone)) {
      return false;
    }
    const callbacks = services.get('terminalCallbacks');
    const relink = callbacks?.onRelinkMaster;
    if (!relink) {
      this.logBot('Primary master needs authentication. Use link-code or link-qr.', 'warn');
      return false;
    }
    // One prompt per offline episode; a cancelled or timed-out prompt must not loop every poll.
    this.authenticationPromptAttempted = true;
    this.logBot('Primary master is linked but offline. Choose reconnect (no relink) or relink in the terminal.', 'warn');

    this.authenticationPrompt = Promise.resolve()
      .then(() => this._activatePrimaryMaster(masterPhone, callbacks))
      .catch(error => this.logBot(`Primary master activation stopped: ${error.message}`, 'warn'))
      .finally(() => {
        this.authenticationPrompt = null;
      });
    return true;
  },

  async _chooseActivationAction(masterPhone) {
    const choose = this.terminalHealthDashboard?.selectMasterActivation;
    if (!choose) {
      return 'reconnect';
    }
    try {
      return await choose.call(this.terminalHealthDashboard, masterPhone);
    } catch {
      return 'reconnect';
    }
  },

  async _activatePrimaryMaster(masterPhone, callbacks) {
    const relink = callbacks.onRelinkMaster;
    const status = this.sessionStateManager?.getDeviceMetadata(masterPhone)?.status;
    if (['logged_out', 'auth_failed'].includes(status)) {
      this.logBot('Primary master was logged out on the phone; relinking is required.', 'warn');
      return relink(masterPhone);
    }

    const action = await this._chooseActivationAction(masterPhone);
    if (action !== 'reconnect') {
      return relink(masterPhone, action);
    }
    if (!callbacks.onRestoreAccount) {
      return relink(masterPhone);
    }

    try {
      await callbacks.onRestoreAccount(masterPhone);
    } catch (error) {
      this.logBot(`Reconnect failed: ${error.message}`, 'warn');
      if (/already in progress/i.test(error.message)) {
        this.logBot('Primary master connection is already in progress; waiting for it to complete.', 'info');
        return undefined;
      }
    }
    if (await this.isPrimaryMasterConnected(masterPhone)) {
      this.botActive = true;
      this.logBot('✅ Primary master reconnected without relinking', 'success');
      return undefined;
    }
    this.logBot('Saved linked session could not be reactivated. Relink with pairing code or QR:', 'warn');
    return relink(masterPhone);
  },
};

