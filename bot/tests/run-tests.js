#!/usr/bin/env node

/**
 * Bot Test Runner
 * Executes all test suites and generates comprehensive reports
 */

import { spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = import.meta.url.replace('file://', '').split('/').slice(0, -1).join('/');
const TEST_RESULTS_DIR = join(__dirname, '..', '..', 'test-results');
const BOT_DIR = join(__dirname, '..');

// Ensure test results directory exists
if (!existsSync(TEST_RESULTS_DIR)) {
  mkdirSync(TEST_RESULTS_DIR, { recursive: true });
}

class TestRunner {
  constructor() {
    this.results = {
      startTime: new Date(),
      suites: [],
      summary: {}
    };
    this.testConfigs = [
      {
        name: 'Integration Tests',
        pattern: '**/*.test.js',
        coverage: true,
        parallel: true
      },
      {
        name: 'Performance Tests',
        pattern: '**/performance.test.js',
        coverage: false,
        parallel: false,
        timeout: 60000
      }
    ];
  }

  async runTests(pattern, options = {}) {
    return new Promise((resolve, reject) => {
      const args = [
        '--testPathPattern=' + pattern,
        '--json',
        '--outputFile=' + join(TEST_RESULTS_DIR, `results-${Date.now()}.json`),
        ...(options.coverage ? ['--coverage'] : []),
        ...(options.watch ? ['--watch'] : []),
        ...(options.verbose ? ['--verbose'] : []),
        ...(options.ci ? ['--ci'] : []),
        '--forceExit'
      ];

      const jestProcess = spawn('jest', args, {
        cwd: BOT_DIR,
        stdio: 'inherit'
      });

      jestProcess.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Tests failed with exit code ${code}`));
        }
      });
    });
  }

  async runAll(options = {}) {
    console.log('🚀 Starting Bot Test Suite\n');
    console.log('═'.repeat(60));

    const startTime = Date.now();

    for (const config of this.testConfigs) {
      console.log(`\n📋 Running: ${config.name}`);
      console.log('─'.repeat(60));

      try {
        await this.runTests(config.pattern, {
          coverage: config.coverage,
          verbose: options.verbose || false,
          timeout: config.timeout || 30000
        });

        this.results.suites.push({
          name: config.name,
          status: 'PASSED',
          duration: Date.now() - startTime
        });

        console.log(`✅ ${config.name} completed`);
      } catch (error) {
        console.error(`❌ ${config.name} failed: ${error.message}`);
        this.results.suites.push({
          name: config.name,
          status: 'FAILED',
          error: error.message,
          duration: Date.now() - startTime
        });

        if (options.bail) {
          throw error;
        }
      }
    }

    const totalDuration = Date.now() - startTime;
    this.results.endTime = new Date();
    this.results.totalDuration = totalDuration;

    this.generateReport();
    this.printSummary();
  }

  generateReport() {
    const reportPath = join(TEST_RESULTS_DIR, 'test-report.json');
    writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);
  }

  printSummary() {
    console.log('\n' + '═'.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('═'.repeat(60));

    const passed = this.results.suites.filter(s => s.status === 'PASSED').length;
    const failed = this.results.suites.filter(s => s.status === 'FAILED').length;
    const duration = (this.results.totalDuration / 1000).toFixed(2);

    console.log(`\n✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📅 Started: ${this.results.startTime.toLocaleString()}`);
    console.log(`📅 Ended: ${this.results.endTime.toLocaleString()}`);

    console.log('\n' + '─'.repeat(60));
    console.log('SUITE DETAILS:');
    console.log('─'.repeat(60));

    this.results.suites.forEach(suite => {
      const icon = suite.status === 'PASSED' ? '✅' : '❌';
      const duration = (suite.duration / 1000).toFixed(2);
      console.log(`${icon} ${suite.name} (${duration}s)`);
      if (suite.error) {
        console.log(`   Error: ${suite.error}`);
      }
    });

    console.log('\n' + '═'.repeat(60));

    // Exit with appropriate code
    const hasFailures = failed > 0;
    process.exit(hasFailures ? 1 : 0);
  }
}

async function main() {
  const runner = new TestRunner();

  try {
    await runner.runAll({
      verbose: process.argv.includes('--verbose'),
      bail: process.argv.includes('--bail'),
      ci: process.argv.includes('--ci')
    });
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
