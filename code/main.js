import {google} from 'googleapis';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let keys;
let PowerAgent = null;
let isGoogleAuthenticated = false;

try {
  keys = JSON.parse(readFileSync('./code/GoogleAPI/keys.json', 'utf8'));
} catch (error) {
  console.error('❌ Failed to load Google credentials:', error.message || error);
  console.log('⚠️  Google Sheets integration disabled');
  keys = null;
}

// Function to initialize Google authentication (lazy-loaded)
export async function initializeGoogleAuth() {
  if (isGoogleAuthenticated || !keys) {
    return PowerAgent;
  }

  try {
    PowerAgent = new google.auth.JWT(
        keys.client_email, 
        null,
        keys.private_key,
        ['https://www.googleapis.com/auth/spreadsheets'] 
    );
    
    // Use authorizeAsync for better promise handling
    const tokens = await PowerAgent.authorizeAsync();
    console.log('✅ Google Sheets Connected');
    isGoogleAuthenticated = true;
    return PowerAgent;
  } catch (error) {
    console.error('❌ Google Authentication Error:', error.message || error);
    console.log('⚠️  Google Sheets will be unavailable until credentials are fixed');
    PowerAgent = null;
    isGoogleAuthenticated = false;
    return null;
  }
}

// Export the auth object (will be null if creds not loaded)
export { PowerAgent };
export { isGoogleAuthenticated };
