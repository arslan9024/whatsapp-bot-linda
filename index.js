import 'dotenv/config';
import { CreatingNewWhatsAppClient } from "./code/WhatsAppBot/CreatingNewWhatsAppClient.js";
import { createDeviceStatusFile } from "./code/utils/deviceStatus.js";
import { fullCleanup, killBrowserProcesses, sleep, setupShutdownHandlers } from "./code/utils/browserCleanup.js";
import SessionManager from "./code/utils/SessionManager.js";
import sessionStateManager from "./code/utils/SessionStateManager.js";
import QRCodeDisplay from "./code/utils/QRCodeDisplay.js";
import readline from 'readline';

// PHASE 3-5: Advanced Features (24/7 Production - February 9, 2026)
// Multi-account orchestration, device recovery, health monitoring, keep-alive system
import AccountBootstrapManager from "./code/WhatsAppBot/AccountBootstrapManager.js";
import { DeviceRecoveryManager } from "./code/utils/DeviceRecoveryManager.js";
import accountHealthMonitor from "./code/utils/AccountHealthMonitor.js";
import SessionKeepAliveManager from "./code/utils/SessionKeepAliveManager.js";
import DeviceLinkedManager from "./code/utils/DeviceLinkedManager.js";  // NEW: Device tracking manager
import { AccountConfigManager } from "./code/utils/AccountConfigManager.js";  // NEW: Dynamic account management

// DATABASE & ANALYTICS (Phase 2)
import { AIContextIntegration } from "./code/Services/AIContextIntegration.js";
import { OperationalAnalytics } from "./code/Services/OperationalAnalytics.js";

// CONVERSATION ANALYSIS (Session 18)
import "./code/WhatsAppBot/AnalyzerGlobals.js";

// GOOGLE CONTACTS (Phase B - Contact Lookup)
import ContactLookupHandler from "./code/WhatsAppBot/ContactLookupHandler.js";

// GORAHA VERIFICATION (Phase C - Contact Verification)
import GorahaContactVerificationService from "./code/WhatsAppBot/GorahaContactVerificationService.js";

// LINDA AI COMMAND SYSTEM (February 11, 2026)
// Command parsing, routing, conversation learning, ML foundation
import LindaCommandHandler from "./code/Commands/LindaCommandHandler.js";
import LindaCommandRegistry from "./code/Commands/LindaCommandRegistry.js";

// TERMINAL DASHBOARD (Interactive Health Monitoring & Account Re-linking)
import terminalHealthDashboard from "./code/utils/TerminalHealthDashboard.js";

import fs from "fs";
import path from "path";

// Global bot instances and managers (24/7 Production)
let Lion0 = null; // Master account (backwards compatibility)
let accountClients = new Map(); // Map: phoneNumber → client instance
let isInitializing = false;
let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

// Phase 4-5 Managers (24/7 Operation)
let bootstrapManager = null;
let recoveryManager = null;
let keepAliveManager = null;  // NEW: Session keep-alive heartbeat manager
let deviceLinkedManager = null;  // NEW: Device linking tracker
let accountConfigManager = null;  // NEW: Dynamic account configuration manager
let commandHandler = null;  // NEW: Linda AI Command Handler

// Feature handlers
let contactHandler = null;
let gorahaVerificationService = null;

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
 * Setup terminal input listener for interactive health dashboard & device management
 * Allows users to:
 * - View WhatsApp device status in real-time
 * - Re-link master or specific accounts
 * - Monitor system health
 * - Switch to 6-digit authentication
 */
