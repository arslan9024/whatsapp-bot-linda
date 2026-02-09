import 'dotenv/config';
import { CreatingNewWhatsAppClient } from "./code/WhatsAppBot/CreatingNewWhatsAppClient.js";
import { createDeviceStatusFile } from "./code/utils/deviceStatus.js";
import { fullCleanup, killBrowserProcesses, sleep, setupShutdownHandlers } from "./code/utils/browserCleanup.js";
import SessionManager from "./code/utils/SessionManager.js";
import sessionStateManager from "./code/utils/SessionStateManager.js";
import QRCodeDisplay from "./code/utils/QRCodeDisplay.js";

// PHASE 4: Multi-Account Orchestration (February 9, 2026)
// Bootstrap and recovery managers for multi-account WhatsApp bot system
import AccountBootstrapManager from "./code/WhatsAppBot/AccountBootstrapManager.js";
import DeviceRecoveryManager from "./code/utils/DeviceRecoveryManager.js";

// PHASE 5: Account Health Monitoring (February 9, 2026)
// Health checks and auto-recovery for all WhatsApp accounts
import accountHealthMonitor from "./code/utils/AccountHealthMonitor.js";

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

// Global bot instances (single master + multi-account support)
let Lion0 = null; // Master account (backwards compatibility)
let accountClients = new Map(); // Map: phoneNumber → client instance (Phase 4)
let isInitializing = false;
let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 2;

// Phase 4 Managers
let bootstrapManager = null;
let recoveryManager = null;

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

/**
 * PHASE 4: Multi-Account Bot Initialization
 * Orchestrates SessionStateManager, AccountBootstrapManager, and DeviceRecoveryManager
 * Ensures seamless recovery across restarts
 */
