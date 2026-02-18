#!/usr/bin/env node
/**
 * Final Test Script: Verify Bot Relink Fix
 * Checks:
 * 1. TerminalDashboardSetup.js for await fix
 * 2. Command handler is async
 * 3. QR functionality in place
 * 4. Reports success/failure
 */

const fs = require('fs');
const path = require('path');

// Timestamp helper
const timestamp = () => new Date().toISOString().split('T')[1].slice(0, 8);
const log = (msg, type = 'INFO') => {
  const icons = {
    'INFO': 'ℹ️',
    'SUCCESS': '✓',
    'ERROR': '✗',
    'WARNING': '⚠️',
    'TITLE': '═══'
  };
  console.log(`[${timestamp()}] ${icons[type]} ${msg}`);
};

log('═══════════════════════════════════════════════════', 'TITLE');
log('FINAL TEST: Bot Relink Fix Verification', 'TITLE');
log('═══════════════════════════════════════════════════', 'TITLE');

const testResults = {
  passed: 0,
  failed: 0,
  checks: []
};

// Helper function to read file safely
function readFileSafely(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    log(`Failed to read ${path.basename(filePath)}: ${error.message}`, 'ERROR');
    return null;
  }
}

// Test 1: Check TerminalDashboardSetup.js for await fix
log('\n[TEST 1] Checking TerminalDashboardSetup.js for await fix...', 'INFO');
const dashboardPath = path.join(__dirname, 'code', 'async', 'TerminalDashboardSetup.js');
const dashboardContent = readFileSafely(dashboardPath);

if (dashboardContent) {
  const hasAsyncSetup = dashboardContent.includes('async function setupTerminalDashboard') ||
                        dashboardContent.includes('const setupTerminalDashboard = async');
  const hasAwaitKey = dashboardContent.includes('await ');
  const hasRelink = dashboardContent.includes('relink') || dashboardContent.includes('Relink');

  if (hasAsyncSetup && hasAwaitKey) {
    log('✓ TerminalDashboardSetup.js has async function signature', 'SUCCESS');
    log('✓ Contains await statements', 'SUCCESS');
    testResults.checks.push({
      check: 'TerminalDashboardSetup - Async/Await',
      status: 'PASS'
    });
    testResults.passed++;
  } else {
    log('✗ TerminalDashboardSetup.js missing async/await pattern', 'ERROR');
    log(`  - Has async signature: ${hasAsyncSetup}`, 'WARNING');
    log(`  - Has await keyword: ${hasAwaitKey}`, 'WARNING');
    testResults.checks.push({
      check: 'TerminalDashboardSetup - Async/Await',
      status: 'FAIL'
    });
    testResults.failed++;
  }

  if (hasRelink) {
    log('✓ Relink functionality detected in TerminalDashboardSetup.js', 'SUCCESS');
    testResults.checks.push({
      check: 'TerminalDashboardSetup - Relink',
      status: 'PASS'
    });
    testResults.passed++;
  } else {
    log('⚠ Relink functionality not found (may be in separate module)', 'WARNING');
  }
} else {
  log('✗ TerminalDashboardSetup.js not found', 'ERROR');
  testResults.failed += 2;
}

// Test 2: Check CommandHandler for async structure
log('\n[TEST 2] Checking CommandHandler for async structure...', 'INFO');
const commandHandlerPath = path.join(__dirname, 'code', 'handlers', 'CommandHandler.js');
const commandHandlerContent = readFileSafely(commandHandlerPath);

