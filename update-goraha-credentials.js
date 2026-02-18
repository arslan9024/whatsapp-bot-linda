#!/usr/bin/env node

/**
 * Update GorahaBot Google Service Account Credentials in .env
 * Reads the fresh JSON key and encodes it as base64
 */

import fs from 'fs';
import path from 'path';

try {
  // 1. Read the fresh JSON credentials
  const jsonPath = 'C:\\Users\\HP\\Downloads\\white-caves-fb-486818-b946e38f3510.json';
  
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ JSON file not found:', jsonPath);
    process.exit(1);
  }
  
  const jsonContent = fs.readFileSync(jsonPath, 'utf8');
  const base64Encoded = Buffer.from(jsonContent).toString('base64');
  
  console.log('📝 Credentials encoding complete:');
  console.log('   File:', path.basename(jsonPath));
  console.log('   Size:', jsonContent.length, 'bytes');
  console.log('   Base64 Length:', base64Encoded.length, 'characters');
  
  // 2. Read current .env
  const envPath = '.env';
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // 3. Replace GOOGLE_ACCOUNT_GORAHA_KEYS_BASE64 value
  const newEnvLine = `GOOGLE_ACCOUNT_GORAHA_KEYS_BASE64=${base64Encoded}`;
  
  // Find and replace the line (handles line wrapping)
  const envLines = envContent.split('\n');
  let found = false;
  let result = [];
  let i = 0;
  
  while (i < envLines.length) {
    const line = envLines[i];
    
    if (line.startsWith('GOOGLE_ACCOUNT_GORAHA_KEYS_BASE64=')) {
      // Replace this line
      result.push(newEnvLine);
      found = true;
      
      // Skip any continuation lines (lines starting with spaces/tabs)
      i++;
      while (i < envLines.length && /^\s/.test(envLines[i])) {
        i++;
      }
      i--; // Back up one since the loop will increment
    } else {
      result.push(line);
    }
    
    i++;
  }
  
  if (!found) {
    console.warn('⚠️  GOOGLE_ACCOUNT_GORAHA_KEYS_BASE64 not found in .env, adding new line...');
    result.push(newEnvLine);
  }
  
  const updatedEnv = result.join('\n');
  fs.writeFileSync(envPath, updatedEnv, 'utf8');
  
  console.log('✅ .env file updated successfully!');
  console.log('   Variable: GOOGLE_ACCOUNT_GORAHA_KEYS_BASE64');
  console.log('   Status: ✅ Ready to use');
  
  // 4. Verify by reading it back
  const verification = fs.readFileSync(envPath, 'utf8');
  if (verification.includes(base64Encoded.substring(0, 50))) {
    console.log('✅ Verification: Credentials stored correctly\n');
    
    // 5. Parse and validate the JSON structure
    const credObj = JSON.parse(jsonContent);
    console.log('📊 Credentials Summary:');
    console.log('   Project ID:', credObj.project_id);
    console.log('   Client Email:', credObj.client_email);
    console.log('   Type:', credObj.type);
    console.log('   ✅ Structure Valid');
  } else {
    console.error('❌ Verification failed: Credentials not stored correctly');
    process.exit(1);
  }
  
  console.log('\n🚀 Next Step: Restart the server for changes to take effect');
  console.log('   npm start');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
