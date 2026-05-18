/**
 * ====================================================================
 * LEAD QUALIFICATION SERVICE
 * ====================================================================
 * AI-powered WhatsApp chatbot for qualifying real estate leads.
 *
 * Flow:
 *   1. Detect inbound inquiry (keywords: price, property, buy, rent, etc.)
 *   2. Start a structured qualification conversation
 *   3. Collect: budget, type (buy/rent), bedrooms, location, timeline
 *   4. Score the lead (0-100) and assign tier (Hot/Warm/Cold)
 *   5. Auto-escalate Hot leads to an agent (notification)
 *   6. Store qualified lead profile for CRM export
 *
 * Usage:
 *   import leadQualification from './LeadQualificationService.js';
 *   leadQualification.handleMessage(phone, messageBody, client);
 *
 * @since Wave-4 Feature Expansion — May 2026
 * @see docs about real estate WhatsApp automation best practices
 */

import mongoose from 'mongoose';
import { Logger } from '../utils/Logger.js';

const log = new Logger('LeadQualificationService');

// ─── Mongoose schema ─────────────────────────────────────────────────
const leadSchema = new mongoose.Schema(
  {
    phone:       { type: String, required: true, index: true },
    name:        { type: String, default: 'Unknown' },
    intent:      { type: String, enum: ['buy', 'rent', 'invest', 'unknown'], default: 'unknown' },
    budget:      { type: String, default: '' },
    budgetMin:   { type: Number, default: 0 },
    budgetMax:   { type: Number, default: 0 },
    bedrooms:    { type: Number, default: 0 },
    location:    { type: String, default: '' },
    timeline:    { type: String, default: '' },     // e.g. 'immediately', '1-3 months', '6+ months'
    score:       { type: Number, default: 0, min: 0, max: 100 },
    tier:        { type: String, enum: ['hot', 'warm', 'cold', 'unqualified'], default: 'unqualified' },
    stage:       { type: String, default: 'new' },  // qualification stage
    agentAssigned: { type: String, default: null },
    notes:       { type: String, default: '' },
    source:      { type: String, default: 'whatsapp_inbound' },
    escalated:   { type: Boolean, default: false },
  },
  { timestamps: true }
);

const sessionSchema = new mongoose.Schema(
  {
    phone:    { type: String, required: true, unique: true },
    step:     { type: String, default: 'greeting' },  // current question step
    answers:  { type: mongoose.Schema.Types.Mixed, default: {} },
    startedAt:{ type: Date, default: Date.now },
    lastMsgAt:{ type: Date, default: Date.now },
  },
  { timestamps: false }
);

// ─── Qualification trigger keywords ──────────────────────────────────
const INQUIRY_TRIGGERS = [
  /\b(interested|looking|want|need|search|find)\b.*\b(property|apartment|villa|townhouse|unit|flat)\b/i,
  /\b(buy|purchase|rent|invest)\b.*\b(property|home|house|apartment|villa)\b/i,
  /\b(how much|price|cost|aed|dirham)\b.*\b(property|apartment|villa)\b/i,
  /\b(available|availability)\b.*\b(unit|apartment|property)\b/i,
  /\b(property|apartment|villa|townhouse)\b.*\b(available|for sale|for rent)\b/i,
];

// ─── Qualification steps ─────────────────────────────────────────────
const STEPS = {
  greeting:    { next: 'intent',    question: null },
  intent:      { next: 'budget',    question: '🏠 Are you looking to *buy*, *rent*, or *invest* in a property?' },
  budget:      { next: 'bedrooms',  question: '💰 What is your approximate *budget* (in AED)? (e.g. 500K - 1M)' },
  bedrooms:    { next: 'location',  question: '🛏️  How many *bedrooms* are you looking for? (e.g. 1, 2, 3, 4+)' },
  location:    { next: 'timeline',  question: '📍 Which *area / community* are you interested in? (e.g. DAMAC Hills 2, Dubai South)' },
  timeline:    { next: 'complete',  question: '⏳ What is your *timeline* for making a decision? (Immediately / 1-3 months / 6+ months)' },
  complete:    { next: null,        question: null },
};

