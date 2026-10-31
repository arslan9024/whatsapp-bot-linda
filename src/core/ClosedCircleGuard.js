/**
 * ====================================================================
 * CLOSED CIRCLE GUARD (Development Safety Shield)
 * ====================================================================
 * Strict security guard enforcing a zero-outbound policy to anyone
 * outside Linda's authorized master account circle.
 *
 * Requirements:
 *   - NEVER send a single message to any number not in the master list.
 *   - Intercepts client.sendMessage and msg.reply system-wide.
 *   - Drops inbound messages from non-master contacts during dev phase.
 *   - Automatically resolves WhatsApp Privacy LIDs to true master numbers.
 *
 * @since Development Phase — October 2026
 */

import fs from 'fs';
import path from 'path';
import { Logger } from './Logger.js';
import services from './ServiceRegistry.js';
import { lidPhoneStore, normalizeDigits } from '../linking/InboundLinkingHelpers.js';

const logger = new Logger('ClosedCircleGuard');

export function maskPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length <= 4) return digits ? '***' : 'unknown';
  return `***${digits.slice(-4)}`;
}

const PROTECTED_CLIENT_FLAG = Symbol('isClosedCircleProtectedClient');
const PROTECTED_MSG_FLAG = Symbol('isClosedCircleProtectedMsg');

export class ClosedCircleGuard {
  constructor(deps = {}) {
    this.accountConfigManager = deps.accountConfigManager || null;
    this.adminConfigModule = deps.adminConfigModule || null;
    this.enabled = true; // Strict closed circle active by default
    this.cachedMasters = new Set();
    this.lastCacheTime = 0;
    this.cacheTtlMs = 10000; // Refresh cache every 10 seconds
  }

  /**
   * Dynamically fetch all authorized master account numbers as normalized digit strings.
   *
   * @returns {Set<string>} Set of digits (e.g. '971505760056', '971559156636', etc.)
   */
  getMasterNumbers() {
    const now = Date.now();
    if (this.cachedMasters.size > 0 && now - this.lastCacheTime < this.cacheTtlMs) {
      return this.cachedMasters;
    }

    const masters = new Set();

    // 1. Check AccountConfigManager (singleton or injected)
    const acm = this.accountConfigManager || services.get('accountConfigManager');
    if (acm) {
      const allAccounts = acm.getAllAccounts?.() || [];
      for (const acc of allAccounts) {
        if (['primary', 'master'].includes(acc.role) && acc.phoneNumber) {
          masters.add(normalizeDigits(acc.phoneNumber));
        }
      }
      const primaryPhone = acm.getMasterPhoneNumber?.();
      if (primaryPhone) {
        masters.add(normalizeDigits(primaryPhone));
      }
    }

    // 2. Direct Fallback: config/bots-config.json
    try {
      const botsConfigPath = path.resolve('config', 'bots-config.json');
      if (fs.existsSync(botsConfigPath)) {
        const botsConfig = JSON.parse(fs.readFileSync(botsConfigPath, 'utf8'));
        const bots = Object.values(botsConfig.whatsappBots || {});
        for (const bot of bots) {
          if (['primary', 'master'].includes(bot.role) && bot.phoneNumber) {
            masters.add(normalizeDigits(bot.phoneNumber));
          }
        }
      }
    } catch (_) {
      // Best effort fallback
    }

    // 3. Fallback: data/app/admin-config.json
    try {
      const adminConfigPath = path.resolve('data', 'app', 'admin-config.json');
      if (fs.existsSync(adminConfigPath)) {
        const adminConfig = JSON.parse(fs.readFileSync(adminConfigPath, 'utf8'));
        const adminBots = Object.values(adminConfig.whatsappBots || {});
        for (const bot of adminBots) {
          if (['primary', 'master'].includes(bot.role) && bot.phoneNumber) {
            masters.add(normalizeDigits(bot.phoneNumber));
          }
        }
      }
    } catch (_) {
      // Best effort fallback
    }

    if (masters.size > 0) {
      this.cachedMasters = masters;
      this.lastCacheTime = now;
    }

    return this.cachedMasters;
  }

