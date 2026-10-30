/**
 * Primary-master connection state checks (mixin for WhatsAppCommandBridge).
 * Read-only: never starts, stops or relinks anything.
 */

import { SessionManager } from '../../sessions/SessionManager.js';
import { isPrimaryMasterLinked } from './bridgeUtils.js';

export const connectionStateMethods = {
  canRestorePrimaryMasterSession(masterPhone) {
    const metadata = this.sessionStateManager?.getDeviceMetadata(masterPhone) || {};
    const config = this.accountConfigManager?.getAllAccounts()
      .find(account => account.phoneNumber === masterPhone);
    const clientId = SessionManager.resolveClientId(masterPhone, metadata, config);
    const statusApplies = !metadata.clientId || metadata.clientId === clientId;
    const authBlocked = statusApplies && (this.connectionManagers?.get(masterPhone)?.authRequired ||
      ['logged_out', 'auth_failed', 'auth_required'].includes(metadata.status));
    return metadata.status !== 'paused' && !authBlocked &&
      SessionManager.hasSessionArtifacts(clientId) && SessionManager.canRestoreSession(clientId);
  },

  isLinkingInProgress(masterPhone) {
    const manager = this.connectionManagers?.get(masterPhone);
    const linking = this.deviceLinkedManager?.getDevice(masterPhone)?.status === 'linking' &&
      !['ERROR', 'DISCONNECTED', 'SUSPENDED'].includes(manager?.state);
    return Boolean(manager?.isInitializing || manager?.isReconnecting || manager?.state === 'CONNECTING' ||
      manager?.reconnectTimer || linking ||
      this.terminalHealthDashboard?.isSelectingLinkingMethod ||
      this.terminalHealthDashboard?.linkingChallenges?.has(masterPhone));
  },

  async isPrimaryMasterConnected(masterPhone) {
    const client = this.accountClients?.get(masterPhone);
    if (client?.getState) {
      try {
        return await client.getState() === 'CONNECTED';
      } catch (error) {
        this.logBot(`Could not read primary master connection: ${error.message}`, 'warn');
        return false;
      }
    }
    return Boolean(isPrimaryMasterLinked(this.accountConfigManager, this.deviceLinkedManager));
  },
};
