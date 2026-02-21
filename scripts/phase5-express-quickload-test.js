#!/usr/bin/env node

/**
 * PHASE 5 EXPRESS: Quick Load Test
 * Simulates concurrent user load on the API
 * 
 * Test Scenarios:
 *   - Ramp-up: Gradual increase from 1 to 20 concurrent users
 *   - Sustained: 15 concurrent users for 30 seconds
 *   - Spike: Sudden spike to 30 concurrent users
 * 
 * Metrics:
 *   - Response Time (min, max, avg, p95)
 *   - Success Rate
 *   - Error Rate
 *   - Throughput
 * 
 * Expected Runtime: 60-90 seconds
 */

import http from 'http';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/v1/damac`;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

let totalRequests = 0;
let successCount = 0;
let errorCount = 0;
const responseTimes = [];

/**
 * HTTP Request
 */
function httpRequest(method, path) {
  return new Promise((resolve) => {
    const startTime = performance.now();
    
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
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        responseTimes.push(responseTime);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          successCount++;
        } else {
          errorCount++;
        }
        
        resolve({
          status: res.statusCode,
          responseTime,
          timestamp: new Date(),
        });
      });
    });

    req.on('error', () => {
      errorCount++;
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      responseTimes.push(responseTime);
      resolve({ status: 0, responseTime, timestamp: new Date() });
    });

    req.end();
  });
}

/**
 * Generate concurrent requests
 */
async function generateLoad(concurrentUsers, duration, endpoint) {
  const requests = [];
  const startTime = Date.now();
  let requestCount = 0;

  while (Date.now() - startTime < duration) {
    for (let i = 0; i < concurrentUsers; i++) {
      totalRequests++;
      requestCount++;
      requests.push(httpRequest('GET', endpoint));
      
      // Keep concurrent requests limited
      if (requests.length >= concurrentUsers * 2) {
        await Promise.race(requests);
        requests.splice(0, 1);
      }
    }
    
    // Small delay between request batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Wait for remaining requests
  await Promise.all(requests);
  
  return requestCount;
}

/**
 * Calculate Statistics
 */
function calculateStats(times) {
  if (times.length === 0) return null;
  
  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p95Index = Math.floor(sorted.length * 0.95);
  const median = sorted[Math.floor(sorted.length / 2)];
  
  return { min, max, avg, median, p95: sorted[p95Index] };
}

/**
 * Print Load Test Scenario
 */
function section(title) {
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${colors.reset}`);
  console.log(`${colors.cyan}┃${colors.reset} ${title.padEnd(41)} ${colors.cyan}┃${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${colors.reset}`);
}

/**
 * Run Load Tests
 */
