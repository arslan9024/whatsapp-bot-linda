/**
 * Health Check & Monitoring Endpoints
 * Express middleware and routes for health monitoring
 * 
 * Phase 6 Monitoring Infrastructure
 * Created: February 13, 2026
 */

class HealthCheckEndpoints {
  constructor(options = {}) {
    this.healthCheckService = options.healthCheckService;
    this.loggingService = options.loggingService;
    this.errorTrackingService = options.errorTrackingService;
    this.handlers = options.handlers || {};
  }

  /**
   * Initialize default health checks
   */
  initializeDefaultChecks() {
    if (!this.healthCheckService) return;

    // Memory health check
    this.healthCheckService.registerCheck('memory', async () => {
      const memUsage = process.memoryUsage();
      const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      return {
        healthy: heapUsagePercent < 90,  // Alert if > 90%
        message: `Heap usage: ${heapUsagePercent.toFixed(2)}%`,
        details: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
          external: Math.round(memUsage.external / 1024 / 1024) + ' MB'
        }
      };
    });

    // CPU health check
    this.healthCheckService.registerCheck('cpu', async () => {
      const cpus = require('os').cpus();
      return {
        healthy: true,
        message: `CPU cores: ${cpus.length}`,
        details: {
          cores: cpus.length
        }
      };
    });

    // Handler availability checks
    if (this.handlers.command) {
      this.healthCheckService.registerCheck('commandExecutor', async () => {
        return {
          healthy: typeof this.handlers.command.executeCommand === 'function',
          message: 'CommandExecutor ready'
        };
      });
    }

    if (this.handlers.message) {
      this.healthCheckService.registerCheck('messageBatchProcessor', async () => {
        return {
          healthy: typeof this.handlers.message.processBatch === 'function',
          message: 'MessageBatchProcessor ready'
        };
      });
    }

    if (this.handlers.conversation) {
      this.healthCheckService.registerCheck('conversationEngine', async () => {
        return {
          healthy: typeof this.handlers.conversation.detectIntent === 'function',
          message: 'ConversationIntelligenceEngine ready'
        };
      });
    }
  }

  /**
   * Health check endpoint handler
   * GET /health
   */
  healthCheckHandler() {
    return async (req, res) => {
      try {
        const healthStatus = await this.healthCheckService.runHealthChecks();

        const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
        
        res.status(statusCode).json({
          status: healthStatus.status,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          checks: healthStatus.checks
        });
      } catch (error) {
        res.status(503).json({
          status: 'error',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    };
  }

  /**
   * Metrics endpoint handler
   * GET /metrics
   */
  metricsHandler() {
    return async (req, res) => {
      try {
        const metrics = this.loggingService?.getMetrics() || {};
        const errorReport = this.errorTrackingService?.getErrorReport() || {};
        const healthStatus = this.healthCheckService?.getHealthStatus() || {};

        res.json({
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          metrics,
          errors: errorReport,
          health: healthStatus
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to retrieve metrics',
          message: error.message
        });
      }
    };
  }

  /**
   * Readiness check endpoint
   * GET /ready
   */
  readinessHandler() {
    return async (req, res) => {
      try {
        const healthStatus = await this.healthCheckService.runHealthChecks();
        const isReady = healthStatus.status === 'healthy';

        res.status(isReady ? 200 : 503).json({
          ready: isReady,
          timestamp: new Date().toISOString(),
          checks: healthStatus.checks
        });
      } catch (error) {
        res.status(503).json({
          ready: false,
          error: error.message
        });
      }
    };
  }

  /**
   * Liveness check endpoint
   * GET /alive
   */
  livenessHandler() {
    return (req, res) => {
      res.status(200).json({
        alive: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    };
  }

  /**
   * Logging info endpoint
   * GET /logs/info
   */
  loggingInfoHandler() {
    return (req, res) => {
      try {
        const metrics = this.loggingService?.getMetrics() || {};

        res.json({
          timestamp: new Date().toISOString(),
          metrics,
          logLevel: this.loggingService?.logLevel || 'info',
          performanceStats: metrics.performanceStats || {}
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to retrieve logging info',
          message: error.message
        });
      }
    };
  }

  /**
   * Error report endpoint
   * GET /errors/report
   */
  errorReportHandler() {
    return (req, res) => {
      try {
        const errorReport = this.errorTrackingService?.getErrorReport() || {};

        res.json({
          timestamp: new Date().toISOString(),
          summary: {
            totalUniqueErrors: errorReport.totalUniqueErrors || 0,
            totalErrorCount: errorReport.totalErrorCount || 0
          },
          topErrors: errorReport.topErrors || [],
          allErrors: req.query.detailed ? errorReport.allErrors : undefined
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to retrieve error report',
          message: error.message
        });
      }
    };
  }

  /**
   * Application info endpoint
   * GET /info
   */
  infoHandler() {
    return (req, res) => {
      const pkg = require('../../package.json');

      res.json({
        name: 'WhatsApp Bot Linda',
        version: pkg.version,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
        }
      });
    };
  }

  /**
   * Register all monitoring endpoints on Express app
   */
  registerEndpoints(app) {
    if (!app) {
      throw new Error('Express app instance is required');
    }

    this.initializeDefaultChecks();

    // Health checks
    app.get('/health', this.healthCheckHandler());
    app.get('/ready', this.readinessHandler());
    app.get('/alive', this.livenessHandler());

    // Metrics and monitoring
    app.get('/metrics', this.metricsHandler());
    app.get('/logs/info', this.loggingInfoHandler());
    app.get('/errors/report', this.errorReportHandler());

    // Application info
    app.get('/info', this.infoHandler());

    if (this.loggingService) {
      this.loggingService.info('Health check endpoints registered', {
        context: {
          endpoints: ['/health', '/ready', '/alive', '/metrics', '/logs/info', '/errors/report', '/info']
        }
      });
    }
  }
}

/**
 * Performance monitoring middleware
 */
function createPerformanceMiddleware(loggingService) {
  return (req, res, next) => {
    const startTime = Date.now();
    const requestId = req.id || generateRequestId();

    // Add request ID to response headers
    res.setHeader('X-Request-ID', requestId);

    // Track response time
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const route = `${req.method} ${req.path}`;

      if (loggingService) {
        loggingService.logPerformance(route, duration, {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          requestId
        });
      }

      // Log slow requests
      if (duration > 1000) {
        console.warn(`⚠️ SLOW REQUEST: ${route} took ${duration}ms`);
      }
    });

    next();
  };
}

/**
 * Error handling middleware
 */
function createErrorHandlingMiddleware(loggingService, errorTrackingService) {
  return (error, req, res, next) => {
    const requestId = req.id || generateRequestId();

    if (errorTrackingService) {
      errorTrackingService.captureError(error, {
        method: req.method,
        path: req.path,
        requestId,
        query: req.query,
        params: req.params
      });
    }

    if (loggingService) {
      loggingService.error(error.message, {
        error: error.message,
        stack: error.stack,
        requestId,
        context: {
          method: req.method,
          path: req.path
        }
      });
    }

    // Return error response
    const statusCode = error.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
      ? 'An error occurred'
      : error.message;

    res.status(statusCode).json({
      error: message,
      requestId,
      timestamp: new Date().toISOString()
    });
  };
}

/**
 * Generate unique request ID
 */
function generateRequestId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `req_${timestamp}_${random}`;
}

module.exports = {
  HealthCheckEndpoints,
  createPerformanceMiddleware,
  createErrorHandlingMiddleware,
  generateRequestId
};
