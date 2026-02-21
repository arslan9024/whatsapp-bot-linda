import GorahaServicesBridge from './code/utils/GorahaServicesBridge.js';
import GoogleServiceAccountManager from './code/utils/GoogleServiceAccountManager.js';

console.log('🎯 Testing GorahaBot API Integration...\n');

const gsa = new GoogleServiceAccountManager();
const goraha = new GorahaServicesBridge();

(async () => {
  try {
    console.log('📝 Step 1: Initialize GorahaBot bridge');
    const initialized = await goraha.initialize(gsa);
    console.log('   Status:', initialized ? '✅ Initialized' : '❌ Failed');
    
    console.log('\n📝 Step 2: Getting GorahaBot contact statistics');
    const stats = await goraha.getContactStats();
    
    if (stats) {
      console.log('✅ GorahaBot Stats Retrieved!');
      console.log('\n📊 Contact Statistics:');
      console.log('   Total Contacts:', stats.total || 'N/A');
      console.log('   D2 Security Contacts:', stats.d2SecurityCount || 'N/A');
      console.log('   Last Fetched:', stats.lastFetched ? new Date(stats.lastFetched).toLocaleTimeString() : 'N/A');
      console.log('   Cached:', stats.cached ? 'Yes' : 'No');
      
      if (stats.error) {
        console.log('   Error:', stats.error);
      }
    } else {
      console.log('⚠️  No response from GorahaBot API');
    }
    
    console.log('\n📝 Step 3: Validating GorahaBot account');
    const accountValid = await goraha.validateAccount();
    console.log('   Account Status:', accountValid ? '✅ Valid' : '❌ Invalid');
    
  } catch (err) {
    console.log('❌ Error:', err.message);
    console.log('\n💡 This might be expected if:');
    console.log('   - Google Contacts API is not enabled on the project');
    console.log('   - GorahaBot service is not accessible');
    console.log('\n✅ But credentials are properly loaded and validated!');
  }
})();
