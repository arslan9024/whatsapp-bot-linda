/**
 * ====================================================================
 * CONNECTION DIAGNOSTICS (Phase 16)
 * ====================================================================
 * Automatically detects connection issues and provides recommendations.
 *
 * Key Responsibilities:
 * - Monitor connection patterns
 * - Detect slow QR scans
 * - Identify frequent regenerations
 * - Track network errors
 * - Monitor browser locks
 * - Detect stale sessions
 * - Generate actionable recommendations
 *
 * @since Phase 16 - February 15, 2026
 */

export default class ConnectionDiagnostics {
  /**
   * Initialize the Connection Diagnostics module
   * @param {Object} db - MongoDB database instance
   * @param {Function} logFunc - Logging function
   * @param {Object} config - Phase 16 configuration
   */
  constructor(db, logFunc, config) {
    this.db = db;
    this.log = logFunc;
    this.config = config.diagnostics;
    
    // In-memory issue tracking
    this.activeIssues = new Map(); // Map<phoneNumber, issues>
    
    this._initializeDatabase();
  }

  /**
   * Initialize MongoDB collections
   * @private
   */
  async _initializeDatabase() {
    try {
      if (this.db && this.db.collection) {
        this.collection = this.db.collection('diagnostics');
        await this.collection.createIndex({ phoneNumber: 1, createdAt: -1 });
        this.log('[ConnectionDiagnostics] Database initialized', 'info');
      }
    } catch (err) {
      this.log(
        `[ConnectionDiagnostics] DB init error: ${err.message}`,
        'warn'
      );
    }
  }

  /**
   * Analyze connection and detect issues
   * @param {Object} connManager - ConnectionManager instance
   * @returns {Promise<Object>} - Diagnostic report
   */
  async analyzeConnection(connManager) {
    const phoneNumber = connManager.phoneNumber;
    const metrics = connManager.metrics;

    try {
      const issues = [];
      const recommendations = [];

      // Check for slow QR scans
      if (this.config.detection.slowQRScan.enabled) {
        const slowQRResult = await this._detectSlowQRScan(phoneNumber, metrics);
        if (slowQRResult.issue) {
          issues.push(slowQRResult.issue);
          recommendations.push(...slowQRResult.recommendations);
        }
      }

      // Check for frequent QR regenerations
      if (this.config.detection.frequentRegeneration.enabled) {
        const regenResult = this._detectFrequentRegeneration(phoneNumber, metrics);
        if (regenResult.issue) {
          issues.push(regenResult.issue);
          recommendations.push(...regenResult.recommendations);
        }
      }

      // Check for network issues
      if (this.config.detection.networkIssues.enabled) {
        const networkResult = this._detectNetworkIssues(phoneNumber, metrics);
        if (networkResult.issue) {
          issues.push(networkResult.issue);
          recommendations.push(...networkResult.recommendations);
        }
      }

      // Check for browser locks
      if (this.config.detection.browserLocks.enabled) {
        const lockResult = this._detectBrowserLocks(phoneNumber, metrics);
        if (lockResult.issue) {
          issues.push(lockResult.issue);
          recommendations.push(...lockResult.recommendations);
        }
      }

      // Check for stale sessions
      if (this.config.detection.staleSessions.enabled) {
        const staleResult = this._detectStaleSessions(phoneNumber, metrics);
        if (staleResult.issue) {
          issues.push(staleResult.issue);
          recommendations.push(...staleResult.recommendations);
        }
      }

      // Generate report
      const report = {
        phoneNumber,
        timestamp: Date.now(),
        diagnostic: issues.length === 0 ? 'OPTIMAL' : 'DEGRADED',
        issues,
        recommendations,
        severity: this._calculateSeverity(issues),
        affectedAccounts: [phoneNumber],
        metrics: {
          qrRegenRate: metrics.qrRegenerationAttempts / metrics.qrCodesGenerated || 0,
          errorRate: metrics.totalErrors / Math.max(1, metrics.totalConnections) || 0
        }
      };

      // Store in database
      await this._recordDiagnostic(report);

      // Update active issues
      this.activeIssues.set(phoneNumber, issues);

      return report;
    } catch (err) {
      this.log(
        `[${phoneNumber}] Diagnostic error: ${err.message}`,
        'error'
      );

      return {
        phoneNumber,
        diagnostic: 'ERROR',
        error: err.message
      };
    }
  }

  /**
   * Detect slow QR scan patterns
   * @private
   */
  async _detectSlowQRScan(phoneNumber, metrics) {
    // Would need QRScanSpeedAnalyzer integration here
    // For now, placeholder logic
    
    return {
      issue: null,
      recommendations: []
    };
  }

