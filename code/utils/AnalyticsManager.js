/**
 * AnalyticsManager.js
 * 
 * Phase 29e: Analytics & Reporting - Centralized Metrics Collection
 * 
 * Collects and aggregates all bot metrics from previous phases:
 * - Phase 29a: Cache hit rates and performance
 * - Phase 29b: Database operation times
 * - Phase 29c: Relink success rates
 * - Phase 29d: Recovery and degradation metrics
 * - Core: Message counts, response times, error rates
 * 
 * Features:
 * - Real-time metric collection
 * - Time-series data storage
 * - Performance aggregation
 * - Anomaly detection
 * - Report generation ready
 * 
 * Usage:
 *   const analytics = new AnalyticsManager();
 *   analytics.startup();
 *   analytics.recordMetric('cache.hit', { duration: 5 });
 */

class AnalyticsManager {
  constructor(options = {}) {
    this.startTime = new Date();
    this.enableLogging = options.enableLogging !== false;
    
    // Metric buckets (time-series arrays)
    this.metrics = {
      // Core metrics
      messages: [],          // { timestamp, count, duration }
      errors: [],            // { timestamp, errorType, severity }
      uptime: [],            // { timestamp, status }
      
      // Phase 29a: Cache metrics
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        avgResponseTime: 0,
        totalRequests: 0
      },
      
      // Phase 29b: Database metrics
      database: {
        operations: [],      // { timestamp, operation, duration, success }
        totalOps: 0,
        successRate: 0,
        avgDuration: 0,
        errors: 0
      },
      
      // Phase 29c: Relink metrics
      relinking: {
        totalAttempts: 0,
        successfulRelinks: 0,
        failedRelinks: 0,
        successRate: 0,
        avgAttemptsPerRelink: 0
      },
      
      // Phase 29d: Recovery metrics
      recovery: {
        disconnections: 0,
        successfulRecoveries: 0,
        failedRecoveries: 0,
        recoverySuccessRate: 0,
        circuitTrips: 0,
        degradationEvents: 0
      },
      
      // System health
      system: {
        uptime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        accountsOnline: 0,
        accountsOffline: 0,
        accountsTotal: 0
      }
    };

    // Statistics window (last hour)
    this.windowSize = options.windowSize || 3600000; // 1 hour default
    this.dataRetention = options.dataRetention || 604800000; // 7 days
    
    // Real-time counters
    this.counters = {
      messagesReceived: 0,
      messagesSent: 0,
      errorCount: 0,
      warningCount: 0,
      lastMessageTime: null,
      lastErrorTime: null
    };

    // Period tracking for reports
    this.periods = {
      hour: new Date(),
      day: new Date(),
      week: new Date()
    };

