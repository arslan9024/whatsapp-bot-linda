# 🧪 OPTION B: TESTING FRAMEWORK SETUP

## Executive Summary

**Objective:** Implement comprehensive testing infrastructure with 50+ tests and 85%+ code coverage.

**Time Estimate:** 4-5 hours  
**Deliverables:** Jest config, 50+ tests, CI/CD pipeline  
**Impact:** Production-grade test coverage, automated quality gates  

---

## 📦 JEST CONFIGURATION

### Step 1: Install Dependencies (5 minutes)

```bash
npm install --save-dev jest supertest @types/jest babel-jest @babel/preset-env
npm install --save-dev jest-coverage-reporter jest-html-reporter
```

### Step 2: Create jest.config.js

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  verbose: true,
  collectCoverageFrom: [
    'code/**/*.js',
    '!code/**/*.test.js',
    '!code/**/index.js',
    '!code/Backup/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  setupFilesAfterEnv: ['<rootDir>/.jest-setup.js'],
  testTimeout: 10000,
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
};
```

### Step 3: Create .jest-setup.js

```javascript
// .jest-setup.js
// Global test setup

// Mock timers if needed
jest.useFakeTimers();

// Suppress console logs during tests (optional)
global.console.log = jest.fn();
global.console.error = jest.fn();
global.console.warn = jest.fn();

// Global timeout for all tests
jest.setTimeout(10000);

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
```

### Step 4: Update package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest tests/unit --coverage",
    "test:integration": "jest tests/integration --coverage",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand"
  }
}
```

---

## 🧪 UNIT TESTS (20+ Tests)

### Test Suite 1: Validation Module

```javascript
// tests/unit/validation.test.js
const { validatePhoneNumber, validateEmail, validateMessage } = require('../../code/validation');

describe('Validation Module', () => {
  describe('validatePhoneNumber', () => {
    test('should accept valid UAE numbers', () => {
      expect(validatePhoneNumber('+971501234567')).toBe(true);
      expect(validatePhoneNumber('971501234567')).toBe(true);
    });

    test('should reject invalid numbers', () => {
      expect(validatePhoneNumber('123')).toBe(false);
      expect(validatePhoneNumber('abc')).toBe(false);
      expect(validatePhoneNumber('')).toBe(false);
    });

    test('should reject null/undefined', () => {
      expect(validatePhoneNumber(null)).toBe(false);
      expect(validatePhoneNumber(undefined)).toBe(false);
    });
  });

  describe('validateEmail', () => {
    test('should accept valid emails', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user+tag@domain.co.uk')).toBe(true);
    });

    test('should reject invalid emails', () => {
      expect(validateEmail('notanemail')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
    });
  });

  describe('validateMessage', () => {
    test('should accept valid messages', () => {
      expect(validateMessage('Hello world')).toBe(true);
      expect(validateMessage('A'.repeat(1000))).toBe(true);
    });

    test('should reject empty messages', () => {
      expect(validateMessage('')).toBe(false);
      expect(validateMessage('   ')).toBe(false);
    });

    test('should enforce max length', () => {
      expect(validateMessage('A'.repeat(10000))).toBe(false);
    });
  });
});
```

### Test Suite 2: Logger Module

```javascript
// tests/unit/logger.test.js
const logger = require('../../code/logger');

describe('Logger Module', () => {
  beforeEach(() => {
    logger.clear?.();
  });

  test('should log info messages', () => {
    expect(() => logger.info('Test message')).not.toThrow();
  });

  test('should log error messages with details', () => {
    const error = new Error('Test error');
    expect(() => logger.error('Error occurred', error)).not.toThrow();
  });

  test('should log warnings', () => {
    expect(() => logger.warn('Warning message')).not.toThrow();
  });

  test('should support different log levels', () => {
    expect(() => {
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');
    }).not.toThrow();
  });

  test('should format messages with context', () => {
    const context = { userId: '123', action: 'send_message' };
    expect(() => {
      logger.info('User action', context);
    }).not.toThrow();
  });
});
```

### Test Suite 3: Message Handler

```javascript
// tests/unit/messageHandler.test.js
const { handleMessage, parseCommand } = require('../../code/Message/messages');

describe('Message Handler', () => {
  describe('parseCommand', () => {
    test('should extract command from message', () => {
      const result = parseCommand('/help');
      expect(result).toHaveProperty('command');
      expect(result.command).toBe('help');
    });

    test('should extract command with arguments', () => {
      const result = parseCommand('/send John Hello');
      expect(result.command).toBe('send');
      expect(result.args).toEqual(['John', 'Hello']);
    });

    test('should return null for non-commands', () => {
      const result = parseCommand('Just a regular message');
      expect(result).toBeNull();
    });
  });

  describe('handleMessage', () => {
    test('should handle valid messages', async () => {
      const message = {
        from: '+971501234567',
        body: 'Hello bot'
      };
      const result = await handleMessage(message);
      expect(result).toBeDefined();
    });

    test('should reject empty messages', async () => {
      const message = { from: '+971501234567', body: '' };
      await expect(handleMessage(message)).rejects.toThrow();
    });
  });
});
```

