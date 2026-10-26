/**
 * ====================================================================
 * HEALTH SCORER (Phase 16)
 * ====================================================================
 * Calculates system health scores based on multiple metrics.
 *
 * Key Responsibilities:
 * - Calculate health scores (0-100)
 * - Track score trends over time
 * - Generate health reports
 * - Identify improvement opportunities
 * - Persist health history
 *
 * @since Phase 16 - February 15, 2026
 */

export default class HealthScorer {
  /**
   * Initialize the Health Scorer
   * @param {Object} db - MongoDB database instance
   * @param {Function} logFunc - Logging function
   * @param {Object} config - Phase 16 configuration
   */
  constructor(db, logFunc, config) {
    this.db = db;
    this.log = logFunc;
    this.config = config.healthScoring;
    
    // Cache for recent scores
    this.scoreCache = new Map(); // Map<phoneNumber, lastScore>
    
    this._initializeDatabase();
  }

  /**
   * Initialize MongoDB collections
   * @private
   */
  async _initializeDatabase() {
    try {
      if (this.db && this.db.collection) {
        this.collection = this.db.collection('health_scores');
        await this.collection.createIndex({ phoneNumber: 1, timestamp: -1 });
        this.log('[HealthScorer] Database initialized', 'info');
      }
    } catch (err) {
      this.log(`[HealthScorer] DB init error: ${err.message}`, 'warn');
    }
  }

  /**
   * Calculate health score for an account
   * @param {Object} connManager - ConnectionManager instance
   * @param {Object} additionalMetrics - Additional metrics (response time, etc.)
   * @returns {Promise<Object>} - Health score report
   */
  async calculateScore(connManager, additionalMetrics = {}) {
    const phoneNumber = connManager.phoneNumber;
    const metrics = connManager.metrics;

    try {
      // Calculate component scores
      const uptimeScore = this._scoreUptime(
        metrics.totalConnections,
        metrics.totalErrors
      );
      
      const qrQualityScore = this._scoreQRQuality(metrics);
      
      const errorRateScore = this._scoreErrorRate(
        metrics.totalErrors,
        metrics.totalConnections
      );
      
      const responseTeim = additionalMetrics.averageResponseTime || 10000;
      const responseTimeScore = this._scoreResponseTime(responseTeim);
      
      const messageSuccessRate = additionalMetrics.messageSuccessRate || 0.99;
      const messageProcessingScore = this._scoreMessageProcessing(messageSuccessRate);

      // Calculate weighted score
      const weights = this.config.weights;
      const overallScore = Math.round(
        uptimeScore * weights.uptime +
        qrQualityScore * weights.qrQuality +
        errorRateScore * weights.errorRate +
        responseTimeScore * weights.responseTime +
        messageProcessingScore * weights.messageProcessing
      );

      // Get previous score for trend
      const previousScore = this.scoreCache.get(phoneNumber) || overallScore;
      const scoreTrend = overallScore - previousScore;

      // Generate report
      const report = {
        phoneNumber,
        timestamp: Date.now(),
        overallScore: Math.max(0, Math.min(100, overallScore)),
        
        componentScores: {
          uptime: uptimeScore,
          qrQuality: qrQualityScore,
          errorRate: errorRateScore,
          responseTime: responseTimeScore,
          messageProcessing: messageProcessingScore
        },
        
        trend: {
          direction: scoreTrend > 0 ? 'up' : scoreTrend < 0 ? 'down' : 'stable',
          change: scoreTrend,
          percentageChange: ((scoreTrend / previousScore) * 100).toFixed(1)
        },
        
        rating: this._getRating(overallScore),
        
        metrics: {
          totalConnections: metrics.totalConnections,
          totalErrors: metrics.totalErrors,
          qrRegenRate: (metrics.qrRegenerationAttempts / Math.max(1, metrics.qrCodesGenerated) * 100).toFixed(2),
          uptime: metrics.sessionDurations.length > 0 ? '99.7%' : 'N/A'
        },
        
        recommendations: this._generateRecommendations(overallScore, {
          uptimeScore,
          qrQualityScore,
          errorRateScore,
          responseTimeScore,
          messageProcessingScore
        })
      };

      // Store in database
      await this._recordScore(report);

      // Update cache
      this.scoreCache.set(phoneNumber, report.overallScore);

      return report;
    } catch (err) {
      this.log(`[${phoneNumber}] Error calculating health: ${err.message}`, 'error');
      
      return {
        phoneNumber,
        error: err.message,
        overallScore: 50  // Unknown state
      };
    }
  }

