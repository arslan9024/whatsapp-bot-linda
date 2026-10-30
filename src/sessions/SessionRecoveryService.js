import { SessionManager } from './SessionManager.js';
import { getLiveConnectionState } from '../connection/ConnectionEnhancements.js';

export class SessionRecoveryService {
  constructor({ getFlowDeps, setupClientFlow, createClient, accountClients, accountConfigManager }) {
    this.getFlowDeps = getFlowDeps;
    this.setupClientFlow = setupClientFlow;
    this.createClient = createClient;
    this.accountClients = accountClients;
    this.accountConfigManager = accountConfigManager;
    this.pending = new Map();
    this.pendingProfiles = new Map();
    this.pausing = new Set();
    this.stopping = false;
  }

  resolveAccount(requestedPhone) {
    const deps = this.getFlowDeps();
    const configManager = this.accountConfigManager || deps.sharedContext?.accountConfigManager;
    const config = configManager?.getAllAccounts().find(account =>
      account.phoneNumber?.replace(/^\+/, '') === requestedPhone.replace(/^\+/, ''));
    const savedPhone = Object.keys(deps.sessionStateManager.state?.accounts || {}).find(phone =>
      phone.replace(/^\+/, '') === requestedPhone.replace(/^\+/, ''));
    const phone = config?.phoneNumber || savedPhone || requestedPhone;
    const metadata = {
      ...deps.sessionStateManager.state?.accounts?.[phone],
      ...deps.sessionStateManager.getDeviceMetadata?.(phone),
    };
    return {
      phone, config, metadata, configManager,
      clientId: SessionManager.resolveClientId(phone, metadata, config),
    };
  }

  recover(requestedPhone, options = {}) {
    if (this.stopping) return Promise.reject(new Error('Session recovery is stopped for shutdown'));
    let account;
    try {
      account = this.resolveAccount(requestedPhone);
    } catch (error) {
      return Promise.reject(error);
    }
    const existing = this.pending.get(account.phone);
    if (this.pausing.has(account.phone)) return Promise.reject(new Error(`Local disconnect in progress for ${account.phone}; retry recovery afterwards`));
    if (existing) return existing;
    // Register ownership before any asynchronous connection check or browser work.
    const operation = Promise.resolve().then(() => this.restore(account, options));
    this.pending.set(account.phone, operation);
    const release = () => {
      if (this.pending.get(account.phone) === operation) this.pending.delete(account.phone);
    };
    operation.then(release, release);
    return operation;
  }

  async stopAccount(phone, { connectionManager, owned = false } = {}) {
    if (!owned && this.pending.has(phone)) throw new Error(`Connection already in progress for ${phone}`);
    const deps = this.getFlowDeps();
    const manager = deps.connectionManagers.get(phone);
    if (manager && manager !== connectionManager &&
        (manager.isInitializing || manager.isReconnecting)) {
      throw new Error(`Connection already in progress for ${phone}`);
    }
    if (manager?.initializationPending && !manager?.authRequired && manager?.state !== 'AUTH_REQUIRED') {
      throw new Error(`Previous browser initialization is still running for ${phone}; refusing a duplicate browser`);
    }
    if (manager) {
      manager.stopHealthCheck();
      manager.stopKeepAlive();
      manager.clearQRTimer();
      clearTimeout(manager.reconnectTimer);
      clearTimeout(manager.errorResetTimer);
      manager.reconnectTimer = null;
      manager.errorResetTimer = null;
      manager.setState?.('SUSPENDED');
      manager.acceptEvents = false;
      await manager.persistenceQueue;
      if (manager !== connectionManager) manager.isDestroyed = true;
    }
    deps.keepAliveManager?.stopKeepAlive(phone);
    const oldClient = this.accountClients.get(phone);
    if (oldClient) {
      oldClient.removeAllListeners();
      await oldClient.destroy();
      this.accountClients.delete(phone);
      const index = deps.allInitializedAccounts?.indexOf(oldClient);
      if (index >= 0) deps.allInitializedAccounts.splice(index, 1);
    }
    if (manager && manager !== connectionManager && deps.connectionManagers.get(phone) === manager) {
      deps.connectionManagers.delete(phone);
    }
  }

