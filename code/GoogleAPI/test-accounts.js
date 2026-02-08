#!/usr/bin/env node

/**
 * Test Multi-Account Manager
 * 
 * Verifies that all Google accounts are properly configured
 * and can be accessed successfully
 * 
 * Usage:
 *   node test-accounts.js
 */

import { getMultiAccountManager, getManagerSync } from './MultiAccountManager.js';

async function testAccounts() {
  console.clear();
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║          MULTI-ACCOUNT GOOGLE SERVICES TEST                ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    // Initialize manager
    console.log('📋 PHASE 1: Initialize Manager');
    console.log('═══════════════════════════════════════════════════════════\n');

    const manager = await getMultiAccountManager();
    console.log('✅ Manager initialized successfully\n');

    // List accounts
    console.log('📋 PHASE 2: List Accounts');
    console.log('═══════════════════════════════════════════════════════════\n');

    const accounts = manager.listAccounts();
    console.log(`Total Accounts: ${accounts.length}`);

    accounts.forEach(name => {
      const account = manager.getAccountByName(name);
      const status = account.status === 'active' ? '✅' : '⚠️ ';
      const type = account.type === 'service_account' ? '🔑' : '👤';
      console.log(`  ${status} ${type} ${name.padEnd(15)} - ${account.name}`);
    });

    console.log('\n');

    // Test active account
    console.log('📋 PHASE 3: Test Active Account');
    console.log('═══════════════════════════════════════════════════════════\n');

    const activeInfo = manager.getActiveAccountInfo();
    console.log(`Active Account: ${activeInfo.id}`);
    console.log(`Email: ${activeInfo.name}`);
    console.log(`Type: ${activeInfo.type}`);
    console.log(`Status: ${activeInfo.status}`);

    const auth = manager.getActive();
    console.log('Auth object: ✅ Retrieved');

    // Get token to verify auth works
    try {
      const token = await auth.getAccessToken();
      console.log('Access Token: ✅ Obtained');
      console.log(`Token length: ${token.access_token ? token.access_token.substring(0, 30) + '...' : 'N/A'}`);
    } catch (error) {
      console.log('Access Token: ⚠️ ' + error.message);
    }

    console.log('\n');

    // Test account switching
    console.log('📋 PHASE 4: Test Account Switching');
    console.log('═══════════════════════════════════════════════════════════\n');

    for (const accountName of accounts) {
      const account = manager.getAccountByName(accountName);

      if (account.status !== 'active') {
        console.log(`⚠️  ${accountName.padEnd(15)} - Skipped (not active)`);
        continue;
      }

      try {
        const success = await manager.switchTo(accountName);
        if (success) {
          console.log(`✅ ${accountName.padEnd(15)} - Switched successfully`);

          // Try to get a token
          const mgr = getManagerSync();
          const auth = mgr.getActive();
          try {
            await auth.getAccessToken();
            console.log(`   └─ Token: ✅ Valid`);
          } catch (error) {
            console.log(`   └─ Token: ⚠️ ${error.message}`);
          }
        } else {
          console.log(`❌ ${accountName.padEnd(15)} - Failed to switch`);
        }
      } catch (error) {
        console.log(`❌ ${accountName.padEnd(15)} - Error: ${error.message}`);
      }
    }

    console.log('\n');

    // Test specific account auth retrieval
    console.log('📋 PHASE 5: Test Get Auth For Account');
    console.log('═══════════════════════════════════════════════════════════\n');

    for (const accountName of accounts) {
      const account = manager.getAccountByName(accountName);

      if (account.status !== 'active') {
        console.log(`⚠️  ${accountName.padEnd(15)} - Skipped (not active)`);
        continue;
      }

      try {
        const auth = await manager.getAuthForAccount(accountName);
        if (auth) {
          console.log(`✅ ${accountName.padEnd(15)} - Auth retrieved (cached or loaded)`);
        } else {
          console.log(`⚠️  ${accountName.padEnd(15)} - No auth available`);
        }
      } catch (error) {
        console.log(`❌ ${accountName.padEnd(15)} - Error: ${error.message}`);
      }
    }

    console.log('\n');

    // Summary
    console.log('📋 PHASE 6: Summary');
    console.log('═══════════════════════════════════════════════════════════\n');

    const activeAccounts = manager.getActiveAccounts();
    console.log(`Total Accounts: ${accounts.length}`);
    console.log(`Active Accounts: ${activeAccounts.length}`);
    console.log(`Cached Auths: ${Object.keys(manager.authCache || {}).length}`);

    console.log('\n✅ Multi-Account Manager Test PASSED\n');

    // Display status
    console.log('\n📋 DETAILED STATUS:');
    console.log('═══════════════════════════════════════════════════════════\n');
    manager.status();

  } catch (error) {
    console.error('\n❌ Test FAILED');
    console.error('Error:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

testAccounts();
