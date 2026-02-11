import pkg from "whatsapp-web.js";
import { createRequire } from 'module';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
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
    // Configure Puppeteer to use system Chrome or Chromium
    const puppeteerArgs = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--single-process",
        "--disable-dev-shm-usage",
        "--disable-web-resources",
        "--disable-extensions",
        "--disable-plugins",
        "--disable-sync"
      ]
    };

    // Try to use system Chrome if available
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      puppeteerArgs.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    } else if (process.platform === 'win32') {
      // Try common Chrome installation paths on Windows
      const possibleChromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.CHROME_BIN
      ].filter(Boolean);
      
      for (const chromePath of possibleChromePaths) {
        if (chromePath && fs.existsSync(chromePath)) {
          puppeteerArgs.executablePath = chromePath;
          console.log(`🌐 Using Chrome from: ${chromePath}`);
          break;
        }
      }
    }

    const RegisteredAgentWAClient = new Client({
      authStrategy: new LocalAuth({
        clientId: `${ClientID}`,
        dataPath: "sessions"
      }),
      restartOnAuthFail: true,
      // Puppeteer configuration for proper browser handling
      puppeteer: puppeteerArgs,
      webVersionCache: {
        type: "remote",
        remotePath:
          "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html"
      }
    });

    // Add comprehensive error handlers to catch Puppeteer/Protocol errors
    RegisteredAgentWAClient.on('error', (error) => {
      const msg = error.message || String(error);
      
      // Log non-fatal protocol errors but don't crash
      if (msg.includes('Target') || msg.includes('Session') || msg.includes('Protocol') || msg.includes('Requesting')) {
        // Suppress these - they're handled by global error handlers
        return;
      }
      
      // Log other errors
      console.error(`⚠️  Client error (${ClientID}): ${msg}`);
    });
    
    // Add disconnect handler for recovery
    RegisteredAgentWAClient.on('disconnected', (reason) => {
      // Suppress disconnect logs unless critical
      if (reason && !reason.includes('LOGOUT') && !reason.includes('RESTART')) {
        console.warn(`📊 Client disconnected (${ClientID}): ${reason}`);
      }
    });
    
    // Suppress unnecessary warnings from whatsapp-web.js
    RegisteredAgentWAClient.on('warn', (msg) => {
      // Filter out common non-critical warnings
      if (!msg.includes('Requesting')) {
        console.warn(`⚠️  Client warning: ${msg}`);
      }
    });

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
