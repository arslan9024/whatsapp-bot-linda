/**
 * ReportGenerator.js
 * 
 * Phase 29e: Analytics & Reporting - Report Generation
 * 
 * Generates comprehensive reports from analytics and uptime data:
 * - Performance reports
 * - SLA compliance reports
 * - Incident reports
 * - Health summaries
 * - Export formats (JSON, CSV, text)
 * 
 * Features:
 * - Multiple report types
 * - Custom time ranges
 * - Export/formatting options
 * - Historical data analysis
 * - Trend analysis
 * 
 * Usage:
 *   const reporter = new ReportGenerator(analyticsManager, uptimeTracker);
 *   const report = reporter.generatePerformanceReport();
 *   reporter.exportAsJSON(report, 'report.json');
 */

class ReportGenerator {
  constructor(analyticsManager, uptimeTracker) {
    this.analytics = analyticsManager;
    this.uptime = uptimeTracker;
    this.enableLogging = true;
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport(timeRange = 'hour') {
    const analytics = this.analytics.getAllMetrics();
    const summary = this.analytics.getSummaryReport();

    return {
      reportType: 'PERFORMANCE_REPORT',
      timeRange,
      generatedAt: new Date().toISOString(),
      
      executive: {
        uptime: analytics.uptime + 's',
        status: 'operational',
        issuesCount: this.analytics.getAnomalies().length,
        summary: this._generateExecutiveSummary(summary)
      },

      messaging: {
        received: summary.messages.received,
        sent: summary.messages.sent,
        total: summary.messages.total,
        avgPerSecond: this._calculateRate(summary.messages.total, analytics.uptime)
      },

      cache: {
        hitRate: summary.cache.hitRate,
        totalRequests: summary.cache.totalRequests,
        hits: summary.cache.hits,
        misses: summary.cache.misses,
        avgResponseTime: analytics.metrics.cache.avgResponseTime + 'ms',
        performance: this._ratePerformance(parseFloat(summary.cache.hitRate))
      },

      database: {
        totalOperations: analytics.metrics.database.totalOps,
        successRate: analytics.metrics.database.successRate,
        errors: analytics.metrics.database.errors,
        avgDuration: this._calculateAvgDuration(analytics.metrics.database.operations),
        recentErrors: this._getRecentDatabaseErrors(analytics.metrics.database.operations)
      },

      errors: {
        total: summary.errors.total,
        rate: summary.errors.rate,
        types: this._categorizeErrors(analytics.metrics.errors),
        severity: this._getSeverityBreakdown(analytics.metrics.errors),
        recentErrors: analytics.metrics.errors.slice(-5)
      },

      relinking: {
        totalAttempts: summary.relinking.totalAttempts,
        successRate: summary.relinking.successRate,
        performance: this._ratePerformance(parseFloat(summary.relinking.successRate))
      },

      recovery: {
        disconnections: summary.recovery.disconnections,
        recoveryRate: summary.recovery.recoverySuccessRate,
        circuitTrips: summary.recovery.circuitTrips,
        performanceRating: this._ratePerformance(parseFloat(summary.recovery.recoverySuccessRate))
      },

      system: {
        accountsOnline: summary.system.accountsOnline,
        accountsTotal: summary.system.accountsTotal,
        degradationPercentage: summary.system.degradationPercentage,
        memoryUsage: analytics.metrics.system.memoryUsage,
        cpuUsage: analytics.metrics.system.cpuUsage
      },

      anomalies: this.analytics.getAnomalies(),

      recommendations: this._generateRecommendations(summary, analytics)
    };
  }

  /**
   * Generate SLA compliance report
   */
  generateSlaReport() {
    const slaStatus = this.uptime.getSlaStatus();
    const systemReport = this.uptime.getSystemUptimeReport();
    const accountsSummary = this.uptime.getAllAccountsSummary();

    return {
      reportType: 'SLA_COMPLIANCE_REPORT',
      generatedAt: new Date().toISOString(),

      slaTarget: slaStatus.target,
      currentCompliance: slaStatus.current,
      compliant: slaStatus.compliant,
      violations: slaStatus.violations,

      system: {
        uptime: systemReport.system.uptime,
        status: systemReport.system.status,
        runtime: systemReport.system.runtime,
        downtime: systemReport.downtime
      },

      accounts: {
        summary: {
          online: systemReport.accounts.online,
          offline: systemReport.accounts.offline,
          total: systemReport.accounts.total
        },
        breakdown: accountsSummary.map(acc => ({
          accountId: acc.accountId,
          status: acc.currentStatus,
          uptime: acc.uptime.percentage,
          downtime: acc.downtime.total + ' minutes',
          events: acc.downtime.events
        }))
      },

      statusChanges: systemReport.statusChanges.slice(-10),
      alerts: this.uptime.getCriticalAlerts(),
      slaStatus: slaStatus.description
    };
  }

  /**
   * Generate incident report
   */
  generateIncidentReport(accountId = null) {
    const analytics = this.analytics.getAllMetrics();

    let incidents = [];

    if (accountId) {
      const accountReport = this.uptime.getAccountUptimeReport(accountId);
      incidents = accountReport?.statusHistory || [];
    } else {
      incidents = this.uptime.getSystemUptimeReport().statusChanges || [];
    }

    const downtimeIncidents = incidents.filter(i => i.status === 'offline' || i.status === 'degraded');

    return {
      reportType: 'INCIDENT_REPORT',
      generatedAt: new Date().toISOString(),
      accountId: accountId || 'system',

      incident_summary: {
        totalIncidents: downtimeIncidents.length,
        resolvedIncidents: downtimeIncidents.filter(i => i.recovered).length,
        activeIncidents: downtimeIncidents.filter(i => !i.recovered).length,
        avgResolutionTime: this._calculateAvgResolution(downtimeIncidents)
      },

      incidents: downtimeIncidents.slice(-20).map(incident => ({
        timestamp: incident.timestamp,
        status: incident.status,
        reason: incident.reason,
        duration: incident.duration || 'ongoing',
        severity: this._determineSeverity(incident)
      })),

      errors: {
        recentErrors: analytics.metrics.errors.slice(-10),
        errorTrend: this._analyzeErrorTrend(analytics.metrics.errors),
        topErrors: this._getTopErrorTypes(analytics.metrics.errors)
      },

      recommendations: [
        'Review incident causes',
        'Implement preventive measures',
        'Monitor recovery times',
        'Alert thresholds review'
      ]
    };
  }

  /**
   * Generate health check report
   */
  generateHealthCheckReport() {
    const analytics = this.analytics.getAllMetrics();
    const summary = this.analytics.getSummaryReport();
    const slaStatus = this.uptime.getSlaStatus();

    const checks = {
      cacheHealth: {
        status: parseFloat(summary.cache.hitRate) > 0.80 ? 'healthy' : 'degraded',
        hitRate: summary.cache.hitRate,
        message: parseFloat(summary.cache.hitRate) > 0.80
          ? '✅ Cache performing well'
          : '⚠️ Cache hit rate below optimal'
      },

      databaseHealth: {
        status: parseFloat(analytics.metrics.database.successRate) > 0.95 ? 'healthy' : 'degraded',
        successRate: analytics.metrics.database.successRate,
        message: parseFloat(analytics.metrics.database.successRate) > 0.95
          ? '✅ Database operations stable'
          : '⚠️ Database errors detected'
      },

      recoveryHealth: {
        status: parseFloat(summary.recovery.recoverySuccessRate) > 0.80 ? 'healthy' : 'degraded',
        recoveryRate: summary.recovery.recoverySuccessRate,
        message: parseFloat(summary.recovery.recoverySuccessRate) > 0.80
          ? '✅ Recovery working well'
          : '⚠️ Recovery issues observed'
      },

      slaHealth: {
        status: slaStatus.compliant ? 'healthy' : 'violated',
        uptime: slaStatus.current,
        target: slaStatus.target,
        message: slaStatus.description
      },

      systemHealth: {
        status: summary.system.degradationPercentage === '0%' ? 'healthy' : 'degraded',
        onlineAccounts: summary.system.accountsOnline + '/' + summary.system.accountsTotal,
        degradation: summary.system.degradationPercentage,
        message: summary.system.degradationPercentage === '0%'
          ? '✅ All accounts online'
          : '⚠️ Some accounts offline'
      },

      errorHealth: {
        status: parseFloat(summary.errors.rate) < 0.05 ? 'healthy' : 'critical',
        errorRate: summary.errors.rate,
        message: parseFloat(summary.errors.rate) < 0.05
          ? '✅ Error rate within limits'
          : '🚨 High error rate detected'
      }
    };

    const overallStatus = Object.values(checks).every(c => c.status === 'healthy') ? 'HEALTHY' : 'DEGRADED';

    return {
      reportType: 'HEALTH_CHECK_REPORT',
      generatedAt: new Date().toISOString(),
      overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      summary: `System is ${overallStatus.toLowerCase()}. ${this._generateHealthySummary(checks)}`,
      nextCheckTime: new Date(Date.now() + 5 * 60000).toISOString()
    };
  }

  /**
   * Export report as JSON
   */
  exportAsJSON(report) {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Export report as CSV (flattened format)
   */
  exportAsCSV(report) {
    const lines = [];
    lines.push('Metric,Value');

    const flattenObject = (obj, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          flattenObject(value, fullKey);
        } else if (!Array.isArray(value)) {
          const csvValue = typeof value === 'string' && value.includes(',')
            ? `"${value}"`
            : value;
          lines.push(`${fullKey},${csvValue}`);
        }
      }
    };

    flattenObject(report);
    return lines.join('\n');
  }

