#!/usr/bin/env node
/**
 * Phase 22 Credential Verification Test
 * Tests that GoogleServiceAccountManager can load credentials from .env
 */

import GoogleServiceAccountManager from './code/utils/GoogleServiceAccountManager.js';

const gsa = new GoogleServiceAccountManager();

console.log('\n🔐 PHASE 22 - CREDENTIAL VERIFICATION TEST\n');
console.log('═'.repeat(70));

// Test 1: List available accounts
console.log('\n📋 TEST 1: Available Accounts');
const accounts = gsa.listAvailableAccounts();
console.log(`  Found: ${accounts.length} account(s)`);
if (accounts.length > 0) {
  accounts.forEach(acc => console.log(`    ✅ ${acc}`));
} else {
  console.log('    ❌ No accounts found');
}

// Test 2: Check credential sources
console.log('\n🔍 TEST 2: Credential Sources');
const sources = {
  'GOOGLE_ACCOUNT_POWERAGENT_KEYS_BASE64': process.env.GOOGLE_ACCOUNT_POWERAGENT_KEYS_BASE64 ? 'SET' : 'NOT SET',
  'GOOGLE_ACCOUNT_GORAHA_KEYS_BASE64': process.env.GOOGLE_ACCOUNT_GORAHA_KEYS_BASE64 ? 'SET' : 'NOT SET',
  'GOOGLE_ACCOUNT_SERVICEMAN11_KEYS_BASE64': process.env.GOOGLE_ACCOUNT_SERVICEMAN11_KEYS_BASE64 ? 'SET' : 'NOT SET',
};

Object.keys(sources).forEach(varName => {
  const status = sources[varName];
  const icon = status === 'SET' ? '✅' : '⚠️ ';
  console.log(`  ${icon} ${varName}: ${status}`);
});

// Test 3: Test load capability
console.log('\n⚡ TEST 3: Load Capability Check');
['poweragent', 'goraha', 'serviceman11'].forEach(account => {
  const has = gsa.hasCredentials(account);
  const icon = has ? '✅ Can Load' : '❌ Cannot Load';
  console.log(`  ${icon} ${account}`);
});

// Test 4: Print security summary
console.log('\n📊 TEST 4: Security Summary');
gsa.printSecuritySummary();

console.log('═'.repeat(70));
console.log('✅ Verification Test Complete\n');
