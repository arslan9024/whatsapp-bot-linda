import pkg from "whatsapp-web.js";
import { createRequire } from 'module';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
const execAsync = promisify(exec);
const { LocalAuth, Client } = pkg;

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Kill orphaned Chrome/Chromium processes that might be locking the session.
 * SAFETY: Never kills node.exe (would kill the running bot!)
 * Only kills browser processes, not the application itself.
 */
async function cleanupBrowserLocks() {
  try {
    if (process.platform === 'win32') {
      // SAFETY: Only kill Chrome/Chromium - NEVER kill node.exe
      await execAsync('taskkill /F /IM chrome.exe 2>nul', { windowsHide: true }).catch(() => {});
      await execAsync('taskkill /F /IM chromium.exe 2>nul', { windowsHide: true }).catch(() => {});
    } else {
      await execAsync('pkill -9 chrome 2>/dev/null', { shell: '/bin/bash' }).catch(() => {});
      await execAsync('pkill -9 chromium 2>/dev/null', { shell: '/bin/bash' }).catch(() => {});
    }
    
    // Also clean lock files in session directories
    const sessionsDir = path.join(process.cwd(), 'sessions');
    if (fs.existsSync(sessionsDir)) {
      const lockPatterns = ['.lock', 'SingletonLock', 'SingletonCookie', 'SingletonSocket'];
      const entries = fs.readdirSync(sessionsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        for (const lockName of lockPatterns) {
          const lockPath = path.join(sessionsDir, entry.name, lockName);
          try { if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath); } catch (_) {}
        }
      }
    }
    
    console.log('🧹 Browser locks cleaned (safe mode - node.exe preserved)');
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
      headless: 'new',  // FIX: Use new headless mode (Chrome 112+) instead of boolean
      timeout: 30000,  // 30 second timeout for browser launch
      protocolTimeout: 180000,  // 180 second timeout for protocol commands
      dumpio: process.env.DEBUG_CHROME === 'true',  // Optional: Show Chrome stderr/stdout if DEBUG_CHROME=true
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--single-process",  // Run Chrome in single process if not already isolated
        "--disable-gpu",
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
        clientId: `${ClientID}`,
        dataPath: "sessions"
      }),
      restartOnAuthFail: true,
      puppeteer: puppeteerArgs,
      webVersionCache: {
        type: "local",
        path: ".wwebjs_cache"
      },
      // FIX: Add connection timeout and retry settings for stability
      qrTimeoutMs: 120000,  // 120 seconds for QR scan
      connectionTimeoutMs: 60000,  // 60 seconds to establish connection
      takeoverOnConflict: true,  // Take over if another instance detected
      bypassOnPrem: true  // Bypass on-premise restrictions
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
      
      // Clean up any locks and processes
      await cleanupBrowserLocks();
      
      // Wait before retry
      await sleep(RETRY_DELAY);
      
      // Retry
      return CreatingNewWhatsAppClient(ClientID, retryCount + 1);
    }

    console.error(`❌ Error creating WhatsApp client: ${errorMsg}`);
    throw error;
  }
}
