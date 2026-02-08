import 'dotenv/config';
import { CreatingNewWhatsAppClient } from "./code/WhatsAppBot/CreatingNewWhatsAppClient.js";
import { createDeviceStatusFile } from "./code/utils/deviceStatus.js";
import { fullCleanup, killBrowserProcesses, sleep, setupShutdownHandlers } from "./code/utils/browserCleanup.js";
import SessionManager from "./code/utils/SessionManager.js";
import sessionStateManager from "./code/utils/SessionStateManager.js";
import QRCodeDisplay from "./code/utils/QRCodeDisplay.js";

// Initialize Conversation Analyzer (Session 18 - February 7, 2026)
// This sets up message type logging and global statistics functions
import "./code/WhatsAppBot/AnalyzerGlobals.js";

// DATABASE INTEGRATION (Session 16 - Phase 2)
// Import organized sheet services for Akoya database integration
import { AIContextIntegration } from "./code/Services/AIContextIntegration.js";
import { quickValidateSheet } from "./code/utils/sheetValidation.js";
import { OperationalAnalytics } from "./code/Services/OperationalAnalytics.js";
import { OrganizedSheets } from "./code/DamacHills2List.js";

// GOOGLE CONTACTS INTEGRATION (Phase B - February 2026)
// Contact lookup and management for WhatsApp bot
import ContactLookupHandler from "./code/WhatsAppBot/ContactLookupHandler.js";

import fs from "fs";
import path from "path";

// Global bot instance
let Lion0 = null;
let isInitializing = false;
let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 2;

// Global contact handler (Phase B)
let contactHandler = null;

// All initialized accounts for graceful shutdown
let allInitializedAccounts = [];

// Simple console logging without interactive prompts
function logBot(msg, type = "info") {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = {
    info: "ℹ️ ",
    success: "✅",
    error: "❌",
    warn: "⚠️ ",
    ready: "🚀"
  }[type] || "ℹ️ ";
  
  console.log(`[${timestamp}] ${prefix} ${msg}`);
}

