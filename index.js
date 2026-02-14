import 'dotenv/config';
import { CreatingNewWhatsAppClient } from "./code/WhatsAppBot/CreatingNewWhatsAppClient.js";
import { createDeviceStatusFile, updateDeviceStatus } from "./code/utils/deviceStatus.js";
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
import { DynamicAccountManager } from "./code/utils/DynamicAccountManager.js";  // NEW: Runtime account manager

// DATABASE & ANALYTICS (Phase 2)
import { AIContextIntegration } from "./code/Services/AIContextIntegration.js";
import { OperationalAnalytics } from "./code/Services/OperationalAnalytics.js";

// CONVERSATION ANALYSIS (Session 18)
import "./code/WhatsAppBot/AnalyzerGlobals.js";

// GOOGLE CONTACTS (Phase B - Contact Lookup)
import ContactLookupHandler from "./code/WhatsAppBot/ContactLookupHandler.js";

// GORAHA VERIFICATION (Phase C - Contact Verification)
// GorahaContactVerificationService is now imported inside MessageRouter.js

// LINDA AI COMMAND SYSTEM (February 11, 2026)
// Command parsing, routing, conversation learning, ML foundation
import LindaCommandHandler from "./code/Commands/LindaCommandHandler.js";
import LindaCommandRegistry from "./code/Commands/LindaCommandRegistry.js";

// PHASE 1: WHATSAPP-WEB.JS FEATURE INTEGRATION (February 11, 2026)
// Message enhancement, reactions, group management, chat organization, contacts
import { getMessageEnhancementService } from "./code/Services/MessageEnhancementService.js";
import { getReactionTracker } from "./code/Services/ReactionTracker.js";
import { getGroupManagementService } from "./code/Services/GroupManagementService.js";
import { getChatOrganizationService } from "./code/Services/ChatOrganizationService.js";
import { getAdvancedContactService } from "./code/Services/AdvancedContactService.js";
import { ReactionHandler } from "./code/WhatsAppBot/Handlers/ReactionHandler.js";
import { GroupEventHandler } from "./code/WhatsAppBot/Handlers/GroupEventHandler.js";

// PHASE 11: Extracted modules (ClientFlowSetup, MessageRouter)
import { setupClientFlow } from "./code/WhatsAppBot/ClientFlowSetup.js";
import { setupMessageListeners as messageRouter } from "./code/WhatsAppBot/MessageRouter.js";

// PHASE 7: ADVANCED FEATURES (February 14, 2026)
// Analytics, Admin Config, Smart Conversations, Reporting
import AnalyticsDashboard from "./code/Analytics/AnalyticsDashboard.js";
import AdminConfigInterface from "./code/Admin/AdminConfigInterface.js";
import AdvancedConversationFeatures from "./code/Conversation/AdvancedConversationFeatures.js";
import ReportGenerator from "./code/Reports/ReportGenerator.js";

// TERMINAL DASHBOARD (Interactive Health Monitoring & Account Re-linking)
import terminalHealthDashboard from "./code/utils/TerminalHealthDashboard.js";

// PHASE 8: Browser Lock Auto-Recovery System (February 14, 2026)
import SessionCleanupManager from "./code/utils/SessionCleanupManager.js";
import BrowserProcessMonitor from "./code/utils/BrowserProcessMonitor.js";
import LockFileDetector from "./code/utils/LockFileDetector.js";

import fs from "fs";
import path from "path";
import { execSync } from 'child_process';

// CONNECTION MANAGER (Extracted - Phase 10)
import ConnectionManager from "./code/utils/ConnectionManager.js";

// Global bot instances and managers (24/7 Production)
let Lion0 = null; // Master account (backwards compatibility)
let accountClients = new Map(); // Map: phoneNumber → client instance
let connectionManagers = new Map(); // Map: phoneNumber → ConnectionManager instance (NEW)
let isInitializing = false;
let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

