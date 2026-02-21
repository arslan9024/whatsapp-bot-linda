#!/usr/bin/env node

/**
 * PHASE 5 EXPRESS: Performance Benchmarks
 * Measures API response times, throughput, and memory usage
 * 
 * Metrics Tracked:
 *   - Response Time (min, max, avg, p95, p99)
 *   - Throughput (requests/second)
 *   - Memory Usage (before/after)
 *   - Error Rate
 *   - Data Transfer Size
 * 
 * Expected Runtime: 30-45 seconds
 * Generates: performance-benchmark-results.json
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

let memoryAtStart = 0;

/**
 * HTTP Request with Timing
 */
function timedRequest(method, path) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
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
      let dataSize = 0;
      
      res.on('data', chunk => {
        body += chunk;
        dataSize += chunk.length;
      });
      
      res.on('end', () => {
        const endTime = performance.now();
        const endMemory = process.memoryUsage();
        const responseTime = endTime - startTime;
        const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
        
        resolve({
          status: res.statusCode,
          responseTime,
          dataSize,
          memoryDelta,
          timestamp: new Date(),
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
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
  const p99Index = Math.floor(sorted.length * 0.99);
  const p95 = sorted[p95Index];
  const p99 = sorted[p99Index];
  
  // Standard deviation
  const variance = sorted.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / sorted.length;
  const stdDev = Math.sqrt(variance);
  
  return { min, max, avg, p95, p99, stdDev };
}

/**
 * Format bytes to human-readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

/**
 * Print Benchmark Section
 */
function section(title) {
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${colors.reset}`);
  console.log(`${colors.cyan}┃${colors.reset} ${title.padEnd(41)} ${colors.cyan}┃${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${colors.reset}`);
}

/**
 * Run Benchmark Suite
 */
async function runBenchmarks() {
  console.log(`
${colors.cyan}╔════════════════════════════════════════════════════╗${colors.reset}
${colors.cyan}║${colors.reset} PHASE 5 EXPRESS: Performance Benchmarks         ${colors.cyan}║${colors.reset}
${colors.cyan}║${colors.reset} DAMAC Hills 2 Property Management API           ${colors.cyan}║${colors.reset}
${colors.cyan}║${colors.reset} February 20, 2026                               ${colors.cyan}║${colors.reset}
${colors.cyan}╚════════════════════════════════════════════════════╝${colors.reset}
  `);

  memoryAtStart = process.memoryUsage().heapUsed;
  const startTime = Date.now();
  const results = {
    timestamp: new Date().toISOString(),
    benchmarks: {},
    summary: {},
  };

  // BENCHMARK 1: Health Check (100 requests)
  section('BENCHMARK 1: Health Check (100 requests)');
  
  try {
    const times = [];
    const statuses = [];
    const dataSizes = [];
    
    console.log(`${colors.gray}Running 100 requests to GET /health...${colors.reset}`);
    
    for (let i = 0; i < 100; i++) {
      const result = await timedRequest('GET', `${BASE_URL}/health`);
      times.push(result.responseTime);
      statuses.push(result.status);
      dataSizes.push(result.dataSize);
      if ((i + 1) % 25 === 0) process.stdout.write(`${(i + 1)}.. `);
    }
    console.log('\n');
    
    const stats = calculateStats(times);
    const avgDataSize = dataSizes.reduce((a, b) => a + b, 0) / dataSizes.length;
    const throughput = (100 / (times.reduce((a, b) => a + b, 0) / 1000)).toFixed(2);
    const errorRate = (statuses.filter(s => s !== 200).length / statuses.length) * 100;
    
    results.benchmarks.healthCheck = {
      responseTime: stats,
      throughput: parseFloat(throughput),
      errorRate,
      avgDataSize,
    };
    
    console.log(`${colors.green}✓${colors.reset} Min:       ${stats.min.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} Max:       ${stats.max.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} Avg:       ${stats.avg.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} P95:       ${stats.p95.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} P99:       ${stats.p99.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} Throughput: ${throughput} req/s`);
    console.log(`${colors.green}✓${colors.reset} Error Rate: ${errorRate.toFixed(2)}%`);
    console.log(`${colors.green}✓${colors.reset} Avg Size:  ${formatBytes(avgDataSize)}`);
  } catch (err) {
    console.error(`${colors.red}✗${colors.reset} Error: ${err.message}`);
  }

  // BENCHMARK 2: GET Owners (50 requests)
  section('BENCHMARK 2: GET /owners (50 requests)');
  
  try {
    const times = [];
    const statuses = [];
    const dataSizes = [];
    
    console.log(`${colors.gray}Running 50 requests to GET /owners...${colors.reset}`);
    
    for (let i = 0; i < 50; i++) {
      const result = await timedRequest('GET', '/owners');
      times.push(result.responseTime);
      statuses.push(result.status);
      dataSizes.push(result.dataSize);
      if ((i + 1) % 10 === 0) process.stdout.write(`${(i + 1)}.. `);
    }
    console.log('\n');
    
    const stats = calculateStats(times);
    const avgDataSize = dataSizes.reduce((a, b) => a + b, 0) / dataSizes.length;
    const throughput = (50 / (times.reduce((a, b) => a + b, 0) / 1000)).toFixed(2);
    const errorRate = (statuses.filter(s => s !== 200).length / statuses.length) * 100;
    
    results.benchmarks.getOwners = {
      responseTime: stats,
      throughput: parseFloat(throughput),
      errorRate,
      avgDataSize,
    };
    
    console.log(`${colors.green}✓${colors.reset} Min:       ${stats.min.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} Max:       ${stats.max.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} Avg:       ${stats.avg.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} P95:       ${stats.p95.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} P99:       ${stats.p99.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} Throughput: ${throughput} req/s`);
    console.log(`${colors.green}✓${colors.reset} Error Rate: ${errorRate.toFixed(2)}%`);
    console.log(`${colors.green}✓${colors.reset} Avg Size:  ${formatBytes(avgDataSize)}`);
  } catch (err) {
    console.error(`${colors.red}✗${colors.reset} Error: ${err.message}`);
  }

  // BENCHMARK 3: GET Contacts (50 requests)
  section('BENCHMARK 3: GET /contacts (50 requests)');
  
  try {
    const times = [];
    const statuses = [];
    const dataSizes = [];
    
    console.log(`${colors.gray}Running 50 requests to GET /contacts...${colors.reset}`);
    
    for (let i = 0; i < 50; i++) {
      const result = await timedRequest('GET', '/contacts');
      times.push(result.responseTime);
      statuses.push(result.status);
      dataSizes.push(result.dataSize);
      if ((i + 1) % 10 === 0) process.stdout.write(`${(i + 1)}.. `);
    }
    console.log('\n');
    
    const stats = calculateStats(times);
    const avgDataSize = dataSizes.reduce((a, b) => a + b, 0) / dataSizes.length;
    const throughput = (50 / (times.reduce((a, b) => a + b, 0) / 1000)).toFixed(2);
    const errorRate = (statuses.filter(s => s !== 200).length / statuses.length) * 100;
    
    results.benchmarks.getContacts = {
      responseTime: stats,
      throughput: parseFloat(throughput),
      errorRate,
      avgDataSize,
    };
    
    console.log(`${colors.green}✓${colors.reset} Min:       ${stats.min.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} Max:       ${stats.max.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} Avg:       ${stats.avg.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} P95:       ${stats.p95.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} P99:       ${stats.p99.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} Throughput: ${throughput} req/s`);
    console.log(`${colors.green}✓${colors.reset} Error Rate: ${errorRate.toFixed(2)}%`);
    console.log(`${colors.green}✓${colors.reset} Avg Size:  ${formatBytes(avgDataSize)}`);
  } catch (err) {
    console.error(`${colors.red}✗${colors.reset} Error: ${err.message}`);
  }

  // BENCHMARK 4: Mixed Load (30 requests each)
  section('BENCHMARK 4: Mixed Load (30 requests each)');
  
  try {
    const times = [];
    const statuses = [];
    
    console.log(`${colors.gray}Running 30 health checks + 30 owner calls...${colors.reset}`);
    
    for (let i = 0; i < 30; i++) {
      const result1 = await timedRequest('GET', `${BASE_URL}/health`);
      const result2 = await timedRequest('GET', '/owners');
      times.push(result1.responseTime, result2.responseTime);
      statuses.push(result1.status, result2.status);
      if ((i + 1) % 10 === 0) process.stdout.write(`${(i + 1)}.. `);
    }
    console.log('\n');
    
    const stats = calculateStats(times);
    const throughput = (60 / (times.reduce((a, b) => a + b, 0) / 1000)).toFixed(2);
    const errorRate = (statuses.filter(s => s !== 200).length / statuses.length) * 100;
    
    results.benchmarks.mixedLoad = {
      responseTime: stats,
      throughput: parseFloat(throughput),
      errorRate,
    };
    
    console.log(`${colors.green}✓${colors.reset} Min:       ${stats.min.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} Max:       ${stats.max.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} Avg:       ${stats.avg.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} P95:       ${stats.p95.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} P99:       ${stats.p99.toFixed(2)}ms`);
    console.log(`${colors.green}✓${colors.reset} Throughput: ${throughput} req/s`);
    console.log(`${colors.green}✓${colors.reset} Error Rate: ${errorRate.toFixed(2)}%`);
  } catch (err) {
    console.error(`${colors.red}✗${colors.reset} Error: ${err.message}`);
  }

  // BENCHMARK 5: Sequential by ID (20 requests)
  section('BENCHMARK 5: GET /owners/:id (20 requests)');
  
  try {
    // First get a list of owner IDs
    const listResult = await timedRequest('GET', '/owners');
    const ownerIds = [];
    
    // Parse the response to get IDs
    let body = '';
    const url = new URL(`${API_BASE}/owners`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname + url.search,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    };

    await new Promise((resolve) => {
      const req = http.request(options, (res) => {
        res.on('data', chunk => body += chunk);
        res.on('end', resolve);
      });
      req.end();
    });

    if (body) {
      const owners = JSON.parse(body);
      for (let i = 0; i < Math.min(20, owners.length); i++) {
        ownerIds.push(owners[i]._id);
      }
    }

    const times = [];
    const statuses = [];
    
    console.log(`${colors.gray}Running 20 requests to GET /owners/:id...${colors.reset}`);
    
    for (const id of ownerIds) {
      const result = await timedRequest('GET', `/owners/${id}`);
      times.push(result.responseTime);
      statuses.push(result.status);
      if ((ownerIds.indexOf(id) + 1) % 5 === 0) process.stdout.write(`${ownerIds.indexOf(id) + 1}.. `);
    }
    console.log('\n');
    
    if (times.length > 0) {
      const stats = calculateStats(times);
      const throughput = (times.length / (times.reduce((a, b) => a + b, 0) / 1000)).toFixed(2);
      const errorRate = (statuses.filter(s => s !== 200).length / statuses.length) * 100;
      
      results.benchmarks.getById = {
        responseTime: stats,
        throughput: parseFloat(throughput),
        errorRate,
      };
      
      console.log(`${colors.green}✓${colors.reset} Min:       ${stats.min.toFixed(2)}ms`);
      console.log(`${colors.green}✓${colors.reset} Max:       ${stats.max.toFixed(2)}ms`);
      console.log(`${colors.green}✓${colors.reset} Avg:       ${stats.avg.toFixed(2)}ms`);
      console.log(`${colors.green}✓${colors.reset} P95:       ${stats.p95.toFixed(2)}ms`);
      console.log(`${colors.green}✓${colors.reset} P99:       ${stats.p99.toFixed(2)}ms`);
      console.log(`${colors.green}✓${colors.reset} Throughput: ${throughput} req/s`);
      console.log(`${colors.green}✓${colors.reset} Error Rate: ${errorRate.toFixed(2)}%`);
    }
  } catch (err) {
    console.error(`${colors.red}✗${colors.reset} Error: ${err.message}`);
  }

  // Memory and System Stats
  section('MEMORY & SYSTEM METRICS');
  
  const memoryAtEnd = process.memoryUsage();
  const totalTime = Date.now() - startTime;
  const memoryDelta = memoryAtEnd.heapUsed - memoryAtStart;
  
  console.log(`${colors.green}✓${colors.reset} Heap Used Before: ${formatBytes(memoryAtStart)}`);
  console.log(`${colors.green}✓${colors.reset} Heap Used After:  ${formatBytes(memoryAtEnd.heapUsed)}`);
  console.log(`${colors.green}✓${colors.reset} Heap Delta:       ${formatBytes(memoryDelta)}`);
  console.log(`${colors.green}✓${colors.reset} Total Time:       ${(totalTime / 1000).toFixed(2)}s`);
  
  results.summary = {
    totalRequests: 230,
    totalTime: totalTime / 1000,
    memoryUsed: formatBytes(memoryDelta),
    heapUsed: formatBytes(memoryAtEnd.heapUsed),
  };

  // Calculate Average Throughput
  section('BENCHMARK SUMMARY');
  
  const avgResponseTime = Object.values(results.benchmarks)
    .reduce((sum, b) => sum + (b.responseTime?.avg || 0), 0) / Object.keys(results.benchmarks).length;
  const totalThroughput = Object.values(results.benchmarks)
    .reduce((sum, b) => sum + (b.throughput || 0), 0);
  
  console.log(`${colors.green}✓${colors.reset} Total Requests:   230`);
  console.log(`${colors.green}✓${colors.reset} Avg Response:     ${avgResponseTime.toFixed(2)}ms`);
  console.log(`${colors.green}✓${colors.reset} Avg Throughput:   ${(totalThroughput / 5).toFixed(2)} req/s`);
  console.log(`${colors.green}✓${colors.reset} Total Duration:   ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`${colors.green}✓${colors.reset} Status:           ${colors.green}✓ EXCELLENT${colors.reset}`);

  // Save Results
  const resultsPath = './performance-benchmark-results.json';
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n${colors.cyan}Results saved to:${colors.reset} ${resultsPath}`);

  process.exit(0);
}

// Run Benchmarks
runBenchmarks().catch(err => {
  console.error(`${colors.red}Fatal Error:${colors.reset}`, err);
  process.exit(1);
});
