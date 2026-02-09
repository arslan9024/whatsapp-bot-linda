import express from 'express';
import AccountHealthMonitor from '../code/utils/AccountHealthMonitor.js';

const router = express.Router();

// Reference to the global health monitor
let healthMonitor;

export const setHealthMonitor = (monitor) => {
  healthMonitor = monitor;
};

/**
 * GET /api/health/status
 * Get health status for all accounts
 */
router.get('/status', async (req, res) => {
  try {
    if (!healthMonitor) {
      return res.status(503).json({
        error: 'Health monitor not initialized',
        status: 'unavailable'
      });
    }

    // Run health check
    await healthMonitor.checkHealth();

    // Get current health for all accounts
    const health = await healthMonitor.checkHealth();
    
    res.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString(),
      accountCount: Object.keys(health).length
    });
  } catch (error) {
    console.error('❌ Error in GET /api/health/status:', error);
    res.status(500).json({
      error: error.message,
      status: 'failed'
    });
  }
});

/**
 * GET /api/health/:phoneNumber
 * Get health details for specific account
 */
router.get('/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    if (!healthMonitor) {
      return res.status(503).json({ error: 'Health monitor not initialized' });
    }

    const health = await healthMonitor.getHealth(phoneNumber);

    if (!health) {
      return res.status(404).json({
        error: `Account ${phoneNumber} not found or not registered`
      });
    }

    res.json({
      success: true,
      phoneNumber,
      data: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Error in GET /api/health/${req.params.phoneNumber}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/health/metrics/system
 * Get system-wide metrics
 */
router.get('/metrics/system', (req, res) => {
  try {
    if (!healthMonitor) {
      return res.status(503).json({ error: 'Health monitor not initialized' });
    }

    const metrics = healthMonitor.getMetrics();

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in GET /api/health/metrics/system:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/health/trends/:phoneNumber
 * Get historical trend data for account
 */
router.get('/trends/:phoneNumber', (req, res) => {
  try {
    const { phoneNumber } = req.params;

    if (!healthMonitor) {
      return res.status(503).json({ error: 'Health monitor not initialized' });
    }

    const trends = healthMonitor.getTrend(phoneNumber);

    if (!trends) {
      return res.status(404).json({
        error: `No trend data available for ${phoneNumber}`
      });
    }

    res.json({
      success: true,
      phoneNumber,
      data: trends,
      count: trends.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Error in GET /api/health/trends/${req.params.phoneNumber}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/health/dashboard/all
 * Get complete dashboard data (all accounts + metrics + trends)
 */
router.get('/dashboard/all', (req, res) => {
  try {
    if (!healthMonitor) {
      return res.status(503).json({ error: 'Health monitor not initialized' });
    }

    const dashboardData = healthMonitor.getDashboardData();

    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in GET /api/health/dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
