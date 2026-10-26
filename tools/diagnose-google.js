#!/usr/bin/env node
/**
 * Google service-account diagnostic (restored from the archived auth diagnostic).
 *
 * For every configured account (GOOGLE_ACCOUNT_<NAME>_KEYS_BASE64 or legacy key files)
 * it checks the credential structure and requests a real access token, without printing
 * any secret. Exit code 1 when an account cannot authenticate.
 *
 *   npm run doctor:google
 *   npm run doctor:google -- --offline   # structure only, no network call
 */

import 'dotenv/config';
import GoogleServiceAccountManager from '../src/integrations/google/GoogleServiceAccountManager.js';

const offline = process.argv.includes('--offline');
const manager = new GoogleServiceAccountManager();
const accounts = manager.listAvailableAccounts();

console.log(`Google accounts found: ${accounts.length}${offline ? ' (offline check)' : ''}`);
if (!accounts.length) {
  console.log('  None configured. Add GOOGLE_ACCOUNT_<NAME>_KEYS_BASE64 to .env (base64 of the service-account JSON).');
  process.exitCode = 1;
}

let failed = 0;
for (const [index, name] of accounts.entries()) {
  let line;
  if (offline) {
    const credentials = await manager.getCredentials(name).catch(() => null);
    const valid = !!credentials && manager.validateCredentials(credentials, name);
    line = `${valid ? 'OK  ' : 'FAIL'} structure | ${credentials?.client_email || 'no credentials'} | project ${credentials?.project_id || '-'}`;
    if (!valid) failed++;
  } else {
    const result = await manager.validateCredentialsWithAPITest(name);
    const { details = {} } = result;
    line = `${result.isActive ? 'OK  ' : 'FAIL'} structure ${result.structureValid ? 'valid' : 'invalid'} | ` +
      `token ${result.apiAccessValid ? 'issued' : 'not issued'} | ${details.email || '-'} | project ${details.project || '-'}`;
    if (!result.isActive) {
      failed++;
      line += `\n       ${details.error || details.validationMessage || 'Unknown error'}`;
    }
  }
  console.log(`  ${index + 1}. ${name}: ${line}`);
}

if (accounts.length) {
  console.log(`Result: ${accounts.length - failed}/${accounts.length} accounts OK`);
  if (failed) {
    console.log('Fix: check the base64 value, that the key was not deleted/rotated in Google Cloud, and the system clock.');
    process.exitCode = 1;
  }
}
