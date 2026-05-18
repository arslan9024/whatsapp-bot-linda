/**
 * ====================================================================
 * POLICY COMPLIANCE SERVICE
 * ====================================================================
 * Enforces WhatsApp / Meta Business Messaging policy for every
 * outgoing message.  Key capabilities:
 *
 *  • Opt-in  registry — store explicit consent per phone number
 *  • Opt-out registry — honour STOP / UNSUBSCRIBE / opt-out immediately
 *  • Compliance check — gate every send attempt through isAllowed()
 *  • Campaign pre-flight audit — scan contact list before bulk send
 *  • Audit log — timestamped record of every opt-in / opt-out / block
 *  • !policy and !compliance commands use this service
 *
 * Storage:
 *   - In-memory Map by default (works without DB)
 *   - Persists to MongoDB if a mongoose connection is available
 *
 * Usage:
 *   import policyCompliance from './PolicyComplianceService.js';
 *
 *   // On receiving "STOP" from a user
 *   policyCompliance.recordOptOut(phone, 'user_request');
 *
 *   // Before sending any message
 *   if (!policyCompliance.isAllowed(phone)) return; // silently drop
 *
 * @since Wave-3 Policy Upgrade — May 2026
 * @see COPILOT_CONTEXT.md §11, docs/guides/WHATSAPP_POLICY_COMPLIANCE.md
 */

import mongoose from 'mongoose';
import { Logger } from '../utils/Logger.js';

const log = new Logger('PolicyComplianceService');

// ─── Mongoose schema (optional — only used when a connection exists) ──
const complianceSchema = new mongoose.Schema(
  {
    phone:     { type: String, required: true, index: true },
    status:    { type: String, enum: ['opted_in', 'opted_out', 'unknown'], default: 'unknown' },
    optInAt:   { type: Date,   default: null },
    optOutAt:  { type: Date,   default: null },
    reason:    { type: String, default: '' },
    source:    { type: String, default: 'system' },
  },
  { timestamps: true }
);

const auditSchema = new mongoose.Schema(
  {
    phone:   { type: String, required: true, index: true },
    action:  { type: String, enum: ['opt_in', 'opt_out', 'check_blocked', 'check_allowed'], required: true },
    reason:  { type: String, default: '' },
    source:  { type: String, default: 'system' },
    ts:      { type: Date,   default: Date.now },
  },
  { timestamps: false }
);

// ─── opt-out trigger words (case-insensitive) ────────────────────────
const OPT_OUT_TRIGGERS = new Set([
  'stop', 'unsubscribe', 'optout', 'opt-out', 'opt out',
  'cancel', 'remove', 'end', 'quit', 'block',
  'روکو', 'بند کرو',          // Urdu equivalents
]);

// ─── opt-in trigger words ─────────────────────────────────────────────
const OPT_IN_TRIGGERS = new Set([
  'start', 'subscribe', 'optin', 'opt-in', 'opt in',
  'yes', 'join', 'resume',
  'شروع', 'ہاں',               // Urdu equivalents
]);

export class PolicyComplianceService {
  constructor() {
    /** @type {Map<string, 'opted_in'|'opted_out'|'unknown'>} */
    this._status  = new Map();
    /** @type {Array<{phone,action,reason,source,ts}>} */
    this._audit   = [];

    this._ComplianceModel = null;
    this._AuditModel      = null;

    // Counters
    this._stats = { optIns: 0, optOuts: 0, blocked: 0, allowed: 0 };
  }

  // ─────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────

