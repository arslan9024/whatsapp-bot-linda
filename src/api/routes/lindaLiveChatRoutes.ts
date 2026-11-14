// @ts-nocheck
/**
 * Linda Live Chat & Campaign Bridge Routes
 * Bridges connected WhatsApp clients (Primary Master +971505760056 & pool accounts)
 * to White-Caves-Server and White-Caves-Frontend.
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import dispatchPool from '../../outreach/WhatsAppDispatchPool.js';
import { DamacHills2CampaignManager } from '../../outreach/DamacHills2CampaignManager.js';

function loadDispatchedOwnersMap(): Map<string, any> {
  const map = new Map<string, any>();
  try {
    const filePath = path.resolve('data', 'outreach', 'dispatched-owners.json');
    if (!fs.existsSync(filePath)) return map;
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const entries = Array.isArray(raw) ? raw : Object.values(raw || {});
    for (const entry of entries) {
      const digits = String(entry?.phone || entry?.ownerPhone || '').replace(/\D/g, '');
      if (digits) map.set(digits, entry);
    }
  } catch {
    // Non-fatal if registry file is absent or malformed
  }
  return map;
}

const router = express.Router();

// In-memory registry of active WhatsApp clients keyed by phone number
const activeClients = new Map<string, any>();

export function registerLiveWhatsAppClient(phone: string, client: any): void {
  const normalized = String(phone || '').replace(/\D/g, '');
  if (normalized && client) {
    activeClients.set(normalized, client);
  }
}

export function getRegisteredWhatsAppClients(): Map<string, any> {
  return activeClients;
}

function mapAckToStatus(ack?: number): 'sent' | 'delivered' | 'read' {
  if (ack === 3) return 'read';
  if (ack === 2) return 'delivered';
  return 'sent';
}

function formatChatId(phoneOrId: string): string {
  if (phoneOrId.includes('@')) return phoneOrId;
  const digits = phoneOrId.replace(/\D/g, '');
  return `${digits}@c.us`;
}

/**
 * GET /api/linda/conversations
 * Fetches live chats from connected WhatsApp clients via client.getChats()
 */
