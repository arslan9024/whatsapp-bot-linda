/**
 * ========================================================================
 * ANALYTICS COMMANDS HANDLER
 * Phase 5: Feature 3 - Analytics & Reporting Dashboard
 * ========================================================================
 * 
 * WhatsApp bot commands for portfolio analytics:
 * - Dashboard overview (!dashboard, !stats)
 * - Property analytics (!property-stats)
 * - Tenant analytics (!tenant-stats)
 * - Financial summary (!financial)
 * - Agent leaderboard (!leaderboard, !agent-stats)
 * - Trend analysis (!trends)
 * - Snapshot generation (!snapshot)
 * - Report generation (!report)
 * 
 * @module AnalyticsCommands
 * @since Phase 5 - February 2026
 */

import analyticsService from '../Services/PortfolioAnalyticsService.js';

class AnalyticsCommands {

  /**
   * Get all available analytics commands
   */
  static getCommands() {
    return {
      '!dashboard': 'Full portfolio dashboard KPIs',
      '!stats': 'Quick stats summary',
      '!property-stats': 'Property portfolio analytics',
      '!tenant-stats': 'Tenant analytics & expiry alerts',
      '!financial': 'Financial breakdown (revenue, commissions)',
      '!leaderboard': 'Agent performance rankings',
      '!agent-stats': 'Individual agent analytics',
      '!trends': 'Historical trend data',
      '!snapshot': 'Generate daily KPI snapshot',
      '!report': 'Generate a custom report'
    };
  }

  // ====================================================================
  // MAIN ROUTER
  // ====================================================================

  /**
   * Route incoming commands to appropriate handler
   * @param {String} command - The command (!dashboard, !stats, etc.)
   * @param {String} args - Arguments string after the command
   * @param {Object} context - { from, fromName }
   * @returns {Promise<String>} Response text
   */
  static async handle(command, args, context) {
    switch (command) {
      case '!dashboard':      return AnalyticsCommands.handleDashboard();
      case '!stats':          return AnalyticsCommands.handleQuickStats();
      case '!property-stats': return AnalyticsCommands.handlePropertyStats(args);
      case '!tenant-stats':   return AnalyticsCommands.handleTenantStats();
      case '!financial':      return AnalyticsCommands.handleFinancial(args);
      case '!leaderboard':    return AnalyticsCommands.handleLeaderboard(args);
      case '!agent-stats':    return AnalyticsCommands.handleAgentStats(args, context);
      case '!trends':         return AnalyticsCommands.handleTrends(args);
      case '!snapshot':       return AnalyticsCommands.handleSnapshot();
      case '!report':         return AnalyticsCommands.handleReport(args, context);
      default:                return null;
    }
  }

  // ====================================================================
  // !dashboard — Full portfolio dashboard
  // ====================================================================

