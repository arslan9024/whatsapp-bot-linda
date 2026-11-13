/**
 * GeminiChatService.js
 *
 * Real AI chat powered by Google Gemini API (gemini-2.0-flash).
 * Falls back gracefully when GOOGLE_API_KEY is missing.
 * Uses rolling conversation history per sender (last 10 exchanges).
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

const LINDA_SYSTEM_PROMPT = `You are Linda, a smart and professional AI assistant for White Caves Real Estate LLC in Dubai.

You help real estate agents, brokers, and admins manage:
- WhatsApp outreach campaigns (Vardon cluster, property owners)
- Device and account health monitoring
- Campaign stats, contacts, and scheduling
- Real estate market intelligence (Dubai/Abu Dhabi)
- Ejari/DLD compliance questions

Personality: Friendly, concise, professional. Always respond in the same language the user writes in (Arabic or English). Keep replies under 300 words unless a detailed report is requested. Use emojis sparingly but appropriately.

Current date/time is in Asia/Dubai timezone (GST, UTC+4).`;

/** Rolling conversation memory per sender phone number */
class ConversationMemory {
  constructor(maxTurns = 10, ttlMs = 2 * 60 * 60 * 1000) {
    this._store = new Map(); // phone -> { history: [], lastAt: number }
    this._maxTurns = maxTurns;
    this._ttlMs = ttlMs;
  }

  get(phone) {
    const entry = this._store.get(phone);
    if (!entry) return [];
    if (Date.now() - entry.lastAt > this._ttlMs) {
      this._store.delete(phone);
      return [];
    }
    return entry.history;
  }

  push(phone, role, text) {
    let entry = this._store.get(phone);
    if (!entry || Date.now() - entry.lastAt > this._ttlMs) {
      entry = { history: [], lastAt: Date.now() };
    }
    entry.history.push({ role, parts: [{ text }] });
    // Keep rolling window: maxTurns user+model pairs = maxTurns*2 entries
    if (entry.history.length > this._maxTurns * 2) {
      entry.history = entry.history.slice(-this._maxTurns * 2);
    }
    entry.lastAt = Date.now();
    this._store.set(phone, entry);
  }

  clear(phone) {
    this._store.delete(phone);
  }

  stats() {
    return { activeSessions: this._store.size };
  }
}

export class GeminiChatService {
  constructor() {
    this._memory = new ConversationMemory();
    this._genai = null;
    this._ready = false;
    this._init();
  }

  async _init() {
    const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn('[GeminiChatService] No API key found — AI chat in fallback mode.');
      return;
    }
    try {
      const { GoogleGenAI } = await import('@google/genai');
      this._genai = new GoogleGenAI({ apiKey: key });
      this._ready = true;
      console.log('[GeminiChatService] ✅ Gemini AI ready (gemini-2.0-flash)');
    } catch (e) {
      console.warn('[GeminiChatService] SDK unavailable — using fallback mode:', e.message);
    }
  }

  get isReady() { return this._ready; }

  /**
   * Chat with Linda (real Gemini AI or polite fallback).
   * @param {string} phone - Sender phone/JID (memory key)
   * @param {string} userText - The user's message
   * @returns {Promise<string>}
   */
  async chat(phone, userText) {
    if (!this._ready || !this._genai) {
      return this._fallback(userText);
    }

    const history = this._memory.get(phone);

    try {
      const chat = this._genai.chats.create({
        model: 'gemini-2.0-flash',
        config: { systemInstruction: LINDA_SYSTEM_PROMPT },
        history,
      });

      const response = await chat.sendMessage({ message: userText });
      const reply = response.text || '🤔 No response generated. Please try again.';

      this._memory.push(phone, 'user', userText);
      this._memory.push(phone, 'model', reply);

      return reply;
    } catch (err) {
      console.error('[GeminiChatService] API error:', err.message);
      return `🤖 Linda: My AI core is temporarily unavailable. Try "linda status" for system info, or ask again shortly.`;
    }
  }

  /**
   * Clear conversation memory for a sender.
   * @param {string} phone
   */
  clearMemory(phone) {
    this._memory.clear(phone);
    return '🧹 Conversation memory cleared. Starting fresh!';
  }

  memoryStats() { return this._memory.stats(); }

  _fallback(text) {
    const lc = (text || '').toLowerCase();
    if (lc.includes('status') || lc.includes('health')) return '📊 Use "linda status" for the full health dashboard.';
    if (lc.includes('campaign') || lc.includes('outreach')) return '📋 Use "linda campaign" for outreach stats.';
    if (lc.includes('report')) return '📈 Use "linda report" for the daily summary.';
    if (lc.includes('help')) return '💡 Commands: linda help | linda status | linda campaign | linda report | linda who +971...';
    return `🤖 Linda is here! Send "linda help" to see all commands, or "linda ask <question>" to query me directly.`;
  }
}

export default new GeminiChatService();

