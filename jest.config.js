/**
 * Jest Configuration
 * Sets up test environment, timings, coverage
 */

export default {
  displayName: 'WhatsApp Bot Integration Tests',
  
  // Environment
  testEnvironment: 'node',
  
  testMatch: [
    '**/__tests__/**/*.js',
    '**/*.test.js',
    '**/*.spec.js'
  ],
  
  // Transform configuration
  transformIgnorePatterns: [
    'node_modules/(?!(your-es6-lib)/)'
  ],
  
  // Module name mapper
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@bot/(.*)$': '<rootDir>/bot/$1'
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Coverage configuration
  collectCoverageFrom: [
    'bot/**/*.js',
    '!bot/**/*.test.js',
    '!bot/**/*.spec.js',
    '!bot/tests/**',
    '!bot/examples/**'
  ],
  
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  
  // Reporter configuration
  reporters: ['default'],
  
  // Verbose output
  verbose: true,
  
  // Notify on completion
  notify: false,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks between tests
  restoreMocks: true,
  
  // Performance
  maxWorkers: 4
};