  /**
   * Determine whether a destination phone number or JID belongs to an authorized master account.
   *
   * @param {string|object} target - Phone number, JID, or contact object
   * @returns {boolean}
   */
  isMasterRecipient(target) {
    if (!this.enabled) return true;
    if (!target) return false;

    let rawString = '';
    if (typeof target === 'string') {
      rawString = target;
    } else if (target && typeof target === 'object') {
      rawString = target._serialized || target.user || target.id?._serialized || '';
    }

    if (!rawString) return false;

    // Disallow arbitrary group messages in dev phase
    if (rawString.includes('@g.us')) {
      return false;
    }

    // Resolve WhatsApp Privacy LID if mapped
    if (rawString.includes('@lid')) {
      const lidDigits = normalizeDigits(rawString.split('@')[0]);
      const mappedPhone = lidPhoneStore.get(lidDigits);
      if (mappedPhone) {
        rawString = mappedPhone;
      }
    }

    // Strip JID domain (@c.us, @s.whatsapp.net) and multi-device suffix (:12)
    let userPart = rawString;
    if (userPart.includes('@')) {
      [userPart] = userPart.split('@');
    }
    if (userPart.includes(':')) {
      [userPart] = userPart.split(':');
    }

    const digits = normalizeDigits(userPart);
    if (!digits) return false;

    const masterDigits = this.getMasterNumbers();
    return masterDigits.has(digits);
  }

  /**
   * Wrap a WhatsApp client's sendMessage method to enforce the closed circle rule.
   *
   * @param {object} client - whatsapp-web.js Client instance
   * @param {string} clientPhone - Host phone number of the client
   * @returns {object} The protected client instance
   */
  protectClient(client, clientPhone = '') {
    if (!client || typeof client.sendMessage !== 'function' || client[PROTECTED_CLIENT_FLAG]) {
      return client;
    }

    const originalSendMessage = client.sendMessage.bind(client);
    const guard = this;

    client.sendMessage = async function (chatId, content, options) {
      if (!guard.isMasterRecipient(chatId)) {
        logger.warn(
          `🛑 [ClosedCircleGuard] Blocked outbound message to non-master: ${maskPhone(chatId)} ` +
          `(from ${maskPhone(clientPhone || client.info?.wid?.user || 'bot')}) — Closed circle dev phase active`
        );
        const err = new Error(
          `ClosedCircleGuard: Blocked outbound message to non-master ${maskPhone(chatId)} (dev phase active)`
        );
        err.code = 'BLOCKED_BY_CLOSED_CIRCLE_GUARD';
        err.blocked = true;
        throw err;
      }

      return await originalSendMessage(chatId, content, options);
    };

    client[PROTECTED_CLIENT_FLAG] = true;
    return client;
  }

  /**
   * Wrap an incoming WhatsApp message object's reply method to enforce the closed circle rule.
   *
   * @param {object} msg - Incoming WhatsApp message object
   * @returns {object} The protected message object
   */
  protectMessage(msg) {
    if (!msg || typeof msg.reply !== 'function' || msg[PROTECTED_MSG_FLAG]) {
      return msg;
    }

    const originalReply = msg.reply.bind(msg);
    const guard = this;

    msg.reply = async function (content, chatId, options) {
      const target = chatId || msg.from;
      if (!guard.isMasterRecipient(target)) {
        logger.warn(
          `🛑 [ClosedCircleGuard] Blocked msg.reply to non-master: ${maskPhone(target)} ` +
          `— Closed circle dev phase active`
        );
        const err = new Error(
          `ClosedCircleGuard: Blocked outbound message to non-master ${maskPhone(chatId)} (dev phase active)`
        );
        err.code = 'BLOCKED_BY_CLOSED_CIRCLE_GUARD';
        err.blocked = true;
        throw err;
      }

      return await originalReply(content, chatId, options);
    };

    msg[PROTECTED_MSG_FLAG] = true;
    return msg;
  }
}

export const closedCircleGuard = new ClosedCircleGuard();
services.register('closedCircleGuard', closedCircleGuard);

export default closedCircleGuard;
