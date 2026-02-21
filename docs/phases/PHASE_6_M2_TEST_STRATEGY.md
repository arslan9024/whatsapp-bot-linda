# Phase 6 M2 Module 1 → Module 2 Test Strategy
## Comprehensive Testing Roadmap for Advanced Handlers

**Created:** February 26, 2026  
**Phase:** 6 M2 (Modules 1-2 Planning)  
**Scope:** 7 handlers, ~250 test cases, full coverage  

---

## Testing Overview

### Test Pyramid

```
                    △
                  △ △ △ 
                △ △ △ △ △
              △ △ △ △ △ △ △
            △ △ △ △ △ △ △ △ △
          E2E & Performance Tests (20 tests)
            ^\
             ^\         Integration Tests (60 tests)
              ^\           ^\
               ^\            ^\
                ^\             ^\
                 Unit Tests (170 tests)
                  
Total: ~250 test cases
```

### Test Distribution by Handler

| Handler | Unit Tests | Integration | E2E | Total |
|---------|-----------|-------------|-----|-------|
| AdvancedMediaHandler | 25 | 5 | 3 | 33 |
| GroupChatManager | 22 | 5 | 2 | 29 |
| MessageTemplateEngine | 28 | 6 | 3 | 37 |
| MessageBatchProcessor | 30 | 8 | 4 | 42 |
| ConversationIntelligenceEngine | 32 | 7 | 3 | 42 |
| WhatsAppMultiAccountManager | 26 | 10 | 5 | 41 |
| CommandExecutor | 27 | 7 | 2 | 36 |
| **TOTAL** | **190** | **48** | **22** | **260** |

---

## Test Execution Timeline

### Phase 6 M2 Module 2 (Estimated 8-10 hours)

**Day 1: Foundation Tests (3 hours)**
- Unit Test Framework Setup
- Mock Services Configuration
- AdvancedMediaHandler Unit Tests
- GroupChatManager Unit Tests

**Day 2: Core Handler Tests (3 hours)**
- MessageTemplateEngine Unit Tests
- MessageBatchProcessor Unit Tests
- ConversationIntelligenceEngine Unit Tests

**Day 3: Integration Tests (3 hours)**
- WhatsAppMultiAccountManager Unit Tests
- CommandExecutor Unit Tests
- Cross-Handler Integration Tests

**Day 4: Advanced Tests (2 hours)**
- E2E Tests
- Performance Benchmarks
- Load Testing
- Error Recovery Tests

---

## Detailed Test Specifications

### 1. AdvancedMediaHandler Tests

#### Unit Tests (25 tests)
```javascript
describe('AdvancedMediaHandler', () => {
  describe('uploadMedia', () => {
    it('should upload valid image file', async () => { });
    it('should validate file format before upload', async () => { });
    it('should reject unsupported formats', async () => { });
    it('should handle large files with streaming', async () => { });
    it('should set proper MIME types', async () => { });
  });

  describe('downloadMedia', () => {
    it('should download media from WhatsApp', async () => { });
    it('should cache downloaded media', async () => { });
    it('should handle expired media links', async () => { });
    it('should support resumable downloads', async () => { });
    it('should compute file checksums', async () => { });
  });

  describe('compressMedia', () => {
    it('should compress JPEG images', async () => { });
    it('should compress PNG images with transparency', async () => { });
    it('should compress video files', async () => { });
    it('should maintain aspect ratio', async () => { });
    it('should respect quality settings', async () => { });
    it('should reduce file size by target percentage', async () => { });
  });

  describe('validateMediaFormat', () => {
    it('should validate supported formats', async () => { });
    it('should reject unknown formats', async () => { });
    it('should check file size limits', async () => { });
    it('should verify file integrity', async () => { });
    it('should extract metadata from files', async () => { });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts', async () => { });
    it('should retry failed uploads', async () => { });
    it('should log errors properly', async () => { });
  });
});
```

