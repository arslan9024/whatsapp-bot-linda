/**
 * SafeLogger - Fallback Logger for Module Initialization
 * 
 * Provides safe logging with fallback to console if main logger unavailable
 * Used by Phase 7 modules during early initialization before logger is ready
 * 
 * Version: 1.0
 * Created: February 14, 2026
 * Status: Production Ready
 */

class SafeLogger {
  constructor(context = 'Linda') {
    this.context = context;
    this.useGlobalLogger = false;
  }

  /**
   * Try to use global logger, fallback to console
   */
  log(level, message) {
    try {
      // Try to use global logger if available
      if (typeof global !== 'undefined' && global.logger && typeof global.logger[level.toLowerCase()] === 'function') {
        this.useGlobalLogger = true;
        global.logger[level.toLowerCase()](message);
        return;
      }
    } catch (e) {
      // Ignore - will fallback to console
    }

    // Fallback to console
    const timestamp = new Date().toLocaleTimeString();
    const prefix = {
      'ERROR': '❌',
      'WARN': '⚠️ ',
      'INFO': 'ℹ️ ',
      'DEBUG': '🔍',
      'TRACE': '📍'
    }[level] || 'ℹ️ ';

    console.log(`[${timestamp}] ${prefix} [${this.context}] ${message}`);
  }

  error(msg) {
    this.log('ERROR', msg);
  }

  warn(msg) {
    this.log('WARN', msg);
  }

  info(msg) {
    this.log('INFO', msg);
  }

  debug(msg) {
    this.log('DEBUG', msg);
  }

  trace(msg) {
    this.log('TRACE', msg);
  }
}

/**
 * Factory function to create safe logger
 */
function getSafeLogger(context = 'Linda') {
  return new SafeLogger(context);
}

export { SafeLogger, getSafeLogger };
export default getSafeLogger;