async function initializeBot() {
  // Prevent multiple simultaneous initializations
  if (isInitializing) {
    logBot("Initialization already in progress, will wait...", "warn");
    return;
  }

  isInitializing = true;
  initAttempts++;

  try {
    // Initialize session state manager (loads previous session state)
    if (initAttempts === 1) {
      const initialized = await sessionStateManager.initialize();
      if (!initialized) {
        logBot("Failed to initialize SessionStateManager", "warn");
      } else {
        // Log recovered accounts
        const healthReport = sessionStateManager.getHealthReport();
        logBot(`Session state loaded: ${healthReport.activeAccounts}/${healthReport.totalAccounts} accounts active`, "info");
        if (healthReport.linkedDevices > 0) {
          logBot(`Found ${healthReport.linkedDevices} linked device(s) to recover`, "success");
        }
      }
    }

    const masterNumber = process.env.BOT_MASTER_NUMBER || "971505760056";
    
    if (initAttempts === 1) {
      console.log("\n╔════════════════════════════════════════════════════════════╗");
      console.log("║         🤖 LINDA - WhatsApp Bot Background Service        ║");
      console.log("╚════════════════════════════════════════════════════════════╝\n");
    }

    logBot(`Master Account: ${masterNumber}`, "info");
    logBot(`Initialization Attempt: ${initAttempts}/${MAX_INIT_ATTEMPTS}`, "info");

    // Check session restoration capability (NEW: Enhanced session manager)
    const sessionInfo = SessionManager.getSessionInfo(masterNumber);
    const canRestoreSession = SessionManager.canRestoreSession(masterNumber);
    const savedState = SessionManager.loadSessionState();

    logBot(`Session Folder Exists: ${sessionInfo.sessionFolderExists}`, "info");
    logBot(`Can Restore Immediately: ${canRestoreSession}`, "info");

    // Check session folder (legacy compatibility)
    const sessionFolder = path.join(process.cwd(), "sessions", `session-${masterNumber}`);
    const sessionExists = fs.existsSync(sessionFolder);
    const deviceStatusPath = path.join(sessionFolder, "device-status.json");
    let deviceStatus = null;

    // Try to read device status if session exists
    if (sessionExists) {
      try {
        deviceStatus = JSON.parse(fs.readFileSync(deviceStatusPath, "utf8"));
        logBot(`Session found - Device linked: ${deviceStatus.deviceLinked}`, "info");
      } catch (e) {
        logBot(`Session folder exists but no valid device-status.json`, "warn");
      }
    }

    // Create WhatsApp client
    logBot("Creating WhatsApp client...", "info");
    Lion0 = await CreatingNewWhatsAppClient(masterNumber);

    if (!Lion0) {
      throw new Error("Failed to create WhatsApp client");
    }

    logBot("WhatsApp client created", "success");

    // ═══════════════════════════════════════════════════════════════
    // DATABASE INITIALIZATION (Session 16 - Akoya Organized Sheet)
    // ═══════════════════════════════════════════════════════════════
    
    let contextIntegration = null;
    let operationalAnalytics = null;
    const AKOYA_SHEET_ID = process.env.AKOYA_ORGANIZED_SHEET_ID || OrganizedSheets.Akoya;

    if (AKOYA_SHEET_ID) {
      logBot("Initializing organized sheet database (Akoya)...", "info");

      // Step 1: Validate sheet access
      const sheetValid = await quickValidateSheet(AKOYA_SHEET_ID);
      
      if (sheetValid) {
        // Step 2: Initialize context integration (loads data into memory)
        contextIntegration = new AIContextIntegration();
        try {
          await contextIntegration.initialize(AKOYA_SHEET_ID, { cacheExpiry: 3600 });
          logBot("Database context loaded into memory ✅", "success");
          global.databaseContext = contextIntegration;  // Make globally available
        } catch (error) {
          logBot(`Context initialization failed: ${error.message}`, "warn");
          contextIntegration = null;
        }

        // Step 3: Initialize analytics
        try {
          operationalAnalytics = new OperationalAnalytics(AKOYA_SHEET_ID);
          global.analytics = operationalAnalytics;  // Make globally available
          logBot("Analytics service initialized ✅", "success");
        } catch (error) {
          logBot(`Analytics initialization failed: ${error.message}`, "warn");
          operationalAnalytics = null;
        }
      } else {
        logBot("Sheet validation failed - bot will use LEGACY MODE (old sheets)", "warn");
        logBot("Run: npm run organize-sheet to set up organized database", "info");
      }
    } else {
      logBot("⚠️  No organized sheet ID configured (AKOYA_ORGANIZED_SHEET_ID env var)", "warn");
      logBot("Bot will operate in LEGACY MODE", "info");
    }

    // ═══════════════════════════════════════════════════════════════

    // NEW: Route based on enhanced session restoration capability
    if (canRestoreSession && (sessionExists && deviceStatus && deviceStatus.deviceLinked)) {
      // Session exists, can be restored, and device was already linked

      logBot("Restoring previous session...", "info");
      setupRestoreFlow(Lion0, masterNumber, deviceStatus);
    } else if (sessionExists) {
      // Session folder exists but not properly linked
      logBot("Session exists but device not linked - requesting new auth", "warn");
      setupNewLinkingFlow(Lion0, masterNumber);
    } else {
      // Brand new session
      logBot("NEW SESSION - Device linking required", "info");
      createDeviceStatusFile(masterNumber);
      setupNewLinkingFlow(Lion0, masterNumber);
    }

    // Make bot available globally
    global.Lion0 = Lion0;
    global.Linda = Lion0;

    // Setup shutdown handlers for this client
    setupShutdownHandlers(Lion0);

  } catch (error) {
    logBot(`Initialization Error: ${error.message}`, "error");
    
    // Check if this is a browser lock error
    if (error.message.includes("browser is already running") && initAttempts < MAX_INIT_ATTEMPTS) {
      logBot("Browser is locked - cleaning up and retrying...", "warn");
      await killBrowserProcesses();
      await sleep(2000);
      isInitializing = false;
      initializeBot();
    } else if (initAttempts < MAX_INIT_ATTEMPTS) {
      logBot(`Retrying in 5 seconds... (Attempt ${initAttempts + 1}/${MAX_INIT_ATTEMPTS})`, "warn");
      isInitializing = false;
      setTimeout(initializeBot, 5000);
    } else {
      logBot("Max initialization attempts reached. Bot will remain idle.", "error");
      logBot("Fix the issue and restart with: npm run dev", "warn");
      isInitializing = false;
      // Don't exit - let bot stay alive for monitoring
    }
  }
}