  disconnect(requestedPhone) {
    if (this.stopping) return Promise.reject(new Error('Session recovery is stopped for shutdown'));
    const { phone } = this.resolveAccount(requestedPhone);
    if (this.pending.has(phone)) return Promise.reject(new Error(`Connection already in progress for ${phone}`));
    this.pausing.add(phone);
    const operation = Promise.resolve().then(() => this.pauseAccount(phone));
    this.pending.set(phone, operation);
    const release = () => {
      if (this.pending.get(phone) === operation) this.pending.delete(phone);
      this.pausing.delete(phone);
    };
    operation.then(release, release);
    return operation;
  }

  async pauseAccount(phone) {
    await this.stopAccount(phone, { owned: true });
    const deps = this.getFlowDeps();
    const metadata = deps.sessionStateManager.getDeviceMetadata(phone) || {};
    const status = ['logged_out', 'auth_failed', 'auth_required'].includes(metadata.status) ? metadata.status : 'paused';
    deps.deviceLinkedManager?.updateDeviceMetadata?.(phone, { status, isOnline: false });
    const saved = await deps.sessionStateManager.saveDeviceMetadata(phone, { status, isActive: false });
    if (!saved) throw new Error(`Disconnected ${phone}, but could not persist its paused state`);
    deps.terminalHealthDashboard?.requestDashboardRefresh?.();
    return true;
  }

