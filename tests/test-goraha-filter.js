import GorahaServicesBridge from './code/utils/GorahaServicesBridge.js';
import GoogleServiceAccountManager from './code/utils/GoogleServiceAccountManager.js';

console.log('🧪 Testing New GorahaBot Filter Features...\n');

const gsa = new GoogleServiceAccountManager();
const goraha = new GorahaServicesBridge();

(async () => {
  try {
    console.log('📝 Step 1: Initialize GorahaBot bridge');
    const initialized = await goraha.initialize(gsa);
    console.log('   Status:', initialized ? '✅ Initialized' : '❌ Failed');
    
    console.log('\n📝 Step 2: Get Total Contact Count');
    const totalCount = await goraha.getTotalContactCount();
    console.log('   Total Contacts:', totalCount || 'N/A');
    
    console.log('\n📝 Step 3: Get Filtered Contacts - "D2 Security"');
    const d2Results = await goraha.getFilteredContacts('D2 Security');
    console.log('   Filter String:', d2Results.filterString);
    console.log('   Matches Found:', d2Results.totalMatched);
    if (d2Results.error) {
      console.log('   Error:', d2Results.error);
    }
    if (d2Results.contacts && d2Results.contacts.length > 0) {
      console.log('   Sample Results:');
      d2Results.contacts.slice(0, 3).forEach((contact, i) => {
        const name = contact.names?.[0]?.displayName || 'Unknown';
        console.log(`     ${i + 1}. ${name}`);
      });
    }
    
    console.log('\n📝 Step 4: Get Filtered Contacts - "Broker"');
    const brokerResults = await goraha.getFilteredContacts('Broker');
    console.log('   Filter String:', brokerResults.filterString);
    console.log('   Matches Found:', brokerResults.totalMatched);
    if (brokerResults.error) {
      console.log('   Error:', brokerResults.error);
    }
    
    console.log('\n✅ All new GorahaBot filter features working!');
    
  } catch (err) {
    console.log('❌ Error:', err.message);
  }
})();
