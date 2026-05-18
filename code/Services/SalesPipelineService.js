/**
 * ====================================================================
 * SALES PIPELINE SERVICE
 * ====================================================================
 * Track real estate deals through a full sales pipeline:
 *
 *   NEW_LEAD → QUALIFIED → VIEWING_SCHEDULED → VIEWING_DONE
 *             → OFFER_MADE → NEGOTIATING → CONTRACTED → COMPLETED
 *             (or LOST at any stage)
 *
 * Features:
 *   • Create and update deal records
 *   • Stage transitions with validation and timestamps
 *   • Per-agent pipeline view
 *   • Deal value tracking (potential AED amount)
 *   • Stale deal alerts (deals stuck in same stage too long)
 *   • Conversion funnel report
 *
 * Bot commands:
 *   !pipeline add <contact_phone> <property_id> [value]  — create deal
 *   !pipeline list [mine|all]                            — list deals
 *   !pipeline move <deal_id> <stage>                     — advance stage
 *   !pipeline view <deal_id>                             — deal details
 *   !pipeline report                                     — funnel report
 *   !pipeline stale                                      — list stale deals
 *
 * @since Wave-4 Feature Expansion — May 2026
 */

import mongoose from 'mongoose';
import { Logger } from '../utils/Logger.js';

const log = new Logger('SalesPipeline');

// ─── Stage definitions ───────────────────────────────────────────────
export const STAGES = [
  'new_lead',
  'qualified',
  'viewing_scheduled',
  'viewing_done',
  'offer_made',
  'negotiating',
  'contracted',
  'completed',
  'lost',
];

const STAGE_EMOJIS = {
  new_lead:          '🆕',
  qualified:         '✅',
  viewing_scheduled: '📅',
  viewing_done:      '👁️',
  offer_made:        '💸',
  negotiating:       '🤝',
  contracted:        '📝',
  completed:         '🏆',
  lost:              '❌',
};

// Deals stuck longer than this (per stage) are considered stale
const STALE_DAYS = {
  new_lead:          3,
  qualified:         7,
  viewing_scheduled: 3,
  viewing_done:      5,
  offer_made:        7,
  negotiating:       14,
  contracted:        30,
};

