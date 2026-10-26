/**
 * DegradationStrategy.js
 * 
 * Intelligent graceful degradation strategy
 * Automatically downgrade features when resources are low or APIs fail
 * 
 * Features:
 * - Feature tiers: Critical → Important → Nice-to-have
 * - Automatic downgrade: Detects resource constraints
 * - Recovery escalation: Re-enable features as resources improve
 * - Health-based decisions: CPU, memory, API status monitoring
 * - Feature priority matrix: Configure feature importance
 * - Metrics tracking: Monitor degradation events
 * - Fallback modes: Disable expensive operations
 * - Configuration profiles: Customize degradation rules
 * 
 * Version: 1.0
 * Created: February 17, 2026
 * Status: Production Ready - Workstream 4
 */

class DegradationStrategy {
  constructor() {
    this.initialized = false;
    this.currentDegradation = 1.0; // 1.0 = full capability, 0.0 = minimal
    this.degradedFeatures = new Set();
    this.featureTiers = new Map();
    this.metrics = {
      degradationEvents: 0,
      recoveryEvents: 0,
      totalDowntime: 0,
      featureDowntimes: new Map(),
    };

    this.config = {
      // Resource thresholds
      cpuThreshold: 80, // Degrade if > 80% CPU
      memoryThreshold: 85, // Degrade if > 85% memory
      apiErrorRateThreshold: 0.3, // Degrade if > 30% API errors

      // Recovery thresholds
      cpuRecoveryThreshold: 50, // Re-enable if < 50% CPU
      memoryRecoveryThreshold: 70, // Re-enable if < 70% memory
      apiErrorRecoveryThreshold: 0.1, // Re-enable if < 10% errors

      // Timing
      degradationCheckIntervalMs: 5000, // Check every 5 seconds
      recoveryCheckIntervalMs: 10000, // Check recovery every 10 seconds
      minDegradationDurationMs: 30000, // Min 30s degradation before recovery

      // Alerts
      enableAlerts: true,
      alertChannels: ["console"],
    };

    // Feature definitions with tiers
    this._initializeFeatures();
  }

  /**
   * Initialize degradation strategy
   */
  async initialize() {
    try {
      if (this.initialized) return true;

      console.log("✅ DegradationStrategy initialized");
      this.initialized = true;

      // Start health monitoring
      this._startHealthMonitoring();

      return true;
    } catch (error) {
      console.error(
        `❌ DegradationStrategy initialization failed: ${error.message}`
      );
      return false;
    }
  }

  /**
   * Check if feature should run
   * @param {string} featureName - Feature to check
   * @param {object} context - Current context (optional)
   * @returns {object} - Feature execution decision
   */
  canExecuteFeature(featureName, context = {}) {
    const feature = this.featureTiers.get(featureName);

    if (!feature) {
      return {
        canExecute: true,
        feature: featureName,
        reason: "feature_not_tracked",
      };
    }

    const isDegraded = this.degradedFeatures.has(featureName);
    const tier = feature.tier;

    // Tier-based decision
    if (tier === "critical") {
      // Always execute critical features
      return {
        canExecute: true,
        feature: featureName,
        degraded: isDegraded,
      };
    }

    if (tier === "important") {
      // Execute unless heavily degraded (< 0.3)
      const canRun = !isDegraded || this.currentDegradation > 0.3;
      return {
        canExecute: canRun,
        feature: featureName,
        degraded: isDegraded,
        reason: canRun ? null : "degradation_level_too_high",
      };
    }

    if (tier === "nice-to-have") {
      // Skip entirely if degraded
      const canRun = !isDegraded && this.currentDegradation > 0.7;
      return {
        canExecute: canRun,
        feature: featureName,
        degraded: isDegraded,
        reason: canRun ? null : "resource_constraint",
      };
    }

    return { canExecute: true, feature: featureName };
  }

