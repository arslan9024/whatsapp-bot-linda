/**
 * ========================================================================
 * ANALYTICS API ROUTES
 * Phase 5: Feature 3 - Analytics & Reporting Dashboard
 * ========================================================================
 * 
 * REST API for portfolio analytics:
 * 
 *  GET  /api/analytics/dashboard          — Main dashboard KPIs
 *  GET  /api/analytics/properties         — Property analytics
 *  GET  /api/analytics/tenants            — Tenant analytics
 *  GET  /api/analytics/financial          — Financial analytics
 *  GET  /api/analytics/agents             — Agent leaderboard
 *  GET  /api/analytics/agents/:phone      — Single agent deep-dive
 *  GET  /api/analytics/trends             — Historical trend data
 *  POST /api/analytics/snapshot           — Generate daily snapshot
 *  POST /api/analytics/reports            — Generate custom report
 *  GET  /api/analytics/reports            — List reports
 *  GET  /api/analytics/reports/:id        — Get report by ID
 *  DELETE /api/analytics/reports/:id      — Delete report
 *  GET  /api/analytics/quick-stats        — Bot-friendly text summary
 *  GET  /api/analytics/export/properties  — CSV export
 * 
 * Base path: /api/analytics
 * 
 * @module AnalyticsRoutes
 * @since Phase 5 - February 2026
 */

import express from 'express';
import analyticsService from '../Services/PortfolioAnalyticsService.js';

const router = express.Router();

// ========================================================================
// DASHBOARD
// ========================================================================

/**
 * GET /api/analytics/dashboard
 * Real-time portfolio KPIs across all systems
 */
router.get('/dashboard', async (req, res) => {
  try {
    const result = await analyticsService.getDashboard();
    if (!result.success) {
      return res.status(500).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================================================
// PROPERTY ANALYTICS
// ========================================================================

/**
 * GET /api/analytics/properties
 * Property performance analytics
 * 
 * Query params: propertyId, clusterId, limit
 */
router.get('/properties', async (req, res) => {
  try {
    const options = {
      propertyId: req.query.propertyId,
      clusterId: req.query.clusterId,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };
    const result = await analyticsService.getPropertyAnalytics(options);
    if (!result.success) {
      return res.status(500).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================================================
// TENANT ANALYTICS
// ========================================================================

/**
 * GET /api/analytics/tenants
 * Tenant portfolio analytics — lease, renewal, payment
 */
router.get('/tenants', async (req, res) => {
  try {
    const result = await analyticsService.getTenantAnalytics();
    if (!result.success) {
      return res.status(500).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================================================
// FINANCIAL ANALYTICS
// ========================================================================

/**
 * GET /api/analytics/financial
 * Full financial analytics with period breakdowns
 * 
 * Query params: startDate, endDate
 */
router.get('/financial', async (req, res) => {
  try {
    const options = {
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    const result = await analyticsService.getFinancialAnalytics(options);
    if (!result.success) {
      return res.status(500).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================================================
// AGENT ANALYTICS
// ========================================================================

/**
 * GET /api/analytics/agents
 * Agent leaderboard and performance rankings
 * 
 * Query params: limit
 */
router.get('/agents', async (req, res) => {
  try {
    const options = {
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };
    const result = await analyticsService.getAgentAnalytics(options);
    if (!result.success) {
      return res.status(500).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/agents/:phone
 * Single agent deep-dive analytics
 */
router.get('/agents/:phone', async (req, res) => {
  try {
    const result = await analyticsService.getAgentAnalytics({
      agentPhone: req.params.phone
    });
    if (!result.success) {
      return res.status(500).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================================================
// TREND ANALYSIS
// ========================================================================

/**
 * GET /api/analytics/trends
 * Historical trend data from daily snapshots
 * 
 * Query params: metric (occupancyRate|rentalRevenue|commissions|activeDeals|messageVolume|totalProperties), days
 */
router.get('/trends', async (req, res) => {
  try {
    const options = {
      metric: req.query.metric,
      days: req.query.days ? parseInt(req.query.days) : undefined
    };
    const result = await analyticsService.getTrends(options);
    if (!result.success) {
      return res.status(500).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================================================
// DAILY SNAPSHOT
// ========================================================================

/**
 * POST /api/analytics/snapshot
 * Generate daily KPI snapshot (idempotent — one per day)
 */
router.post('/snapshot', async (req, res) => {
  try {
    const result = await analyticsService.generateDailySnapshot();
    if (!result.success) {
      return res.status(500).json(result);
    }
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================================================
// CUSTOM REPORTS
// ========================================================================

/**
 * POST /api/analytics/reports
 * Generate a custom report
 * 
 * Body: { name, type, startDate, endDate, filters, createdBy, format, description }
 */
router.post('/reports', async (req, res) => {
  try {
    const result = await analyticsService.generateReport(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/reports
 * List generated reports (without data payload)
 * 
 * Query params: type, status, createdBy, limit
 */
router.get('/reports', async (req, res) => {
  try {
    const options = {
      type: req.query.type,
      status: req.query.status,
      createdBy: req.query.createdBy,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };
    const result = await analyticsService.listReports(options);
    if (!result.success) {
      return res.status(500).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/reports/:id
 * Get a specific report with full data
 */
router.get('/reports/:id', async (req, res) => {
  try {
    const result = await analyticsService.getReportById(req.params.id);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/analytics/reports/:id
 * Delete a report
 */
router.delete('/reports/:id', async (req, res) => {
  try {
    const result = await analyticsService.deleteReport(req.params.id);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================================================
// QUICK STATS (bot-friendly)
// ========================================================================

/**
 * GET /api/analytics/quick-stats
 * WhatsApp-formatted text summary
 */
router.get('/quick-stats', async (req, res) => {
  try {
    const text = await analyticsService.getQuickStats();
    res.json({ success: true, stats: text });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================================================
// CSV EXPORT
// ========================================================================

/**
 * GET /api/analytics/export/properties
 * Export property analytics as CSV
 * 
 * Query params: clusterId, limit
 */
router.get('/export/properties', async (req, res) => {
  try {
    const result = await analyticsService.getPropertyAnalytics({
      clusterId: req.query.clusterId,
      limit: req.query.limit ? parseInt(req.query.limit) : 500
    });

    if (!result.success || !result.properties.length) {
      return res.status(404).json({ success: false, error: 'No property data to export' });
    }

    const csv = analyticsService.exportToCSV(result.properties, [
      'propertyId', 'unitNumber', 'clusterId', 'builtUpArea',
      'serviceCharges', 'occupancyStatus', 'currentRent', 'leaseExpiry',
      'totalTenancies', 'avgLeaseDurationMonths'
    ]);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=property-analytics-${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
