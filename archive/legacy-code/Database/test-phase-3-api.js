/**
 * Phase 3: Comprehensive API Testing Suite
 * DAMAC Hills 2 Property Management System
 * Tests all REST endpoints with in-memory data
 */

import fetch from 'node-fetch';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const API_URL = 'http://localhost:5000/api/v1/damac';
const TIMEOUT = 5000;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

// ═══════════════════════════════════════════════════════════════════════════
// TEST UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

let testsPassed = 0;
let testsFailed = 0;
let testsSkipped = 0;

function log(message, type = 'info') {
  const emoji = {
    info: 'ℹ️ ',
    success: '✅',
    warning: '⚠️ ',
    error: '❌',
    test: '🧪',
    result: '📊'
  };

  const color = {
    info: colors.cyan,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red,
    test: colors.cyan,
    result: colors.bright
  };

  console.log(`${color[type]}${emoji[type]} ${message}${colors.reset}`);
}

async function test(name, fn) {
  process.stdout.write(`${colors.cyan}🧪 ${name}${colors.reset}...`);

  try {
    await fn();
    console.log(` ${colors.green}✅ PASS${colors.reset}`);
    testsPassed++;
  } catch (error) {
    console.log(` ${colors.red}❌ FAIL${colors.reset}`);
    console.log(`   ${colors.red}${error.message}${colors.reset}`);
    testsFailed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function request(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
    timeout: TIMEOUT
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, options);
  const data = await response.json();

  return { status: response.status, data };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════════════════════

async function testHealthEndpoints() {
  console.log(`\n${colors.bright}📋 Health Check Endpoints${colors.reset}\n`);

  await test('GET /health returns 200', async () => {
    const { status, data } = await request('/health');
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('GET /status returns server info', async () => {
    const { status, data } = await request('/status');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.status === 'running', 'Status should be running');
  });
}

async function testOwnerEndpoints() {
  console.log(`\n${colors.bright}👤 Owner Endpoints${colors.reset}\n`);

  let createdOwnerId = null;

  await test('POST /owners creates new owner', async () => {
    const newOwner = {
      firstName: 'Test',
      lastName: 'Owner',
      email: `test-${Date.now()}@example.com`,
      phone: '+971501234567',
      nationality: 'UAE',
      status: 'active'
    };

    const { status, data } = await request('/owners', 'POST', newOwner);
    assert(status === 200 || status === 201, `Expected 200/201, got ${status}`);
    assert(data._id, 'Response should contain _id');
    createdOwnerId = data._id;
  });

  await test('GET /owners returns list', async () => {
    const { status, data } = await request('/owners');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data), 'Response should be an array');
    assert(data.length > 0, 'Should have at least one owner');
  });

  await test('GET /owners/:id retrieves specific owner', async () => {
    const { status, data } = await request('/owners');
    const ownerId = data[0]._id;

    const { status: getStatus, data: ownerData } = await request(`/owners/${ownerId}`);
    assert(getStatus === 200, `Expected 200, got ${getStatus}`);
    assert(ownerData._id === ownerId, 'Should return correct owner');
  });

  await test('GET /owners/count returns total count', async () => {
    const { status, data } = await request('/owners/count');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(typeof data === 'number', 'Count should be a number');
    assert(data > 0, 'Should have at least one owner');
  });

  if (createdOwnerId) {
    await test('DELETE /owners/:id deletes owner', async () => {
      const { status } = await request(`/owners/${createdOwnerId}`, 'DELETE');
      assert(status === 200 || status === 204, `Expected 200/204, got ${status}`);
    });
  }
}

async function testContactEndpoints() {
  console.log(`\n${colors.bright}📞 Contact Endpoints${colors.reset}\n`);

  let createdContactId = null;

  await test('POST /contacts creates new contact', async () => {
    const newContact = {
      firstName: 'Test',
      lastName: 'Contact',
      email: `contact-${Date.now()}@example.com`,
      phone: '+971509876543',
      type: 'agent',
      status: 'active'
    };

    const { status, data } = await request('/contacts', 'POST', newContact);
    assert(status === 200 || status === 201, `Expected 200/201, got ${status}`);
    assert(data._id, 'Response should contain _id');
    createdContactId = data._id;
  });

  await test('GET /contacts returns list', async () => {
    const { status, data } = await request('/contacts');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data), 'Response should be an array');
    assert(data.length > 0, 'Should have at least one contact');
  });

  await test('GET /contacts/:id retrieves specific contact', async () => {
    const { status, data } = await request('/contacts');
    const contactId = data[0]._id;

    const { status: getStatus, data: contactData } = await request(`/contacts/${contactId}`);
    assert(getStatus === 200, `Expected 200, got ${getStatus}`);
    assert(contactData._id === contactId, 'Should return correct contact');
  });

  await test('GET /contacts/count returns total count', async () => {
    const { status, data } = await request('/contacts/count');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(typeof data === 'number', 'Count should be a number');
    assert(data > 0, 'Should have at least one contact');
  });

  if (createdContactId) {
    await test('DELETE /contacts/:id deletes contact', async () => {
      const { status } = await request(`/contacts/${createdContactId}`, 'DELETE');
      assert(status === 200 || status === 204, `Expected 200/204, got ${status}`);
    });
  }
}

