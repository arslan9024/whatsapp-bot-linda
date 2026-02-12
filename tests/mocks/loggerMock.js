/**
 * Logger Mock for Jest Tests
 * Provides a CommonJS-compatible mock of the ES6 logger module
 * Phase 6 M2 Module 2
 */

class MockLogger {
  constructor(options = {}) {
    this.name = options.name || 'MockLogger';
    this.level = options.level || 'INFO';
  }

  error(message, context = {}) {
    // Mock implementation - do nothing in tests
    return this;
  }

  warn(message, context = {}) {
    // Mock implementation - do nothing in tests
    return this;
  }

  info(message, context = {}) {
    // Mock implementation - do nothing in tests
    return this;
  }

  debug(message, context = {}) {
    // Mock implementation - do nothing in tests
    return this;
  }

  trace(message, context = {}) {
    // Mock implementation - do nothing in tests
    return this;
  }

  log(level, message, context = {}) {
    // Mock implementation - do nothing in tests
    return this;
  }

  setLevel(level) {
    this.level = level;
    return this;
  }

  getMetrics() {
    return {
      errors: 0,
      warnings: 0,
      infos: 0,
      debugs: 0,
      traces: 0
    };
  }
}

// Mock the logger singleton and factory function
const mockLogger = new MockLogger();

function getLogger(name, options) {
  const logger = new MockLogger({
    name: name || 'MockLogger',
    ...options
  });
  return logger;
}

// Export as CommonJS (required by handlers that use require())
module.exports = mockLogger;
module.exports.Logger = MockLogger;
module.exports.getLogger = getLogger;
module.exports.logger = mockLogger;
module.exports.LOG_LEVELS = {
  ERROR: { level: 0, name: 'ERROR' },
  WARN: { level: 1, name: 'WARN' },
  INFO: { level: 2, name: 'INFO' },
  DEBUG: { level: 3, name: 'DEBUG' },
  TRACE: { level: 4, name: 'TRACE' }
};