#### Integration Tests (5 tests)
```javascript
describe('AdvancedMediaHandler Integration', () => {
  it('should upload and download media successfully', async () => { });
  it('should work with WhatsAppClient', async () => { });
  it('should manage cache efficiently', async () => { });
  it('should handle concurrent uploads', async () => { });
  it('should provide progress callbacks', async () => { });
});
```

#### E2E Tests (3 tests)
```javascript
describe('AdvancedMediaHandler E2E', () => {
  it('should send media message end-to-end', async () => { });
  it('should handle media in group chats', async () => { });
  it('should stream large video file', async () => { });
});
```

---

### 2. GroupChatManager Tests

#### Unit Tests (22 tests)
```javascript
describe('GroupChatManager', () => {
  describe('createGroup', () => {
    it('should create new group with valid data', () => { });
    it('should validate group name', () => { });
    it('should add initial participants', () => { });
    it('should set group description', () => { });
    it('should generate unique group ID', () => { });
  });

  describe('addParticipants', () => {
    it('should add single participant', () => { });
    it('should add multiple participants', () => { });
    it('should validate phone numbers', () => { });
    it('should prevent duplicate participants', () => { });
    it('should update participant list', () => { });
    it('should emit participant:added event', () => { });
  });

  describe('removeParticipants', () => {
    it('should remove participant from group', () => { });
    it('should handle non-existent participant gracefully', () => { });
    it('should update member count', () => { });
    it('should emit participant:removed event', () => { });
  });

  describe('createBroadcastList', () => {
    it('should create broadcast list', () => { });
    it('should add recipients to list', () => { });
    it('should prevent recipient duplication', () => { });
    it('should track broadcast metrics', () => { });
  });

  describe('Error Handling', () => {
    it('should handle invalid group ID', () => { });
    it('should handle malformed phone numbers', () => { });
    it('should enforce max participant limit', () => { });
  });
});
```

---

### 3. MessageTemplateEngine Tests

#### Unit Tests (28 tests)
```javascript
describe('MessageTemplateEngine', () => {
  describe('createTemplate', () => {
    it('should create template with content', () => { });
    it('should extract variables from content', () => { });
    it('should assign unique template ID', () => { });
    it('should store template metadata', () => { });
    it('should validate template syntax', () => { });
  });

  describe('renderTemplate', () => {
    it('should render template with single variable', () => { });
    it('should render with multiple variables', () => { });
    it('should handle missing variables', () => { });
    it('should escape dangerous characters', () => { });
    it('should process conditional blocks', () => { });
    it('should update usage statistics', () => { });
  });

  describe('renderBatchTemplates', () => {
    it('should render for multiple recipients', async () => { });
    it('should maintain performance with 100 recipients', async () => { });
    it('should return properly formatted messages', async () => { });
    it('should handle batch errors gracefully', async () => { });
  });

  describe('validateTemplate', () => {
    it('should validate correct syntax', () => { });
    it('should detect mismatched braces', () => { });
    it('should detect invalid variable names', () => { });
    it('should check template length', () => { });
  });

  describe('Template Analytics', () => {
    it('should track usage count', () => { });
    it('should record last used time', () => { });
    it('should track most used templates', () => { });
    it('should provide stats by category', () => { });
  });

  describe('Error Handling', () => {
    it('should handle template not found', () => { });
    it('should handle corrupted template', () => { });
    it('should log errors properly', () => { });
  });
});
```

---

### 4. MessageBatchProcessor Tests