function setupTerminalInputListener() {
  try {
    // Setup interactive monitoring with device manager callbacks
    const callbacks = {
      onRelinkMaster: async (masterPhone) => {
        // Fallback to AccountConfigManager if master phone not provided
        if (!masterPhone && accountConfigManager) {
          masterPhone = accountConfigManager.getMasterPhoneNumber();
        }
        
        if (!masterPhone) {
          logBot("⚠️  Master phone not configured", "error");
          logBot("   💡 Use command: !set-master <account-id> to set master account", "info");
          if (accountConfigManager) {
            const accounts = accountConfigManager.getAllAccounts();
            if (accounts.length > 0) {
              logBot("   Available accounts:", "info");
              accounts.forEach(acc => {
                logBot(`     • ${acc.id}: ${acc.displayName} (${acc.phoneNumber})`, "info");
              });
            }
          }
          return;
        }
        
        logBot(`Re-linking master account: ${masterPhone}`, "info");
        if (deviceLinkedManager) {
          deviceLinkedManager.resetDeviceStatus(masterPhone);
        }
        
        // Trigger re-linking by recreating client
        const client = accountClients.get(masterPhone);
        if (client) {
          try {
            // Reset session and trigger new QR
            deviceLinkedManager.startLinkingAttempt(masterPhone);
            setupNewLinkingFlow(client, masterPhone, 'master');
            client.initialize();
          } catch (error) {
            logBot(`Failed to reset client: ${error.message}`, "error");
          }
        }
      },
      
      onRelinkDevice: async (phoneNumber) => {
        logBot(`Re-linking device: ${phoneNumber}`, "info");
        if (deviceLinkedManager) {
          deviceLinkedManager.resetDeviceStatus(phoneNumber);
        }
      },
      
      onSwitchTo6Digit: async (phoneNumber) => {
        logBot(`6-digit auth requested for: ${phoneNumber}`, "info");
        logBot("6-digit code feature coming soon", "warn");
      },
      
      onShowDeviceDetails: (phoneNumber) => {
        terminalHealthDashboard.displayDeviceDetails(phoneNumber);
      },
      
      onListDevices: () => {
        terminalHealthDashboard.listAllDevices();
      },
    };

    // Start interactive monitoring
    terminalHealthDashboard.startInteractiveMonitoring(callbacks);

  } catch (error) {
    logBot(`Terminal input setup warning: ${error.message}`, "warn");
    // Continue without terminal input if setup fails
  }
}

/**
 * MINIMAL BOT INITIALIZATION
 * Focus: WhatsApp Device Linking via QR Code
 * Simplified: No complex managers, databases, or analytics
 */
