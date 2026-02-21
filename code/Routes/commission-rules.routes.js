/**
 * ========================================================================
 * COMMISSION RULES API ROUTES
 * Phase 5: Feature 2 - Commission Tracking System Enhancement
 * ========================================================================
 * 
 * Express routes for commission rules and calculation engine:
 * - CRUD operations for commission rules
 * - Commission calculation (single + batch)
 * - Approval workflow endpoints
 * - Calculation history & reports
 * - Rule statistics
 * 
 * Base path: /api/commission-rules
 * 
 * @module CommissionRulesRoutes
 * @since Phase 5 - February 2026
 */

import express from 'express';
import CommissionCalculationEngine from '../Services/CommissionCalculationEngine.js';

const router = express.Router();

// ========================================================================
// RULE CRUD ENDPOINTS
// ========================================================================

/**
 * POST /api/commission-rules
 * Create a new commission rule
 * 
 * Body: { name, type, description, percentageConfig, fixedConfig, tieredConfig, 
 *         revenueShareConfig, appliesToPropertyTypes, appliesToTransactionTypes, 
 *         appliesToAgents, appliesToProjects, priority, startDate, endDate, 
 *         approvalRequired, approvalThreshold }
 */
router.post('/', async (req, res) => {
  try {
    const result = await CommissionCalculationEngine.createRule(req.body);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/commission-rules
 * List all commission rules (with optional filters)
 * 
 * Query: ?active=true&type=percentage&propertyType=villa&transactionType=sale&limit=50
 */
router.get('/', async (req, res) => {
  try {
    const filters = {
      active: req.query.active === 'true' ? true : (req.query.active === 'false' ? false : undefined),
      type: req.query.type,
      propertyType: req.query.propertyType,
      transactionType: req.query.transactionType,
      limit: parseInt(req.query.limit) || 100
    };

    const rules = await CommissionCalculationEngine.getRules(filters);

    res.json({
      success: true,
      count: rules.length,
      rules: rules.map(r => r.toObject())
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/commission-rules/:ruleId
 * Get a specific commission rule
 */
router.get('/:ruleId', async (req, res) => {
  try {
    const rule = await CommissionCalculationEngine.getRuleById(req.params.ruleId);

    if (!rule) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }

    res.json({ success: true, rule: rule.toObject() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/commission-rules/:ruleId
 * Update a commission rule
 * 
 * Body: Any fields to update
 */
router.put('/:ruleId', async (req, res) => {
  try {
    const result = await CommissionCalculationEngine.updateRule(req.params.ruleId, req.body);

    if (!result.success) {
      return res.status(result.rule === undefined ? 404 : 400).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/commission-rules/:ruleId
 * Delete a commission rule permanently
 */
router.delete('/:ruleId', async (req, res) => {
  try {
    const result = await CommissionCalculationEngine.deleteRule(req.params.ruleId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/commission-rules/:ruleId/deactivate
 * Soft-deactivate a rule (preserves history)
 */
router.post('/:ruleId/deactivate', async (req, res) => {
  try {
    const result = await CommissionCalculationEngine.deactivateRule(req.params.ruleId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================================================
// CALCULATION ENDPOINTS
// ========================================================================

/**
 * POST /api/commission-rules/calculate
 * Calculate commission for a single transaction
 * 
 * Body: {
 *   transactionValue: 2000000,
 *   propertyType: 'villa',
 *   transactionType: 'sale',
 *   agentPhone: '+971501234567',
 *   agentName: 'John',
 *   propertyAddress: 'DAMAC Hills 2',
 *   project: 'DAMAC Hills 2',
 *   ruleId: 'rule-xxx' (optional - auto-match if not specified)
 * }
 */
router.post('/calculate', async (req, res) => {
  try {
    const { ruleId, ...transaction } = req.body;

    const result = await CommissionCalculationEngine.calculate(transaction, {
      ruleId,
      createRecord: true,
      calculatedBy: req.body.calculatedBy || 'api'
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/commission-rules/preview
 * Preview commission calculation WITHOUT saving to database
 * 
 * Body: Same as /calculate
 */
router.post('/preview', async (req, res) => {
  try {
    const { ruleId, ...transaction } = req.body;
    const result = await CommissionCalculationEngine.preview(transaction, ruleId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/commission-rules/batch-calculate
 * Calculate commissions for multiple transactions
 * 
 * Body: {
 *   transactions: [
 *     { transactionValue, propertyType, transactionType, agentPhone, ... },
 *     ...
 *   ],
 *   options: { createRecord: true }
 * }
 */
router.post('/batch-calculate', async (req, res) => {
  try {
    const { transactions, options } = req.body;

    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({
        success: false,
        error: 'transactions must be an array'
      });
    }

    if (transactions.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 transactions per batch'
      });
    }

    const result = await CommissionCalculationEngine.batchCalculate(transactions, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/commission-rules/find-rules
 * Find applicable rules for a transaction (without calculating)
 * 
 * Body: { propertyType, transactionType, transactionValue, agentPhone, project }
 */
router.post('/find-rules', async (req, res) => {
  try {
    const rules = await CommissionCalculationEngine.findApplicableRules(req.body);

    res.json({
      success: true,
      count: rules.length,
      rules: rules.map(r => ({
        ruleId: r.ruleId,
        name: r.name,
        type: r.type,
        priority: r.priority,
        description: r.description
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================================================
// APPROVAL WORKFLOW ENDPOINTS
// ========================================================================

/**
 * GET /api/commission-rules/approvals/pending
 * Get all pending approval calculations
 * 
 * Query: ?limit=50
 */
router.get('/approvals/pending', async (req, res) => {
  try {
    const options = { limit: parseInt(req.query.limit) || 50 };
    const pending = await CommissionCalculationEngine.getPendingApprovals(options);

    res.json({
      success: true,
      count: pending.length,
      calculations: pending.map(p => p.toObject())
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/commission-rules/approvals/:calculationId/approve
 * Approve a pending calculation
 * 
 * Body: { approvedBy: 'manager_name', createCommission: true }
 */
router.post('/approvals/:calculationId/approve', async (req, res) => {
  try {
    const result = await CommissionCalculationEngine.approveCalculation(
      req.params.calculationId,
      req.body.approvedBy || 'system',
      req.body.createCommission !== false
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/commission-rules/approvals/:calculationId/reject
 * Reject a pending calculation
 * 
 * Body: { rejectedBy: 'manager_name', reason: 'explanation' }
 */
router.post('/approvals/:calculationId/reject', async (req, res) => {
  try {
    const result = await CommissionCalculationEngine.rejectCalculation(
      req.params.calculationId,
      req.body.rejectedBy || 'system',
      req.body.reason || ''
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================================================
// CALCULATION HISTORY & REPORTING
// ========================================================================

/**
 * GET /api/commission-rules/calculations/:agentPhone
 * Get calculation history for an agent
 * 
 * Query: ?status=approved&ruleId=rule-xxx&limit=50
 */
router.get('/calculations/:agentPhone', async (req, res) => {
  try {
    const options = {
      status: req.query.status,
      ruleId: req.query.ruleId,
      limit: parseInt(req.query.limit) || 100
    };

    if (req.query.startDate && req.query.endDate) {
      options.dateRange = {
        start: req.query.startDate,
        end: req.query.endDate
      };
    }

    const records = await CommissionCalculationEngine.getCalculationHistory(
      req.params.agentPhone,
      options
    );

    res.json({
      success: true,
      count: records.length,
      calculations: records.map(r => r.toObject())
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/commission-rules/calculations/detail/:calculationId
 * Get a specific calculation record
 */
router.get('/calculations/detail/:calculationId', async (req, res) => {
  try {
    const record = await CommissionCalculationEngine.getCalculationById(req.params.calculationId);

    if (!record) {
      return res.status(404).json({ success: false, error: 'Calculation not found' });
    }

    res.json({ success: true, calculation: record.toObject() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/commission-rules/reports/earnings/:agentPhone
 * Generate earnings report for an agent
 * 
 * Query: ?startDate=2026-01-01&endDate=2026-12-31
 */
router.get('/reports/earnings/:agentPhone', async (req, res) => {
  try {
    const dateRange = {
      start: req.query.startDate,
      end: req.query.endDate
    };

    const report = await CommissionCalculationEngine.generateEarningsReport(
      req.params.agentPhone,
      dateRange
    );

    res.json(report);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/commission-rules/reports/rule-stats/:ruleId
 * Get performance statistics for a specific rule
 */
router.get('/reports/rule-stats/:ruleId', async (req, res) => {
  try {
    const stats = await CommissionCalculationEngine.getRuleStats(req.params.ruleId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================================================
// UTILITY ENDPOINTS
// ========================================================================

/**
 * POST /api/commission-rules/seed
 * Seed default commission rules (for initial setup)
 */
router.post('/seed', async (req, res) => {
  try {
    const result = await CommissionCalculationEngine.seedDefaultRules();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
