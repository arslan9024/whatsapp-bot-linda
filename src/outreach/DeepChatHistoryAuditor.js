/**
 * ====================================================================
 * DEEP CHAT HISTORY AUDITOR (Cross-Account Multi-Layer History Audit)
 * ====================================================================
 * Inspects all connected WhatsApp accounts to detect prior conversations,
 * even from months or years ago.
 *
 * Solves WhatsApp Web's lazy-loading limitation:
 *   1. Queries window.Store.Chat.find(jid) directly in Puppeteer IndexedDB.
 *   2. Automatically triggers loadEarlierMsgs() if messages are not cached.
 *   3. Resolves WhatsApp Privacy IDs (@lid) and audits both c.us and lid.
 *   4. Ignores empty shells, draft placeholders, and e2e protocol notifications.
 *   5. Cross-checks persistent database and interaction records.
 *
 * @since Development Phase — October 2026
 */

import { Logger } from '../core/Logger.js';
import { phoneKey, maskPhone } from './OwnerPhoneNormalizer.js';
import services from '../core/ServiceRegistry.js';

const logger = new Logger('DeepChatHistoryAuditor');

/**
 * Audit a single WhatsApp client instance for prior conversations with a phone/JID.
 *
 * @param {object} client - whatsapp-web.js Client instance
 * @param {string} digits - Normalized recipient digits
 * @returns {Promise<object|null>} Found history details or null
 */
export async function auditClientChat(client, digits) {
  if (!client || !digits) return null;

  const cUsJid = `${digits}@c.us`;
  let lidJid = null;

  // 1. Resolve WhatsApp Privacy LID if available
  if (typeof client.getContactLidAndPhone === 'function') {
    try {
      const [item] = await client.getContactLidAndPhone([cUsJid]) || [];
      if (item?.lid) {
        lidJid = item.lid.includes('@') ? item.lid : `${item.lid}@lid`;
      }
    } catch (_) {
      /* best effort */
    }
  }

  // 2. Deep query in WhatsApp Web Store via Puppeteer
  if (client.pupPage && typeof client.pupPage.evaluate === 'function') {
    try {
      const targetJids = [cUsJid, lidJid].filter(Boolean);

      const storeResult = await client.pupPage.evaluate(async (jids) => {
        if (!window.Store || !window.Store.Chat) return null;

        for (const jid of jids) {
          let chat = window.Store.Chat.get(jid);
          if (!chat && window.Store.Chat.find) {
            try {
              chat = await window.Store.Chat.find(jid);
            } catch (_) {}
          }

          if (!chat || chat.isGroup) continue;

          // Force loading earlier messages from IndexedDB if in-memory list is empty
          if ((!chat.msgs || chat.msgs.models.length === 0) && typeof chat.loadEarlierMsgs === 'function') {
            try {
              await chat.loadEarlierMsgs();
            } catch (_) {}
          }

          const msgs = chat.msgs?.models || [];
          const realMsgs = msgs.filter((m) => {
            if (!m) return false;
            const type = String(m.type || '');
            return !/notification|^e2e|^protocol$|^gp2$|^ciphertext$/i.test(type);
          });

          const lastMsg = chat.lastMessage;
          const isRealLastMsg =
            lastMsg && !/notification|^e2e|^protocol$|^gp2$|^ciphertext$/i.test(String(lastMsg.type || ''));

          if (realMsgs.length > 0 || isRealLastMsg) {
            const target = realMsgs[realMsgs.length - 1] || lastMsg;
            return {
              found: true,
              jid,
              messageCount: realMsgs.length || 1,
              lastTimestamp: (target?.t ? target.t * 1000 : chat.timestamp) || Date.now(),
              lastBodySnippet: String(target?.body || target?.caption || '').slice(0, 120),
              isFromMe: Boolean(target?.id?.fromMe),
            };
          }

          // If chat has an activity timestamp and non-zero message markers
          if (chat.timestamp && chat.timestamp > 0 && chat.unreadCount !== undefined) {
            return {
              found: true,
              jid,
              messageCount: 1,
              lastTimestamp: chat.timestamp * 1000,
              lastBodySnippet: '',
              isFromMe: false,
            };
          }
        }

        return null;
      }, targetJids);

      if (storeResult && storeResult.found) {
        return storeResult;
      }
    } catch (err) {
      logger.debug(`Puppeteer evaluate deep chat check skipped: ${err.message}`);
    }
  }

  // 3. Fallback: High-level whatsapp-web.js getChats() in-memory check
  if (typeof client.getChats === 'function') {
    try {
      const chats = await client.getChats();
      for (const chat of chats || []) {
        if (!chat?.id || chat.isGroup) continue;
        const chatDigits = phoneKey(chat.id.user);
        if (chatDigits === digits && (chat.timestamp || chat.lastMessage)) {
          return {
            found: true,
            jid: chat.id._serialized || cUsJid,
            messageCount: 1,
            lastTimestamp: chat.timestamp ? chat.timestamp * 1000 : Date.now(),
            lastBodySnippet: String(chat.lastMessage?.body || '').slice(0, 120),
            isFromMe: Boolean(chat.lastMessage?.fromMe),
          };
        }
      }
    } catch (_) {
      /* best effort */
    }
  }

  return null;
}

