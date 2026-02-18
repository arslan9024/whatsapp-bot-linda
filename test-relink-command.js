#!/usr/bin/env node

/**
 * Test Script: Relink Master Command Handler
 * 
 * This script:
 * 1. Starts the WhatsApp-Bot-Linda bot in a child process
 * 2. Sends the "relink master +971505760056" command
 * 3. Captures output for 15 seconds
 * 4. Checks for success/failure indicators
 * 5. Reports results and exits gracefully
 * 
 * Status: Production Ready
 * Created: February 18, 2026
 */

import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testStartTime = new Date();
const testLogFile = createWriteStream(resolve(__dirname, 'test-relink-output.log'), { flags: 'w' });

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

/**
 * Log message with timestamp and color
 */
function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  const colorCode = colors[color] || colors.reset;
  const resetCode = colors.reset;
  const output = `${colorCode}${timestamp} | ${message}${resetCode}`;
  
  console.log(output);
  testLogFile.write(`${timestamp} | ${message}\n`);
}

/**
 * Log section header
 */
function logSection(title) {
  const separator = '═'.repeat(70);
  log('', 'reset');
  log(separator, 'cyan');
  log(`  ${title}`, 'cyan');
  log(separator, 'cyan');
  log('', 'reset');
}

/**
 * Check for indicators in captured output
 */
function analyzeOutput(allOutput) {
  const analysis = {
    success: [],
    failures: [],
    warnings: [],
    allOutput: allOutput,
  };

  // Success indicators
  if (allOutput.includes('Creating new client')) {
    analysis.success.push('✅ Creating new client');
  }
  if (allOutput.includes('Setting up qr flow')) {
    analysis.success.push('✅ Setting up qr flow');
  }
  if (allOutput.includes('Connection manager created')) {
    analysis.success.push('✅ Connection manager created');
  }
  if (allOutput.includes('Fresh client')) {
    analysis.success.push('✅ Fresh client creation');
  }
  if (allOutput.includes('Initializing fresh client')) {
    analysis.success.push('✅ Initializing fresh client');
  }
  if (allOutput.includes('QR code')) {
    analysis.success.push('✅ QR code handling detected');
  }
  if (allOutput.includes('Clearing old session')) {
    analysis.success.push('✅ Old session cleanup');
  }

  // Failure indicators (should NOT appear)
  if (allOutput.includes('client.on is not a function')) {
    analysis.failures.push('❌ client.on is not a function');
  }
  if (allOutput.includes('failed to relink')) {
    analysis.failures.push('❌ Failed to relink message detected');
  }
  if (allOutput.includes('Failed to relink')) {
    analysis.failures.push('❌ Failed to relink (capitalized)');
  }
  if (allOutput.includes('Error:') && allOutput.includes('relink')) {
    analysis.failures.push('❌ Relink error detected');
  }
  if (allOutput.includes('Cannot read property')) {
    analysis.failures.push('❌ Property read error');
  }
  if (allOutput.includes('TypeError')) {
    analysis.failures.push('❌ TypeError detected');
  }

  // Warnings
  if (allOutput.includes('Warning')) {
    analysis.warnings.push('⚠️  Warning message detected');
  }
  if (allOutput.includes('undefined')) {
    analysis.warnings.push('⚠️  Undefined reference');
  }

  return analysis;
}

/**
 * Main test execution
 */
async function runTest() {
  return new Promise((resolve) => {
    logSection('WhatsApp-Bot-Linda Relink Command Test');
    log(`Test started at: ${testStartTime.toISOString()}`, 'cyan');
    log(`Command to test: relink master +971505760056`, 'blue');
    log('', 'reset');

    // Start the bot process
    log('Starting bot process...', 'yellow');
    const botProcess = spawn('node', ['index.js'], {
      cwd: resolve(__dirname),
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
    });

    let capturedOutput = '';
    let commandSent = false;
    let testDuration = 15000; // 15 seconds
    let testTimer = null;

    // Capture stdout
    botProcess.stdout.on('data', (data) => {
      const output = data.toString();
      capturedOutput += output;
      process.stdout.write(output); // Show live output
    });

    // Capture stderr
    botProcess.stderr.on('data', (data) => {
      const output = data.toString();
      capturedOutput += output;
      process.stderr.write(output); // Show live errors
    });

    // Bot process exit handler
    botProcess.on('exit', (code, signal) => {
      log(`Bot process exited with code ${code} (signal: ${signal})`, 'yellow');
      if (testTimer) clearTimeout(testTimer);
      processResults(capturedOutput, code);
      resolve();
    });

    // Bot process error handler
    botProcess.on('error', (error) => {
      log(`Failed to start bot process: ${error.message}`, 'red');
      if (testTimer) clearTimeout(testTimer);
      processResults(capturedOutput, 1);
      resolve();
    });

    // Wait for bot to start, then send command
    setTimeout(() => {
      if (!commandSent) {
        commandSent = true;
        log('Bot startup complete, sending test command...', 'yellow');
        log('Sending: "relink master +971505760056"', 'cyan');
        botProcess.stdin.write('relink master +971505760056\n');
        log('Command sent to bot stdin', 'green');
        log('', 'reset');
      }
    }, 2000);

    // Set test timeout
    testTimer = setTimeout(() => {
      log('', 'reset');
      log('Test duration complete (15 seconds reached)', 'yellow');
      log('Shutting down bot process...', 'yellow');
      
      // Try graceful shutdown first
      try {
        botProcess.stdin.write('exit\n');
      } catch (e) {
        // Ignore
      }
      
      setTimeout(() => {
        try {
          botProcess.kill('SIGTERM');
        } catch (e) {
          // Already dead
        }
      }, 2000);
    }, testDuration);
  });
}

