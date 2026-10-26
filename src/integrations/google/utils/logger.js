/**
 * Google Integration Logger Utility
 * Centralized logging for Google API services
 * 
 * Version: 1.0.0
 * Last Updated: February 7, 2026
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ============================================================================
// LOGGER LEVELS
// ============================================================================

const LOG_LEVELS = {
  ERROR: { level: 0, name: 'ERROR', color: '\x1b[31m' },   // Red
  WARN: { level: 1, name: 'WARN', color: '\x1b[33m' },     // Yellow
  INFO: { level: 2, name: 'INFO', color: '\x1b[32m' },     // Green
  DEBUG: { level: 3, name: 'DEBUG', color: '\x1b[36m' },   // Cyan
  TRACE: { level: 4, name: 'TRACE', color: '\x1b[90m' },   // Gray
};

const RESET_COLOR = '\x1b[0m';

// ============================================================================
// CLASS: Logger
// ============================================================================

class Logger {
  /**
   * Initialize logger
   * @param {Object} options - Logger options
   * @param {string} options.name - Logger name/context
   * @param {string} options.level - Log level (ERROR, WARN, INFO, DEBUG, TRACE)
   * @param {string} options.logFile - Path to log file (optional)
   * @param {boolean} options.colorize - Use colored output
   * @param {boolean} options.includeTimestamp - Include timestamp in logs
   */
  constructor(options = {}) {
    this.name = options.name || 'GoogleIntegration';
    this.level = options.level || 'INFO';
    this.logFile = options.logFile || null;
    this.colorize = options.colorize !== false; // Default true
    this.includeTimestamp = options.includeTimestamp !== false; // Default true
    this.metrics = {
      errors: 0,
      warnings: 0,
      infos: 0,
      debugs: 0,
      traces: 0,
    };

    // Create log directory if using file logging
    if (this.logFile) {
      const logDir = path.dirname(this.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  /**
   * Format log message
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {any} data - Additional data
   * @returns {string} Formatted message
   */
  formatMessage(level, message, data = null) {
    let formattedMessage = '';

    // Add timestamp
    if (this.includeTimestamp) {
      const timestamp = new Date().toISOString();
      formattedMessage += `[${timestamp}] `;
    }

    // Add level
    formattedMessage += `[${level}] `;

    // Add context
    formattedMessage += `[${this.name}] `;

    // Add message
    formattedMessage += message;

    // Add data if present
    if (data) {
      if (typeof data === 'object') {
        formattedMessage += ` ${JSON.stringify(data, null, 2)}`;
      } else {
        formattedMessage += ` ${data}`;
      }
    }

    return formattedMessage;
  }

  /**
   * Write log message
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {any} data - Additional data
   * @private
   */
  write(level, message, data = null) {
    const levelObj = LOG_LEVELS[level];

    if (!levelObj) {
      return; // Invalid level
    }

    // Check if we should log this level
    const currentLevelObj = LOG_LEVELS[this.level];
    if (levelObj.level > currentLevelObj.level) {
      return; // Don't log if level is below threshold
    }

    const formattedMessage = this.formatMessage(level, message, data);

    // Console output with colors
    if (this.colorize) {
      console.log(`${levelObj.color}${formattedMessage}${RESET_COLOR}`);
    } else {
      console.log(formattedMessage);
    }

    // File output
    if (this.logFile) {
      try {
        fs.appendFileSync(this.logFile, formattedMessage + '\n', 'utf8');
      } catch (error) {
        console.error(`Failed to write to log file: ${error.message}`);
      }
    }

    // Update metrics
    switch (level) {
      case 'ERROR':
        this.metrics.errors++;
        break;
      case 'WARN':
        this.metrics.warnings++;
        break;
      case 'INFO':
        this.metrics.infos++;
        break;
      case 'DEBUG':
        this.metrics.debugs++;
        break;
      case 'TRACE':
        this.metrics.traces++;
        break;
    }
  }

  /**
   * Log error
   * @param {string} message - Log message
   * @param {any} data - Additional data
   */
  error(message, data = null) {
    this.write('ERROR', message, data);
  }

  /**
   * Log warning
   * @param {string} message - Log message
   * @param {any} data - Additional data
   */
  warn(message, data = null) {
    this.write('WARN', message, data);
  }

  /**
   * Log info
   * @param {string} message - Log message
   * @param {any} data - Additional data
   */
  info(message, data = null) {
    this.write('INFO', message, data);
  }

  /**
   * Log debug
   * @param {string} message - Log message
   * @param {any} data - Additional data
   */
  debug(message, data = null) {
    this.write('DEBUG', message, data);
  }

  /**
   * Log trace
   * @param {string} message - Log message
   * @param {any} data - Additional data
   */
  trace(message, data = null) {
    this.write('TRACE', message, data);
  }

  /**
   * Log API request
   * @param {string} service - Service name
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   */
  logRequest(service, method, url) {
    this.debug(`${service} API Request`, { method, url });
  }

  /**
   * Log API response
   * @param {string} service - Service name
   * @param {number} status - HTTP status code
   * @param {number} duration - Duration in ms
   */
  logResponse(service, status, duration) {
    this.debug(`${service} API Response`, { status, duration: `${duration}ms` });
  }

  /**
   * Log API error
   * @param {string} service - Service name
   * @param {string} error - Error message
   * @param {number} code - Error code
   */
  logApiError(service, error, code = null) {
    const data = { service, error };
    if (code) data.code = code;
    this.error(`API Error: ${service}`, data);
  }

  /**
   * Log authentication event
   * @param {string} event - Event name (login, logout, refresh_token, etc.)
   * @param {string} account - Account email
   */
  logAuthEvent(event, account) {
    this.info(`Authentication Event: ${event}`, { account });
  }

  /**
   * Get logger metrics
   * @returns {Object} Logger metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Reset logger metrics
   */
  resetMetrics() {
    this.metrics = {
      errors: 0,
      warnings: 0,
      infos: 0,
      debugs: 0,
      traces: 0,
    };
  }

  /**
   * Set log level
   * @param {string} level - New log level
   */
  setLevel(level) {
    if (LOG_LEVELS[level]) {
      this.level = level;
      this.info(`Log level changed to: ${level}`);
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let loggerInstance = null;

/**
 * Get or create logger instance
 * @param {Object} options - Logger options
 * @returns {Logger} Logger instance
 */
function getLogger(options = {}) {
  if (!loggerInstance) {
    loggerInstance = new Logger({
      name: options.name || 'GoogleIntegration',
      level: process.env.LOG_LEVEL || 'INFO',
      logFile: options.logFile || process.env.LOG_FILE,
      colorize: options.colorize !== false,
      includeTimestamp: options.includeTimestamp !== false,
    });
  }
  return loggerInstance;
}

// ============================================================================
// EXPORTS
// ============================================================================

const logger = getLogger();

export {  Logger,
  getLogger,
  logger,
  LOG_LEVELS,
};