/**
 * Deep audit across ALL registered WhatsApp bot accounts.
 *
 * @param {string} targetPhone - Candidate phone number
 * @param {object} options
 * @param {Map<string, object>} [options.accountClients] - Map of account phone -> Client
 * @param {object} [options.accountConfigManager] - AccountConfigManager
 * @returns {Promise<{ hasPriorChat: boolean, accountPhone: string|null, accountName: string|null, details: object|null }>}
 */
export async function auditCrossAccountHistory(targetPhone, options = {}) {
  const digits = phoneKey(targetPhone);
  if (!digits) {
    return { hasPriorChat: false, accountPhone: null, accountName: null, details: null };
  }

  const clients = options.accountClients || services.get('accountClients') || new Map();
  const acm = options.accountConfigManager || services.get('accountConfigManager');

  logger.info(`🔍 Deep history audit for ${maskPhone(digits)} across ${clients.size || 0} active account(s)...`);

  for (const [accountPhone, client] of clients.entries()) {
    if (!client) continue;

    const normalizedAccPhone = phoneKey(accountPhone);
    const accountConfig = acm?.getAccountByPhone?.(accountPhone) ||
      acm?.getAllAccounts?.().find((a) => phoneKey(a.phoneNumber) === normalizedAccPhone);

    const accountName = accountConfig?.displayName || accountConfig?.name || `Agent ${maskPhone(accountPhone)}`;

    try {
      const found = await auditClientChat(client, digits);
      if (found) {
        logger.info(
          `✅ Found prior conversation with ${maskPhone(digits)} on account: ${accountName} (${maskPhone(accountPhone)})`
        );
        return {
          hasPriorChat: true,
          accountPhone,
          accountName,
          details: found,
        };
      }
    } catch (err) {
      logger.warn(`Error auditing history on account ${maskPhone(accountPhone)}: ${err.message}`);
    }
  }

  // 4. Fallback: Database/ledger check (if service registered)
  const contactConsentService = services.get('contactConsentService');
  if (contactConsentService?.hasInteracted?.(digits)) {
    return {
      hasPriorChat: true,
      accountPhone: acm?.getMasterPhoneNumber?.() || null,
      accountName: 'Database Ledger History',
      details: { source: 'database_ledger' },
    };
  }

  logger.info(`🌱 Verified 100% fresh contact: ${maskPhone(digits)} (No prior history found on any line)`);
  return { hasPriorChat: false, accountPhone: null, accountName: null, details: null };
}

export default auditCrossAccountHistory;