/**
 * Process and display test results
 */
function processResults(output, exitCode) {
  logSection('Test Results & Analysis');
  
  const analysis = analyzeOutput(output);

  // Overall status
  log('', 'reset');
  log('📊 ANALYSIS SUMMARY', 'cyan');
  log('─'.repeat(70), 'cyan');
  
  if (analysis.failures.length > 0) {
    log(`Status: FAILED ❌`, 'red');
    log(`Failures detected: ${analysis.failures.length}`, 'red');
    analysis.failures.forEach(f => log(`  ${f}`, 'red'));
  } else if (analysis.success.length >= 3) {
    log(`Status: SUCCESS ✅`, 'green');
    log(`Positive indicators found: ${analysis.success.length}`, 'green');
    analysis.success.forEach(s => log(`  ${s}`, 'green'));
  } else {
    log(`Status: INCONCLUSIVE ⚠️`, 'yellow');
    log(`Positive indicators found: ${analysis.success.length}`, 'yellow');
    analysis.success.forEach(s => log(`  ${s}`, 'yellow'));
  }

  if (analysis.warnings.length > 0) {
    log('', 'reset');
    log('⚠️  Warnings detected:', 'yellow');
    analysis.warnings.forEach(w => log(`  ${w}`, 'yellow'));
  }

  // Full output summary
  log('', 'reset');
  log('📝 FULL CAPTURED OUTPUT', 'cyan');
  log('─'.repeat(70), 'cyan');
  log('', 'reset');
  
  if (output.length > 0) {
    const lines = output.split('\n');
    log(`Total output lines: ${lines.length}`, 'blue');
    log(`Total output size: ${output.length} bytes`, 'blue');
    log('', 'reset');
    log('Last 50 lines of output:', 'cyan');
    log('─'.repeat(70), 'cyan');
    const lastLines = lines.slice(Math.max(0, lines.length - 50));
    lastLines.forEach(line => {
      if (line.trim()) {
        console.log(line);
        testLogFile.write(line + '\n');
      }
    });
  } else {
    log('⚠️  No output captured', 'yellow');
  }

  // Test metadata
  log('', 'reset');
  logSection('Test Metadata');
  log(`Started: ${testStartTime.toISOString()}`, 'blue');
  log(`Ended: ${new Date().toISOString()}`, 'blue');
  log(`Duration: ${new Date() - testStartTime}ms`, 'blue');
  log(`Bot exit code: ${exitCode}`, 'blue');
  log(`Full log saved to: test-relink-output.log`, 'cyan');
  log('', 'reset');

  // Recommendations
  log('', 'reset');
  logSection('Recommendations');
  if (analysis.failures.length > 0) {
    log('🔧 Issues Found - Recommended Actions:', 'yellow');
    analysis.failures.forEach(failure => {
      if (failure.includes('is not a function')) {
        log('  1. Check that all client event handlers are properly bound', 'yellow');
        log('  2. Verify ConnectionManager initialization completes before use', 'yellow');
      }
      if (failure.includes('Failed to relink')) {
        log('  1. Check bot logs for detailed error messages', 'yellow');
        log('  2. Verify phone number format is correct', 'yellow');
        log('  3. Check WhatsApp connection status', 'yellow');
      }
    });
  } else {
    log('✅ All checks passed!', 'green');
    log('Relink command appears to be functioning correctly.', 'green');
  }
  
  log('', 'reset');
  log('═'.repeat(70), 'cyan');
}

/**
 * Main execution path - Run the actual test
 */
await runTest();

// Close log file
testLogFile.end();
log('Test script completed', 'cyan');
process.exit(0);