router.get('/conversations', async (req, res) => {
  try {
    const accountFilter = req.query.accountPhone
      ? String(req.query.accountPhone).replace(/\D/g, '')
      : null;
    const typeFilter = req.query.type ? String(req.query.type).toLowerCase() : 'all';
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const ownersMap = loadDispatchedOwnersMap();

    const conversations: any[] = [];
    const accounts: string[] = [];

    for (const [accountPhone, client] of activeClients.entries()) {
      accounts.push(accountPhone);
      if (accountFilter && accountPhone !== accountFilter) continue;
      if (typeof client?.getChats !== 'function') continue;

      const chats = await client.getChats();
      for (const chat of chats) {
        const rawId = chat?.id?._serialized || chat?.id?.user || '';
        const phone = String(rawId).replace(/@.*$/, '').replace(/\D/g, '');
        if (!phone) continue;
        const isGroup = Boolean(chat.isGroup);
        if (typeFilter === 'groups' && !isGroup) continue;
        if (typeFilter === 'direct' && isGroup) continue;

        const ownerMeta = ownersMap.get(phone);
        conversations.push({
          id: `LINDA_${phone}`,
          phone: `+${phone}`,
          contactName: ownerMeta?.ownerName || chat.name || chat.pushname || `+${phone}`,
          lastMessage: chat.lastMessage?.body || '',
          timestamp: chat.timestamp
            ? new Date(chat.timestamp * 1000).toISOString()
            : new Date().toISOString(),
          unreadCount: Number(chat.unreadCount || 0),
          isGroup,
          accountPhone: `+${accountPhone}`,
          cluster: ownerMeta?.cluster || (isGroup ? 'WhatsApp Group' : 'Primary Master'),
          unit: ownerMeta?.unit || '',
          intent: ownerMeta?.intent || (ownerMeta ? 'OWNER_OUTREACH' : 'GENERAL'),
          confidence: Number(ownerMeta?.confidence ?? (ownerMeta ? 92 : 100)),
          gorahaSaved: Boolean(ownerMeta?.gorahaSaved),
          channel: 'LINDA_WHATSAPP',
        });
      }
    }

    conversations.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const total = conversations.length;
    const paged = conversations.slice(offset, offset + limit);

    res.json({
      success: true,
      data: {
        conversations: paged,
        count: paged.length,
        total,
        limit,
        offset,
        accounts: accounts.map((p) => `+${p}`),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch live chats' });
  }
});

/**
 * GET /api/linda/conversations/:phoneNumber/history
 * Fetches live thread message history via chat.fetchMessages({ limit })
 */
router.get('/conversations/:phoneNumber/history', async (req, res) => {
  try {
    const cleanPhone = String(req.params.phoneNumber || '').replace(/\D/g, '');
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    const accountFilter = req.query.accountPhone
      ? String(req.query.accountPhone).replace(/\D/g, '')
      : null;

    const messages: any[] = [];
    for (const [accountPhone, client] of activeClients.entries()) {
      if (accountFilter && accountPhone !== accountFilter) continue;
      if (typeof client?.getChats !== 'function') continue;

      const chats = await client.getChats();
      const targetChat = chats.find((c: any) => {
        const cid = String(c?.id?._serialized || c?.id?.user || '').replace(/\D/g, '');
        return cid === cleanPhone;
      });

      if (targetChat && typeof targetChat.fetchMessages === 'function') {
        const fetched = await targetChat.fetchMessages({ limit });
        for (const msg of fetched) {
          messages.push({
            id: msg.id?._serialized || msg.id?.id || `msg-${Date.now()}-${Math.random()}`,
            sender: msg.fromMe ? 'agent' : 'client',
            text: msg.body || '',
            timestamp: msg.timestamp
              ? new Date(msg.timestamp * 1000).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Just now',
            status: msg.fromMe ? mapAckToStatus(msg.ack) : undefined,
            accountPhone: `+${accountPhone}`,
          });
        }
        break;
      }
    }

    res.json({
      success: true,
      data: { phoneNumber: `+${cleanPhone}`, messages, count: messages.length },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch history' });
  }
});

/**
 * POST /api/linda/send/:conversationId
 * Dispatches a real WhatsApp message via the connected client
 */
router.post('/send/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message, text, accountPhone } = req.body || {};
    const bodyText = String(message || text || '').trim();

    if (!bodyText) {
      return res.status(400).json({ success: false, error: 'Message text is required' });
    }

    const cleanPhone = String(conversationId || '').replace(/^LINDA_/i, '').replace(/\D/g, '');
    const chatId = formatChatId(cleanPhone);

    const preferredAccount = accountPhone ? String(accountPhone).replace(/\D/g, '') : null;
    let client = preferredAccount ? activeClients.get(preferredAccount) : null;
    if (!client) {
      client = activeClients.values().next().value;
    }

    if (!client || typeof client.sendMessage !== 'function') {
      return res.status(503).json({
        success: false,
        error: 'No connected WhatsApp client available to send message',
      });
    }

    const sent = await client.sendMessage(chatId, bodyText);
    res.json({
      success: true,
      data: {
        messageId: sent?.id?._serialized || `wa-${Date.now()}`,
        conversationId,
        status: 'sent',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to send message' });
  }
});

/**
 * POST /api/linda/campaign/dispatch-now
 * Triggers DamacHills2CampaignManager.dispatchNowBatch
 */
router.post('/campaign/dispatch-now', async (req, res) => {
  try {
    const cluster = String(req.body?.cluster || 'ALL');
    const manager = new DamacHills2CampaignManager({ dispatchPool });
    const result = await manager.dispatchNowBatch(cluster, { instant: true });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Dispatch batch failed' });
  }
});

/**
 * GET /api/linda/pool/telemetry
 * Returns live WhatsAppDispatchPool + AccountWarmupScheduler telemetry
 */
router.get('/pool/telemetry', (_req, res) => {
  try {
    const status = typeof dispatchPool.getStatus === 'function' ? dispatchPool.getStatus() : {};
    res.json({ success: true, data: status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to read pool telemetry' });
  }
});

export default router;
