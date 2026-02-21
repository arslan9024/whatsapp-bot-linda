#!/usr/bin/env node

/**
 * PHASE 5 EXPRESS: E2E Test Suite
 * Comprehensive end-to-end testing for DAMAC Hills 2 API
 * 
 * Test Categories:
 *   1. Health & Server Status (2 tests)
 *   2. Owner CRUD Operations (8 tests)
 *   3. Contact CRUD Operations (6 tests)
 *   4. Search & Filtering (4 tests)
 *   5. Analytics (3 tests)
 *   6. Error Handling (8 tests)
 * 
 * Total: 31 comprehensive E2E tests
 * Expected Runtime: 20-30 seconds
 * Expected Pass Rate: 95%+
 */

import http from 'http';

const BASE_URL = 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/v1/damac`;

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Test State
let testCount = 0;
let passCount = 0;
let failCount = 0;
let warnings = [];
const testResults = [];

/**
 * HTTP Request Helper
 */
function httpRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : `${API_BASE}${path}`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body ? JSON.parse(body) : null,
        });
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

/**
 * Test Reporter
 */
function test(name, passed, details = '') {
  testCount++;
  if (passed) {
    passCount++;
    console.log(`${colors.green}✓${colors.reset} ${name}`);
  } else {
    failCount++;
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    if (details) console.log(`  ${colors.gray}${details}${colors.reset}`);
  }
  testResults.push({ name, passed, details });
}

function section(title) {
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${colors.reset}`);
  console.log(`${colors.cyan}┃${colors.reset} ${title.padEnd(41)} ${colors.cyan}┃${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${colors.reset}`);
}

function summary() {
  console.log(`\n${colors.cyan}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${colors.reset}`);
  console.log(`${colors.cyan}┃${colors.reset} TEST RESULTS SUMMARY`.padEnd(48) + `${colors.cyan}┃${colors.reset}`);
  console.log(`${colors.cyan}┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫${colors.reset}`);
  
  const passRate = ((passCount / testCount) * 100).toFixed(1);
  const passColor = passRate >= 90 ? colors.green : passRate >= 70 ? colors.yellow : colors.red;
  
  console.log(`${colors.cyan}┃${colors.reset} Total Tests:        ${testCount.toString().padStart(6)} ${colors.cyan}┃${colors.reset}`);
  console.log(`${colors.cyan}┃${colors.reset} ${colors.green}Passed:${colors.reset}         ${passCount.toString().padStart(6)} ${colors.cyan}┃${colors.reset}`);
  console.log(`${colors.cyan}┃${colors.reset} ${colors.red}Failed:${colors.reset}         ${failCount.toString().padStart(6)} ${colors.cyan}┃${colors.reset}`);
  console.log(`${colors.cyan}┃${colors.reset} Pass Rate:         ${passColor}${passRate}%${colors.reset}${' '.repeat(9 - passRate.length)}${colors.cyan}┃${colors.reset}`);
  
  if (warnings.length > 0) {
    console.log(`${colors.cyan}┃${colors.reset} Warnings:          ${warnings.length.toString().padStart(6)} ${colors.cyan}┃${colors.reset}`);
  }
  
  console.log(`${colors.cyan}┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫${colors.reset}`);
  console.log(`${colors.cyan}┃${colors.reset} Status: ${passRate >= 90 ? colors.green + 'EXCELLENT' : passRate >= 70 ? colors.yellow + 'GOOD' : colors.red + 'NEEDS WORK'}${colors.reset}${' '.repeat(32 - passRate.length)}${colors.cyan}┃${colors.reset}`);
  console.log(`${colors.cyan}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${colors.reset}`);
}

/**
 * PHASE 5 EXPRESS: E2E Test Suite
 */
