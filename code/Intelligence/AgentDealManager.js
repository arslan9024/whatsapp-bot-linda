/**
 * Agent Deal Manager
 * Tracks agent performance, deals, and commission earnings
 * 
 * Features:
 * - Track agent properties and deals
 * - Calculate total commissions (pending, paid)
 * - Performance metrics
 * - Earnings summary
 */

import { logger } from '../Integration/Google/utils/logger.js';

class AgentDealManager {
  constructor(config = {}) {
    this.agents = new Map();  // agentId → agent profile
    this.dealsCache = new Map();  // agentId → [dealIds]
    this.commissionsCache = new Map();  // agentId → commission history
  }

  /**
   * Register agent
   */
  registerAgent(personaId, agentName, agency, commissionRate = 5) {
    try {
      const agent = {
        agentId: personaId,
        agentName: agentName,
        agency: agency,
        phone: null,

        commissionRate: commissionRate,
        activeDeals: [],
        closedDeals: [],

        metrics: {
          totalPropertiesListed: 0,
          activeProperties: 0,
          dealsClosedThisYear: 0,
          dealsActive: 0,
          successRate: '0%',
          averageDaysToClose: 0
        },

        commissionTracking: {
          totalEarnedThisYear: 0,
          pendingCommission: 0,
          paidCommission: 0,
          averageCommissionRate: commissionRate,
          commissions: []
        },

        registeredAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      this.agents.set(personaId, agent);
      this.dealsCache.set(personaId, []);
      this.commissionsCache.set(personaId, []);

      logger.info(`✅ Agent registered: ${agentName} (${agency})`);
      return agent;

    } catch (error) {
      logger.error(`❌ Error registering agent: ${error.message}`);
      return null;
    }
  }

  /**
   * Add deal to agent
   */
  async addDealToAgent(agentId, dealId, dealDetails) {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        logger.warn(`⚠️ Agent not found: ${agentId}`);
        return null;
      }

      agent.activeDeals.push({
        dealId: dealId,
        propertyId: dealDetails.propertyId,
        clientName: dealDetails.clientName,
        stage: dealDetails.stage,
        addedAt: new Date().toISOString()
      });

      agent.metrics.dealsActive = agent.activeDeals.length;
      agent.lastUpdated = new Date().toISOString();

      logger.info(`✅ Deal added to agent ${agentId}: ${dealId}`);
      return agent;

    } catch (error) {
      logger.error(`❌ Error adding deal to agent: ${error.message}`);
      return null;
    }
  }

  /**
   * Record commission from closed deal
   */
  async recordCommission(agentId, dealId, finalPrice, commissionRate = null) {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        logger.warn(`⚠️ Agent not found: ${agentId}`);
        return null;
      }

      const rate = commissionRate || agent.commissionRate;
      const commissionAmount = (finalPrice * rate) / 100;

      const commission = {
        commissionId: `comm-${Date.now()}`,
        dealId: dealId,
        finalPrice: finalPrice,
        commissionRate: rate,
        commissionAmount: parseFloat(commissionAmount.toFixed(2)),
        status: 'agreed',  // pending, agreed, paid
        agreedAt: new Date().toISOString(),
        paidAt: null
      };

      // Update tracking
      agent.commissionTracking.commissions.push(commission);
      agent.commissionTracking.pendingCommission += commissionAmount;
      agent.commissionTracking.totalEarnedThisYear += commissionAmount;

      // Move deal from active to closed
      const dealIdx = agent.activeDeals.findIndex(d => d.dealId === dealId);
      if (dealIdx !== -1) {
        const deal = agent.activeDeals.splice(dealIdx, 1)[0];
        agent.closedDeals.push(deal);
      }

      agent.metrics.dealsActive = agent.activeDeals.length;
      agent.metrics.dealsClosedThisYear += 1;
      
      // Update success rate
      const totalDeals = agent.closedDeals.length + agent.activeDeals.length;
      agent.metrics.successRate = totalDeals > 0 
        ? `${((agent.closedDeals.length / totalDeals) * 100).toFixed(1)}%`
        : '0%';

      agent.lastUpdated = new Date().toISOString();

      logger.info(`✅ Commission recorded: ${agentId} → ${commission.commissionAmount} AED from deal ${dealId}`);
      return commission;

    } catch (error) {
      logger.error(`❌ Error recording commission: ${error.message}`);
      return null;
    }
  }

  /**
   * Mark commission as paid
   */
  async markCommissionPaid(agentId, commissionId) {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        logger.warn(`⚠️ Agent not found: ${agentId}`);
        return null;
      }

      const commission = agent.commissionTracking.commissions.find(c => c.commissionId === commissionId);
      if (!commission) {
        logger.warn(`⚠️ Commission not found: ${commissionId}`);
        return null;
      }

      commission.status = 'paid';
      commission.paidAt = new Date().toISOString();

      agent.commissionTracking.pendingCommission -= commission.commissionAmount;
      agent.commissionTracking.paidCommission += commission.commissionAmount;

      logger.info(`✅ Commission marked as paid: ${commissionId} → ${commission.commissionAmount} AED`);
      return commission;

    } catch (error) {
      logger.error(`❌ Error marking commission paid: ${error.message}`);
      return null;
    }
  }

  /**
   * Get agent profile
   */
  getAgent(agentId) {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  getAllAgents() {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent commission summary
   */
  getAgentCommissionSummary(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    return {
      agentId: agentId,
      agentName: agent.agentName,
      agency: agent.agency,
      commissionTracking: agent.commissionTracking,
      metrics: agent.metrics
    };
  }

  /**
   * Get top performing agents
   */
  getTopAgents(limit = 5) {
    return Array.from(this.agents.values())
      .sort((a, b) => b.commissionTracking.totalEarnedThisYear - a.commissionTracking.totalEarnedThisYear)
      .slice(0, limit);
  }

  /**
   * Get agents by earnings range
   */
  getAgentsByEarnings(minEarnings, maxEarnings) {
    return Array.from(this.agents.values())
      .filter(a => {
        const earnings = a.commissionTracking.totalEarnedThisYear;
        return earnings >= minEarnings && earnings <= maxEarnings;
      });
  }

  /**
   * Generate agent performance report
   */
  generateAgentReport(agentId) {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) return null;

      const report = {
        agentId: agentId,
        agentName: agent.agentName,
        agency: agent.agency,
        generatedAt: new Date().toISOString(),

        performanceMetrics: {
          activeDeals: agent.activeDeals.length,
          closedDeals: agent.closedDeals.length,
          totalDeals: agent.activeDeals.length + agent.closedDeals.length,
          successRate: agent.metrics.successRate,
          activeProperties: agent.metrics.activeProperties,
          propertiesListed: agent.metrics.totalPropertiesListed
        },

        commissionMetrics: {
          totalEarned: agent.commissionTracking.totalEarnedThisYear,
          pendingCommission: agent.commissionTracking.pendingCommission,
          paidCommission: agent.commissionTracking.paidCommission,
          averageCommissionRate: agent.commissionTracking.averageCommissionRate,
          totalCommissionTransactions: agent.commissionTracking.commissions.length
        },

        activeDeals: agent.activeDeals,
        recentClosedDeals: agent.closedDeals.slice(-5),
        pendingCommissions: agent.commissionTracking.commissions.filter(c => c.status === 'agreed'),
        paidCommissions: agent.commissionTracking.commissions.filter(c => c.status === 'paid')
      };

      return report;

    } catch (error) {
      logger.error(`❌ Error generating agent report: ${error.message}`);
      return null;
    }
  }
}

export default AgentDealManager;
