/**
 * Jest Configuration for WhatsApp Bot Test Suite
 * Phase 6 M2 Module 2 - Comprehensive Testing
 */

module.exports = {
  displayName: 'WhatsApp Bot Test Suite',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/code'],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  collectCoverageFrom: [
    'code/**/*.js',
    '!code/**/*.config.js',
    '!code/**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000,
  verbose: true,
  bail: false,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/code/$1',
    '^@handlers/(.*)$': '<rootDir>/code/WhatsAppBot/Handlers/$1',
    '^@utils/(.*)$': '<rootDir>/code/WhatsAppBot/utils/$1',
    '^@mocks/(.*)$': '<rootDir>/tests/mocks/$1',
    '^@fixtures/(.*)$': '<rootDir>/tests/fixtures/$1',
    '^../Integration/Google/utils/logger$': '<rootDir>/tests/mocks/loggerMock.js',
    '^../../code/Integration/Google/utils/logger$': '<rootDir>/tests/mocks/loggerMock.js'
  },
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  collectCoverage: false,
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  globals: {
    testEnvironment: 'node'
  },
  maxWorkers: 2,
  workerIdleMemoryLimit: '512M',
  setupFiles: [],
  resetMocks: true,
  restoreMocks: true,
  clearMocks: true,
  forceExit: true
};