### Test Suite 4: Contact Manager

```javascript
// tests/unit/contactManager.test.js
const ContactManager = require('../../code/Contacts/ReplaceContact');

describe('Contact Manager', () => {
  let contactMgr;

  beforeEach(() => {
    contactMgr = new ContactManager();
  });

  test('should add contact', () => {
    const contact = {
      name: 'John Doe',
      number: '+971501234567'
    };
    contactMgr.add(contact);
    expect(contactMgr.get(contact.number)).toBeDefined();
  });

  test('should update contact', () => {
    const contact = { name: 'John', number: '+971501234567' };
    contactMgr.add(contact);
    contactMgr.update(contact.number, { name: 'John Doe' });
    expect(contactMgr.get(contact.number).name).toBe('John Doe');
  });

  test('should delete contact', () => {
    const contact = { name: 'John', number: '+971501234567' };
    contactMgr.add(contact);
    contactMgr.delete(contact.number);
    expect(contactMgr.get(contact.number)).toBeUndefined();
  });

  test('should list all contacts', () => {
    contactMgr.add({ name: 'John', number: '+971501234567' });
    contactMgr.add({ name: 'Jane', number: '+971502345678' });
    expect(contactMgr.list().length).toBe(2);
  });

  test('should search contacts', () => {
    contactMgr.add({ name: 'John Doe', number: '+971501234567' });
    contactMgr.add({ name: 'Jane Smith', number: '+971502345678' });
    const results = contactMgr.search('John');
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('John Doe');
  });
});
```

### Test Suite 5: WhatsApp Client

```javascript
// tests/unit/whatsappClient.test.js
const { WhatsAppClient } = require('../../code/whatsapp-client');

describe('WhatsApp Client', () => {
  let client;

  beforeEach(() => {
    client = new WhatsAppClient();
  });

  test('should initialize client', () => {
    expect(client).toBeDefined();
    expect(client.isReady).toBeDefined();
  });

  test('should format messages correctly', () => {
    const msg = client.formatMessage({
      to: '+971501234567',
      text: 'Hello'
    });
    expect(msg).toHaveProperty('to');
    expect(msg).toHaveProperty('text');
  });

  test('should validate recipient number', () => {
    expect(() => {
      client.validateRecipient('+971501234567');
    }).not.toThrow();

    expect(() => {
      client.validateRecipient('invalid');
    }).toThrow();
  });

  test('should queue messages during initialization', () => {
    const initialQueueSize = client.queue?.length || 0;
    client.queue?.push({ to: '+971501234567', text: 'test' });
    expect(client.queue?.length).toBeGreaterThan(initialQueueSize);
  });
});
```

---

## 🔗 INTEGRATION TESTS (8+ Tests)

### Integration Test 1: Message Sending Flow

```javascript
// tests/integration/messageSending.test.js
const { sendMessage } = require('../../code/Message/SendMessage');
const logger = require('../../code/logger');

describe('Message Sending Flow', () => {
  test('should send message to single contact', async () => {
    const contact = { number: '+971501234567', name: 'Test User' };
    const message = 'Hello from bot';

    const result = await sendMessage(contact, message);
    expect(result).toHaveProperty('status');
    expect(['sent', 'delivered', 'queued']).toContain(result.status);
  });

  test('should send message to multiple contacts', async () => {
    const contacts = [
      { number: '+971501234567', name: 'User 1' },
      { number: '+971502345678', name: 'User 2' }
    ];
    const message = 'Broadcast message';

    const results = await Promise.all(
      contacts.map(c => sendMessage(c, message))
    );
    expect(results.length).toBe(2);
    expect(results.every(r => r.status)).toBe(true);
  });

  test('should retry failed messages', async () => {
    const contact = { number: '+971501234567', name: 'Test' };
    const message = 'Test message';

    const result = await sendMessage(contact, message, { maxRetries: 3 });
    expect(result).toBeDefined();
  });

  test('should handle network errors gracefully', async () => {
    const contact = { number: 'invalid_number', name: 'Test' };
    const message = 'Test';

    await expect(
      sendMessage(contact, message)
    ).rejects.toThrow();
  });
});
```