  static async handleDashboard() {
    try {
      const r = await analyticsService.getDashboard();
      if (!r.success) return `❌ Dashboard error: ${r.error}`;

      const d = r.dashboard;
      let msg = `📊 *PORTFOLIO DASHBOARD*\n`;
      msg += `─────────────────────\n\n`;

      // Properties
      msg += `🏠 *Properties*\n`;
      msg += `  Total: *${d.properties.total}*\n`;
      msg += `  Occupied: ${d.properties.occupied} | Vacant: ${d.properties.vacant}\n`;
      msg += `  For Rent: ${d.properties.forRent} | For Sale: ${d.properties.forSale}\n`;
      msg += `  Occupancy Rate: *${d.properties.occupancyRate}%*\n\n`;

      // Tenancies
      msg += `📋 *Tenancies*\n`;
      msg += `  Active: *${d.tenancies.active}*\n`;
      msg += `  ⚠️ Expiring Soon: ${d.tenancies.expiringSoon}\n`;
      msg += `  New This Month: ${d.tenancies.newThisMonth}\n\n`;

      // Financial
      msg += `💰 *Financial*\n`;
      msg += `  Rental Revenue: *AED ${d.financial.totalRentalRevenue.toLocaleString()}*\n`;
      msg += `  Service Charges: AED ${d.financial.totalServiceCharges.toLocaleString()}\n`;
      msg += `  Commissions Earned: AED ${d.financial.totalCommissionsEarned.toLocaleString()}\n`;
      msg += `  Commissions Pending: AED ${d.financial.totalCommissionsPending.toLocaleString()}\n`;
      msg += `  Sales Volume: AED ${d.financial.totalSalesVolume.toLocaleString()}\n`;
      msg += `  Avg Rent/Unit: AED ${d.financial.avgRentPerUnit.toLocaleString()}\n\n`;

      // Deals
      msg += `📈 *Deals*\n`;
      msg += `  Total: ${d.deals.total} | Active: ${d.deals.active}\n`;
      msg += `  Leads: ${d.deals.leads} | Closed (month): ${d.deals.closedThisMonth}\n`;
      msg += `  Conversion: *${d.deals.conversionRate}%*\n\n`;

      // People
      msg += `👥 *People*\n`;
      msg += `  Contacts: ${d.people.totalContacts} | Agents: ${d.people.agents}\n`;
      msg += `  New This Month: ${d.people.newThisMonth}\n\n`;

      // Communication
      msg += `💬 *Communication*\n`;
      msg += `  Messages: ${d.communication.messagesSent}\n`;
      msg += `  Templates: ${d.communication.templatesSent} (Delivered: ${d.communication.templatesDelivered})\n`;
      msg += `  Active Conversations: ${d.communication.activeConversations}\n\n`;

      msg += `⏱️ Generated in ${d.generationDuration}ms`;

      return msg;
    } catch (error) {
      return `❌ Dashboard error: ${error.message}`;
    }
  }

  // ====================================================================
  // !stats — Quick text summary
  // ====================================================================

  static async handleQuickStats() {
    try {
      return await analyticsService.getQuickStats();
    } catch (error) {
      return `❌ Stats error: ${error.message}`;
    }
  }

  // ====================================================================
  // !property-stats — Property analytics
  // ====================================================================

  /**
   * !property-stats [clusterId] [limit]
   */
  static async handlePropertyStats(args) {
    try {
      const params = AnalyticsCommands._parseArgs(args);
      const options = {
        clusterId: params.cluster,
        propertyId: params.property,
        limit: params.limit ? parseInt(params.limit) : 10
      };

      const r = await analyticsService.getPropertyAnalytics(options);
      if (!r.success) return `❌ Property stats error: ${r.error}`;

      let msg = `🏠 *PROPERTY ANALYTICS*\n`;
      msg += `─────────────────────\n\n`;

      // Summary
      msg += `📊 *Summary*\n`;
      msg += `  Total: ${r.summary.totalProperties}\n`;
      msg += `  Total Rental Revenue: AED ${r.summary.totalRentalRevenue.toLocaleString()}\n`;
      msg += `  Total Service Charges: AED ${r.summary.totalServiceCharges.toLocaleString()}\n`;
      msg += `  Avg Rent: AED ${r.summary.avgRent.toLocaleString()}\n`;
      msg += `  Avg Built-Up Area: ${r.summary.avgBuiltUpArea} sqft\n\n`;

      // Top properties
      if (r.properties.length > 0) {
        msg += `📋 *Properties (top ${Math.min(r.properties.length, 5)})*\n`;
        for (const p of r.properties.slice(0, 5)) {
          msg += `  • ${p.unitNumber || p.propertyId} — ${p.occupancyStatus}`;
          if (p.currentRent > 0) msg += ` | AED ${p.currentRent.toLocaleString()}/yr`;
          msg += `\n`;
        }
      }

      msg += `\n💡 Use: !property-stats cluster=CL001|limit=20`;

      return msg;
    } catch (error) {
      return `❌ Property stats error: ${error.message}`;
    }
  }

  // ====================================================================
  // !tenant-stats — Tenant analytics
  // ====================================================================

