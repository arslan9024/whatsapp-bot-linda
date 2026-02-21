/**
 * Jest Setup File
 * Initializes test environment, globals, and utilities
 */

import path from 'path';
import { fileURLToPath } from 'url';

// Set up globals
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

global.__dirname = __dirname;
global.__filename = __filename;

// Test environment variables
process.env.NODE_ENV = 'test';
process.env.USE_IN_MEMORY_DB = 'true';
process.env.LOG_LEVEL = 'error';
process.env.BOT_MODE = 'websocket';

// Extend expect matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },

  toBePerformant(received, threshold) {
    const pass = received < threshold;
    if (pass) {
      return {
        message: () =>
          `expected ${received}ms to be slower than ${threshold}ms`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received}ms to be within ${threshold}ms (${((received - threshold) / threshold * 100).toFixed(1)}% over)`,
        pass: false,
      };
    }
  }
});

// Global test utilities
global.testUtils = {
  // Generate test user ID
  generateTestUserId: (index = 0) => {
    return `+971${String(index).padStart(8, '0')}`;
  },

  // Generate multiple test user IDs
  generateTestUserIds: (count = 10) => {
    return Array.from({ length: count }, (_, i) =>
      global.testUtils.generateTestUserId(i)
    );
  },

  // Create test message
  createTestMessage: (from, body, overrides = {}) => {
    return {
      from,
      body,
      timestamp: Date.now(),
      isGroup: false,
      ...overrides
    };
  },

  // Create test command message
  createTestCommand: (from, command, args = [], overrides = {}) => {
    const argsStr = args.length > 0 ? ` ${args.join(' ')}` : '';
    return global.testUtils.createTestMessage(from, `/${command}${argsStr}`, overrides);
  },

  // Wait for condition
  waitFor: async (condition, timeout = 5000, interval = 100) => {
    const start = Date.now();
    while (!condition()) {
      if (Date.now() - start > timeout) {
        throw new Error(`Timeout waiting for condition after ${timeout}ms`);
      }
      await new Promise(r => setTimeout(r, interval));
    }
  },

  // Measure performance
  measurePerformance: async (fn, iterations = 1) => {
    const times = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      times.push(performance.now() - start);
    }
    return {
      min: Math.min(...times),
      max: Math.max(...times),
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      times
    };
  },

  // Memory helper
  getMemoryUsage: () => {
    const mem = process.memoryUsage();
    return {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      rss: Math.round(mem.rss / 1024 / 1024),
      external: Math.round(mem.external / 1024 / 1024)
    };
  }
};

// Suppress console in tests unless needed
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info
};

if (process.env.VERBOSE_TESTS !== 'true') {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn(originalConsole.warn);
  console.error = jest.fn(originalConsole.error);
}

export {};
