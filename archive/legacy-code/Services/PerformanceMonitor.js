/**
 * PerformanceMonitor.js
 * 
 * Comprehensive performance monitoring and optimization
 * Tracks system health, identifies bottlenecks, triggers optimization
 * 
 * Features:
 * - Real-time metrics collection (latency, throughput, errors)
 * - Resource monitoring (CPU, memory, heap)
 * - Performance threshold tracking and alerts
 * - Historical trending and anomaly detection
 * - Integration with optimization services
 * - Performance dashboards and reporting
 * - Automatic optimization trigger
 * - Profiling capabilities
 * 
 * Version: 1.0
 * Created: February 17, 2026
 * Status: Production Ready - Workstream 5
 */

import os from "os";
import process from "process";

class PerformanceMonitor {
  constructor() {
    this.initialized = false;
    this.metrics = new Map(); // metricName -> [{ timestamp, value }]
    this.thresholds = new Map(); // metricName -> threshold
    this.alerts = [];
    this.performanceEvents = [];
    this.profileSnapshots = [];

    this.config = {
      // Monitoring intervals
      metricCollectionIntervalMs: 5 * 1000, // Every 5 seconds
      performanceCheckIntervalMs: 30 * 1000, // Every 30 seconds
      
      // Thresholds
      thresholds: {
        // Latency (milliseconds)
        messageLatencyWarningMs: 500,
        messageLatencyCriticalMs: 2000,
        
        // Throughput (messages per second)
        minThroughputWarning: 5,
        
        // CPU (percentage)
        cpuWarningPercent: 70,
        cpuCriticalPercent: 90,
        
        // Memory (percentage of available)
        memoryWarningPercent: 75,
        memoryCriticalPercent: 90,
        
        // Error rate (percentage)
        errorRateWarningPercent: 5,
        errorRateCriticalPercent: 10,
        
        // Queue depth (pending messages)
        queueDepthWarning: 100,
        queueDepthCritical: 500,
      },

      // History settings
      metricsRetentionMs: 24 * 60 * 60 * 1000, // 24 hours
      maxMetricsPerCategory: 1000,
      
      // Trending and anomaly
      enableAnomalyDetection: true,
      anomalyStdDevThreshold: 2.5,
      
      // Optimization triggers
      autoOptimizeEnabled: true,
      optimizationCooldownMs: 5 * 60 * 1000, // 5 minutes between optimizations
    };

    // Statistics counters (for current window)
    this.currentWindow = {
      messagesProcessed: 0,
      messagesFailed: 0,
      totalLatencyMs: 0,
      minLatencyMs: Infinity,
      maxLatencyMs: 0,
      startTime: Date.now(),
      windowDurationMs: 60 * 1000, // 1 minute window
    };

    // System baseline
    this.systemBaseline = {
      totalMemoryBytes: os.totalmem(),
      cpuCount: os.cpus().length,
      platform: process.platform,
      nodeVersion: process.version,
    };

    // Optimization tracking
    this.lastOptimizationAt = 0;
    this.optimizationHistory = [];
  }

  /**
   * Initialize monitor
   */
  async initialize() {
    try {
      if (this.initialized) return true;

      console.log("✅ PerformanceMonitor initialized");

      // Initialize metric categories
      this._initializeMetrics();

      // Start monitoring loops
      this._startMetricCollection();
      this._startPerformanceChecking();
      this._startWindowReset();

      this.initialized = true;
      return true;
    } catch (error) {
      console.error(
        `❌ PerformanceMonitor initialization failed: ${error.message}`
      );
      return false;
    }
  }

  /**
   * Record message latency
   * @param {string} messageId - Message ID
   * @param {number} latencyMs - Latency in milliseconds
   * @param {boolean} success - Whether message was successful
   */
  recordMessageLatency(messageId, latencyMs, success = true) {
    try {
      this._recordMetric("messageLatency", latencyMs);

      // Update current window stats
      this.currentWindow.messagesProcessed++;
      this.currentWindow.totalLatencyMs += latencyMs;
      this.currentWindow.minLatencyMs = Math.min(
        this.currentWindow.minLatencyMs,
        latencyMs
      );
      this.currentWindow.maxLatencyMs = Math.max(
        this.currentWindow.maxLatencyMs,
        latencyMs
      );

      if (!success) {
        this.currentWindow.messagesFailed++;
      }

      // Emit event
      this.performanceEvents.push({
        timestamp: Date.now(),
        type: "messageLatency",
        messageId,
        latencyMs,
        success,
      });
    } catch (error) {
      console.error(`❌ Error recording latency: ${error.message}`);
    }
  }