  static async handleTenantStats() {
    try {
      const r = await analyticsService.getTenantAnalytics();
      if (!r.success) return `❌ Tenant stats error: ${r.error}`;

      const s = r.summary;
      let msg = `📋 *TENANT ANALYTICS*\n`;
      msg += `─────────────────────\n\n`;

      msg += `📊 *Overview*\n`;
      msg += `  Active Tenancies: *${s.totalActive}*\n`;
      msg += `  Ended/Expired: ${s.totalEnded}\n`;
      msg += `  Renewal Rate: *${s.renewalRate}%*\n\n`;

      msg += `💰 *Lease Details*\n`;
      msg += `  Avg Lease Duration: ${s.avgLeaseDuration} months\n`;
      msg += `  Avg Rent: AED ${s.avgRent.toLocaleString()}\n`;
      msg += `  Avg Cheques: ${s.avgCheques}\n\n`;

      // Payment breakdown
      if (Object.keys(s.paymentBreakdown).length > 0) {
        msg += `💳 *Payment Breakdown*\n`;
        for (const [type, count] of Object.entries(s.paymentBreakdown)) {
          msg += `  ${type.replace('_', ' ')}: ${count} tenancies\n`;
        }
        msg += `\n`;
      }

      // Expiry alerts
      msg += `⚠️ *Expiry Alerts*\n`;
      msg += `  Expiring in 30 days: *${s.expiringIn30Days}*\n`;
      msg += `  Expiring in 60 days: *${s.expiringIn60Days}*\n`;

      msg += `\n📋 Total Records: ${r.totalRecords}`;

      return msg;
    } catch (error) {
      return `❌ Tenant stats error: ${error.message}`;
    }
  }

  // ====================================================================
  // !financial — Financial analytics
  // ====================================================================

  /**
   * !financial [startDate=2026-01-01] [endDate=2026-12-31]
   */
  static async handleFinancial(args) {
    try {
      const params = AnalyticsCommands._parseArgs(args);
      const r = await analyticsService.getFinancialAnalytics({
        startDate: params.start || params.startDate,
        endDate: params.end || params.endDate
      });
      if (!r.success) return `❌ Financial error: ${r.error}`;

      const f = r.financial;
      let msg = `💰 *FINANCIAL ANALYTICS*\n`;
      msg += `─────────────────────\n\n`;

      msg += `📊 *Revenue*\n`;
      msg += `  Rental: AED ${f.revenue.rental.toLocaleString()}\n`;
      msg += `  Sales: AED ${f.revenue.sales.toLocaleString()}\n`;
      msg += `  Commissions: AED ${f.revenue.commissions.toLocaleString()}\n`;
      msg += `  *Total: AED ${f.revenue.total.toLocaleString()}*\n\n`;

      msg += `💎 *Commissions*\n`;
      msg += `  Earned: AED ${f.commissions.earned.toLocaleString()}\n`;
      msg += `  Paid: AED ${f.commissions.paid.toLocaleString()}\n`;
      msg += `  Pending: AED ${f.commissions.pending.toLocaleString()}\n\n`;

      if (f.commissions.byMonth.length > 0) {
        msg += `📅 *Monthly Commissions*\n`;
        for (const m of f.commissions.byMonth.slice(-6)) {
          msg += `  ${m.month}: AED ${m.amount.toLocaleString()}\n`;
        }
        msg += `\n`;
      }

      msg += `🤝 *Deals*\n`;
      msg += `  Count: ${f.deals.count} | Value: AED ${f.deals.totalValue.toLocaleString()}\n`;
      msg += `  Avg Value: AED ${f.deals.avgValue.toLocaleString()}\n\n`;

      msg += `💳 *Payments*\n`;
      msg += `  Completed: ${f.payments.completed} | Pending: ${f.payments.pending}\n`;
      msg += `  Total Paid: AED ${f.payments.totalPaid.toLocaleString()}`;

      return msg;
    } catch (error) {
      return `❌ Financial error: ${error.message}`;
    }
  }

  // ====================================================================
  // !leaderboard — Agent rankings
  // ====================================================================