async function initializeBot() {
  // Prevent multiple simultaneous initializations
  if (isInitializing) {
    logBot("Initialization already in progress, will wait...", "warn");
    return;
  }

  isInitializing = true;
  initAttempts++;

  try {
    // STEP 1: Initialize Phase 4 Managers
    if (initAttempts === 1) {
      bootstrapManager = new AccountBootstrapManager();
      recoveryManager = new DeviceRecoveryManager();
      logBot("Phase 4 managers initialized (Bootstrap + Recovery)", "success");
    }

    // STEP 2: Load Session State (Phase 1)
    if (initAttempts === 1) {
      const initialized = await sessionStateManager.initialize();
      if (!initialized) {
        logBot("Failed to initialize SessionStateManager", "warn");
      } else {
        const healthReport = sessionStateManager.getHealthReport();
        logBot(`Session state loaded: ${healthReport.activeAccounts}/${healthReport.totalAccounts} accounts`, "success");
        if (healthReport.linkedDevices > 0) {
          logBot(`Found ${healthReport.linkedDevices} linked device(s) ready for recovery`, "success");
        }
      }
    }

    // STEP 3: Load Multi-Account Configuration (Phase 2)
    logBot("Loading multi-account configuration...", "info");
    await bootstrapManager.loadBotsConfig();
    const accountConfigs = bootstrapManager.getAccountConfigs();
    const orderedAccounts = bootstrapManager.getOrderedAccounts();
    
    logBot(`Found ${accountConfigs.length} configured account(s)`, "info");
    orderedAccounts.forEach((config, idx) => {
      logBot(`  [${idx + 1}] ${config.displayName} (${config.phoneNumber}) - ${config.role}`, "info");
    });

    // STEP 4: Display Banner (first initialization only)
    if (initAttempts === 1) {
      console.log("\n╔═══════════════════════════════════════════════════════════════╗");
      console.log("║       🤖 LINDA - Multi-Account WhatsApp Bot Service         ║");
      console.log("║              Phase 4: Multi-Account Bootstrap               ║");
      console.log("╚═══════════════════════════════════════════════════════════════╝\n");
    }

    logBot(`Initialization Attempt: ${initAttempts}/${MAX_INIT_ATTEMPTS}`, "info");
    logBot("Starting sequential account initialization...", "info");

    // STEP 5: Sequential Account Initialization
    for (const config of orderedAccounts) {
      if (!config.enabled) {
        logBot(`⏭️  Skipping disabled account: ${config.displayName}`, "warn");
        continue;
      }

      logBot(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, "info");
      logBot(`Initializing: ${config.displayName} (${config.phoneNumber})`, "info");
      
      try {
        // Create WhatsApp client
        const client = await CreatingNewWhatsAppClient(config.phoneNumber);
        if (!client) {
          throw new Error("Failed to create WhatsApp client");
        }

        accountClients.set(config.phoneNumber, client);
        allInitializedAccounts.push(client);
        
        // Set Lion0 to first/primary account for backwards compatibility
        if (!Lion0) {
          Lion0 = client;
          global.Lion0 = Lion0;
          global.Linda = Lion0;
        }

        logBot(`✅ Client created for ${config.displayName}`, "success");

        // STEP 6: Check for Device Recovery (Phase 3)
        logBot(`Checking for linked devices (${config.phoneNumber})...`, "info");
        const wasLinked = await recoveryManager.wasDevicePreviouslyLinked(config.phoneNumber);
        const savedState = sessionStateManager.getAccountState(config.phoneNumber);

        if (wasLinked && savedState?.deviceLinked) {
          logBot(`Found previous device session - attempting recovery`, "success");
          setupRestoreFlow(client, config.phoneNumber, config);
        } else if (savedState?.deviceLinked) {
          logBot(`Device linked but session needs verification`, "warn");
          setupNewLinkingFlow(client, config.phoneNumber);
        } else {
          logBot(`No previous session - new device linking required`, "info");
          createDeviceStatusFile(config.phoneNumber);
          setupNewLinkingFlow(client, config.phoneNumber);
        }

        // Record initialization
        await bootstrapManager.recordInitialization(config.id, true);

      } catch (error) {
        logBot(`Failed to initialize ${config.displayName}: ${error.message}`, "error");
        await bootstrapManager.recordInitialization(config.id, false);
        continue;
      }
    }

    logBot(`\nInitialization sequence complete`, "success");

    // STEP 7: Initialize Database (Phase 2 continuation)
    await initializeDatabase();

    // STEP 8: Initialize Health Monitoring (Phase 5)
    logBot("Starting account health monitoring...", "info");
    accountHealthMonitor.startHealthChecks();
    logBot("✅ Account health monitoring active (5-minute intervals)", "success");
    
    // Make health monitor globally available
    global.healthMonitor = accountHealthMonitor;

    logBot("\n╔═══════════════════════════════════════════════════════════════╗", "info");
    logBot("║              🟢 PHASE 5 INITIALIZATION COMPLETE              ║", "success");
    logBot("║        Session, Bootstrap, Recovery & Health Monitoring      ║", "success");
    logBot("╚═══════════════════════════════════════════════════════════════╝\n", "info");

  } catch (error) {
    logBot(`Initialization Error: ${error.message}`, "error");
    
    // Check if this is a browser lock error
    if (error.message.includes("browser is already running") && initAttempts < MAX_INIT_ATTEMPTS) {
      logBot("Browser is locked from previous session - cleaning up...", "warn");
      await killBrowserProcesses();
      await sleep(2000);
      isInitializing = false;
      return initializeBot();
    } else if (initAttempts < MAX_INIT_ATTEMPTS) {
      logBot(`Retrying in 5 seconds... (Attempt ${initAttempts + 1}/${MAX_INIT_ATTEMPTS})`, "warn");
      isInitializing = false;
      return setTimeout(initializeBot, 5000);
    } else {
      logBot("Max initialization attempts reached. Please restart manually.", "error");
      isInitializing = false;
    }
  }
}

/**
 * Initialize database and analytics (from original flow)
 */