#### Unit Tests (30 tests)
```javascript
describe('MessageBatchProcessor', () => {
  describe('createBatch', () => {
    it('should create batch with unique ID', () => { });
    it('should initialize progress tracking', () => { });
    it('should set default priority', () => { });
    it('should emit batch:created event', () => { });
  });

  describe('addMessagesToBatch', () => {
    it('should add single message', () => { });
    it('should add multiple messages', () => { });
    it('should validate batch size limit', () => { });
    it('should generate message IDs', () => { });
    it('should track pending messages', () => { });
    it('should reject messages to closed batch', () => { });
  });

  describe('processBatch', () => {
    it('should process messages sequentially', async () => { });
    it('should apply rate limiting', async () => { });
    it('should track progress', async () => { });
    it('should emit progress events', async () => { });
    it('should handle processing errors', async () => { });
  });

  describe('Retry Logic', () => {
    it('should retry failed messages', async () => { });
    it('should use exponential backoff', async () => { });
    it('should respect max retry count', async () => { });
    it('should track retry attempts', async () => { });
  });

  describe('Rate Limiting', () => {
    it('should enforce messages per second limit', async () => { });
    it('should queue excess messages', async () => { });
    it('should process queued messages after rate limit window', async () => { });
  });

  describe('Concurrent Processing', () => {
    it('should process multiple batches concurrently', async () => { });
    it('should respect max concurrent batches', async () => { });
    it('should queue batches when at capacity', async () => { });
  });

  describe('Error Handling', () => {
    it('should handle batch not found', () => { });
    it('should handle handler errors', () => { });
    it('should log errors with context', () => { });
  });

  describe('Metrics', () => {
    it('should track successful messages', () => { });
    it('should track failed messages', () => { });
    it('should calculate success rate', () => { });
  });
});
```

---

### 5. ConversationIntelligenceEngine Tests

#### Unit Tests (32 tests)
```javascript
describe('ConversationIntelligenceEngine', () => {
  describe('analyzeConversation', () => {
    it('should analyze complete conversation', () => { });
    it('should handle empty conversations', () => { });
    it('should extract multiple analysis types', () => { });
    it('should store analysis results', () => { });
  });

  describe('analyzeSentiment', () => {
    it('should detect positive sentiment', () => { });
    it('should detect negative sentiment', () => { });
    it('should detect neutral sentiment', () => { });
    it('should calculate sentiment score', () => { });
    it('should count sentiment by message', () => { });
    it('should handle emoji sentiment', () => { });
  });

  describe('extractTopics', () => {
    it('should identify single topic', () => { });
    it('should identify multiple topics', () => { });
    it('should rank topics by relevance', () => { });
    it('should handle no matching topics', () => { });
    it('should track topic counts', () => { });
  });

  describe('recognizeIntents', () => {
    it('should recognize greeting intent', () => { });
    it('should recognize question intent', () => { });
    it('should recognize help request', () => { });
    it('should recognize confirmation', () => { });
    it('should calculate intent confidence', () => { });
  });

  describe('identifyPatterns', () => {
    it('should calculate conversation length', () => { });
    it('should detect message length patterns', () => { });
    it('should count punctuation patterns', () => { });
    it('should track question patterns', () => { });
    it('should detect emoji usage', () => { });
  });

  describe('learnFromFeedback', () => {
    it('should store feedback', () => { });
    it('should update learning metrics', () => { });
    it('should handle rating feedback', () => { });
    it('should store improvement suggestions', () => { });
  });

  describe('Error Handling', () => {
    it('should handle empty text', () => { });
    it('should handle malformed messages', () => { });
    it('should log errors', () => { });
  });
});
```

---

### 6. WhatsAppMultiAccountManager Tests

#### Unit Tests (26 tests)
```javascript
describe('WhatsAppMultiAccountManager', () => {
  describe('addAccount', () => {
    it('should add master account', async () => { });
    it('should add secondary account', async () => { });
    it('should validate phone number format', async () => { });
    it('should generate unique account ID', async () => { });
    it('should enforce max secondary accounts', async () => { });
    it('should emit account:added event', async () => { });
  });

  describe('removeAccount', () => {
    it('should remove account', async () => { });
    it('should handle non-existent account', async () => { });
    it('should prevent removing master with secondaries', async () => { });
    it('should promote secondary on master removal', async () => { });
  });

  describe('switchAccount', () => {
    it('should switch to target account', async () => { });
    it('should deactivate other accounts', async () => { });
    it('should update last activity', async () => { });
    it('should emit account:switched event', async () => { });
  });

  describe('accountRouting', () => {
    it('should route to master by default', () => { });
    it('should use round-robin distribution', () => { });
    it('should use least-loaded strategy', () => { });
    it('should respect routing preferences', () => { });
  });

  describe('deviceLinking', () => {
    it('should initiate device linking', async () => { });
    it('should generate linking code', async () => { });
    it('should confirm device linking', async () => { });
    it('should update link status', async () => { });
  });

  describe('Error Handling', () => {
    it('should handle invalid phone numbers', () => { });
    it('should handle account not found', () => { });
    it('should log errors', () => { });
  });
});
```