async function runLoadTests() {
  console.log(`
${colors.cyan}╔════════════════════════════════════════════════════╗${colors.reset}
${colors.cyan}║${colors.reset} PHASE 5 EXPRESS: Quick Load Test                ${colors.cyan}║${colors.reset}
${colors.cyan}║${colors.reset} DAMAC Hills 2 Property Management API           ${colors.cyan}║${colors.reset}
${colors.cyan}║${colors.reset} February 20, 2026                               ${colors.cyan}║${colors.reset}
${colors.cyan}╚════════════════════════════════════════════════════╝${colors.reset}
  `);

  // PRE-FLIGHT CHECK
  section('PRE-FLIGHT: Server Health Check');
  
  try {
    const healthRes = await httpRequest('GET', `${BASE_URL}/health`);
    if (healthRes.status === 200) {
      console.log(`${colors.green}✓${colors.reset} Server is responsive`);
    } else {
      console.error(`${colors.red}✗${colors.reset} Server responded with status ${healthRes.status}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`${colors.red}✗${colors.reset} Server is not responding`);
    console.error(`   Make sure to run: ${colors.yellow}npm run express-dev${colors.reset}`);
    process.exit(1);
  }

  const testResults = {
    timestamp: new Date().toISOString(),
    scenarios: {},
  };

  // SCENARIO 1: Ramp-up Test
  section('SCENARIO 1: Ramp-Up Test (1→20 users over 20 sec)');
  
  try {
    responseTimes.length = 0;
    successCount = 0;
    errorCount = 0;
    
    console.log(`${colors.gray}Gradually increasing concurrent users...${colors.reset}`);
    
    for (let users = 1; users <= 20; users += 2) {
      process.stdout.write(`${users} users.. `);
      const startTime = Date.now();
      
      const requests = [];
      while (Date.now() - startTime < 1000) {
        for (let i = 0; i < users; i++) {
          totalRequests++;
          requests.push(httpRequest('GET', '/owners'));
        }
        
        if (requests.length >= users * 2) {
          await Promise.race(requests);
          requests.splice(0, 1);
        }
      }
      
      await Promise.all(requests);
    }
    console.log('\n');
    
    const stats = calculateStats(responseTimes);
    const successRate = (successCount / (successCount + errorCount)) * 100;
    
    testResults.scenarios.rampUp = {
      concurrentUsers: '1-20',
      totalRequests: successCount + errorCount,
      successCount,
      errorCount,
      successRate: successRate.toFixed(2),
      responseTime: stats,
    };
    
    console.log(`${colors.green}✓${colors.reset} Total Requests:   ${successCount + errorCount}`);
    console.log(`${colors.green}✓${colors.reset} Successful:       ${successCount}`);
    console.log(`${colors.green}✓${colors.reset} Errors:           ${errorCount}`);
    console.log(`${colors.green}✓${colors.reset} Success Rate:     ${successRate.toFixed(2)}%`);
    console.log(`${colors.green}✓${colors.reset} Min Response:     ${stats.min.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} Avg Response:     ${stats.avg.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} Max Response:     ${stats.max.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} P95 Response:     ${stats.p95.toFixed(2)}ms`);
  } catch (err) {
    console.error(`${colors.red}✗${colors.reset} Error: ${err.message}`);
  }

  // SCENARIO 2: Sustained Load
  section('SCENARIO 2: Sustained Load (15 users, 15 seconds)');
  
  try {
    responseTimes.length = 0;
    successCount = 0;
    errorCount = 0;
    
    console.log(`${colors.gray}Running sustained load test...${colors.reset}`);
    
    const requests = [];
    const startTime = Date.now();
    let requestCount = 0;
    
    while (Date.now() - startTime < 15000) {
      for (let i = 0; i < 15; i++) {
        totalRequests++;
        requestCount++;
        requests.push(httpRequest('GET', '/owners'));
        
        if (requests.length >= 30) {
          await Promise.race(requests);
          requests.splice(0, 1);
        }
      }
      process.stdout.write(`.`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    await Promise.all(requests);
    console.log('\n');
    
    const stats = calculateStats(responseTimes);
    const successRate = (successCount / (successCount + errorCount)) * 100;
    const throughput = (requestCount / 15).toFixed(2);
    
    testResults.scenarios.sustained = {
      concurrentUsers: 15,
      duration: '15 seconds',
      totalRequests: requestCount,
      successCount,
      errorCount,
      successRate: successRate.toFixed(2),
      throughput: parseFloat(throughput),
      responseTime: stats,
    };
    
    console.log(`${colors.green}✓${colors.reset} Total Requests:   ${requestCount}`);
    console.log(`${colors.green}✓${colors.reset} Successful:       ${successCount}`);
    console.log(`${colors.green}✓${colors.reset} Errors:           ${errorCount}`);
    console.log(`${colors.green}✓${colors.reset} Success Rate:     ${successRate.toFixed(2)}%`);
    console.log(`${colors.green}✓${colors.reset} Throughput:       ${throughput} req/s`);
    console.log(`${colors.green}✓${colors.reset} Min Response:     ${stats.min.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} Avg Response:     ${stats.avg.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} Max Response:     ${stats.max.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} P95 Response:     ${stats.p95.toFixed(2)}ms`);
  } catch (err) {
    console.error(`${colors.red}✗${colors.reset} Error: ${err.message}`);
  }

  // SCENARIO 3: Spike Test
  section('SCENARIO 3: Spike Test (sudden 30 users for 10 sec)');
  
  try {
    responseTimes.length = 0;
    successCount = 0;
    errorCount = 0;
    
    console.log(`${colors.gray}Simulating traffic spike...${colors.reset}`);
    
    const requests = [];
    const startTime = Date.now();
    let requestCount = 0;
    
    while (Date.now() - startTime < 10000) {
      for (let i = 0; i < 30; i++) {
        totalRequests++;
        requestCount++;
        requests.push(httpRequest('GET', '/owners'));
        
        if (requests.length >= 60) {
          await Promise.race(requests);
          requests.splice(0, 1);
        }
      }
      process.stdout.write(`.`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    await Promise.all(requests);
    console.log('\n');
    
    const stats = calculateStats(responseTimes);
    const successRate = (successCount / (successCount + errorCount)) * 100;
    const throughput = (requestCount / 10).toFixed(2);
    
    testResults.scenarios.spike = {
      concurrentUsers: 30,
      duration: '10 seconds',
      totalRequests: requestCount,
      successCount,
      errorCount,
      successRate: successRate.toFixed(2),
      throughput: parseFloat(throughput),
      responseTime: stats,
    };
    
    console.log(`${colors.green}✓${colors.reset} Total Requests:   ${requestCount}`);
    console.log(`${colors.green}✓${colors.reset} Successful:       ${successCount}`);
    console.log(`${colors.green}✓${colors.reset} Errors:           ${errorCount}`);
    console.log(`${colors.green}✓${colors.reset} Success Rate:     ${successRate.toFixed(2)}%`);
    console.log(`${colors.green}✓${colors.reset} Throughput:       ${throughput} req/s`);
    console.log(`${colors.green}✓${colors.reset} Min Response:     ${stats.min.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} Avg Response:     ${stats.avg.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} Max Response:     ${stats.max.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} P95 Response:     ${stats.p95.toFixed(2)}ms`);
  } catch (err) {
    console.error(`${colors.red}✗${colors.reset} Error: ${err.message}`);
  }

  // Overall Summary
  section('LOAD TEST SUMMARY');
  
  const overallStats = calculateStats(responseTimes);
  const overallSuccessRate = (successCount / totalRequests) * 100;
  
  console.log(`${colors.green}✓${colors.reset} Total Requests:   ${totalRequests}`);
  console.log(`${colors.green}✓${colors.reset} Successful:       ${successCount}`);
  console.log(`${colors.green}✓${colors.reset} Errors:           ${errorCount}`);
  console.log(`${colors.green}✓${colors.reset} Success Rate:     ${overallSuccessRate.toFixed(2)}%`);
  console.log(`${colors.green}✓${colors.reset} Min Response:     ${overallStats.min.toFixed(2)}ms`);
  console.log(`${colors.green}✓${colors.reset} Avg Response:     ${overallStats.avg.toFixed(2)}ms`);
  console.log(`${colors.green}✓${colors.reset} Max Response:     ${overallStats.max.toFixed(2)}ms`);
  console.log(`${colors.green}✓${colors.reset} P95 Response:     ${overallStats.p95.toFixed(2)}ms`);
  
  // Verdict
  const verdict = overallSuccessRate >= 99 && overallStats.avg < 100 
    ? `${colors.green}✓ EXCELLENT${colors.reset}`
    : overallSuccessRate >= 95 && overallStats.avg < 200
    ? `${colors.yellow}⚠ GOOD${colors.reset}`
    : `${colors.red}✗ NEEDS OPTIMIZATION${colors.reset}`;
  
  console.log(`${colors.green}✓${colors.reset} Status:           ${verdict}`);

  // Save Results
  testResults.summary = {
    totalRequests,
    successCount,
    errorCount,
    successRate: overallSuccessRate.toFixed(2),
    avgResponseTime: overallStats.avg.toFixed(2),
  };

  const resultsPath = './load-test-results.json';
  fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
  console.log(`\n${colors.cyan}Results saved to:${colors.reset} ${resultsPath}`);

  process.exit(0);
}

// Run Tests
runLoadTests().catch(err => {
  console.error(`${colors.red}Fatal Error:${colors.reset}`, err);
  process.exit(1);
});