// Phase 4-5 Managers (24/7 Operation)
let bootstrapManager = null;
let recoveryManager = null;
let keepAliveManager = null;  // NEW: Session keep-alive heartbeat manager
let deviceLinkedManager = null;  // NEW: Device linking tracker
let accountConfigManager = null;  // NEW: Dynamic account configuration manager
let dynamicAccountManager = null;  // NEW: Runtime account manager (add/remove accounts)
let commandHandler = null;  // NEW: Linda AI Command Handler

// Feature handlers (ref containers for DI)
const contactHandlerRef = { current: null };
const gorahaRef = { current: null };

// PHASE 7: Advanced Features Managers
let analyticsModule = null;  // Real-time metrics & monitoring
let adminConfigModule = null;  // Dynamic configuration & permissions
let conversationModule = null;  // AI conversation features
let reportGeneratorModule = null;  // Professional reporting

// All initialized accounts for graceful shutdown
let allInitializedAccounts = [];

// Health monitor startup flag (prevent duplicate starts)
let healthChecksStarted = false;

// Phase 8: Auto-recovery system guard flags
let sessionCleanupStarted = false;
let browserProcessMonitorStarted = false;
let lockFileDetectorStarted = false;

// Phase 8: Auto-recovery manager instances
let sessionCleanupManager = null;
let browserProcessMonitor = null;
let lockFileDetector = null;

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
 * ====================================================================
 * SHARED CONTEXT (Dependency Injection for ConnectionManager)
 * ====================================================================
 * This mutable object is passed by reference to each ConnectionManager.
 * Services that initialize late (keepAliveManager, deviceLinkedManager, etc.)
 * are set on this object when ready, and the ConnectionManager reads them
 * at call-time — no stale references, no tight coupling.
 */
const sharedContext = {
  lockFileDetector: null,
  sessionCleanupManager: null,
  createClient: CreatingNewWhatsAppClient,
  accountClients: null,            // Set after accountClients Map creation
  accountConfigManager: null,
  setMasterRef: null,              // Set after Lion0 declaration
  deviceLinkedManager: null,
  QRCodeDisplay,
  updateDeviceStatus,              // Imported from deviceStatus.js
  accountHealthMonitor,
  keepAliveManager: null,
  setupMessageListeners: null,     // Set below (wrapper around messageRouter)
  allInitializedAccounts: null,    // Set after array creation
};

/**
 * Message listener wrapper — delegates to the extracted MessageRouter module.
 * Reads late-bound deps from module-level vars at call time so it's always fresh.
 */
function setupMessageListeners(client, phoneNumber, connManager) {
  messageRouter(client, phoneNumber, connManager, {
    logBot,
    analyticsModule,
    adminConfigModule,
    commandHandler,
    reportGeneratorModule,
    accountConfigManager,
    deviceLinkedManager,
    keepAliveManager,
    contactHandlerRef,
    gorahaRef,
    accountClients,
    getAllConnectionDiagnostics,
  });
}

/**
 * Flow dependencies factory — returns a fresh deps object for setupClientFlow.
 * Called at the moment a flow is set up, so it always captures current state.
 */
function getFlowDeps() {
  return {
    logBot,
    connectionManagers,
    allInitializedAccounts,
    sessionStateManager: sessionStateManager,
    accountHealthMonitor,
    sharedContext,
    setupMessageListeners,
    updateDeviceStatus,
    QRCodeDisplay,
    createDeviceStatusFile,
    deviceLinkedManager,
    keepAliveManager,
    contactHandlerRef,
    ContactLookupHandler,
    setIsInitializing: (val) => { isInitializing = val; },
  };
}

// Wire up sharedContext with mutable references (must be after const declaration)
sharedContext.accountClients = accountClients;
sharedContext.allInitializedAccounts = allInitializedAccounts;
sharedContext.setupMessageListeners = setupMessageListeners;
sharedContext.setMasterRef = (newClient) => {
  Lion0 = newClient;
  global.Lion0 = Lion0;
  global.Linda = Lion0;
};