#### Integration Tests (10 tests)
```javascript
describe('WhatsAppMultiAccountManager Integration', () => {
  it('should manage master and secondary accounts together', async () => { });
  it('should load balance across accounts', async () => { });
  it('should handle account switching during processing', async () => { });
  it('should record message activity per account', async () => { });
  it('should calculate account health', async () => { });
  it('should handle device linking flow', async () => { });
  it('should persist account data', async () => { });
  it('should provide accurate account statistics', async () => { });
  it('should enforce account limits', async () => { });
  it('should support concurrent account operations', async () => { });
});
```

---

### 7. CommandExecutor Tests

#### Unit Tests (27 tests)
```javascript
describe('CommandExecutor', () => {
  describe('parseCommand', () => {
    it('should parse simple command', () => { });
    it('should parse command with subcommand', () => { });
    it('should parse command with arguments', () => { });
    it('should parse command with flags', () => { });
    it('should handle quoted arguments', () => { });
    it('should remove leading slash', () => { });
  });

  describe('WhatsApp Commands', () => {
    it('should execute /whatsapp list', async () => { });
    it('should execute /whatsapp add', async () => { });
    it('should execute /whatsapp switch', async () => { });
    it('should execute /whatsapp status', async () => { });
    it('should execute /whatsapp send', async () => { });
  });

  describe('Contacts Commands', () => {
    it('should execute /contacts sync', async () => { });
    it('should execute /contacts list', async () => { });
    it('should execute /contacts add', async () => { });
    it('should execute /contacts update', async () => { });
    it('should execute /contacts search', async () => { });
  });

  describe('Sheets Commands', () => {
    it('should execute /sheets list', async () => { });
    it('should execute /sheets create', async () => { });
    it('should execute /sheets append', async () => { });
    it('should execute /sheets query', async () => { });
  });

  describe('Learning Commands', () => {
    it('should execute /learn add', async () => { });
    it('should execute /learn list', async () => { });
    it('should execute /learn feedback', async () => { });
  });

  describe('System Commands', () => {
    it('should execute /help', async () => { });
    it('should execute /status', async () => { });
  });

  describe('Error Handling', () => {
    it('should handle unknown command', () => { });
    it('should handle malformed input', () => { });
    it('should log errors', () => { });
  });
});
```

---

## Cross-Handler Integration Tests (48 tests)

```javascript
describe('Handler Integration', () => {
  describe('Template + Batch Processor', () => {
    it('should render batch templates for batch processor', async () => { });
    it('should track template usage in batch processor', async () => { });
    it('should handle template errors in batch', async () => { });
  });

  describe('Multi-Account + Command Executor', () => {
    it('should route commands to correct account', async () => { });
    it('should switch accounts via command', async () => { });
    it('should list accounts via command', async () => { });
  });

  describe('Batch Processor + Multi-Account', () => {
    it('should distribute batch across accounts', async () => { });
    it('should load balance batch messages', async () => { });
    it('should handle account switching during batch', async () => { });
  });

  describe('Media + Group Manager', () => {
    it('should send media to groups', async () => { });
    it('should handle media in broadcast lists', async () => { });
    it('should compress media for group messages', async () => { });
  });

  describe('Intelligence + Command Executor', () => {
    it('should analyze command inputs', async () => { });
    it('should learn from command feedback', async () => { });
    it('should provide insights on commands', async () => { });
  });

  describe('Multi-Account + Media Handler', () => {
    it('should route media upload to correct account', async () => { });
    it('should cache media per account', async () => { });
    it('should track media upload per account', async () => { });
  });

  // ... Additional 42 integration test cases
});
```

---

## E2E and Performance Tests (22 tests)