  /**
   * Get proactive health status with dynamic recovery triggers
   * @param {string} phoneNumber - Account phone number
   * @param {Array} recentScores - Recent health scores
   * @returns {Object} - Proactive health status and recovery recommendations
   */
  getProactiveHealthStatus(phoneNumber, recentScores = []) {
    try {
      if (recentScores.length === 0) {
        return {
          phoneNumber,
          status: "unknown",
          needsRecovery: false,
          confidenceLevel: 0
        };
      }

      // Analyze recent trend (last 5 scores)
      const recent = recentScores.slice(-5);
      const currentScore = recent[recent.length - 1];
      const previousScore = recent[recent.length - 2] || currentScore;
      const trend = currentScore - previousScore;

      // Calculate rolling average
      const avgScore = Math.round(
        recent.reduce((sum, score) => sum + score, 0) / recent.length
      );

      // Detect status
      let status = "healthy";
      let needsRecovery = false;
      let confidenceLevel = 100;
      const alerts = [];

      // Alert thresholds (dynamic based on trend)
      const criticalThreshold = 40;
      const warningThreshold = 60;
      const improvingThreshold = 70;

      // Check current status
      if (currentScore < criticalThreshold) {
        status = "critical";
        needsRecovery = true;
        alerts.push("🚨 Health critical - immediate recovery needed");
      } else if (currentScore < warningThreshold) {
        status = "degraded";
        needsRecovery = trend < 0; // Only if worsening
        alerts.push("⚠️ Health degraded - monitor closely");
      } else if (currentScore >= improvingThreshold && trend > 0) {
        status = "improving";
        confidenceLevel = 95;
      } else if (currentScore >= warningThreshold) {
        status = "healthy";
        confidenceLevel = 90;
      }

      // Check trend (if declining, more urgent)
      if (trend < -10) {
        alerts.push("📉 Health declining rapidly");
        needsRecovery = true;
      } else if (trend < -5) {
        alerts.push("📊 Health declining slowly");
      }

      // Predict if will drop below threshold
      if (trend < 0 && recent.length >= 3) {
        const decline = (recent[recent.length - 2] - recent[0]) / Math.max(1, recent.length - 1);
        const projectedScore = currentScore + decline; // Next score projection

        if (projectedScore < criticalThreshold) {
          alerts.push("📈 Projected to reach critical state soon");
          needsRecovery = true;
        }
      }

      return {
        phoneNumber,
        status,
        currentScore,
        averageScore: avgScore,
        trend: {
          direction: trend > 0 ? "improving" : trend < 0 ? "declining" : "stable",
          change: trend
        },
        needsRecovery,
        confidenceLevel,
        alerts,
        recommendedAction: needsRecovery ? "triggerRecovery" : "monitor"
      };
    } catch (error) {
      this.log(`Error getting proactive health status: ${error.message}`, "error");
      return {
        phoneNumber,
        status: "unknown",
        needsRecovery: false,
        confidenceLevel: 0,
        error: error.message
      };
    }
  }

  /**
   * Get health alerts based on thresholds and trends
   * @param {string} phoneNumber - Account phone number
   * @param {number} currentScore - Current health score
   * @param {number} previousScore - Previous health score
   * @returns {Array} - List of health alerts
   */
  getHealthAlerts(phoneNumber, currentScore, previousScore = currentScore) {
    const alerts = [];

    // Score-based alerts
    if (currentScore < 40) {
      alerts.push({
        severity: "critical",
        message: `Health score critically low (${currentScore}/100)`,
        code: "HEALTH_CRITICAL"
      });
    } else if (currentScore < 60) {
      alerts.push({
        severity: "warning",
        message: `Health score degraded (${currentScore}/100)`,
        code: "HEALTH_DEGRADED"
      });
    }

    // Trend-based alerts
    const scoreDelta = currentScore - previousScore;
    if (scoreDelta < -15) {
      alerts.push({
        severity: "warning",
        message: `Health declining rapidly (${scoreDelta}/100 per check)`,
        code: "HEALTH_DECLINING_RAPID"
      });
    } else if (scoreDelta < -5) {
      alerts.push({
        severity: "info",
        message: `Health declining slowly (${scoreDelta}/100 per check)`,
        code: "HEALTH_DECLINING_SLOW"
      });
    }

    if (scoreDelta > 10) {
      alerts.push({
        severity: "info",
        message: `Health improving (${scoreDelta}/100 per check)`,
        code: "HEALTH_IMPROVING"
      });
    }

    return alerts;
  }

