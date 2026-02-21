# Bot Integration Testing Guide

## Overview

This document provides a complete guide to the WhatsApp Bot Linda integration testing framework, including test suites, execution methods, and best practices.

## Test Structure

```
bot/tests/
├── integration.test.js       # Unit and integration tests
├── performance.test.js       # Performance and load tests
├── setup.js                  # Test environment setup
├── run-tests.js             # Test runner script
└── README.md                # This file
```

## Test Suites

### 1. Integration Tests (`integration.test.js`)

Comprehensive tests for all bot components working together.

**Coverage:**
- ✅ Bot initialization and startup
- ✅ Configuration loading
- ✅ Message parsing (text, commands, entities)
- ✅ Session management (create, state, history)
- ✅ Command routing
- ✅ API integration
- ✅ Event system
- ✅ Error handling
- ✅ Graceful shutdown
- ✅ Multi-user scenarios

**Key Test Cases:**
```javascript
// Bot Initialization
- Initialize with default config
- Load config from environment
- Verify all required components

// Message Flow
- Process simple text message
- Parse command message
- Extract entities (URLs, mentions, hashtags)
- Detect intent from message

// Session Management
- Create session for new user
- Maintain session state
- Add message to history
- Manage tags and counters
- Get session statistics

// Command Routing
- Recognize built-in commands
- Register custom commands
- Parse command arguments

// Integration Scenarios
- Complete user flow (session → message → history → state)
- Multiple concurrent users
- Rate limiting

// Error Handling
- Handle invalid messages
- Validate message structure
- Detect spam patterns

// Health Monitoring
- Get bot health status
- Track engine statistics

// Event System
- Emit and listen to events
- Handle session events

// Graceful Shutdown
- Stop bot gracefully
- Cleanup on shutdown
```

### 2. Performance Tests (`performance.test.js`)

Stress tests and performance benchmarks for all components.

**Performance Thresholds:**
```javascript
{
  messageProcessing: 100,        // ms
  sessionCreation: 50,           // ms
  apiCall: 500,                  // ms
  commandExecution: 200,         // ms
  memoryPerSession: 50 * 1024    // bytes (50KB)
}
```

**Test Coverage:**
```javascript
// Message Processing
- Single message: < 100ms
- Command parsing: < 200ms
- 100 messages: < 10s
- Various message types: efficient processing

// Session Management
- Session creation: < 50ms
- 1000 concurrent sessions
- Low memory per session (< 50KB)
- Fast state retrieval
- Efficient tag queries

// Message History
- Add 100 messages efficiently
- Retrieve history without lag
- Auto-truncate old messages
- High-frequency messages

// Counter Operations
- 10K increments: < 100ms
- Fast counter retrieval

// Engine Performance
- Queue size management
- Event processing efficiency

// Concurrent Users
- 100 concurrent users
- 500 concurrent users
- Burst traffic handling (500 messages)

// Memory Profiling
- Memory leak detection
- Per-session memory usage

// Stress Testing
- Rapid start/stop cycles
- Sustained high message rate (100 msgs/sec)

// Response Time Percentiles
- P95 message processing time
- P99 session creation time
```

## Running Tests

### Quick Start

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- integration.test.js
npm test -- performance.test.js

# Run with verbose output
npm test -- --verbose

# Run in watch mode
npm test -- --watch

# Run with CI flags
npm test -- --ci --bail
```

### Advanced Options

```bash
# Run tests matching pattern
npm test -- --testNamePattern="Session Management"

# Run with extended timeout
npm test -- --testTimeout=60000

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Generate HTML report
npm test -- --collectCoverageFrom="bot/**/*.js"
```

### Custom Test Runner

```bash
# Use the custom test runner
node bot/tests/run-tests.js
node bot/tests/run-tests.js --verbose
node bot/tests/run-tests.js --bail
node bot/tests/run-tests.js --ci
```

## Test Configuration

### Environment Variables

Tests automatically set:
```bash
NODE_ENV=test
USE_IN_MEMORY_DB=true
LOG_LEVEL=error
BOT_MODE=websocket
```

### Custom Configuration

Create a `jest.setup.local.js`:
```javascript
// Custom test setup
process.env.CUSTOM_VAR = 'value';

// Add custom matchers
expect.extend({
  customMatcher(received) { }
});
```

## Test Utilities

### Global Test Helpers

The setup file provides useful utilities:

```javascript
// Generate test user IDs
testUtils.generateTestUserId(0)        // '+971' + padded index
testUtils.generateTestUserIds(10)      // Array of 10 IDs

// Create test messages
testUtils.createTestMessage(userId, 'text')
testUtils.createTestCommand(userId, 'search', ['dubai', '2bed'])

