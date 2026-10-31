/**
 * Primary-master auto-recovery (mixin for WhatsAppCommandBridge).
 * Restores the saved session through the shared client flow and never
 * interrupts an authentication that is already in progress.
 */

import services from '../../core/ServiceRegistry.js';

export const recoveryMethods = {
  async autoRecoverPrimaryMaster() {
    if (this.recoveryInProgress) {
      this.logBot('⚠️ Recovery already in progress, skipping...', 'warn');
      return false;
    }

    const masterPhone = this.accountConfigManager?.getMasterPhoneNumber();
    if (!masterPhone) {
      this.logBot('❌ No master phone configured for recovery', 'error');
      return false;
    }

    this.recoveryInProgress = true;
    try {
      for (let attempt = 0; attempt < this.recoveryRetries; attempt++) {
        const outcome = await this._recoveryAttempt(masterPhone, attempt);
        if (outcome !== undefined) {
          return outcome;
        }
      }
      return await this._finishFailedRecovery(masterPhone);
    } finally {
      this.recoveryInProgress = false;
    }
  },

  /** One recovery attempt. Returns true/false to stop, undefined to keep retrying. */
  async _recoveryAttempt(masterPhone, attempt) {
    if (await this.isPrimaryMasterConnected(masterPhone)) {
      this.botActive = true;
      return true;
    }
    this.botActive = false;

    if (this.isLinkingInProgress(masterPhone)) {
      this.logBot('Primary master is connecting or awaiting QR/code linking; recovery deferred.', 'info');
      return false;
    }
    if (!this.canRestorePrimaryMasterSession(masterPhone)) {
      this.requestPrimaryMasterAuthentication(masterPhone);
      return false;
    }
    const restore = services.get('terminalCallbacks')?.onRestoreAccount;
    if (!restore) {
      this.logBot('Primary master recovery unavailable: session restore handler is not registered.', 'error');
      return false;
    }

    this.lastRecoveryAttempt = Date.now();
    this.logBot(`🔄 Recovery attempt ${attempt + 1}/${this.recoveryRetries}...`, 'info');
    try {
      await restore(masterPhone);
      if (await this.isPrimaryMasterConnected(masterPhone)) {
        this.botActive = true;
        this.logBot('✅ Primary master session restored successfully', 'success');
        return true;
      }
    } catch (error) {
      this.logBot(`Primary master restore failed: ${error.message}`, 'warn');
    }

    if (this.isLinkingInProgress(masterPhone)) {
      this.logBot('Primary master restore is awaiting connection or QR/code linking; recovery deferred.', 'info');
      return false;
    }
    if (!this.canRestorePrimaryMasterSession(masterPhone)) {
      this.requestPrimaryMasterAuthentication(masterPhone);
      return false;
    }
    if (attempt + 1 < this.recoveryRetries) {
      this.logBot(`⏳ Waiting ${this.recoveryDelay}ms before next attempt...`, 'info');
      await new Promise(resolve => setTimeout(resolve, this.recoveryDelay));
    }
    return undefined;
  },

  async _finishFailedRecovery(masterPhone) {
    if (await this.isPrimaryMasterConnected(masterPhone)) {
      this.botActive = true;
      return true;
    }
    this.botActive = false;
    this.logBot('❌ Primary master recovery failed after all retries', 'error');
    await this.notifyAdmin('Primary master reconnect failed; saved session is preserved. Review the connection error in the terminal and retry recovery. Device linking is only needed if WhatsApp explicitly requires authentication.');
    return false;
  },

  /** Handle session loss - triggers automatic recovery. */
  handleSessionLoss(masterPhone) {
    const phone = masterPhone ||
      (this.accountConfigManager || services.get('accountConfigManager'))?.getMasterPhoneNumber();
    if (!phone) {
      this.logBot('❌ Cannot handle session loss - no master phone', 'error');
      return;
    }

    this.botActive = false;
    this.logBot('❌ Primary master session lost. Starting auto-recovery...', 'error');
    this.autoRecoverPrimaryMaster().catch(err => {
      this.logBot(`❌ Recovery error: ${err.message}`, 'error');
    });
  },

  async notifyAdmin(message) {
    try {
      if (this.adminPhone && this.deviceLinkedManager?.sendWhatsAppMessage) {
        await this.deviceLinkedManager.sendWhatsAppMessage(this.adminPhone, message);
        this.logBot(`📱 Admin notification sent: ${message}`, 'info');
      } else {
        this.logBot(`[ADMIN NOTIFY] ${message}`, 'warn');
      }
    } catch (error) {
      this.logBot(`❌ Admin notification failed: ${error.message}`, 'error');
    }
  },
};