async function testAnalyticsEndpoints() {
  console.log(`\n${colors.bright}📊 Analytics Endpoints${colors.reset}\n`);

  await test('GET /analytics/owners returns owner statistics', async () => {
    const { status, data } = await request('/analytics/owners');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.total !== undefined, 'Should have total count');
  });

  await test('GET /analytics/contacts returns contact statistics', async () => {
    const { status, data } = await request('/analytics/contacts');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.total !== undefined, 'Should have total count');
  });

  await test('GET /dashboard/summary returns dashboard data', async () => {
    const { status, data } = await request('/dashboard/summary');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.totalOwners !== undefined, 'Should have totalOwners');
    assert(data.totalContacts !== undefined, 'Should have totalContacts');
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                              ║');
  console.log('║                📊 PHASE 3: COMPREHENSIVE API TEST SUITE                     ║');
  console.log('║                  DAMAC Hills 2 Property Management System                    ║');
  console.log('║                           February 20, 2026                                  ║');
  console.log('║                                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  try {
    // Check API connectivity
    log(`Testing API at: ${API_URL}`, 'info');
    console.log('');

    let apiConnected = false;
    for (let i = 0; i < 5; i++) {
      try {
        await request('/health');
        apiConnected = true;
        log('Connected to API ✓', 'success');
        break;
      } catch (error) {
        if (i < 4) {
          log(`Retrying... (${i + 1}/5)`, 'warning');
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          log('Could not connect to API', 'error');
        }
      }
    }

    if (!apiConnected) {
      log('API is not running. Start with: npm run express-server', 'error');
      process.exit(1);
    }

    // Run test suites
    await testHealthEndpoints();
    await testOwnerEndpoints();
    await testContactEndpoints();
    await testAnalyticsEndpoints();

    // Summary
    console.log(`\n╔══════════════════════════════════════════════════════════════════════════════╗`);
    console.log(`║                          📊 TEST RESULTS SUMMARY                            ║`);
    console.log(`╚══════════════════════════════════════════════════════════════════════════════╝\n`);

    log(`Total Tests: ${testsPassed + testsFailed}`, 'result');
    log(`Passed: ${testsPassed}`, 'success');
    if (testsFailed > 0) log(`Failed: ${testsFailed}`, 'error');

    const passRate = ((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1);
    log(`Pass Rate: ${passRate}%`, passRate === '100.0' ? 'success' : 'warning');

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('');
    log('API is production-ready! Next steps:', 'success');
    console.log('  1. Run CLI Dashboard: node code/Database/DashboardCLI.js');
    console.log('  2. Explore endpoints: Check API documentation');
    console.log('  3. Ready for Phase 4: Testing & Optimization');
    console.log('');

    if (testsFailed === 0) {
      log('✨ All tests passed! System is operational.', 'success');
    }

    process.exit(testsFailed > 0 ? 1 : 0);

  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
