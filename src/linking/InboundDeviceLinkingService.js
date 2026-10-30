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
 * Flow:
 * 1. Resolves genuine phone number (handling standard JIDs and WhatsApp Privacy LIDs).
 * 2. Verifies the sender's phone number is authorized in bots-config.json.
 * 3. Checks if device is already active or in progress.
 * 4. Immediately acknowledges receipt to the sender via WhatsApp reply.
 * 5. Initializes a pairing session in 'code' mode for that number.
 * 6. Automatically sends the 8-character pairing code back to the sender
 *    via WhatsApp text with simple 6-step linking instructions.
 * 7. Sends a celebration confirmation message once linking succeeds.
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
      await this.sendWhatsAppMessage(
        msg.from,
        `🔒 *WhatsApp Privacy ID Detected*\n\n` +
        `Linda received your message via WhatsApp Privacy Addressing (ID: +${resolved.lidDigits}).\n\n` +
        `To link your device, please reply with your registered phone number, for example:\n` +
        `👉 *"Hi Linda, please add my device 0589969886"*`,
        primaryClient,
        msg
      );
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
      await this.sendWhatsAppMessage(
        senderPhone,
        `🔒 *Unauthorized Device Request*\n\n` +
        `Your phone number (${senderPhone}) is not registered in Linda's authorized configuration.\n` +
        `Please contact the system administrator to add your number before linking.`,
        primaryClient,
        msg
      );
      return true;
    }

    // 2. Self Check: Primary master cannot link itself via inbound message
    const primaryMasterPhone = acm.getMasterPhoneNumber?.();
    if (senderDigits === normalizeDigits(primaryMasterPhone)) {
      await this.sendWhatsAppMessage(
        senderPhone,
        `ℹ️ Primary master (${primaryMasterPhone}) is already online as Linda's active host.`,
        primaryClient,
        msg
      );
      return true;
    }

    // 3. Already Active Check
    const existingClient = clients?.get(senderPhone) || clients?.get(senderDigits);
    if (existingClient) {
      const liveState = await getLiveConnectionState(existingClient).catch(() => null);
      if (liveState === 'CONNECTED') {
        await this.sendWhatsAppMessage(
          senderPhone,
          `✅ *Device Already Connected*\n\n` +
          `Your device (${senderPhone}) is already online, linked, and active on Linda AI Assistant!`,
          primaryClient,
          msg
        );
        return true;
      }
    }

    // 4. Concurrency Guard
    if (this.activeRequests.has(senderPhone) || this.activeRequests.has(senderDigits)) {
      await this.sendWhatsAppMessage(
        senderPhone,
        `⏳ *Pairing in Progress*\n\n` +
        `A pairing code request is already active for your device (${senderPhone}).\n` +
        `Please check previous messages for your code or wait a minute before retrying.`,
        primaryClient,
        msg
      );
      return true;
    }

    // 5. Begin Linking Flow
    this.activeRequests.add(senderPhone);
    this.activeRequests.add(senderDigits);
    this.logBot(`📲 Inbound linking: Started pairing flow for ${senderPhone} (${accountConfig.displayName || accountConfig.name})`, 'info');

    try {
      // Immediate acknowledgement to reassure the user
      await this.sendWhatsAppMessage(
        senderPhone,
        `⏳ *Initiating Device Linking*\n\n` +
        `Hello! Processing request to link your device (*${senderPhone}*)...\n` +
        `Starting WhatsApp pairing session. Your 8-character pairing code will arrive in a few seconds!`,
        primaryClient,
        msg
      );

      // Clean up previous client if lingering
      await this.cleanupExistingConnections(senderPhone, clients, connManagers);

      // Resolve clientId for session persistence
      const metadata = ssm?.getDeviceMetadata(senderPhone) || {};
      const clientId = SessionManager.resolveClientId(senderPhone, metadata, accountConfig);

      // Create new client instance
      if (typeof this.createClient !== 'function') {
        throw new Error('Client creation factory not configured');
      }
      const newClient = await this.createClient(clientId);
      if (!newClient) {
        throw new Error('Failed to create new WhatsApp client instance');
      }

      // Register client in shared map
      if (clients) {
        clients.set(senderPhone, newClient);
      }
      if (this.sharedContext?.accountClients) {
        this.sharedContext.accountClients.set(senderPhone, newClient);
      }

      // Register with health & device managers
      chm?.registerClient?.(senderPhone, newClient);
      dlm?.addDevice?.(senderPhone, {
        name: accountConfig.displayName || senderPhone,
        role: accountConfig.role || 'master',
        status: 'linking',
      });

      // Prepare promise to capture pairing code
      let codeResolved = false;
      let pairingTimer = null;

      const codePromise = new Promise((resolve, reject) => {
        pairingTimer = setTimeout(() => {
          if (!codeResolved) {
            reject(new Error(`Pairing code timed out after ${Math.round(this.codeTimeoutMs / 1000)} seconds.`));
          }
        }, this.codeTimeoutMs);

        newClient.once('code', (code) => {
          codeResolved = true;
          if (pairingTimer) {
            clearTimeout(pairingTimer);
          }
          resolve(code);
        });

        newClient.once('auth_failure', (err) => {
          if (!codeResolved) {
            codeResolved = true;
            if (pairingTimer) {
              clearTimeout(pairingTimer);
            }
            reject(new Error(`Authentication failure: ${err?.message || err}`));
          }
        });
      });

      // Setup client flow in 'code' mode
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
      const code = await codePromise;
      this.logBot(`📲 Inbound linking: Generated pairing code for ${senderPhone}: ${code}`, 'success');

      // Send pairing code with 6-step instructions directly to sender
      const pairingMessage =
        `📲 *WhatsApp Pairing Code for ${senderPhone}:*\n\n` +
        `🔑 *${code}*\n\n` +
        `*Follow these steps on your phone:* \n` +
        `1️⃣ Open *WhatsApp* on this phone (${senderPhone})\n` +
        `2️⃣ Tap *Settings* (iPhone) or *⋮ Menu* (Android)\n` +
        `3️⃣ Tap *Linked Devices*\n` +
        `4️⃣ Tap *Link a device*\n` +
        `5️⃣ Tap *Link with phone number instead*\n` +
        `6️⃣ Enter the 8-character code: *${code}*\n\n` +
        `⏱️ _This code will expire in 2-3 minutes. Enter it now!_`;

      await this.sendWhatsAppMessage(senderPhone, pairingMessage, primaryClient, msg);

      // Listen for successful authentication and readiness
      newClient.once('ready', async () => {
        this.activeRequests.delete(senderPhone);
        this.activeRequests.delete(senderDigits);
        this.logBot(`🎉 Inbound linking: ${senderPhone} successfully linked and online!`, 'success');

        const successMessage =
          `🎉 *Device Successfully Linked!*\n\n` +
          `Your phone (*${senderPhone}*) is now connected and operational as a master account on Linda AI Assistant.\n\n` +
          `✅ Session: Saved & Protected\n` +
          `🚀 Status: Online & Active\n\n` +
          `✨ Thank you!`;

        await this.sendWhatsAppMessage(senderPhone, successMessage, primaryClient, msg);
      });

      return true;
    } catch (error) {
      this.activeRequests.delete(senderPhone);
      this.activeRequests.delete(senderDigits);
      this.logBot(`❌ Inbound linking failed for ${senderPhone}: ${error.message}`, 'error');

      await this.sendWhatsAppMessage(
        senderPhone,
        `⚠️ *Linking Request Encountered an Issue*\n\n` +
        `${error.message}\n\n` +
        `Please send *"add my device"* again when you are ready to retry.`,
        primaryClient,
        msg
      );
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
