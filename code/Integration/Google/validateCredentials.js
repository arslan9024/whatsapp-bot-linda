/**
 * Google API Credentials Validator
 * Verifies that Google credentials are properly configured and accessible
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

// Try multiple credential locations
const credentialLocations = [
  path.join(process.cwd(), 'code/Integration/Google/keys.json'),
  path.join(process.cwd(), 'code/GoogleAPI/keys.json'),
  process.env.GOOGLE_APPLICATION_CREDENTIALS,
];

/**
 * Validate credentials file exists and is readable
 */
function validateCredentialsFile() {
  console.log(chalk.cyan('\n🔐 GOOGLE API CREDENTIALS VALIDATOR\n'));
  console.log(chalk.gray('─'.repeat(70)));

  let foundCredentials = null;
  let foundLocation = null;

  for (const location of credentialLocations) {
    if (!location) continue;

    if (fs.existsSync(location)) {
      foundCredentials = location;
      foundLocation = location;
      break;
    }
  }

  if (!foundCredentials) {
    console.log(chalk.red('❌ CREDENTIALS NOT FOUND'));
    console.log(chalk.yellow('\nSearched locations:'));
    credentialLocations.forEach((loc) => {
      if (loc) console.log(`   • ${loc}`);
    });
    return { valid: false, path: null, data: null };
  }

  console.log(chalk.green('✓ Credentials file found'));
  console.log(`  Location: ${chalk.cyan(foundLocation)}`);

  try {
    const credentials = JSON.parse(fs.readFileSync(foundCredentials, 'utf8'));

    // Validate required fields
    const requiredFields = [
      'type',
      'project_id',
      'private_key_id',
      'private_key',
      'client_email',
      'client_id',
      'auth_uri',
      'token_uri',
    ];

    const missingFields = requiredFields.filter((field) => !credentials[field]);

    if (missingFields.length > 0) {
      console.log(chalk.red('❌ INVALID CREDENTIALS - Missing fields:'));
      missingFields.forEach((field) => {
        console.log(`   • ${field}`);
      });
      return { valid: false, path: foundLocation, data: null };
    }

    console.log(chalk.green('✓ All required fields present'));
    console.log(`  Project ID: ${chalk.cyan(credentials.project_id)}`);
    console.log(`  Service Account: ${chalk.cyan(credentials.client_email)}`);
    console.log(`  Type: ${chalk.cyan(credentials.type)}`);

    // Validate private key format
    if (!credentials.private_key.includes('BEGIN PRIVATE KEY')) {
      console.log(chalk.red('❌ Invalid private key format'));
      return { valid: false, path: foundLocation, data: null };
    }

    console.log(chalk.green('✓ Private key format valid'));

    console.log(chalk.gray('─'.repeat(70)));
    console.log(chalk.green('✅ CREDENTIALS VALIDATION PASSED\n'));

    return { valid: true, path: foundLocation, data: credentials };
  } catch (error) {
    console.log(chalk.red('❌ Error reading credentials:'), error.message);
    return { valid: false, path: foundLocation, data: null };
  }
}

export { validateCredentialsFile };

// Run validation if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateCredentialsFile();
}