  /**
   * Connect to MongoDB models (optional).  When called the service
   * will persist opt-in/out state to the DB and survive restarts.
   *
   * @param {mongoose.Connection} conn
   */
  async connectDB(conn) {
    try {
      this._ComplianceModel = conn.model('PolicyCompliance', complianceSchema);
      this._AuditModel      = conn.model('PolicyAudit',      auditSchema);

      // Load existing records into the in-memory map for fast lookups
      const records = await this._ComplianceModel.find({}).lean();
      for (const r of records) {
        this._status.set(r.phone, r.status);
      }
      log.info(`✅ PolicyComplianceService connected to DB (${records.length} records loaded)`);
    } catch (err) {
      log.warn(`⚠️  PolicyComplianceService DB connect failed — running in-memory only: ${err.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Core API
  // ─────────────────────────────────────────────────────────────────

  /**
   * Check whether a message may be sent to this phone number.
   *
   * @param {string} phone
   * @returns {boolean}  true = allowed,  false = blocked (opted-out or unknown-strict)
   */
  isAllowed(phone) {
    const status = this._status.get(this._normalise(phone)) ?? 'unknown';
    const allowed = status !== 'opted_out';

    if (!allowed) {
      this._stats.blocked++;
      this._logAudit(phone, 'check_blocked', `status=${status}`);
      log.warn(`🚫 Message BLOCKED for opted-out contact ${phone}`);
    } else {
      this._stats.allowed++;
    }

    return allowed;
  }

  /**
   * Record an explicit opt-in for a phone number.
   *
   * @param {string} phone
   * @param {string} [source='user_message'] - e.g. 'web_form', 'campaign_reply', 'user_message'
   */
  async recordOptIn(phone, source = 'user_message') {
    const norm = this._normalise(phone);
    this._status.set(norm, 'opted_in');
    this._stats.optIns++;
    this._logAudit(norm, 'opt_in', '', source);
    log.info(`✅ Opt-in recorded for ${norm} (source: ${source})`);
    await this._persistStatus(norm, 'opted_in', source, 'opt_in');
  }

  /**
   * Record an opt-out for a phone number.  Calling this MUST prevent
   * any further messages to this contact (enforced by isAllowed()).
   *
   * @param {string} phone
   * @param {string} [source='user_message']
   */
  async recordOptOut(phone, source = 'user_message') {
    const norm = this._normalise(phone);
    this._status.set(norm, 'opted_out');
    this._stats.optOuts++;
    this._logAudit(norm, 'opt_out', '', source);
    log.warn(`🛑 Opt-out recorded for ${norm} (source: ${source})`);
    await this._persistStatus(norm, 'opted_out', source, 'opt_out');
  }

  /**
   * Get the compliance status of a phone number.
   * @param {string} phone
   * @returns {'opted_in'|'opted_out'|'unknown'}
   */
  getStatus(phone) {
    return this._status.get(this._normalise(phone)) ?? 'unknown';
  }

  /**
   * Detect opt-in / opt-out keywords in an incoming message body and
   * automatically record the appropriate state.
   *
   * Call this inside the message handler before any other processing.
   *
   * @param {string} phone
   * @param {string} body   - Raw message text
   * @returns {'opted_in'|'opted_out'|null}  The action taken, or null
   */
  async detectAndRecord(phone, body) {
    if (!body) return null;
    const cleaned = body.trim().toLowerCase();

    if (OPT_OUT_TRIGGERS.has(cleaned)) {
      await this.recordOptOut(phone, 'keyword_detected');
      return 'opted_out';
    }

    if (OPT_IN_TRIGGERS.has(cleaned)) {
      await this.recordOptIn(phone, 'keyword_detected');
      return 'opted_in';
    }

    return null;
  }

  // ─────────────────────────────────────────────────────────────────
  // Campaign Audit
  // ─────────────────────────────────────────────────────────────────

  /**
   * Pre-flight audit for a bulk campaign.
   * Returns counts and the filtered allowed list.
   *
   * @param {string[]} phones
   * @returns {{ allowed: string[], blocked: string[], blockedPct: number }}
   */
  auditCampaign(phones) {
    const allowed  = [];
    const blocked  = [];

    for (const p of phones) {
      if (this.isAllowed(p)) {
        allowed.push(p);
      } else {
        blocked.push(p);
      }
    }

    const blockedPct = phones.length
      ? Math.round((blocked.length / phones.length) * 100)
      : 0;

    log.info(
      `📋 Campaign audit: ${allowed.length} allowed, ${blocked.length} blocked (${blockedPct}%)`
    );

    return { allowed, blocked, blockedPct };
  }

  // ─────────────────────────────────────────────────────────────────
  // Reporting
  // ─────────────────────────────────────────────────────────────────

  /**
   * Human-readable compliance report.
   * @returns {string}
   */
  report() {
    const total     = this._status.size;
    const optedIn   = [...this._status.values()].filter(s => s === 'opted_in').length;
    const optedOut  = [...this._status.values()].filter(s => s === 'opted_out').length;
    const unknown   = total - optedIn - optedOut;

    return [
      '📊 *Policy Compliance Report*',
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Total contacts tracked : ${total}`,
      `✅ Opted-in            : ${optedIn}`,
      `🛑 Opted-out           : ${optedOut}`,
      `❓ Unknown             : ${unknown}`,
      ``,
      `Session stats:`,
      `  Messages allowed     : ${this._stats.allowed}`,
      `  Messages blocked     : ${this._stats.blocked}`,
      `  Opt-ins recorded     : ${this._stats.optIns}`,
      `  Opt-outs recorded    : ${this._stats.optOuts}`,
      ``,
      `Audit log entries      : ${this._audit.length}`,
    ].join('\n');
  }

  /**
   * Return the last N audit log entries as formatted text.
   * @param {number} [n=20]
   * @returns {string}
   */
  auditLog(n = 20) {
    const entries = this._audit.slice(-n).reverse();
    if (!entries.length) return '📋 No audit entries yet.';

    const lines = entries.map(e =>
      `[${new Date(e.ts).toISOString()}] ${e.action.padEnd(14)} ${e.phone} ${e.reason ? '— ' + e.reason : ''}`
    );
    return ['📋 *Recent Compliance Audit Log*', '━━━━━━━━━━━━━━━━━━━━━━━━━', ...lines].join('\n');
  }

  /**
   * Full stats object (for ServiceRegistry / dashboard).
   * @returns {object}
   */
  stats() {
    return {
      ...this._stats,
      totalTracked: this._status.size,
      auditEntries: this._audit.length,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────

  _normalise(phone) {
    if (!phone) return '';
    // Strip @c.us / @s.whatsapp.net suffixes that whatsapp-web.js adds
    return String(phone).replace(/@.*$/, '').replace(/\D/g, '');
  }

  _logAudit(phone, action, reason = '', source = 'system') {
    this._audit.push({ phone, action, reason, source, ts: Date.now() });
    // Keep last 10 000 entries in memory
    if (this._audit.length > 10_000) this._audit.shift();
  }

  async _persistStatus(phone, status, source, action) {
    if (!this._ComplianceModel) return;
    try {
      await this._ComplianceModel.findOneAndUpdate(
        { phone },
        {
          status,
          source,
          ...(status === 'opted_in'  ? { optInAt:  new Date() } : {}),
          ...(status === 'opted_out' ? { optOutAt: new Date() } : {}),
        },
        { upsert: true, new: true }
      );
      if (this._AuditModel) {
        await this._AuditModel.create({ phone, action, source });
      }
    } catch (err) {
      log.warn(`⚠️  DB persist failed for ${phone}: ${err.message}`);
    }
  }
}

/** Singleton */
const policyCompliance = new PolicyComplianceService();
export default policyCompliance;