  async restore(account, { source = 'manual', connectionManager } = {}) {
    const { phone, config, metadata, configManager } = account;
    const deps = this.getFlowDeps();
    const managerProfile = connectionManager?.botId;
    const clientId = managerProfile && SessionManager.hasAuthenticatedSession(managerProfile) !== false
      ? managerProfile : account.clientId;
    if (config?.enabled === false) throw new Error(`Account ${phone} is disabled`);
    const currentManager = deps.connectionManagers.get(phone);
    if (currentManager && currentManager !== connectionManager &&
        (currentManager.isInitializing || currentManager.isReconnecting)) {
      throw new Error(`Connection already in progress for ${phone}`);
    }
    const oldClient = this.accountClients.get(phone);
    if (oldClient && !connectionManager && await getLiveConnectionState(oldClient).catch(error => {
      deps.logBot(`Could not read existing connection for ${phone}: ${error.message}`, 'warn');
      return null;
    }) === 'CONNECTED') return true;
    if (['logged_out', 'auth_failed'].includes(metadata.status)) {
      throw new Error(`Saved session for ${phone} is marked ${metadata.status}. Use an explicit linking command to authenticate again.`);
    }
    const staleProfileStatus = metadata.clientId && metadata.clientId !== clientId;
    if (source === 'automatic' && (metadata.status === 'paused' || !staleProfileStatus &&
        (currentManager?.authRequired || metadata.status === 'auth_required'))) {
      throw new Error(`Automatic recovery is paused for ${phone} (${metadata.status || 'authentication required'})`);
    }
    if (!SessionManager.canRestoreSession(clientId)) {
      throw new Error(`Saved profile session-${clientId} for ${phone} has no saved WhatsApp login. Link the device again with a pairing code or QR code.`);
    }
    const owner = this.pendingProfiles.get(clientId) ||
      [...this.accountClients].find(([number, client]) =>
        number !== phone && client.authStrategy?.clientId === clientId)?.[0];
    if (owner && owner !== phone) {
      throw new Error(`Saved profile session-${clientId} is already owned by ${owner}; refusing a second browser`);
    }
    this.pendingProfiles.set(clientId, phone);
    let flow;
    try {
      if (connectionManager?.isDestroyed) throw new Error('Connection manager is stopped');
      await this.stopAccount(phone, { connectionManager, owned: true });
      if (this.stopping || connectionManager?.isDestroyed) throw new Error('Session recovery is stopped for shutdown');
      const client = await this.createClient(clientId);
      if (!client) throw new Error('WhatsApp client factory returned no client');
      if (this.stopping || connectionManager?.isDestroyed) {
        await client.destroy();
        throw new Error('Session recovery is stopped for shutdown');
      }
      this.accountClients.set(phone, client);
      const masterPhone = configManager?.getMasterPhoneNumber?.() || deps.sessionStateManager.state?.masterPhoneNumber;
      if (phone === masterPhone) deps.sharedContext.setMasterRef(client);
      if (deps.deviceLinkedManager?.getDevice && !deps.deviceLinkedManager.getDevice(phone)) {
        deps.deviceLinkedManager.addDevice(phone, {
          name: config?.displayName || metadata.displayName, role: config?.role || metadata.role,
        });
      }
      deps.deviceLinkedManager?.updateDeviceMetadata?.(phone, {
        status: 'restoring', isOnline: false, recoveryMode: true, clientId, lastError: null,
      });
      if (connectionManager) {
        connectionManager.client = client;
        connectionManager.isInitializing = false;
        connectionManager.setState('IDLE');
      }
      flow = this.setupClientFlow(client, phone, clientId, {
        isRestore: true, displayName: config?.displayName || metadata.displayName,
        ...(connectionManager ? { connectionManager } : {}),
      }, deps);
      if (!await flow.initializationPromise) {
        const reason = flow.authRequired
          ? 'WhatsApp requested fresh authentication; saved profile retained. Use link-code or link-qr to authenticate.'
          : flow.connectionFailureReason || 'Session initialization did not complete';
        throw new Error(reason);
      }
      await flow.persistenceQueue;
      if (flow.state && flow.state !== 'CONNECTED') throw new Error('Account disconnected before recovery completed');
      return true;
    } catch (error) {
      if (this.stopping) throw error;
      const manager = flow || deps.connectionManagers.get(phone);
      const failure = {
        status: manager?.authenticationFailed ? 'auth_failed' : manager?.authRequired ? 'auth_required' : 'restore_failed',
        isOnline: false, recoveryMode: true, clientId, lastError: error.message,
      };
      deps.deviceLinkedManager?.updateDeviceMetadata?.(phone, failure);
      await manager?.persistenceQueue;
      if (!this.stopping && deps.sessionStateManager.saveDeviceMetadata) {
        try {
          const saved = await deps.sessionStateManager.saveDeviceMetadata(phone, { ...failure, isActive: false });
          if (!saved) deps.logBot(`Could not persist recovery failure for ${phone}`, 'error');
        } catch (persistenceError) {
          deps.logBot(`Could not persist recovery failure for ${phone}: ${persistenceError.message}`, 'error');
        }
      }
      deps.terminalHealthDashboard?.requestDashboardRefresh?.();
      throw new Error(`Session restore failed for ${phone} (session-${clientId}): ${error.message}`, { cause: error });
    } finally {
      if (this.pendingProfiles.get(clientId) === phone) this.pendingProfiles.delete(clientId);
    }
  }

  stop() {
    this.stopping = true;
    for (const manager of this.getFlowDeps().connectionManagers.values()) {
      manager.isDestroyed = true;
      manager.acceptEvents = false;
      manager.cancelInitialization?.();
      clearTimeout(manager.reconnectTimer);
      clearTimeout(manager.errorResetTimer);
      manager.reconnectTimer = null;
      manager.errorResetTimer = null;
    }
  }
}

export function getSessionRecovery(options) {
  const context = options.getFlowDeps().sharedContext;
  if (!context.sessionRecovery) context.sessionRecovery = new SessionRecoveryService(options);
  return context.sessionRecovery;
}
