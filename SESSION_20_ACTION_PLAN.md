# SESSION 20 ACTION PLAN
**Target: 85% Pass Rate (665/783 tests)**
**Current: 80.1% (627/783)**
**Gap: 38 tests | Estimated: 1 day**

---

## FAILING TEST SUITES (5 total)
1. **CommandExecutor.test.js** - 31 failures (logger mocking, timeout, history)
2. **AdvancedMediaHandler.test.js** - 44 failures (test stubs)
3. **ConversationIntelligenceEngine.test.js** - 15 failures (NLP stubs)
4. **MessageBatchProcessor.test.js** - 1 failure (duration tracking)
5. **bot-workflow.e2e.test.js** - 3 failures (E2E integration)

---

## QUICK WIN STRATEGY (7 targeted fixes)

### Quick Win 1: CommandExecutor Logger Mocking (Est. 15 min)
**Problem:** MockLogger methods not properly mocked as jest spies
**Files:** tests/unit/CommandExecutor.test.js
**Impact:** -15 failures
**Solution:**
- Update CommandExecutor constructor to accept logger from options
- Wrap MockLogger methods with jest.fn() in test setup
- Fix afterEach to clear mockLogger properly

### Quick Win 2: CommandExecutor Timeout Tests (Est. 10 min)
**Problem:** Tests timing out at 30000ms
**Files:** tests/unit/CommandExecutor.test.js
**Impact:** -1 failure (frees up time for other tests)
**Solution:**
- Add timeout parameter to timeout test cases
- Use jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000

### Quick Win 3: CommandExecutor History Property (Est. 10 min)
**Problem:** Missing command.status in command history
**Files:** code/WhatsAppBot/Handlers/CommandExecutor.js
**Impact:** -2 failures
**Solution:**
- Add status field to recordCommand method
- Include command.status in history records

### Quick Win 4: AdvancedMediaHandler Method Implementations (Est. 30 min)
**Problem:** 44 test stubs expecting real implementations
**Files:** code/WhatsAppBot/Handlers/AdvancedMediaHandler.js
**Impact:** -20 failures
**Solution:**
- Implement downloadMedia, uploadMedia methods
- Add image/video/audio/document processing stubs
- Add batch processing and caching methods

### Quick Win 5: ConversationIntelligenceEngine NLP Methods (Est. 20 min)
**Problem:** 15 test failures in sentiment analysis, entity extraction
**Files:** code/WhatsAppBot/Handlers/ConversationIntelligenceEngine.js
**Impact:** -10 failures
**Solution:**
- Fix sentiment analysis with proper scoring
- Fix entity extraction return type
- Test NLP model initialization

### Quick Win 6: MessageBatchProcessor Duration (Est. 5 min)
**Problem:** Duration tracking not implemented
**Files:** code/WhatsAppBot/Handlers/MessageBatchProcessor.js
**Impact:** -1 failure
**Solution:**
- Add processingDuration field to processBatch response
- Implement start/end time tracking

### Quick Win 7: bot-workflow E2E Tests (Est. 15 min)
**Problem:** 3 E2E failures in command help, sentiment analysis
**Files:** tests/e2e/bot-workflow.e2e.test.js
**Impact:** -3 failures
**Solution:**
- Fix command help test expectations
- Fix sentiment analysis expectations
- Add error recovery test stubs

---

## EXECUTION SEQUENCE
1. Start: CommandExecutor logger mocking (15 min) → target -15 failures
2. Continue: CommandExecutor timeout & history (20 min) → target -3 failures
3. Parallel: AdvancedMediaHandler (30 min) → target -20 failures
4. Parallel: ConversationIntelligenceEngine (20 min) → target -10 failures
5. Quick: MessageBatchProcessor (5 min) → target -1 failure
6. Final: E2E tests (15 min) → target -3 failures

**Estimated Timeline:** 95 min total (1.5 hour sprint)
**Expected Final:** 82-84% (640-655 tests passing)

---

## SUCCESS METRICS
- ✅ CommandExecutor: 30/44 passing (70%+)
- ✅ AdvancedMediaHandler: 20/64 passing
- ✅ ConversationIntelligenceEngine: 45+/60 passing
- ✅ MessageBatchProcessor: 25/26 passing
- ✅ bot-workflow E2E: 18/21 passing
- **Target: 640+ tests passing (81-82%)**

---

## TEST COMMAND MONITORING
```powershell
# Run all tests
npm test 2>&1 | iex "ForEach-Object { if ($_ -match 'Tests:.*passed') { $_ } }"

# Run specific test suite
npm test tests/unit/CommandExecutor.test.js

# Run E2E tests
npm test tests/e2e/bot-workflow.e2e.test.js
```

---

## STATUS: READY TO EXECUTE
Starting with Quick Win 1: CommandExecutor logger mocking...