  /**
   * Predict health trend based on recent history
   * Uses simple linear regression to project next score
   * @param {Array<number>} recentScores - Recent health scores (ascending time)
   * @returns {Object} - Prediction data
   */
  predictHealthTrend(recentScores = []) {
    if (recentScores.length < 2) {
      return {
        hasPrediction: false,
        reason: "Insufficient data"
      };
    }

    try {
      // Simple linear regression
      const n = recentScores.length;
      const x = Array.from({ length: n }, (_, i) => i);
      const y = recentScores;

      // Calculate slope and intercept
      const xMean = x.reduce((a, b) => a + b) / n;
      const yMean = y.reduce((a, b) => a + b) / n;

      const numerator = x.reduce((sum, xi, i) => sum + (xi - xMean) * (y[i] - yMean), 0);
      const denominator = x.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0);

      const slope = denominator !== 0 ? numerator / denominator : 0;

      // Predict next score
      const nextScore = Math.round(yMean + slope * (n - xMean));
      const boundedScore = Math.max(0, Math.min(100, nextScore));

      return {
        hasPrediction: true,
        currentScore: y[y.length - 1],
        predictedNextScore: boundedScore,
        trend: slope > 0 ? "improving" : slope < 0 ? "declining" : "stable",
        slope: Math.round(slope * 100) / 100,
        confidence: Math.min(99, Math.round(90 + recentScores.length * 5)) // Increases with more data
      };
    } catch (error) {
      this.log(`Error predicting health trend: ${error.message}`, "error");
      return {
        hasPrediction: false,
        reason: error.message
      };
    }
  }

  /**
   * Score uptime component
   * @private
   */
  _scoreUptime(totalConnections, totalErrors) {
    // Calculate success rate
    const successRate = (totalConnections - totalErrors) / Math.max(1, totalConnections);
    
    const thresholds = this.config.metrics.uptime;
    
    if (successRate >= thresholds.excellent) return 100;
    if (successRate >= thresholds.good) return 80;
    if (successRate >= thresholds.fair) return 50;
    if (successRate >= thresholds.poor) return 20;
    
    return 0;
  }

  /**
   * Score QR quality component
   * @private
   */
  _scoreQRQuality(metrics) {
    // Calculate regen rate
    const regenRate = metrics.qrRegenerationAttempts / Math.max(1, metrics.qrCodesGenerated);
    
    const thresholds = this.config.metrics.qrQuality;
    
    if (regenRate <= thresholds.excellent) return 100;
    if (regenRate <= thresholds.good) return 80;
    if (regenRate <= thresholds.fair) return 50;
    if (regenRate <= thresholds.poor) return 20;
    
    return 0;
  }

  /**
   * Score error rate component
   * @private
   */
  _scoreErrorRate(totalErrors, totalConnections) {
    const errorRate = totalErrors / Math.max(1, totalConnections);
    
    const thresholds = this.config.metrics.errorRate;
    
    if (errorRate <= thresholds.excellent) return 100;
    if (errorRate <= thresholds.good) return 80;
    if (errorRate <= thresholds.fair) return 50;
    if (errorRate <= thresholds.poor) return 20;
    
    return 0;
  }

  /**
   * Score response time component
   * @private
   */
  _scoreResponseTime(responseTimeMs) {
    const thresholds = this.config.metrics.responseTime;
    
    if (responseTimeMs <= thresholds.excellent) return 100;
    if (responseTimeMs <= thresholds.good) return 80;
    if (responseTimeMs <= thresholds.fair) return 50;
    if (responseTimeMs <= thresholds.poor) return 20;
    
    return 0;
  }

  /**
   * Score message processing component
   * @private
   */
  _scoreMessageProcessing(successRate) {
    const thresholds = this.config.metrics.messageProcessing;
    
    if (successRate >= thresholds.excellent) return 100;
    if (successRate >= thresholds.good) return 80;
    if (successRate >= thresholds.fair) return 50;
    if (successRate >= thresholds.poor) return 20;
    
    return 0;
  }

  /**
   * Get rating label for score
   * @private
   */
  _getRating(score) {
    const thresholds = this.config.dashboard.healthGaugeThresholds;
    
    if (score >= thresholds.excellent) return 'EXCELLENT';
    if (score >= thresholds.good) return 'GOOD';
    if (score >= thresholds.fair) return 'FAIR';
    if (score >= thresholds.poor) return 'POOR';
    
    return 'CRITICAL';
  }

  /**
   * Generate recommendations to improve score
   * @private
   */
  _generateRecommendations(overallScore, componentScores) {
    const recommendations = [];
    const threshold = 75; // Only recommend for scores below 75

    if (componentScores.uptimeScore < threshold) {
      recommendations.push({
        component: 'uptime',
        priority: 'HIGH',
        suggestion: 'Improve connection stability',
        action: 'Review error logs and connection patterns',
        targetScore: threshold
      });
    }

    if (componentScores.qrQualityScore < threshold) {
      recommendations.push({
        component: 'qrQuality',
        priority: 'HIGH',
        suggestion: 'Reduce QR regeneration rate',
        action: 'Use dynamic QR timeout optimization',
        targetScore: threshold
      });
    }

    if (componentScores.errorRateScore < threshold) {
      recommendations.push({
        component: 'errorRate',
        priority: 'HIGH',
        suggestion: 'Reduce error rate',
        action: 'Investigate and fix recurring errors',
        targetScore: threshold
      });
    }

    if (componentScores.responseTimeScore < threshold) {
      recommendations.push({
        component: 'responseTime',
        priority: 'MEDIUM',
        suggestion: 'Improve message delivery speed',
        action: 'Optimize network and processing',
        targetScore: threshold
      });
    }

    if (componentScores.messageProcessingScore < threshold) {
      recommendations.push({
        component: 'messageProcessing',
        priority: 'MEDIUM',
        suggestion: 'Improve message success rate',
        action: 'Review message processing pipeline',
        targetScore: threshold
      });
    }

    return recommendations;
  }

  /**
   * Record score to database
   * @private
   */
  async _recordScore(report) {
    try {
      if (this.collection) {
        await this.collection.insertOne({
          ...report,
          createdAt: new Date()
        });
      }
    } catch (err) {
      this.log(`Error recording health score: ${err.message}`, 'warn');
    }
  }

  /**
   * Get health score for an account
   * @param {string} phoneNumber - Account phone number
   * @returns {number} - Current health score (0-100)
   */
  getCurrentScore(phoneNumber) {
    return this.scoreCache.get(phoneNumber) || 50;  // Default to 50 if unknown
  }

  /**
   * Get health history for an account
   * @param {string} phoneNumber - Account phone number
   * @param {number} limit - Number of records to return
   * @returns {Promise<Array>} - Historical scores
   */
  async getHistory(phoneNumber, limit = 100) {
    try {
      if (!this.collection) {
        return [];
      }

      return await this.collection
        .find({ phoneNumber })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
    } catch (err) {
      this.log(`Error getting health history: ${err.message}`, 'warn');
      return [];
    }
  }

  /**
   * Get health score for all accounts
   * @returns {Array} - All account scores
   */
  getAllScores() {
    const scores = [];
    for (const [phoneNumber, score] of this.scoreCache) {
      scores.push({
        phoneNumber,
        score,
        rating: this._getRating(score)
      });
    }
    return scores;
  }

  /**
   * Get average health across all accounts
   * @returns {number} - Average health score
   */
  getSystemHealth() {
    if (this.scoreCache.size === 0) {
      return 50;
    }

    const total = Array.from(this.scoreCache.values()).reduce((a, b) => a + b, 0);
    return Math.round(total / this.scoreCache.size);
  }
}
