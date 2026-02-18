/**
 * HighAvailabilityMonitor.js
 * Real-time monitoring of system health, alerts, and metrics reporting
 * 
 * Features:
 * - Real-time health dashboard data
 * - Alert generation (critical/warning/info)
 * - Performance metrics tracking
 * - Historical trending
 * - Audit logging
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger.js';

class HighAvailabilityMonitor extends EventEmitter {
  constructor(
    failoverDetectionService,
    failoverOrchestrator,
    loadBalancingService,
    config = {}
  ) {
    super();
    this.failoverDetectionService = failoverDetectionService;
    this.failoverOrchestrator = failoverOrchestrator;
    this.loadBalancingService = loadBalancingService;
    
    // Configuration
    this.alertThresholds = {
      criticalQueueLength: config.criticalQueueLength || 5000,
      warningQueueLength: config.warningQueueLength || 1000,
      loadImbalanceThreshold: config.loadImbalanceThreshold || 80,
      failureCountThreshold: config.failureCountThreshold || 3,
      recoveryTimeoutWarning: config.recoveryTimeoutWarning || 300000, // 5 min
    };
    
    // State tracking
    this.alerts = [];
    this.maxAlertsHistory = 1000;
    this.metrics = {
      uptime: [],
      recoveryTimes: [],
      messageLatencies: [],
    };
    this.reportingInterval = config.reportingInterval || 60000; // 1 minute
    this.reportingTimer = null;
    
    // Logger
    this.logger = new Logger('HighAvailabilityMonitor');

    // Setup event listeners
    this._setupEventListeners();
  }

  /**
   * Setup event listeners for monitoring
   */
  _setupEventListeners() {
    // Listen to failover detection events
    this.failoverDetectionService.on('master-failed', (event) => {
      this._generateAlert('CRITICAL', 'MASTER_FAILED', event);
    });

    this.failoverDetectionService.on('master-degraded', (event) => {
      this._generateAlert('WARNING', 'MASTER_DEGRADED', event);
    });

    this.failoverDetectionService.on('master-recovered', (event) => {
      this._generateAlert('INFO', 'MASTER_RECOVERED', event);
    });

    // Listen to failover orchestrator events
    this.failoverOrchestrator.on('failover-started', (event) => {
      this._generateAlert('CRITICAL', 'FAILOVER_INITIATED', event);
    });

    this.failoverOrchestrator.on('failover-completed', (event) => {
      this._generateAlert('WARNING', 'FAILOVER_COMPLETED', event);
    });

    this.failoverOrchestrator.on('failover-error', (event) => {
      this._generateAlert('CRITICAL', 'FAILOVER_FAILED', event);
    });
  }

  /**
   * Initialize monitoring
   */
  async initialize() {
    this.logger.info('Initializing HighAvailabilityMonitor');

    // Start periodic reporting
    this.reportingTimer = setInterval(() => {
      this._generateHealthReport();
    }, this.reportingInterval);

    // Initial report
    this._generateHealthReport();

    this.logger.info('HighAvailabilityMonitor initialized');
  }

  /**
   * Shutdown monitoring
   */
  async shutdown() {
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
    }
    this.logger.info('HighAvailabilityMonitor shutdown');
  }

  /**
   * Generate health report
   */
  _generateHealthReport() {
    try {
      const report = this.getHealthReport();
      
      // Emit report
      this.emit('health-report', report);

      // Log to file periodically
      this.logger.info('Health report generated', {
        timestamp: report.timestamp,
        totalMasters: report.totalMasters,
        healthyMasters: report.healthyCount,
        failedMasters: report.failedCount,
        systemHealth: report.systemHealth,
      });

      // Check thresholds
      this._checkThresholds(report);
    } catch (error) {
      this.logger.error('Error generating health report', error);
    }
  }

  /**
   * Check alert thresholds
   */
  _checkThresholds(report) {
    try {
      // Check queue lengths
      const loadMetrics = this.loadBalancingService.getAllLoadMetrics();
      
      for (const metric of loadMetrics) {
        if (metric.queueLength >= this.alertThresholds.criticalQueueLength) {
          this._generateAlert('CRITICAL', 'HIGH_QUEUE_LENGTH', {
            masterPhone: metric.masterPhone,
            queueLength: metric.queueLength,
            threshold: this.alertThresholds.criticalQueueLength,
          });
        } else if (metric.queueLength >= this.alertThresholds.warningQueueLength) {
          this._generateAlert('WARNING', 'ELEVATED_QUEUE_LENGTH', {
            masterPhone: metric.masterPhone,
            queueLength: metric.queueLength,
            threshold: this.alertThresholds.warningQueueLength,
          });
        }
      }

      // Check load imbalance
      const loadDistribution = this.loadBalancingService.getLoadDistribution();
      if (loadDistribution.balanceQuality < this.alertThresholds.loadImbalanceThreshold) {
        this._generateAlert('WARNING', 'LOAD_IMBALANCE', {
          quality: loadDistribution.balanceQuality,
          threshold: this.alertThresholds.loadImbalanceThreshold,
          distribution: loadDistribution.distribution,
        });
      }

      // Check system uptime
      if (report.systemUptime < 99.0) {
        this._generateAlert('WARNING', 'LOW_SYSTEM_UPTIME', {
          uptime: report.systemUptime,
        });
      }
    } catch (error) {
      this.logger.error('Error checking thresholds', error);
    }
  }

  /**
   * Generate alert
   */
  _generateAlert(severity, type, data) {
    const alert = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      severity,
      type,
      data,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.push(alert);

    // Keep alerts history manageable
    if (this.alerts.length > this.maxAlertsHistory) {
      this.alerts.shift();
    }

    // Log based on severity
    if (severity === 'CRITICAL') {
      this.logger.error(`Alert: ${type}`, data);
    } else if (severity === 'WARNING') {
      this.logger.warn(`Alert: ${type}`, data);
    } else {
      this.logger.info(`Alert: ${type}`, data);
    }

    // Emit alert event
    this.emit('alert', alert);

    return alert;
  }

  /**
   * Get current health report
   */
  getHealthReport() {
    try {
      // Get failover detection info
      const failoverHealth = this.failoverDetectionService.getHealthReport();
      
      // Get load balancing info
      const loadDistribution = this.loadBalancingService.getLoadDistribution();
      
      // Get failover orchestrator stats
      const failoverStats = this.failoverOrchestrator.getFailoverStats();

      // Calculate system health
      const systemHealth = this._calculateSystemHealth(
        failoverHealth,
        loadDistribution,
        failoverStats
      );

      return {
        timestamp: new Date(),
        systemHealth,
        
        // Failover metrics
        failover: {
          totalMasters: failoverHealth.totalMasters,
          healthyCount: failoverHealth.healthyCount,
          degradedCount: failoverHealth.degradedCount,
          failedCount: failoverHealth.failedCount,
          healthPercentage: failoverHealth.healthPercentage,
          statuses: failoverHealth.statuses,
        },

        // Load balancing metrics
        load: {
          strategy: loadDistribution.strategy,
          totalLoad: loadDistribution.totalLoad,
          balanceQuality: loadDistribution.balanceQuality,
          distribution: loadDistribution.distribution,
        },

        // Failover statistics
        failoverStats: {
          totalFailovers: failoverStats.totalFailovers,
          successfulFailovers: failoverStats.successfulFailovers,
          failedFailovers: failoverStats.failedFailovers,
          successRate: failoverStats.successRate,
          averageDuration: failoverStats.averageDuration,
        },

        // System-wide metrics
        systemUptime: this._calculateSystemUptime(),
        activeAlerts: this._getActiveAlerts(),
        recentAlerts: this.alerts.slice(-20),
      };
    } catch (error) {
      this.logger.error('Error generating health report', error);
      return {
        timestamp: new Date(),
        systemHealth: 'UNKNOWN',
        error: error.message,
      };
    }
  }

  /**
   * Calculate overall system health score (0-100)
   */
  _calculateSystemHealth(failoverHealth, loadDistribution, failoverStats) {
    let healthScore = 100;

    // Deduct for failed masters
    healthScore -= failoverHealth.failedCount * 20;

    // Deduct for degraded masters
    healthScore -= failoverHealth.degradedCount * 5;

    // Deduct for load imbalance
    healthScore -= (100 - loadDistribution.balanceQuality) * 0.3;

    // Deduct for failed failovers
    if (failoverStats.totalFailovers > 0) {
      const failureRate = (failoverStats.failedFailovers / failoverStats.totalFailovers) * 100;
      healthScore -= failureRate * 0.5;
    }

    // Normalize to 0-100
    healthScore = Math.max(0, Math.min(100, healthScore));

    // Determine status
    let status;
    if (healthScore >= 90) status = 'EXCELLENT';
    else if (healthScore >= 75) status = 'GOOD';
    else if (healthScore >= 50) status = 'WARNING';
    else status = 'CRITICAL';

    return {
      score: Math.round(healthScore * 10) / 10,
      status,
    };
  }

  /**
   * Calculate system uptime percentage
   */
  _calculateSystemUptime() {
    try {
      const failoverStats = this.failoverOrchestrator.getFailoverStats();
      
      if (failoverStats.totalFailovers === 0) {
        return 100;
      }

      // Simplified: assume each failover causes some downtime
      // In production, track actual downtime
      const estimatedDowntime = failoverStats.totalFailovers * 
        (failoverStats.averageDuration / 1000 / 60); // minutes
      
      const uptimePercentage = Math.max(0, 100 - (estimatedDowntime / 1440 * 100));
      
      return Math.round(uptimePercentage * 100) / 100;
    } catch (error) {
      return 100;
    }
  }

  /**
   * Get active alerts
   */
  _getActiveAlerts() {
    return this.alerts.filter(a => !a.acknowledged);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date();
      this.logger.info(`Alert acknowledged: ${alertId}`);
      this.emit('alert-acknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * Get alerts filtered by criteria
   */
  getAlerts(filter = {}) {
    let results = [...this.alerts];

    if (filter.severity) {
      results = results.filter(a => a.severity === filter.severity);
    }

    if (filter.type) {
      results = results.filter(a => a.type === filter.type);
    }

    if (filter.acknowledged !== undefined) {
      results = results.filter(a => a.acknowledged === filter.acknowledged);
    }

    if (filter.limit) {
      results = results.slice(-filter.limit);
    }

    return results;
  }

  /**
   * Get alert statistics
   */
  getAlertStats() {
    const critical = this.alerts.filter(a => a.severity === 'CRITICAL').length;
    const warning = this.alerts.filter(a => a.severity === 'WARNING').length;
    const info = this.alerts.filter(a => a.severity === 'INFO').length;

    return {
      total: this.alerts.length,
      critical,
      warning,
      info,
      acknowledged: this.alerts.filter(a => a.acknowledged).length,
      unacknowledged: this.alerts.filter(a => !a.acknowledged).length,
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const uptime = this.metrics.uptime.slice(-100);
    const recoveryTimes = this.metrics.recoveryTimes.slice(-100);
    const latencies = this.metrics.messageLatencies.slice(-100);

    return {
      uptime: {
        samples: uptime,
        average: uptime.length > 0 
          ? uptime.reduce((a, b) => a + b, 0) / uptime.length 
          : 0,
      },
      recoveryTime: {
        samples: recoveryTimes,
        average: recoveryTimes.length > 0
          ? recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length
          : 0,
      },
      messageLatency: {
        samples: latencies,
        average: latencies.length > 0
          ? latencies.reduce((a, b) => a + b, 0) / latencies.length
          : 0,
      },
    };
  }

  /**
   * Record metric
   */
  recordMetric(type, value) {
    if (type === 'uptime' && this.metrics.uptime) {
      this.metrics.uptime.push(value);
      if (this.metrics.uptime.length > 1000) this.metrics.uptime.shift();
    } else if (type === 'recoveryTime' && this.metrics.recoveryTimes) {
      this.metrics.recoveryTimes.push(value);
      if (this.metrics.recoveryTimes.length > 1000) this.metrics.recoveryTimes.shift();
    } else if (type === 'latency' && this.metrics.messageLatencies) {
      this.metrics.messageLatencies.push(value);
      if (this.metrics.messageLatencies.length > 1000) this.metrics.messageLatencies.shift();
    }
  }

  /**
   * Get monitoring dashboard data
   */
  getDashboardData() {
    const healthReport = this.getHealthReport();
    const alertStats = this.getAlertStats();
    const performanceMetrics = this.getPerformanceMetrics();

    return {
      timestamp: new Date(),
      health: healthReport.systemHealth,
      failover: healthReport.failover,
      load: healthReport.load,
      failoverStats: healthReport.failoverStats,
      alerts: alertStats,
      performance: performanceMetrics,
      systemUptime: healthReport.systemUptime,
    };
  }

  /**
   * Clear alert history
   */
  clearAlertHistory() {
    const count = this.alerts.length;
    this.alerts = [];
    this.logger.info(`Cleared ${count} alerts from history`);
  }

  /**
   * Export monitoring data
   */
  exportMonitoringData() {
    return {
      exported: new Date(),
      dashboard: this.getDashboardData(),
      alerts: this.getAlerts({ limit: 100 }),
      performance: this.getPerformanceMetrics(),
      failoverStats: this.failoverOrchestrator.getFailoverStats(),
      loadMetrics: this.loadBalancingService.getAllLoadMetrics(),
    };
  }
}

export default HighAvailabilityMonitor;