  /**
   * Export report as formatted text
   */
  exportAsText(report) {
    let text = '';
    text += '═'.repeat(80) + '\n';
    text += `${report.reportType}\n`;
    text += `Generated: ${report.generatedAt}\n`;
    text += '═'.repeat(80) + '\n\n';

    for (const [key, value] of Object.entries(report)) {
      if (key !== 'reportType' && key !== 'generatedAt') {
        text += this._formatSection(key, value, 0);
      }
    }

    return text;
  }

  // ===== Helper Methods =====

  _generateExecutiveSummary(summary) {
    const messageRate = summary.messages && summary.messages.total > 0 
      ? `${summary.messages.total} messages processed` 
      : 'No messages';
    const errorRate = summary.errors ? parseFloat(summary.errors.rate) : 0;
    const errorStatus = errorRate < 0.05 ? 'Low error rate' : 'High error rate';
    const cacheRate = summary.cache ? parseFloat(summary.cache.hitRate) : 0;
    const cacheStatus = cacheRate > 0.80 ? 'Cache working well' : 'Cache needs attention';

    return `${messageRate}. ${errorStatus}. ${cacheStatus}.`;
  }

  _calculateRate(total, seconds) {
    return seconds > 0 ? (total / seconds).toFixed(2) : '0';
  }

