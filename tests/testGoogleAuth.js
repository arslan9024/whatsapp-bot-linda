#!/usr/bin/env node

/**
 * Simple Google Auth Test
 * Tests the credentials and provides detailed debugging info
 */

import fs from 'fs';
import { google } from 'googleapis';

console.log('🔍 Google Authentication Test\n');

// Step 1: Load keys
console.log('Step 1: Loading keys.json...');
let keys;
try {
  keys = JSON.parse(fs.readFileSync('./code/GoogleAPI/keys.json', 'utf8'));
  console.log('✅ Keys loaded successfully');
  console.log(`   Project ID: ${keys.project_id}`);
  console.log(`   Client Email: ${keys.client_email}`);
  console.log(`   Private Key ID: ${keys.private_key_id}`);
  console.log(`   Private Key Length: ${keys.private_key.length} chars`);
  console.log(`   Key starts with: ${keys.private_key.substring(0, 30)}`);
  console.log(`   Key ends with: ${keys.private_key.substring(keys.private_key.length - 30)}`);
} catch (error) {
  console.error('❌ Failed to load keys:', error.message);
  process.exit(1);
}

// Step 2: Create GoogleAuth instance
console.log('\nStep 2: Creating GoogleAuth instance...');
let auth;
try {
  auth = new google.auth.GoogleAuth({
    credentials: keys,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]
  });
  console.log('✅ GoogleAuth instance created');
} catch (error) {
  console.error('❌ Failed to create GoogleAuth:', error.message);
  process.exit(1);
}

// Step 3: Get access token
console.log('\nStep 3: Getting access token...');
try {
  const token = await auth.getAccessToken();
  console.log('✅ Access token obtained successfully');
  console.log(`   Token type: ${typeof token}`);
  console.log(`   Token preview: ${token?.token?.substring(0, 50)}...`);
} catch (error) {
  console.error('❌ Failed to get access token:', error.message);
  console.error('   Full error:', error);
  process.exit(1);
}

// Step 4: Try to access Sheets API
console.log('\nStep 4: Testing Sheets API access...');
try {
  const sheets = google.sheets({ version: 'v4', auth });
  
  // Use the Akoya organized sheet ID
  const ORGANIZED_SHEET_ID = '1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk';
  
  console.log(`   Attempting to get spreadsheet metadata...`);
  const response = await sheets.spreadsheets.get({
    spreadsheetId: ORGANIZED_SHEET_ID,
  });
  
  console.log('✅ Sheets API access successful');
  console.log(`   Spreadsheet title: ${response.data.properties.title}`);
  console.log(`   Sheets count: ${response.data.sheets.length}`);
  response.data.sheets.forEach((sheet, idx) => {
    console.log(`      ${idx + 1}. ${sheet.properties.title}`);
  });
} catch (error) {
  console.error('❌ Failed to access Sheets API:', error.message);
  console.error('   Full error:', error);
  process.exit(1);
}

console.log('\n✅ All authentication tests passed!');