    // Anomaly detection flags
    this.anomalies = [];
    this.thresholds = {
      errorRateAlert: 0.05,      // 5% errors
      cacheHitLow: 0.70,          // Below 70% hit rate
      recoveryRateLow: 0.80,      // Below 80% recovery
      memoryHigh: 0.85            // 85% memory usage
    };
  }

  /**
   * Initialize analytics system
   */
  async initialize() {
    try {
      this.startTime = new Date();
      if (this.enableLogging) {
        console.log('[Analytics] Initialized at', this.startTime.toISOString());
      }
      return true;
    } catch (error) {
      console.error('[Analytics] Init error:', error.message);
      return false;
    }
  }

  /**
   * Record a metric
   */
  recordMetric(metricName, data = {}) {
    try {
      const timestamp = new Date().toISOString();
      const entry = { timestamp, ...data };

      // Route to appropriate bucket
      if (metricName.startsWith('cache.')) {
        this._recordCacheMetric(metricName, data);
      } else if (metricName.startsWith('db.') || metricName.startsWith('database.')) {
        this._recordDatabaseMetric(metricName, data);
      } else if (metricName.startsWith('relink.')) {
        this._recordRelinkMetric(metricName, data);
      } else if (metricName.startsWith('recovery.')) {
        this._recordRecoveryMetric(metricName, data);
      } else if (metricName.startsWith('message.')) {
        this._recordMessageMetric(metricName, data);
      } else if (metricName.startsWith('error.')) {
        this._recordErrorMetric(metricName, data);
      } else if (metricName.startsWith('system.')) {
        this._recordSystemMetric(metricName, data);
      }

      // Check for anomalies
      this._checkAnomalies();
    } catch (error) {
      console.error('[Analytics] Record error:', error.message);
    }
  }

  // ===== Metric Recording Methods =====

  _recordCacheMetric(metricName, data) {
    const cache = this.metrics.cache;
    
    if (metricName === 'cache.hit') {
      cache.hits++;
      cache.totalRequests++;
    } else if (metricName === 'cache.miss') {
      cache.misses++;
      cache.totalRequests++;
    }

    cache.hitRate = cache.totalRequests > 0
      ? ((cache.hits / cache.totalRequests) * 100).toFixed(2) + '%'
      : '0%';

    if (data.duration) {
      cache.avgResponseTime = data.duration;
    }
  }

  _recordDatabaseMetric(metricName, data) {
    const db = this.metrics.database;
    
    if (metricName === 'db.operation' || metricName === 'database.operation') {
      db.operations.push({
        timestamp: new Date().toISOString(),
        operation: data.operation,
        duration: data.duration || 0,
        success: data.success !== false
      });

      db.totalOps++;
      if (data.success === false) {
        db.errors++;
      }

      db.successRate = ((db.totalOps - db.errors) / db.totalOps * 100).toFixed(2) + '%';

      // Keep last hour of data
      const oneHourAgo = Date.now() - this.windowSize;
      db.operations = db.operations.filter(op => new Date(op.timestamp).getTime() > oneHourAgo);
    }
  }

  _recordRelinkMetric(metricName, data) {
    const relink = this.metrics.relinking;
    
    if (metricName === 'relink.attempt') {
      relink.totalAttempts++;
    } else if (metricName === 'relink.success') {
      relink.successfulRelinks++;
    } else if (metricName === 'relink.failure') {
      relink.failedRelinks++;
    }

    if (relink.totalAttempts > 0) {
      relink.successRate = ((relink.successfulRelinks / relink.totalAttempts) * 100).toFixed(2) + '%';
    }
  }

  _recordRecoveryMetric(metricName, data) {
    const recovery = this.metrics.recovery;
    
    if (metricName === 'recovery.disconnection') {
      recovery.disconnections++;
    } else if (metricName === 'recovery.success') {
      recovery.successfulRecoveries++;
    } else if (metricName === 'recovery.failure') {
      recovery.failedRecoveries++;
    } else if (metricName === 'recovery.circuitTrip') {
      recovery.circuitTrips++;
    } else if (metricName === 'recovery.degradation') {
      recovery.degradationEvents++;
    }

    if (recovery.disconnections > 0) {
      recovery.recoverySuccessRate = ((recovery.successfulRecoveries / recovery.disconnections) * 100).toFixed(2) + '%';
    }
  }

  _recordMessageMetric(metricName, data) {
    if (metricName === 'message.received') {
      this.counters.messagesReceived++;
      this.counters.lastMessageTime = new Date().toISOString();
    } else if (metricName === 'message.sent') {
      this.counters.messagesSent++;
      this.counters.lastMessageTime = new Date().toISOString();
    }
  }

  _recordErrorMetric(metricName, data) {
    this.counters.errorCount++;
    this.counters.lastErrorTime = new Date().toISOString();
    this.metrics.errors.push({
      timestamp: new Date().toISOString(),
      errorType: data.errorType || 'Unknown',
      severity: data.severity || 'error',
      details: data.details || ''
    });

    // Keep last hour
    const oneHourAgo = Date.now() - this.windowSize;
    this.metrics.errors = this.metrics.errors.filter(e => new Date(e.timestamp).getTime() > oneHourAgo);
  }

  _recordSystemMetric(metricName, data) {
    if (metricName === 'system.uptime') {
      this.metrics.system.uptime = data.uptime || this._getUptime();
    } else if (metricName === 'system.memory') {
      this.metrics.system.memoryUsage = data.usage || 0;
    } else if (metricName === 'system.cpu') {
      this.metrics.system.cpuUsage = data.usage || 0;
    } else if (metricName === 'system.accounts') {
      this.metrics.system.accountsOnline = data.online || 0;
      this.metrics.system.accountsOffline = data.offline || 0;
      this.metrics.system.accountsTotal = data.total || 0;
    }
  }

  // ===== Anomaly Detection =====

  _checkAnomalies() {
    const anomalies = [];
    const cache = this.metrics.cache;
    const recovery = this.metrics.recovery;

    // Check cache hit rate
    if (cache.totalRequests > 100) {
      const hitRate = parseFloat(cache.hitRate) / 100;
      if (hitRate < this.thresholds.cacheHitLow) {
        anomalies.push({
          type: 'LOW_CACHE_HIT_RATE',
          severity: 'warning',
          value: cache.hitRate,
          threshold: (this.thresholds.cacheHitLow * 100) + '%',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Check recovery rate
    if (recovery.disconnections > 5) {
      const recoveryRate = parseFloat(recovery.recoverySuccessRate) / 100;
      if (recoveryRate < this.thresholds.recoveryRateLow) {
        anomalies.push({
          type: 'LOW_RECOVERY_RATE',
          severity: 'warning',
          value: recovery.recoverySuccessRate,
          threshold: (this.thresholds.recoveryRateLow * 100) + '%',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Check error rate
    const totalMessages = this.counters.messagesReceived + this.counters.messagesSent;
    if (totalMessages > 100) {
      const errorRate = this.counters.errorCount / totalMessages;
      if (errorRate > this.thresholds.errorRateAlert) {
        anomalies.push({
          type: 'HIGH_ERROR_RATE',
          severity: 'critical',
          value: (errorRate * 100).toFixed(2) + '%',
          threshold: (this.thresholds.errorRateAlert * 100) + '%',
          timestamp: new Date().toISOString()
        });
      }
    }

    this.anomalies = anomalies;
  }

  // ===== Query Methods =====

  /**
   * Get all current metrics
   */
  getAllMetrics() {
    return {
      collectionStartTime: this.startTime.toISOString(),
      uptime: this._getUptime(),
      metrics: this.metrics,
      counters: this.counters,
      anomalies: this.anomalies,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get metrics for a specific category
   */
  getMetricsByCategory(category) {
    if (category === 'cache') {
      return this.metrics.cache;
    } else if (category === 'database') {
      return this.metrics.database;
    } else if (category === 'relinking') {
      return this.metrics.relinking;
    } else if (category === 'recovery') {
      return this.metrics.recovery;
    } else if (category === 'system') {
      return this.metrics.system;
    } else if (category === 'counters') {
      return this.counters;
    }
    return null;
  }

  /**
   * Get anomalies
   */
  getAnomalies() {
    return this.anomalies;
  }

  /**
   * Get uptime in seconds
   */
  _getUptime() {
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }

  /**
   * Get uptime formatted
   */
  getFormattedUptime() {
    const uptime = this._getUptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  /**
   * Get summary report
   */
  getSummaryReport() {
    const uptime = this._getUptime();
    const cache = this.metrics.cache;
    const relink = this.metrics.relinking;
    const recovery = this.metrics.recovery;
    const totalMessages = this.counters.messagesReceived + this.counters.messagesSent;

    return {
      timestamp: new Date().toISOString(),
      uptime: this.getFormattedUptime(),
      messages: {
        received: this.counters.messagesReceived,
        sent: this.counters.messagesSent,
        total: totalMessages
      },
      errors: {
        total: this.counters.errorCount,
        rate: totalMessages > 0 ? ((this.counters.errorCount / totalMessages) * 100).toFixed(2) + '%' : '0%'
      },
      cache: {
        hitRate: cache.hitRate,
        totalRequests: cache.totalRequests,
        hits: cache.hits,
        misses: cache.misses
      },
      relinking: {
        totalAttempts: relink.totalAttempts,
        successRate: relink.successRate
      },
      recovery: {
        disconnections: recovery.disconnections,
        recoverySuccessRate: recovery.recoverySuccessRate,
        circuitTrips: recovery.circuitTrips
      },
      system: {
        accountsOnline: this.metrics.system.accountsOnline,
        accountsTotal: this.metrics.system.accountsTotal,
        degradationPercentage: this.metrics.system.accountsTotal > 0
          ? ((this.metrics.system.accountsOffline / this.metrics.system.accountsTotal) * 100).toFixed(2) + '%'
          : '0%'
      },
      anomalies: this.anomalies.length
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.startTime = new Date();
    this.counters = {
      messagesReceived: 0,
      messagesSent: 0,
      errorCount: 0,
      warningCount: 0,
      lastMessageTime: null,
      lastErrorTime: null
    };
    this.anomalies = [];
  }
}

export default AnalyticsManager;
