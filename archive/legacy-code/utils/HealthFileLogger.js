/**
 * HealthFileLogger.js
 * Write health monitoring data to rotating log files
 * Logs to daily files in logs/health directory
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import HealthConsoleLogger from './HealthConsoleLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class HealthFileLogger {
  constructor(healthMonitor, logsDirectory = null) {
    this.healthMonitor = healthMonitor;
    this.isLogging = false;
    this.logInterval = 5 * 60 * 1000; // 5 minutes default
    this.loggingInterval = null;

    // Set logs directory
    if (logsDirectory) {
      this.logsDir = logsDirectory;
    } else {
      // Default: project_root/logs/health
      const projectRoot = path.resolve(__dirname, '../../');
      this.logsDir = path.join(projectRoot, 'logs', 'health');
    }

    this.ensureLogsDirectory();
  }

  /**
   * Ensure logs directory exists
   */
  ensureLogsDirectory() {
    try {
      if (!fs.existsSync(this.logsDir)) {
        fs.mkdirSync(this.logsDir, { recursive: true });
        console.log(HealthConsoleLogger.color(`📁 Created logs directory: ${this.logsDir}`, HealthConsoleLogger.colors.brightGreen));
      }
    } catch (error) {
      console.error(HealthConsoleLogger.color(`❌ Error creating logs directory: ${error.message}`, HealthConsoleLogger.colors.brightRed));
    }
  }

  /**
   * Get today's log file path
   */
  getLogFilePath() {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `health-${dateStr}.log`;
    return path.join(this.logsDir, filename);
  }

  /**
   * Format log message
   */
  formatLogMessage(data) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] ${JSON.stringify(data)}\n`;
  }

  /**
   * Write log entry to file
   */
  writeLog(data) {
    try {
      const logFile = this.getLogFilePath();
      const message = this.formatLogMessage(data);
      fs.appendFileSync(logFile, message, 'utf8');
    } catch (error) {
      console.error(HealthConsoleLogger.color(`❌ Error writing log: ${error.message}`, HealthConsoleLogger.colors.brightRed));
    }
  }

  /**
   * Log health status to file
   */
  async logHealthStatus() {
    try {
      if (!this.healthMonitor) {
        console.log(HealthConsoleLogger.color('⚠️  Health monitor not initialized', HealthConsoleLogger.colors.yellow));
        return;
      }

      const allHealth = await this.healthMonitor.checkHealth();
      const metrics = this.healthMonitor.getMetrics();

      // Count statuses
      let healthy = 0, warning = 0, unhealthy = 0;
      Object.values(allHealth).forEach(health => {
        if (health.status === 'HEALTHY') healthy++;
        else if (health.status === 'WARNING') warning++;
        else unhealthy++;
      });

      const logData = {
        timestamp: new Date().toISOString(),
        summary: {
          totalAccounts: Object.keys(allHealth).length,
          healthy,
          warning,
          unhealthy,
          healthPercent: Object.keys(allHealth).length > 0
            ? ((healthy / Object.keys(allHealth).length) * 100).toFixed(1)
            : 0
        },
        metrics: {
          totalChecks: metrics.totalChecks,
          totalRecoveries: metrics.totalRecoveries,
          totalFailures: metrics.totalFailures,
          averageResponseTime: (metrics.averageResponseTime || 0).toFixed(0)
        },
        accounts: Object.entries(allHealth).map(([phone, health]) => ({
          phoneNumber: phone.slice(-6),
          status: health.status,
          uptime: (health.uptime || 0).toFixed(1),
          responseTime: health.responseTime || 0,
          consecutiveFailures: health.consecutiveFailures || 0,
          recoveryAttempts: health.recoveryAttempts || 0
        }))
      };

      this.writeLog(logData);
    } catch (error) {
      console.error(HealthConsoleLogger.color(`❌ Error logging health status: ${error.message}`, HealthConsoleLogger.colors.brightRed));
    }
  }

  /**
   * Start continuous file logging
   */
  startLogging(intervalMs = null) {
    if (this.isLogging) {
      console.log(HealthConsoleLogger.color('⚠️  File logging already started', HealthConsoleLogger.colors.yellow));
      return;
    }

    if (intervalMs) {
      this.logInterval = intervalMs;
    }

    this.isLogging = true;
    const intervalMinutes = (this.logInterval / 1000 / 60).toFixed(1);
    console.log(HealthConsoleLogger.color(`📝 File logger started - Writing to ${this.logsDir}`, HealthConsoleLogger.colors.brightGreen));
    console.log(HealthConsoleLogger.color(`   Interval: ${intervalMinutes} minutes`, HealthConsoleLogger.colors.dim));

    // Log immediately
    this.logHealthStatus();

    // Then log on interval
    this.loggingInterval = setInterval(() => {
      this.logHealthStatus();
    }, this.logInterval);
  }

  /**
   * Stop continuous file logging
   */
  stopLogging() {
    if (!this.isLogging) {
      console.log(HealthConsoleLogger.color('⚠️  File logging not started', HealthConsoleLogger.colors.yellow));
      return;
    }

    clearInterval(this.loggingInterval);
    this.isLogging = false;
    console.log(HealthConsoleLogger.color('⏹️  File logger stopped', HealthConsoleLogger.colors.brightYellow));
  }

  /**
   * Get today's log file path for user reference
   */
  getTodayLogFile() {
    return this.getLogFilePath();
  }

  /**
   * Get all log files
   */
  getLogFiles() {
    try {
      const files = fs.readdirSync(this.logsDir);
      return files
        .filter(f => f.endsWith('.log'))
        .map(f => path.join(this.logsDir, f))
        .sort()
        .reverse(); // Most recent first
    } catch (error) {
      console.error(HealthConsoleLogger.color(`❌ Error reading log files: ${error.message}`, HealthConsoleLogger.colors.brightRed));
      return [];
    }
  }

  /**
   * Read today's log file
   */
  readTodayLog() {
    try {
      const logFile = this.getLogFilePath();
      if (!fs.existsSync(logFile)) {
        return '';
      }
      return fs.readFileSync(logFile, 'utf8');
    } catch (error) {
      console.error(HealthConsoleLogger.color(`❌ Error reading log: ${error.message}`, HealthConsoleLogger.colors.brightRed));
      return '';
    }
  }

  /**
   * Get last N lines from today's log
   */
  getTailLog(lines = 10) {
    try {
      const content = this.readTodayLog();
      const logLines = content.trim().split('\n');
      return logLines.slice(-lines).join('\n');
    } catch (error) {
      console.error(HealthConsoleLogger.color(`❌ Error reading log tail: ${error.message}`, HealthConsoleLogger.colors.brightRed));
      return '';
    }
  }

  /**
   * Clear old log files (keep last N days)
   */
  clearOldLogs(daysToKeep = 7) {
    try {
      const files = this.getLogFiles();
      const now = Date.now();
      const cutoffTime = now - (daysToKeep * 24 * 60 * 60 * 1000);

      let deletedCount = 0;
      files.forEach(file => {
        const stat = fs.statSync(file);
        if (stat.mtimeMs < cutoffTime) {
          fs.unlinkSync(file);
          deletedCount++;
        }
      });

      if (deletedCount > 0) {
        console.log(HealthConsoleLogger.color(`🗑️  Deleted ${deletedCount} old log files (>${daysToKeep} days)`, HealthConsoleLogger.colors.dim));
      }
    } catch (error) {
      console.error(HealthConsoleLogger.color(`❌ Error clearing old logs: ${error.message}`, HealthConsoleLogger.colors.brightRed));
    }
  }

  /**
   * Write formatted health snapshot
   */
  async writeSnapshot(label = 'Snapshot') {
    try {
      if (!this.healthMonitor) {
        console.log(HealthConsoleLogger.color('⚠️  Health monitor not initialized', HealthConsoleLogger.colors.yellow));
        return;
      }

      const timestamp = new Date().toISOString();
      const header = `\n${'═'.repeat(80)}\n[${timestamp}] ${label}\n${'═'.repeat(80)}\n`;
      
      const logFile = this.getLogFilePath();
      fs.appendFileSync(logFile, header, 'utf8');

      await this.logHealthStatus();
    } catch (error) {
      console.error(HealthConsoleLogger.color(`❌ Error writing snapshot: ${error.message}`, HealthConsoleLogger.colors.brightRed));
    }
  }
}

export default HealthFileLogger;