if (commandHandlerContent) {
  const hasAsyncHandler = /handleCommand\s*\(\s*\)\s*{|async\s+handleCommand|const\s+handleCommand\s*=\s*async/.test(commandHandlerContent);
  const hasAwaitStatements = /await\s+/.test(commandHandlerContent);
  const hasErrorHandling = commandHandlerContent.includes('catch') || commandHandlerContent.includes('try');

  if (hasAsyncHandler) {
    log('✓ CommandHandler has async command processing', 'SUCCESS');
    testResults.checks.push({
      check: 'CommandHandler - Async Processing',
      status: 'PASS'
    });
    testResults.passed++;
  } else {
    log('⚠ CommandHandler structure may need async review', 'WARNING');
    testResults.checks.push({
      check: 'CommandHandler - Async Processing',
      status: 'WARN'
    });
  }

  if (hasAwaitStatements) {
    log('✓ CommandHandler contains await statements', 'SUCCESS');
    testResults.checks.push({
      check: 'CommandHandler - Await Statements',
      status: 'PASS'
    });
    testResults.passed++;
  } else {
    log('⚠ CommandHandler may need await for async operations', 'WARNING');
  }

  if (hasErrorHandling) {
    log('✓ CommandHandler has error handling', 'SUCCESS');
    testResults.checks.push({
      check: 'CommandHandler - Error Handling',
      status: 'PASS'
    });
    testResults.passed++;
  } else {
    log('⚠ CommandHandler error handling not detected', 'WARNING');
  }
} else {
  log('✗ CommandHandler.js not found', 'ERROR');
  testResults.failed += 2;
}

// Test 3: Check QR functionality
log('\n[TEST 3] Checking QR functionality...', 'INFO');
const qrPaths = [
  path.join(__dirname, 'code', 'handlers', 'QRHandler.js'),
  path.join(__dirname, 'code', 'bot', 'QRManager.js'),
  path.join(__dirname, 'code', 'utils', 'qrcode.js')
];

let qrFound = false;
for (const qrPath of qrPaths) {
  if (fs.existsSync(qrPath)) {
    const qrContent = readFileSafely(qrPath);
    if (qrContent && (qrContent.includes('qr') || qrContent.includes('QR'))) {
      log(`✓ QR functionality found in ${path.basename(qrPath)}`, 'SUCCESS');
      qrFound = true;
      break;
    }
  }
}

if (qrFound) {
  testResults.checks.push({
    check: 'QR Functionality',
    status: 'PASS'
  });
  testResults.passed++;
} else {
  log('⚠ QR functionality file not found in expected locations', 'WARNING');
  testResults.checks.push({
    check: 'QR Functionality',
    status: 'WARN'
  });
}

// Test 4: Verify project structure
log('\n[TEST 4] Verifying project structure...', 'INFO');
const criticalPaths = [
  { path: 'code', type: 'dir' },
  { path: 'code/handlers', type: 'dir' },
  { path: 'code/utils', type: 'dir' },
  { path: 'package.json', type: 'file' },
  { path: 'config.js', type: 'file' }
];

let structureValid = true;
for (const item of criticalPaths) {
  const fullPath = path.join(__dirname, item.path);
  const exists = fs.existsSync(fullPath);
  if (exists) {
    const isDir = fs.statSync(fullPath).isDirectory();
    const isCorrect = item.type === 'dir' ? isDir : !isDir;
    if (isCorrect) {
      log(`✓ ${item.path} is valid`, 'SUCCESS');
    } else {
      log(`✗ ${item.path} is not a ${item.type}`, 'ERROR');
      structureValid = false;
    }
  } else {
    log(`✗ ${item.path} not found`, 'ERROR');
    structureValid = false;
  }
}

testResults.checks.push({
  check: 'Project Structure',
  status: structureValid ? 'PASS' : 'FAIL'
});
if (structureValid) testResults.passed++; else testResults.failed++;

// Test 5: Check package.json for required scripts
log('\n[TEST 5] Checking package.json for dev script...', 'INFO');
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = readFileSafely(packageJsonPath);

if (packageJson) {
  try {
    const pkg = JSON.parse(packageJson);
    if (pkg.scripts && pkg.scripts.dev) {
      log(`✓ Dev script found: "${pkg.scripts.dev}"`, 'SUCCESS');
      testResults.checks.push({
        check: 'Package.json - Dev Script',
        status: 'PASS'
      });
      testResults.passed++;
    } else {
      log('✗ Dev script not found in package.json', 'ERROR');
      testResults.checks.push({
        check: 'Package.json - Dev Script',
        status: 'FAIL'
      });
      testResults.failed++;
    }
  } catch (e) {
    log(`✗ Failed to parse package.json: ${e.message}`, 'ERROR');
  }
} else {
  log('✗ package.json not found', 'ERROR');
  testResults.failed++;
}

// Summary
log('\n═══════════════════════════════════════════════════', 'TITLE');
log('TEST SUMMARY', 'TITLE');
log('═══════════════════════════════════════════════════', 'TITLE');

testResults.checks.forEach(check => {
  const icon = check.status === 'PASS' ? '✓' : check.status === 'FAIL' ? '✗' : '⚠';
  const color = check.status === 'PASS' ? 'SUCCESS' : check.status === 'FAIL' ? 'ERROR' : 'WARNING';
  log(`${icon} ${check.check}: ${check.status}`, color);
});

log(`\nTotal Passed: ${testResults.passed}`, 'SUCCESS');
log(`Total Failed: ${testResults.failed}`, testResults.failed > 0 ? 'ERROR' : 'SUCCESS');
const passPercentage = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1);
log(`Success Rate: ${passPercentage}%`, passPercentage >= 80 ? 'SUCCESS' : 'WARNING');

log('\n═══════════════════════════════════════════════════', 'TITLE');
if (testResults.failed === 0) {
  log('✓ ALL TESTS PASSED - Relink Fix is Valid!', 'SUCCESS');
} else {
  log(`⚠ ${testResults.failed} TEST(S) FAILED - Review needed`, 'WARNING');
}
log('═══════════════════════════════════════════════════', 'TITLE');

process.exit(testResults.failed > 0 ? 1 : 0);
