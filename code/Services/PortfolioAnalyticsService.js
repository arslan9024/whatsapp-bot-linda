/**
 * ========================================================================
 * PORTFOLIO ANALYTICS SERVICE  
 * Phase 5: Feature 3 - Analytics & Reporting Dashboard
 * ========================================================================
 * 
 * Enterprise-grade analytics engine aggregating data from 35+ models:
 * 
 *  1. Dashboard KPIs       — Real-time portfolio overview
 *  2. Property Analytics    — Per-property performance & ROI
 *  3. Tenant Analytics      — Demographics, duration, renewal
 *  4. Financial Analytics   — Revenue, commissions, costs
 *  5. Agent Performance     — Rankings, conversion, earnings
 *  6. Communication Stats   — Message volume, response times
 *  7. Trend Analysis        — Historical data from daily snapshots
 *  8. Daily Snapshot        — Auto-capture KPIs for trending
 *  9. Custom Reports        — Configurable date range & filters
 * 10. Quick Stats           — Bot-friendly text summary
 * 
 * @module PortfolioAnalyticsService
 * @since Phase 5 - February 2026
 */

import mongoose from 'mongoose';
import {
  DailySnapshot,
  PropertyAnalytics,
  AgentAnalytics,
  CustomReport
} from '../Database/AnalyticsSchema.js';

class PortfolioAnalyticsService {

  // ====================================================================
  // HELPER: Safe model access (model may not be registered yet)
  // ====================================================================

  _model(name) {
    try {
      return mongoose.model(name);
    } catch { return null; }
  }

  async _count(name, query = {}) {
    const M = this._model(name);
    if (!M) return 0;
    try { return await M.countDocuments(query); }
    catch { return 0; }
  }

  async _aggregate(name, pipeline) {
    const M = this._model(name);
    if (!M) return [];
    try { return await M.aggregate(pipeline); }
    catch { return []; }
  }

  // ====================================================================
  // 1. DASHBOARD — REAL-TIME KPIs
  // ====================================================================