// ─── Schema ─────────────────────────────────────────────────────────
const dealSchema = new mongoose.Schema(
  {
    dealId:      { type: String, required: true, unique: true },
    contactPhone:{ type: String, required: true, index: true },
    contactName: { type: String, default: '' },
    propertyId:  { type: String, default: '' },
    propertyLabel:{ type: String, default: '' },
    agentPhone:  { type: String, default: '', index: true },
    agentName:   { type: String, default: '' },
    stage:       { type: String, enum: STAGES, default: 'new_lead', index: true },
    value:       { type: Number, default: 0 },   // potential deal value in AED
    notes:       { type: String, default: '' },
    lostReason:  { type: String, default: '' },
    stageHistory:[{
      stage:     String,
      enteredAt: Date,
      exitedAt:  { type: Date, default: null },
      notes:     String,
    }],
    completedAt: { type: Date, default: null },
    lostAt:      { type: Date, default: null },
    stageEnteredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

class SalesPipelineService {
  constructor() {
    /** @type {Map<string, object>} dealId → deal */
    this._deals = new Map();
    this._Model = null;
    this._stats = {
      created: 0, completed: 0, lost: 0,
      totalValue: 0, completedValue: 0,
    };
  }

  async connectDB(conn) {
    try {
      this._Model = conn.model('SalesDeal', dealSchema);
      log.info('✅ SalesPipelineService connected to DB');
    } catch (err) {
      log.warn(`⚠️  SalesPipeline DB connect failed: ${err.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Core API
  // ─────────────────────────────────────────────────────────────────

  /**
   * Create a new deal.
   */
  async createDeal({ contactPhone, contactName, propertyId, propertyLabel, agentPhone, agentName, value, notes } = {}) {
    const dealId = this._genId();
    const deal = {
      dealId,
      contactPhone: contactPhone || '',
      contactName:  contactName  || '',
      propertyId:   propertyId   || '',
      propertyLabel:propertyLabel || propertyId || '',
      agentPhone:   agentPhone   || '',
      agentName:    agentName    || '',
      stage:        'new_lead',
      value:        parseFloat(value) || 0,
      notes:        notes || '',
      stageHistory: [{ stage: 'new_lead', enteredAt: new Date(), notes: 'Deal created' }],
      stageEnteredAt: new Date(),
    };

    await this._save(deal);
    this._stats.created++;
    this._stats.totalValue += deal.value;
    log.info(`📊 Deal created: ${dealId} for ${contactPhone}`);
    return deal;
  }

  /**
   * Move a deal to a new stage.
   * @param {string} dealId
   * @param {string} newStage
   * @param {string} [notes]
   * @returns {Promise<{success: boolean, deal?: object, error?: string}>}
   */
  async moveStage(dealId, newStage, notes = '') {
    if (!STAGES.includes(newStage)) {
      return { success: false, error: `Invalid stage. Valid stages: ${STAGES.join(', ')}` };
    }

    const deal = await this._getById(dealId);
    if (!deal) return { success: false, error: `Deal not found: ${dealId}` };

    const prevStage = deal.stage;

    // Close out previous stage history entry
    const lastHistEntry = (deal.stageHistory || []).findLast?.(h => !h.exitedAt) ||
      (deal.stageHistory || []).filter(h => !h.exitedAt).at(-1);
    if (lastHistEntry) lastHistEntry.exitedAt = new Date();

    // Update deal
    deal.stage          = newStage;
    deal.stageEnteredAt = new Date();
    (deal.stageHistory = deal.stageHistory || []).push({
      stage: newStage, enteredAt: new Date(), notes,
    });

    if (newStage === 'completed') {
      deal.completedAt = new Date();
      this._stats.completed++;
      this._stats.completedValue += deal.value;
    }
    if (newStage === 'lost') {
      deal.lostAt = new Date();
      deal.lostReason = notes;
      this._stats.lost++;
    }

    await this._save(deal);
    log.info(`➡️  Deal ${dealId}: ${prevStage} → ${newStage}`);
    return { success: true, deal };
  }

  /**
   * Get all deals for an agent.
   */
  async getDealsByAgent(agentPhone) {
    if (this._Model) {
      try { return await this._Model.find({ agentPhone, stage: { $ne: 'completed' } }).sort({ stageEnteredAt: -1 }).lean(); } catch (_) {}
    }
    return [...this._deals.values()].filter(d => d.agentPhone === agentPhone && d.stage !== 'completed');
  }

  /**
   * Get all active deals (excluding completed/lost).
   */
  async getAllActive() {
    if (this._Model) {
      try { return await this._Model.find({ stage: { $nin: ['completed', 'lost'] } }).sort({ stageEnteredAt: -1 }).lean(); } catch (_) {}
    }
    return [...this._deals.values()].filter(d => !['completed', 'lost'].includes(d.stage));
  }

  /**
   * Get stale deals (stuck in same stage too long).
   */
  async getStaleDeal() {
    const active = await this.getAllActive();
    const stale  = [];
    const now    = Date.now();
    for (const deal of active) {
      const maxDays = STALE_DAYS[deal.stage] || 7;
      const enteredAt = new Date(deal.stageEnteredAt).getTime();
      const daysSince = (now - enteredAt) / 86_400_000;
      if (daysSince > maxDays) {
        stale.push({ ...deal, daysSince: Math.floor(daysSince), maxDays });
      }
    }
    return stale.sort((a, b) => b.daysSince - a.daysSince);
  }

  /**
   * Funnel report: count of deals at each stage.
   */
  async funnelReport() {
    const active = await this.getAllActive();
    const counts = Object.fromEntries(STAGES.map(s => [s, 0]));
    for (const d of active) counts[d.stage] = (counts[d.stage] || 0) + 1;
    return counts;
  }

  // ─────────────────────────────────────────────────────────────────
  // Formatting
  // ─────────────────────────────────────────────────────────────────

  formatDeal(deal) {
    const icon = STAGE_EMOJIS[deal.stage] || '•';
    const val  = deal.value ? `AED ${Number(deal.value).toLocaleString()}` : 'TBD';
    return [
      `${icon} *${deal.dealId}*`,
      `   Contact : ${deal.contactName || deal.contactPhone}`,
      `   Property: ${deal.propertyLabel || deal.propertyId}`,
      `   Stage   : ${deal.stage.replace(/_/g, ' ').toUpperCase()}`,
      `   Value   : ${val}`,
    ].join('\n');
  }

  async formatFunnelReport() {
    const funnel = await this.funnelReport();
    const lines  = STAGES
      .filter(s => !['completed', 'lost'].includes(s))
      .map(s => {
        const n    = funnel[s] || 0;
        const icon = STAGE_EMOJIS[s] || '•';
        const bar  = '█'.repeat(Math.min(n, 20));
        return `${icon} ${s.replace(/_/g, ' ').padEnd(20)} ${bar} ${n}`;
      });

    return [
      '📊 *Sales Pipeline Funnel*',
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      ...lines,
      ``,
      `✅ Completed : ${this._stats.completed}`,
      `❌ Lost      : ${this._stats.lost}`,
      `💰 Won value : AED ${Number(this._stats.completedValue).toLocaleString()}`,
    ].join('\n');
  }

  reportText() {
    return [
      '📈 *Sales Pipeline Stats*',
      `━━━━━━━━━━━━━━━━━━━━━━━`,
      `Total created    : ${this._stats.created}`,
      `Completed        : ${this._stats.completed}`,
      `Lost             : ${this._stats.lost}`,
      `Total value      : AED ${Number(this._stats.totalValue).toLocaleString()}`,
      `Completed value  : AED ${Number(this._stats.completedValue).toLocaleString()}`,
    ].join('\n');
  }

  stats() { return { ...this._stats }; }

  // ─────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────

  async _getById(dealId) {
    if (this._Model) {
      try { return await this._Model.findOne({ dealId }).lean(); } catch (_) {}
    }
    return this._deals.get(dealId) || null;
  }

  async _save(deal) {
    this._deals.set(deal.dealId, deal);
    if (this._Model) {
      try {
        await this._Model.findOneAndUpdate({ dealId: deal.dealId }, deal, { upsert: true, new: true });
      } catch (_) {}
    }
  }

  _genId() {
    return `DEAL-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  }
}

const salesPipeline = new SalesPipelineService();
export default salesPipeline;
export { SalesPipelineService };
