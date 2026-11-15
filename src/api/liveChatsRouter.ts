// @ts-nocheck
import { Router, type Request, type Response } from 'express';
import services from '../core/ServiceRegistry.js';

const router = Router();

/**
 * GET /chats
 * Returns live conversations from the active Baileys Primary Master (+971505760056) session.
 */
router.get('/chats', async (req: Request, res: Response) => {
  const account = typeof req.query.account === 'string' ? req.query.account : 'ALL';
  const sock = services.get?.('primaryMasterSocket') || services.get?.('whatsappClient') || null;
  const store = services.get?.('baileysStore') || null;

  const rawChats = store?.chats?.all ? store.chats.all() : [];
  const chats = rawChats
    .map((c: any) => ({
      jid: c.id,
      phone: String(c.id || '').split('@')[0],
      pushName: c.name || c.notify || String(c.id || '').split('@')[0],
      avatarUrl: null,
      unreadCount: c.unreadCount || 0,
      lastMessage: c.lastMessage || '',
      lastMessageTimestamp: c.conversationTimestamp
        ? new Date(Number(c.conversationTimestamp) * 1000).toISOString()
        : new Date().toISOString(),
      isGroup: String(c.id || '').endsWith('@g.us'),
      account: '+971505760056',
    }))
    .filter((c: any) => account === 'ALL' || c.account === account);

  res.json({
    success: true,
    account: account === 'ALL' ? 'Primary Master (+971505760056)' : account,
    connected: Boolean(sock?.user),
    data: { chats },
  });
});

/**
 * GET /chats/:jid/messages
 * Returns live message history for a JID from the active Baileys store.
 */
router.get('/chats/:jid/messages', async (req: Request, res: Response) => {
  const jid = decodeURIComponent(req.params.jid);
  const store = services.get?.('baileysStore') || null;
  const rawMessages = store?.messages?.[jid]?.array || [];

  const messages = rawMessages.map((m: any) => ({
    id: m.key?.id || `wa-${Date.now()}`,
    fromMe: Boolean(m.key?.fromMe),
    body:
      m.message?.conversation ||
      m.message?.extendedTextMessage?.text ||
      m.message?.imageMessage?.caption ||
      '',
    timestamp: m.messageTimestamp
      ? new Date(Number(m.messageTimestamp) * 1000).toISOString()
      : new Date().toISOString(),
    status: 'DELIVERED',
    mediaType: m.message?.imageMessage ? 'image' : null,
  }));

  res.json({ success: true, data: { jid, messages } });
});

/**
 * POST /chats/:jid/send
 * Sends an outbound message through the active Baileys Primary Master socket.
 */
router.post('/chats/:jid/send', async (req: Request, res: Response) => {
  const jid = decodeURIComponent(req.params.jid);
  const { text } = req.body as { text?: string };
  if (!text || !text.trim()) {
    res.status(400).json({ success: false, message: 'Message text is required' });
    return;
  }

  const sock = services.get?.('primaryMasterSocket') || services.get?.('whatsappClient') || null;
  if (sock?.sendMessage) {
    await sock.sendMessage(jid, { text: text.trim() });
  }

  res.status(201).json({
    success: true,
    data: {
      jid,
      message: {
        id: `wa-${Date.now()}`,
        fromMe: true,
        body: text.trim(),
        timestamp: new Date().toISOString(),
        status: 'SENT',
      },
    },
  });
});

export default router;
