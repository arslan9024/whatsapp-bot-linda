/**
 * Jest Setup File
 * Initializes test environment with global utilities
 */

// Mock logger globally
global.mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn()
};

// Mock console methods
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Global test utilities
global.testUtils = {
  /**
   * Wait for async operation
   */
  wait: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Create mock function with default implementation
   */
  createMock: (implementation = jest.fn()) => implementation,

  /**
   * Generate test phone number
   */
  generatePhoneNumber: () => `+${Math.floor(Math.random() * 1000000000)}`,

  /**
   * Generate test ID
   */
  generateId: (prefix = 'test') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

  /**
   * Deep clone object for testing
   */
  deepClone: (obj) => JSON.parse(JSON.stringify(obj))
};

// Silence logger in tests unless verbose
if (process.env.TEST_VERBOSE !== 'true') {
  jest.spyOn(global.console, 'log').mockImplementation(() => {});
  jest.spyOn(global.console, 'error').mockImplementation(() => {});
  jest.spyOn(global.console, 'warn').mockImplementation(() => {});
}
