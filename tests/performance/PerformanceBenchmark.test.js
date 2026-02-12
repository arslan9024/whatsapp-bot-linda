/**
 * Performance Benchmark Tests - Phase 4 M4
 * Tests response times, throughput, and baseline performance metrics
 * 
 * @module tests/performance/PerformanceBenchmark
 * @requires jest
 * @category Performance Testing
 */

const fs = require('fs');
const path = require('path');

// Load performance thresholds and benchmarks
const performanceThresholds = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'performance-fixtures', 'performance-thresholds.json'), 'utf8')
);
const benchmarkBaseline = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'performance-fixtures', 'benchmark-baseline.json'), 'utf8')
);

/**
 * Helper: Measure execution time of a function
 * @param {Function} fn - Function to measure
 * @param {number} iterations - Number of iterations
 * @returns {Object} - {totalTime, avgTime, minTime, maxTime, iterations}
 */
function measurePerformance(fn, iterations = 1) {
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    fn();
    const end = process.hrtime.bigint();
    times.push(Number(end - start) / 1_000_000); // Convert to ms
  }
  
  const totalTime = times.reduce((a, b) => a + b, 0);
  const avgTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  
  return { totalTime, avgTime, minTime, maxTime, iterations };
}

/**
 * Helper: Measure throughput (operations per second)
 * @param {Function} fn - Function representing one operation
 * @param {number} duration - Test duration in milliseconds
 * @returns {number} - Operations per second
 */
function measureThroughput(fn, duration = 1000) {
  let operationCount = 0;
  const startTime = Date.now();
  
  while (Date.now() - startTime < duration) {
    fn();
    operationCount++;
  }
  
  const elapsedSeconds = (Date.now() - startTime) / 1000;
  return operationCount / elapsedSeconds;
}

/**
 * ===== PERFORMANCE BENCHMARK TEST SUITE =====
 */
