/**
 * ====================================================================
 * PHASE 16 ORCHESTRATOR
 * ====================================================================
 * Central orchestration hub for Phase 16 enhancements.
 * Coordinates QRScanSpeedAnalyzer, HealthScorer, ConnectionDiagnostics,
 * and NotificationManager into a unified monitoring & optimization system.
 *
 * Key Responsibilities:
 * - Initialize all Phase 16 modules
 * - Coordinate module interactions
 * - Provide dashboard/CLI interface
 * - Manage periodic health check cycles
 * - Route events through the pipeline
 * - Export metrics for terminal display
 *
 * @since Phase 16 - February 16, 2026
 */

export default class Phase16Orchestrator {
  /**
   * Initialize the Phase 16 Orchestrator
   * @param {Object} db - MongoDB database instance
   * @param {Function} logFunc - Logging function
   * @param {Object} config - Phase 16 configuration
   * @param {Object} modules - Pre-initialized modules
   *   - qrAnalyzer: QRScanSpeedAnalyzer instance
   *   - healthScorer: HealthScorer instance
   *   - diagnostics: ConnectionDiagnostics instance
   *   - notificationManager: NotificationManager instance
   * @param {Object} connectionManager - ConnectionManager instance
   */
  constructor(db, logFunc, config, modules, connectionManager) {
    this.db = db;
    this.log = logFunc;
    this.config = config;
    this.modules = modules;
    this.connectionManager = connectionManager;

    // Integration state
    this.isRunning = false;
    this.lastHealthCheck = new Map(); // Map<phoneNumber, timestamp>
    this.dashboardData = new Map(); // Map<phoneNumber, latest dashboard state>
    this.eventQueue = []; // Event queue for monitoring

    // Timers
    this.healthCheckTimer = null;
    this.metricsAggregationTimer = null;
    this.dashboardUpdateTimer = null;

    // Statistics
    this.stats = {
      qrScansRecorded: 0,
      healthChecksRun: 0,
      diagnosticsRun: 0,
      notificationsSent: 0,
      issuesDetected: 0,
      recommendationsGenerated: 0
    };

    this.log('[Phase16Orchestrator] Initialized', 'info');
  }

  /**
   * Start the orchestrator
   * @returns {Promise<void>}
   */
  async start() {
    if (this.isRunning) {
      this.log(
        '[Phase16Orchestrator] Already running',
        'warn'
      );
      return;
    }

    try {
      this.isRunning = true;

      // Start periodic cycles
      this._startHealthCheckCycle();
      this._startMetricsAggregationCycle();
      this._startDashboardUpdateCycle();

      this.log(
        '[Phase16Orchestrator] Started - All monitoring cycles active',
        'info'
      );
    } catch (err) {
      this.log(
        `[Phase16Orchestrator] Start error: ${err.message}`,
        'error'
      );
      this.isRunning = false;
    }
  }

  /**
   * Stop the orchestrator
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    try {
      // Clear timers
      if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
      if (this.metricsAggregationTimer) clearInterval(this.metricsAggregationTimer);
      if (this.dashboardUpdateTimer) clearInterval(this.dashboardUpdateTimer);

      this.isRunning = false;

      this.log(
        '[Phase16Orchestrator] Stopped',
        'info'
      );
    } catch (err) {
      this.log(
        `[Phase16Orchestrator] Stop error: ${err.message}`,
        'error'
      );
    }
  }

  /**
   * Record a QR scan event (called from ConnectionManager)
   * @param {string} phoneNumber - Account phone number
   * @param {number} scanTimeMs - Time from display to scan in ms
   * @returns {Promise<void>}
   */
  async recordQRScan(phoneNumber, scanTimeMs) {
    try {
      if (this.modules.qrAnalyzer) {
        await this.modules.qrAnalyzer.recordQRScan(phoneNumber, scanTimeMs);
        this.stats.qrScansRecorded++;

        // Add to event queue
        this._queueEvent({
          type: 'QR_SCAN',
          phoneNumber,
          scanTimeMs,
          timestamp: Date.now()
        });

        // Check if we have enough data for timeout optimization
        const metrics = await this.modules.qrAnalyzer.getMetrics(phoneNumber);
        if (metrics.hasEnoughData) {
          this._updateConnectionManagerTimeout(phoneNumber, metrics.recommendedTimeout);
        }
      }
    } catch (err) {
      this.log(
        `[${phoneNumber}] Error recording QR scan: ${err.message}`,
        'error'
      );
    }
  }

  /**
   * Start health check cycle
   * @private
   */
  _startHealthCheckCycle() {
    const interval = this.config.healthScoring?.calculateInterval || 300000; // 5 min

    this.healthCheckTimer = setInterval(async () => {
      await this._runHealthCheckCycle();
    }, interval);

    this.log(
      `[Phase16Orchestrator] Health check cycle started (${interval}ms)`,
      'debug'
    );
  }