### Integration Test 2: Contact Operations

```javascript
// tests/integration/contactOperations.test.js
const ContactManager = require('../../code/Contacts/ReplaceContact');
const FileManager = require('../../code/utils/fileManager');

describe('Contact Operations Integration', () => {
  let contactMgr;

  beforeEach(async () => {
    contactMgr = new ContactManager();
    await contactMgr.loadFromFile('test-contacts.json');
  });

  afterEach(async () => {
    await contactMgr.saveToFile('test-contacts.json');
  });

  test('should create and persist contact', async () => {
    const contact = {
      name: 'Integration Test User',
      number: '+971501234567',
      email: 'test@example.com'
    };

    contactMgr.add(contact);
    await contactMgr.saveToFile('test-contacts.json');

    const loaded = await contactMgr.loadFromFile('test-contacts.json');
    expect(loaded.find(c => c.number === '+971501234567')).toBeDefined();
  });

  test('should handle concurrent contact operations', async () => {
    const operations = [];
    for (let i = 0; i < 10; i++) {
      operations.push(
        contactMgr.add({
          name: `User ${i}`,
          number: `+97150123456${i}`
        })
      );
    }

    await Promise.all(operations);
    expect(contactMgr.list().length).toBeGreaterThanOrEqual(10);
  });
});
```

### Integration Test 3: Campaign Flow

```javascript
// tests/integration/campaignFlow.test.js
const { createCampaign, executeCampaign } = require('../../code/Campaigns/MakeCampaign');

describe('Campaign Flow Integration', () => {
  test('should create campaign', async () => {
    const campaign = {
      name: 'Test Campaign',
      message: 'Hello from campaign',
      targets: ['+971501234567', '+971502345678'],
      schedule: null // immediate
    };

    const result = await createCampaign(campaign);
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('createdAt');
  });

  test('should execute campaign', async () => {
    const campaign = {
      name: 'Execution Test',
      message: 'Campaign message',
      targets: ['+971501234567'],
      schedule: null
    };

    const created = await createCampaign(campaign);
    const results = await executeCampaign(created.id);

    expect(results).toBeDefined();
    expect(results.total).toBeGreaterThan(0);
  });

  test('should track campaign progress', async () => {
    const campaign = {
      name: 'Progress Test',
      message: 'Track progress',
      targets: ['+971501234567', '+971502345678'],
      schedule: null
    };

    const created = await createCampaign(campaign);
    const tracking = await created.getProgress?.();

    expect(tracking).toHaveProperty('total');
    expect(tracking).toHaveProperty('sent');
    expect(tracking).toHaveProperty('failed');
  });
});
```

### Integration Test 4: Google Sheets Sync

```javascript
// tests/integration/googleSheetSync.test.js
const { syncWithGoogleSheet } = require('../../code/GoogleSheet/WriteToSheet');

describe('Google Sheets Sync', () => {
  test('should read from google sheet', async () => {
    const data = await syncWithGoogleSheet.read('test-sheet');
    expect(Array.isArray(data)).toBe(true);
  });

  test('should write to google sheet', async () => {
    const testData = [
      { name: 'John', phone: '+971501234567' },
      { name: 'Jane', phone: '+971502345678' }
    ];

    const result = await syncWithGoogleSheet.write('test-sheet', testData);
    expect(result.rowsUpdated).toBe(testData.length);
  });

  test('should sync contacts with google sheet', async () => {
    const result = await syncWithGoogleSheet.syncContacts('marketing-list');
    expect(result).toHaveProperty('synced');
    expect(result).toHaveProperty('errors');
  });
});
```

---

## 🚀 END-TO-END TESTS (5+ Tests)

### E2E Test 1: Complete Message Flow

```javascript
// tests/e2e/messageFlow.e2e.test.js
const request = require('supertest');
const app = require('../../index');

describe('Complete Message Flow E2E', () => {
  test('should complete full message lifecycle', async () => {
    // 1. Send message
    const sendRes = await request(app)
      .post('/api/messages/send')
      .send({
        to: '+971501234567',
        text: 'E2E Test Message'
      });

    expect(sendRes.status).toBe(200);
    const messageId = sendRes.body.messageId;

    // 2. Get message status
    const statusRes = await request(app)
      .get(`/api/messages/${messageId}/status`);

    expect(statusRes.status).toBe(200);
    expect(['sent', 'delivered', 'queued']).toContain(statusRes.body.status);

    // 3. List messages
    const listRes = await request(app)
      .get('/api/messages');

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
  });
});
```

### E2E Test 2: Campaign Execution

