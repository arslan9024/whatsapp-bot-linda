/**
 * ====================================================================
 * INBOUND LINKING HELPERS
 * ====================================================================
 * Single-purpose helper utilities for WhatsApp message parsing,
 * phone number normalization, LID resolution, and device linking intent detection.
 *
 * Operating Lane: Architecture & Reliability / WhatsApp Client & Protocols
 *
 * @since Phase 32 — February 2026
 */

import services from '../core/ServiceRegistry.js';

/**
 * Global cache mapping WhatsApp LIDs (Linked Device IDs) to verified E.164 phone numbers.
 * @type {Map<string, string>}
 */
export const lidPhoneStore = new Map();

// Register in ServiceRegistry for cross-service sharing (e.g. WhatsAppCommandBridge)
services.register('lidPhoneStore', lidPhoneStore);

/**
 * Normalize a phone number to digits only for fail-safe comparisons.
 *
 * @param {string|number} value
 * @returns {string}
 */
export function normalizeDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

/**
 * Determine if a JID or string is a WhatsApp LID (Privacy / Linked Identity).
 * LIDs either contain '@lid' or have 14+ digits without standard country structure.
 *
 * @param {string} jid
 * @returns {boolean}
 */
export function isLidJid(jid) {
  if (!jid || typeof jid !== 'string') {
    return false;
  }
  if (jid.includes('@lid')) {
    return true;
  }
  const digits = normalizeDigits(jid);
  return digits.length >= 14;
}

/**
 * Extract clean E.164 phone number from a WhatsApp JID.
 * E.g. "971589969886@c.us" -> "+971589969886"
 * E.g. "971589969886:14@c.us" -> "+971589969886"
 *
 * @param {string} fromJid
 * @returns {string}
 */
export function extractSenderPhone(fromJid) {
  if (!fromJid || typeof fromJid !== 'string') {
    return '';
  }
  const [userPart] = fromJid.split('@');
  const [cleanPhone] = userPart.split(':');
  const digits = cleanPhone.replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}

/**
 * Extract potential phone numbers from a text string.
 * Supports UAE numbers (05xxxxxxxx, +9715xxxxxxxx, 9715xxxxxxxx)
 * and international E.164 formats (+XXXXXXXXXXX).
 *
 * @param {string} text
 * @returns {string[]} Array of normalized E.164 phone numbers (e.g. ['+971589969886'])
 */
export function extractPhonesFromText(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  const regex = /(?:\+?971[\s-]?5[0-9][\s-]?[0-9]{3}[\s-]?[0-9]{4}|05[0-9][\s-]?[0-9]{3}[\s-]?[0-9]{4}|\+?[1-9]\d{9,14})/g;
  const matches = text.match(regex) || [];
  const results = [];
  for (const m of matches) {
    let digits = m.replace(/\D/g, '');
    if (digits.startsWith('05') && digits.length === 10) {
      digits = `971${digits.substring(1)}`;
    }
    if (digits.length >= 9 && digits.length <= 13) {
      const e164 = `+${digits}`;
      if (!results.includes(e164)) {
        results.push(e164);
      }
    }
  }
  return results;
}

/**
 * Check whether a message text represents a device linking/addition request.
 *
 * @param {string} text
 * @returns {boolean}
 */
export function isDeviceLinkingRequest(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }
  const cleaned = text.trim().toLowerCase();

  // Direct bot command forms
  const directCommands = [
    '!link-code', '!link', '!pair', '!add-device', '!link-device',
    'link-code', 'link code', 'pairing code', 'pair code',
    'add device', 'link device', 'pair device', 'add my device',
    'link my device', 'pair my device', 'connect my device',
    'please add my device', 'can you add my device',
  ];
  if (directCommands.includes(cleaned)) {
    return true;
  }

  // Exact command prefixes
  if (/^linda\b.*?\b(?:add|link|pair|code)\b/i.test(cleaned)) {
    return true;
  }

  // Conversational phrases matching:
  // (add | link | pair | connect | register | share) AND (device | phone | number | account | mobile | code | me)
  const actionMatch = /\b(add|link|pair|connect|register|share|give|send)\b/i.test(cleaned);
  const targetMatch = /\b(device|phone|number|account|mobile|code|me)\b/i.test(cleaned);

  if (actionMatch && (targetMatch || cleaned.includes('linda'))) {
    return true;
  }

  return false;
}

