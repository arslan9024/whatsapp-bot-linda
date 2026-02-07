import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

console.log('\n🔍 GOOGLE CREDENTIALS DIAGNOSTIC\n');

const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || './code/Integration/Google/keys.json';
console.log(`📍 Credentials path: ${credentialsPath}`);
console.log(`   Absolute: ${path.resolve(credentialsPath)}`);
console.log(`   Exists: ${fs.existsSync(credentialsPath)}\n`);

try {
    // Load credentials
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    
    console.log('✅ Credentials file loaded successfully\n');
    console.log('📊 Credentials content:');
    console.log(`   Type: ${credentials.type}`);
    console.log(`   Project: ${credentials.project_id}`);
    console.log(`   Client Email: ${credentials.client_email}`);
    console.log(`   Key ID: ${credentials.private_key_id}\n`);
    
    console.log('🔑 Private Key Analysis:');
    const keyLines = credentials.private_key.split('\n');
    console.log(`   Lines: ${keyLines.length}`);
    console.log(`   First line: ${keyLines[0]}`);
    console.log(`   Last line: ${keyLines[keyLines.length - 1]}`);
    console.log(`   Key body length: ${keyLines.slice(1, -1).join('').length} chars\n`);
    
    // Try to authenticate
    console.log('🔐 Testing authentication...\n');
    
    const auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const client = await auth.getClient();
    console.log('✅ Authentication successful!');
    console.log(`   Client type: ${client.constructor.name}`);
    
    const token = await auth.getAccessToken();
    console.log('✅ Access token obtained!');
    console.log(`   Token length: ${token.length} chars`);
    console.log('\n✨ ALL SYSTEMS GO - Ready to create sheets!\n');
    
} catch (err) {
    console.log('❌ Error occurred!');
    console.log(`   Error: ${err.message}`);
    if (err.code) console.log(`   Code: ${err.code}`);
    console.log();
    
    if (err.message.includes('JWT') || err.message.includes('Signature')) {
        console.log('💡 JWT/Signature Error detected!');
        console.log('   Possible causes:');
        console.log('   1. Service account key is expired or invalid');
        console.log('   2. Private key format is corrupted');
        console.log('   3. System clock is out of sync');
        console.log('   4. Service account has been deleted or disabled\n');
    }
}
