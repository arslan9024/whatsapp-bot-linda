/**
 * Google Credentials Configuration Manager
 * Manages loading and validating Google API credentials from various sources
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GoogleCredentialsManager {
  constructor() {
    this.credentials = null;
    this.credentialsPath = null;
  }

  /**
   * Load credentials from various sources with fallback
   * Priority: Environment Variable > Integration/Google > GoogleAPI > External env
   */
  loadCredentials() {
    const locations = [
      // Primary: Expected location in Integration folder
      {
        path: path.join(__dirname, 'keys.json'),
        name: 'code/Integration/Google/keys.json (Primary)',
      },
      // Fallback: Original GoogleAPI location
      {
        path: path.join(process.cwd(), 'code/GoogleAPI/keys.json'),
        name: 'code/GoogleAPI/keys.json (Fallback)',
      },
      // Environment variable
      process.env.GOOGLE_APPLICATION_CREDENTIALS
        ? { path: process.env.GOOGLE_APPLICATION_CREDENTIALS, name: 'Environment Variable' }
        : null,
    ].filter(Boolean);

    for (const location of locations) {
      if (!location || !location.path) continue;

      try {
        if (fs.existsSync(location.path)) {
          this.credentials = JSON.parse(fs.readFileSync(location.path, 'utf8'));
          this.credentialsPath = location.path;
          console.log(`✓ Loaded credentials from: ${location.name}`);
          return this.credentials;
        }
      } catch (error) {
        console.error(`✗ Error loading from ${location.name}:`, error.message);
      }
    }

    throw new Error('Google credentials not found in any location');
  }

  /**
   * Get credentials (load if not already loaded)
   */
  getCredentials() {
    if (!this.credentials) {
      this.loadCredentials();
    }
    return this.credentials;
  }

  /**
   * Get the path where credentials were loaded from
   */
  getCredentialsPath() {
    return this.credentialsPath;
  }

  /**
   * Validate credentials structure
   */
  validate() {
    const creds = this.getCredentials();
    const required = [
      'type',
      'project_id',
      'private_key_id',
      'private_key',
      'client_email',
      'client_id',
      'auth_uri',
      'token_uri',
    ];

    const missing = required.filter((field) => !creds[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required credential fields: ${missing.join(', ')}`);
    }

    if (!creds.private_key.includes('BEGIN PRIVATE KEY')) {
      throw new Error('Invalid private key format');
    }

    return true;
  }

  /**
   * Check if credentials are available
   */
  isAvailable() {
    try {
      this.getCredentials();
      this.validate();
      return true;
    } catch {
      return false;
    }
  }
}

export default new GoogleCredentialsManager();
