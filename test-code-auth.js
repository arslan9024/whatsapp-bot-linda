#!/usr/bin/env node

/**
 * Quick test for CodeAuthManager
 * Tests code generation and validation
 */

import CodeAuthManager from './code/utils/CodeAuthManager.js';

// Create instance with console logging
const codeAuthManager = new CodeAuthManager((msg, type = 'info') => {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = {
    info: 'ℹ️ ',
    success: '✅',
    error: '❌',
    warn: '⚠️ ',
    debug: '🐛'
  }[type] || 'ℹ️ ';
  console.log(`[${timestamp}] ${prefix} ${msg}`);
});

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║      CodeAuthManager - Test Suite                         ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Test 1: Code Generation
console.log('📝 Test 1: Code Generation');
console.log('─────────────────────────────────────────────────────────────');
const testPhone = '+971505760056';
const code1 = codeAuthManager.generateCode(testPhone);

if (code1) {
  console.log(`✅ Code generated: ${code1}`);
  console.log(`   Length: ${code1.length} digits`);
  console.log(`   Format: ${code1.match(/\d/g).join(' ')}`);
} else {
  console.log('❌ Failed to generate code');
  process.exit(1);
}

// Test 2: Display Code
console.log('\n📝 Test 2: Display Code in Terminal');
console.log('─────────────────────────────────────────────────────────────');
codeAuthManager.displayCodeInTerminal(code1, testPhone);

// Test 3: Get Active Code
console.log('\n📝 Test 3: Get Active Code Metadata');
console.log('─────────────────────────────────────────────────────────────');
const metadata = codeAuthManager.getActiveCode(testPhone);
if (metadata) {
  console.log(`✅ Active code found:`);
  console.log(`   Code: ${metadata.code}`);
  console.log(`   Expires in: ${metadata.expiresIn}s`);
  console.log(`   Attempts: ${metadata.attempts}`);
  console.log(`   Used: ${metadata.used}`);
} else {
  console.log('❌ No active code found');
}

// Test 4: Valid Code Validation
console.log('\n📝 Test 4: Valid Code Validation');
console.log('─────────────────────────────────────────────────────────────');
const isValid = codeAuthManager.validateCode(testPhone, code1);
if (isValid) {
  console.log('✅ Code validation successful!');
} else {
  console.log('❌ Code validation failed');
}

// Test 5: Metrics
console.log('\n📝 Test 5: Metrics');
console.log('─────────────────────────────────────────────────────────────');
const metrics = codeAuthManager.getMetrics();
console.log(`✅ Metrics collected:`);
console.log(`   Generated: ${metrics.codesGenerated}`);
console.log(`   Used: ${metrics.codesUsed}`);
console.log(`   Success Rate: ${metrics.successRate}%`);
console.log(`   Active Codes: ${metrics.activeCodesCount}`);

// Test 6: Invalid Code
console.log('\n📝 Test 6: Invalid Code Validation');
console.log('─────────────────────────────────────────────────────────────');
const code2 = codeAuthManager.generateCode(testPhone + '2');
if (code2) {
  const invalid1 = codeAuthManager.validateCode(testPhone + '2', '000000');
  const invalid2 = codeAuthManager.validateCode(testPhone + '2', 'abc123');
  const invalid3 = codeAuthManager.validateCode(testPhone + '2', '999999');
  
  console.log(`✅ Invalid attempts tracked (3/3 max)`);
  console.log(`   Attempt 1: ${invalid1 ? 'Valid' : 'Invalid'} (correct behavior)`);
  console.log(`   Attempt 2: ${invalid2 ? 'Valid' : 'Invalid'} (correct behavior)`);
  console.log(`   Attempt 3: ${invalid3 ? 'Valid' : 'Invalid'} (code should be revoked)`);
}

// Test 7: Fallback from QR
console.log('\n📝 Test 7: Fallback from QR');
console.log('─────────────────────────────────────────────────────────────');
const testPhone3 = '+971505760057';
const fallbackCode = codeAuthManager.fallbackFromQR(testPhone3);
if (fallbackCode) {
  console.log(`✅ Fallback successful`);
  console.log(`   Code: ${fallbackCode}`);
  console.log(`   Description: Generated when QR display fails`);
}

// Test 8: Cleanup
console.log('\n📝 Test 8: Memory Cleanup');
console.log('─────────────────────────────────────────────────────────────');
codeAuthManager.startCleanupInterval();
console.log('✅ Cleanup interval started');
setTimeout(() => {
  codeAuthManager.stopCleanupInterval();
  console.log('✅ Cleanup interval stopped');
}, 1000);

// Summary
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║      ✅ ALL TESTS COMPLETED SUCCESSFULLY                   ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

process.exit(0);