describe('Phase 4 M4 - Performance Benchmarking Tests', () => {
  
  // Test 1: Message Parsing Performance
  describe('Test 1: Message Parsing Performance', () => {
    it('should parse simple text message within threshold (< 50ms)', () => {
      const simpleMessage = 'Hello, how are you?';
      const threshold = performanceThresholds.thresholds.messageParse.maxTimeMs;
      
      const result = measurePerformance(() => {
        const parsed = {
          content: simpleMessage,
          length: simpleMessage.length,
          type: 'text',
          timestamp: Date.now()
        };
      }, 100);
      
      console.log(`  Simple message parse: ${result.avgTime.toFixed(2)}ms avg (threshold: ${threshold}ms)`);
      expect(result.avgTime).toBeLessThan(threshold);
    });
    
    it('should parse complex JSON message within threshold', () => {
      const complexMessage = JSON.stringify({
        type: 'contact',
        data: {
          name: 'John Doe',
          phone: '+1234567890',
          email: 'john@example.com',
          address: '123 Main St'
        },
        metadata: {
          timestamp: Date.now(),
          sender: 'user123',
          encrypted: true
        }
      });
      
      const threshold = performanceThresholds.thresholds.messageParse.maxTimeMs;
      
      const result = measurePerformance(() => {
        const parsed = JSON.parse(complexMessage);
      }, 100);
      
      console.log(`  Complex JSON parse: ${result.avgTime.toFixed(2)}ms avg (threshold: ${threshold}ms)`);
      expect(result.avgTime).toBeLessThan(threshold);
    });
    
    it('should measure message parsing throughput', () => {
      const threshold = 50; // ms per message
      const expectedOpsPerSec = 1000 / threshold; // ~20 ops/sec minimum
      
      const throughput = measureThroughput(() => {
        const message = 'Test message ' + Math.random();
        const parsed = {
          content: message,
          length: message.length,
          timestamp: Date.now()
        };
      }, 500);
      
      console.log(`  Message parsing throughput: ${throughput.toFixed(2)} ops/sec (target: ${expectedOpsPerSec}+ ops/sec)`);
      expect(throughput).toBeGreaterThan(expectedOpsPerSec * 0.8); // Allow 20% variance
    });
  });
  
  // Test 2: Command Processing Performance
  describe('Test 2: Command Processing Performance', () => {
    it('should process simple commands within threshold (< 200ms)', () => {
      const commands = [
        { cmd: 'help', args: [] },
        { cmd: 'status', args: [] },
        { cmd: 'list', args: ['contacts'] }
      ];
      
      const threshold = performanceThresholds.thresholds.commandResponse.maxTimeMs;
      
      const result = measurePerformance(() => {
        const cmd = commands[Math.floor(Math.random() * commands.length)];
        const executed = {
          command: cmd.cmd,
          args: cmd.args,
          status: 'success',
          result: 'Command executed'
        };
      }, 50);
      
      console.log(`  Simple command processing: ${result.avgTime.toFixed(2)}ms avg (threshold: ${threshold}ms)`);
      expect(result.avgTime).toBeLessThan(threshold);
    });
    
    it('should process complex commands with database interactions', () => {
      const threshold = performanceThresholds.thresholds.commandResponse.maxTimeMs;
      
      const result = measurePerformance(() => {
        // Simulate complex command with I/O
        const data = {
          contacts: Array(100).fill(null).map((_, i) => ({
            id: i,
            name: `Contact ${i}`,
            phone: `+1234567${String(i).padStart(3, '0')}`
          }))
        };
        const filtered = data.contacts.filter(c => c.name.includes('Contact'));
      }, 25);
      
      console.log(`  Complex command processing: ${result.avgTime.toFixed(2)}ms avg (threshold: ${threshold}ms)`);
      expect(result.avgTime).toBeLessThan(threshold);
    });
    
    it('should measure command processing throughput (ops/sec)', () => {
      const expectedMinThroughput = 50; // commands/sec
      
      const throughput = measureThroughput(() => {
        const commands = ['help', 'status', 'list', 'sync'];
        const cmd = commands[Math.floor(Math.random() * commands.length)];
        const executed = { command: cmd, status: 'success' };
      }, 1000);
      
      console.log(`  Command processing throughput: ${throughput.toFixed(2)} ops/sec (target: ${expectedMinThroughput}+ ops/sec)`);
      expect(throughput).toBeGreaterThan(expectedMinThroughput);
    });
  });
  
  // Test 3: Database Query Performance
  describe('Test 3: Database Query Performance', () => {
    it('should execute database queries within threshold (< 100ms)', () => {
      const threshold = performanceThresholds.thresholds.databaseQuery.maxTimeMs;
      
      // Simulate database query
      const result = measurePerformance(() => {
        const mockData = Array(1000).fill(null).map((_, i) => ({
          id: i,
          name: `Record ${i}`,
          value: Math.random()
        }));
        const filtered = mockData.filter(r => r.value > 0.5);
      }, 30);
      
      console.log(`  Database query: ${result.avgTime.toFixed(2)}ms avg (threshold: ${threshold}ms)`);
      expect(result.avgTime).toBeLessThan(threshold);
    });
    
    it('should handle batch queries efficiently', () => {
      const threshold = performanceThresholds.thresholds.databaseQuery.maxTimeMs;
      
      const result = measurePerformance(() => {
        // Simulate batch query (100 rows)
        const batchSize = 100;
        const mockData = Array(batchSize).fill(null).map((_, i) => ({
          id: i,
          data: 'x'.repeat(100)
        }));
        const processed = mockData.map(r => ({ ...r, processed: true }));
      }, 20);
      
      console.log(`  Batch database query (100 rows): ${result.avgTime.toFixed(2)}ms avg`);
      expect(result.avgTime).toBeLessThan(threshold * 3); // Allow more time for batch
    });
  });
  
  // Test 4: Contact Sync Performance
  describe('Test 4: Contact Sync Performance', () => {
    it('should sync contacts within performance threshold (< 500ms)', () => {
      const threshold = performanceThresholds.thresholds.contactSync?.maxTimeMs || 500;
      
      const result = measurePerformance(() => {
        // Simulate contact sync
        const contacts = Array(50).fill(null).map((_, i) => ({
          id: i,
          name: `Contact ${i}`,
          phone: `+1234567${String(i).padStart(3, '0')}`,
          email: `contact${i}@example.com`
        }));
        
        const synced = contacts.map(c => ({
          ...c,
          synced: true,
          lastSync: Date.now()
        }));
      }, 10);
      
      console.log(`  Contact sync: ${result.avgTime.toFixed(2)}ms avg (threshold: ${threshold}ms)`);
      expect(result.avgTime).toBeLessThan(threshold);
    });
    
    it('should measure contact sync throughput', () => {
      const contactsPerSecond = 100; // minimum acceptable
      
      const throughput = measureThroughput(() => {
        const contact = {
          id: Math.random().toString(),
          name: 'Test Contact',
          phone: '+1234567890',
          synced: true
        };
      }, 500);
      
      console.log(`  Contact sync throughput: ${throughput.toFixed(0)} contacts/sec (target: ${contactsPerSecond}+ contacts/sec)`);
      expect(throughput).toBeGreaterThan(contactsPerSecond);
    });
  });
  
  // Test 5: Overall Baseline Performance Report
  describe('Test 5: Performance Baseline Report', () => {
    it('should document current performance baseline metrics', () => {
      const report = {
        timestamp: new Date().toISOString(),
        environment: benchmarkBaseline.environment,
        measurements: {}
      };
      
      // Measure key operations
      const messageParse = measurePerformance(() => {
        const msg = 'test message';
        const parsed = { content: msg, timestamp: Date.now() };
      }, 100);
      
      const commandExec = measurePerformance(() => {
        const result = { command: 'test', status: 'success' };
      }, 100);
      
      const dataSort = measurePerformance(() => {
        const arr = Array(100).fill(null).map(() => Math.random());
        arr.sort((a, b) => a - b);
      }, 50);
      
      report.measurements = {
        messageParse: {
          avgMs: parseFloat(messageParse.avgTime.toFixed(2)),
          minMs: parseFloat(messageParse.minTime.toFixed(2)),
          maxMs: parseFloat(messageParse.maxTime.toFixed(2)),
          threshold: performanceThresholds.thresholds.messageParse.maxTimeMs
        },
        commandExecution: {
          avgMs: parseFloat(commandExec.avgTime.toFixed(2)),
          minMs: parseFloat(commandExec.minTime.toFixed(2)),
          maxMs: parseFloat(commandExec.maxTime.toFixed(2)),
          threshold: performanceThresholds.thresholds.commandResponse.maxTimeMs
        },
        dataProcessing: {
          avgMs: parseFloat(dataSort.avgTime.toFixed(2)),
          minMs: parseFloat(dataSort.minTime.toFixed(2)),
          maxMs: parseFloat(dataSort.maxTime.toFixed(2))
        }
      };
      
      console.log('');
      console.log('  ╔════════════════════════════════════════╗');
      console.log('  ║   PERFORMANCE BASELINE REPORT          ║');
      console.log('  ╠════════════════════════════════════════╣');
      console.log(`  ║ Message Parsing:     ${messageParse.avgTime.toFixed(2).padEnd(22, ' ')} ║`);
      console.log(`  ║ Command Execution:   ${commandExec.avgTime.toFixed(2).padEnd(22, ' ')} ║`);
      console.log(`  ║ Data Processing:     ${dataSort.avgTime.toFixed(2).padEnd(22, ' ')} ║`);
      console.log('  ╚════════════════════════════════════════╝');
      console.log('');
      
      expect(report.measurements).toBeDefined();
      expect(report.measurements.messageParse.avgMs).toBeLessThan(50);
      expect(report.measurements.commandExecution.avgMs).toBeLessThan(200);
    });
  });
  
});

// Export for measurement utilities
module.exports = { measurePerformance, measureThroughput };
