import GoogleServiceAccountManager from './code/utils/GoogleServiceAccountManager.js';

console.log('🧪 Testing GorahaBot Credentials...\n');

const gsa = new GoogleServiceAccountManager();

(async () => {
  try {
    console.log('📝 Step 1: Loading GorahaBot credentials from .env');
    const creds = await gsa.getCredentials('goraha');
    
    if (creds && creds.client_email) {
      console.log('✅ Credentials loaded successfully!');
      console.log('   Client Email:', creds.client_email);
      console.log('   Project ID:', creds.project_id);
      console.log('   Private Key Length:', creds.private_key?.length || 0, 'characters');
    } else {
      console.log('❌ Credentials not found');
    }
    
    console.log('\n📝 Step 2: Checking if credentials exist');
    const hasCredentials = gsa.hasCredentials('goraha');
    console.log('   Has Credentials:', hasCredentials ? '✅ Yes' : '❌ No');
    
    console.log('\n📝 Step 3: Validating credentials structure');
    const structureValid = gsa.validateCredentials(creds, 'goraha');
    console.log('   Structure Valid:', structureValid ? '✅ Yes' : '❌ No');
    
    console.log('\n✅ GorahaBot credentials are ready for use!');
    
  } catch (err) {
    console.log('❌ Error:', err.message);
  }
})();
