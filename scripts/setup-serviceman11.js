/**
 * Serviceman11 Setup Helper
 * 
 * Automates the setup process for serviceman11 account:
 * 1. Creates directory structure
 * 2. Validates keys.json
 * 3. Updates accounts.config.json
 * 4. Provides next steps
 * 
 * Usage:
 *   node setup-serviceman11.js /path/to/keys.json YOUR_NEW_SHEET_ID
 * 
 * Example:
 *   node setup-serviceman11.js C:\Downloads\keys.json 1a2b3c4d5e6f7g8h9i0j
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function setupServiceman11(keysPath, sheetId) {
  console.log('\n' + '='.repeat(70));
  console.log('  🔧 SERVICEMAN11 SETUP HELPER');
  console.log('='.repeat(70) + '\n');

  try {
    // Step 1: Validate inputs
    console.log('📋 Step 1: Validating inputs...\n');

    if (!keysPath || !sheetId) {
      console.error('❌ Error: Missing required arguments\n');
      console.error('Usage: node setup-serviceman11.js /path/to/keys.json YOUR_SHEET_ID\n');
      console.error('Example: node setup-serviceman11.js C:\\Downloads\\keys.json 1a2b3c4d5e6f7g8h9i0j\n');
      process.exit(1);
    }

    // Validate keys.json exists
    if (!fs.existsSync(keysPath)) {
      console.error(`❌ Error: keys.json not found at ${keysPath}\n`);
      process.exit(1);
    }

    // Validate keys.json is valid JSON
    let keysJson;
    try {
      keysJson = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
    } catch (e) {
      console.error('❌ Error: keys.json is not valid JSON\n');
      console.error('Details:', e.message, '\n');
      process.exit(1);
    }

    // Validate required fields in keys.json
    const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email'];
    const missingFields = requiredFields.filter(field => !keysJson[field]);
    if (missingFields.length > 0) {
      console.error(`❌ Error: keys.json is missing fields: ${missingFields.join(', ')}\n`);
      process.exit(1);
    }

    console.log('✅ Inputs validated:');
    console.log(`   Keys file: ${keysPath}`);
    console.log(`   Service account: ${keysJson.client_email}`);
    console.log(`   Project ID: ${keysJson.project_id}`);
    console.log(`   Sheet ID: ${sheetId}\n`);

    // Step 2: Create directory structure
    console.log('📁 Step 2: Creating directory structure...\n');

    const serviceman11Dir = path.join(__dirname, 'code', 'Integration', 'Google', 'accounts', 'serviceman11');
    
    if (!fs.existsSync(serviceman11Dir)) {
      fs.mkdirSync(serviceman11Dir, { recursive: true });
      console.log(`✅ Created directory: ${serviceman11Dir}`);
    } else {
      console.log(`ℹ️  Directory already exists: ${serviceman11Dir}`);
    }

    // Step 3: Copy keys.json
    console.log('\n🔑 Step 3: Copying keys.json...\n');

    const targetKeysPath = path.join(serviceman11Dir, 'keys.json');
    fs.copyFileSync(keysPath, targetKeysPath);
    console.log(`✅ Copied keys.json to: ${targetKeysPath}`);

    // Step 4: Update accounts.config.json
    console.log('\n⚙️  Step 4: Updating accounts.config.json...\n');

    const configPath = path.join(__dirname, 'code', 'Integration', 'Google', 'accounts', 'accounts.config.json');

    if (!fs.existsSync(configPath)) {
      console.error(`❌ Error: accounts.config.json not found at ${configPath}`);
      console.error('\n📖 Please create it first using the template in the setup guide.\n');
      process.exit(1);
    }

    let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Check if serviceman11 already exists
    const existingAccountIndex = config.accounts.findIndex(acc => acc.id === 'serviceman11');
    
    const newAccount = {
      id: 'serviceman11',
      name: 'serviceman11',
      description: 'Service account for organized Akoya sheet - Editor access',
      type: 'service-account',
      credentialsPath: './code/Integration/Google/accounts/serviceman11/keys.json',
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
      ],
      status: 'active',
      permissions: {
        sheets: 'editor',
        drive: 'editor',
      },
      sheetAccess: {
        original_sheet_id: '1gV4-hSAhDyWsivajBb2E2DSs25CMbqhc-6oufP1ZX04',
        original_sheet_name: 'Akoya-Oxygen-2023-Arslan-only',
        organized_sheet_id: sheetId,
        organized_sheet_name: 'Akoya-Oxygen-2023-Organized',
      },
      createdAt: new Date().toISOString().split('T')[0],
      lastUsed: null,
    };

    if (existingAccountIndex >= 0) {
      console.log('ℹ️  serviceman11 account already exists in config');
      console.log('✅ Updating existing account...\n');
      config.accounts[existingAccountIndex] = newAccount;
    } else {
      console.log('✅ Adding serviceman11 account to config...\n');
      config.accounts.push(newAccount);
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`✅ Updated accounts.config.json`);
    console.log(`   Total accounts: ${config.accounts.length}`);
    console.log(`   Accounts: ${config.accounts.map(a => a.id).join(', ')}\n`);

    // Step 5: Summary and next steps
    console.log('='.repeat(70));
    console.log('  ✅ SERVICEMAN11 SETUP COMPLETE!');
    console.log('='.repeat(70) + '\n');

    console.log('📋 Setup Summary:');
    console.log(`   ✅ Directory created: code/Integration/Google/accounts/serviceman11/`);
    console.log(`   ✅ Keys copied to: ${targetKeysPath}`);
    console.log(`   ✅ Account added to: accounts.config.json`);
    console.log(`   ✅ Service account: ${keysJson.client_email}`);
    console.log(`   ✅ Organized sheet ID: ${sheetId}\n`);

    console.log('🚀 NEXT STEPS (IMPORTANT):\n');
    console.log('1️⃣  Share the new sheet with serviceman11:');
    console.log(`   a. Go to: https://docs.google.com/spreadsheets/d/${sheetId}/edit`);
    console.log(`   b. Click "Share" button (top right)`);
    console.log(`   c. Paste email: ${keysJson.client_email}`);
    console.log(`   d. Select role: "Editor"`);
    console.log(`   e. Click "Share"`);
    console.log('\n   OR run the auto-share script (if available):\n');
    console.log(`   node share-sheet-with-serviceman11.js ${sheetId}\n`);

    console.log('2️⃣  Test permissions:\n');
    console.log(`   node test-serviceman11-permissions.js ${sheetId}\n`);

    console.log('3️⃣  Run the organization script:\n');
    console.log(`   node organizeAndAnalyzeSheet.js\n`);

    console.log('4️⃣  Integrate with your bot:\n');
    console.log(`   - Update your bot code to use serviceman11 account`);
    console.log(`   - Use GoogleServiceManager.switchAccount('serviceman11')\n`);

    console.log('📚 Documentation:');
    console.log('   - SERVICEMAN11_ACCOUNT_SETUP_GUIDE.md (full setup guide)');
    console.log('   - ADVANCED_SHEET_ORGANIZATION_GUIDE.md (integration guide)\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack:', error.stack, '\n');
    process.exit(1);
  }
}

// Parse command line arguments
const keysPath = process.argv[2];
const sheetId = process.argv[3];

setupServiceman11(keysPath, sheetId);