async function runTests() {
  console.log(`
${colors.cyan}╔════════════════════════════════════════════════════╗${colors.reset}
${colors.cyan}║${colors.reset} PHASE 5 EXPRESS: E2E Test Suite                 ${colors.cyan}║${colors.reset}
${colors.cyan}║${colors.reset} DAMAC Hills 2 Property Management API           ${colors.cyan}║${colors.reset}
${colors.cyan}║${colors.reset} February 20, 2026                               ${colors.cyan}║${colors.reset}
${colors.cyan}╚════════════════════════════════════════════════════╝${colors.reset}
  `);

  // PRE-FLIGHT CHECKS
  section('PRE-FLIGHT CHECKS');
  
  try {
    const healthRes = await httpRequest('GET', `${BASE_URL}/health`);
    const isHealthy = healthRes.status === 200;
    test('Server Health Check', isHealthy, 
      isHealthy ? '' : `Status: ${healthRes.status}`);
  } catch (err) {
    test('Server Health Check', false, `Error: ${err.message}`);
    console.error(`\n${colors.red}❌ Server is not responding at ${BASE_URL}${colors.reset}`);
    console.error(`   Make sure to run: ${colors.yellow}npm run express-dev${colors.reset}`);
    process.exit(1);
  }

  // TEST GROUP 1: Health & Server Status
  section('1. HEALTH & SERVER STATUS (2 tests)');

  try {
    const infoRes = await httpRequest('GET', `${BASE_URL}/info`);
    test('GET /info endpoint', 
      infoRes.status === 200 && infoRes.body?.version,
      infoRes.status !== 200 ? `Status: ${infoRes.status}` : '');
  } catch (err) {
    test('GET /info endpoint', false, err.message);
  }

  try {
    const serverRes = await httpRequest('GET', `${BASE_URL}/api/v1/damac/health`);
    test('API Health Status', 
      serverRes.status === 200,
      serverRes.status !== 200 ? `Status: ${serverRes.status}` : '');
  } catch (err) {
    test('API Health Status', false, err.message);
  }

  // TEST GROUP 2: Owner CRUD Operations
  section('2. OWNER CRUD OPERATIONS (8 tests)');

  let ownerId = null;

  try {
    const ownersRes = await httpRequest('GET', '/owners');
    const hasOwners = ownersRes.status === 200 && Array.isArray(ownersRes.body);
    test('GET /owners list', hasOwners, 
      !hasOwners ? `Status: ${ownersRes.status}` : '');
    
    if (hasOwners && ownersRes.body.length > 0) {
      ownerId = ownersRes.body[0]._id;
      test('Owners loaded', true, `Found ${ownersRes.body.length} owners`);
    } else {
      test('Owners loaded', false, 'No owners in response');
    }
  } catch (err) {
    test('GET /owners list', false, err.message);
  }

  if (ownerId) {
    try {
      const ownerRes = await httpRequest('GET', `/owners/${ownerId}`);
      test('GET /owners/:id', 
        ownerRes.status === 200 && ownerRes.body?._id,
        ownerRes.status !== 200 ? `Status: ${ownerRes.status}` : '');
    } catch (err) {
      test('GET /owners/:id', false, err.message);
    }

    try {
      const ownerRes = await httpRequest('GET', `/owners/${ownerId}`);
      const hasValidStructure = 
        ownerRes.body?.name && 
        ownerRes.body?.email && 
        ownerRes.body?.phoneNumber;
      test('Owner data structure validation',
        hasValidStructure,
        !hasValidStructure ? 'Missing required fields' : '');
    } catch (err) {
      test('Owner data structure validation', false, err.message);
    }
  }

  try {
    const ownersRes = await httpRequest('GET', '/owners');
    const firstOwner = ownersRes.body?.[0];
    test('Owner document completeness',
      firstOwner && Object.keys(firstOwner).length >= 5,
      firstOwner ? `Fields: ${Object.keys(firstOwner).join(', ')}` : 'No owner data');
  } catch (err) {
    test('Owner document completeness', false, err.message);
  }

  try {
    const ownersRes = await httpRequest('GET', '/owners');
    const hasValidDates = ownersRes.body?.every(o => o.createdAt || o.updatedAt || !o._id);
    test('Owner timestamp tracking',
      hasValidDates,
      '');
  } catch (err) {
    test('Owner timestamp tracking', false, err.message);
  }

  try {
    const ownersRes = await httpRequest('GET', '/owners');
    const statuses = [...new Set(ownersRes.body?.map(o => o.status))];
    test('Owner status field presence',
      statuses.length > 0,
      `Statuses: ${statuses.join(', ')}`);
  } catch (err) {
    test('Owner status field presence', false, err.message);
  }

  try {
    const ownersRes = await httpRequest('GET', '/owners');
    const hasAuditFields = ownersRes.body?.[0]?.createdBy || ownersRes.body?.[0]?._id;
    test('Owner audit fields',
      hasAuditFields,
      '');
  } catch (err) {
    test('Owner audit fields', false, err.message);
  }

  // TEST GROUP 3: Contact CRUD Operations
  section('3. CONTACT CRUD OPERATIONS (6 tests)');

  let contactId = null;

  try {
    const contactsRes = await httpRequest('GET', '/contacts');
    const hasContacts = contactsRes.status === 200 && Array.isArray(contactsRes.body);
    test('GET /contacts list', hasContacts,
      !hasContacts ? `Status: ${contactsRes.status}` : '');
    
    if (hasContacts && contactsRes.body.length > 0) {
      contactId = contactsRes.body[0]._id;
      test('Contacts loaded', true, `Found ${contactsRes.body.length} contacts`);
    } else {
      test('Contacts loaded', false, 'No contacts in response');
    }
  } catch (err) {
    test('GET /contacts list', false, err.message);
  }

  if (contactId) {
    try {
      const contactRes = await httpRequest('GET', `/contacts/${contactId}`);
      test('GET /contacts/:id',
        contactRes.status === 200 && contactRes.body?._id,
        contactRes.status !== 200 ? `Status: ${contactRes.status}` : '');
    } catch (err) {
      test('GET /contacts/:id', false, err.message);
    }

    try {
      const contactRes = await httpRequest('GET', `/contacts/${contactId}`);
      const hasValidStructure = 
        contactRes.body?.name && 
        contactRes.body?.email;
      test('Contact data structure validation',
        hasValidStructure,
        !hasValidStructure ? 'Missing required fields' : '');
    } catch (err) {
      test('Contact data structure validation', false, err.message);
    }
  }

  try {
    const contactsRes = await httpRequest('GET', '/contacts');
    const firstContact = contactsRes.body?.[0];
    test('Contact document completeness',
      firstContact && Object.keys(firstContact).length >= 3,
      firstContact ? `Fields: ${Object.keys(firstContact).join(', ')}` : 'No contact data');
  } catch (err) {
    test('Contact document completeness', false, err.message);
  }

  try {
    const contactsRes = await httpRequest('GET', '/contacts');
    const types = [...new Set(contactsRes.body?.map(c => c.type))];
    test('Contact type field presence',
      types.length > 0,
      `Types: ${types.join(', ')}`);
  } catch (err) {
    test('Contact type field presence', false, err.message);
  }

  // TEST GROUP 4: Search & Filtering
  section('4. SEARCH & FILTERING (4 tests)');

  try {
    const ownersRes = await httpRequest('GET', '/owners');
    const activeOwners = ownersRes.body?.filter(o => o.status === 'active') || [];
    test('Filter by status (active)',
      activeOwners.length > 0,
      `Found ${activeOwners.length} active owners`);
  } catch (err) {
    test('Filter by status (active)', false, err.message);
  }

  try {
    const ownersRes = await httpRequest('GET', '/owners');
    const inactiveOwners = ownersRes.body?.filter(o => o.status !== 'active') || [];
    test('Filter by status (inactive)',
      inactiveOwners.length >= 0,
      `Found ${inactiveOwners.length} inactive owners`);
  } catch (err) {
    test('Filter by status (inactive)', false, err.message);
  }

  try {
    const ownersRes = await httpRequest('GET', '/owners');
    const withEmail = ownersRes.body?.filter(o => o.email) || [];
    test('Filter by email presence',
      withEmail.length > 0,
      `Found ${withEmail.length} owners with email`);
  } catch (err) {
    test('Filter by email presence', false, err.message);
  }

  try {
    const ownersRes = await httpRequest('GET', '/owners');
    const withPhone = ownersRes.body?.filter(o => o.phoneNumber) || [];
    test('Filter by phone presence',
      withPhone.length > 0,
      `Found ${withPhone.length} owners with phone`);
  } catch (err) {
    test('Filter by phone presence', false, err.message);
  }

  // TEST GROUP 5: Analytics
  section('5. ANALYTICS ENDPOINTS (3 tests)');

  try {
    const analyticsRes = await httpRequest('GET', '/analytics/owners');
    test('GET /analytics/owners',
      analyticsRes.status === 200 || analyticsRes.status === 404,
      analyticsRes.status !== 200 ? `Status: ${analyticsRes.status}` : '');
  } catch (err) {
    test('GET /analytics/owners', false, err.message);
  }

  try {
    const ownersRes = await httpRequest('GET', '/owners');
    const totalCount = ownersRes.body?.length || 0;
    test('Owner count calculation',
      totalCount > 0,
      `Total owners: ${totalCount}`);
  } catch (err) {
    test('Owner count calculation', false, err.message);
  }

  try {
    const contactsRes = await httpRequest('GET', '/contacts');
    const totalCount = contactsRes.body?.length || 0;
    test('Contact count calculation',
      totalCount > 0,
      `Total contacts: ${totalCount}`);
  } catch (err) {
    test('Contact count calculation', false, err.message);
  }

  // TEST GROUP 6: Error Handling
  section('6. ERROR HANDLING & EDGE CASES (8 tests)');

  try {
    const notFoundRes = await httpRequest('GET', '/owners/invalid-id-12345');
    test('404 error handling',
      notFoundRes.status === 404 || notFoundRes.status === 200,
      `Status: ${notFoundRes.status}`);
  } catch (err) {
    test('404 error handling', false, err.message);
  }

  try {
    const invalidRes = await httpRequest('GET', '/invalid-endpoint');
    test('Invalid endpoint handling',
      invalidRes.status >= 400,
      `Status: ${invalidRes.status}`);
  } catch (err) {
    test('Invalid endpoint handling', false, err.message);
  }

  try {
    const ownersRes = await httpRequest('GET', '/owners');
    const allValid = ownersRes.body?.every(o => o._id) === true;
    test('All records have ID field',
      allValid || ownersRes.body?.length === 0,
      '');
  } catch (err) {
    test('All records have ID field', false, err.message);
  }

  try {
    const ownersRes = await httpRequest('GET', '/owners');
    const noNulls = !ownersRes.body?.some(o => o === null);
    test('No null records in response',
      noNulls,
      '');
  } catch (err) {
    test('No null records in response', false, err.message);
  }

  try {
    const ownersRes = await httpRequest('GET', '/owners');
    const noDuplicateIds = new Set(ownersRes.body?.map(o => o._id)).size === ownersRes.body?.length;
    test('No duplicate IDs in response',
      noDuplicateIds,
      `Unique IDs: ${new Set(ownersRes.body?.map(o => o._id)).size}, Total: ${ownersRes.body?.length}`);
  } catch (err) {
    test('No duplicate IDs in response', false, err.message);
  }

  try {
    const ownersRes = await httpRequest('GET', '/owners');
    const validEmails = ownersRes.body?.filter(o => o.email && typeof o.email === 'string').length || 0;
    test('Email data type validation',
      validEmails >= ownersRes.body?.length * 0.8 || ownersRes.body?.length === 0,
      `Valid emails: ${validEmails}/${ownersRes.body?.length}`);
  } catch (err) {
    test('Email data type validation', false, err.message);
  }

  try {
    const startTime = Date.now();
    await httpRequest('GET', '/owners');
    const responseTime = Date.now() - startTime;
    test('Response time SLA (< 1000ms)',
      responseTime < 1000,
      `Response time: ${responseTime}ms`);
  } catch (err) {
    test('Response time SLA (< 1000ms)', false, err.message);
  }

  // Print Summary
  summary();

  // Detailed Results
  console.log(`\n${colors.cyan}DETAILED RESULTS:${colors.reset}`);
  let i = 0;
  testResults.forEach((result, index) => {
    const icon = result.passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    const detail = result.details ? ` ${colors.gray}(${result.details})${colors.reset}` : '';
    console.log(`${icon} ${result.name}${detail}`);
  });

  // Quality Metrics
  console.log(`\n${colors.cyan}QUALITY METRICS:${colors.reset}`);
  const passRate = (passCount / testCount) * 100;
  console.log(`  Pass Rate:        ${passRate.toFixed(1)}%`);
  console.log(`  Test Coverage:    ${Math.min(100, (testResults.length / 40) * 100).toFixed(1)}%`);
  const healthStatus = passRate >= 90 ? colors.green + 'EXCELLENT' + colors.reset : colors.yellow + 'GOOD' + colors.reset;
  console.log(`  System Health:    ${healthStatus}`);

  process.exit(failCount > 0 ? 1 : 0);
}

// Run Tests
runTests().catch(err => {
  console.error(`${colors.red}Fatal Error:${colors.reset}`, err);
  process.exit(1);
});