/**
 * Resolve the genuine E.164 phone number of an incoming message sender,
 * seamlessly handling WhatsApp LIDs (Linked Device Identity / Privacy addressing).
 *
 * @param {object} msg - Incoming WhatsApp message
 * @param {object|null} primaryClient - Primary WhatsApp Client instance
 * @param {object|null} accountConfigManager - Config manager to check authorized numbers
 * @param {Map<string, string>} [customStore] - Optional LID cache
 * @returns {Promise<{ phone: string|null, isLid: boolean, lidDigits: string }>}
 */
export async function resolveSenderPhone(msg, primaryClient = null, accountConfigManager = null, customStore = null) {
  const store = customStore || lidPhoneStore;
  const rawJid = msg?.author || msg?.from || '';
  const isLid = isLidJid(rawJid);
  const rawDigits = normalizeDigits(rawJid);

  // If already standard @c.us without LID
  if (!isLid && rawJid && !rawJid.includes('@lid')) {
    const directPhone = extractSenderPhone(rawJid);
    if (directPhone && normalizeDigits(directPhone).length <= 13) {
      return { phone: directPhone, isLid: false, lidDigits: '' };
    }
  }

  // 1. Check cache for mapped LID
  if (rawDigits && store.has(rawDigits)) {
    return { phone: store.get(rawDigits), isLid: true, lidDigits: rawDigits };
  }

  // 2. Try client.getContactLidAndPhone (WhatsApp Web internal resolution)
  if (primaryClient && typeof primaryClient.getContactLidAndPhone === 'function' && rawJid) {
    try {
      const results = await primaryClient.getContactLidAndPhone([rawJid]);
      const pn = results?.[0]?.pn;
      if (pn && !pn.includes('@lid')) {
        const phone = extractSenderPhone(pn);
        if (phone && normalizeDigits(phone).length <= 13) {
          store.set(rawDigits, phone);
          return { phone, isLid: true, lidDigits: rawDigits };
        }
      }
    } catch (_) {
      // Proceed to next fallback
    }
  }

  // 3. Try msg.getContact()
  if (typeof msg?.getContact === 'function') {
    try {
      const contact = await msg.getContact();
      if (contact) {
        if (contact.number && !String(contact.number).includes('@lid')) {
          const digits = normalizeDigits(contact.number);
          if (digits && digits.length >= 8 && digits.length <= 13) {
            const phone = `+${digits}`;
            store.set(rawDigits, phone);
            return { phone, isLid: true, lidDigits: rawDigits };
          }
        }
        if (contact.id?._serialized && !contact.id._serialized.includes('@lid')) {
          const phone = extractSenderPhone(contact.id._serialized);
          if (phone && normalizeDigits(phone).length <= 13) {
            store.set(rawDigits, phone);
            return { phone, isLid: true, lidDigits: rawDigits };
          }
        }
      }
    } catch (_) {
      // Proceed to next fallback
    }
  }

  // 4. Try msg._data fields
  const data = msg?._data;
  if (data) {
    const candidates = [data.senderPn, data.authorPn, data.id?.participant, data.author];
    for (const cand of candidates) {
      if (typeof cand === 'string' && cand && !cand.includes('@lid')) {
        const phone = extractSenderPhone(cand);
        if (phone && normalizeDigits(phone).length <= 13) {
          store.set(rawDigits, phone);
          return { phone, isLid: true, lidDigits: rawDigits };
        }
      }
    }
  }

  // 5. Check if the message body explicitly mentions a phone number in bots-config.json
  const bodyText = typeof msg?.body === 'string' ? msg.body : '';
  const bodyPhones = extractPhonesFromText(bodyText);
  if (bodyPhones.length > 0 && accountConfigManager) {
    const allAccounts = accountConfigManager.getAllAccounts?.() || [];
    for (const bPhone of bodyPhones) {
      const bDigits = normalizeDigits(bPhone);
      const isConfigured = allAccounts.some(acc => normalizeDigits(acc.phoneNumber) === bDigits);
      if (isConfigured) {
        store.set(rawDigits, bPhone);
        return { phone: bPhone, isLid: true, lidDigits: rawDigits };
      }
    }
  }

  // Unresolved LID
  return { phone: null, isLid: true, lidDigits: rawDigits };
}
