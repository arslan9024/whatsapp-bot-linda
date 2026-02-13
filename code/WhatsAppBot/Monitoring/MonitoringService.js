/**
 * Advanced Logging & Monitoring Service
 * Centralized logging with structured format, metrics, and observability
 * 
 * Phase 6 Monitoring Infrastructure
 * Created: February 13, 2026
 */

const fs = require('fs');
const path = require('path');

class LoggingService {
  constructor(options = {}) {
    this.logLevel = options.logLevel || 'info'; // debug, info, warn, error
    this.logFile = options.logFile || './logs/app.log';
    this.errorLogFile = options.errorLogFile || './logs/error.log';
    this.performanceLogFile = options.performanceLogFile || './logs/performance.log';
    this.securityLogFile = options.securityLogFile || './logs/security.log';
    this.maxLogSize = options.maxLogSize || 10 * 1024 * 1024; // 10MB
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    this.enableFileLogging = options.enableFileLogging !== false;
    this.enableConsoleLogging = options.enableConsoleLogging !== false;

    // Ensure log directories exist
    if (this.enableFileLogging) {
      this.ensureLogDirExists();
    }

    // Metrics collection
    this.metrics = {
      requests: 0,
      errors: 0,
      warnings: 0,
      performance: {},
      startTime: Date.now()
    };

    // Log levels with numeric values for filtering
    this.logLevels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
  }

  /**
   * Ensure log directories exist
   */
  ensureLogDirExists() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Format log entry with timestamp and metadata
   */
  formatLogEntry(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const requestId = metadata.requestId || 'N/A';
    const userId = metadata.userId || 'anonymous';
    
    return {
      timestamp,
      level,
      message,
      requestId,
      userId,
      context: metadata.context || {},
      duration: metadata.duration || null,
      error: metadata.error || null,
      stack: metadata.stack || null
    };
  }

  /**
   * Write log to file with rotation
   */
  writeToFile(logPath, entry) {
    try {
      if (!this.enableFileLogging) return;

      // Check file size and rotate if needed
      if (fs.existsSync(logPath)) {
        const stats = fs.statSync(logPath);
        if (stats.size >= this.maxLogSize) {
          this.rotateLogFile(logPath);
        }
      }

      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(logPath, logLine);
    } catch (error) {
      console.error('Failed to write log file:', error.message);
    }
  }

