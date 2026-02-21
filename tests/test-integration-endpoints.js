/**
 * INTEGRATION TEST SUITE
 * Validates all 20+ REST API endpoints
 * 
 * Run with: node test-integration-endpoints.js
 * 
 * Make sure Express server is running first:
 * npm start
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api/v1/damac';

// Test counter
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const results = [];

// Color codes for terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${colors[color] || ''}${message}${colors.reset}`);
}

async function test(name, method, endpoint, body = null, expectedStatus = 200) {
  totalTests++;
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();

    if (response.status === expectedStatus) {
      passedTests++;
      log('green', `✅ ${name}`);
      results.push({ name, status: 'PASS' });
      return { success: true, data };
    } else {
      failedTests++;
      log('red', `❌ ${name} (Expected ${expectedStatus}, got ${response.status})`);
      results.push({ name, status: 'FAIL', error: `Status ${response.status}` });
      return { success: false, data };
    }
  } catch (error) {
    failedTests++;
    log('red', `❌ ${name} (${error.message})`);
    results.push({ name, status: 'FAIL', error: error.message });
    return { success: false, data: null };
  }
}

async function runTests() {
  log('bold', '\n╔════════════════════════════════════════════════════════════════╗');
  log('bold', '║         DAMAC HILLS 2 - REST API INTEGRATION TEST              ║');
  log('bold', '║                   Validating 20+ Endpoints                      ║');
  log('bold', '╚════════════════════════════════════════════════════════════════╝\n');

  // ============================================================
  // SYSTEM & HEALTH CHECKS
  // ============================================================
  log('blue', '📋 SYSTEM & HEALTH CHECKS');
  log('blue', '─────────────────────────────────────────────────────────────');
  
  await test('Health Check', 'GET', '/health', null, 200);
  await test('API Info', 'GET', '/info', null, 200);

  // ============================================================
  // OWNER ENDPOINTS
  // ============================================================
  log('blue', '\n📝 OWNER ENDPOINTS (11 endpoints)');
  log('blue', '─────────────────────────────────────────────────────────────');
  
  // Create owner
  const ownerResult = await test(
    'Create Owner',
    'POST',
    '/owners',
    {
      firstName: 'Test',
      lastName: 'Owner',
      primaryPhone: '+971501234567',
      email: 'test@example.com'
    },
    201
  );

  const ownerId = ownerResult.data?.data?.ownerId || 'OWNER-TEST-ID';

  // List owners
  await test('List Owners', 'GET', '/owners', null, 200);
  await test('List Owners (with pagination)', 'GET', '/owners?skip=0&limit=10', null, 200);
  await test('List Owners (filtered by status)', 'GET', '/owners?status=active', null, 200);

  // Get by ID
  await test('Get Owner by ID', 'GET', `/owners/${ownerId}`, null, 200);
  
  // Get by phone (if server accepts this)
  await test('Get Owner by Phone', 'GET', '/owners/phone/+971501234567', null, 200);
  
  // Get by email (if server accepts this)
  await test('Get Owner by Email', 'GET', '/owners/email/test@example.com', null, 200);

  // Search
  await test('Search Owners', 'GET', '/search/Test?limit=20', null, 200);

  // Update
  await test(
    'Update Owner',
    'PUT',
    `/owners/${ownerId}`,
    { email: 'updated@example.com' },
    200
  );

  // Verify
  await test(
    'Verify Owner',
    'POST',
    `/owners/${ownerId}/verify`,
    { method: 'document' },
    200
  );

  // Get properties
  await test('Get Owner Properties', 'GET', `/owners/${ownerId}/properties`, null, 200);

  // Get audit trail
  await test('Get Owner Audit Trail', 'GET', `/owners/${ownerId}/audit-trail`, null, 200);

  // ============================================================
  // CONTACT ENDPOINTS
  // ============================================================
  log('blue', '\n👥 CONTACT ENDPOINTS (5 endpoints)');
  log('blue', '─────────────────────────────────────────────────────────────');
  
  // Create contact
  const contactResult = await test(
    'Create Contact',
    'POST',
    '/contacts',
    {
      firstName: 'Test',
      lastName: 'Agent',
      primaryPhone: '+971505760057',
      contactType: 'agent',
      role: 'Sales Agent'
    },
    201
  );

  const contactId = contactResult.data?.data?._id || 'CONTACT-TEST-ID';

  // List contacts
  await test('List Contacts', 'GET', '/contacts', null, 200);
  await test('List Contacts (by type)', 'GET', '/contacts?type=agent', null, 200);

  // Get contact
  await test('Get Contact by ID', 'GET', `/contacts/${contactId}`, null, 200);

  // Update contact
  await test(
    'Update Contact',
    'PUT',
    `/contacts/${contactId}`,
    { role: 'Senior Agent' },
    200
  );

  // ============================================================
  // IMPORT & SYNC ENDPOINTS
  // ============================================================
  log('blue', '\n📥 IMPORT & SYNC ENDPOINTS (3 endpoints)');
  log('blue', '─────────────────────────────────────────────────────────────');
  
  await test(
    'Bulk Import Owners',
    'POST',
    '/import/owners',
    {
      data: [
        {
          firstName: 'Owner1',
          lastName: 'Name1',
          primaryPhone: '+971501111111',
          email: 'owner1@example.com'
        },
        {
          firstName: 'Owner2',
          lastName: 'Name2',
          primaryPhone: '+971502222222',
          email: 'owner2@example.com'
        }
      ]
    },
    200
  );

  await test(
    'Bulk Import Contacts',
    'POST',
    '/import/contacts',
    {
      data: [
        {
          firstName: 'Contact1',
          lastName: 'Name1',
          primaryPhone: '+971503333333',
          contactType: 'broker'
        }
      ]
    },
    200
  );

  await test(
    'Sync Owners',
    'POST',
    '/sync/owners',
    {
      data: [
        {
          firstName: 'SyncOwner',
          lastName: 'Test',
          primaryPhone: '+971504444444',
          email: 'sync@example.com'
        }
      ]
    },
    200
  );

  // ============================================================
  // ANALYTICS & DASHBOARD ENDPOINTS
  // ============================================================
  log('blue', '\n📊 ANALYTICS & DASHBOARD ENDPOINTS (7 endpoints)');
  log('blue', '─────────────────────────────────────────────────────────────');
  
  await test('Dashboard Overview', 'GET', '/analytics/dashboard', null, 200);
  await test('Owner Statistics', 'GET', '/analytics/owners', null, 200);
  await test('Contact Statistics', 'GET', '/analytics/contacts', null, 200);
  await test('Property Statistics', 'GET', '/analytics/properties', null, 200);
  await test('Data Quality Score', 'GET', '/analytics/quality', null, 200);
  await test('Recent Activity', 'GET', '/analytics/activity?limit=10', null, 200);
  await test('Migration Status', 'GET', '/analytics/status', null, 200);

  // ============================================================
  // CLEANUP (Optional)
  // ============================================================
  log('blue', '\n🗑️  CLEANUP (Optional)');
  log('blue', '─────────────────────────────────────────────────────────────');
  
  // Delete/Archive owner
  await test(
    'Archive Owner (Soft Delete)',
    'DELETE',
    `/owners/${ownerId}`,
    null,
    200
  );

  // Delete contact
  await test(
    'Delete Contact',
    'DELETE',
    `/contacts/${contactId}`,
    null,
    200
  );

  // ============================================================
  // SUMMARY REPORT
  // ============================================================
  log('bold', '\n╔════════════════════════════════════════════════════════════════╗');
  log('bold', '║                      TEST RESULTS SUMMARY                       ║');
  log('bold', '╚════════════════════════════════════════════════════════════════╝\n');

  log('bold', '📊 STATISTICS:');
  log('blue', `   Total Tests:   ${totalTests}`);
  log('green', `   Passed:        ${passedTests}`);
  log('red', `   Failed:        ${failedTests}`);
  log('yellow', `   Success Rate:  ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

  if (failedTests === 0) {
    log('bold', `🎉 ALL TESTS PASSED! REST API IS FULLY FUNCTIONAL! ✅\n`);
    log('green', '✅ INTEGRATION SETUP COMPLETE');
    log('green', '✅ All 20+ endpoints working');
    log('green', '✅ Ready to proceed with Data Migration\n');
    return true;
  } else {
    log('bold', `⚠️  ${failedTests} TESTS FAILED\n`);
    log('red', 'Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      log('red', `   ❌ ${r.name}${r.error ? ': ' + r.error : ''}`);
    });
    log('yellow', '\n⚠️  Please ensure Express server is running:');
    log('yellow', '   npm start\n');
    return false;
  }
}

// Run tests
runTests().then(success => {
  if (success) {
    log('green', '═════════════════════════════════════════════════════════════');
    log('green', '✅ NEXT STEP: Data Migration (Monday-Wednesday)');
    log('green', '═════════════════════════════════════════════════════════════\n');
    process.exit(0);
  } else {
    log('red', '═════════════════════════════════════════════════════════════');
    log('red', 'Fix the above issues and try again');
    log('red', '═════════════════════════════════════════════════════════════\n');
    process.exit(1);
  }
});
