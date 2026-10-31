/**
 * ====================================================================
 * INBOUND DEVICE LINKING SERVICE (Phase 32)
 * ====================================================================
 * Enables registered master WhatsApp accounts to self-link on demand
 * by sending an inbound message to Linda (the primary master bot).
 *
 * Example triggers:
 *   "Hi, Linda, can you add my device please"
 *   "Hi, Linda, can you add my device 0589969886 please"
 *   "add my device"
 *   "link my device"
 *   "!link-code"
 *
 * Operating Lane: Architecture & Reliability / WhatsApp Client & Protocols
 * Governing Laws: Rate-limited dispatch & 24/7 resilience
 *
 * @since Phase 32 — February 2026
 */

import { Logger } from '../core/Logger.js';
import services from '../core/ServiceRegistry.js';
import { SessionManager } from '../sessions/SessionManager.js';
import { getLiveConnectionState } from '../connection/ConnectionEnhancements.js';
import { getSessionRecovery } from '../sessions/SessionRecoveryService.js';
import {
  normalizeDigits,
  isDeviceLinkingRequest,
  extractSenderPhone,
  extractPhonesFromText,
  isLidJid,
  resolveSenderPhone,
  lidPhoneStore,
} from './InboundLinkingHelpers.js';
import {
  formatPrivacyIdDetectedPrompt,
  formatUnauthorizedMessage,
  formatPrimaryMasterSelfMessage,
  formatAlreadyConnectedMessage,
  formatPairingInProgressMessage,
  formatInitiatingLinkingMessage,
  formatPairingCodeInstructions,
  formatDeviceLinkedSuccess,
  formatLinkingErrorMessage,
  awaitPairingCode,
} from './InboundLinkingTemplates.js';

// Re-export helpers for backward compatibility with existing tests and modules
export {
  normalizeDigits,
  isDeviceLinkingRequest,
  extractSenderPhone,
  extractPhonesFromText,
  isLidJid,
  resolveSenderPhone,
  lidPhoneStore,
};

const logger = new Logger('InboundDeviceLinkingService');

export class InboundDeviceLinkingService {
  constructor(deps = {}) {
    this.accountConfigManager = deps.accountConfigManager || null;
    this.accountClients = deps.accountClients || null;
    this.createClient = deps.createClient || null;
    this.setupClientFlow = deps.setupClientFlow || null;
    this.getFlowDeps = deps.getFlowDeps || null;
    this.deviceLinkedManager = deps.deviceLinkedManager || null;
    this.sessionStateManager = deps.sessionStateManager || null;
    this.connectionManagers = deps.connectionManagers || null;
    this.clientHealthMonitor = deps.clientHealthMonitor || null;
    this.sharedContext = deps.sharedContext || null;
    this.lidPhoneMap = deps.lidPhoneMap || lidPhoneStore;
    this.logBot = deps.logBot || ((msg, level = 'info') => {
      if (typeof logger[level] === 'function') {
        logger[level](msg);
      } else {
        logger.info(msg);
      }
    });

    // Track phones currently undergoing linking to prevent duplicate browser spawns
    this.activeRequests = new Set();
    this.codeTimeoutMs = deps.codeTimeoutMs ?? 90000;
  }

  getDependencies() {
    return {
      acm: this.accountConfigManager || services.get('accountConfigManager') || this.sharedContext?.accountConfigManager,
      clients: this.accountClients || services.get('accountClients') || this.sharedContext?.accountClients,
      connManagers: this.connectionManagers || services.get('connectionManagers') || this.sharedContext?.connectionManagers,
      ssm: this.sessionStateManager || services.get('sessionStateManager') || this.sharedContext?.sessionStateManager,
      dlm: this.deviceLinkedManager || services.get('deviceLinkedManager') || this.sharedContext?.deviceLinkedManager,
      chm: this.clientHealthMonitor || services.get('clientHealthMonitor') || this.sharedContext?.clientHealthMonitor,
    };
  }