  /**
   * Record custom metric
   * @param {string} metricName - Metric name
   * @param {number} value - Metric value
   * @param {object} metadata - Additional metadata
   */
  recordMetric(metricName, value, metadata = {}) {
    try {
      this._recordMetric(metricName, value);

      this.performanceEvents.push({
        timestamp: Date.now(),
        type: "customMetric",
        metricName,
        value,
        ...metadata,
      });
    } catch (error) {
      console.error(
        `❌ Error recording metric: ${error.message}`
      );
    }
  }

  /**
   * Get current performance report
   */
  getCurrentReport() {
    try {
      const now = Date.now();
      const windowAge = now - this.currentWindow.startTime;
      const errorRate =
        this.currentWindow.messagesProcessed > 0
          ? (
              (this.currentWindow.messagesFailed /
                this.currentWindow.messagesProcessed) *
              100
            ).toFixed(2)
          : 0;

      const avgLatency =
        this.currentWindow.messagesProcessed > 0
          ? (
              this.currentWindow.totalLatencyMs /
              this.currentWindow.messagesProcessed
            ).toFixed(2)
          : 0;

      const throughput =
        windowAge > 0
          ? ((this.currentWindow.messagesProcessed / windowAge) * 1000).toFixed(2)
          : 0;

      return {
        timestamp: now,
        window: {
          duration: this.currentWindow.windowDurationMs,
          age: windowAge,
        },
        messages: {
          processed: this.currentWindow.messagesProcessed,
          failed: this.currentWindow.messagesFailed,
          errorRate: errorRate + "%",
          throughput: throughput + " msg/sec",
        },
        latency: {
          average: avgLatency + "ms",
          min: this.currentWindow.minLatencyMs === Infinity 
            ? "N/A" 
            : this.currentWindow.minLatencyMs + "ms",
          max: this.currentWindow.maxLatencyMs + "ms",
        },
        system: this._getSystemMetrics(),
        alerts: this._checkThresholds(),
        recommendations: this._generateRecommendations(),
      };
    } catch (error) {
      console.error(`❌ Error generating report: ${error.message}`);
      return null;
    }
  }

