/**
 * DAMAC API Test Suite
 * Comprehensive tests for all 35+ endpoints
 * Run with: npm test
 */

import DamacApiClient from '../bot/DamacApiClient.js';

/**
 * Test Configuration
 */
const TEST_CONFIG = {
  API_URL: 'http://localhost:3000/api',
  TIMEOUT: 10000,
  VERBOSE: true
};

/**
 * Test Framework
 */
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.errors = [];
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  DAMAC API Test Suite - Starting                      ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    for (const { name, fn } of this.tests) {
      try {
        await fn();
        this.passed++;
        console.log(`✅ ${name}`);
      } catch (error) {
        this.failed++;
        this.errors.push({ test: name, error: error.message });
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
      }
    }

    this.printSummary();
  }

  printSummary() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  Test Results                                          ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║ Passed: ${this.passed.toString().padEnd(49)}║`);
    console.log(`║ Failed: ${this.failed.toString().padEnd(49)}║`);
    console.log(`║ Total:  ${(this.passed + this.failed).toString().padEnd(49)}║`);
    console.log('╚════════════════════════════════════════════════════════╝\n');

    if (this.errors.length > 0) {
      console.log('Failed Tests:');
      this.errors.forEach(({ test, error }) => {
        console.log(`  ❌ ${test}: ${error}`);
      });
    }
  }
}

/**
 * Assertion Helpers
 */
const assert = {
  equal: (actual, expected, message) => {
    if (actual !== expected) {
      throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
  },

  ok: (value, message) => {
    if (!value) {
      throw new Error(message);
    }
  },

  exists: (value, message) => {
    if (!value) {
      throw new Error(`${message}: value does not exist`);
    }
  },

  hasProperty: (obj, prop, message) => {
    if (!(prop in obj)) {
      throw new Error(`${message}: property '${prop}' not found`);
    }
  },

  isArray: (value, message) => {
    if (!Array.isArray(value)) {
      throw new Error(`${message}: expected array`);
    }
  }
};

/**
 * Initialize API Client
 */
const api = new DamacApiClient(TEST_CONFIG.API_URL);
const runner = new TestRunner();

/**
 * Test Fixtures
 */
let testPersonId = null;
let testPropertyId = null;
let testTenancyId = null;
let testOwnershipId = null;
let testBuyingId = null;
let testAgentId = null;

/**
 * ==================== PEOPLE TESTS ====================
 */

runner.test('People: GET /api/people', async () => {
  const result = await api.getPeople(1, 5);
  assert.hasProperty(result, 'success', 'Response');
  assert.hasProperty(result, 'data', 'Data array');
  assert.isArray(result.data, 'Data');
});

runner.test('People: POST /api/people - Create', async () => {
  const data = {
    firstName: `Test_${Date.now()}`,
    lastName: 'User',
    email: `test${Date.now()}@example.com`,
    phone: '+971501234567',
    emiratesId: '123456789012345',
    nationality: 'AE'
  };
  const result = await api.createPerson(data);
  assert.hasProperty(result, 'data', 'Created data');
  assert.hasProperty(result.data, '_id', 'ID');
  testPersonId = result.data._id;
});

runner.test('People: GET /api/people/:id', async () => {
  if (!testPersonId) throw new Error('No test person ID');
  const result = await api.getPerson(testPersonId);
  assert.hasProperty(result, 'data', 'Data');
  assert.equal(result.data._id, testPersonId, 'ID match');
});

runner.test('People: PUT /api/people/:id - Update', async () => {
  if (!testPersonId) throw new Error('No test person ID');
  const result = await api.updatePerson(testPersonId, { phone: '+971509876543' });
  assert.hasProperty(result, 'data', 'Updated data');
});

/**
 * ==================== PROPERTY TESTS ====================
 */

runner.test('Properties: GET /api/properties', async () => {
  const result = await api.getProperties({ limit: 5 });
  assert.hasProperty(result, 'success', 'Response');
  assert.isArray(result.data, 'Data');
});

runner.test('Properties: POST /api/properties - Create', async () => {
  const data = {
    unitNumber: `TEST_${Date.now()}`,
    buildingNumber: 'B1',
    cluster: 'DAMAC Hills 2',
    propertyType: 'apartment',
    bedrooms: 2,
    bathrooms: 2,
    builtUpArea: 1500,
    carpetArea: 1200,
    priceAED: 750000,
    furnishing: 'semi-furnished',
    occupancyStatus: 'vacant',
    availabilityStatus: 'available',
    parking: 2,
    serviceCharge: 1200
  };
  const result = await api.createProperty(data);
  assert.hasProperty(result, 'data', 'Created data');
  assert.hasProperty(result.data, '_id', 'ID');
  testPropertyId = result.data._id;
});

runner.test('Properties: GET /api/properties/:id', async () => {
  if (!testPropertyId) throw new Error('No test property ID');
  const result = await api.getProperty(testPropertyId);
  assert.hasProperty(result, 'data', 'Data');
});

runner.test('Properties: GET /api/properties/cluster/:name', async () => {
  const result = await api.getPropertiesByCluster('DAMAC Hills 2');
  assert.isArray(result.data, 'Data');
});

/**
 * ==================== TENANCY TESTS ====================
 */

runner.test('Tenancies: GET /api/tenancies', async () => {
  const result = await api.getTenancies({ limit: 5 });
  assert.hasProperty(result, 'success', 'Response');
  assert.isArray(result.data, 'Data');
});

runner.test('Tenancies: POST /api/tenancies - Create', async () => {
  if (!testPropertyId || !testPersonId) throw new Error('Missing IDs');

  const data = {
    propertyId: testPropertyId,
    tenantId: testPersonId,
    landlordId: testPersonId,
    rentPerMonth: 5000,
    contractStartDate: new Date().toISOString().split('T')[0],
    contractExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active',
    chequeDetails: [{
      chequeNumber: '123456',
      amount: 5000,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending'
    }]
  };
  const result = await api.createTenancy(data);
  assert.hasProperty(result, 'data', 'Created data');
  assert.hasProperty(result.data, '_id', 'ID');
  testTenancyId = result.data._id;
});

runner.test('Tenancies: GET /api/tenancies/:id', async () => {
  if (!testTenancyId) throw new Error('No test tenancy ID');
  const result = await api.getTenancy(testTenancyId);
  assert.hasProperty(result, 'data', 'Data');
});

runner.test('Tenancies: GET /api/tenancies/tenant/:id', async () => {
  if (!testPersonId) throw new Error('No test person ID');
  const result = await api.getTenantProperties(testPersonId);
  assert.isArray(result.data, 'Data');
});

/**
 * ==================== OWNERSHIP TESTS ====================
 */

runner.test('Ownerships: GET /api/ownerships', async () => {
  const result = await api.getOwnerships({ limit: 5 });
  assert.hasProperty(result, 'success', 'Response');
  assert.isArray(result.data, 'Data');
});

runner.test('Ownerships: POST /api/ownerships - Create', async () => {
  if (!testPropertyId || !testPersonId) throw new Error('Missing IDs');

  const data = {
    propertyId: testPropertyId,
    ownerId: testPersonId,
    ownershipPercentage: 100,
    acquisitionDate: new Date().toISOString().split('T')[0],
    acquisitionPrice: 700000,
    currentValue: 750000
  };
  const result = await api.createOwnership(data);
  assert.hasProperty(result, 'data', 'Created data');
  testOwnershipId = result.data._id;
});

runner.test('Ownerships: GET /api/ownerships/:id', async () => {
  if (!testOwnershipId) throw new Error('No test ownership ID');
  const result = await api.getOwnership(testOwnershipId);
  assert.hasProperty(result, 'data', 'Data');
});

/**
 * ==================== BUYING TESTS ====================
 */

runner.test('Buying: GET /api/buying', async () => {
  const result = await api.getBuying({ limit: 5 });
  assert.hasProperty(result, 'success', 'Response');
  assert.isArray(result.data, 'Data');
});

runner.test('Buying: POST /api/buying - Create', async () => {
  if (!testPropertyId || !testPersonId) throw new Error('Missing IDs');

  const data = {
    propertyId: testPropertyId,
    buyerId: testPersonId,
    inquiryDate: new Date().toISOString().split('T')[0],
    offeredPrice: 700000,
    status: 'interested',
    financingRequired: true
  };
  const result = await api.createBuyingInquiry(data);
  assert.hasProperty(result, 'data', 'Created data');
  testBuyingId = result.data._id;
});

runner.test('Buying: GET /api/buying/property/:id', async () => {
  if (!testPropertyId) throw new Error('No test property ID');
  const result = await api.getPropertyInquiries(testPropertyId);
  assert.isArray(result.data, 'Data');
});

/**
 * ==================== AGENT TESTS ====================
 */

runner.test('Agents: GET /api/agents', async () => {
  const result = await api.getAgents({ limit: 5 });
  assert.hasProperty(result, 'success', 'Response');
  assert.isArray(result.data, 'Data');
});

runner.test('Agents: POST /api/agents - Create', async () => {
  if (!testPropertyId || !testPersonId) throw new Error('Missing IDs');

  const data = {
    propertyId: testPropertyId,
    agentId: testPersonId,
    commissionPercentage: 2.5,
    assignmentDate: new Date().toISOString().split('T')[0]
  };
  const result = await api.createAgent(data);
  assert.hasProperty(result, 'data', 'Created data');
  testAgentId = result.data._id;
});

runner.test('Agents: GET /api/agents/property/:id', async () => {
  if (!testPropertyId) throw new Error('No test property ID');
  const result = await api.getPropertyAgents(testPropertyId);
  assert.isArray(result.data, 'Data');
});

/**
 * ==================== CLEANUP TESTS ====================
 */

runner.test('Cleanup: DELETE /api/agents/:id', async () => {
  if (!testAgentId) throw new Error('No test agent ID');
  await api.deleteAgent(testAgentId);
});

runner.test('Cleanup: DELETE /api/buying/:id', async () => {
  if (!testBuyingId) throw new Error('No test buying ID');
  await api.deleteBuyingInquiry(testBuyingId);
});

runner.test('Cleanup: DELETE /api/ownerships/:id', async () => {
  if (!testOwnershipId) throw new Error('No test ownership ID');
  await api.deleteOwnership(testOwnershipId);
});

runner.test('Cleanup: DELETE /api/tenancies/:id', async () => {
  if (!testTenancyId) throw new Error('No test tenancy ID');
  await api.deleteTenancy(testTenancyId);
});

runner.test('Cleanup: DELETE /api/properties/:id', async () => {
  if (!testPropertyId) throw new Error('No test property ID');
  await api.deleteProperty(testPropertyId);
});

runner.test('Cleanup: DELETE /api/people/:id', async () => {
  if (!testPersonId) throw new Error('No test person ID');
  await api.deletePerson(testPersonId);
});

/**
 * ==================== RUN TESTS ====================
 */

runner.run().then(() => {
  process.exit(runner.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