  /**
   * Rotate log file when it exceeds max size
   */
  rotateLogFile(logPath) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${logPath}.${timestamp}.backup`;
      fs.renameSync(logPath, backupPath);
      
      // Keep only last 5 backups
      this.cleanupOldLogBackups(logPath);
    } catch (error) {
      console.error('Failed to rotate log file:', error.message);
    }
  }

  /**
   * Clean up old log backup files
   */
  cleanupOldLogBackups(logPath) {
    try {
      const logDir = path.dirname(logPath);
      const logName = path.basename(logPath);
      const files = fs.readdirSync(logDir);
      
      const backups = files
        .filter(f => f.startsWith(logName))
        .sort()
        .reverse();

      // Keep last 5 backups
      if (backups.length > 5) {
        for (let i = 5; i < backups.length; i++) {
          fs.unlinkSync(path.join(logDir, backups[i]));
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error.message);
    }
  }

  /**
   * Log debug message
   */
  debug(message, metadata = {}) {
    if (this.logLevels.debug < this.logLevels[this.logLevel]) return;

    const entry = this.formatLogEntry('DEBUG', message, metadata);
    
    if (this.enableConsoleLogging) {
      console.debug('[DEBUG]', message, metadata);
    }
    
    this.writeToFile(this.logFile, entry);
    this.metrics.requests++;
  }

  /**
   * Log info message
   */
  info(message, metadata = {}) {
    if (this.logLevels.info < this.logLevels[this.logLevel]) return;

    const entry = this.formatLogEntry('INFO', message, metadata);
    
    if (this.enableConsoleLogging) {
      console.log('[INFO]', message, metadata);
    }
    
    this.writeToFile(this.logFile, entry);
    this.metrics.requests++;
  }

  /**
   * Log warning message
   */
  warn(message, metadata = {}) {
    if (this.logLevels.warn < this.logLevels[this.logLevel]) return;

    const entry = this.formatLogEntry('WARN', message, metadata);
    
    if (this.enableConsoleLogging) {
      console.warn('[WARN]', message, metadata);
    }
    
    this.writeToFile(this.logFile, entry);
    this.metrics.warnings++;
  }

  /**
   * Log error message
   */
  error(message, metadata = {}) {
    const entry = this.formatLogEntry('ERROR', message, metadata);
    
    if (this.enableConsoleLogging) {
      console.error('[ERROR]', message, metadata.error || metadata);
    }
    
    this.writeToFile(this.logFile, entry);
    this.writeToFile(this.errorLogFile, entry);
    this.metrics.errors++;
  }

  /**
   * Log performance metric
   */
  logPerformance(operation, duration, metadata = {}) {
    const entry = this.formatLogEntry('PERF', `Operation: ${operation}`, {
      ...metadata,
      duration,
      operation
    });

    if (this.enableConsoleLogging && duration > 1000) {
      console.warn(`⚠️ SLOW: ${operation} took ${duration}ms`);
    }

    this.writeToFile(this.performanceLogFile, entry);

    // Track metrics
    if (!this.metrics.performance[operation]) {
      this.metrics.performance[operation] = [];
    }
    this.metrics.performance[operation].push(duration);
  }

  /**
   * Log security event (audit trail)
   */
  logSecurityEvent(event, metadata = {}) {
    const entry = this.formatLogEntry('SECURITY', event, {
      ...metadata,
      severity: metadata.severity || 'info'
    });

    if (this.enableConsoleLogging) {
      console.log(`🔒 SECURITY: ${event}`, metadata);
    }

    this.writeToFile(this.securityLogFile, entry);
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const stats = {};

    for (const [operation, durations] of Object.entries(this.metrics.performance)) {
      if (durations.length === 0) continue;

      const sorted = durations.sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);

      stats[operation] = {
        count: durations.length,
        min: sorted[0],
        max: sorted[durations.length - 1],
        avg: Math.round(sum / durations.length),
        p95: sorted[Math.floor(durations.length * 0.95)],
        p99: sorted[Math.floor(durations.length * 0.99)]
      };
    }

    return stats;
  }

  /**
   * Get application metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;

    return {
      uptime: `${Math.round(uptime / 1000)}s`,
      totalRequests: this.metrics.requests,
      totalErrors: this.metrics.errors,
      totalWarnings: this.metrics.warnings,
      errorRate: this.metrics.requests > 0 
        ? (this.metrics.errors / this.metrics.requests * 100).toFixed(2) + '%'
        : '0%',
      requestsPerSecond: (this.metrics.requests / (uptime / 1000)).toFixed(2),
      performanceStats: this.getPerformanceStats()
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      requests: 0,
      errors: 0,
      warnings: 0,
      performance: {},
      startTime: Date.now()
    };
  }

  /**
   * Create performance measurement context
   */
  createPerformanceContext(operation) {
    const startTime = Date.now();
    
    return {
      finish: (metadata = {}) => {
        const duration = Date.now() - startTime;
        this.logPerformance(operation, duration, metadata);
        return duration;
      }
    };
  }
}

/**
 * Error Tracking Service
 * Captures and categorizes errors for monitoring
 */
class ErrorTrackingService {
  constructor(options = {}) {
    this.logger = options.logger;
    this.errors = new Map();
    this.maxErrors = options.maxErrors || 1000;
  }

  /**
   * Track error occurrence
   */
  captureError(error, context = {}) {
    const errorKey = `${error.name}:${error.message}`;
    const timestamp = new Date().toISOString();

    if (!this.errors.has(errorKey)) {
      this.errors.set(errorKey, {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        firstOccurrence: timestamp,
        lastOccurrence: timestamp,
        count: 0,
        occurrences: []
      });
    }

    const errorEntry = this.errors.get(errorKey);
    errorEntry.count++;
    errorEntry.lastOccurrence = timestamp;
    errorEntry.occurrences.push({
      timestamp,
      context,
      requestId: context.requestId
    });

    // Keep only recent occurrences
    if (errorEntry.occurrences.length > 100) {
      errorEntry.occurrences = errorEntry.occurrences.slice(-100);
    }

    // Log via logger if available
    if (this.logger) {
      this.logger.error(error.message, {
        error: error.message,
        stack: error.stack,
        context
      });
    }

    return errorEntry;
  }

  /**
   * Get error report
   */
  getErrorReport() {
    const errors = Array.from(this.errors.values())
      .sort((a, b) => b.count - a.count)
      .map(e => ({
        error: e.error.name,
        message: e.error.message,
        count: e.count,
        firstOccurrence: e.firstOccurrence,
        lastOccurrence: e.lastOccurrence
      }));

    return {
      totalUniqueErrors: errors.length,
      totalErrorCount: errors.reduce((sum, e) => sum + e.count, 0),
      topErrors: errors.slice(0, 10),
      allErrors: errors
    };
  }

  /**
   * Reset error tracking
   */
  reset() {
    this.errors.clear();
  }
}

/**
 * Health Check Service
 */
class HealthCheckService {
  constructor(options = {}) {
    this.logger = options.logger;
    this.checks = new Map();
    this.lastCheck = null;
  }

  /**
   * Register health check
   */
  registerCheck(name, checkFn) {
    this.checks.set(name, checkFn);
  }

  /**
   * Run all health checks
   */
  async runHealthChecks() {
    const results = {};
    let allHealthy = true;

    for (const [name, checkFn] of this.checks.entries()) {
      try {
        const startTime = Date.now();
        const result = await checkFn();
        const duration = Date.now() - startTime;

        results[name] = {
          status: result.healthy ? 'healthy' : 'unhealthy',
          message: result.message || 'OK',
          duration,
          lastCheck: new Date().toISOString()
        };

        if (!result.healthy) {
          allHealthy = false;
        }
      } catch (error) {
        results[name] = {
          status: 'error',
          message: error.message,
          lastCheck: new Date().toISOString()
        };
        allHealthy = false;

        if (this.logger) {
          this.logger.error(`Health check failed: ${name}`, { error: error.message });
        }
      }
    }

    this.lastCheck = {
      timestamp: new Date().toISOString(),
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks: results
    };

    return this.lastCheck;
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    return this.lastCheck || {
      status: 'unknown',
      message: 'Health checks have not been run yet'
    };
  }
}

module.exports = {
  LoggingService,
  ErrorTrackingService,
  HealthCheckService
};