/**
 * Setup restore flow for existing linked devices
 */
function setupRestoreFlow(client, masterNumber, deviceStatus) {
  logBot("Setting up session restore...", "info");

  // Set up event listeners BEFORE initialization
  let readyFired = false;

  client.once("authenticated", () => {
    logBot("Session authenticated successfully", "success");
    // Save session state for future restores
    SessionManager.saveSessionState(masterNumber, {
      isLinked: true,
      authMethod: deviceStatus.authMethod || "qr",
      deviceStatus: deviceStatus
    });
    // Also update SessionStateManager
    sessionStateManager.saveAccountState(masterNumber, {
      phoneNumber: masterNumber,
      displayName: "Master Account",
      deviceLinked: true,
      isActive: false,
      sessionPath: `sessions/session-${masterNumber}`,
      lastKnownState: "authenticated"
    });
  });

  client.once("ready", async () => {
    if (readyFired) return;
    readyFired = true;
    
    logBot("🟢 READY - Bot is online and listening", "ready");
    logBot(`Auth Method: ${deviceStatus.authMethod === "code" ? "6-Digit Code" : "QR Code"}`, "success");
    logBot("Waiting for messages...", "info");
    
    // Mark account as active and save state
    allInitializedAccounts.push(Lion0);
    await sessionStateManager.markRecoverySuccess(masterNumber);
    
    // Initialize contact lookup handler (Phase B - Google Contacts Integration)
    try {
      contactHandler = new ContactLookupHandler();
      await contactHandler.initialize();
      logBot("✅ Contact lookup handler initialized (Google Contacts API ready)", "success");
      global.contactHandler = contactHandler; // Make globally available
    } catch (error) {
      logBot(`⚠️  Contact handler initialization failed: ${error.message}`, "warn");
      logBot("Bot will continue without contact lookup functionality", "info");
      contactHandler = null;
    }
    
    // Save session backup for emergency recovery
    SessionManager.backupSession(masterNumber);
    
    // Set up message listening
    setupMessageListeners(client);
    isInitializing = false;
  });

  client.once("auth_failure", (msg) => {
    logBot(`Session restore failed: ${msg}`, "error");
    logBot("Attempting to restore from backup...", "warn");
    
    // Try to restore from backup if available
    if (SessionManager.restoreFromBackup(masterNumber)) {
      logBot("Session restored from backup - retrying...", "warn");
      isInitializing = false;
      setTimeout(() => {
        isInitializing = false;
        initializeBot();
      }, 3000);
    } else {
      logBot("Will need to re-authenticate with new QR code on next restart", "warn");
      isInitializing = false;
    }
  });

  client.on("disconnected", (reason) => {
    logBot(`Disconnected: ${reason}`, "warn");
  });

  client.on("error", (error) => {
    logBot(`Client error: ${error.message}`, "error");
  });

  // Initialize client to restore session
  logBot("Initializing with existing session...", "info");
  try {
    client.initialize();
  } catch (error) {
    if (error.message.includes("browser is already running")) {
      logBot("Browser already locked - this is a nodemon restart", "warn");
      logBot("Waiting for existing browser to connect...", "info");
    } else {
      throw error;
    }
  }
}

/**
 * Setup new device linking flow
 */