// Performance measurement
await testUtils.measurePerformance(async () => {
  // code to measure
}, iterations)

// Memory tracking
testUtils.getMemoryUsage()             // Returns heap, rss, etc.

// Wait for conditions
await testUtils.waitFor(
  () => condition === true,
  5000,  // timeout
  100    // interval
);
```

### Custom Matchers

```javascript
// Performance matchers
expect(duration).toBePerformant(100);  // within threshold
expect(value).toBeWithinRange(0, 100); // value between range
```

## Coverage Targets

```
Statements   : 75%
Branches     : 70%
Functions    : 75%
Lines        : 75%
```

### Check Coverage

```bash
# Generate coverage report
npm test -- --coverage

# Generate HTML coverage report
npm test -- --coverage --coverageReporters=html

# View coverage
open coverage/index.html
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test -- --ci
      - uses: codecov/codecov-action@v2
```

### Pre-commit Hook

```bash
#!/bin/sh
npm test -- --bail
```

## Troubleshooting

### Tests Failing

```bash
# Clear cache
npm test -- --clearCache

# Run with verbose output
npm test -- --verbose

# Run single test
npm test -- --testNamePattern="specific test"

# Debug a test
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Performance Issues

```bash
# Check Node memory
node --inspect ... (use DevTools)

# Profile test execution
npm test -- --logHeapUsage

# Run one test at a time
npm test -- --runInBand
```

### Timeout Errors

```bash
# Increase timeout globally
npm test -- --testTimeout=60000

# Increase for specific test
jest.setTimeout(60000);
```

## Test Patterns & Best Practices

### Pattern 1: Async Setup/Teardown

```javascript
describe('Feature', () => {
  let bot;

  beforeEach(async () => {
    bot = new BotIntegration();
    await bot.start();
  });

  afterEach(async () => {
    if (bot) await bot.stop();
  });

  test('should work', async () => {
    expect(bot.isRunning).toBe(true);
  });
});
```

### Pattern 2: Performance Testing

```javascript
test('should complete within threshold', () => {
  const start = performance.now();
  expensiveOperation();
  const duration = performance.now() - start;

  expect(duration).toBePerformant(100);
});
```

### Pattern 3: User Simulation

```javascript
test('should handle multiple users', () => {
  const userIds = testUtils.generateTestUserIds(100);

  userIds.forEach(userId => {
    const session = sessionManager.getSession(userId);
    expect(session).toBeDefined();
  });
});
```

### Pattern 4: Message Flow

```javascript
test('should process message and add to history', async () => {
  const userId = testUtils.generateTestUserId(0);
  const message = testUtils.createTestMessage(userId, '/search dubai');

  const processed = messageHandler.parseMessage(message);
  expect(processed.isCommand).toBe(true);

  sessionManager.addMessage(userId, processed);
  const history = sessionManager.getHistory(userId);
  expect(history.length).toBe(1);
});
```

## Interpreting Results

### Success Indicators

```
✅ All tests PASSED
✅ No TypeScript errors
✅ Coverage > 75% across all metrics
✅ Performance within thresholds
✅ Memory stable (no leaks)
✅ < 10 seconds total execution time
```

### Test Report Format

```
📊 TEST SUMMARY
═══════════════════════════════
✅ Passed: 150
❌ Failed: 0
⏱️  Duration: 8.45s
─────────────────────────────
SUITE DETAILS:
✅ Integration Tests (5.23s)
✅ Performance Tests (3.22s)
```

## Integration with CI/CD

### Before Deployment

```bash
npm test -- --ci --coverage --bail
```

### Build Process

```json
{
  "scripts": {
    "test": "jest",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --bail",
    "test:performance": "jest performance.test.js",
    "test:watch": "jest --watch",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand"
  }
}
```

## Performance Benchmarks

### Expected Execution Times

```
Integration Tests (150 tests):  3-5 seconds
Performance Tests (30 tests):   2-4 seconds
Total Suite:                    5-10 seconds
Coverage Generation:            +10-15 seconds
```

### Hardware Requirements

```
Minimum: 2GB available RAM
Recommended: 8GB available RAM
CPU: Modern multi-core processor
Disk: 500MB for node_modules + test files
```

## Next Steps

1. **Run tests locally**: `npm test`
2. **Check coverage**: `npm test -- --coverage`
3. **Fix any failures**: Review test output and code
4. **Performance optimization**: Use perf test results to improve slowest components
5. **CI/CD integration**: Add test step to deployment pipeline
6. **Team training**: Share this guide with team members

## Support & Questions

For issues or improvements:
1. Check troubleshooting section
2. Review specific test file comments
3. Check Jest documentation
4. Review existing test patterns

---

**Last Updated:** 2026-02-21
**Test Framework:** Jest 29+
**Node Version:** 18+
