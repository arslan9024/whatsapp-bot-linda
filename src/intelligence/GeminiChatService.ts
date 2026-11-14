// @ts-nocheck
/**
 * GeminiChatService.js
 *
 * Real AI chat powered by Google Gemini API (gemini-2.0-flash / gemini-1.5-flash).
 * Falls back gracefully when GOOGLE_API_KEY is missing.
 * Multilingual Engine: Fluent in Dubai Real Estate (English & Arabic) covering:
 * - DLD (Dubai Land Department) registration & fees (4% transfer fee)
 * - Ejari renewal, tenancy contracts, and RERA rental index guidelines
 * - NOC (No Objection Certificate) for resale transfers
 * - Title Deed (سند الملكية) verification
 * - Damac Hills 2 (Akoya) cluster insights & Vardon villa specifics
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

const LINDA_SYSTEM_PROMPT = `You are Linda, a sovereign autonomous AI Real Estate Agent for White Caves Real Estate LLC in Dubai (licensed by DLD / RERA).

Key Real Estate Expertise & Authority:
- Dubai Land Department (DLD) & RERA compliance (4% transfer fees, Form A/B/F agreements).
- Ejari registration and renewal, standard Unified Tenancy Contracts, RERA rental increase calculator rules.
- Developer NOCs (No Objection Certificates), trustee office conveyance transfers, and Title Deeds (سند الملكية).
- Specialized Community Knowledge: DAMAC Hills 2 (Akoya) master community and specific clusters (Vardon, Aster, Coursetia, Primrose, Pacifica, Claret, etc.), current market rent & sale values.
- Client Segmentation: Expertly converse with Property Owners/Sellers, Tenants, Landlords, Cash Buyers, and Fellow Brokers.

Tone & Multi-lingual Protocol:
- Professional, welcoming, consultative, concise, and trustworthy.
- DUAL FLUENCY: Always respond in the EXACT language used by the user (Arabic or English).
- When speaking in Arabic, use professional Middle-Eastern / Gulf business Arabic with precise Dubai real estate terminology (سند الملكية، إيجاري، دائرة الأراضي والأملاك، عدم الممانعة NOC، مجمع فاردون، داماك هيلز 2).
- Keep conversational replies under 150-250 words to maintain high WhatsApp readability. Use bullet points for structured breakdowns.
- Current timezone: Asia/Dubai (GST, UTC+4).`;

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
      return this._fallback(userText);
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
    const isArabic = /[\u0600-\u06FF]/.test(text || '');

    if (isArabic) {
      if (lc.includes('بيع') || lc.includes('سعر') || lc.includes('تقييم')) {
        return `مرحباً بك! معكم ليندا من شركة وايت كيفز العقارية في دبي 🏢.\nبخصوص بيع أو تقييم عقاركم في داماك هيلز 2 (مجمع فاردون)، يسعدنا تزويدكم بآخر صفقات دائرة الأراضي والأملاك (DLD) ومساعدتكم في إصدار شهادة عدم الممانعة (NOC) ونقل الملكية بأعلى عائد ممكن. هل تفضلون مكالمة هاتفية أم مشاركة التفاصيل هنا؟`;
      }
      if (lc.includes('إيجار') || lc.includes('ايجار') || lc.includes('إيجاري')) {
        return `أهلاً وسهلاً بكم! معكم ليندا من وايت كيفز العقارية 📜.\nنوفر خدمات إدارة العقود وتجديد الإيجاري (Ejari) وفحص العقار وتأجير الفلل للمستأجرين المعتمدين في داماك هيلز 2. كيف يمكننا مساعدتكم اليوم؟`;
      }
      return `مرحباً بكم مع ليندا - المستشار العقاري الذكي لشركة White Caves Real Estate 🌟.\nيسعدني مساعدتكم في كافة خدمات البيع، الشراء، الإيجار، وتوثيق عقود إيجاري في دبي. كيف أستطيع خدمتك اليوم؟`;
    }

    if (lc.includes('sell') || lc.includes('valuation') || lc.includes('price')) {
      return `Hello! I'm Linda from White Caves Real Estate LLC 🏢.\nRegarding selling or evaluating your property in Vardon, Damac Hills 2, we can provide recent DLD sales transactions, manage your developer NOC, and connect with vetted buyers. Would you like a current market valuation?`;
    }
    if (lc.includes('rent') || lc.includes('ejari') || lc.includes('lease')) {
      return `Hello! Linda from White Caves Real Estate here 📜.\nWe handle property leasing, tenant screening, and seamless Ejari registration across Damac Hills 2. How can I assist with your tenancy today?`;
    }
    if (lc.includes('status') || lc.includes('health')) return '📊 Use "linda status" for the full health dashboard.';
    if (lc.includes('campaign') || lc.includes('outreach')) return '📋 Use "linda campaign" for outreach stats.';
    if (lc.includes('report')) return '📈 Use "linda report" for the daily summary.';
    if (lc.includes('help')) return '💡 Commands: linda help | linda status | linda campaign | linda report | linda who +971...';
    
    return `🤖 Hello! I am Linda, your sovereign AI Real Estate Consultant at White Caves Real Estate LLC. How can I assist you with Dubai property sales, leasing, Ejari, or Damac Hills 2 investments today?`;
  }
}

export default new GeminiChatService();