async function initializeBot() {
  if (isInitializing) {
    logBot("Initialization already in progress...", "warn");
    return;
  }

  isInitializing = true;
  initAttempts++;

  try {
    // BANNER (first attempt only)
    if (initAttempts === 1) {
      console.log("\n╔═══════════════════════════════════════════════════════════════╗");
      console.log("║       🤖 LINDA - 24/7 WhatsApp Bot Service                  ║");
      console.log("║            PRODUCTION MODE ENABLED                          ║");
      console.log("║        Sessions: Persistent | Features: All Enabled         ║");
      console.log("╚═══════════════════════════════════════════════════════════════╝\n");
    }

    logBot(`Initialization Attempt: ${initAttempts}/${MAX_INIT_ATTEMPTS}`, "info");

    // ============================================
    // STEP 1: Initialize Keep-Alive Manager
    // ============================================
    if (!keepAliveManager) {
      keepAliveManager = new SessionKeepAliveManager(accountClients, logBot);
      keepAliveManager.startStatusMonitoring();
      logBot("✅ SessionKeepAliveManager initialized", "success");
      global.keepAliveManager = keepAliveManager;
    }

    // ============================================
    // STEP 1B: Initialize Device Linked Manager (NEW)
    // ============================================
    if (!deviceLinkedManager) {
      deviceLinkedManager = new DeviceLinkedManager(logBot);
      terminalHealthDashboard.setDeviceManager(deviceLinkedManager);
      logBot("✅ DeviceLinkedManager initialized", "success");
      global.deviceLinkedManager = deviceLinkedManager;
    }

    // ============================================
    // STEP 1C: Initialize Account Config Manager (NEW - Dynamic Management)
    // ============================================
    if (!accountConfigManager) {
      accountConfigManager = new AccountConfigManager(logBot);
      logBot("✅ AccountConfigManager initialized", "success");
      global.accountConfigManager = accountConfigManager;
      
      // Validate master account configuration
      const masterPhone = accountConfigManager.getMasterPhoneNumber();
      const masterAccount = accountConfigManager.getMasterAccount();
      
      if (!masterPhone || !masterAccount) {
        logBot("⚠️  WARNING: Master account not properly configured!", "warn");
        logBot(`   Current status: ${accountConfigManager.getAccountCount()} accounts loaded`, "info");
        
        const allAccounts = accountConfigManager.getAllAccounts();
        if (allAccounts.length > 0) {
          logBot("   Available accounts:", "info");
          allAccounts.forEach((acc, idx) => {
            logBot(`     [${idx + 1}] ${acc.displayName} (${acc.phoneNumber}) - Role: ${acc.role || 'secondary'}`, "info");
          });
          
          logBot("\n   💡 HOW TO FIX:", "info");
          logBot("   Use command: !set-master <account-id>", "info");
          logBot("   Example: !set-master account-1", "info");
        } else {
          logBot("   No accounts configured yet!", "error");
          logBot("\n   💡 HOW TO FIX:", "info");
          logBot("   Use command: !add-account <phone> <name>", "info");
          logBot("   Example: !add-account +971501234567 'My Main Account'", "info");
        }
      } else {
        logBot(`✅ Master account configured: ${masterAccount.displayName} (${masterPhone})`, "success");
      }
    }

    // ============================================
    // STEP 2: Initialize Phase 4 Bootstrap Manager
    // ============================================
    if (!bootstrapManager) {
      bootstrapManager = new AccountBootstrapManager();
      recoveryManager = new DeviceRecoveryManager();
      logBot("✅ Phase 4 managers initialized (Bootstrap + Recovery)", "success");
      global.bootstrapManager = bootstrapManager;
      global.recoveryManager = recoveryManager;
    }

    // ============================================
    // STEP 3: Load & Process Bot Configuration
    // ============================================
    logBot("Loading bot configuration...", "info");
    await bootstrapManager.loadBotsConfig();
    const accountConfigs = bootstrapManager.getAccountConfigs();
    const orderedAccounts = bootstrapManager.getOrderedAccounts();

    logBot(`Found ${accountConfigs.length} configured account(s)`, "info");
    orderedAccounts.forEach((config, idx) => {
      logBot(`  [${idx + 1}] ✅ ${config.displayName} (${config.phoneNumber}) - role: ${config.role}`, "info");
    });

    // ============================================
    // STEP 4: Sequential Multi-Account Initialization
    // ============================================
    logBot("\n🔄 Starting sequential account initialization...", "info");
    const sequentialDelay = parseInt(process.env.ACCOUNT_SEQUENTIAL_DELAY) || 5000;

    for (const config of orderedAccounts) {
      // All accounts in orderedAccounts should be enabled, but double-check
      logBot(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, "info");
      logBot(`[Account ${orderedAccounts.indexOf(config) + 1}/${orderedAccounts.length}] Initializing: ${config.displayName}...`, "info");

      try {
        // Create WhatsApp client
        logBot(`Creating WhatsApp client for: ${config.displayName}`, "info");
        const client = await CreatingNewWhatsAppClient(config.id);
        if (!client) {
          throw new Error("Failed to create WhatsApp client");
        }

        accountClients.set(config.phoneNumber, client);
        if (!Lion0) {
          Lion0 = client;
          global.Lion0 = Lion0;
          global.Linda = Lion0;
        }

        logBot(`✅ Client created for ${config.displayName}`, "success");

        // NEW: Add device to tracking system
        if (deviceLinkedManager) {
          deviceLinkedManager.addDevice(config.phoneNumber, {
            name: config.displayName,
            role: config.role || 'secondary',
          });
          // Use AccountConfigManager for master phone (more reliable)
          const masterPhone = accountConfigManager?.getMasterPhoneNumber() || orderedAccounts[0]?.phoneNumber;
          terminalHealthDashboard.setMasterPhoneNumber(masterPhone);
        }

        // Check for device recovery (Phase 3)
        logBot(`Checking for linked devices (${config.phoneNumber})...`, "info");
        const wasLinked = await recoveryManager.wasDevicePreviouslyLinked(config.phoneNumber);
        const savedState = sessionStateManager.getAccountState(config.phoneNumber);

        // SAFETY: Only attempt restore if BOTH conditions are true
        if (wasLinked === true && savedState?.deviceLinked === true) {
          logBot(`Found previous device session - attempting restore...`, "success");
          setupRestoreFlow(client, config.phoneNumber, config);
        } else {
          logBot(`New device linking required (wasLinked: ${wasLinked}, savedState: ${savedState?.deviceLinked}) - showing QR code...`, "info");
          createDeviceStatusFile(config.phoneNumber);
          setupNewLinkingFlow(client, config.phoneNumber, config.id);
        }

        await bootstrapManager.recordInitialization(config.id, true);
        
        // Delay before next account to prevent race conditions
        if (config !== orderedAccounts[orderedAccounts.length - 1]) {
          logBot(`Waiting ${sequentialDelay}ms before next account...`, "info");
          await new Promise(resolve => setTimeout(resolve, sequentialDelay));
        }

      } catch (error) {
        logBot(`Failed to initialize ${config.displayName}: ${error.message}`, "error");
        await bootstrapManager.recordInitialization(config.id, false);
        continue;
      }
    }

    // ============================================
    // STEP 5: Initialize Database & Analytics
    // ============================================
    await initializeDatabase();

    // ============================================
    // STEP 6: Initialize Health Monitoring (Phase 5)
    // ============================================
    logBot("Starting account health monitoring...", "info");
    accountHealthMonitor.startHealthChecks();
    logBot("✅ Account health monitoring active (5-minute intervals)", "success");
    global.healthMonitor = accountHealthMonitor;

    // ============================================
    // STEP 6.5: Initialize Linda AI Command System
    // ============================================
    if (!commandHandler) {
      commandHandler = new LindaCommandHandler(logBot);
      logBot("✅ Linda Command Handler initialized (31 commands available)", "success");
      global.commandHandler = commandHandler;
      logBot(`   - Command Registry: ${LindaCommandRegistry.getCommandCount()} commands`, "info");
      logBot(`   - Categories: ${LindaCommandRegistry.getCategoryCount()} command types`, "info");
      logBot(`   - Type !help in chat to see all commands`, "info");
    }

    logBot("\n╔═══════════════════════════════════════════════════════════════╗", "info");
    logBot("║           🚀 INITIALIZATION COMPLETE - 24/7 ACTIVE            ║", "success");
    logBot("║        All enabled accounts initialized with keep-alive       ║", "success");
    logBot("║              Linda AI Assistant System Ready!                 ║", "success");
    logBot("╚═══════════════════════════════════════════════════════════════╝\n", "info");

    // ============================================
    // STEP 7: Setup Interactive Terminal Dashboard
    // ============================================
    setupTerminalInputListener();
    logBot("📊 Terminal dashboard ready - Press Ctrl+D or 'dashboard' to view health status", "info");
    logBot("   Available commands: 'dashboard' | 'health' | 'relink' | 'status' | 'quit'", "info");
    logBot("   Chat commands: Type !help for full command list", "info");

    isInitializing = false;

  } catch (error) {
    logBot(`Initialization Error: ${error.message}`, "error");

    if (error.message.includes("browser is already running") && initAttempts < MAX_INIT_ATTEMPTS) {
      logBot("Browser lock detected - cleaning up and retrying...", "warn");
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
 * Initialize database and analytics (Phase 2)
 */
async function initializeDatabase() {
  logBot("Initializing database and analytics...", "info");

  try {
    const AKOYA_SHEET_ID = process.env.AKOYA_ORGANIZED_SHEET_ID;

    if (AKOYA_SHEET_ID) {
      try {
        const { quickValidateSheet } = await import("./code/utils/sheetValidation.js");
        const sheetValid = await quickValidateSheet(AKOYA_SHEET_ID);
        
        if (sheetValid) {
          const contextIntegration = new AIContextIntegration();
          try {
            await contextIntegration.initialize(AKOYA_SHEET_ID, { cacheExpiry: 3600 });
            logBot("Database context loaded into memory", "success");
            global.databaseContext = contextIntegration;
          } catch (error) {
            logBot(`Context initialization failed: ${error.message}`, "warn");
          }

          try {
            const operationalAnalytics = new OperationalAnalytics(AKOYA_SHEET_ID);
            global.analytics = operationalAnalytics;
            logBot("Analytics service initialized", "success");
          } catch (error) {
            logBot(`Analytics initialization failed: ${error.message}`, "warn");
          }
        } else {
          logBot("Sheet validation failed - using legacy mode", "warn");
        }
      } catch (error) {
        logBot(`Database initialization error: ${error.message}`, "warn");
      }
    }
  } catch (error) {
    logBot(`Database error: ${error.message}`, "warn");
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
    
    // Update device status file
    const now = new Date().toISOString();
    updateDeviceStatus(phoneNumber, {
      deviceLinked: true,
      linkedAt: now,
      lastConnected: now,
      authMethod: 'restore',
    });
    
    sessionStateManager.saveAccountState(phoneNumber, {
      phoneNumber: phoneNumber,
      displayName: config?.displayName || "Unknown Account",
      deviceLinked: true,
      isActive: false,
      sessionPath: `sessions/session-${phoneNumber}`,
      lastKnownState: "authenticated"
    });
    
    // Mark device as linked in device manager
    if (deviceLinkedManager) {
      deviceLinkedManager.markDeviceLinked(phoneNumber, {
        linkedAt: now,
        authMethod: 'restore',
        ipAddress: null,
      });
      logBot(`📊 Device manager updated (restore) for ${phoneNumber}`, "success");
      sessionStateManager.recordDeviceLinkEvent(phoneNumber, 'success');
    }
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
    
    // NEW: Start keep-alive heartbeats for 24/7 operation
    keepAliveManager.startKeepAlive(phoneNumber, client);
    
    // Initialize contact lookup handler (Phase B)
    try {
      if (!contactHandler) {
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

  client.once("auth_failure", async (msg) => {
    logBot(`Session restore failed for ${phoneNumber}: ${msg}`, "error");
    logBot("Falling back to new QR code authentication...", "warn");
    
    // FALLBACK: Setup new QR code linking instead of failing
    try {
      setupNewLinkingFlow(client, phoneNumber, config?.id || phoneNumber);
    } catch (error) {
      logBot(`Fallback QR setup failed: ${error.message}`, "error");
      isInitializing = false;
    }
  });

  client.on("disconnected", (reason) => {
    logBot(`Disconnected (${phoneNumber}): ${reason}`, "warn");
    
    // NEW: Mark device as unlinked in device manager
    if (deviceLinkedManager) {
      deviceLinkedManager.markDeviceUnlinked(phoneNumber, reason || 'disconnected');
    }
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
function setupNewLinkingFlow(client, phoneNumber, botId) {
  logBot(`Setting up device linking for ${phoneNumber}...`, "info");

  let qrShown = false;
  let authComplete = false;
  let initializationStarted = false;

  client.on("qr", async (qr) => {
    if (!qrShown) {
      qrShown = true;
      
      // NEW: Mark device as linking in device manager
      if (deviceLinkedManager) {
        deviceLinkedManager.startLinkingAttempt(phoneNumber);
      }
      
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
    
    // Update device status file
    const now = new Date().toISOString();
    updateDeviceStatus(phoneNumber, {
      deviceLinked: true,
      linkedAt: now,
      lastConnected: now,
      authMethod: 'qr',
    });
    
    // Mark device as linked in device manager
    if (deviceLinkedManager) {
      deviceLinkedManager.markDeviceLinked(phoneNumber, {
        linkedAt: now,
        authMethod: 'qr',
        ipAddress: null,
      });
      logBot(`📊 Device manager updated for ${phoneNumber}`, "success");
    }
    
    sessionStateManager.saveAccountState(phoneNumber, {
      phoneNumber: phoneNumber,
      displayName: "WhatsApp Account",
      deviceLinked: true,
      isActive: false,
      sessionPath: `sessions/session-${botId}`,
      lastKnownState: "authenticated"
    });
    
    sessionStateManager.recordDeviceLinkEvent(phoneNumber, 'success');
  });

  client.once("ready", async () => {
    logBot(`🟢 READY - ${phoneNumber} is online`, "ready");
    logBot("Session saved for future restarts", "success");
    
    allInitializedAccounts.push(client);
    await sessionStateManager.markRecoverySuccess(phoneNumber);
    
    // PHASE 5: Register account for health monitoring
    accountHealthMonitor.registerAccount(phoneNumber, client);
    
    // NEW: Start keep-alive heartbeats for 24/7 operation
    keepAliveManager.startKeepAlive(phoneNumber, client);
    
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
    
    // NEW: Mark device as unlinked in device manager
    if (deviceLinkedManager) {
      deviceLinkedManager.markDeviceUnlinked(phoneNumber, reason || 'disconnected');
    }
  });

  client.on("error", (error) => {
    logBot(`Error during linking (${phoneNumber}): ${error.message}`, "error");
  });

  // CRITICAL: Always initialize client to trigger QR event
  if (!initializationStarted) {
    initializationStarted = true;
    logBot(`Initializing WhatsApp client for ${phoneNumber}...`, "info");
    try {
      client.initialize();
    } catch (error) {
      logBot(`Failed to initialize client: ${error.message}`, "error");
      if (!error.message.includes("browser is already running")) {
        throw error;
      }
    }
  }
}

/**
 * Setup message listening for individual account (Phase 4 - multi-account)
 */
function setupMessageListeners(client, phoneNumber = "Unknown") {
  client.on("message", async (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    const from = msg.from.includes("@g.us") ? `Group: ${msg.from}` : `User: ${msg.from}`;
    
    // Update last activity for keep-alive tracking
    keepAliveManager.updateLastActivity(phoneNumber);
    
    logBot(`📨 [${timestamp}] (${phoneNumber}) ${from}: ${msg.body.substring(0, 50)}${msg.body.length > 50 ? "..." : ""}`, "info");

    try {
      // ═════════════════════════════════════════════════════════════════════════════
      // LINDA AI COMMAND SYSTEM - MASTER ACCOUNT ONLY
      // ═════════════════════════════════════════════════════════════════════════════
      // Only master account processes commands (has Linda's intelligence)
      // Secondary accounts are communication channels only
      const masterPhone = accountConfigManager?.getMasterPhoneNumber();
      const isMasterAccount = phoneNumber === masterPhone;

      if (isMasterAccount && commandHandler && msg.body.startsWith('!')) {
        const context = {
          deviceCount: deviceLinkedManager ? deviceLinkedManager.getLinkedDevices().length : 0,
          accountCount: accountClients.size,
          client: client,
          phoneNumber: phoneNumber,
          isMasterAccount: true
        };

        const cmdResult = await commandHandler.processMessage(msg, phoneNumber, context);
        
        if (cmdResult.processed) {
          // Command was processed successfully
          logBot(`✅ Command processed: ${cmdResult.command}`, "success");
          return; // Stop further processing
        } else if (cmdResult.isCommand) {
          // It was a command but had an error (already replied in handler)
          return;
        }
        // Otherwise, continue to conversation processing
      } else if (!isMasterAccount && msg.body.startsWith('!')) {
        // Secondary account received command - forward to master or inform user
        logBot(`📩 Command on secondary account: ${msg.body.substring(0, 30)}`, "info");
        
        if (masterPhone) {
          await msg.reply(`📢 Commands are processed by the master account.\n\nYou can still send messages to the master account for help!`);
        }
        return;
      }

      // ═════════════════════════════════════════════════════════════════════════════
      // CONVERSATION ANALYSIS & LEARNING - MASTER ACCOUNT ONLY
      // ═════════════════════════════════════════════════════════════════════════════
      if (isMasterAccount) {
        try {
          // Phase 3: Conversation type analysis (if enabled)
          if (typeof logMessageTypeCompact === 'function') {
            logMessageTypeCompact(msg);
          }
        } catch (error) {
          // Silent fail on analyzer
        }

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

        // Phase C: Goraha contact verification command (backward compatible)
        if (msg.body === "!verify-goraha") {
          logBot("📌 Goraha verification requested", "info");
          
          try {
            // Initialize service if needed
            if (!gorahaVerificationService) {
              gorahaVerificationService = new GorahaContactVerificationService(client);
              await gorahaVerificationService.initialize();
              logBot("✅ GorahaContactVerificationService initialized", "success");
              global.gorahaVerificationService = gorahaVerificationService;
            }

            // Send start message
            await msg.reply("🔍 Starting Goraha contact verification...\nThis may take a few minutes.\nI'll send results when complete.");
            logBot("Starting Goraha verification for all contacts...", "info");

            // Run verification
            const report = await gorahaVerificationService.verifyAllContacts({
              autoFetch: true,
              checkWhatsApp: true,
              saveResults: true
            });

            // Print report
            gorahaVerificationService.printReport(report);

            // Send summary to user
            const summary = report.summary;
            let resultMessage = `✅ GORAHA VERIFICATION COMPLETE\n\n`;
            resultMessage += `📊 Summary:\n`;
            resultMessage += `• Contacts Checked: ${summary.totalContacts}\n`;
            resultMessage += `• Valid Numbers: ${summary.validPhoneNumbers}\n`;
            resultMessage += `• With WhatsApp: ${summary.withWhatsApp}\n`;
            resultMessage += `• WITHOUT WhatsApp: ${summary.withoutWhatsApp}\n`;
            resultMessage += `• Coverage: ${summary.percentageWithWhatsApp}\n`;

            if (summary.withoutWhatsApp > 0) {
              resultMessage += `\n⚠️ ${summary.withoutWhatsApp} number(s) need attention\n`;
              
              const numbersList = gorahaVerificationService.getNumbersSansWhatsApp();
              if (numbersList.length > 0 && numbersList.length <= 10) {
                resultMessage += `\nNumbers without WhatsApp:\n`;
                numbersList.forEach((item, idx) => {
                  resultMessage += `${idx + 1}. ${item.name}: ${item.number}\n`;
                });
              } else if (numbersList.length > 10) {
                resultMessage += `\nToo many to list (${numbersList.length} total). Check logs.\n`;
              }
            } else {
              resultMessage += `\n✅ All contacts have WhatsApp accounts!`;
            }

            await msg.reply(resultMessage);
            logBot("Verification results sent to user", "success");

          } catch (error) {
            logBot(`❌ Verification error: ${error.message}`, "error");
            await msg.reply(`❌ Verification failed: ${error.message}`);
          }
        }
      }

    } catch (error) {
      logBot(`Error processing message: ${error.message}`, "error");
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
  logBot("Initiating graceful shutdown...", "info");
  
  try {
    // 0. Stop health monitoring (Phase 5) - only if available
    if (typeof accountHealthMonitor !== 'undefined') {
      logBot("Stopping health monitoring...", "info");
      accountHealthMonitor.stopHealthChecks();
    }
    
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