async function initializeDatabase() {
  logBot("Initializing database and analytics...", "info");

  try {
    // DATABASE INITIALIZATION (Session 16 - Akoya Organized Sheet)
    let contextIntegration = null;
    let operationalAnalytics = null;
    const AKOYA_SHEET_ID = process.env.AKOYA_ORGANIZED_SHEET_ID || (await import("./code/DamacHills2List.js")).OrganizedSheets?.Akoya;

    if (AKOYA_SHEET_ID) {
      const { quickValidateSheet } = await import("./code/utils/sheetValidation.js");
      const sheetValid = await quickValidateSheet(AKOYA_SHEET_ID);
      
      if (sheetValid) {
        const { AIContextIntegration } = await import("./code/Services/AIContextIntegration.js");
        contextIntegration = new AIContextIntegration();
        try {
          await contextIntegration.initialize(AKOYA_SHEET_ID, { cacheExpiry: 3600 });
          logBot("Database context loaded into memory", "success");
          global.databaseContext = contextIntegration;
        } catch (error) {
          logBot(`Context initialization failed: ${error.message}`, "warn");
          contextIntegration = null;
        }

        // Step 3: Initialize analytics
        try {
          const { OperationalAnalytics } = await import("./code/Services/OperationalAnalytics.js");
          operationalAnalytics = new OperationalAnalytics(AKOYA_SHEET_ID);
          global.analytics = operationalAnalytics;
          logBot("Analytics service initialized", "success");
        } catch (error) {
          logBot(`Analytics initialization failed: ${error.message}`, "warn");
          operationalAnalytics = null;
        }
      } else {
        logBot("Sheet validation failed - using LEGACY MODE", "warn");
      }
    }
  } catch (error) {
    logBot(`Database initialization error: ${error.message}`, "warn");
  }
}

/**
 * Setup restore flow for existing linked devices (Phase 3 integration)
 */
function setupRestoreFlow(client, phoneNumber, configOrStatus) {
  logBot("Setting up session restore for " + phoneNumber, "info");

  let readyFired = false;
  const config = configOrStatus.displayName ? configOrStatus : null; // Check if it's a config object

  client.once("authenticated", () => {
    logBot(`✅ Session authenticated (${phoneNumber})`, "success");
    sessionStateManager.saveAccountState(phoneNumber, {
      phoneNumber: phoneNumber,
      displayName: config?.displayName || "Unknown Account",
      deviceLinked: true,
      isActive: false,
      sessionPath: `sessions/session-${phoneNumber}`,
      lastKnownState: "authenticated"
    });
  });

  client.once("ready", async () => {
    if (readyFired) return;
    readyFired = true;
    
    logBot(`🟢 READY - ${phoneNumber} is online`, "ready");
    
    // Mark account as active
    allInitializedAccounts.push(client);
    await sessionStateManager.markRecoverySuccess(phoneNumber);
    
    // PHASE 5: Register account for health monitoring
    accountHealthMonitor.registerAccount(phoneNumber, client);
    
    // Initialize contact lookup handler (Phase B)
    try {
      if (!contactHandler) {
        const { default: ContactLookupHandler } = await import("./code/WhatsAppBot/ContactLookupHandler.js");
        contactHandler = new ContactLookupHandler();
        await contactHandler.initialize();
        logBot("✅ Contact lookup handler ready", "success");
        global.contactHandler = contactHandler;
      }
    } catch (error) {
      logBot(`⚠️  Contact handler error: ${error.message}`, "warn");
    }
    
    setupMessageListeners(client, phoneNumber);
    isInitializing = false;
  });

  client.once("auth_failure", (msg) => {
    logBot(`Session restore failed for ${phoneNumber}: ${msg}`, "error");
    logBot("Will need to re-authenticate with new QR code", "warn");
    isInitializing = false;
  });

  client.on("disconnected", (reason) => {
    logBot(`Disconnected (${phoneNumber}): ${reason}`, "warn");
  });

  client.on("error", (error) => {
    logBot(`Client error (${phoneNumber}): ${error.message}`, "error");
  });

  logBot(`Initializing WhatsApp client for ${phoneNumber}...`, "info");
  try {
    client.initialize();
  } catch (error) {
    if (error.message.includes("browser is already running")) {
      logBot("Browser already locked (nodemon restart detected)", "warn");
    } else {
      throw error;
    }
  }
}

/**
 * Setup new device linking flow (Phase 4 multi-account version)
 */
