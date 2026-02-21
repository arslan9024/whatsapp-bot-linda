# Bot Test Execution Quick Reference

## Installation

```bash
# Install test dependencies
npm install --save-dev \
  jest \
  jest-junit \
  jest-html-reporters \
  @babel/preset-env \
  babel-jest

# Or with npm
npm install --save-dev jest jest-junit jest-html-reporters
```

## Quick Commands

### Most Common

```bash
# Run all tests
npm test

# Run with coverage report
npm test -- --coverage

# Run specific test file
npm test integration.test.js
npm test performance.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="Session"
```

### Development

```bash
# Watch mode (re-run tests on file change)
npm test -- --watch

# Debug mode (use Chrome DevTools)
node --inspect-brk node_modules/.bin/jest --runInBand

# Show which tests are running
npm test -- --verbose

# Stop on first failure
npm test -- --bail
```

### CI/CD

```bash
# CI mode (no watch, detailed output)
npm test -- --ci

# CI mode with coverage
npm test -- --ci --coverage

# CI mode with bail (stop on first failure)
npm test -- --ci --bail

# Generate JUnit XML (for CI tools)
npm test -- --coverage --outputFile=test-results.json
```

### Performance Testing

```bash
# Run only performance tests
npm test performance.test.js

# Run performance tests with longer timeout
npm test -- --testTimeout=60000 performance.test.js

# Measure heap usage
npm test -- --logHeapUsage
```

### Reporting

```bash
# Generate HTML coverage report
npm test -- --coverage --coverageReporters=html

# View results
open coverage/index.html  # macOS
start coverage/index.html # Windows
xdg-open coverage/index.html # Linux

# Generate JUnit XML (for CI tools)
npm test -- --ci --coverage
```

## npm Scripts to Add

Add these to your `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:coverage": "jest --coverage",
    "test:coverage:html": "jest --coverage --coverageReporters=html",
    "test:coverage:view": "jest --coverage --coverageReporters=html && start coverage/index.html",
    "test:watch": "jest --watch",
    "test:ci": "jest --ci --coverage --bail",
    "test:performance": "jest bot/tests/performance.test.js",
    "test:integration": "jest bot/tests/integration.test.js",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand",
    "test:verbose": "jest --verbose",
    "test:bail": "jest --bail",
    "test:runner": "node bot/tests/run-tests.js",
    "test:runner:verbose": "node bot/tests/run-tests.js --verbose"
  }
}
```

## Test Output Interpretation

### Success Output
```
PASS  bot/tests/integration.test.js (5.234s)
  Bot Integration Tests
    ✓ should initialize with default config
    ✓ should load config from environment
    ...
  150 passed (5.234s)
```

### Failure Output
```
FAIL  bot/tests/integration.test.js
  ● Bot Integration Tests › Message Flow › should process command
    Expected: true
    Received: false
    
    File: bot/tests/integration.test.js:123:45
```

### Coverage Output
```
File      | % Stmts | % Branch | % Funcs | % Lines
----------|---------|----------|---------|--------
All files |   85.4  |   82.1   |   88.3  |   85.9
 bot/     |   85.4  |   82.1   |   88.3  |   85.9
  index.js|  100    |   100    |   100   |   100
  ...
```

## Troubleshooting Quick Fixes

### Tests Won't Run
```bash
# Clear Jest cache
npm test -- --clearCache

# Reinstall dependencies
npm install

# Check Node version
node --version  # Should be 18+
```

### Module Errors
```bash
# Check for import issues
npm test -- --testNamePattern="specific test"

# Run with more verbose output
npm test -- --verbose
```

### Timeout Errors
```bash
# Increase timeout (default 5000ms)
npm test -- --testTimeout=30000

# Run single test to debug
npm test -- --testNamePattern="slow test" --verbose
```

### Memory Issues
```bash
# Check memory usage
npm test -- --logHeapUsage

# Run tests in sequence
npm test -- --runInBand
```

## File Locations

```
Project Root
├── bot/
│   ├── tests/
│   │   ├── integration.test.js     ← Unit/integration tests
│   │   ├── performance.test.js     ← Performance tests
│   │   ├── setup.js                ← Test environment
│   │   └── run-tests.js            ← Custom runner
│   ├── BotIntegration.js
│   ├── CustomBotEngine.js
│   └── ... (other bot files)
├── jest.config.js                   ← Jest configuration
├── package.json                     ← npm scripts
└── test-results/                    ← Generated reports
    ├── report.html                  ← HTML coverage
    ├── junit.xml                    ← CI test results
    └── test-report.json             ← Detailed results
```

## Performance Expectations

| Metric | Expected | Good | Excellent |
|--------|----------|------|-----------|
| Message Processing | <100ms | <50ms | <20ms |
| Session Creation | <50ms | <20ms | <10ms |
| 100 Messages | <10s | <5s | <2s |
| 1000 Sessions | <5s | <2s | <1s |
| Total Test Suite | <10s | <5s | <3s |

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `Cannot find module` | Run `npm install` |
| `Jest timeout` | Increase with `--testTimeout=30000` |
| `No tests found` | Check file matches `*.test.js` |
| `Memory errors` | Run with `--runInBand` |
| `Port already in use` | Change environment port |
| `Database errors` | Use `USE_IN_MEMORY_DB=true` |

## Next Steps

1. **Install dependencies**: `npm install --save-dev jest`
2. **Add scripts**: Copy npm scripts to `package.json`
3. **Run tests**: `npm test`
4. **Check coverage**: `npm run test:coverage`
5. **Review results**: Open `test-results/report.html`

## Related Documentation

See full guide: `BOT_TESTING_GUIDE.md`
For bot architecture: `HYBRID_BOT_ARCHITECTURE.md`
For implementation: `HYBRID_BOT_IMPLEMENTATION_GUIDE.md`

---

**Quick Test**: `npm test -- --testNamePattern="should initialize" --verbose`
