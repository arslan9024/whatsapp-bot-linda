#!/usr/bin/env node

/**
 * OAuth2 Setup Script for Google Contacts
 * 
 * This script guides you through the OAuth2 authorization process
 * for the GorahaBot account (goraha.properties@gmail.com)
 * 
 * Usage:
 *   node setup-oauth.js
 * 
 * Follow the prompts to authorize and save the token
 */

import readline from 'readline';
import open from 'open';
import { getOAuth2Handler } from './code/GoogleAPI/OAuth2Handler.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.clear();
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                  GOOGLE OAUTH2 SETUP                      ║');
  console.log('║            For: goraha.properties@gmail.com                ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  console.log('This script will help you authorize the GorahaBot account');
  console.log('for accessing Google Contacts and other Google services.\n');

  console.log('📋 Prerequisites:');
  console.log('   ✓ Have your keys-goraha.json file ready');
  console.log('   ✓ Make sure it\'s in code/GoogleAPI/ directory');
  console.log('   ✓ Have goraha.properties@gmail.com account ready\n');

  const ready = await prompt('Ready to proceed? (yes/no): ');

  if (ready.toLowerCase() !== 'yes' && ready.toLowerCase() !== 'y') {
    console.log('\n✓ Exiting setup.');
    rl.close();
    return;
  }

  try {
    console.log('\n🔄 Initializing OAuth2 handler...\n');
    const handler = await getOAuth2Handler('GorahaBot', 'keys-goraha.json');

    console.log('✅ OAuth2 handler initialized\n');

    // Get authorization URL
    console.log('🔗 Generating authorization URL...\n');
    const authUrl = handler.getAuthorizationUrl([
      'https://www.googleapis.com/auth/contacts',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]);

    console.log('📍 Authorization URL:');
    console.log(authUrl);
    console.log('\n');

    // Ask to open in browser
    const openBrowser = await prompt('Open authorization URL in browser? (yes/no): ');

    if (openBrowser.toLowerCase() === 'yes' || openBrowser.toLowerCase() === 'y') {
      console.log('\n🌐 Opening browser...');
      try {
        await open(authUrl);
      } catch (error) {
        console.log('⚠️  Could not open browser automatically.');
        console.log('Please copy and paste the URL above into your browser.');
      }
    } else {
      console.log('\n📌 Copy and paste the URL above into your browser.');
    }

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  NEXT STEPS:                                             ║');
    console.log('║  1. Log in with: goraha.properties@gmail.com             ║');
    console.log('║  2. Click "Allow" to grant permissions                  ║');
    console.log('║  3. You\'ll be redirected to a URL with an auth code    ║');
    console.log('║  4. Copy the entire URL from your browser address bar   ║');
    console.log('║  5. Paste it below (or just the code part)              ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    // Get authorization code
    const authCode = await prompt('Paste the authorization code or full redirect URL: ');

    // Extract code from URL if user pasted full URL
    let code = authCode;
    if (code.includes('code=')) {
      const match = code.match(/code=([^&]+)/);
      if (match) {
        code = match[1];
      }
    }

    if (!code) {
      console.log('❌ No authorization code found. Exiting.');
      rl.close();
      return;
    }

    console.log('\n🔄 Exchanging code for token...\n');
    const token = await handler.exchangeCodeForToken(code);

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ SUCCESS!                                             ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    console.log('Token Details:');
    console.log(`  • Access Token: ${token.access_token.substring(0, 20)}...`);
    if (token.refresh_token) {
      console.log(`  • Refresh Token: ${token.refresh_token.substring(0, 20)}...`);
    }
    if (token.expiry_date) {
      const expiryDate = new Date(token.expiry_date);
      console.log(`  • Expires: ${expiryDate.toLocaleString()}`);
    }

    console.log('\nToken saved to: .tokens/GorahaBot-token.json');
    console.log('\n✅ You can now use GorahaBot account for Google Contacts!\n');

    rl.close();

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('  • Make sure keys-goraha.json exists in code/GoogleAPI/');
    console.log('  • Verify the keys file has client_id, client_secret, redirect_uris');
    console.log('  • Check your internet connection');
    console.log('  • Try again with a fresh authorization URL\n');
    rl.close();
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\nSetup cancelled by user.');
  rl.close();
  process.exit(0);
});

main();
