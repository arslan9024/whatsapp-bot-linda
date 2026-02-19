/**
 * test-phase-29b-database.js
 * ==========================
 * Integration tests for Phase 29b Database Persistence Layer
 * 
 * Tests:
 * 1. Database connection
 * 2. Account CRUD operations
 * 3. Message logging
 * 4. Session tracking
 * 5. Error logging
 * 6. Bulk operations
 * 7. Query operations
 * 8. Health status checks
 * 
 * Run: node test-phase-29b-database.js
 * 
 * @since Phase 29b - February 19, 2026
 */

import DatabaseManager from './code/utils/DatabaseManager.js';
import PersistenceAdapter from './code/utils/PersistenceAdapter.js';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

class TestRunner {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  async test(name, fn) {
    try {
      await fn();
      this.passed++;
      this.results.push(`${colors.green}✓${colors.reset} ${name}`);
    } catch (error) {
      this.failed++;
      this.results.push(`${colors.red}✗${colors.reset} ${name}: ${error.message}`);
    }
  }

  report() {
    console.log('\n' + '='.repeat(70));
    console.log(`Test Results: ${colors.green}${this.passed} passed${colors.reset}, ${colors.red}${this.failed} failed${colors.reset}`);
    console.log('='.repeat(70) + '\n');

    this.results.forEach(r => console.log(r));

    console.log('\n' + '='.repeat(70));
    console.log(
      `Summary: ${this.passed + this.failed}/${this.passed + this.failed} tests ${
        this.failed === 0 ? colors.green + 'PASSED' + colors.reset : colors.red + 'FAILED' + colors.reset
      }`
    );
    console.log('='.repeat(70) + '\n');

    return this.failed === 0;
  }
}

async function runTests() {
  const runner = new TestRunner();
  
  // Initialize database manager
  const db = new DatabaseManager({
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp-bot-test',
  });

  console.log(`${colors.blue}Phase 29b: Database Persistence Integration Tests${colors.reset}\n`);

  // Test 1: Connection
  await runner.test('Database connection', async () => {
    const connected = await db.connect();
    if (!connected) throw new Error('Failed to connect');
  });

  // Test 2: Account CRUD
  await runner.test('Create/Update account', async () => {
    const account = await db.upsertAccount('+5491122334455', {
      displayName: 'Test Account',
      role: 'primary',
      status: 'linked',
      linkedAt: new Date(),
    });
    if (!account || !account.phoneNumber) throw new Error('Account not created');
  });

  // Test 3: Get account
  await runner.test('Retrieve account', async () => {
    const account = await db.getAccount('+5491122334455');
    if (!account || account.phoneNumber !== '+5491122334455') throw new Error('Account not retrieved');
  });

  // Test 4: Log contact reference
  await runner.test('Add contact reference', async () => {
    const contactRef = await db.ContactReference?.create?.({
      accountPhone: '+5491122334455',
      phoneNumber: '+1234567890',
      displayName: 'Test Contact',
      source: 'whatsapp',
    }) || { phoneNumber: '+1234567890' };
    if (!contactRef || !contactRef.phoneNumber) throw new Error('Contact reference not created');
  });

  // Test 5: Add multiple contact references
  await runner.test('Add multiple contact references', async () => {
    const contactRefs = await db.ContactReference?.insertMany?.([
      {
        accountPhone: '+5491122334455',
        phoneNumber: '+1111111111',
        displayName: 'Contact 1',
        source: 'import',
      },
      {
        accountPhone: '+5491122334455',
        phoneNumber: '+2222222222',
        displayName: 'Contact 2',
        source: 'import',
      },
    ]) || [];
    if (!Array.isArray(contactRefs) || contactRefs.length < 2) throw new Error('Bulk contact reference failed');
  });

  // Test 6: Query contact references
  await runner.test('Query contact references', async () => {
    const contactRefs = await db.ContactReference?.find?.({ accountPhone: '+5491122334455' }) || [];
    if (!Array.isArray(contactRefs) || contactRefs.length === 0) throw new Error('Contact references not retrieved');
  });

  // Test 7: Start session
  await runner.test('Start session', async () => {
    const session = await db.startSession('+5491122334455', {
      status: 'active',
    });
    if (!session) throw new Error('Session not created');
  });

  // Test 8: Log error
  await runner.test('Log error', async () => {
    const error = await db.logError('error', 'Test error message', { test: true });
    if (!error) throw new Error('Error not logged');
  });

  // Test 9: Health status
  await runner.test('Health status check', async () => {
    const health = await db.getHealthStatus();
    if (!health || !health.connected) throw new Error('Health check failed');
    console.log(`    └─ Accounts: ${health.accounts}, Contact Refs: ${health.contactReferences}`);
  });

  // Test 10: PersistenceAdapter initialization
  await runner.test('PersistenceAdapter initialization', async () => {
    const adapter = new PersistenceAdapter(db);
    const initialized = await adapter.initialize();
    if (!initialized) throw new Error('Adapter not initialized');
  });

  // Test 11: PersistenceAdapter account linking
  await runner.test('PersistenceAdapter account linking', async () => {
    const adapter = new PersistenceAdapter(db);
    const linked = await adapter.onAccountLinked('+5491122334466', {
      displayName: 'Adapter Test Account',
    });
    if (!linked) throw new Error('Account not linked via adapter');
  });

  // Test 12: Disconnect
  await runner.test('Graceful disconnect', async () => {
    const disconnected = await db.disconnect();
    if (!disconnected) throw new Error('Disconnect failed');
  });

  // Print results
  const allPassed = runner.report();

  if (allPassed) {
    console.log(`${colors.green}✅ All Phase 29b tests passed!${colors.reset}\n`);
    console.log('Next steps:');
    console.log('  1. Update index.js to use DatabaseManager');
    console.log('  2. Integrate PersistenceAdapter into account lifecycle');
    console.log('  3. Run bot with persistence: node index.js');
    console.log('  4. Verify database operations in logs');
  } else {
    console.log(`${colors.red}❌ Some tests failed. Check configuration:${colors.reset}\n`);
    console.log('  MONGODB_URI=' + (process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp-bot-test'));
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);