  static async handleLeaderboard(args) {
    try {
      const params = AnalyticsCommands._parseArgs(args);
      const r = await analyticsService.getAgentAnalytics({
        limit: params.limit ? parseInt(params.limit) : 10
      });
      if (!r.success) return `❌ Leaderboard error: ${r.error}`;

      let msg = `🏆 *AGENT LEADERBOARD*\n`;
      msg += `─────────────────────\n\n`;

      if (!r.agents.length) {
        return msg + 'No agent data available yet.';
      }

      msg += `📊 *Summary*\n`;
      msg += `  Total Agents: ${r.summary.totalAgents}\n`;
      msg += `  Total Earnings: AED ${r.summary.totalEarnings.toLocaleString()}\n`;
      msg += `  Total Deals: ${r.summary.totalDeals}\n`;
      msg += `  Avg Conversion: ${r.summary.avgConversionRate}%\n\n`;

      msg += `🏅 *Rankings*\n`;
      const medals = ['🥇', '🥈', '🥉'];
      for (const a of r.agents.slice(0, 10)) {
        const medal = a.rank <= 3 ? medals[a.rank - 1] : `#${a.rank}`;
        msg += `  ${medal} ${a.agentName} — AED ${a.lifetimeEarnings.toLocaleString()} (${a.closedDeals} closed, ${a.conversionRate}%)\n`;
      }

      return msg;
    } catch (error) {
      return `❌ Leaderboard error: ${error.message}`;
    }
  }

  // ====================================================================
  // !agent-stats — Single agent analytics
  // ====================================================================

  /**
   * !agent-stats [phone=971501234567]
   */
  static async handleAgentStats(args, context) {
    try {
      const params = AnalyticsCommands._parseArgs(args);
      const phone = params.phone || context.from;

      const r = await analyticsService.getAgentAnalytics({ agentPhone: phone });
      if (!r.success) return `❌ Agent stats error: ${r.error}`;

      const a = r.agent;
      let msg = `👤 *AGENT ANALYTICS*\n`;
      msg += `─────────────────────\n\n`;

      msg += `📋 *Agent:* ${a.agentName} (${a.agentPhone})\n\n`;

      msg += `📊 *Metrics*\n`;
      msg += `  Total Deals: ${a.metrics.totalDeals || 0}\n`;
      msg += `  Closed: ${a.metrics.closedDeals || 0}\n`;
      msg += `  Active: ${a.metrics.activeDeals || 0}\n`;
      msg += `  Conversion: ${a.metrics.conversionRate || 0}%\n\n`;

      msg += `💰 *Earnings*\n`;
      msg += `  Lifetime: AED ${(a.earnings.lifetime || 0).toLocaleString()}\n`;
      msg += `  Paid: AED ${(a.earnings.paid || 0).toLocaleString()}\n`;
      msg += `  Pending: AED ${(a.earnings.pending || 0).toLocaleString()}\n\n`;

      if (a.recentDeals.length > 0) {
        msg += `📈 *Recent Deals (${a.recentDeals.length})*\n`;
        for (const d of a.recentDeals.slice(0, 5)) {
          msg += `  • ${d.propertyId || 'N/A'} — ${d.status} (AED ${(d.salePrice || 0).toLocaleString()})\n`;
        }
      }

      return msg;
    } catch (error) {
      return `❌ Agent stats error: ${error.message}`;
    }
  }

  // ====================================================================
  // !trends — Historical trends
  // ====================================================================

  /**
   * !trends [metric=occupancyRate] [days=30]
   */
  static async handleTrends(args) {
    try {
      const params = AnalyticsCommands._parseArgs(args);
      const r = await analyticsService.getTrends({
        metric: params.metric,
        days: params.days ? parseInt(params.days) : 30
      });
      if (!r.success) return `❌ Trends error: ${r.error}`;

      if (r.message) return `📈 ${r.message}`;

      let msg = `📈 *TREND ANALYSIS*\n`;
      msg += `─────────────────────\n\n`;
      msg += `📅 Period: ${r.period.days} days (${r.snapshotCount} snapshots)\n\n`;

      if (r.metric && r.data) {
        msg += `📊 *${r.metric}*\n`;
        for (const pt of r.data.slice(-10)) {
          const dateStr = new Date(pt.date).toISOString().slice(0, 10);
          msg += `  ${dateStr}: ${typeof pt.value === 'number' && pt.value > 1000 ? pt.value.toLocaleString() : pt.value}\n`;
        }
      } else {
        const available = Object.keys(r.trends);
        msg += `📊 *Available Metrics:*\n`;
        for (const m of available) {
          const latest = r.trends[m][r.trends[m].length - 1];
          msg += `  • ${m}: ${latest?.value || 0} (latest)\n`;
        }
        msg += `\n💡 Use: !trends metric=occupancyRate|days=60`;
      }

      return msg;
    } catch (error) {
      return `❌ Trends error: ${error.message}`;
    }
  }

