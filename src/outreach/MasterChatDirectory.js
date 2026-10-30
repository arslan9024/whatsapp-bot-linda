/**
 * Which phone numbers already have a 1:1 WhatsApp chat on an account.
 *
 * Uses one `client.getChats()` per refresh. Never use `client.getChatById`
 * for this: whatsapp-web.js creates the chat if it does not exist.
 * Chats with no timestamp and no last message (empty shells) do not count.
 * `@lid` chats are resolved to phone numbers with `getContactLidAndPhone`.
 */

import { phoneKey } from './OwnerPhoneNormalizer.js';
import { getNewConversationBudget } from './NewConversationBudget.js';

const LID_BATCH = 50;
// System entries that appear in a brand-new chat; they are not an earlier conversation.
const SYSTEM_MESSAGE = /notification|^e2e|^protocol$|^gp2$|^ciphertext$/i;

export class MasterChatDirectory {
  constructor(client, { ttlMs = 10 * 60 * 1000, now = () => Date.now() } = {}) {
    this.client = client;
    this.ttlMs = ttlMs;
    this.now = now;
    this.phones = new Set();
    this.unresolvedLids = new Set();
    this.loadedAt = 0;
    this.loading = null;
    this.stats = { chats: 0, direct: 0, lids: 0, lidsResolved: 0 };
  }

  async refresh() {
    if (!this.client?.getChats) throw new Error('WhatsApp client is not available for the chat check');
    this.loading ||= (async () => {
      try {
        const chats = await this.client.getChats();
        const phones = new Set();
        const lids = [];
        let direct = 0;
        for (const chat of chats || []) {
          const id = chat?.id;
          if (!id || chat.isGroup || !['c.us', 'lid'].includes(id.server)) continue;
          if (!chat.timestamp && !chat.lastMessage) continue;
          direct += 1;
          if (id.server === 'c.us') phones.add(phoneKey(id.user));
          else lids.push(id._serialized || `${id.user}@lid`);
        }
        const unresolved = new Set(lids);
        let resolved = 0;
        if (lids.length && this.client.getContactLidAndPhone) {
          for (let index = 0; index < lids.length; index += LID_BATCH) {
            const batch = lids.slice(index, index + LID_BATCH);
            try {
              for (const item of await this.client.getContactLidAndPhone(batch) || []) {
                if (!item?.pn) continue;
                phones.add(phoneKey(item.pn));
                if (unresolved.delete(item.lid)) resolved += 1;
              }
            } catch {
              // Unresolved lids stay in the set and are matched per number in has().
            }
          }
        }
        this.phones = phones;
        this.unresolvedLids = unresolved;
        this.stats = { chats: chats?.length || 0, direct, lids: lids.length, lidsResolved: resolved };
        this.loadedAt = this.now();
      } finally {
        this.loading = null;
      }
    })();
    await this.loading;
    return this;
  }

  async ensureFresh() {
    if (!this.loadedAt || this.now() - this.loadedAt > this.ttlMs) await this.refresh();
  }

  async has(phone) {
    await this.ensureFresh();
    const key = phoneKey(phone);
    if (this.phones.has(key)) return true;
    if (!this.unresolvedLids.size || !this.client.getContactLidAndPhone) return false;
    try {
      const [item] = await this.client.getContactLidAndPhone([`${key}@c.us`]) || [];
      return Boolean(item?.lid && this.unresolvedLids.has(item.lid));
    } catch {
      return false;
    }
  }

  markChat(phone) {
    this.phones.add(phoneKey(phone));
  }
}

/**
 * Applies the new-conversation budget before a send. Existing chats are always
 * allowed; recipients without a chat consume one budget slot (or are deferred).
 */
export class NewConversationGuard {
  constructor({ budget, enforce = budget?.config?.enforce ?? true, ttlMs } = {}) {
    this.budget = budget;
    this.enforce = enforce;
    this.ttlMs = ttlMs;
    this.directories = new WeakMap();
    this.watched = new WeakSet();
  }

  directoryFor(client) {
    if (!client || typeof client !== 'object') return null;
    let directory = this.directories.get(client);
    if (!directory) {
      directory = new MasterChatDirectory(client, this.ttlMs ? { ttlMs: this.ttlMs } : {});
      this.directories.set(client, directory);
    }
    return directory;
  }

  async hasChat(client, phone) {
    const directory = this.directoryFor(client);
    if (!directory) return false;
    try {
      return await directory.has(phone);
    } catch {
      // Unknown chat state is treated as a new conversation (conservative).
      return false;
    }
  }

  /** @returns {{allowed: boolean, isNew: boolean, counted?: boolean, reason?: string, retryAt?: Date}} */
  async reserve({ account, client, phone, source }) {
    if (!this.enforce || !this.budget) return { allowed: true, isNew: false };
    if (this.budget.has(account, phone)) return { allowed: true, isNew: false };
    if (await this.hasChat(client, phone)) return { allowed: true, isNew: false };
    const result = this.budget.reserve({ account, phone, source });
    if (result.allowed) this.directoryFor(client)?.markChat(phone);
    return { ...result, isNew: true };
  }

  /**
   * Counts conversations started on the phone (or WhatsApp Web) of `account`:
   * an outgoing 1:1 message into a chat with no earlier message is recorded in
   * the ledger as source "phone". Chats the contact started are not counted.
   */
  watch(client, account, { onRecorded = null } = {}) {
    if (!client?.on || !account || this.watched.has(client)) return false;
    this.watched.add(client);
    client.on('message_create', message => {
      this.notePhoneStarted(client, account, message)
        .then(result => result?.counted && onRecorded?.(result))
        .catch(() => {});
    });
    return true;
  }

  async notePhoneStarted(client, account, message) {
    if (!this.budget || !message?.fromMe || message.isStatus) return null;
    const to = message.to || message.id?.remote?._serialized || message.id?.remote;
    if (typeof to !== 'string' || !/@(c\.us|lid)$/.test(to)) return null;
    let phone = to.endsWith('@c.us') ? to.split('@')[0] : null;
    if (!phone && client.getContactLidAndPhone) {
      try {
        phone = (await client.getContactLidAndPhone([to]))?.[0]?.pn || null;
      } catch {
        phone = null;
      }
    }
    const key = phoneKey(phone);
    if (!key || key === phoneKey(account) || this.budget.has(account, key)) return null;
    const directory = this.directoryFor(client);
    const sentAt = (Number(message.timestamp) || 0) * 1000;
    // A chat list loaded before this message already proves an earlier conversation.
    if (directory.loadedAt && directory.loadedAt < sentAt && directory.phones.has(key)) return null;
    let earlier;
    try {
      const chat = await message.getChat();
      const messages = await chat.fetchMessages({ limit: 10 });
      const ownId = message.id?._serialized;
      earlier = messages.some(item =>
        item?.id?._serialized !== ownId &&
        !SYSTEM_MESSAGE.test(String(item?.type || '')) &&
        (Number(item?.timestamp) || 0) <= (Number(message.timestamp) || Infinity));
    } catch {
      return null; // History unknown: do not guess.
    }
    directory.markChat(key);
    if (earlier) return null;
    const result = this.budget.recordExternal({ account, phone: key, source: 'phone' });
    return { ...result, account: phoneKey(account), phone: key };
  }
}

let sharedGuard = null;
/** One guard per process so the campaign, API and terminal paths share the chat cache and ledger. */
export function getNewConversationGuard() {
  sharedGuard ||= new NewConversationGuard({ budget: getNewConversationBudget() });
  return sharedGuard;
}