  /**
   * Determine whether an inbound message should be processed by this service.
   *
   * @param {object} msg - Incoming WhatsApp message object
   * @param {string} recipientPhone - Phone number of account that received the message
   * @returns {boolean}
   */
  shouldHandle(msg, recipientPhone) {
    if (!msg || msg.fromMe || msg.isGroupMsg) {
      return false;
    }
    if (msg.from?.includes('@g.us')) {
      return false;
    }

    const { acm } = this.getDependencies();
    const primaryMasterPhone = acm?.getMasterPhoneNumber?.();
    if (recipientPhone && primaryMasterPhone) {
      if (normalizeDigits(recipientPhone) !== normalizeDigits(primaryMasterPhone)) {
        return false; // Only primary master processes device additions
      }
    }

    return isDeviceLinkingRequest(msg.body);
  }

  /**
   * Handle an inbound device linking request.
   *
   * @param {object} msg - Incoming WhatsApp message object
   * @param {object} primaryClient - Primary master WhatsApp client instance
   * @param {string} _recipientPhone - Primary master phone number
   * @returns {Promise<boolean>}
   */
  async handleMessage(msg, primaryClient = null, _recipientPhone = '') {
    const { acm, clients, connManagers, ssm, dlm, chm } = this.getDependencies();

    // Resolve sender phone, intelligently resolving WhatsApp Privacy IDs (LIDs)
    const resolved = await resolveSenderPhone(msg, primaryClient, acm, this.lidPhoneMap);
    const senderPhone = resolved.phone;

    // Handle Unresolved WhatsApp Privacy ID (LID)
    if (!senderPhone && resolved.isLid) {
      this.logBot(`Inbound linking received from unmapped WhatsApp LID: +${resolved.lidDigits}`, 'warn');
      await this.sendWhatsAppMessage(msg.from, formatPrivacyIdDetectedPrompt(resolved.lidDigits), primaryClient, msg);
      return true;
    }

    if (!senderPhone) {
      this.logBot('Inbound linking request received but unable to parse sender phone', 'warn');
      return false;
    }

    if (!acm) {
      this.logBot('Inbound linking: AccountConfigManager unavailable', 'error');
      await this.sendWhatsAppMessage(senderPhone, '⚠️ Configuration manager unavailable. Please try again later.', primaryClient, msg);
      return true;
    }

    // 1. Authorization Check: Must be in bots-config.json
    const senderDigits = normalizeDigits(senderPhone);
    const accountConfig = acm.getAccountByPhone(senderPhone) ||
      acm.getAllAccounts?.().find(acc => normalizeDigits(acc.phoneNumber) === senderDigits);

    if (!accountConfig) {
      this.logBot(`Inbound linking rejected: ${senderPhone} is not a configured master account`, 'warn');
      await this.sendWhatsAppMessage(senderPhone, formatUnauthorizedMessage(senderPhone), primaryClient, msg);
      return true;
    }

    // 2. Self Check: Primary master cannot link itself via inbound message
    const primaryMasterPhone = acm.getMasterPhoneNumber?.();
    if (senderDigits === normalizeDigits(primaryMasterPhone)) {
      await this.sendWhatsAppMessage(senderPhone, formatPrimaryMasterSelfMessage(primaryMasterPhone), primaryClient, msg);
      return true;
    }

    // 3. Already Active Check
    const existingClient = clients?.get(senderPhone) || clients?.get(senderDigits);
    if (existingClient) {
      const liveState = await getLiveConnectionState(existingClient).catch(() => null);
      if (liveState === 'CONNECTED') {
        await this.sendWhatsAppMessage(senderPhone, formatAlreadyConnectedMessage(senderPhone), primaryClient, msg);
        return true;
      }
    }

    // 4. Concurrency Guard
    if (this.activeRequests.has(senderPhone) || this.activeRequests.has(senderDigits)) {
      await this.sendWhatsAppMessage(senderPhone, formatPairingInProgressMessage(senderPhone), primaryClient, msg);
      return true;
    }

    // 5. Begin Linking Flow
    this.activeRequests.add(senderPhone);
    this.activeRequests.add(senderDigits);
    this.logBot(`📲 Inbound linking: Started pairing flow for ${senderPhone} (${accountConfig.displayName || accountConfig.name})`, 'info');

    try {
      await this.sendWhatsAppMessage(senderPhone, formatInitiatingLinkingMessage(senderPhone), primaryClient, msg);
      await this.cleanupExistingConnections(senderPhone, clients, connManagers);

      const metadata = ssm?.getDeviceMetadata(senderPhone) || {};
      const clientId = SessionManager.resolveClientId(senderPhone, metadata, accountConfig);

      if (typeof this.createClient !== 'function') {
        throw new Error('Client creation factory not configured');
      }
      const newClient = await this.createClient(clientId);
      if (!newClient) {
        throw new Error('Failed to create new WhatsApp client instance');
      }

      clients?.set(senderPhone, newClient);
      this.sharedContext?.accountClients?.set(senderPhone, newClient);
      chm?.registerClient?.(senderPhone, newClient);
      dlm?.addDevice?.(senderPhone, {
        name: accountConfig.displayName || senderPhone,
        role: accountConfig.role || 'master',
        status: 'linking',
      });

      if (typeof this.setupClientFlow !== 'function') {
        throw new Error('Client flow setup function not configured');
      }

      const flowDeps = typeof this.getFlowDeps === 'function' ? this.getFlowDeps() : {};
      this.setupClientFlow(
        newClient,
        senderPhone,
        clientId,
        {
          isRestore: false,
          displayName: accountConfig.displayName || senderPhone,
          linkingMethod: 'code',
          manualLinking: true,
        },
        flowDeps
      );

      // Wait for pairing code
      const code = await awaitPairingCode(newClient, this.codeTimeoutMs);
      this.logBot(`📲 Inbound linking: Generated pairing code for ${senderPhone}: ${code}`, 'success');

      await this.sendWhatsAppMessage(senderPhone, formatPairingCodeInstructions(senderPhone, code), primaryClient, msg);

      // Listen for successful authentication and readiness
      newClient.once('ready', async () => {
        this.activeRequests.delete(senderPhone);
        this.activeRequests.delete(senderDigits);
        this.logBot(`🎉 Inbound linking: ${senderPhone} successfully linked and online!`, 'success');
        await this.sendWhatsAppMessage(senderPhone, formatDeviceLinkedSuccess(senderPhone), primaryClient, msg);
      });

      return true;
    } catch (error) {
      this.activeRequests.delete(senderPhone);
      this.activeRequests.delete(senderDigits);
      this.logBot(`❌ Inbound linking failed for ${senderPhone}: ${error.message}`, 'error');
      await this.sendWhatsAppMessage(senderPhone, formatLinkingErrorMessage(error.message), primaryClient, msg);
      return true;
    }
  }

