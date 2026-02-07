import pkg from "whatsapp-web.js";
import { createRequire } from 'module';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
const { LocalAuth, Client } = pkg;

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Kill any running browser/node processes that might be locking the session
 */
async function cleanupBrowserLocks() {
  try {
    // Kill any lingering node processes
    if (process.platform === 'win32') {
      await execAsync('taskkill /F /IM node.exe 2>nul', { windowsHide: true }).catch(() => {});
      await execAsync('taskkill /F /IM chrome.exe 2>nul', { windowsHide: true }).catch(() => {});
      await execAsync('taskkill /F /IM chromium.exe 2>nul', { windowsHide: true }).catch(() => {});
    } else {
      await execAsync('pkill -9 node', { shell: '/bin/bash' }).catch(() => {});
      await execAsync('pkill -9 chrome', { shell: '/bin/bash' }).catch(() => {});
    }
    console.log('🧹 Browser locks cleaned');
  } catch (error) {
    // Silently fail - this is best effort cleanup
  }
}

/**
 * Create WhatsApp client with retry logic for browser lock issues
 */
export async function CreatingNewWhatsAppClient(ClientID, retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds

  if (!ClientID) {
    throw new Error("Client ID is not defined - cannot register agent");
  }

  console.log(`🔧 Creating WhatsApp client for: ${ClientID}${retryCount > 0 ? ` (Attempt ${retryCount + 1}/${MAX_RETRIES + 1})` : ''}`);

  try {
    const RegisteredAgentWAClient = new Client({
      authStrategy: new LocalAuth({
        clientId: `${ClientID}`,
        dataPath: "sessions"
      }),
      restartOnAuthFail: true,
      // Local development - headless mode for VSCode terminal only
      headless: true,
      seleniumOpts: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-gpu",
          "--single-process",
          "--disable-dev-shm-usage"
        ]
      },
      webVersionCache: {
        type: "remote",
        remotePath:
          "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html"
      }
    });

    console.log(`✅ WhatsApp client created successfully for: ${ClientID}`);
    return RegisteredAgentWAClient;
  } catch (error) {
    // Check if this is a browser lock error
    const isBrowserLockError = error.message.includes('browser is already running') || 
                               error.message.includes('userDataDir') ||
                               error.message.includes('CHROME_EXECUTABLE_PATH');

    if (isBrowserLockError && retryCount < MAX_RETRIES) {
      console.warn(`⚠️  Browser lock detected: ${error.message}`);
      console.log(`🔄 Cleaning up and retrying in ${RETRY_DELAY}ms...`);
      
      // Clean up any locks
      await cleanupBrowserLocks();
      
      // Wait before retry
      await sleep(RETRY_DELAY);
      
      // Retry
      return CreatingNewWhatsAppClient(ClientID, retryCount + 1);
    }

    console.error(`❌ Error creating WhatsApp client: ${error.message}`);
    throw error;
  }
}