```javascript
describe('E2E Tests', () => {
  describe('Complete Message Flow', () => {
    it('should send templated message end-to-end', async () => { });
    it('should send batch of templated messages', async () => { });
    it('should send media to multiple accounts', async () => { });
    it('should broadcast to group end-to-end', async () => { });
  });

  describe('Performance Benchmarks', () => {
    it('should render 1000 templates in < 500ms', async () => { });
    it('should process batch of 100 in < 10 seconds', async () => { });
    it('should analyze 50 conversations in < 5 seconds', async () => { });
    it('should route messages across 5 accounts in < 100ms', async () => { });
    it('should execute commands in < 200ms', async () => { });
  });

  describe('Load Testing', () => {
    it('should handle concurrent batch processing', async () => { });
    it('should maintain quality under load', async () => { });
    it('should scale horizontally', async () => { });
  });

  describe('Error Recovery', () => {
    it('should recover from handler errors', async () => { });
    it('should implement fallback strategies', async () => { });
    it('should maintain consistency after failures', async () => { });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete user conversation flow', async () => { });
    it('should support multi-account failover', async () => { });
    it('should maintain analytics across all handlers', async () => { });
  });
});
```

---

## Test Fixtures and Mocks

### Mock Services

```javascript
// Mock WhatsAppClient
const mockWhatsAppClient = {
  sendMessage: jest.fn().mockResolvedValue({ id: 'msg_123' }),
  downloadMedia: jest.fn().mockResolvedValue(Buffer.from('data')),
  createGroup: jest.fn().mockResolvedValue({ id: 'group_123' })
};

// Mock MongoDB
const mockDb = {
  collection: jest.fn().mockReturnValue({
    insertOne: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn()
  })
};

// Mock Google APIs
const mockGoogleApi = {
  contacts: {
    list: jest.fn(),
    update: jest.fn()
  },
  sheets: {
    append: jest.fn(),
    query: jest.fn()
  }
};

// Mock Logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};
```

### Test Data

```javascript
const testData = {
  validPhoneNumber: '+1234567890',
  invalidPhoneNumber: 'invalid',
  testMessage: {
    id: 'msg_123',
    from: '+1111111111',
    to: '+2222222222',
    text: 'Hello World',
    timestamp: new Date()
  },
  testTemplate: {
    name: 'test_template',
    content: 'Hello {{name}}, your order {{orderId}} is {{status}}'
  },
  testConversation: [
    { id: 'msg1', sender: 'user', text: 'Hello!' },
    { id: 'msg2', sender: 'bot', text: 'Hi there!' }
  ]
};
```

---

## Success Criteria

✅ **Code Coverage:** >85% for all handlers  
✅ **Test Pass Rate:** 100%  
✅ **Performance:** All benchmarks met  
✅ **Error Handling:** All error paths tested  
✅ **Integration:** All handler combinations tested  
✅ **Documentation:** Test specs documented  
✅ **CI/CD:** All tests pass in GitHub Actions  

---

## Test Execution Command

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific handler tests
npm test AdvancedMediaHandler.test.js
npm test GroupChatManager.test.js
npm test MessageTemplateEngine.test.js
npm test MessageBatchProcessor.test.js
npm test ConversationIntelligenceEngine.test.js
npm test WhatsAppMultiAccountManager.test.js
npm test CommandExecutor.test.js

# Run integration tests
npm test -- --testPathPattern=integration

# Run E2E tests
npm test -- --testPathPattern=e2e

# Watch mode
npm test -- --watch

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

---

## Conclusion

This comprehensive test strategy ensures that all 7 handlers in Phase 6 M2 Module 1 are thoroughly tested with:
- **190 unit tests** covering individual functionality
- **48 integration tests** covering cross-handler interactions
- **22 E2E and performance tests** validating complete workflows
- **Total: 260 test cases** ensuring production-ready code

The tests are organized for clear execution, comprehensive coverage, and easy maintenance, following Jest best practices and providing a solid foundation for the Linda WhatsApp Bot infrastructure.

---

**Next Action:** Execute Module 2 test creation following this specification
