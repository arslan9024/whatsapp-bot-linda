import pkg from "whatsapp-web.js";
import fs from 'fs';
import path from 'path';
import { SESSIONS_DIR, WEB_CACHE_DIR } from '../sessions/SessionManager.js';
const { LocalAuth, Client } = pkg;

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

  // CRITICAL FIX: Sanitize ClientID to remove invalid characters (+, spaces, etc.)
  // WhatsApp Web.js only allows: alphanumeric, underscores, hyphens
  // Phone numbers like "+971505760056" need to become "971505760056"
  const sanitizedClientID = String(ClientID).replace(/^\+/, '').replace(/[^a-zA-Z0-9_-]/g, '_');

  console.log(`🔧 Creating WhatsApp client for: ${ClientID}${retryCount > 0 ? ` (Attempt ${retryCount + 1}/${MAX_RETRIES + 1})` : ''}`);

  try {
    // Configure Puppeteer to use system Chrome or Chromium
    const puppeteerArgs = {
      headless: 'new',  // FIX: Use new headless mode (Chrome 112+) instead of boolean
      timeout: 30000,  // 30 second timeout for browser launch
      protocolTimeout: 180000,  // 180 second timeout for protocol commands
      dumpio: process.env.DEBUG_CHROME === 'true',  // Optional: Show Chrome stderr/stdout if DEBUG_CHROME=true
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",        "--disable-gpu",
        "--disable-dev-shm-usage",  // Disable /dev/shm usage (critical for stability)
        "--disable-extensions",
        "--disable-plugins",
        "--disable-sync",
        "--disable-features=IsolateOrigins,site-per-process,TranslateUI",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-networking",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-breakpad",
        "--disable-client-side-phishing-detection",
        "--disable-component-extensions-with-background-pages",
        "--disable-default-apps",
        "--disable-hang-monitor",
        "--disable-popup-blocking",
        "--disable-prompt-on-repost",
        "--disable-zero-suggest",
        "--disable-web-resources",
        "--metrics-recording-only",
        "--mute-audio",
        "--no-service-autorun",
        "--password-store=basic",
        "--use-mock-keychain",
        // STABILITY FIXES for "Target closed" errors:
        "--disable-background-timer-throttling",  // Prevent timer throttling
        "--disable-renderer-backgrounding",  // Keep rendering active
        "--enable-automation",  // Explicit automation flag
        "--disable-hang-monitor",
        "--disable-ipc-flooding-protection",  // Allow high IPC message rates
        "--disable-popup-blocking",
        "--no-default-browser-check",
        "--disable-translations",
        // PAGE LOAD STABILITY (prevents premature page closure):
        "--disable-backgrounding-occluded-windows",
        // Memory & performance:
        "--memory-pressure-off",  // Disable memory pressure checks
        "--disable-default-apps",
        "--disable-extensions-file-access-check",
        "--disable-print-preview",
        "--disable-save-password-bubble"
      ]
    };

    // Try to use system Chrome if available
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      puppeteerArgs.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    } else if (process.env.CHROME_BIN) {
      puppeteerArgs.executablePath = process.env.CHROME_BIN;
    } else if (process.platform === 'win32') {
      // Try common Chrome installation paths on Windows (check most likely first)
      const possibleChromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(process.env.ProgramFiles || '', 'Google\\Chrome\\Application\\chrome.exe'),
        path.join(process.env['ProgramFiles(x86)'] || '', 'Google\\Chrome\\Application\\chrome.exe')
      ].filter((p) => p && p.length > 0);
      
      // Check each path and use the first one that exists
      for (const chromePath of possibleChromePaths) {
        if (chromePath && fs.existsSync(chromePath)) {
          puppeteerArgs.executablePath = chromePath;
          console.log(`🌐 Using Chrome from: ${chromePath}`);
          break;
        }
      }
      
      // If Chrome not found, Puppeteer will try to use bundled Chromium
      if (!puppeteerArgs.executablePath) {
        console.log('🌐 Chrome not found in standard paths, using bundled Chromium (or system PATH)');
      }
    }

    const RegisteredAgentWAClient = new Client({
      authStrategy: new LocalAuth({
        clientId: sanitizedClientID,  // Use sanitized ID without + or special chars
        dataPath: SESSIONS_DIR
      }),
      restartOnAuthFail: true,
      puppeteer: puppeteerArgs,
      webVersionCache: {
        type: "local",
        path: WEB_CACHE_DIR
      },
      // FIX: Increased timeouts and page load patience for stability
      qrTimeoutMs: 300000,  // 240 seconds (4 min) for QR scan - gives more time for WhatsApp Web load
      connectionTimeoutMs: 180000,  // 120 seconds to establish connection (doubled)
      takeoverOnConflict: true,  // Take over if another instance detected
      bypassOnPrem: true,  // Bypass on-premise restrictions
      // NEW: Page load wait settings to prevent premature closure
      waitForNavigation: { waitUntil: 'networkidle0', timeout: 90000 },  // Wait for network to be mostly idle
      defaultNavigationTimeout: 120000,  // 60 second timeout for page navigation
      defaultTimeout: 60000  // 30 second timeout for general operations
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
    const errorMsg = error.message || String(error);
    
    // Check if this is a browser lock or connection error
    const isBrowserLockError = errorMsg.includes('browser is already running') || 
                               errorMsg.includes('userDataDir') ||
                               errorMsg.includes('CHROME_EXECUTABLE_PATH') ||
                               errorMsg.includes('Failed to connect') ||
                               errorMsg.includes('PROTOCOL error') ||
                               errorMsg.includes('Target closed') ||
                               errorMsg.includes('WebSocket');

    if (isBrowserLockError && retryCount < MAX_RETRIES) {
      console.warn(`⚠️  Chrome connection error detected: ${errorMsg.substring(0, 80)}`);
      console.log(`🔄 Cleaning up and retrying in ${RETRY_DELAY}ms (Attempt ${retryCount + 2}/${MAX_RETRIES + 1})`);
      
      console.warn('Saved session and browser locks are preserved; close only another bot instance using this profile if needed.');
      
      // Wait before retry
      await sleep(RETRY_DELAY);
      
      // Retry
      return CreatingNewWhatsAppClient(ClientID, retryCount + 1);
    }

    console.error(`❌ Error creating WhatsApp client: ${errorMsg}`);
    throw error;
  }
}
