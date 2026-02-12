#!/usr/bin/env node

/**
 * CI/CD Test Runner Script
 * 
 * Orchestrates test execution across all test suites
 * Formats results for GitHub Actions and generates detailed reports
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

class TestOrchestrator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      suites: [],
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        duration: 0,
        overallStatus: 'PASS'
      },
      artifacts: {
        coverage: null,
        reports: []
      }
    };
    this.startTime = Date.now();
  }

  /**
   * Log formatted messages
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: `${colors.blue}[INFO]${colors.reset}`,
      success: `${colors.green}[✓]${colors.reset}`,
      error: `${colors.red}[✗]${colors.reset}`,
      warn: `${colors.yellow}[⚠]${colors.reset}`,
      debug: `${colors.cyan}[DEBUG]${colors.reset}`,
    };

    console.log(`${prefix[level]} ${message}`);
  }

  /**
   * Run a test command and capture results
   */
  async runTest(suiteName, command, options = {}) {
    this.log(`Running ${suiteName}...`, 'info');

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: options.timeout || 60000,
        cwd: process.cwd(),
      });

      // Parse Jest output for test counts
      const output = stdout + stderr;
      const testSummary = this.parseJestOutput(output);

      const suiteResult = {
        name: suiteName,
        status: testSummary.failedTests === 0 ? 'PASS' : 'FAIL',
        command: command,
        output: stdout,
        testCounts: testSummary,
        timestamp: new Date().toISOString(),
      };

      this.results.suites.push(suiteResult);
      this.updateSummary(testSummary);

      if (suiteResult.status === 'PASS') {
        this.log(`${suiteName}: ${testSummary.passedTests}/${testSummary.totalTests} passed`, 'success');
      } else {
        this.log(`${suiteName}: ${testSummary.failedTests} test(s) failed`, 'error');
        this.results.summary.overallStatus = 'FAIL';
      }

      return suiteResult;

    } catch (error) {
      this.log(`${suiteName} execution failed: ${error.message}`, 'error');

      const suiteResult = {
        name: suiteName,
        status: 'ERROR',
        command: command,
        error: error.message,
        timestamp: new Date().toISOString(),
      };

      this.results.suites.push(suiteResult);
      this.results.summary.overallStatus = 'FAIL';

      return suiteResult;
    }
  }

  /**
   * Parse Jest output to extract test counts
   */
  parseJestOutput(output) {
    const summary = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
    };

    // Look for Jest summary pattern
    const summaryMatch = output.match(/(\d+) passing|(\d+) failed|(\d+) skipped/gi);
    
    // More flexible parsing
    const passMatch = output.match(/(\d+)\s+passing/i);
    const failMatch = output.match(/(\d+)\s+failing/i);
    const skipMatch = output.match(/(\d+)\s+skipped/i);

    if (passMatch) summary.passedTests = parseInt(passMatch[1]);
    if (failMatch) summary.failedTests = parseInt(failMatch[1]);
    if (skipMatch) summary.skippedTests = parseInt(skipMatch[1]);

    summary.totalTests = summary.passedTests + summary.failedTests + summary.skippedTests;

    // If no matches, try to extract from test results
    if (summary.totalTests === 0) {
      const testMatch = output.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+failed/);
      if (testMatch) {
        summary.passedTests = parseInt(testMatch[1]);
        summary.failedTests = parseInt(testMatch[2]);
        summary.totalTests = summary.passedTests + summary.failedTests;
      }
    }

    return summary;
  }

  /**
   * Update overall summary statistics
   */
  updateSummary(testSummary) {
    this.results.summary.totalTests += testSummary.totalTests;
    this.results.summary.passedTests += testSummary.passedTests;
    this.results.summary.failedTests += testSummary.failedTests;
    this.results.summary.skippedTests += testSummary.skippedTests;
  }

  /**
   * Run all test suites
   */
  async runAllTests() {
    console.log(`\n${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}       CI/CD TEST ORCHESTRATION - WhatsApp Bot Linda${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════${colors.reset}\n`);

    this.log('Starting test orchestration...', 'info');

    // Phase 4 Test Suites (as defined in actual test files)
    const testSuites = [
      {
        name: 'Core Functionality Tests (M1)',
        command: 'npm test -- --testPathPattern="core.test.js" --verbose',
        timeout: 30000
      },
      {
        name: 'Security Tests (M2)',
        command: 'npm test -- --testPathPattern="security.test.js" --verbose',
        timeout: 30000
      },
      {
        name: 'Performance Tests (M4)',
        command: 'npm test -- --testPathPattern="performance.test.js" --verbose',
        timeout: 45000
      },
      {
        name: 'Message Parsing Tests',
        command: 'npm test -- --testPathPattern="message-parsing" --verbose',
        timeout: 30000
      },
      {
        name: 'Command Execution Tests',
        command: 'npm test -- --testPathPattern="command-execution" --verbose',
        timeout: 30000
      },
      {
        name: 'Database Query Tests',
        command: 'npm test -- --testPathPattern="database-queries" --verbose',
        timeout: 30000
      },
      {
        name: 'Contact Sync Tests',
        command: 'npm test -- --testPathPattern="contact-sync" --verbose',
        timeout: 30000
      },
      {
        name: 'Concurrent Operations Tests',
        command: 'npm test -- --testPathPattern="concurrent" --verbose',
        timeout: 45000
      },
      {
        name: 'Memory & GC Tests',
        command: 'npm test -- --testPathPattern="memory|gc" --verbose',
        timeout: 45000
      },
    ];

    console.log(`${colors.white}Execution Plan:${colors.reset}`);
    testSuites.forEach((suite, idx) => {
      console.log(`  ${idx + 1}. ${suite.name}`);
    });
    console.log('');

    // Run all suites sequentially
    for (const suite of testSuites) {
      await this.runTest(suite.name, suite.command, { timeout: suite.timeout });
      console.log('');
    }

    this.results.summary.duration = Date.now() - this.startTime;
  }

  /**
   * Generate final report
   */
  generateReport() {
    console.log(`${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}                    TEST EXECUTION SUMMARY${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════${colors.reset}\n`);

    // Overall statistics
    console.log(`${colors.white}Test Statistics:${colors.reset}`);
    console.log(`  Total Tests:    ${this.results.summary.totalTests}`);
    console.log(`  Passed:         ${colors.green}${this.results.summary.passedTests}${colors.reset}`);
    console.log(`  Failed:         ${colors.red}${this.results.summary.failedTests}${colors.reset}`);
    console.log(`  Skipped:        ${colors.yellow}${this.results.summary.skippedTests}${colors.reset}`);
    console.log(`  Duration:       ${(this.results.summary.duration / 1000).toFixed(2)}s`);

    // Suite breakdown
    console.log(`\n${colors.white}Suite Results:${colors.reset}`);
    for (const suite of this.results.suites) {
      const status = suite.status === 'PASS' ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ ${suite.status}${colors.reset}`;
      console.log(`  ${status} - ${suite.name}`);
      if (suite.testCounts && suite.testCounts.totalTests > 0) {
        console.log(`      (${suite.testCounts.passedTests}/${suite.testCounts.totalTests} tests)`);
      }
    }

    // Overall status
    console.log(`\n${colors.white}Overall Status:${colors.reset}`);
    if (this.results.summary.overallStatus === 'PASS') {
      console.log(`  ${colors.green}✅ ALL TESTS PASSED - Ready for deployment${colors.reset}`);
    } else if (this.results.summary.failedTests > 0) {
      console.log(`  ${colors.red}❌ TEST FAILURES - Fix required before deployment${colors.reset}`);
    } else {
      console.log(`  ${colors.yellow}⚠️  EXECUTION ERRORS - Review logs${colors.reset}`);
    }

    // GitHub Actions output (for CI/CD feedback)
    console.log(`\n${colors.cyan}GitHub Actions Output:${colors.reset}`);
    console.log(`::set-output name=status::${this.results.summary.overallStatus}`);
    console.log(`::set-output name=passed::${this.results.summary.passedTests}`);
    console.log(`::set-output name=failed::${this.results.summary.failedTests}`);

    // Save JSON report
    const reportPath = 'test-results.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📝 Full report saved to: ${reportPath}`);
  }
}

/**
 * Main execution
 */
async function main() {
  const orchestrator = new TestOrchestrator();

  try {
    await orchestrator.runAllTests();
    orchestrator.generateReport();

    // Exit with appropriate code
    process.exit(orchestrator.results.summary.overallStatus === 'PASS' ? 0 : 1);
  } catch (error) {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

main();