  /**
   * Main dashboard: pulls from every system for a full overview
   * @returns {Promise<Object>} { success, dashboard }
   */
  async getDashboard() {
    try {
      const t0 = Date.now();

      const [properties, tenancies, financial, deals, people, communication] =
        await Promise.all([
          this._propertyKPIs(),
          this._tenancyKPIs(),
          this._financialKPIs(),
          this._dealKPIs(),
          this._peopleKPIs(),
          this._communicationKPIs()
        ]);

      const duration = Date.now() - t0;

      return {
        success: true,
        dashboard: {
          properties,
          tenancies,
          financial,
          deals,
          people,
          communication,
          generatedAt: new Date(),
          generationDuration: duration
        }
      };
    } catch (error) {
      console.error('PortfolioAnalyticsService: getDashboard error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ── property KPIs ─────────────────────────────────────────────────

  async _propertyKPIs() {
    const [total, occupied, vacant, forRent, forSale] = await Promise.all([
      this._count('Property'),
      this._count('Property', { occupancyStatusId: { $regex: /occupied/i } }),
      this._count('Property', { occupancyStatusId: { $regex: /vacant/i } }),
      this._count('Property', { availabilityStatusIds: { $elemMatch: { $regex: /rent/i } } }),
      this._count('Property', { availabilityStatusIds: { $elemMatch: { $regex: /sale/i } } })
    ]);
    return {
      total, occupied, vacant, forRent, forSale,
      occupancyRate: total > 0 ? Math.round((occupied / total) * 1000) / 10 : 0
    };
  }

  // ── tenancy KPIs ──────────────────────────────────────────────────

  async _tenancyKPIs() {
    const now = new Date();
    const d60 = new Date(now.getTime() + 60 * 864e5);
    const som = new Date(now.getFullYear(), now.getMonth(), 1);

    const [active, expiringSoon, expired, newThisMonth, endedThisMonth] = await Promise.all([
      this._count('PropertyTenancy', { status: 'active' }),
      this._count('PropertyTenancy', {
        status: 'active',
        contractExpiryDate: { $lte: d60, $gte: now }
      }),
      this._count('PropertyTenancy', { status: { $in: ['expired', 'ended'] } }),
      this._count('PropertyTenancy', { contractStartDate: { $gte: som } }),
      this._count('PropertyTenancy', {
        status: { $in: ['ended', 'terminated'] },
        terminationDate: { $gte: som }
      })
    ]);
    return { active, expiringSoon, expired, newThisMonth, endedThisMonth };
  }

  // ── financial KPIs ────────────────────────────────────────────────

  async _financialKPIs() {
    const out = {
      totalRentalRevenue: 0, totalServiceCharges: 0,
      totalCommissionsEarned: 0, totalCommissionsPaid: 0, totalCommissionsPending: 0,
      totalSalesVolume: 0, avgRentPerUnit: 0, avgSalePrice: 0, currency: 'AED'
    };

    // rental
    const rent = await this._aggregate('PropertyTenancy', [
      { $match: { status: 'active' } },
      { $group: { _id: null, total: { $sum: '$contractAmount' }, n: { $sum: 1 } } }
    ]);
    if (rent[0]) {
      out.totalRentalRevenue = rent[0].total || 0;
      out.avgRentPerUnit = rent[0].n > 0 ? Math.round(rent[0].total / rent[0].n) : 0;
    }

    // service charges
    const sc = await this._aggregate('Property', [
      { $match: { serviceCharges: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$serviceCharges' } } }
    ]);
    out.totalServiceCharges = sc[0]?.total || 0;

    // commissions
    const comm = await this._aggregate('Commission', [
      {
        $group: {
          _id: null,
          earned: { $sum: '$commissionAmount' },
          paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$commissionAmount', 0] } },
          pending: {
            $sum: {
              $cond: [
                { $in: ['$status', ['pending', 'earned', 'processing']] },
                '$commissionAmount', 0
              ]
            }
          }
        }
      }
    ]);
    if (comm[0]) {
      out.totalCommissionsEarned = comm[0].earned || 0;
      out.totalCommissionsPaid = comm[0].paid || 0;
      out.totalCommissionsPending = comm[0].pending || 0;
    }

    // sales
    const sales = await this._aggregate('Deal', [
      { $match: { status: 'closed' } },
      { $group: { _id: null, total: { $sum: '$salePrice' }, n: { $sum: 1 } } }
    ]);
    if (sales[0]) {
      out.totalSalesVolume = sales[0].total || 0;
      out.avgSalePrice = sales[0].n > 0 ? Math.round(sales[0].total / sales[0].n) : 0;
    }

    return out;
  }

  // ── deal KPIs ─────────────────────────────────────────────────────

  async _dealKPIs() {
    const som = new Date(); som.setDate(1); som.setHours(0, 0, 0, 0);

    const [total, leads, active, closedMonth, cancelled, closed] = await Promise.all([
      this._count('Deal'),
      this._count('Deal', { status: 'lead' }),
      this._count('Deal', { status: { $nin: ['closed', 'cancelled'] } }),
      this._count('Deal', { status: 'closed', 'timeline.closeDate': { $gte: som } }),
      this._count('Deal', { status: 'cancelled' }),
      this._count('Deal', { status: 'closed' })
    ]);
    return {
      total, leads, active,
      closedThisMonth: closedMonth,
      cancelled,
      conversionRate: total > 0 ? Math.round((closed / total) * 1000) / 10 : 0
    };
  }

  // ── people KPIs ───────────────────────────────────────────────────

  async _peopleKPIs() {
    const som = new Date(); som.setDate(1); som.setHours(0, 0, 0, 0);
    const [totalContacts, newThisMonth, agents] = await Promise.all([
      this._count('Person'),
      this._count('Person', { createdAt: { $gte: som } }),
      this._count('AgentMetrics')
    ]);
    return { totalContacts, agents, newThisMonth, tenants: 0, owners: 0 };
  }

  // ── communication KPIs ────────────────────────────────────────────

  async _communicationKPIs() {
    const som = new Date(); som.setDate(1); som.setHours(0, 0, 0, 0);
    let messagesSent = 0, avgResponseTime = 0, activeConversations = 0;
    let templatesSent = 0, templatesDelivered = 0;

    const msgAgg = await this._aggregate('Message', [
      { $match: { timestamp: { $gte: som } } },
      { $group: { _id: null, total: { $sum: 1 }, avgPT: { $avg: '$processingTime' } } }
    ]);
    messagesSent = msgAgg[0]?.total || 0;
    avgResponseTime = Math.round(msgAgg[0]?.avgPT || 0);

    activeConversations = await this._count('Conversation', { 'state.isActive': true });
    templatesSent = await this._count('CommunicationLog', { sentAt: { $gte: som } });
    templatesDelivered = await this._count('CommunicationLog', {
      status: 'delivered', deliveredAt: { $gte: som }
    });

    return {
      messagesSent, messagesReceived: 0,
      templatesSent, templatesDelivered,
      avgResponseTime, activeConversations
    };
  }

  // ====================================================================
  // 2. PROPERTY ANALYTICS — per-property performance
  // ====================================================================

  /**
   * Detailed property analytics with occupancy, revenue, performance
   * @param {Object} options - { propertyId, clusterId, limit }
   * @returns {Promise<Object>}
   */
  async getPropertyAnalytics(options = {}) {
    try {
      const Property = this._model('Property');
      if (!Property) return { success: true, properties: [], summary: this._emptyPropSummary() };

      const query = {};
      if (options.propertyId) query.propertyId = options.propertyId;
      if (options.clusterId) query.clusterId = options.clusterId;

      const properties = await Property.find(query).limit(options.limit || 50).lean();
      const Tenancy = this._model('PropertyTenancy');

      const analytics = [];
      for (const p of properties) {
        const item = {
          propertyId: p.propertyId,
          unitNumber: p.unitNumber,
          clusterId: p.clusterId,
          builtUpArea: p.builtUpArea || 0,
          serviceCharges: p.serviceCharges || 0,
          occupancyStatus: p.occupancyStatusId || 'unknown',
          availability: p.availabilityStatusIds || [],
          currentRent: 0,
          leaseExpiry: null,
          totalTenancies: 0,
          avgLeaseDurationMonths: 0
        };

        if (Tenancy) {
          const tenancies = await Tenancy.find({ propertyId: p.propertyId })
            .sort({ contractStartDate: -1 }).limit(10).lean();
          const act = tenancies.find(t => t.status === 'active');
          item.currentRent = act?.contractAmount || 0;
          item.leaseExpiry = act?.contractExpiryDate || null;
          item.totalTenancies = tenancies.length;
          item.avgLeaseDurationMonths = this._avgDuration(tenancies);
        }

        analytics.push(item);
      }

      const summary = {
        totalProperties: analytics.length,
        totalRentalRevenue: analytics.reduce((s, a) => s + a.currentRent, 0),
        totalServiceCharges: analytics.reduce((s, a) => s + a.serviceCharges, 0),
        avgRent: analytics.length > 0
          ? Math.round(analytics.reduce((s, a) => s + a.currentRent, 0) / analytics.length)
          : 0,
        avgBuiltUpArea: analytics.length > 0
          ? Math.round(analytics.reduce((s, a) => s + a.builtUpArea, 0) / analytics.length)
          : 0
      };

      return { success: true, properties: analytics, summary };
    } catch (error) {
      console.error('PortfolioAnalyticsService: getPropertyAnalytics error:', error.message);
      return { success: false, error: error.message };
    }
  }

  _emptyPropSummary() {
    return { totalProperties: 0, totalRentalRevenue: 0, totalServiceCharges: 0, avgRent: 0, avgBuiltUpArea: 0 };
  }

  _avgDuration(tenancies) {
    const d = tenancies
      .filter(t => t.contractStartDate && t.contractExpiryDate)
      .map(t => (new Date(t.contractExpiryDate) - new Date(t.contractStartDate)) / (30 * 864e5));
    return d.length ? Math.round(d.reduce((a, b) => a + b, 0) / d.length * 10) / 10 : 0;
  }

  // ====================================================================
  // 3. TENANT ANALYTICS — demographics, lease, renewal
  // ====================================================================

  /**
   * Tenant portfolio analytics
   * @param {Object} options - optional filters
   * @returns {Promise<Object>}
   */
  async getTenantAnalytics(options = {}) {
    try {
      const Tenancy = this._model('PropertyTenancy');
      if (!Tenancy) return { success: true, summary: this._emptyTenantSummary(), totalRecords: 0 };

      const now = new Date();
      const tenancies = await Tenancy.find({}).lean();
      const active = tenancies.filter(t => t.status === 'active');
      const ended = tenancies.filter(t => ['ended', 'terminated', 'expired'].includes(t.status));

      // lease durations
      const durations = active
        .filter(t => t.contractStartDate && t.contractExpiryDate)
        .map(t => ({
          months: (new Date(t.contractExpiryDate) - new Date(t.contractStartDate)) / (30 * 864e5),
          rent: t.contractAmount || 0,
          cheques: t.paymentSchedule?.totalCheques || 0
        }));

      // payment breakdown
      const payBreak = {};
      for (const t of active) {
        const ch = t.paymentSchedule?.totalCheques || 1;
        const k = `${ch}_cheque${ch > 1 ? 's' : ''}`;
        payBreak[k] = (payBreak[k] || 0) + 1;
      }

      // expiry timeline
      const d30 = new Date(now.getTime() + 30 * 864e5);
      const d60 = new Date(now.getTime() + 60 * 864e5);

      const summary = {
        totalActive: active.length,
        totalEnded: ended.length,
        avgLeaseDuration: durations.length
          ? Math.round(durations.reduce((s, d) => s + d.months, 0) / durations.length * 10) / 10
          : 0,
        avgRent: durations.length
          ? Math.round(durations.reduce((s, d) => s + d.rent, 0) / durations.length)
          : 0,
        avgCheques: durations.length
          ? Math.round(durations.reduce((s, d) => s + d.cheques, 0) / durations.length * 10) / 10
          : 0,
        paymentBreakdown: payBreak,
        expiringIn30Days: active.filter(t => t.contractExpiryDate && new Date(t.contractExpiryDate) <= d30).length,
        expiringIn60Days: active.filter(t => t.contractExpiryDate && new Date(t.contractExpiryDate) <= d60).length,
        renewalRate: this._renewalRate(tenancies)
      };

      return { success: true, summary, totalRecords: tenancies.length };
    } catch (error) {
      console.error('PortfolioAnalyticsService: getTenantAnalytics error:', error.message);
      return { success: false, error: error.message };
    }
  }

  _emptyTenantSummary() {
    return {
      totalActive: 0, totalEnded: 0, avgLeaseDuration: 0, avgRent: 0,
      avgCheques: 0, paymentBreakdown: {}, expiringIn30Days: 0, expiringIn60Days: 0, renewalRate: 0
    };
  }

  _renewalRate(tenancies) {
    const by = {};
    for (const t of tenancies) { by[t.propertyId] = (by[t.propertyId] || 0) + 1; }
    const multi = Object.values(by).filter(c => c > 1).length;
    const total = Object.keys(by).length;
    return total > 0 ? Math.round((multi / total) * 1000) / 10 : 0;
  }

  // ====================================================================
  // 4. FINANCIAL ANALYTICS — comprehensive breakdown
  // ====================================================================

  /**
   * Full financial analytics with period breakdowns
   * @param {Object} options - { startDate, endDate, agentPhone }
   * @returns {Promise<Object>}
   */
  async getFinancialAnalytics(options = {}) {
    try {
      const startDate = new Date(options.startDate || '2026-01-01');
      const endDate = new Date(options.endDate || new Date());

      const result = {
        period: { startDate, endDate },
        revenue: { rental: 0, sales: 0, commissions: 0, total: 0 },
        commissions: {
          earned: 0, paid: 0, pending: 0,
          byStatus: {}, byPropertyType: {}, byMonth: []
        },
        payments: { completed: 0, pending: 0, failed: 0, totalPaid: 0 },
        deals: { totalValue: 0, avgValue: 0, count: 0, byStatus: {} }
      };

      // commissions
      const Commission = this._model('Commission');
      if (Commission) {
        const comms = await Commission.find({
          earnedDate: { $gte: startDate, $lte: endDate }
        }).lean();

        result.commissions.earned = comms.reduce((s, c) => s + (c.commissionAmount || 0), 0);
        result.commissions.paid = comms
          .filter(c => c.status === 'paid')
          .reduce((s, c) => s + (c.commissionAmount || 0), 0);
        result.commissions.pending = comms
          .filter(c => ['pending', 'earned', 'processing'].includes(c.status))
          .reduce((s, c) => s + (c.commissionAmount || 0), 0);

        for (const c of comms) {
          result.commissions.byStatus[c.status] = (result.commissions.byStatus[c.status] || 0) + (c.commissionAmount || 0);
          const pt = c.propertyType || 'other';
          result.commissions.byPropertyType[pt] = (result.commissions.byPropertyType[pt] || 0) + (c.commissionAmount || 0);
        }

        // by month
        const byMo = {};
        for (const c of comms) {
          const mo = c.earnedDate
            ? `${c.earnedDate.getFullYear()}-${String(c.earnedDate.getMonth() + 1).padStart(2, '0')}`
            : 'unknown';
          byMo[mo] = (byMo[mo] || 0) + (c.commissionAmount || 0);
        }
        result.commissions.byMonth = Object.entries(byMo)
          .map(([month, amount]) => ({ month, amount }))
          .sort((a, b) => a.month.localeCompare(b.month));

        result.revenue.commissions = result.commissions.earned;
      }

      // deals
      const Deal = this._model('Deal');
      if (Deal) {
        const deals = await Deal.find({
          'timeline.createdAt': { $gte: startDate, $lte: endDate }
        }).lean();
        result.deals.count = deals.length;
        result.deals.totalValue = deals.reduce((s, d) => s + (d.salePrice || 0), 0);
        result.deals.avgValue = deals.length ? Math.round(result.deals.totalValue / deals.length) : 0;
        for (const d of deals) {
          result.deals.byStatus[d.status] = (result.deals.byStatus[d.status] || 0) + 1;
        }
        result.revenue.sales = deals.filter(d => d.status === 'closed').reduce((s, d) => s + (d.salePrice || 0), 0);
      }

      // payments
      const Payment = this._model('Payment');
      if (Payment) {
        const pays = await Payment.find({ requestDate: { $gte: startDate, $lte: endDate } }).lean();
        result.payments.completed = pays.filter(p => p.status === 'completed').length;
        result.payments.pending = pays.filter(p => ['pending', 'initiated', 'processing'].includes(p.status)).length;
        result.payments.failed = pays.filter(p => p.status === 'failed').length;
        result.payments.totalPaid = pays.filter(p => p.status === 'completed').reduce((s, p) => s + (p.totalAmount || 0), 0);
      }

      // rental
      const Tenancy = this._model('PropertyTenancy');
      if (Tenancy) {
        const acts = await Tenancy.find({ status: 'active' }).lean();
        result.revenue.rental = acts.reduce((s, t) => s + (t.contractAmount || 0), 0);
      }

      result.revenue.total = result.revenue.rental + result.revenue.sales + result.revenue.commissions;

      return { success: true, financial: result };
    } catch (error) {
      console.error('PortfolioAnalyticsService: getFinancialAnalytics error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ====================================================================
  // 5. AGENT PERFORMANCE
  // ====================================================================

  /**
   * Agent performance leaderboard and individual analytics
   * @param {Object} options - { agentPhone, limit }
   * @returns {Promise<Object>}
   */
  async getAgentAnalytics(options = {}) {
    try {
      // Single agent deep-dive
      if (options.agentPhone) return this._singleAgent(options.agentPhone);

      const AM = this._model('AgentMetrics');
      if (!AM) return { success: true, agents: [], summary: {} };

      const agents = await AM.find({}).lean();
      const enriched = agents.map(a => ({
        agentPhone: a.agentPhone,
        agentName: a.agentName || 'Unknown',
        totalDeals: a.metrics?.totalDeals || 0,
        closedDeals: a.metrics?.closedDeals || 0,
        activeDeals: a.metrics?.activeDeals || 0,
        conversionRate: a.metrics?.conversionRate || 0,
        lifetimeEarnings: a.earnings?.lifetime || 0,
        paidEarnings: a.earnings?.paid || 0,
        pendingEarnings: a.earnings?.pending || 0,
        avgDealValue: a.performance?.avgDealValue || 0,
        avgCommission: a.performance?.avgCommission || 0,
        lastActivity: a.lastActivityDate
      }));

      enriched.sort((a, b) => b.lifetimeEarnings - a.lifetimeEarnings);
      enriched.forEach((a, i) => { a.rank = i + 1; });

      return {
        success: true,
        agents: enriched.slice(0, options.limit || 20),
        summary: {
          totalAgents: enriched.length,
          totalEarnings: enriched.reduce((s, a) => s + a.lifetimeEarnings, 0),
          totalDeals: enriched.reduce((s, a) => s + a.totalDeals, 0),
          avgConversionRate: enriched.length
            ? Math.round(enriched.reduce((s, a) => s + a.conversionRate, 0) / enriched.length * 10) / 10
            : 0,
          topAgent: enriched[0] || null
        }
      };
    } catch (error) {
      console.error('PortfolioAnalyticsService: getAgentAnalytics error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async _singleAgent(agentPhone) {
    const AM = this._model('AgentMetrics');
    const Commission = this._model('Commission');
    const Deal = this._model('Deal');

    const metrics = AM ? await AM.findOne({ agentPhone }).lean() : null;
    const comms = Commission ? await Commission.find({ agentPhone }).sort({ earnedDate: -1 }).limit(50).lean() : [];
    const deals = Deal ? await Deal.find({ agentPhone }).sort({ 'timeline.createdAt': -1 }).limit(50).lean() : [];

    return {
      success: true,
      agent: {
        agentPhone,
        agentName: metrics?.agentName || 'Unknown',
        metrics: metrics?.metrics || {},
        earnings: metrics?.earnings || {},
        performance: metrics?.performance || {},
        recentCommissions: comms.slice(0, 10),
        recentDeals: deals.slice(0, 10),
        totalCommissions: comms.length,
        totalDeals: deals.length
      }
    };
  }

  // ====================================================================
  // 6. TREND ANALYSIS — historical snapshots
  // ====================================================================

  /**
   * Get historical trends from daily snapshots
   * @param {Object} options - { metric, days }
   * @returns {Promise<Object>}
   */
  async getTrends(options = {}) {
    try {
      const days = options.days || 30;
      const since = new Date();
      since.setDate(since.getDate() - days);

      const snaps = await DailySnapshot.find({ date: { $gte: since } }).sort({ date: 1 }).lean();

      if (!snaps.length) {
        return {
          success: true,
          message: 'No historical data yet. Run daily snapshot to start tracking.',
          trends: [], period: { days, startDate: since, endDate: new Date() }
        };
      }

      const trends = {
        occupancyRate: snaps.map(s => ({ date: s.date, value: s.properties?.occupancyRate || 0 })),
        rentalRevenue: snaps.map(s => ({ date: s.date, value: s.financial?.totalRentalRevenue || 0 })),
        commissions: snaps.map(s => ({ date: s.date, value: s.financial?.totalCommissionsEarned || 0 })),
        activeDeals: snaps.map(s => ({ date: s.date, value: s.deals?.active || 0 })),
        messageVolume: snaps.map(s => ({ date: s.date, value: s.communication?.messagesSent || 0 })),
        totalProperties: snaps.map(s => ({ date: s.date, value: s.properties?.total || 0 }))
      };

      // return single metric if requested
      if (options.metric && trends[options.metric]) {
        return {
          success: true,
          metric: options.metric,
          data: trends[options.metric],
          period: { days, startDate: since, endDate: new Date() }
        };
      }

      return { success: true, trends, snapshotCount: snaps.length, period: { days, startDate: since, endDate: new Date() } };
    } catch (error) {
      console.error('PortfolioAnalyticsService: getTrends error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ====================================================================
  // 7. DAILY SNAPSHOT GENERATION
  // ====================================================================

  /**
   * Generate and save a daily KPI snapshot (run once per day via cron)
   * @returns {Promise<Object>}
   */
  async generateDailySnapshot() {
    try {
      const t0 = Date.now();
      const today = new Date(); today.setHours(0, 0, 0, 0);

      // idempotent
      const existing = await DailySnapshot.findOne({ date: today });
      if (existing) {
        return { success: true, message: 'Snapshot already exists for today', snapshot: existing.toObject() };
      }

      const dash = await this.getDashboard();
      if (!dash.success) return { success: false, error: 'Failed to generate dashboard' };

      const d = dash.dashboard;
      const duration = Date.now() - t0;

      const snapshot = new DailySnapshot({
        date: today,
        properties: d.properties,
        tenancies: d.tenancies,
        financial: d.financial,
        deals: d.deals,
        people: d.people,
        communication: d.communication,
        campaigns: { active: 0, completed: 0, totalSent: 0, totalDelivered: 0, deliveryRate: 0 },
        system: { botUptime: 100, apiResponseTime: duration, errorCount: 0, activeUsers: 0 },
        generatedAt: new Date(),
        generationDuration: duration
      });

      await snapshot.save();

      return { success: true, message: 'Daily snapshot generated', snapshot: snapshot.toObject(), duration };
    } catch (error) {
      console.error('PortfolioAnalyticsService: generateDailySnapshot error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ====================================================================
  // 8. CUSTOM REPORTS
  // ====================================================================

  /**
   * Generate a custom report and persist it
   * @param {Object} config - { name, type, startDate, endDate, filters, createdBy, format }
   * @returns {Promise<Object>}
   */
  async generateReport(config) {
    try {
      const reportId = `rpt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const report = new CustomReport({
        reportId,
        name: config.name || `Report ${new Date().toISOString().slice(0, 10)}`,
        description: config.description,
        type: config.type || 'custom',
        period: {
          startDate: new Date(config.startDate || '2026-01-01'),
          endDate: new Date(config.endDate || new Date())
        },
        filters: config.filters || {},
        format: config.format || 'json',
        createdBy: config.createdBy || 'system',
        status: 'generating'
      });

      await report.save();

      let data;
      switch (config.type) {
        case 'portfolio_overview': data = await this._rptPortfolio(config); break;
        case 'financial_summary':  data = await this._rptFinancial(config); break;
        case 'agent_performance':  data = await this._rptAgent(config); break;
        case 'commission_summary': data = await this._rptCommission(config); break;
        case 'occupancy_report':   data = await this._rptOccupancy(config); break;
        case 'deal_pipeline':      data = await this._rptDeals(config); break;
        case 'tenant_report':      data = await this._rptTenant(config); break;
        default:                   data = await this._rptCustom(config);
      }

      report.data = data;
      report.status = 'ready';
      report.expiresAt = new Date(Date.now() + 30 * 864e5 * 1000);
      await report.save();

      return { success: true, reportId, name: report.name, type: report.type, status: 'ready', period: report.period, data };
    } catch (error) {
      console.error('PortfolioAnalyticsService: generateReport error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async _rptPortfolio(c) {
    const [d, p, t] = await Promise.all([this.getDashboard(), this.getPropertyAnalytics({ limit: 500 }), this.getTenantAnalytics()]);
    return { summary: d.dashboard, properties: p, tenants: t };
  }

  async _rptFinancial(c) {
    return (await this.getFinancialAnalytics({ startDate: c.startDate, endDate: c.endDate })).financial || {};
  }

  async _rptAgent(c) {
    return await this.getAgentAnalytics({ agentPhone: c.filters?.agentPhone, limit: 50 });
  }

  async _rptCommission(c) {
    const f = await this.getFinancialAnalytics({ startDate: c.startDate, endDate: c.endDate });
    return { commissions: f.financial?.commissions || {}, payments: f.financial?.payments || {} };
  }

  async _rptOccupancy(c) {
    const p = await this.getPropertyAnalytics({ limit: 500 });
    return { summary: p.summary, properties: p.properties };
  }

  async _rptDeals(c) {
    const Deal = this._model('Deal');
    if (!Deal) return { deals: [], summary: {} };
    const q = {};
    if (c.startDate) q['timeline.createdAt'] = { $gte: new Date(c.startDate) };
    if (c.filters?.status) q.status = c.filters.status;
    const deals = await Deal.find(q).sort({ 'timeline.createdAt': -1 }).lean();
    return {
      deals: deals.slice(0, 100),
      summary: {
        total: deals.length,
        totalValue: deals.reduce((s, d) => s + (d.salePrice || 0), 0),
        byStatus: deals.reduce((a, d) => { a[d.status] = (a[d.status] || 0) + 1; return a; }, {})
      }
    };
  }

  async _rptTenant(c) {
    return await this.getTenantAnalytics();
  }

  async _rptCustom(c) {
    const [d, f] = await Promise.all([
      this.getDashboard(),
      this.getFinancialAnalytics({ startDate: c.startDate, endDate: c.endDate })
    ]);
    return { dashboard: d.dashboard, financial: f.financial };
  }

  /**
   * Get a saved report by ID
   * @param {String} reportId
   * @returns {Promise<Object|null>}
   */
  async getReportById(reportId) {
    try {
      const report = await CustomReport.findOne({ reportId }).lean();
      return report ? { success: true, report } : { success: false, error: 'Report not found' };
    } catch (error) {
      console.error('PortfolioAnalyticsService: getReportById error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * List generated reports (without data payload)
   * @param {Object} options - { type, status, createdBy, limit }
   * @returns {Promise<Object>}
   */
  async listReports(options = {}) {
    try {
      const q = {};
      if (options.type) q.type = options.type;
      if (options.status) q.status = options.status;
      if (options.createdBy) q.createdBy = options.createdBy;

      const reports = await CustomReport.find(q)
        .select('-data')
        .sort({ createdAt: -1 })
        .limit(options.limit || 20)
        .lean();

      return { success: true, reports, count: reports.length };
    } catch (error) {
      console.error('PortfolioAnalyticsService: listReports error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a report by ID
   * @param {String} reportId 
   * @returns {Promise<Object>}
   */
  async deleteReport(reportId) {
    try {
      const result = await CustomReport.deleteOne({ reportId });
      return result.deletedCount > 0
        ? { success: true, message: `Report ${reportId} deleted` }
        : { success: false, error: 'Report not found' };
    } catch (error) {
      console.error('PortfolioAnalyticsService: deleteReport error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ====================================================================
  // 9. EXPORT UTILITIES
  // ====================================================================

  /**
   * Convert data array to CSV string
   * @param {Array<Object>} data
   * @param {Array<String>} [columns]
   * @returns {String}
   */
  exportToCSV(data, columns) {
    if (!data?.length) return '';
    const headers = columns || Object.keys(data[0]);
    const rows = data.map(row =>
      headers.map(h => {
        const v = row[h];
        if (v == null) return '';
        if (typeof v === 'string' && v.includes(',')) return `"${v}"`;
        if (v instanceof Date) return v.toISOString().slice(0, 10);
        return String(v);
      }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }

  // ====================================================================
  // 10. QUICK STATS — bot-friendly text summary
  // ====================================================================

  /**
   * Get formatted text summary for WhatsApp/bot display
   * @returns {Promise<String>}
   */
  async getQuickStats() {
    try {
      const r = await this.getDashboard();
      if (!r.success) return '❌ Unable to generate stats at this time.';

      const d = r.dashboard;
      let s = `📊 *System Dashboard*\n\n`;

      s += `🏠 *Properties*\n`;
      s += `  Total: ${d.properties.total} | Occupied: ${d.properties.occupied} | Vacant: ${d.properties.vacant}\n`;
      s += `  Occupancy: ${d.properties.occupancyRate}%\n\n`;

      s += `📋 *Tenancies*\n`;
      s += `  Active: ${d.tenancies.active} | Expiring Soon: ${d.tenancies.expiringSoon}\n\n`;

      s += `💰 *Financial*\n`;
      s += `  Rental Revenue: AED ${d.financial.totalRentalRevenue.toLocaleString()}\n`;
      s += `  Commissions: AED ${d.financial.totalCommissionsEarned.toLocaleString()}\n`;
      s += `  Sales Volume: AED ${d.financial.totalSalesVolume.toLocaleString()}\n\n`;

      s += `📈 *Deals*\n`;
      s += `  Total: ${d.deals.total} | Active: ${d.deals.active} | Closed: ${d.deals.closedThisMonth} (month)\n`;
      s += `  Conversion: ${d.deals.conversionRate}%\n\n`;

      s += `💬 *Communication*\n`;
      s += `  Messages: ${d.communication.messagesSent} | Templates: ${d.communication.templatesSent}\n`;
      s += `  Active Chats: ${d.communication.activeConversations}\n`;

      s += `\n⏱️ Generated in ${d.generationDuration}ms`;

      return s;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }
}

export default new PortfolioAnalyticsService();
