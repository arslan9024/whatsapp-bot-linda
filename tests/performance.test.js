/**
 * DAMAC API Performance Tests
 * Benchmarks all endpoints and identifies bottlenecks
 */

import DamacApiClient from '../bot/DamacApiClient.js';

class PerformanceTester {
  constructor(apiUrl = 'http://localhost:3000/api') {
    this.api = new DamacApiClient(apiUrl);
    this.results = [];
  }

  /**
   * Measure operation time
   */
  async measureTime(name, fn) {
    const start = process.hrtime.bigint();
    try {
      await fn();
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000; // Convert to ms
      
      this.results.push({ name, duration, status: 'OK' });
      return duration;
    } catch (error) {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000;
      
      this.results.push({ name, duration, status: 'FAILED', error: error.message });
      return duration;
    }
  }

  /**
   * Run all performance tests
   */
  async runAllTests() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  DAMAC API Performance Test Suite                     ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Test GET endpoints
    console.log('📊 Testing GET Endpoints...\n');
    await this.testGetEndpoints();

    // Test POST endpoints
    console.log('\n📊 Testing POST Endpoints...\n');
    await this.testPostEndpoints();

    // Test complex queries
    console.log('\n📊 Testing Complex Queries...\n');
    await this.testComplexQueries();

    // Print results
    this.printResults();
  }

  /**
   * Test GET endpoints
   */
  async testGetEndpoints() {
    // Simple list - no filters
    const duration1 = await this.measureTime('GET /api/people (list)', async () => {
      await this.api.getPeople(1, 20);
    });
    console.log(`  ⏱️  Took ${duration1.toFixed(2)}ms`);

    // List with filters
    const duration2 = await this.measureTime('GET /api/properties (filtered)', async () => {
      await this.api.getProperties({ status: 'available', limit: 20 });
    });
    console.log(`  ⏱️  Took ${duration2.toFixed(2)}ms`);

    // Get single item
    const duration3 = await this.measureTime('GET /api/properties/:id', async () => {
      const result = await this.api.getProperties({ limit: 1 });
      if (result.data.length > 0) {
        const id = result.data[0]._id;
        await this.api.getProperty(id);
      }
    });
    console.log(`  ⏱️  Took ${duration3.toFixed(2)}ms`);

    // Relationship query
    const duration4 = await this.measureTime('GET /api/tenancies/tenant/:id', async () => {
      const people = await this.api.getPeople(1, 1);
      if (people.data.length > 0) {
        await this.api.getTenantProperties(people.data[0]._id);
      }
    });
    console.log(`  ⏱️  Took ${duration4.toFixed(2)}ms`);

    // Cluster query
    const duration5 = await this.measureTime('GET /api/properties/cluster/:name', async () => {
      await this.api.getPropertiesByCluster('DAMAC Hills 2');
    });
    console.log(`  ⏱️  Took ${duration5.toFixed(2)}ms`);
  }

  /**
   * Test POST endpoints
   */
  async testPostEndpoints() {
    // Create person
    const personDuration = await this.measureTime('POST /api/people', async () => {
      await this.api.createPerson({
        firstName: `PerfTest_${Date.now()}`,
        lastName: 'User',
        email: `test${Date.now()}@example.com`,
        phone: '+971501234567'
      });
    });
    console.log(`  ⏱️  Took ${personDuration.toFixed(2)}ms`);

    // Create property
    const propertyDuration = await this.measureTime('POST /api/properties', async () => {
      await this.api.createProperty({
        unitNumber: `PT${Date.now()}`,
        cluster: 'DAMAC Hills 2',
        propertyType: 'apartment',
        bedrooms: 2,
        priceAED: 750000,
        availabilityStatus: 'available'
      });
    });
    console.log(`  ⏱️  Took ${propertyDuration.toFixed(2)}ms`);

    // Create buying inquiry
    const buyingDuration = await this.measureTime('POST /api/buying', async () => {
      const propResult = await this.api.getProperties({ limit: 1 });
      const personResult = await this.api.getPeople(1, 1);
      
      if (propResult.data.length > 0 && personResult.data.length > 0) {
        await this.api.createBuyingInquiry({
          propertyId: propResult.data[0]._id,
          buyerId: personResult.data[0]._id,
          offeredPrice: 700000,
          status: 'interested'
        });
      }
    });
    console.log(`  ⏱️  Took ${buyingDuration.toFixed(2)}ms`);
  }

  /**
   * Test complex queries
   */
  async testComplexQueries() {
    // Get all properties + get details of first 5
    const complexDuration1 = await this.measureTime('Batch GET (5 properties)', async () => {
      const result = await this.api.getProperties({ limit: 5 });
      for (const prop of result.data) {
        await this.api.getProperty(prop._id);
      }
    });
    console.log(`  ⏱️  Took ${complexDuration1.toFixed(2)}ms`);

    // Get tenancies + get property details for each
    const complexDuration2 = await this.measureTime('Batch query (tenancies + properties)', async () => {
      const result = await this.api.getTenancies({ limit: 3 });
      // Results would normally include property details
    });
    console.log(`  ⏱️  Took ${complexDuration2.toFixed(2)}ms`);

    // Load test - multiple requests in parallel
    const complexDuration3 = await this.measureTime('Parallel requests (10x GET)', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(this.api.getPeople(1, 5));
      }
      await Promise.all(promises);
    });
    console.log(`  ⏱️  Took ${complexDuration3.toFixed(2)}ms`);
  }

  /**
   * Print performance results
   */
  printResults() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  Performance Test Results                              ║');
    console.log('╠════════════════════════════════════════════════════════╣');

    // Calculate statistics
    const okResults = this.results.filter(r => r.status === 'OK');
    const avgDuration = okResults.length > 0 
      ? okResults.reduce((sum, r) => sum + r.duration, 0) / okResults.length 
      : 0;
    const minDuration = okResults.length > 0
      ? Math.min(...okResults.map(r => r.duration))
      : 0;
    const maxDuration = okResults.length > 0
      ? Math.max(...okResults.map(r => r.duration))
      : 0;

    console.log(`║ Total Tests: ${this.results.length}` + ' '.repeat(40) + '║');
    console.log(`║ Passed: ${okResults.length}` + ' '.repeat(45) + '║');
    console.log(`║ Failed: ${this.results.filter(r => r.status === 'FAILED').length}` + ' '.repeat(45) + '║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║ Average Response Time: ${avgDuration.toFixed(2)}ms` + ' '.repeat(30) + '║');
    console.log(`║ Fastest Response: ${minDuration.toFixed(2)}ms` + ' '.repeat(33) + '║');
    console.log(`║ Slowest Response: ${maxDuration.toFixed(2)}ms` + ' '.repeat(33) + '║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Detailed results
    console.log('📊 Detailed Results:\n');
    console.log('Operation                              | Duration | Status');
    console.log('───────────────────────────────────────┼──────────┼────────');
    
    this.results.forEach(result => {
      const name = result.name.padEnd(37);
      const duration = `${result.duration.toFixed(2)}ms`.padEnd(8);
      const status = result.status === 'OK' ? '✅ OK' : '❌ FAILED';
      console.log(`${name} | ${duration} | ${status}`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
    });

    // Performance recommendations
    this.printRecommendations();
  }

  /**
   * Print optimization recommendations
   */
  printRecommendations() {
    console.log('\n📈 Performance Recommendations:\n');

    const slowTests = this.results.filter(r => r.duration > 500);
    if (slowTests.length === 0) {
      console.log('✅ All tests completed within acceptable time limits (<500ms)\n');
      return;
    }

    console.log('⚠️  Slow Operations Found:\n');
    slowTests.forEach(test => {
      console.log(`  • ${test.name}: ${test.duration.toFixed(2)}ms`);
      
      if (test.name.includes('Batch') || test.name.includes('Parallel')) {
        console.log('    → Consider pagination or caching for batch operations');
      } else if (test.name.includes('complex')) {
        console.log('    → Consider adding database indexes');
      } else {
        console.log('    → Monitor MongoDB performance');
      }
    });

    console.log('\n💡 Optimization Tips:\n');
    console.log('  1. Use pagination limits (e.g., ?limit=20)');
    console.log('  2. Add database indexes on frequently queried fields');
    console.log('  3. Implement caching for frequently accessed data');
    console.log('  4. Use projection to limit returned fields');
    console.log('  5. Consider connection pooling for high load scenarios\n');
  }
}

/**
 * Run performance tests
 */
const tester = new PerformanceTester('http://localhost:3000/api');
tester.runAllTests().catch(error => {
  console.error('Performance test error:', error);
  process.exit(1);
});