function setupNewLinkingFlow(client, masterNumber) {
  logBot("Setting up device linking...", "info");

  let qrShown = false;
  let authComplete = false;

  client.on("qr", async (qr) => {
    if (!qrShown) {
      qrShown = true;
      
      // Use improved QR code display with Windows compatibility
      try {
        await QRCodeDisplay.display(qr, {
          method: 'auto',        // Primary: qrcode-terminal, then fallbacks
          fallback: true,        // Use fallbacks if needed
          masterAccount: masterNumber
        });
      } catch (error) {
        logBot("QR display error: " + error.message, "error");
        logBot("Please manually link device via WhatsApp Settings → Linked Devices", "warn");
      }
    }
  });

  client.once("authenticated", () => {
    authComplete = true;
    logBot("✅ Device linked successfully!", "success");
    
    // Save session state for restoration on restart
    SessionManager.saveSessionState(masterNumber, {
      isLinked: true,
      authMethod: "qr",
      linkedAt: new Date().toISOString()
    });
    
    // Update SessionStateManager with linked device
    sessionStateManager.saveAccountState(masterNumber, {
      phoneNumber: masterNumber,
      displayName: "Master Account",
      deviceLinked: true,
      isActive: false,
      sessionPath: `sessions/session-${masterNumber}`,
      lastKnownState: "authenticated"
    });
  });

  client.once("ready", () => {
    logBot("🟢 READY - Bot is online and listening", "ready");
    logBot("Session saved for future restarts", "success");
    logBot("Waiting for messages...", "info");
    
    // Create session backup for emergency recovery
    SessionManager.backupSession(masterNumber);
    
    // Mark account as active in state
    allInitializedAccounts.push(Lion0);
    sessionStateManager.markRecoverySuccess(masterNumber);
    
    // Set up message listening
    setupMessageListeners(client);
    isInitializing = false;
  });

  client.once("auth_failure", (msg) => {
    logBot(`Authentication failed: ${msg}`, "error");
    logBot("Please restart and scan QR code again", "warn");
    isInitializing = false;
  });

  client.on("disconnected", (reason) => {
    logBot(`Disconnected: ${reason}`, "warn");
  });

  client.on("error", (error) => {
    logBot(`Error during linking: ${error.message}`, "error");
  });

  logBot("Initializing WhatsApp client for new device link...", "info");
  client.initialize();
}

/**
 * Setup message listening
 */
function setupMessageListeners(client) {
  client.on("message", async (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    const from = msg.from.includes("@g.us") ? `Group: ${msg.from}` : `User: ${msg.from}`;
    
    logBot(`📨 [${timestamp}] ${from}: ${msg.body.substring(0, 50)}${msg.body.length > 50 ? "..." : ""}`, "info");

    // Phase B: Contact lookup integration
    try {
      if (contactHandler && !msg.from.includes("@g.us")) {
        // Try to lookup contact for this user
        const contact = await contactHandler.getContact(msg.from);
        if (contact) {
          logBot(`✅ Contact found: ${contact.displayName || contact.phoneNumber}`, "success");
        }
      }
    } catch (error) {
      logBot(`⚠️  Contact lookup error: ${error.message}`, "warn");
    }

    // Test ping command
    if (msg.body === "!ping") {
      msg.reply("pong");
      logBot("📤 Ping reply sent", "success");
    }
  });

  logBot("Message listeners ready", "success");
}

/**
 * Graceful shutdown with session state persistence
 */
process.on("SIGINT", async () => {
  console.log("\n");
  logBot("Received shutdown signal", "warn");
  logBot("Initiating graceful shutdown...", "info");
  
  try {
    // 1. Save all account states
    logBot("Saving session states", "info");
    for (const [accountId, state] of Object.entries(sessionStateManager.getAllAccountStates())) {
      await sessionStateManager.saveAccountState(accountId, { ...state, isActive: false });
    }
    
    // 2. Close all WhatsApp connections
    logBot(`Closing ${allInitializedAccounts.length} WhatsApp connection(s)`, "info");
    for (const account of allInitializedAccounts) {
      try {
        await account.destroy();
      } catch (e) {
        // Ignore individual connection errors
      }
    }
    
    // 3. Write safe point file
    logBot("Writing session checkpoint", "info");
    await sessionStateManager.writeSafePointFile();
    
    // 4. Final cleanup
    logBot("Closing database connections", "info");
    if (global.databaseContext && global.databaseContext.close) {
      try {
        await global.databaseContext.close();
      } catch (e) {
        // Ignore database close errors
      }
    }
    
    logBot("✅ Graceful shutdown complete", "success");
  } catch (error) {
    logBot(`Error during shutdown: ${error.message}`, "error");
  }
  
  logBot("Bot stopped. Nodemon will restart on code changes...", "info");
  process.exit(0);
});

/**
 * Handle unhandled rejections
 */
process.on("unhandledRejection", (error) => {
  logBot(`Unhandled rejection: ${error.message}`, "error");
});

/**
 * Handle uncaught exceptions  
 */
process.on("uncaughtException", (error) => {
  logBot(`Uncaught exception: ${error.message}`, "error");
  // Continue running instead of exiting
});

// Start the bot
logBot("Starting Linda WhatsApp Bot...", "info");
initializeBot();