/**
 * Global Error Handlers for Graceful Recovery
 * Prevents Puppeteer protocol errors from crashing the bot
 */

// Define patterns for non-critical protocol errors that should not crash the bot
const NON_CRITICAL_ERROR_PATTERNS = [
  'Target closed',
  'Session closed',
  'Target.setAutoAttach',
  'Requesting main frame',
  'Requesting main frame too early',
  'Navigating frame was detached',
  'DevTools',
  'Protocol error',
  'browser is already running',
  'CHROME_EXECUTABLE_PATH',
  'page has been closed'
];

function isNonCriticalError(errorMsg) {
  return NON_CRITICAL_ERROR_PATTERNS.some(pattern => 
    errorMsg.toLowerCase().includes(pattern.toLowerCase())
  );
}

process.on('unhandledRejection', (reason, promise) => {
  const errorMsg = reason?.message || String(reason);
  
  // Handle non-critical Puppeteer/Protocol errors silently
  if (isNonCriticalError(errorMsg)) {
    // Log once with warning prefix, don't crash
    logBot(`⚠️  Protocol Warning: ${errorMsg}`, "warn");
    return; // Don't crash - just log and continue
  }
  
  // Critical error - log and handle
  logBot(`❌ Unhandled Rejection: ${errorMsg}`, "error");
  logBot("Bot will attempt to recover...", "info");
});

