/**
 * ====================================================================
 * MESSAGE ROUTER (Extracted from index.js)
 * ====================================================================
 * Binds all WhatsApp client event handlers for messages, reactions,
 * group events, admin commands, reports, and dashboards.
 *
 * Eliminates the 367-line inline function and all its hidden dependencies
 * on module-level variables. Everything is injected via `deps`.
 *
 * @since Phase 11 – February 14, 2026
 * @modularized Phase 32 — October 2026
 */

import { ReactionHandler } from './handlers/ReactionHandler.js';
import { GroupEventHandler } from './handlers/GroupEventHandler.js';
import services from '../core/ServiceRegistry.js';
import closedCircleGuard from '../core/ClosedCircleGuard.js';
import ContactConsentService from '../campaigns/ContactConsentService.js';
import {
  handleAdminCommand,
  handleReportCommand,
  handleDashboardCommand,
  handleGorahaVerification,
} from './routing/LegacyCommandHandlers.js';

export function setupMessageListeners(client, phoneNumber = 'Unknown', connManager = null, deps = {}) {
  const {
    logBot,
    analyticsModule,
    adminConfigModule,
    commandHandler,
    reportGeneratorModule,
    accountConfigManager,
    deviceLinkedManager,
    keepAliveManager,
    clientHealthMonitor,
    contactHandlerRef,
    gorahaRef,
    accountClients,
    getAllConnectionDiagnostics,
    analyticsManager,
    commandBridge,
    inboundDeviceLinkingService,
  } = deps;

  // ═══ LISTENER CLEANUP (Phase 10) ═══
  const messageEvents = ['message', 'message_reaction', 'group_update', 'group_join', 'group_leave'];
  for (const event of messageEvents) {
    try {
      client.removeAllListeners(event);
    } catch (_) {
      /* best effort */
    }
  }
  logBot(`🧹 Cleaned message listeners for ${maskPhone(phoneNumber)} before rebind`, 'info');

  // ─── Activity tracking ─────────────────────────────────────────────
  if (connManager) {
    client.on('message', () => connManager.recordActivity());
  }

  // ─── Phase 1 Event Handlers (singletons) ───────────────────────────
  const reactionHandlerInstance = services.get('reactionHandler') || new ReactionHandler(null);
  const groupHandlerInstance = services.get('groupEventHandler') || new GroupEventHandler(null);

  client.on('message_reaction', async (reaction) => {
    try {
      if (!reaction) return;
      await reactionHandlerInstance.handleReaction(reaction);
      const msgId = reaction.msg?.id?.id || reaction.msgId?._serialized || reaction.id?._serialized || 'unknown';
      logBot(`✅ Reaction tracked: ${reaction.reaction} on message ${msgId}`, 'success');
    } catch (error) {
      logBot(`❌ Error handling reaction: ${error.message}`, 'error');
    }
  });

  client.on('group_update', async (notification) => {
    try {
      await groupHandlerInstance.handleGroupUpdate(notification);
      logBot(`✅ Group update tracked: ${notification.chatId}`, 'success');
    } catch (error) {
      logBot(`❌ Error handling group update: ${error.message}`, 'error');
    }
  });

  client.on('group_join', async (notification) => {
    try {
      await groupHandlerInstance.handleGroupJoin(notification);
      logBot(`✅ Group join tracked: ${notification.contact.length} member(s) joined`, 'success');
    } catch (error) {
      logBot(`❌ Error handling group join: ${error.message}`, 'error');
    }
  });

  client.on('group_leave', async (notification) => {
    try {
      await groupHandlerInstance.handleGroupLeave(notification);
      logBot(`✅ Group leave tracked: ${notification.contact.length} member(s) left`, 'success');
    } catch (error) {
      logBot(`❌ Error handling group leave: ${error.message}`, 'error');
    }
  });

  logBot(`✅ Phase 1 event handlers bound for ${maskPhone(phoneNumber)}`, 'success');

  // ─── Main message handler ─────────────────────────────────────────
  client.on('message', async (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    const from = msg.from.includes('@g.us') ? 'Group message' : `User: ${maskPhone(msg.from)}`;
    const messageText = typeof msg.body === 'string' ? msg.body : '';

    // Keep-alive activity
    if (keepAliveManager) {
      keepAliveManager.updateLastActivity(phoneNumber);
    }

    // Record message metric (Phase 29e)
    if (analyticsManager) {
      analyticsManager.recordMessage(phoneNumber, {
        type: msg.type,
        fromMe: msg.fromMe,
        isGroup: msg.isGroupMsg,
        timestamp: new Date(),
      });
    }

    logBot(`📨 [${timestamp}] (${maskPhone(phoneNumber)}) ${from}: [message content redacted]`, 'info');

    // ── Closed Circle Guard: Wrap msg.reply to guarantee zero replies to non-masters ──
    closedCircleGuard.protectMessage(msg);

    // ── Inbound Device Linking Check (Allowed even if non-master so device can receive linking guidance) ──
    const linkingService = inboundDeviceLinkingService || services.get('inboundDeviceLinkingService');
    const masterPhone = accountConfigManager?.getMasterPhoneNumber();
    const normalize = (p) => String(p || '').replace(/\D/g, '');
    const isMasterAccount = normalize(phoneNumber) === normalize(masterPhone);
    const isLinkingRequest = Boolean(
      isMasterAccount &&
      linkingService &&
      !msg.fromMe &&
      !msg.from?.includes('@g.us') &&
      linkingService.shouldHandle(msg, phoneNumber)
    );

    // ── Closed Circle Guard: Strict dev phase drop for non-master contacts (unless device linking intent) ──
    if (!msg.fromMe && !closedCircleGuard.isMasterRecipient(msg.from) && !isLinkingRequest) {
      logBot(`🛡️ [ClosedCircleGuard] Dropped inbound message from non-master ${maskPhone(msg.from)} (closed circle dev phase active)`, 'info');
      return;
    }

    try {
      if (!msg.fromMe && !msg.from?.includes('@g.us') && /^(stop|unsubscribe|opt[\s-]?out)$/i.test(messageText.trim())) {
        await ContactConsentService.setConsent(msg.from, {
          granted: false,
          source: 'inbound_whatsapp_opt_out',
          evidence: messageText.trim(),
        });
        await msg.reply('You have been unsubscribed and will not receive further messages.');
        return;
      }

      // ── Analytics tracking ──────────────────────────────────────
      if (analyticsModule) {
        analyticsModule.trackMessage(msg, {
          type: msg.type,
          fromMe: msg.fromMe,
          isGroup: msg.isGroupMsg,
          timestamp: new Date(),
          phoneNumber,
        });
      }

      // ── Authorization check ─────────────────────────────────────
      if (adminConfigModule && !adminConfigModule.isUserAuthorized(msg.from)) {
        logBot(`⚠️  Unauthorized user attempt: ${maskPhone(msg.from)}`, 'warn');
      }

      // ── Master account detection ────────────────────────────────
      const masterPhone = accountConfigManager?.getMasterPhoneNumber();
      const normalize = (p) => String(p || '').replace(/\D/g, '');
      const isMasterAccount = normalize(phoneNumber) === normalize(masterPhone);

      // ── Inbound Device Linking (Phase 32) ──────────────────────
      const linkingService = inboundDeviceLinkingService || services.get('inboundDeviceLinkingService');
      if (isMasterAccount && linkingService && !msg.fromMe && !msg.from?.includes('@g.us')) {
        if (linkingService.shouldHandle(msg, phoneNumber)) {
          const handled = await linkingService.handleMessage(msg, client, phoneNumber);
          if (handled) {
            logBot(`📱 Inbound device linking processed from ${maskPhone(msg.from)}`, 'success');
            return;
          }
        }
      }

      // ── Interactive Keypad Dashboard (Phase 33) ───────────────
      const keypad = services.get('keypadDashboardService');
      const isMasterSender = closedCircleGuard.isMasterRecipient(msg.from);
      if (isMasterAccount && keypad && isMasterSender && !msg.fromMe && !msg.from?.includes('@g.us')) {
        if (keypad.shouldHandle(msg, isMasterSender)) {
          const handled = await keypad.handleMessage(msg, client);
          if (handled) {
            logBot(`📱 Keypad dashboard processed from ${maskPhone(msg.from)}`, 'success');
            return;
          }
        }
      }

      // ── WhatsApp Command Bridge (Phase 31) ─────────────────────
      if (isMasterAccount && commandBridge && !msg.fromMe && !msg.from?.includes('@g.us')) {
        if (commandBridge.shouldHandle(msg, phoneNumber)) {
          const handled = await commandBridge.handleMessage(msg);
          if (handled) {
            logBot(`📱 Bridge command processed from ${maskPhone(msg.from)}`, 'success');
            return;
          }
        }
      }

      // ── Linda AI command system (master only) ───────────────────
      if (isMasterAccount && commandHandler && msg.body.startsWith('!')) {
        const context = {
          deviceCount: deviceLinkedManager ? deviceLinkedManager.getLinkedDevices().length : 0,
          accountCount: accountClients?.size || 0,
          client,
          phoneNumber,
          isMasterAccount: true,
        };

        const cmdResult = await commandHandler.processMessage(msg, phoneNumber, context);
        if (cmdResult.processed) {
          logBot(`✅ Command processed: ${cmdResult.command}`, 'success');
          return;
        } else if (cmdResult.isCommand) {
          return;
        }
      } else if (!isMasterAccount && msg.body.startsWith('!')) {
        logBot('📩 Command received on secondary account.', 'info');
        if (masterPhone) {
          await msg.reply('📢 Commands are processed by the master account.\n\nYou can still send messages to the master account for help!');
        }
        return;
      }

      // ── /admin commands ─────────────────────────────────────────
      if (msg.body.startsWith('/admin ') && adminConfigModule) {
        await handleAdminCommand(msg, { adminConfigModule, analyticsModule, getAllConnectionDiagnostics });
        return;
      }

      // ── /report commands ────────────────────────────────────────
      if (msg.body.startsWith('/report ') && reportGeneratorModule) {
        await handleReportCommand(msg, reportGeneratorModule);
        return;
      }

      // ── /dashboard command ──────────────────────────────────────
      if (msg.body === '/dashboard' && analyticsModule) {
        await handleDashboardCommand(msg, analyticsModule);
        return;
      }

      // ── Conversation analysis (master only) ─────────────────────
      if (isMasterAccount) {
        // Contact lookup
        try {
          if (contactHandlerRef?.current && !msg.from.includes('@g.us')) {
            const contact = await contactHandlerRef.current.getContact(msg.from);
            if (contact) {
              logBot(`✅ Contact found: ${maskPhone(contact.phoneNumber)}`, 'success');
            }
          }
        } catch (error) {
          logBot(`⚠️ Contact lookup error: ${error.message}`, 'warn');
        }

        // Goraha verification
        if (msg.body === '!verify-goraha') {
          await handleGorahaVerification(msg, client, gorahaRef, logBot);
        }
      }
    } catch (error) {
      logBot(`Error processing message: ${error.message}`, 'error');

      if (analyticsManager) {
        analyticsManager.recordError(phoneNumber, {
          type: 'message_processing',
          message: error.message,
          timestamp: new Date(),
        });
      }

      if (clientHealthMonitor && error.message.includes('detached')) {
        logBot(`🚨 Frame detachment detected on ${maskPhone(phoneNumber)}`, 'warn');
        clientHealthMonitor.recordFrameDetachment(phoneNumber, error);
      }
    }
  });

  logBot(`✅ Message listeners ready for ${maskPhone(phoneNumber)}`, 'success');
}

function maskPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length < 5 ? '[redacted]' : `***${digits.slice(-4)}`;
}

export default setupMessageListeners;