  // ====================================================================
  // !snapshot — Generate daily snapshot
  // ====================================================================

  static async handleSnapshot() {
    try {
      const r = await analyticsService.generateDailySnapshot();
      if (!r.success) return `❌ Snapshot error: ${r.error}`;

      let msg = `📸 *Daily Snapshot*\n`;
      msg += `─────────────────────\n\n`;
      msg += `✅ ${r.message}\n`;

      if (r.duration) {
        msg += `⏱️ Generated in ${r.duration}ms\n`;
      }

      if (r.snapshot) {
        msg += `\n📊 Key Metrics:\n`;
        msg += `  Properties: ${r.snapshot.properties?.total || 0}\n`;
        msg += `  Active Tenancies: ${r.snapshot.tenancies?.active || 0}\n`;
        msg += `  Rental Revenue: AED ${(r.snapshot.financial?.totalRentalRevenue || 0).toLocaleString()}\n`;
        msg += `  Active Deals: ${r.snapshot.deals?.active || 0}\n`;
      }

      return msg;
    } catch (error) {
      return `❌ Snapshot error: ${error.message}`;
    }
  }

  // ====================================================================
  // !report — Generate custom report
  // ====================================================================

  /**
   * !report type=financial_summary|start=2026-01-01|end=2026-12-31
   * 
   * Types: portfolio_overview, financial_summary, occupancy_report,
   *        agent_performance, commission_summary, tenant_report, deal_pipeline
   */
  static async handleReport(args, context) {
    try {
      const params = AnalyticsCommands._parseArgs(args);

      if (!params.type) {
        let msg = `📋 *Report Generator*\n`;
        msg += `─────────────────────\n\n`;
        msg += `Usage: !report type=<type>|start=YYYY-MM-DD|end=YYYY-MM-DD\n\n`;
        msg += `📊 *Available Types:*\n`;
        msg += `  • portfolio_overview — Full portfolio report\n`;
        msg += `  • financial_summary — Revenue & costs\n`;
        msg += `  • occupancy_report — Property occupancy\n`;
        msg += `  • agent_performance — Agent rankings\n`;
        msg += `  • commission_summary — Commission breakdown\n`;
        msg += `  • tenant_report — Tenant analytics\n`;
        msg += `  • deal_pipeline — Deal pipeline status\n`;
        return msg;
      }

      const r = await analyticsService.generateReport({
        name: params.name || `${params.type} - ${new Date().toISOString().slice(0, 10)}`,
        type: params.type,
        startDate: params.start || params.startDate,
        endDate: params.end || params.endDate,
        filters: {},
        createdBy: context.from
      });

      if (!r.success) return `❌ Report error: ${r.error}`;

      let msg = `📋 *Report Generated*\n`;
      msg += `─────────────────────\n\n`;
      msg += `✅ ${r.name}\n`;
      msg += `  ID: ${r.reportId}\n`;
      msg += `  Type: ${r.type}\n`;
      msg += `  Status: ${r.status}\n`;
      msg += `  Period: ${new Date(r.period.startDate).toISOString().slice(0, 10)} → ${new Date(r.period.endDate).toISOString().slice(0, 10)}\n\n`;
      msg += `💡 View full report via API:\n`;
      msg += `  GET /api/analytics/reports/${r.reportId}`;

      return msg;
    } catch (error) {
      return `❌ Report error: ${error.message}`;
    }
  }

  // ====================================================================
  // UTILITY: Parse pipe-separated arguments
  // ====================================================================

  static _parseArgs(argString) {
    const params = {};
    if (!argString || !argString.trim()) return params;

    const parts = argString.split('|');
    for (const part of parts) {
      const eq = part.indexOf('=');
      if (eq > 0) {
        const key = part.substring(0, eq).trim().toLowerCase();
        const value = part.substring(eq + 1).trim();
        params[key] = value;
      }
    }
    return params;
  }
}

export default AnalyticsCommands;