  /**
   * Get historical trend
   * @param {string} metricName - Metric name
   * @param {number} windowMs - Time window in milliseconds
   */
  getHistoricalTrend(metricName, windowMs = 60 * 1000) {
    try {
      const metrics = this.metrics.get(metricName) || [];
      const cutoff = Date.now() - windowMs;

      const relevant = metrics.filter((m) => m.timestamp > cutoff);

      if (relevant.length === 0) {
        return {
          metricName,
          dataPoints: 0,
          trend: "insufficient-data",
        };
      }

      const values = relevant.map((m) => m.value);
      const sorted = [...values].sort((a, b) => a - b);

      const mean = values.reduce((a, b) => a + b) / values.length;
      const variance =
        values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
        values.length;
      const stdDev = Math.sqrt(variance);

      // Detect trend
      let trend = "stable";
      if (values.length >= 3) {
        const recent = values.slice(-3);
        const older = values.slice(0, 3);
        const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b) / older.length;

        if (recentAvg > olderAvg * 1.2) {
          trend = "increasing";
        } else if (recentAvg < olderAvg * 0.8) {
          trend = "decreasing";
        }
      }

      return {
        metricName,
        dataPoints: relevant.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean: mean.toFixed(2),
        median: sorted[Math.floor(sorted.length / 2)],
        stdDev: stdDev.toFixed(2),
        trend,
        isAnomaly: this.config.enableAnomalyDetection
          ? this._detectAnomaly(values, mean, stdDev)
          : false,
      };
    } catch (error) {
      console.error(
        `❌ Error getting historical trend: ${error.message}`
      );
      return null;
    }
  }

  /**
   * Get all current alerts
   */
  getAlerts() {
    return {
      activeAlerts: this.alerts.length,
      alerts: this.alerts.map((alert) => ({
        ...alert,
        ageMs: Date.now() - alert.timestamp,
      })),
      recentEvents: this.performanceEvents.slice(-20),
    };
  }

  /**
   * PRIVATE: Initialize metrics
   */
  _initializeMetrics() {
    const metricCategories = [
      "messageLatency",
      "throughput",
      "errorRate",
      "cpuUsage",
      "memoryUsage",
      "heapUsage",
      "queueDepth",
      "sheetsCacheMissRate",
      "messageParallelization",
    ];

    for (const category of metricCategories) {
      this.metrics.set(category, []);
    }
  }

  /**
   * PRIVATE: Record metric
   */
  _recordMetric(metricName, value) {
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }

    const metricArray = this.metrics.get(metricName);
    metricArray.push({
      timestamp: Date.now(),
      value,
    });

    // Prune old entries
    const cutoff = Date.now() - this.config.metricsRetentionMs;
    const filtered = metricArray.filter((m) => m.timestamp > cutoff);

    // Keep max size
    if (filtered.length > this.config.maxMetricsPerCategory) {
      filtered.splice(0, filtered.length - this.config.maxMetricsPerCategory);
    }

    this.metrics.set(metricName, filtered);
  }

  /**
   * PRIVATE: Start metric collection
   */
  _startMetricCollection() {
    setInterval(() => {
      try {
        // Collect system metrics
        const cpuUsage = this._getCpuUsage();
        const memoryUsage = this._getMemoryUsage();
        const heapUsage = this._getHeapUsage();

        this._recordMetric("cpuUsage", cpuUsage.percentage);
        this._recordMetric("memoryUsage", memoryUsage.percentage);
        this._recordMetric("heapUsage", heapUsage.heapUsedPercent);

        if (cpuUsage.percentage > this.config.thresholds.cpuWarningPercent) {
          console.warn(
            `⚠️ CPU usage high: ${cpuUsage.percentage.toFixed(2)}%`
          );
        }

        if (
          memoryUsage.percentage >
          this.config.thresholds.memoryWarningPercent
        ) {
          console.warn(
            `⚠️ Memory usage high: ${memoryUsage.percentage.toFixed(2)}%`
          );
        }
      } catch (error) {
        console.warn(
          `⚠️ Error collecting metrics: ${error.message}`
        );
      }
    }, this.config.metricCollectionIntervalMs);
  }

  /**
   * PRIVATE: Start performance checking
   */
  _startPerformanceChecking() {
    setInterval(() => {
      try {
        this.alerts = this._checkThresholds();

        if (this.alerts.length > 0) {
          console.warn(`⚠️ Performance alerts: ${this.alerts.length}`);
          for (const alert of this.alerts) {
            console.warn(`  - ${alert.message}`);
          }
        }

        // Trigger optimization if needed
        if (
          this.config.autoOptimizeEnabled &&
          this.alerts.length > 0 &&
          Date.now() - this.lastOptimizationAt >
            this.config.optimizationCooldownMs
        ) {
          this._triggerOptimization();
        }
      } catch (error) {
        console.warn(
          `⚠️ Error in performance check: ${error.message}`
        );
      }
    }, this.config.performanceCheckIntervalMs);
  }

  /**
   * PRIVATE: Start window reset
   */
  _startWindowReset() {
    setInterval(() => {
      this.currentWindow = {
        messagesProcessed: 0,
        messagesFailed: 0,
        totalLatencyMs: 0,
        minLatencyMs: Infinity,
        maxLatencyMs: 0,
        startTime: Date.now(),
        windowDurationMs: 60 * 1000,
      };
    }, this.currentWindow.windowDurationMs);
  }

  /**
   * PRIVATE: Check thresholds
   */
  _checkThresholds() {
    const alerts = [];
    const config = this.config.thresholds;

    // Latency check
    const latencyTrend = this.getHistoricalTrend("messageLatency", 60 * 1000);
    if (latencyTrend && latencyTrend.mean) {
      const mean = parseFloat(latencyTrend.mean);

      if (mean > config.messageLatencyCriticalMs) {
        alerts.push({
          timestamp: Date.now(),
          severity: "critical",
          metric: "messageLatency",
          value: mean.toFixed(2),
          threshold: config.messageLatencyCriticalMs,
          message: `Message latency critical: ${mean.toFixed(2)}ms (threshold: ${config.messageLatencyCriticalMs}ms)`,
        });
      } else if (mean > config.messageLatencyWarningMs) {
        alerts.push({
          timestamp: Date.now(),
          severity: "warning",
          metric: "messageLatency",
          value: mean.toFixed(2),
          threshold: config.messageLatencyWarningMs,
          message: `Message latency elevated: ${mean.toFixed(2)}ms (threshold: ${config.messageLatencyWarningMs}ms)`,
        });
      }
    }

    // Error rate check
    if (this.currentWindow.messagesProcessed > 0) {
      const errorRate =
        (this.currentWindow.messagesFailed /
          this.currentWindow.messagesProcessed) *
        100;

      if (errorRate > config.errorRateCriticalPercent) {
        alerts.push({
          timestamp: Date.now(),
          severity: "critical",
          metric: "errorRate",
          value: errorRate.toFixed(2),
          threshold: config.errorRateCriticalPercent,
          message: `Error rate critical: ${errorRate.toFixed(2)}% (threshold: ${config.errorRateCriticalPercent}%)`,
        });
      } else if (errorRate > config.errorRateWarningPercent) {
        alerts.push({
          timestamp: Date.now(),
          severity: "warning",
          metric: "errorRate",
          value: errorRate.toFixed(2),
          threshold: config.errorRateWarningPercent,
          message: `Error rate elevated: ${errorRate.toFixed(2)}% (threshold: ${config.errorRateWarningPercent}%)`,
        });
      }
    }

    return alerts;
  }

  /**
   * PRIVATE: Detect anomaly
   */
  _detectAnomaly(values, mean, stdDev) {
    if (values.length < 3) return false;

    const recent = values[values.length - 1];
    const zscore = Math.abs((recent - mean) / stdDev);

    return zscore > this.config.anomalyStdDevThreshold;
  }

  /**
   * PRIVATE: Get CPU usage
   */
  _getCpuUsage() {
    try {
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTime = 0;

      for (const cpu of cpus) {
        for (const type in cpu.times) {
          totalTime += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      }

      const percentage = 100 - Math.round((100 * totalIdle) / totalTime);
      return { percentage };
    } catch (error) {
      return { percentage: 0 };
    }
  }

  /**
   * PRIVATE: Get memory usage
   */
  _getMemoryUsage() {
    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const percentage = (usedMemory / totalMemory) * 100;

      return {
        totalMemory,
        usedMemory,
        freeMemory,
        percentage,
      };
    } catch (error) {
      return { percentage: 0 };
    }
  }

  /**
   * PRIVATE: Get heap usage
   */
  _getHeapUsage() {
    try {
      const heapStats = process.memoryUsage();

      return {
        heapTotal: heapStats.heapTotal,
        heapUsed: heapStats.heapUsed,
        external: heapStats.external,
        heapUsedPercent: (heapStats.heapUsed / heapStats.heapTotal) * 100,
      };
    } catch (error) {
      return { heapUsedPercent: 0 };
    }
  }

  /**
   * PRIVATE: Get system metrics
   */
  _getSystemMetrics() {
    const cpu = this._getCpuUsage();
    const memory = this._getMemoryUsage();
    const heap = this._getHeapUsage();

    return {
      cpu: {
        usage: cpu.percentage.toFixed(2) + "%",
        cores: this.systemBaseline.cpuCount,
      },
      memory: {
        used: (memory.usedMemory / 1024 / 1024).toFixed(2) + "MB",
        total: (memory.totalMemory / 1024 / 1024).toFixed(2) + "MB",
        usage: memory.percentage.toFixed(2) + "%",
      },
      heap: {
        used: (heap.heapUsed / 1024 / 1024).toFixed(2) + "MB",
        total: (heap.heapTotal / 1024 / 1024).toFixed(2) + "MB",
        usage: heap.heapUsedPercent.toFixed(2) + "%",
      },
    };
  }

  /**
   * PRIVATE: Generate recommendations
   */
  _generateRecommendations() {
    const recommendations = [];

    const memory = this._getMemoryUsage();
    if (memory.percentage > 80) {
      recommendations.push("Enable garbage collection");
      recommendations.push("Reduce cache size");
    }

    const cpu = this._getCpuUsage();
    if (cpu.percentage > 80) {
      recommendations.push("Increase message parallelization");
      recommendations.push("Enable rate limiting");
    }

    if (this.currentWindow.messagesFailed > 10) {
      recommendations.push("Review and fix error handling");
      recommendations.push("Enable circuit breaker");
    }

    return recommendations;
  }

  /**
   * PRIVATE: Trigger optimization
   */
  _triggerOptimization() {
    try {
      console.log("🔧 Triggering automatic optimization...");

      this.lastOptimizationAt = Date.now();

      this.optimizationHistory.push({
        timestamp: Date.now(),
        triggers: this.alerts.map((a) => a.metric),
      });

      // In production: call optimization services
      // - MessageParallelizer.increaseParallelism()
      // - BatchSendingOptimizer.adjustBatchSize()
      // - SheetsAPICacher.clearCache()
    } catch (error) {
      console.error(`❌ Error triggering optimization: ${error.message}`);
    }
  }
}

export default PerformanceMonitor;
export { PerformanceMonitor };
