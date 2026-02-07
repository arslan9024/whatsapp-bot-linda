/**
 * Logging Module
 * Provides structured logging with levels and file output
 * Supports development and production environments
 */

import fs from 'fs';
import path from 'path';
import config from './config.js';

// Log levels
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const LOG_COLORS = {
  error: '\x1b[31m', // Red
  warn: '\x1b[33m',  // Yellow
  info: '\x1b[36m',  // Cyan
  debug: '\x1b[35m', // Magenta
  reset: '\x1b[0m',
};

/**
 * Logger class for structured logging
 */
class Logger {
  constructor(name = 'App') {
    this.name = name;
    this.level = LOG_LEVELS[config.logging.level] || LOG_LEVELS.info;
    this.logDir = path.dirname(config.logging.filePath);
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Initialize log file
    this.logFile = config.logging.filePath;
  }

  /**
   * Log message with level and context
   * @private
   */
  log(level, message, meta = {}) {
    // Check if this level should be logged
    if (LOG_LEVELS[level] > this.level) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const logEntry = {
      timestamp,
      level,
      name: this.name,
      message,
      ...meta,
    };

    // Console output with colors (development)
    if (config.isDevelopment) {
      const color = LOG_COLORS[level];
      const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
      console.log(`${color}${prefix}${LOG_COLORS.reset} ${this.name}: ${message}${metaStr}`);
    }

    // File output (all environments)
    this.writeToFile(logEntry);
  }

  /**
   * Write log entry to file
   * @private
   */
  writeToFile(entry) {
    try {
      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logFile, logLine, 'utf-8');
    } catch (err) {
      console.error(`Failed to write to log file: ${err.message}`);
    }
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  /**
   * Log error with stack trace
   */
  exception(error, context = {}) {
    this.log('error', error.message, {
      stack: error.stack,
      ...context,
    });
  }
}

// Create default logger instance
const logger = new Logger('WhatsAppBot');

export default logger;
export { Logger };