class LeadQualificationService {
  constructor() {
    /** @type {Map<string, object>} phone → session state (in-memory fallback) */
    this._sessions  = new Map();
    /** @type {Map<string, object>} phone → lead profile */
    this._leads     = new Map();

    this._LeadModel    = null;
    this._SessionModel = null;

    this._stats = { started: 0, completed: 0, hot: 0, warm: 0, cold: 0 };
  }

  async connectDB(conn) {
    try {
      this._LeadModel    = conn.model('Lead', leadSchema);
      this._SessionModel = conn.model('LeadSession', sessionSchema);
      log.info('✅ LeadQualificationService connected to DB');
    } catch (err) {
      log.warn(`⚠️  LeadQualificationService DB connect failed: ${err.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Main entry: called for every incoming direct message
  // ─────────────────────────────────────────────────────────────────

  /**
   * Handle an incoming message — detect inquiries or continue active sessions.
   *
   * @param {string} phone
   * @param {string} body
   * @param {object} client  - whatsapp-web.js Client (for replying)
   * @returns {Promise<boolean>}  true if this message was handled by the qualifier
   */
  async handleMessage(phone, body, client) {
    if (!phone || !body) return false;

    const session = await this._getSession(phone);

    // Active session — continue qualification flow
    if (session && session.step !== 'complete') {
      await this._processAnswer(phone, body, session, client);
      return true;
    }

    // No active session — check if this looks like a property inquiry
    if (this._isInquiry(body)) {
      await this._startQualification(phone, client);
      return true;
    }

    return false;
  }

  // ─────────────────────────────────────────────────────────────────
  // Private: conversation flow
  // ─────────────────────────────────────────────────────────────────

  _isInquiry(body) {
    if (!body) return false;
    return INQUIRY_TRIGGERS.some(rx => rx.test(body));
  }

  async _startQualification(phone, client) {
    this._stats.started++;
    const session = { phone, step: 'intent', answers: {}, startedAt: new Date(), lastMsgAt: new Date() };
    await this._saveSession(phone, session);

    const greeting =
      '👋 *Welcome to Linda Real Estate!*\n\n' +
      'I\'m here to help you find your perfect property. ' +
      'Let me ask you a few quick questions to find the best match for you.\n\n' +
      STEPS.intent.question;

    try { await client.sendMessage(phone + (phone.includes('@') ? '' : '@c.us'), greeting); } catch (_) {}
    log.info(`🚀 Lead qualification started for ${phone}`);
  }

  async _processAnswer(phone, body, session, client) {
    const step = session.step;
    const answer = body.trim();

    // Store answer
    session.answers[step] = answer;
    session.lastMsgAt = new Date();

    // Advance to next step
    const current = STEPS[step];
    const nextStep = current?.next;

    if (nextStep === 'complete') {
      session.step = 'complete';
      await this._saveSession(phone, session);
      await this._completeQualification(phone, session, client);
    } else if (nextStep && STEPS[nextStep]) {
      session.step = nextStep;
      await this._saveSession(phone, session);
      const q = STEPS[nextStep].question;
      if (q) {
        try { await client.sendMessage(phone + (phone.includes('@') ? '' : '@c.us'), q); } catch (_) {}
      }
    }
  }

  async _completeQualification(phone, session, client) {
    this._stats.completed++;

    const lead = this._buildLeadProfile(phone, session.answers);
    await this._saveLead(phone, lead);

    const tier   = lead.tier;
    const score  = lead.score;
    const icon   = tier === 'hot' ? '🔥' : tier === 'warm' ? '🌡️' : '❄️';

    const summary =
      `✅ *Thank you! Here\'s your property search profile:*\n\n` +
      `🎯 Intent   : ${lead.intent}\n` +
      `💰 Budget   : ${session.answers.budget || 'Not specified'}\n` +
      `🛏️  Bedrooms : ${session.answers.bedrooms || 'Flexible'}\n` +
      `📍 Location : ${session.answers.location || 'Any'}\n` +
      `⏳ Timeline : ${session.answers.timeline || 'Flexible'}\n\n` +
      `${icon} *Lead Score: ${score}/100 (${tier.toUpperCase()})*\n\n` +
      `Our team will reach out to you with matching properties shortly! 🏠`;

    try { await client.sendMessage(phone + (phone.includes('@') ? '' : '@c.us'), summary); } catch (_) {}

    if (tier === 'hot') {
      this._stats.hot++;
      log.info(`🔥 Hot lead completed: ${phone} (score: ${score})`);
    } else if (tier === 'warm') {
      this._stats.warm++;
      log.info(`🌡️  Warm lead completed: ${phone} (score: ${score})`);
    } else {
      this._stats.cold++;
    }
  }

  _buildLeadProfile(phone, answers) {
    let score = 0;

    // Intent scoring
    const intent = (answers.intent || '').toLowerCase();
    if (intent.includes('buy') || intent.includes('purchase')) { score += 30; }
    else if (intent.includes('invest')) { score += 25; }
    else if (intent.includes('rent')) { score += 20; }

    // Budget scoring (higher budget = higher score)
    const budgetStr = answers.budget || '';
    const budgetNum = parseFloat(budgetStr.replace(/[^0-9.]/g, '')) || 0;
    if (budgetNum >= 2_000_000) score += 30;
    else if (budgetNum >= 1_000_000) score += 25;
    else if (budgetNum >= 500_000) score += 20;
    else if (budgetNum > 0) score += 10;

    // Timeline scoring
    const timeline = (answers.timeline || '').toLowerCase();
    if (timeline.includes('immediate') || timeline.includes('now') || timeline.includes('asap')) score += 25;
    else if (timeline.includes('1-3') || timeline.includes('few months')) score += 15;
    else if (timeline.includes('6')) score += 5;

    // Location scoring
    if (answers.location && answers.location.length > 2) score += 15;

    const tier =
      score >= 75 ? 'hot' :
      score >= 45 ? 'warm' : 'cold';

    return {
      phone,
      intent: intent || 'unknown',
      budget: budgetStr,
      budgetMax: budgetNum,
      bedrooms: parseInt(answers.bedrooms) || 0,
      location: answers.location || '',
      timeline: answers.timeline || '',
      score: Math.min(score, 100),
      tier,
      stage: 'qualified',
      source: 'whatsapp_inbound',
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // CRUD helpers
  // ─────────────────────────────────────────────────────────────────

  async _getSession(phone) {
    if (this._SessionModel) {
      try {
        const doc = await this._SessionModel.findOne({ phone }).lean();
        return doc || this._sessions.get(phone) || null;
      } catch (_) {}
    }
    return this._sessions.get(phone) || null;
  }

  async _saveSession(phone, session) {
    this._sessions.set(phone, session);
    if (this._SessionModel) {
      try {
        await this._SessionModel.findOneAndUpdate({ phone }, session, { upsert: true });
      } catch (_) {}
    }
  }

  async _saveLead(phone, lead) {
    this._leads.set(phone, lead);
    if (this._LeadModel) {
      try {
        await this._LeadModel.findOneAndUpdate({ phone }, lead, { upsert: true, new: true });
      } catch (_) {}
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────

  /** Get lead profile for a phone number. */
  async getLead(phone) {
    if (this._LeadModel) {
      try { return await this._LeadModel.findOne({ phone }).lean(); } catch (_) {}
    }
    return this._leads.get(phone) || null;
  }

  /** Get all leads by tier. */
  async getLeadsByTier(tier) {
    if (this._LeadModel) {
      try { return await this._LeadModel.find({ tier }).lean(); } catch (_) {}
    }
    return [...this._leads.values()].filter(l => l.tier === tier);
  }

  /** Stats summary string. */
  reportText() {
    return [
      '🏠 *Lead Qualification Report*',
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Sessions started   : ${this._stats.started}`,
      `Qualifications done: ${this._stats.completed}`,
      `🔥 Hot leads        : ${this._stats.hot}`,
      `🌡️  Warm leads       : ${this._stats.warm}`,
      `❄️  Cold leads        : ${this._stats.cold}`,
    ].join('\n');
  }

  stats() { return { ...this._stats }; }
}

const leadQualification = new LeadQualificationService();
export default leadQualification;
export { LeadQualificationService };
