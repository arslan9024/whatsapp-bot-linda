/**
 * ========================================================================
 * COMMISSION SERVICE
 * Phase 20: Advanced Features & Dashboard
 * ========================================================================
 * 
 * Manages all commission-related operations:
 * - CRUD operations for commissions
 * - Calculations and aggregations
 * - Payment processing
 * - Agent metrics tracking
 * - Commission reports
 * 
 * @module CommissionService
 * @since Phase 20 - February 17, 2026
 */

import {
  Commission,
  Payment,
  AgentMetrics,
  Deal,
  CommissionReport
} from '../Database/CommissionSchema.js';

class CommissionService {
  
  // ====================================================================
  // COMMISSION CRUD OPERATIONS
  // ====================================================================
  
  /**
   * Create a new commission
   * @param {Object} commissionData - Commission details
   * @returns {Promise<Object>} Created commission
   */
  async createCommission(commissionData) {
    try {
      const commissionId = `comm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const commission = new Commission({
        commissionId,
        ...commissionData,
        earnedDate: commissionData.earnedDate || new Date()
      });
      
      await commission.save();
      
      // Update agent metrics
      await this.updateAgentMetrics(commissionData.agentPhone);
      
      return {
        success: true,
        commission: commission.toObject(),
        message: 'Commission created successfully'
      };
    } catch (error) {
      console.error('CommissionService: createCommission error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get commission by ID
   * @param {String} commissionId - Commission ID
   * @returns {Promise<Object|null>} Commission data
   */
  async getCommissionById(commissionId) {
    try {
      return await Commission.findOne({ commissionId });
    } catch (error) {
      console.error('CommissionService: getCommissionById error:', error.message);
      return null;
    }
  }
  
  /**
   * Get all commissions for an agent
   * @param {String} agentPhone - Agent phone number
   * @param {Object} options - Query options (dateRange, status, etc.)
   * @returns {Promise<Array>} Array of commissions
   */
  async getCommissionsByAgent(agentPhone, options = {}) {
    try {
      let query = { agentPhone };
      
      if (options.status) {
        query.status = options.status;
      }
      
      if (options.dateRange) {
        query.earnedDate = {
          $gte: new Date(options.dateRange.start),
          $lte: new Date(options.dateRange.end)
        };
      }
      
      return await Commission.find(query)
        .sort({ earnedDate: -1 })
        .limit(options.limit || 100)
        .skip(options.skip || 0);
    } catch (error) {
      console.error('CommissionService: getCommissionsByAgent error:', error.message);
      return [];
    }
  }
  
  /**
   * Update commission status
   * @param {String} commissionId - Commission ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated commission
   */
  async updateCommission(commissionId, updates) {
    try {
      const commission = await Commission.findOneAndUpdate(
        { commissionId },
        { ...updates, updatedAt: new Date() },
        { new: true }
      );
      
      if (commission) {
        await this.updateAgentMetrics(commission.agentPhone);
      }
      
      return {
        success: !!commission,
        commission: commission?.toObject(),
        message: commission ? 'Commission updated' : 'Commission not found'
      };
    } catch (error) {
      console.error('CommissionService: updateCommission error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Mark commission as paid
   * @param {String} commissionId - Commission ID
   * @param {String} paymentId - Payment transaction ID
   * @returns {Promise<Object>} Updated commission
   */
  async markAsPaid(commissionId, paymentId) {
    return this.updateCommission(commissionId, {
      status: 'paid',
      paidDate: new Date(),
      transactionId: paymentId
    });
  }
  
  // ====================================================================
  // COMMISSION CALCULATIONS
  // ====================================================================
  
  /**
   * Calculate commission amount from sale price
   * @param {Number} salePrice - Property sale price
   * @param {Number} commissionPercent - Commission percentage
   * @param {Object} split - Commission split details
   * @returns {Object} Calculated amounts
   */
  calculateCommissionAmount(salePrice, commissionPercent, split = {}) {
    const totalCommission = (salePrice * commissionPercent) / 100;
    
    const agentPercent = split.agentPercent || 100;
    const brokerPercent = split.brokerPercent || 0;
    
    return {
      totalCommission,
      agentAmount: (totalCommission * agentPercent) / 100,
      brokerAmount: (totalCommission * brokerPercent) / 100
    };
  }
  
  /**
   * Get earnings for agent in specific period
   * @param {String} agentPhone - Agent phone
   * @param {String} period - 'month' | 'year' | 'lifetime'
   * @returns {Promise<Number>} Total earnings
   */
  async getEarnings(agentPhone, period = 'lifetime') {
    try {
      let query = { agentPhone, status: 'paid' };
      
      const now = new Date();
      
      if (period === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        query.paidDate = { $gte: startOfMonth };
      } else if (period === 'year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        query.paidDate = { $gte: startOfYear };
      }
      
      const result = await Commission.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
      ]);
      
      return result[0]?.total || 0;
    } catch (error) {
      console.error('CommissionService: getEarnings error:', error.message);
      return 0;
    }
  }
  
  /**
   * Get pending earnings for agent
   * @param {String} agentPhone - Agent phone
   * @returns {Promise<Number>} Pending amount
   */
  async getPendingEarnings(agentPhone) {
    try {
      const result = await Commission.aggregate([
        {
          $match: {
            agentPhone,
            status: { $in: ['pending', 'earned', 'processing'] }
          }
        },
        { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
      ]);
      
      return result[0]?.total || 0;
    } catch (error) {
      console.error('CommissionService: getPendingEarnings error:', error.message);
      return 0;
    }
  }
  
  // ====================================================================
  // AGENT METRICS
  // ====================================================================
  
  /**
   * Update aggregated metrics for an agent
   * @param {String} agentPhone - Agent phone
   * @returns {Promise<Object>} Updated metrics
   */
  async updateAgentMetrics(agentPhone) {
    try {
      // Get commission data
      const commissionData = await Commission.aggregate([
        { $match: { agentPhone } },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$commissionAmount' },
            paidEarnings: {
              $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$commissionAmount', 0] }
            },
            pendingEarnings: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['pending', 'earned', 'processing']] },
                  '$commissionAmount',
                  0
                ]
              }
            },
            totalDeals: { $sum: 1 }
          }
        }
      ]);
      
      // Get deal data
      const dealData = await Deal.aggregate([
        { $match: { agentPhone } },
        {
          $group: {
            _id: null,
            closedDeals: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
            totalDeals: { $sum: 1 }
          }
        }
      ]);
      
      const commMetrics = commissionData[0] || {};
      const dealMetrics = dealData[0] || {};
      
      const metrics = {
        agentPhone,
        metrics: {
          totalDeals: dealMetrics.totalDeals || 0,
          closedDeals: dealMetrics.closedDeals || 0,
          activeDeals: Math.max(0, (dealMetrics.totalDeals || 0) - (dealMetrics.closedDeals || 0))
        },
        earnings: {
          lifetime: commMetrics.totalEarnings || 0,
          paid: commMetrics.paidEarnings || 0,
          pending: commMetrics.pendingEarnings || 0
        },
        updatedAt: new Date()
      };
      
      await AgentMetrics.findOneAndUpdate(
        { agentPhone },
        metrics,
        { upsert: true, new: true }
      );
      
      return metrics;
    } catch (error) {
      console.error('CommissionService: updateAgentMetrics error:', error.message);
      return null;
    }
  }
  
  /**
   * Get agent metrics
   * @param {String} agentPhone - Agent phone
   * @returns {Promise<Object>} Agent metrics
   */
  async getAgentMetrics(agentPhone) {
    try {
      return await AgentMetrics.findOne({ agentPhone });
    } catch (error) {
      console.error('CommissionService: getAgentMetrics error:', error.message);
      return null;
    }
  }
  
  // ====================================================================
  // PAYMENT OPERATIONS
  // ====================================================================
  
  /**
   * Create payment transaction
   * @param {Object} paymentData - Payment details
   * @returns {Promise<Object>} Created payment
   */
  async createPayment(paymentData) {
    try {
      const paymentId = `pay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const payment = new Payment({
        paymentId,
        ...paymentData,
        requestDate: new Date()
      });
      
      await payment.save();
      
      return {
        success: true,
        payment: payment.toObject(),
        message: 'Payment created'
      };
    } catch (error) {
      console.error('CommissionService: createPayment error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get payment history for agent
   * @param {String} agentPhone - Agent phone
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Payment history
   */
  async getPaymentHistory(agentPhone, options = {}) {
    try {
      let query = { agentPhone };
      
      if (options.status) {
        query.status = options.status;
      }
      
      return await Payment.find(query)
        .sort({ requestDate: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0);
    } catch (error) {
      console.error('CommissionService: getPaymentHistory error:', error.message);
      return [];
    }
  }
  
  /**
   * Mark payment as completed
   * @param {String} paymentId - Payment ID
   * @param {String} receipt - Receipt URL
   * @returns {Promise<Object>} Updated payment
   */
  async completePayment(paymentId, receipt) {
    try {
      const payment = await Payment.findOneAndUpdate(
        { paymentId },
        {
          status: 'completed',
          completeDate: new Date(),
          receipt
        },
        { new: true }
      );
      
      // Mark all commissions as paid
      if (payment?.commissionIds) {
        await Commission.updateMany(
          { commissionId: { $in: payment.commissionIds } },
          { status: 'paid', paidDate: new Date(), transactionId: paymentId }
        );
      }
      
      return {
        success: !!payment,
        payment: payment?.toObject()
      };
    } catch (error) {
      console.error('CommissionService: completePayment error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // ====================================================================
  // DEAL OPERATIONS
  // ====================================================================
  
  /**
   * Create a new deal
   * @param {Object} dealData - Deal details
   * @returns {Promise<Object>} Created deal
   */
  async createDeal(dealData) {
    try {
      const dealId = `deal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const deal = new Deal({
        dealId,
        ...dealData,
        timeline: {
          createdAt: new Date()
        }
      });
      
      await deal.save();
      
      return {
        success: true,
        deal: deal.toObject(),
        message: 'Deal created'
      };
    } catch (error) {
      console.error('CommissionService: createDeal error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Update deal status
   * @param {String} dealId - Deal ID
   * @param {String} newStatus - New status
   * @returns {Promise<Object>} Updated deal
   */
  async updateDealStatus(dealId, newStatus) {
    try {
      const update = {
        status: newStatus,
        updatedAt: new Date()
      };
      
      // Set timeline fields based on status
      if (newStatus === 'closed') {
        update['timeline.closeDate'] = new Date();
      } else if (newStatus === 'inspection') {
        update['timeline.inspectionDate'] = new Date();
      }
      
      const deal = await Deal.findOneAndUpdate(
        { dealId },
        update,
        { new: true }
      );
      
      if (deal?.agentPhone) {
        await this.updateAgentMetrics(deal.agentPhone);
      }
      
      return {
        success: !!deal,
        deal: deal?.toObject()
      };
    } catch (error) {
      console.error('CommissionService: updateDealStatus error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get deals for agent
   * @param {String} agentPhone - Agent phone
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Deals
   */
  async getDealsByAgent(agentPhone, options = {}) {
    try {
      let query = { agentPhone };
      
      if (options.status) {
        query.status = options.status;
      }
      
      return await Deal.find(query)
        .sort({ 'timeline.createdAt': -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0);
    } catch (error) {
      console.error('CommissionService: getDealsByAgent error:', error.message);
      return [];
    }
  }
  
  /**
   * Mark deal as closed and generate commission
   * @param {String} dealId - Deal ID
   * @returns {Promise<Object>} Commission generated
   */
  async closeDealAndGenerateCommission(dealId) {
    try {
      const deal = await Deal.findOne({ dealId });
      
      if (!deal) {
        return { success: false, error: 'Deal not found' };
      }
      
      // Update deal status
      await this.updateDealStatus(dealId, 'closed');
      
      // Calculate commission
      const { agentAmount } = this.calculateCommissionAmount(
        deal.salePrice,
        deal.commissionPercent,
        deal.commissionSplit
      );
      
      // Create commission record
      const commission = await this.createCommission({
        agentPhone: deal.agentPhone,
        agentName: deal.agentName || 'Unknown',
        dealId,
        propertyAddress: deal.propertyAddress,
        propertyType: deal.propertyType,
        salePrice: deal.salePrice,
        commissionPercent: deal.commissionPercent,
        commissionAmount: agentAmount,
        commissionSplit: deal.commissionSplit,
        status: 'earned',
        earnedDate: new Date()
      });
      
      // Update deal with commission reference
      await Deal.findOneAndUpdate(
        { dealId },
        {
          commissionGenerated: true,
          commissionAmount: agentAmount,
          commissionId: commission.commission?.commissionId
        }
      );
      
      return {
        success: true,
        commission: commission.commission,
        message: 'Deal closed and commission generated'
      };
    } catch (error) {
      console.error('CommissionService: closeDealAndGenerateCommission error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // ====================================================================
  // REPORTING
  // ====================================================================
  
  /**
   * Generate commission report for agent
   * @param {String} agentPhone - Agent phone
   * @param {Object} dateRange - Date range
   * @returns {Promise<Object>} Commission report
   */
  async generateCommissionReport(agentPhone, dateRange = {}) {
    try {
      const startDate = new Date(dateRange.startDate || '2026-01-01');
      const endDate = new Date(dateRange.endDate || new Date());
      
      const commissions = await Commission.find({
        agentPhone,
        earnedDate: { $gte: startDate, $lte: endDate }
      }).sort({ earnedDate: -1 });
      
      const summary = {
        totalCommissions: commissions.length,
        totalAmount: commissions.reduce((sum, c) => sum + (c.commissionAmount || 0), 0),
        paidAmount: commissions
          .filter(c => c.status === 'paid')
          .reduce((sum, c) => sum + (c.commissionAmount || 0), 0),
        pendingAmount: commissions
          .filter(c => c.status !== 'paid')
          .reduce((sum, c) => sum + (c.commissionAmount || 0), 0)
      };
      
      return {
        success: true,
        reportId: `rep-${Date.now()}`,
        agentPhone,
        period: { startDate, endDate },
        summary,
        commissions,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('CommissionService: generateCommissionReport error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new CommissionService();