function setupNewLinkingFlow(client, phoneNumber) {
  logBot(`Setting up device linking for ${phoneNumber}...`, "info");

  let qrShown = false;
  let authComplete = false;

  client.on("qr", async (qr) => {
    if (!qrShown) {
      qrShown = true;
      try {
        await QRCodeDisplay.display(qr, {
          method: 'auto',
          fallback: true,
          masterAccount: phoneNumber
        });
      } catch (error) {
        logBot("QR display error: " + error.message, "error");
        logBot("Please link device manually via WhatsApp Settings", "warn");
      }
    }
  });

  client.once("authenticated", () => {
    authComplete = true;
    logBot(`✅ Device linked (${phoneNumber})`, "success");
    
    sessionStateManager.saveAccountState(phoneNumber, {
      phoneNumber: phoneNumber,
      displayName: "WhatsApp Account",
      deviceLinked: true,
      isActive: false,
      sessionPath: `sessions/session-${phoneNumber}`,
      lastKnownState: "authenticated"
    });
  });

  client.once("ready", async () => {
    logBot(`🟢 READY - ${phoneNumber} is online`, "ready");
    logBot("Session saved for future restarts", "success");
    
    allInitializedAccounts.push(client);
    await sessionStateManager.markRecoverySuccess(phoneNumber);
    
    // PHASE 5: Register account for health monitoring
    accountHealthMonitor.registerAccount(phoneNumber, client);
    
    setupMessageListeners(client, phoneNumber);
    isInitializing = false;
  });

  client.once("auth_failure", (msg) => {
    logBot(`Authentication failed for ${phoneNumber}: ${msg}`, "error");
    logBot("Please restart and scan QR code again", "warn");
    isInitializing = false;
  });

  client.on("disconnected", (reason) => {
    logBot(`Disconnected (${phoneNumber}): ${reason}`, "warn");
  });

  client.on("error", (error) => {
    logBot(`Error during linking (${phoneNumber}): ${error.message}`, "error");
  });

  logBot(`Initializing WhatsApp client for ${phoneNumber}...`, "info");
  client.initialize();
}

/**
 * Setup message listening for individual account (Phase 4 - multi-account)
 */
function setupMessageListeners(client, phoneNumber = "Unknown") {
  client.on("message", async (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    const from = msg.from.includes("@g.us") ? `Group: ${msg.from}` : `User: ${msg.from}`;
    
    logBot(`📨 [${timestamp}] (${phoneNumber}) ${from}: ${msg.body.substring(0, 50)}${msg.body.length > 50 ? "..." : ""}`, "info");

    // Phase B: Contact lookup integration
    try {
      if (contactHandler && !msg.from.includes("@g.us")) {
        const contact = await contactHandler.getContact(msg.from);
        if (contact) {
          logBot(`✅ Contact: ${contact.displayName || contact.phoneNumber}`, "success");
        }
      }
    } catch (error) {
      logBot(`⚠️ Contact lookup error: ${error.message}`, "warn");
    }

    // Test ping command
    if (msg.body === "!ping") {
      msg.reply("pong");
      logBot("📤 Ping reply sent", "success");
    }
  });

  logBot(`Message listeners ready for ${phoneNumber}`, "success");
}

/**
 * Graceful shutdown with multi-account support (Phase 4)
 */
process.on("SIGINT", async () => {
  console.log("\n");
  logBot("Received shutdown signal", "warn");
  logBot("Initiating graceful shutdown (Phase 4 + Phase 5)...", "info");
  
  try {
    // 0. Stop health monitoring (Phase 5)
    logBot("Stopping health monitoring...", "info");
    accountHealthMonitor.stopHealthChecks();
    
    // 1. Save all account states
    logBot(`Saving states for ${allInitializedAccounts.length} account(s)`, "info");
    for (const [accountId, state] of Object.entries(sessionStateManager.getAllAccountStates())) {
      await sessionStateManager.saveAccountState(accountId, { ...state, isActive: false });
    }
    
    // 2. Close all WhatsApp connections
    logBot(`Closing ${allInitializedAccounts.length} WhatsApp connection(s)`, "info");
    for (const [phoneNumber, client] of accountClients.entries()) {
      try {
        logBot(`  Disconnecting ${phoneNumber}...`, "info");
        await client.destroy();
      } catch (e) {
        logBot(`  Warning: Error closing ${phoneNumber}`, "warn");
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
