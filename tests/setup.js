/**
 * Jest Setup File
 * Initializes test environment with global utilities
 * 
 * Phase 10 - Production Hardening:
 * - Added proper afterEach/afterAll teardown
 * - Timer cleanup prevents open handle leaks
 * - Mock restoration prevents test pollution
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

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL TEARDOWN (Phase 10 - Prevents open handles and test pollution)
// ═══════════════════════════════════════════════════════════════════════════════

afterEach(() => {
  // Clear all mocks between tests to prevent cross-test contamination
  jest.clearAllMocks();
  
  // Clear all pending timers (setTimeout, setInterval) to prevent open handles
  jest.clearAllTimers();
});

afterAll(() => {
  // Restore all mocks to their original implementations
  jest.restoreAllMocks();
  
  // Use real timers if fake timers were enabled
  try {
    jest.useRealTimers();
  } catch (e) {
    // Already using real timers - ignore
  }
  
  // Clear global test references to allow garbage collection
  if (global.mockLogger) {
    Object.values(global.mockLogger).forEach(fn => {
      if (typeof fn.mockClear === 'function') fn.mockClear();
    });
  }
});