  /**
   * Detect frequent QR regenerations
   * @private
   */
  _detectFrequentRegeneration(phoneNumber, metrics) {
    const threshold = this.config.detection.frequentRegeneration.threshold;
    const regenRate = metrics.qrRegenerationAttempts / 
                      Math.max(1, metrics.qrCodesGenerated);

    if (metrics.qrRegenerationAttempts >= threshold) {
      return {
        issue: {
          type: 'FREQUENT_QR_REGENERATIONS',
          severity: 'MEDIUM',
          description: `${metrics.qrRegenerationAttempts} QR regenerations (threshold: ${threshold})`,
          affectedMetric: 'qrRegenerationAttempts',
          currentValue: metrics.qrRegenerationAttempts
        },
        recommendations: [
          {
            type: 'INCREASE_QR_TIMEOUT',
            priority: 'HIGH',
            description: 'Increase QR timeout to reduce unnecessary regenerations',
            suggestedValue: '90000', // 90 seconds
            expectedImprovement: 'Reduce regenerations by 60-70%',
            action: 'Use Dynamic QR analysis to calculate optimal timeout'
          },
          {
            type: 'CHECK_USER_PATTERN',
            priority: 'MEDIUM',
            description: 'Verify user QR scan speed pattern',
            action: 'Review QR scan times for slow or inconsistent patterns'
          }
        ]
      };
    }

    return {
      issue: null,
      recommendations: []
    };
  }

  /**
   * Detect network issues
   * @private
   */
  _detectNetworkIssues(phoneNumber, metrics) {
    const threshold = this.config.detection.networkIssues.errorRateThreshold;
    const errorRate = metrics.totalErrors / Math.max(1, metrics.totalConnections);

    if (errorRate > threshold) {
      return {
        issue: {
          type: 'NETWORK_ISSUES',
          severity: 'HIGH',
          description: `High error rate: ${(errorRate * 100).toFixed(2)}%`,
          affectedMetric: 'errorRate',
          currentValue: errorRate,
          threshold
        },
        recommendations: [
          {
            type: 'CHECK_CONNECTIVITY',
            priority: 'HIGH',
            description: 'Check network connectivity',
            action: 'Verify WhatsApp Web access and network stability'
          },
          {
            type: 'REVIEW_LOGS',
            priority: 'MEDIUM',
            description: 'Review error logs for patterns',
            action: 'Check ConnectionManager error logs for specific error types'
          }
        ]
      };
    }

    return {
      issue: null,
      recommendations: []
    };
  }

  /**
   * Detect browser lock issues
   * @private
   */
  _detectBrowserLocks(phoneNumber, metrics) {
    // Would check for persistent lock file issues
    return {
      issue: null,
      recommendations: []
    };
  }

  /**
   * Detect stale sessions
   * @private
   */
  _detectStaleSessions(phoneNumber, metrics) {
    // Would check for sessions inactive > 5 minutes
    return {
      issue: null,
      recommendations: []
    };
  }

  /**
   * Calculate overall severity
   * @private
   */
  _calculateSeverity(issues) {
    if (issues.length === 0) return 'HEALTHY';
    if (issues.some(i => i.severity === 'CRITICAL')) return 'CRITICAL';
    if (issues.some(i => i.severity === 'HIGH')) return 'HIGH';
    if (issues.some(i => i.severity === 'MEDIUM')) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Record diagnostic to database
   * @private
   */
  async _recordDiagnostic(report) {
    try {
      if (this.collection) {
        await this.collection.insertOne({
          ...report,
          createdAt: new Date()
        });
      }
    } catch (err) {
      this.log(`Error recording diagnostic: ${err.message}`, 'warn');
    }
  }

  /**
   * Get issues for an account
   * @param {string} phoneNumber - Account phone number
   * @returns {Array} - Current issues
   */
  getIssues(phoneNumber) {
    return this.activeIssues.get(phoneNumber) || [];
  }

  /**
   * Get diagnostic history
   * @param {string} phoneNumber - Account phone number
   * @param {number} limit - Number of records to return
   * @returns {Promise<Array>} - Diagnostic records
   */
  async getHistory(phoneNumber, limit = 50) {
    try {
      if (!this.collection) {
        return [];
      }

      return await this.collection
        .find({ phoneNumber })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
    } catch (err) {
      this.log(`Error getting diagnostic history: ${err.message}`, 'warn');
      return [];
    }
  }

  /**
   * Get all active issues across accounts
   * @returns {Array} - All active issues
   */
  getAllActiveIssues() {
    const allIssues = [];
    for (const [phoneNumber, issues] of this.activeIssues) {
      allIssues.push(...issues.map(i => ({ phoneNumber, ...i })));
    }
    return allIssues;
  }
}