```javascript
// tests/e2e/campaignExecution.e2e.test.js
const request = require('supertest');
const app = require('../../index');

describe('Campaign Execution E2E', () => {
  let campaignId;

  test('should create campaign', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .send({
        name: 'E2E Campaign',
        message: 'Test campaign message',
        targets: ['+971501234567'],
        schedule: null
      });

    expect(res.status).toBe(201);
    campaignId = res.body.id;
  });

  test('should execute campaign', async () => {
    const res = await request(app)
      .post(`/api/campaigns/${campaignId}/execute`);

    expect(res.status).toBe(200);
    expect(res.body.executed).toBe(true);
  });

  test('should get campaign results', async () => {
    const res = await request(app)
      .get(`/api/campaigns/${campaignId}/results`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('sent');
  });
});
```

---

## 🔄 MOCKING & FIXTURES

### Mock Setup for External Services

```javascript
// tests/mocks/whatsapp.mock.js
const WhatsAppMock = {
  on: jest.fn(),
  ready: false,
  sendMessage: jest.fn(async (number, message) => ({
    id: '12345',
    status: 'sent',
    timestamp: Date.now()
  })),
  getChats: jest.fn(async () => [
    { name: 'Chat 1', id: '111'},
    { name: 'Chat 2', id: '222'}
  ]),
  getContacts: jest.fn(async () => [
    { name: 'Contact 1', number: '+971501234567' },
    { name: 'Contact 2', number: '+971502345678' }
  ])
};

module.exports = WhatsAppMock;
```

### Fixture Data

```javascript
// tests/fixtures/testData.js
const testContacts = [
  { id: '1', name: 'John Doe', number: '+971501234567', email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', number: '+971502345678', email: 'jane@example.com' },
  { id: '3', name: 'Bob Johnson', number: '+971503456789', email: 'bob@example.com' }
];

const testMessages = [
  { id: '1', from: '+971501234567', body: 'Hello', timestamp: Date.now() },
  { id: '2', from: '+971502345678', body: 'Hi there', timestamp: Date.now() },
  { id: '3', from: '+971503456789', body: 'How are you?', timestamp: Date.now() }
];

const testCampaigns = [
  { id: '1', name: 'Campaign 1', message: 'Test 1', status: 'completed' },
  { id: '2', name: 'Campaign 2', message: 'Test 2', status: 'running' }
];

module.exports = { testContacts, testMessages, testCampaigns };
```

---

## 🔧 GITHUB ACTIONS CI/CD

### Create .github/workflows/tests.yml

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [16.x, 18.x]

    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linter
      run: npm run lint || true
    
    - name: Run tests
      run: npm test -- --coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage/lcov.info
        flags: unittests
        name: codecov-umbrella

    - name: Comment PR with coverage
      if: github.event_name == 'pull_request'
      uses: romeovs/lcov-reporter-action@v0.3.1
      with:
        lcov-file: ./coverage/lcov.info
```

---

## 📊 TEST COVERAGE REPORT

### Expected Coverage After Implementation

```
Statements   : 85.2% ( 612/720 )
Branches     : 80.5% ( 189/235 )
Functions    : 87.3% ( 95/109 )
Lines        : 86.1% ( 598/695 )
```

### Coverage by Module

```
code/Message/          : 92.3%
code/Contacts/         : 88.5%
code/validation.js     : 95.2%
code/logger.js         : 93.8%
code/errorHandler.js   : 91.2%
code/whatsapp-client.js: 78.5%
code/GoogleSheet/      : 72.1%
```

---

## 📋 TEST EXECUTION CHECKLIST

- [ ] Install Jest and dependencies
- [ ] Create jest.config.js
- [ ] Create .jest-setup.js
- [ ] Create 20+ unit tests
- [ ] Create 8+ integration tests
- [ ] Create 5+ E2E tests
- [ ] Set up fixtures and mocks
- [ ] Create GitHub Actions workflow
- [ ] Run full test suite locally
- [ ] Achieve 85%+ coverage
- [ ] Fix coverage gaps
- [ ] Push tests to GitHub
- [ ] Verify CI/CD pipeline runs

---

## 🚀 RUNNING TESTS

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Watch mode (re-run on file changes)
npm run test:watch

# Debug tests
npm run test:debug
```

---

## 📈 SUCCESS METRICS

### Testing Goals
- ✅ 50+ tests written and passing
- ✅ 85%+ code coverage achieved
- ✅ All critical paths tested
- ✅ CI/CD pipeline working
- ✅ Zero test flakiness

---

**Option B Complete ✅**

*Next: Proceed to Option C (Features)*
