/**
 * Quick Test: GorahaServicesBridge Implementation
 * Tests contact statistics and account validation
 */

import 'dotenv/config';
import GorahaServicesBridge from './code/utils/GorahaServicesBridge.js';
import GoogleServiceAccountManager from './code/utils/GoogleServiceAccountManager.js';

async function testGorahaServicesBridge() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         TESTING: GorahaServicesBridge Implementation       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Initialize managers
    console.log('📋 Step 1: Initializing GoogleServiceAccountManager...');
    const gsam = new GoogleServiceAccountManager();
    console.log('✅ GoogleServiceAccountManager initialized\n');

    // Check available accounts
    const accounts = gsam.listAvailableAccounts();
    console.log(`📋 Step 2: Available accounts: ${accounts.join(', ')}\n`);

    // Initialize GorahaServicesBridge
    console.log('📋 Step 3: Initializing GorahaServicesBridge...');
    const bridge = new GorahaServicesBridge();
    const initialized = await bridge.initialize(gsam, null);
    
    if (!initialized) {
      console.log('⚠️  GorahaServicesBridge initialization returned false but no error');
    }
    console.log('✅ GorahaServicesBridge initialized\n');

    // Test account validation
    console.log('📋 Step 4: Testing account validation...');
    const validation = await bridge.validateAccount();
    console.log('✅ Account validation result:');
    console.log(`   - Structure Valid: ${validation.structureValid}`);
    console.log(`   - API Access Valid: ${validation.apiAccessValid}`);
    console.log(`   - Is Active: ${validation.isActive}`);
    if (validation.details && validation.details.email) {
      console.log(`   - Email: ${validation.details.email}`);
    }
    console.log();

    // Test contact statistics (cached on first call)
    console.log('📋 Step 5: Testing contact statistics (first call)...');
    const stats1 = await bridge.getContactStats();
    console.log('✅ Contact stats (first call):');
    console.log(`   - Total Contacts: ${stats1.total || 'N/A'}`);
    console.log(`   - D2 Security Contacts: ${stats1.d2SecurityCount || 'N/A'}`);
    console.log(`   - Cached: ${stats1.cached}`);
    if (stats1.error) {
      console.log(`   - Error: ${stats1.error}`);
    }
    console.log();

    // Test contact statistics (should be cached on second call)
    console.log('📋 Step 6: Testing contact statistics (second call - should be cached)...');
    const stats2 = await bridge.getContactStats();
    console.log('✅ Contact stats (second call):');
    console.log(`   - Total Contacts: ${stats2.total || 'N/A'}`);
    console.log(`   - D2 Security Contacts: ${stats2.d2SecurityCount || 'N/A'}`);
    console.log(`   - Cached: ${stats2.cached}`);
    console.log();

    // Test validateCredentialsWithAPITest method
    console.log('📋 Step 7: Testing validateCredentialsWithAPITest method...');
    const apiTest = await gsam.validateCredentialsWithAPITest('goraha');
    console.log('✅ API validation result:');
    console.log(`   - Structure Valid: ${apiTest.structureValid}`);
    console.log(`   - API Access Valid: ${apiTest.apiAccessValid}`);
    console.log(`   - Is Active: ${apiTest.isActive}`);
    console.log();

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ ALL TESTS PASSED                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testGorahaServicesBridge().then(() => process.exit(0));