  /**
   * Run a complete health check cycle
   * @private
   */
  async _runHealthCheckCycle() {
    try {
      if (!this.connectionManager || !this.modules.healthScorer) {
        return;
      }

      // Get all active accounts
      const accounts = this.connectionManager.getActiveAccounts?.() || [];

      for (const account of accounts) {
        try {
          // Calculate health score
          const healthReport = await this.modules.healthScorer.calculateScore(
            account
          );

          this.stats.healthChecksRun++;

          // Queue event
          this._queueEvent({
            type: 'HEALTH_CHECK',
            phoneNumber: account.phoneNumber,
            score: healthReport.overallScore,
            rating: healthReport.rating,
            timestamp: Date.now()
          });

          // Store dashboard state
          this.dashboardData.set(account.phoneNumber, {
            health: healthReport,
            updatedAt: Date.now()
          });

          // Run diagnostics if score is low
          if (healthReport.overallScore < 70) {
            await this._runDiagnosticsForAccount(account);
          }
        } catch (err) {
          this.log(
            `[${account?.phoneNumber}] Health check error: ${err.message}`,
            'error'
          );
        }
      }
    } catch (err) {
      this.log(
        `[Phase16Orchestrator] Health check cycle error: ${err.message}`,
        'error'
      );
    }
  }

  /**
   * Run diagnostics for a specific account
   * @private
   */
  async _runDiagnosticsForAccount(account) {
    try {
      if (!this.modules.diagnostics) {
        return;
      }

      const diagnosticReport = await this.modules.diagnostics.analyzeConnection(account);
      this.stats.diagnosticsRun++;

      // Queue event
      this._queueEvent({
        type: 'DIAGNOSTICS',
        phoneNumber: account.phoneNumber,
        issueCount: diagnosticReport.issues?.length || 0,
        severity: diagnosticReport.severity,
        timestamp: Date.now()
      });

      // Count issues
      if (diagnosticReport.issues) {
        this.stats.issuesDetected += diagnosticReport.issues.length;
      }

      // Count recommendations
      if (diagnosticReport.recommendations) {
        this.stats.recommendationsGenerated += diagnosticReport.recommendations.length;
      }

      // Send notifications for critical issues
      if (diagnosticReport.severity === 'HIGH' || diagnosticReport.severity === 'CRITICAL') {
        await this._sendDiagnosticNotifications(
          account.phoneNumber,
          diagnosticReport
        );
      }

      return diagnosticReport;
    } catch (err) {
      this.log(
        `[${account?.phoneNumber}] Diagnostics error: ${err.message}`,
        'error'
      );
    }
  }

  /**
   * Send notifications for diagnostic findings
   * @private
   */
  async _sendDiagnosticNotifications(phoneNumber, diagnosticReport) {
    try {
      if (!this.modules.notificationManager) {
        return;
      }

      const { issues, recommendations, severity } = diagnosticReport;

      if (!issues || issues.length === 0) {
        return;
      }

      // Build notification message
      const issuesSummary = issues
        .map(i => `• ${i.description}`)
        .join('\n');

      const template = `🚨 Connection Issue Detected

${issuesSummary}

Recommendations:
${recommendations
  ?.map(r => `• ${r.description}: ${r.action}`)
  .join('\n')}

Health Score: ${diagnosticReport?.score || 'N/A'}
Time: ${new Date().toLocaleString()}`;

      const result = await this.modules.notificationManager.send({
        type: 'CONNECTION_ISSUE',
        phoneNumber,
        channels: ['inApp'], // Terminal-based, use in-app
        priority: severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        template
      });

      if (result.status === 'sent' || result.status === 'aggregated') {
        this.stats.notificationsSent++;
      }
    } catch (err) {
      this.log(
        `[${phoneNumber}] Error sending diagnostic notifications: ${err.message}`,
        'error'
      );
    }
  }

  /**
   * Start metrics aggregation cycle
   * @private
   */
  _startMetricsAggregationCycle() {
    const interval = 60000; // 1 minute

    this.metricsAggregationTimer = setInterval(async () => {
      await this._aggregateMetrics();
    }, interval);

    this.log(
      '[Phase16Orchestrator] Metrics aggregation cycle started',
      'debug'
    );
  }