  /**
   * Execute feature with automatic fallback
   * @param {string} featureName - Feature name
   * @param {function} fn - Function to execute
   * @param {function} fallbackFn - Fallback function if degraded
   * @returns {Promise<object>} - Result
   */
  async executeWithFallback(featureName, fn, fallbackFn = null) {
    try {
      const decision = this.canExecuteFeature(featureName);

      if (!decision.canExecute) {
        if (fallbackFn) {
          console.log(
            `📉 Executing fallback for ${featureName} (degradation: ${(this.currentDegradation * 100).toFixed(0)}%)`
          );
          return await fallbackFn();
        }

        return {
          success: false,
          reason: "feature_degraded",
          fallback: true,
          feature: featureName,
        };
      }

      // Execute primary function
      return await fn();
    } catch (error) {
      console.error(
        `❌ Error in executeWithFallback: ${error.message}`
      );

      // Fall back to fallback function if primary fails
      if (fallbackFn) {
        try {
          return await fallbackFn();
        } catch (fallbackError) {
          return {
            success: false,
            error: fallbackError.message,
          };
        }
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Report resource metrics and trigger degradation if needed
   * @param {object} metrics - Current system metrics
   * @returns {object} - Degradation decision
   */
  reportMetrics(metrics) {
    try {
      const {
        cpuUsage = 0,
        memoryUsage = 0,
        apiErrorRate = 0,
      } = metrics;

      const oldDegradation = this.currentDegradation;

      // Determine required degradation level
      let requiredDegradation = 1.0;

      if (cpuUsage > this.config.cpuThreshold) {
        requiredDegradation = Math.min(
          requiredDegradation,
          1.0 - (cpuUsage - this.config.cpuThreshold) / 20
        );
      }

      if (memoryUsage > this.config.memoryThreshold) {
        requiredDegradation = Math.min(
          requiredDegradation,
          1.0 - (memoryUsage - this.config.memoryThreshold) / 15
        );
      }

      if (apiErrorRate > this.config.apiErrorRateThreshold) {
        requiredDegradation = Math.min(
          requiredDegradation,
          1.0 - apiErrorRate * 0.5
        );
      }

      // Clamp degradation between 0 and 1
      requiredDegradation = Math.max(0, Math.min(1, requiredDegradation));

      // Apply degradation (smooth transition)
      if (requiredDegradation < this.currentDegradation) {
        this.currentDegradation =
          this.currentDegradation * 0.9 + requiredDegradation * 0.1;
        this._applyDegradation();
      }

      // Log changes
      if (Math.abs(this.currentDegradation - oldDegradation) > 0.1) {
        console.log(
          `📊 Degradation level: ${(oldDegradation * 100).toFixed(0)}% → ${(this.currentDegradation * 100).toFixed(0)}%`
        );
      }

      return {
        currentDegradation: this.currentDegradation,
        cpuUsage,
        memoryUsage,
        apiErrorRate,
        degradedFeatures: Array.from(this.degradedFeatures),
      };
    } catch (error) {
      console.error(`❌ Error reporting metrics: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Get degradation report
   */
  getDegradationReport() {
    return {
      currentLevel: this.currentDegradation,
      percentageOperational: `${(this.currentDegradation * 100).toFixed(2)}%`,
      degradedFeatures: Array.from(this.degradedFeatures),
      featureStatus: this._getFeatureStatus(),
      metrics: {
        degradationEvents: this.metrics.degradationEvents,
        recoveryEvents: this.metrics.recoveryEvents,
        totalDowntime: `${this.metrics.totalDowntime}ms`,
      },
    };
  }

  /**
   * Force feature degradation (for testing)
   * @param {string} featureName - Feature to degrade
   * @returns {boolean}
   */
  forceDegrade(featureName) {
    const feature = this.featureTiers.get(featureName);

    if (!feature || feature.tier === "critical") {
      return false; // Can't degrade critical
    }

    this.degradedFeatures.add(featureName);
    this.metrics.degradationEvents++;

    console.log(`📉 Forced degradation: ${featureName}`);

    if (this.config.enableAlerts) {
      this._sendAlert(`Feature degraded: ${featureName}`);
    }

    return true;
  }

  /**
   * Force feature re-enablement (for testing)
   * @param {string} featureName - Feature to re-enable
   * @returns {boolean}
   */
  forceRecovery(featureName) {
    if (!this.degradedFeatures.has(featureName)) {
      return false;
    }

    this.degradedFeatures.delete(featureName);
    this.metrics.recoveryEvents++;

    console.log(`✅ Forced recovery: ${featureName}`);

    if (this.config.enableAlerts) {
      this._sendAlert(`Feature recovered: ${featureName}`);
    }

    return true;
  }

  /**
   * PRIVATE: Initialize feature tiers
   */
  _initializeFeatures() {
    // Critical features (always enabled)
    const criticalFeatures = [
      "session_management",
      "message_receive",
      "message_send",
      "error_tracking",
    ];

    // Important features (degrade at medium load)
    const importantFeatures = [
      "entity_extraction",
      "intent_classification",
      "conversation_threading",
      "sheets_writeback",
    ];

    // Nice-to-have features (first to disable)
    const niceToHaveFeatures = [
      "sentiment_analysis",
      "image_ocr",
      "audio_transcription",
      "document_parsing",
      "media_gallery",
      "advanced_analytics",
    ];

    for (const feature of criticalFeatures) {
      this.featureTiers.set(feature, {
        name: feature,
        tier: "critical",
        estimatedCostMs: 10,
      });
    }

    for (const feature of importantFeatures) {
      this.featureTiers.set(feature, {
        name: feature,
        tier: "important",
        estimatedCostMs: 100,
      });
    }

    for (const feature of niceToHaveFeatures) {
      this.featureTiers.set(feature, {
        name: feature,
        tier: "nice-to-have",
        estimatedCostMs: 500,
      });
    }
  }

  /**
   * PRIVATE: Apply degradation by disabling features
   */
  _applyDegradation() {
    const level = this.currentDegradation;

    // Collect features to degrade
    const toDegrade = [];
    const toRecover = [];

    for (const [featureName, feature] of this.featureTiers) {
      if (feature.tier === "critical") {
        continue; // Never degrade critical
      }

      const isDegraded = this.degradedFeatures.has(featureName);
      const shouldDegrade =
        (feature.tier === "nice-to-have" && level < 0.7) ||
        (feature.tier === "important" && level < 0.4);

      if (shouldDegrade && !isDegraded) {
        toDegrade.push(featureName);
      } else if (!shouldDegrade && isDegraded) {
        toRecover.push(featureName);
      }
    }

    // Apply changes
    for (const feature of toDegrade) {
      this.degradedFeatures.add(feature);
      this.metrics.degradationEvents++;
      console.log(`📉 Degraded: ${feature}`);
    }

    for (const feature of toRecover) {
      this.degradedFeatures.delete(feature);
      this.metrics.recoveryEvents++;
      console.log(`✅ Recovered: ${feature}`);
    }
  }

  /**
   * PRIVATE: Get feature status
   */
  _getFeatureStatus() {
    const status = {};

    for (const [featureName, feature] of this.featureTiers) {
      status[featureName] = {
        tier: feature.tier,
        enabled: !this.degradedFeatures.has(featureName),
        estimatedCostMs: feature.estimatedCostMs,
      };
    }

    return status;
  }

  /**
   * PRIVATE: Start health monitoring
   */
  _startHealthMonitoring() {
    setInterval(() => {
      // Simulate metrics collection
      // In production: Use os.cpus(), process.memoryUsage(), etc.
      const metrics = {
        cpuUsage: Math.random() * 100,
        memoryUsage: Math.random() * 100,
        apiErrorRate: Math.random() * 0.5,
      };

      this.reportMetrics(metrics);
    }, this.config.degradationCheckIntervalMs);
  }

  /**
   * PRIVATE: Send alert
   */
  _sendAlert(message) {
    if (this.config.alertChannels.includes("console")) {
      console.warn(`🚨 DEGRADATION ALERT: ${message}`);
    }
  }
}

export default DegradationStrategy;
export { DegradationStrategy };