  _ratePerformance(percentage) {
    if (percentage >= 95) return 'excellent';
    if (percentage >= 80) return 'good';
    if (percentage >= 70) return 'fair';
    return 'poor';
  }

  _calculateAvgDuration(operations) {
    if (operations.length === 0) return '0ms';
    const sum = operations.reduce((acc, op) => acc + (op.duration || 0), 0);
    return Math.round(sum / operations.length) + 'ms';
  }

  _getRecentDatabaseErrors(operations) {
    return operations.filter(op => !op.success).slice(-5);
  }

  _categorizeErrors(errors) {
    const categories = {};
    for (const error of errors) {
      categories[error.errorType] = (categories[error.errorType] || 0) + 1;
    }
    return categories;
  }

  _getSeverityBreakdown(errors) {
    const breakdown = { critical: 0, error: 0, warning: 0 };
    for (const error of errors) {
      breakdown[error.severity] = (breakdown[error.severity] || 0) + 1;
    }
    return breakdown;
  }

  _analyzeErrorTrend(errors) {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60000;
    const recentErrors = errors.filter(e => new Date(e.timestamp).getTime() > fiveMinutesAgo).length;
    
    return {
      last5Minutes: recentErrors,
      trend: recentErrors > 5 ? 'increasing' : 'stable'
    };
  }

  _getTopErrorTypes(errors) {
    const types = {};
    for (const error of errors) {
      types[error.errorType] = (types[error.errorType] || 0) + 1;
    }
    return Object.entries(types)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));
  }

  _generateRecommendations(summary, analytics) {
    const recommendations = [];

    if (summary.cache && parseFloat(summary.cache.hitRate) < 0.80) {
      recommendations.push('Increase cache TTL to improve hit rate');
    }

    if (summary.errors && parseFloat(summary.errors.rate) > 0.05) {
      recommendations.push('Review error logs and implement fixes');
    }

    if (summary.recovery && parseFloat(summary.recovery.recoverySuccessRate) < 0.80) {
      recommendations.push('Enhance account recovery mechanisms');
    }

    if (summary.system && summary.system.degradationPercentage !== '0%') {
      recommendations.push('Investigate offline accounts and relink them');
    }

    if (analytics.anomalies && analytics.anomalies.length > 0) {
      recommendations.push('Address detected anomalies immediately');
    }

    return recommendations.length > 0
      ? recommendations
      : ['System performing normally - continue monitoring'];
  }

  _calculateAvgResolution(incidents) {
    const resolved = incidents.filter(i => i.recovered);
    if (resolved.length === 0) return 'N/A';
    const total = resolved.reduce((sum, i) => sum + (i.duration || 0), 0);
    return Math.round(total / resolved.length) + ' minutes';
  }

  _determineSeverity(incident) {
    if (incident.duration > 60) return 'high';
    if (incident.duration > 5) return 'medium';
    return 'low';
  }

  _generateHealthySummary(checks) {
    const statuses = Object.values(checks).map(c => c.status);
    const degraded = statuses.filter(s => s !== 'healthy').length;

    if (degraded === 0) {
      return 'All systems operational.';
    } else if (degraded === 1) {
      return 'One system requires attention.';
    } else if (degraded < statuses.length / 2) {
      return `${degraded} systems require attention.`;
    } else {
      return 'Multiple systems require immediate attention.';
    }
  }

  _formatSection(key, value, indent = 0) {
    let text = '';
    const prefix = ' '.repeat(indent * 2);
    const maxIndent = 5; // Prevent infinite recursion

    if (indent > maxIndent) {
      return '';
    }

    if (typeof value === 'object' && value !== null) {
      if (key) {
        text += `${prefix}${key}:\n`;
      }
      if (Array.isArray(value)) {
        for (const item of value.slice(0, 5)) { // Limit array items
          if (typeof item === 'object') {
            text += `${prefix}  - ${JSON.stringify(item)}\n`;
          } else {
            text += `${prefix}  - ${item}\n`;
          }
        }
      } else {
        for (const [k, v] of Object.entries(value)) {
          text += this._formatSection(k, v, indent + 1);
        }
      }
    } else {
      text += `${prefix}${key}: ${value}\n`;
    }

    return text;
  }
}

export default ReportGenerator;
