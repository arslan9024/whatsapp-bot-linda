/**
 * ========================================================================
 * COMMISSION COMMANDS HANDLER
 * Phase 20: Advanced Features & Dashboard
 * ========================================================================
 * 
 * WhatsApp bot commands for commission management:
 * - Create/track deals
 * - Check earnings
 * - Request payments
 * - View commission reports
 * 
 * @module CommissionCommands
 * @since Phase 20 - February 17, 2026
 */

import CommissionService from '../Services/CommissionService.js';

class CommissionCommands {
  
  /**
   * Get all available commission commands
   * @returns {Object} Command definitions
   */
  static getCommands() {
    return {
      '!new-deal': 'Create a new deal',
      '!close-deal': 'Close a deal and generate commission',
      '!my-earnings': 'Check your earnings',
      '!pending-earnings': 'Check pending earnings',
      '!commission-report': 'Get commission report for a period',
      '!request-payment': 'Request payment for earned commissions',
      '!payment-status': 'Check payment status',
      '!deal-status': 'Check status of a deal',
      '!agent-metrics': 'View your performance metrics'
    };
  }
  
  /**
   * Parse deal creation command
   * !new-deal property=Villa|address=Dubai|price=1500000|commission=2.5
   */
  static async handleNewDeal(args, context) {
    try {
      const agentPhone = context.from;
      const params = CommissionCommands.parseParams(args);
      
      if (!params.address || !params.price) {
        return '❌ Usage: !new-deal property=Villa|address=Location|price=1000000|commission=2.5';
      }
      
      const dealData = {
        agentPhone,
        propertyType: params.property || 'residential',
        propertyAddress: params.address,
        salePrice: parseFloat(params.price),
        commissionPercent: parseFloat(params.commission) || 2.5,
        status: 'lead',
        description: params.notes || ''
      };
      
      const result = await CommissionService.createDeal(dealData);
      
      if (result.success) {
        return `✅ Deal Created!\nDeal ID: ${result.deal.dealId}\nProperty: ${params.address}\nPrice: AED ${params.price}`;
      }
      
      return `❌ Failed to create deal: ${result.error}`;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }
  
  /**
   * Close deal and generate commission
   * !close-deal deal-123456789
   */
  static async handleCloseDeal(args, context) {
    try {
      if (!args) {
        return '❌ Usage: !close-deal <deal-id>';
      }
      
      const dealId = args.split(' ')[0].trim();
      const result = await CommissionService.closeDealAndGenerateCommission(dealId);
      
      if (result.success) {
        const comm = result.commission;
        return `✅ Deal Closed!\n\nCommission Generated:\nAmount: AED ${comm.commissionAmount}\nStatus: ${comm.status}\nCommission ID: ${comm.commissionId}`;
      }
      
      return `❌ Failed to close deal: ${result.error}`;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }
  
  /**
   * Get earnings for specific period
   * !my-earnings [month|year|lifetime]
   */
  static async handleMyEarnings(args, context) {
    try {
      const period = args?.trim() || 'lifetime';
      const agentPhone = context.from;
      
      if (!['month', 'year', 'lifetime'].includes(period)) {
        return '❌ Usage: !my-earnings [month|year|lifetime]';
      }
      
      const earnings = await CommissionService.getEarnings(agentPhone, period);
      const metrics = await CommissionService.getAgentMetrics(agentPhone);
      
      let response = `💰 Your Earnings (${period}):\nAED ${earnings.toLocaleString()}\n\n`;
      
      if (metrics) {
        response += `📊 Performance:\nDeals: ${metrics.metrics.totalDeals}\nClosed: ${metrics.metrics.closedDeals}\nPending: ${metrics.earnings.pending}`;
      }
      
      return response;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }
  
  /**
   * Check pending earnings
   * !pending-earnings
   */
  static async handlePendingEarnings(args, context) {
    try {
      const agentPhone = context.from;
      const pending = await CommissionService.getPendingEarnings(agentPhone);
      
      return `⏳ Pending Earnings:\nAED ${pending.toLocaleString()}\n\nWaiting for processing and payment.`;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }
  
  /**
   * Generate commission report
   * !commission-report [start-date] [end-date]
   */
  static async handleCommissionReport(args, context) {
    try {
      const agentPhone = context.from;
      const [startDate, endDate] = (args || '').split('|').map(d => d?.trim());
      
      const dateRange = {};
      if (startDate) dateRange.startDate = startDate;
      if (endDate) dateRange.endDate = endDate;
      
      const report = await CommissionService.generateCommissionReport(agentPhone, dateRange);
      
      if (!report.success) {
        return `❌ Failed to generate report: ${report.error}`;
      }
      
      const s = report.summary;
      return `📋 Commission Report\n\nTotal Commissions: ${s.totalCommissions}\nTotal Amount: AED ${s.totalAmount}\nPaid: AED ${s.paidAmount}\nPending: AED ${s.pendingAmount}`;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }
  
  /**
   * Request payment
   * !request-payment
   */
  static async handleRequestPayment(args, context) {
    try {
      const agentPhone = context.from;
      const pending = await CommissionService.getPendingEarnings(agentPhone);
      
      if (pending <= 0) {
        return '❌ No pending commissions to request payment for.';
      }
      
      const paymentData = {
        agentPhone,
        totalAmount: pending,
        paymentMethod: 'bank_transfer',
        status: 'pending'
      };
      
      const result = await CommissionService.createPayment(paymentData);
      
      if (result.success) {
        return `✅ Payment request submitted!\nAmount: AED ${pending.toLocaleString()}\nPayment ID: ${result.payment.paymentId}\n\nYour payment will be processed within 5 business days.`;
      }
      
      return `❌ Failed to submit payment request: ${result.error}`;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }
  
  /**
   * Check payment status
   * !payment-status
   */
  static async handlePaymentStatus(args, context) {
    try {
      const agentPhone = context.from;
      const payments = await CommissionService.getPaymentHistory(agentPhone, { limit: 3 });
      
      if (payments.length === 0) {
        return 'No payment history found.';
      }
      
      let response = '💳 Recent Payments:\n\n';
      
      for (const payment of payments) {
        response += `ID: ${payment.paymentId.substring(0, 12)}...\nAmount: AED ${payment.totalAmount}\nStatus: ${payment.status}\nDate: ${payment.requestDate.toLocaleDateString()}\n\n`;
      }
      
      return response;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }
  
  /**
   * Check deal status
   * !deal-status deal-123456789
   */
  static async handleDealStatus(args, context) {
    try {
      if (!args) {
        return '❌ Usage: !deal-status <deal-id>';
      }
      
      // This would require a getDealById method in CommissionService
      // For now, return informational message
      const dealId = args.split(' ')[0].trim();
      return `📌 Deal Status Request:\nDeal ID: ${dealId}\n\nFeature available in dashboard.`;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }
  
  /**
   * View agent metrics
   * !agent-metrics
   */
  static async handleAgentMetrics(args, context) {
    try {
      const agentPhone = context.from;
      const metrics = await CommissionService.getAgentMetrics(agentPhone);
      
      if (!metrics) {
        return 'No metrics available yet. Start making deals to track performance!';
      }
      
      const m = metrics;
      return `📊 Your Performance:\n\n` +
        `Deals: ${m.metrics.totalDeals} total, ${m.metrics.closedDeals} closed\n` +
        `Active: ${m.metrics.activeDeals}\n\n` +
        `💰 Earnings:\n` +
        `Lifetime: AED ${m.earnings.lifetime.toLocaleString()}\n` +
        `Paid: AED ${m.earnings.paid.toLocaleString()}\n` +
        `Pending: AED ${m.earnings.pending.toLocaleString()}`;
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }
  
  /**
   * Parse command parameters (format: key=value|key=value)
   */
  static parseParams(str) {
    const params = {};
    if (!str) return params;
    
    str.split('|').forEach(pair => {
      const [key, value] = pair.split('=').map(s => s?.trim());
      if (key && value) {
        params[key.toLowerCase()] = value;
      }
    });
    
    return params;
  }
  
  /**
   * Process commission command
   * @param {String} command - Command name
   * @param {String} args - Command arguments
   * @param {Object} context - Message context
   * @returns {Promise<String>} Response text
   */
  static async processCommand(command, args, context) {
    const handlers = {
      '!new-deal': CommissionCommands.handleNewDeal,
      '!close-deal': CommissionCommands.handleCloseDeal,
      '!my-earnings': CommissionCommands.handleMyEarnings,
      '!pending-earnings': CommissionCommands.handlePendingEarnings,
      '!commission-report': CommissionCommands.handleCommissionReport,
      '!request-payment': CommissionCommands.handleRequestPayment,
      '!payment-status': CommissionCommands.handlePaymentStatus,
      '!deal-status': CommissionCommands.handleDealStatus,
      '!agent-metrics': CommissionCommands.handleAgentMetrics
    };
    
    const handler = handlers[command];
    
    if (!handler) {
      return `❌ Unknown commission command. Available commands:\n${Object.keys(handlers).join('\n')}`;
    }
    
    return await handler.call(null, args, context);
  }
}

export default CommissionCommands;