  /**
   * Aggregate metrics from all modules
   * @private
   */
  async _aggregateMetrics() {
    try {
      // Get bulk metrics from QR analyzer
      if (this.modules.qrAnalyzer) {
        const qrMetrics = await this.modules.qrAnalyzer.getBulkMetrics();

        for (const metric of qrMetrics) {
          const dashboard = this.dashboardData.get(metric.phoneNumber) || {};
          dashboard.qr = metric;
          this.dashboardData.set(metric.phoneNumber, { ...dashboard, updatedAt: Date.now() });
        }
      }

      // Get all health scores
      if (this.modules.healthScorer) {
        const allScores = this.modules.healthScorer.getAllScores();

        for (const scoreData of allScores) {
          const dashboard = this.dashboardData.get(scoreData.phoneNumber) || {};
          dashboard.score = scoreData.score;
          dashboard.rating = scoreData.rating;
          this.dashboardData.set(scoreData.phoneNumber, { ...dashboard, updatedAt: Date.now() });
        }
      }

      // Get all active issues
      if (this.modules.diagnostics) {
        const allIssues = this.modules.diagnostics.getAllActiveIssues();

        if (allIssues.length > 0) {
          const issuesByPhone = {};
          for (const issue of allIssues) {
            if (!issuesByPhone[issue.phoneNumber]) {
              issuesByPhone[issue.phoneNumber] = [];
            }
            issuesByPhone[issue.phoneNumber].push(issue);
          }

          for (const [phoneNumber, issues] of Object.entries(issuesByPhone)) {
            const dashboard = this.dashboardData.get(phoneNumber) || {};
            dashboard.issues = issues;
            this.dashboardData.set(phoneNumber, { ...dashboard, updatedAt: Date.now() });
          }
        }
      }
    } catch (err) {
      this.log(
        `[Phase16Orchestrator] Metrics aggregation error: ${err.message}`,
        'error'
      );
    }
  }

  /**
   * Start dashboard update cycle
   * @private
   */
  _startDashboardUpdateCycle() {
    const interval = this.config.dashboard?.refreshInterval || 5000; // 5 sec

    this.dashboardUpdateTimer = setInterval(() => {
      this._updateDashboard();
    }, interval);

    this.log(
      '[Phase16Orchestrator] Dashboard update cycle started',
      'debug'
    );
  }

  /**
   * Update dashboard display
   * @private
   */
  _updateDashboard() {
    // This is called periodically to refresh terminal display
    // The actual rendering is handled by HealthDashboardCLI or TerminalHealthDashboard
    // We just maintain the data here

    // Emit dashboard update event (for listeners)
    if (this.eventQueue.length > 0) {
      // Event queue is managed somewhere
      // Could emit to event emitter or log
    }
  }

  /**
   * Queue an event for monitoring
   * @private
   */
  _queueEvent(event) {
    this.eventQueue.push(event);

    // Keep queue bounded
    if (this.eventQueue.length > 1000) {
      this.eventQueue.shift();
    }
  }

  /**
   * Update ConnectionManager timeout dynamically
   * @private
   */
  _updateConnectionManagerTimeout(phoneNumber, recommendedTimeout) {
    try {
      if (this.connectionManager?.setDynamicTimeout) {
        this.connectionManager.setDynamicTimeout(phoneNumber, recommendedTimeout);

        this.log(
          `[${phoneNumber}] Dynamic timeout updated: ${Math.round(recommendedTimeout / 1000)}s`,
          'info'
        );
      }
    } catch (err) {
      this.log(
        `[${phoneNumber}] Error updating timeout: ${err.message}`,
        'warn'
      );
    }
  }

  /**
   * Get comprehensive dashboard state
   * @returns {Object} - Complete dashboard state for terminal rendering
   */
  getDashboardState() {
    const accounts = [];

    for (const [phoneNumber, state] of this.dashboardData) {
      accounts.push({
        phoneNumber,
        ...state
      });
    }

    return {
      timestamp: Date.now(),
      isRunning: this.isRunning,
      accounts,
      eventQueue: this.eventQueue,
      stats: this.stats,
      totalAccounts: accounts.length,
      healthyAccounts: accounts.filter(a => a.score >= 75).length,
      issuesCount: this.stats.issuesDetected
    };
  }

  /**
   * Get operational summary for terminal
   * @returns {Object} - Summary statistics
   */
  getSummary() {
    return {
      status: this.isRunning ? 'RUNNING' : 'STOPPED',
      uptime: this.isRunning ? Date.now() - this.startTime : 0,
      stats: this.stats,
      dashboardState: this.getDashboardState()
    };
  }

  /**
   * Get metrics for a specific account
   * @param {string} phoneNumber - Account phone number
   * @returns {Object} - Account metrics
   */
  getAccountMetrics(phoneNumber) {
    const dashboard = this.dashboardData.get(phoneNumber);

    return {
      phoneNumber,
      health: dashboard?.health || null,
      qr: dashboard?.qr || null,
      score: dashboard?.score || null,
      rating: dashboard?.rating || null,
      issues: dashboard?.issues || [],
      updatedAt: dashboard?.updatedAt || null
    };
  }

  /**
   * Get event history
   * @param {number} limit - Max events to return
   * @returns {Array} - Event queue
   */
  getEventHistory(limit = 50) {
    return this.eventQueue.slice(-limit);
  }

  /**
   * Get all statistics
   * @returns {Object} - Aggregated statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      accountsMonitored: this.dashboardData.size,
      eventQueueSize: this.eventQueue.length,
      isRunning: this.isRunning
    };
  }
}