  /**
   * Safely stop any lingering connection for a phone number before linking.
   */
  async cleanupExistingConnections(phoneNumber, clients, connManagers) {
    try {
      const recovery = getSessionRecovery({
        getFlowDeps: this.getFlowDeps,
        setupClientFlow: this.setupClientFlow,
        createClient: this.createClient,
        accountClients: clients,
        accountConfigManager: this.accountConfigManager,
      });
      await recovery?.stopAccount?.(phoneNumber);
    } catch {
      const oldClient = clients?.get(phoneNumber);
      if (oldClient) {
        try {
          await oldClient.destroy?.();
        } catch (_) {
          /* best effort */
        }
        clients?.delete(phoneNumber);
      }
    }
    connManagers?.delete(phoneNumber);
  }

  /**
   * Deliver a message to the target phone via originalMsg reply or primaryClient.
   */
  async sendWhatsAppMessage(targetJidOrPhone, text, primaryClient, originalMsg) {
    const isLid = String(targetJidOrPhone || '').includes('@lid');
    const chatId = targetJidOrPhone.includes('@')
      ? targetJidOrPhone
      : `${normalizeDigits(targetJidOrPhone)}@c.us`;

    try {
      if (primaryClient?.sendMessage && !isLid) {
        await primaryClient.sendMessage(chatId, text);
        return;
      }
      if (originalMsg && typeof originalMsg.reply === 'function') {
        await originalMsg.reply(text);
        return;
      }
      if (primaryClient?.sendMessage) {
        await primaryClient.sendMessage(chatId, text);
        return;
      }
    } catch (err) {
      this.logBot(`Failed to deliver WhatsApp message: ${err.message}`, 'warn');
      if (originalMsg && typeof originalMsg.reply === 'function') {
        try {
          await originalMsg.reply(text);
        } catch (_) {
          /* best effort */
        }
      }
    }
  }
}

export default InboundDeviceLinkingService;