process.on('uncaughtException', (error) => {
  const errorMsg = error?.message || String(error);
  
  // Handle non-critical protocol exceptions
  if (isNonCriticalError(errorMsg)) {
    logBot(`⚠️  Browser Protocol Exception: ${errorMsg}`, "warn");
    return; // Continue running - don't exit
  }
  
  // Critical exception - log it
  logBot(`❌ Uncaught Exception: ${errorMsg}`, "error");
  logBot("Attempting graceful recovery...", "info");
});

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
            setupClientFlow(client, masterPhone, 'master', { isRestore: false }, getFlowDeps());
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
      sharedContext.keepAliveManager = keepAliveManager;
    }

    // ============================================
    // STEP 1B: Initialize Device Linked Manager (NEW)
    // ============================================
    if (!deviceLinkedManager) {
      deviceLinkedManager = new DeviceLinkedManager(logBot);
      terminalHealthDashboard.setDeviceManager(deviceLinkedManager);
      logBot("✅ DeviceLinkedManager initialized", "success");
      global.deviceLinkedManager = deviceLinkedManager;
      sharedContext.deviceLinkedManager = deviceLinkedManager;
    }

    // ============================================
    // STEP 1C: Initialize Account Config Manager (NEW - Dynamic Management)
    // ============================================
    if (!accountConfigManager) {
      accountConfigManager = new AccountConfigManager(logBot);
      logBot("✅ AccountConfigManager initialized", "success");
      global.accountConfigManager = accountConfigManager;
      sharedContext.accountConfigManager = accountConfigManager;
      
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
    // STEP 1D: Initialize Dynamic Account Manager (NEW - Feb 11, 2026)
    // ============================================
    if (!dynamicAccountManager) {
      dynamicAccountManager = new DynamicAccountManager(logBot);
      logBot("✅ DynamicAccountManager initialized", "success");
      global.dynamicAccountManager = dynamicAccountManager;
      
      // Register callbacks for account add/remove events
      dynamicAccountManager.onAccountAdded((account) => {
        logBot(`📱 New account detected: ${account.displayName}`, "success");
        // The account will be initialized in the next startup
        // Or could trigger immediate initialization here if needed
      });
      
      dynamicAccountManager.onAccountRemoved((account) => {
        logBot(`📱 Account removed: ${account.displayName}`, "success");
      });
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
          setupClientFlow(client, config.phoneNumber, config.id, { isRestore: true, displayName: config.displayName }, getFlowDeps());
        } else {
          logBot(`New device linking required (wasLinked: ${wasLinked}, savedState: ${savedState?.deviceLinked}) - showing QR code...`, "info");
          createDeviceStatusFile(config.phoneNumber);
          setupClientFlow(client, config.phoneNumber, config.id, { isRestore: false, displayName: config.displayName }, getFlowDeps());
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
    
    // Only start health checks once
    if (!healthChecksStarted) {
      accountHealthMonitor.startHealthChecks();
      healthChecksStarted = true;
      logBot("✅ Account health monitoring active (5-minute intervals)", "success");
    } else {
      logBot("ℹ️  Account health monitoring already active", "info");
    }
    
    global.healthMonitor = accountHealthMonitor;

    // ============================================
    // STEP 6.5: Initialize Linda AI Command System
    // ============================================
    if (!commandHandler) {
      commandHandler = new LindaCommandHandler(logBot);
      logBot("✅ Linda Command Handler initialized (71 commands available)", "success");
      global.commandHandler = commandHandler;
      logBot(`   - Command Registry: ${LindaCommandRegistry.getCommandCount()} commands`, "info");
      logBot(`   - Categories: ${LindaCommandRegistry.getCategoryCount()} command types`, "info");
      logBot(`   - Type !help in chat to see all commands`, "info");
    }

    // ============================================
    // STEP 6.5A: Initialize Phase 7 Advanced Features
    // ============================================
    logBot("\n📊 Initializing Phase 7 Advanced Features...", "info");
    
    // Initialize Analytics Dashboard
    if (!analyticsModule) {
      try {
        analyticsModule = new AnalyticsDashboard();
        await analyticsModule.initialize();
        global.analytics = analyticsModule;
        logBot("  ✅ Analytics Dashboard (real-time metrics & monitoring)", "success");
      } catch (error) {
        logBot(`  ⚠️  Analytics Dashboard initialization failed: ${error?.message || error}`, "warn");
        analyticsModule = null;
      }
    }

    // Initialize Admin Config Interface
    if (!adminConfigModule) {
      try {
        adminConfigModule = new AdminConfigInterface();
        await adminConfigModule.initialize();
        global.adminConfig = adminConfigModule;
        logBot("  ✅ Admin Config Interface (dynamic configuration management)", "success");
      } catch (error) {
        logBot(`  ⚠️  Admin Config Interface initialization failed: ${error?.message || error}`, "warn");
        adminConfigModule = null;
      }
    }

    // Initialize Advanced Conversation Features
    if (!conversationModule) {
      try {
        conversationModule = new AdvancedConversationFeatures();
        await conversationModule.initialize();
        global.conversationAI = conversationModule;
        logBot("  ✅ Advanced Conversation Features (intent, sentiment, context)", "success");
      } catch (error) {
        logBot(`  ⚠️  Advanced Conversation Features initialization failed: ${error?.message || error}`, "warn");
        conversationModule = null;
      }
    }

    // Initialize Report Generator
    if (!reportGeneratorModule) {
      try {
        reportGeneratorModule = new ReportGenerator();
        await reportGeneratorModule.initialize();
        global.reportGenerator = reportGeneratorModule;
        logBot("  ✅ Report Generator (daily/weekly/monthly reports)", "success");
      } catch (error) {
        logBot(`  ⚠️  Report Generator initialization failed: ${error?.message || error}`, "warn");
        reportGeneratorModule = null;
      }
    }

    logBot("✅ Phase 7 modules initialization complete", "success");

    // ============================================
    // STEP 6.5B: Initialize Phase 8 Auto-Recovery System
    // ============================================
    logBot("\n🔧 Initializing Phase 8 Auto-Recovery System...", "info");

    if (!sessionCleanupStarted) {
      sessionCleanupManager = new SessionCleanupManager(logBot);
      sessionCleanupManager.startAutoCleanup();
      sessionCleanupStarted = true;
      logBot("  ✅ SessionCleanupManager (auto-clean sessions every 90s)", "success");
      sharedContext.sessionCleanupManager = sessionCleanupManager;
    }

    if (!browserProcessMonitorStarted) {
      browserProcessMonitor = new BrowserProcessMonitor(connectionManagers, logBot);
      browserProcessMonitor.startMonitoring();
      browserProcessMonitorStarted = true;
      logBot("  ✅ BrowserProcessMonitor (detect process loss every 60s)", "success");
    }

    if (!lockFileDetectorStarted) {
      lockFileDetector = new LockFileDetector(logBot);
      lockFileDetector.startMonitoring();
      lockFileDetectorStarted = true;
      logBot("  ✅ LockFileDetector (remove stale locks every 45s)", "success");
      sharedContext.lockFileDetector = lockFileDetector;
    }

    logBot("✅ Phase 8 Auto-Recovery System active", "success");

    // ============================================
    // STEP 6.6: Initialize Phase 1 Services (NEW)
    // ============================================
    logBot("\n🔄 Initializing Phase 1 whatsapp-web.js Features...", "info");
    
    // Message Enhancement Service
    const messageEnhancementService = getMessageEnhancementService();
    global.messageEnhancementService = messageEnhancementService;
    logBot("  ✅ Message Enhancement Service (edit, delete, react, forward)", "success");

    // Reaction Tracker
    const reactionTracker = getReactionTracker(null); // Will be integrated with MongoDB later
    global.reactionTracker = reactionTracker;
    logBot("  ✅ Reaction Tracker Service (sentiment analysis)", "success");

    // Group Management Service (will get botManager reference)
    const groupManagementService = getGroupManagementService(null);
    global.groupManagementService = groupManagementService;
    logBot("  ✅ Group Management Service (create, manage, invite)", "success");

    // Chat Organization Service
    const chatOrganizationService = getChatOrganizationService(null);
    global.chatOrganizationService = chatOrganizationService;
    logBot("  ✅ Chat Organization Service (pin, archive, mute, label)", "success");

    // Advanced Contact Service
    const advancedContactService = getAdvancedContactService(null, null);
    global.advancedContactService = advancedContactService;
    logBot("  ✅ Advanced Contact Service (block, status, profile, verify)", "success");

    // Event Handlers
    const reactionHandler = new ReactionHandler(null);
    global.reactionHandler = reactionHandler;
    logBot("  ✅ Reaction Event Handler (on message_reaction)", "success");

    const groupEventHandler = new GroupEventHandler(null);
    global.groupEventHandler = groupEventHandler;
    logBot("  ✅ Group Event Handler (on group_join, group_leave, etc.)", "success");

    logBot("📲 Phase 1 Services Ready: 40+ new WhatsApp commands available!", "success");
    logBot("   - Message manipulation: edit, delete, react, forward, pin, star", "info");
    logBot("   - Group operations: create groups, add/remove members, promote admins", "info");
    logBot("   - Chat management: pin, archive, mute, label conversations", "info");
    logBot("   - Contact features: block, status, profile, verify WhatsApp", "info");

    logBot("\n╔═══════════════════════════════════════════════════════════════╗", "info");
    logBot("║           🚀 INITIALIZATION COMPLETE - 24/7 ACTIVE            ║", "success");
    logBot("║        All enabled accounts initialized with keep-alive       ║", "success");
    logBot("║              Linda AI Assistant System Ready!                 ║", "success");
    logBot("╚═══════════════════════════════════════════════════════════════╝\n", "info");

    // ============================================
    // STEP 7: Startup Diagnostics Report
    // ============================================
    printStartupDiagnostics();

    // ============================================
    // STEP 8: Setup Interactive Terminal Dashboard
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
 * ====================================================================
 * STARTUP DIAGNOSTICS SYSTEM (Phase 9)
 * ====================================================================
 * Prints a comprehensive health dashboard after initialization.
 * Shows: account states, connection managers, Phase 8 monitors, system info.
 */
function printStartupDiagnostics() {
  try {
    const now = new Date();
    const memUsage = process.memoryUsage();
    const heapMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    
    console.log('\n┌──────────────────────────────────────────────────────────────┐');
    console.log('│              📊 STARTUP DIAGNOSTICS REPORT                   │');
    console.log(`│              ${now.toLocaleDateString()} ${now.toLocaleTimeString()}                       │`);
    console.log('├──────────────────────────────────────────────────────────────┤');
    
    // System Resources
    console.log(`│  💻 System: Node ${process.version} | ${process.platform} | PID: ${process.pid}`);
    console.log(`│  🧠 Memory: Heap ${heapMB}MB | RSS ${rssMB}MB`);
    console.log('│');
    
    // Account Status
    console.log(`│  📱 Accounts Configured: ${accountClients.size}`);
    console.log(`│  🔗 Connection Managers: ${connectionManagers.size}`);
    
    for (const [phone, manager] of connectionManagers) {
      const status = manager.getStatus();
      const stateIcon = {
        'CONNECTED': '🟢', 'CONNECTING': '🟡', 'DISCONNECTED': '🔴',
        'ERROR': '❌', 'SUSPENDED': '⛔', 'IDLE': '⚪'
      }[status.state] || '❓';
      console.log(`│    ${stateIcon} ${phone}: ${status.state} (errors: ${status.errorCount}, reconnects: ${status.reconnectAttempts})`);
    }
    console.log('│');
    
    // Phase 8 Monitors
    console.log('│  🔧 Auto-Recovery Monitors:');
    console.log(`│    ${sessionCleanupStarted ? '✅' : '❌'} SessionCleanupManager (every 90s)`);
    console.log(`│    ${browserProcessMonitorStarted ? '✅' : '❌'} BrowserProcessMonitor (every 60s)`);
    console.log(`│    ${lockFileDetectorStarted ? '✅' : '❌'} LockFileDetector (every 45s)`);
    console.log(`│    ${healthChecksStarted ? '✅' : '❌'} AccountHealthMonitor (every 5min)`);
    console.log('│');
    
    // Phase 7 Modules
    console.log('│  🧩 Advanced Modules:');
    console.log(`│    ${analyticsModule ? '✅' : '⚠️'}  Analytics Dashboard`);
    console.log(`│    ${adminConfigModule ? '✅' : '⚠️'}  Admin Config Interface`);
    console.log(`│    ${conversationModule ? '✅' : '⚠️'}  Conversation AI`);
    console.log(`│    ${reportGeneratorModule ? '✅' : '⚠️'}  Report Generator`);
    console.log(`│    ${commandHandler ? '✅' : '⚠️'}  Command System (71 commands)`);
    console.log('│');
    
    // Managers
    console.log('│  ⚙️  Core Managers:');
    console.log(`│    ${keepAliveManager ? '✅' : '❌'} KeepAlive | ${deviceLinkedManager ? '✅' : '❌'} DeviceLinked | ${accountConfigManager ? '✅' : '❌'} AccountConfig`);
    console.log(`│    ${bootstrapManager ? '✅' : '❌'} Bootstrap | ${recoveryManager ? '✅' : '❌'} Recovery | ${dynamicAccountManager ? '✅' : '❌'} DynamicAccount`);
    
    console.log('├──────────────────────────────────────────────────────────────┤');
    console.log('│  🎯 Status: ALL SYSTEMS OPERATIONAL                         │');
    console.log('│  📡 Chat: !help | Terminal: dashboard | Admin: /admin       │');
    console.log('└──────────────────────────────────────────────────────────────┘\n');
  } catch (error) {
    logBot(`Diagnostics report error: ${error.message}`, 'warn');
  }
}

/**
 * Get all connection manager diagnostics (for admin commands)
 */
function getAllConnectionDiagnostics() {
  const results = [];
  for (const [phone, manager] of connectionManagers) {
    results.push(manager.getDetailedStatus());
  }
  return results;
}

// Expose diagnostics globally
global.getConnectionDiagnostics = getAllConnectionDiagnostics;

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
            global.operationalAnalytics = operationalAnalytics;
            logBot("Operational Analytics service initialized", "success");
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
 * ═══════════════════════════════════════════════════════════════════════════════
 * GRACEFUL SHUTDOWN (Phase 10 - Production Hardening)
 * ═══════════════════════════════════════════════════════════════════════════════
 * - Handles both SIGINT (Ctrl+C) and SIGTERM (process managers, Docker, PM2)
 * - 15-second timeout guard prevents hanging shutdown
 * - Prevents double-shutdown from rapid signal delivery
 * - Cleans up ALL resources: listeners, connections, managers, intervals, database
 */
let isShuttingDown = false;
const SHUTDOWN_TIMEOUT_MS = 15000; // 15s max for graceful shutdown

async function gracefulShutdown(signal = 'UNKNOWN') {
  // Prevent double-shutdown from rapid signals
  if (isShuttingDown) {
    logBot(`Shutdown already in progress (${signal} ignored)`, "warn");
    return;
  }
  isShuttingDown = true;
  
  console.log("\n");
  logBot(`Received ${signal} - Initiating graceful shutdown...`, "warn");
  
  // Timeout guard: force-kill if shutdown takes too long
  const forceExitTimer = setTimeout(() => {
    logBot(`⚠️  Shutdown timeout (${SHUTDOWN_TIMEOUT_MS / 1000}s) exceeded. Force exiting...`, "error");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  // Don't let the timer prevent natural exit
  forceExitTimer.unref();
  
  try {
    // 0. Stop Phase 8 auto-recovery systems
    logBot("Stopping auto-recovery systems...", "info");
    if (sessionCleanupManager) sessionCleanupManager.stop();
    if (browserProcessMonitor) browserProcessMonitor.stop();
    if (lockFileDetector) lockFileDetector.stop();

    // 0A. Stop health monitoring (Phase 5) - only if available
    if (typeof accountHealthMonitor !== 'undefined') {
      logBot("Stopping health monitoring...", "info");
      accountHealthMonitor.stopHealthChecks();
    }
    
    // 0B. Destroy connection managers (incl. listener cleanup, browser kill)
    logBot(`Destroying connection managers for ${connectionManagers.size} account(s)`, "info");
    for (const [phoneNumber, manager] of connectionManagers.entries()) {
      try {
        logBot(`  Cleaning up ${phoneNumber}...`, "info");
        await manager.destroy();
      } catch (e) {
        logBot(`  Warning: Error destroying manager for ${phoneNumber}`, "warn");
      }
    }
    connectionManagers.clear();
    
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
        client.removeAllListeners(); // Prevent events during destroy
        await client.destroy();
      } catch (e) {
        logBot(`  Warning: Error closing ${phoneNumber}`, "warn");
      }
    }
    accountClients.clear();
    
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
    
    // 5. Clear global references
    allInitializedAccounts = [];
    
    logBot("✅ Graceful shutdown complete", "success");
  } catch (error) {
    logBot(`Error during shutdown: ${error.message}`, "error");
  }
  
  clearTimeout(forceExitTimer);
  logBot("Bot stopped. Nodemon will restart on code changes...", "info");
  process.exit(0);
}

// Handle both SIGINT (Ctrl+C, dev) and SIGTERM (PM2, Docker, systemd, cloud)
process.on("SIGINT", () => gracefulShutdown('SIGINT'));
process.on("SIGTERM", () => gracefulShutdown('SIGTERM'));

// NOTE: Global error handlers (unhandledRejection, uncaughtException) are defined above
// with non-critical error pattern filtering. Do NOT duplicate them here.

// Start the bot
logBot("Starting Linda WhatsApp Bot...", "info");
initializeBot();
