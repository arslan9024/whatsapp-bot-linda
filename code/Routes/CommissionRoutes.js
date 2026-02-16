/**
 * ========================================================================
 * COMMISSION API ROUTES
 * Phase 20: Advanced Features & Dashboard
 * ========================================================================
 * 
 * Express routes for commission management:
 * - CRUD operations for commissions
 * - Agent metrics and analytics
 * - Payment processing
 * - Deal management
 * 
 * @module CommissionRoutes
 * @since Phase 20 - February 17, 2026
 */

import express from 'express';
import CommissionService from '../Services/CommissionService.js';

const router = express.Router();

// ========================================================================
// COMMISSION ENDPOINTS
// ========================================================================

/**
 * POST /api/commissions
 * Create a new commission
 */
router.post('/', async (req, res) => {
  try {
    const result = await CommissionService.createCommission(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/commissions/:commissionId
 * Get commission by ID
 */
router.get('/:commissionId', async (req, res) => {
  try {
    const commission = await CommissionService.getCommissionById(req.params.commissionId);
    
    if (!commission) {
      return res.status(404).json({
        success: false,
        error: 'Commission not found'
      });
    }
    
    res.json({
      success: true,
      commission: commission.toObject()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/commissions/agent/:agentPhone
 * Get all commissions for an agent
 */
router.get('/agent/:agentPhone', async (req, res) => {
  try {
    const options = {
      status: req.query.status,
      limit: parseInt(req.query.limit) || 100,
      skip: parseInt(req.query.skip) || 0
    };
    
    if (req.query.dateRange) {
      options.dateRange = JSON.parse(req.query.dateRange);
    }
    
    const commissions = await CommissionService.getCommissionsByAgent(
      req.params.agentPhone,
      options
    );
    
    res.json({
      success: true,
      count: commissions.length,
      commissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/commissions/:commissionId
 * Update commission
 */
router.put('/:commissionId', async (req, res) => {
  try {
    const result = await CommissionService.updateCommission(
      req.params.commissionId,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/commissions/:commissionId/mark-paid
 * Mark commission as paid
 */
router.post('/:commissionId/mark-paid', async (req, res) => {
  try {
    const result = await CommissionService.markAsPaid(
      req.params.commissionId,
      req.body.paymentId
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================================================
// EARNINGS ENDPOINTS
// ========================================================================

/**
 * GET /api/commissions/agent/:agentPhone/earnings
 * Get earnings for an agent
 */
router.get('/agent/:agentPhone/earnings', async (req, res) => {
  try {
    const period = req.query.period || 'lifetime';
    
    const earnings = await CommissionService.getEarnings(
      req.params.agentPhone,
      period
    );
    
    const pending = await CommissionService.getPendingEarnings(
      req.params.agentPhone
    );
    
    res.json({
      success: true,
      period,
      earnings,
      pending,
      agentPhone: req.params.agentPhone
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/commissions/calculate
 * Calculate commission from sale price
 */
router.post('/calculate', (req, res) => {
  try {
    const { salePrice, commissionPercent, split } = req.body;
    
    const result = CommissionService.calculateCommissionAmount(
      salePrice,
      commissionPercent,
      split
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================================================
// AGENT METRICS ENDPOINTS
// ========================================================================

/**
 * GET /api/commissions/metrics/:agentPhone
 * Get agent metrics
 */
router.get('/metrics/:agentPhone', async (req, res) => {
  try {
    const metrics = await CommissionService.getAgentMetrics(
      req.params.agentPhone
    );
    
    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Metrics not found'
      });
    }
    
    res.json({
      success: true,
      metrics: metrics.toObject()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/commissions/update-metrics/:agentPhone
 * Refresh agent metrics
 */
router.post('/update-metrics/:agentPhone', async (req, res) => {
  try {
    const metrics = await CommissionService.updateAgentMetrics(
      req.params.agentPhone
    );
    
    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================================================
// PAYMENT ENDPOINTS
// ========================================================================

/**
 * POST /api/commissions/payments
 * Create payment transaction
 */
router.post('/payments', async (req, res) => {
  try {
    const result = await CommissionService.createPayment(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/commissions/payments/:agentPhone
 * Get payment history for agent
 */
router.get('/payments/:agentPhone', async (req, res) => {
  try {
    const options = {
      status: req.query.status,
      limit: parseInt(req.query.limit) || 50,
      skip: parseInt(req.query.skip) || 0
    };
    
    const payments = await CommissionService.getPaymentHistory(
      req.params.agentPhone,
      options
    );
    
    res.json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/commissions/payments/:paymentId/complete
 * Mark payment as completed
 */
router.post('/payments/:paymentId/complete', async (req, res) => {
  try {
    const result = await CommissionService.completePayment(
      req.params.paymentId,
      req.body.receipt
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================================================
// DEAL ENDPOINTS
// ========================================================================

/**
 * POST /api/commissions/deals
 * Create a new deal
 */
router.post('/deals', async (req, res) => {
  try {
    const result = await CommissionService.createDeal(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/commissions/deals/:agentPhone
 * Get deals for agent
 */
router.get('/deals/:agentPhone', async (req, res) => {
  try {
    const options = {
      status: req.query.status,
      limit: parseInt(req.query.limit) || 50,
      skip: parseInt(req.query.skip) || 0
    };
    
    const deals = await CommissionService.getDealsByAgent(
      req.params.agentPhone,
      options
    );
    
    res.json({
      success: true,
      count: deals.length,
      deals
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/commissions/deals/:dealId/close
 * Close deal and generate commission
 */
router.post('/deals/:dealId/close', async (req, res) => {
  try {
    const result = await CommissionService.closeDealAndGenerateCommission(
      req.params.dealId
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/commissions/deals/:dealId/status
 * Update deal status
 */
router.put('/deals/:dealId/status', async (req, res) => {
  try {
    const result = await CommissionService.updateDealStatus(
      req.params.dealId,
      req.body.status
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================================================
// REPORTING ENDPOINTS
// ========================================================================

/**
 * GET /api/commissions/reports/:agentPhone
 * Generate commission report
 */
router.get('/reports/:agentPhone', async (req, res) => {
  try {
    const dateRange = {
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const report = await CommissionService.generateCommissionReport(
      req.params.agentPhone,
      dateRange
    );
    
    res.json(report);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
