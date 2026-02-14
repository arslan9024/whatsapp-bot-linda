import 'dotenv/config';
import { CreatingNewWhatsAppClient } from "./code/WhatsAppBot/CreatingNewWhatsAppClient.js";
import { createDeviceStatusFile, updateDeviceStatus } from "./code/utils/deviceStatus.js";
import { fullCleanup, killBrowserProcesses, sleep } from "./code/utils/browserCleanup.js";
import sessionStateManager from "./code/utils/SessionStateManager.js";
import QRCodeDisplay from "./code/utils/QRCodeDisplay.js";
import EnhancedQRCodeDisplay from "./code/utils/EnhancedQRCodeDisplay.js";  // Phase 14: Enhanced QR with terminal detection

// PHASE 3-5: Advanced Features (24/7 Production - February 9, 2026)
// Multi-account orchestration, device recovery, health monitoring, keep-alive system
import AccountBootstrapManager from "./code/WhatsAppBot/AccountBootstrapManager.js";
import { DeviceRecoveryManager } from "./code/utils/DeviceRecoveryManager.js";
import accountHealthMonitor from "./code/utils/AccountHealthMonitor.js";
import SessionKeepAliveManager from "./code/utils/SessionKeepAliveManager.js";
import DeviceLinkedManager from "./code/utils/DeviceLinkedManager.js";  // NEW: Device tracking manager
import { AccountConfigManager } from "./code/utils/AccountConfigManager.js";  // NEW: Dynamic account management
import { DynamicAccountManager } from "./code/utils/DynamicAccountManager.js";  // NEW: Runtime account manager

// DATABASE & ANALYTICS (Phase 2) — initialization extracted to DatabaseInitializer.js
// AIContextIntegration and OperationalAnalytics are imported there.

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

// PHASE 11: Extracted modules (ClientFlowSetup, MessageRouter)
import { setupClientFlow } from "./code/WhatsAppBot/ClientFlowSetup.js";
import { setupMessageListeners as messageRouter } from "./code/WhatsAppBot/MessageRouter.js";

// TERMINAL DASHBOARD (Interactive Health Monitoring & Account Re-linking)
import terminalHealthDashboard from "./code/utils/TerminalHealthDashboard.js";

// CONNECTION MANAGER (Extracted - Phase 10)
import ConnectionManager from "./code/utils/ConnectionManager.js";

// SERVICE REGISTRY (Phase 11 - replaces global.XXX)
import services from "./code/utils/ServiceRegistry.js";

// PHASE 12: Extracted modules (Error Handlers, Shutdown, Diagnostics, Database)
import { installProcessErrorHandlers } from "./code/utils/ProcessErrorHandlers.js";
import { createGracefulShutdown, installShutdownHandlers } from "./code/utils/GracefulShutdown.js";
import { printStartupDiagnostics } from "./code/utils/StartupDiagnostics.js";
import { initializeDatabase } from "./code/utils/DatabaseInitializer.js";

// PHASE 13: Feature initializers & terminal setup
import { initializeAdvancedFeatures, initializeAutoRecovery, initializePhase1Services } from "./code/utils/FeatureInitializer.js";
import { setupTerminalInputListener } from "./code/utils/TerminalDashboardSetup.js";

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
  QRCodeDisplay: EnhancedQRCodeDisplay,  // Phase 14: Use enhanced version with terminal detection
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
  services.register('Lion0', Lion0);
  services.register('Linda', Lion0);
};

/**
 * Global Error Handlers (Phase 12 — extracted to ProcessErrorHandlers.js)
 */
installProcessErrorHandlers(logBot);

// setupTerminalInputListener — extracted to TerminalDashboardSetup.js (Phase 13)

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
      services.register('keepAliveManager', keepAliveManager);
      sharedContext.keepAliveManager = keepAliveManager;
    }

    // ============================================
    // STEP 1B: Initialize Device Linked Manager (NEW)
    // ============================================
    if (!deviceLinkedManager) {
      deviceLinkedManager = new DeviceLinkedManager(logBot);
      terminalHealthDashboard.setDeviceManager(deviceLinkedManager);
      logBot("✅ DeviceLinkedManager initialized", "success");
      services.register('deviceLinkedManager', deviceLinkedManager);
      sharedContext.deviceLinkedManager = deviceLinkedManager;
    }

    // ============================================
    // STEP 1C: Initialize Account Config Manager (NEW - Dynamic Management)
    // ============================================
    if (!accountConfigManager) {
      accountConfigManager = new AccountConfigManager(logBot);
      logBot("✅ AccountConfigManager initialized", "success");
      services.register('accountConfigManager', accountConfigManager);
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
      services.register('dynamicAccountManager', dynamicAccountManager);
      
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
      services.register('bootstrapManager', bootstrapManager);
      services.register('recoveryManager', recoveryManager);
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
          services.register('Lion0', Lion0);
          services.register('Linda', Lion0);
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
    // STEP 5: Initialize Database & Analytics (Phase 12 — extracted)
    await initializeDatabase(logBot);

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
    
    services.register('healthMonitor', accountHealthMonitor);

    // ============================================
    // STEP 6.5: Initialize Linda AI Command System
    // ============================================
    if (!commandHandler) {
      commandHandler = new LindaCommandHandler(logBot);
      logBot("✅ Linda Command Handler initialized (71 commands available)", "success");
      services.register('commandHandler', commandHandler);
      logBot(`   - Command Registry: ${LindaCommandRegistry.getCommandCount()} commands`, "info");
      logBot(`   - Categories: ${LindaCommandRegistry.getCategoryCount()} command types`, "info");
      logBot(`   - Type !help in chat to see all commands`, "info");
    }

    // ============================================
    // STEP 6.5A: Initialize Phase 7 Advanced Features (Phase 13 — extracted)
    // ============================================
    const advancedFeatures = await initializeAdvancedFeatures(logBot);
    analyticsModule = advancedFeatures.analyticsModule;
    adminConfigModule = advancedFeatures.adminConfigModule;
    conversationModule = advancedFeatures.conversationModule;
    reportGeneratorModule = advancedFeatures.reportGeneratorModule;

    // ============================================
    // STEP 6.5B: Initialize Phase 8 Auto-Recovery (Phase 13 — extracted)
    // ============================================
    const recovery = initializeAutoRecovery({
      logBot,
      connectionManagers,
      sharedContext,
      guards: { sessionCleanupStarted, browserProcessMonitorStarted, lockFileDetectorStarted },
    });
    sessionCleanupManager = recovery.sessionCleanupManager;
    browserProcessMonitor = recovery.browserProcessMonitor;
    lockFileDetector = recovery.lockFileDetector;
    sessionCleanupStarted = recovery.guards.sessionCleanupStarted;
    browserProcessMonitorStarted = recovery.guards.browserProcessMonitorStarted;
    lockFileDetectorStarted = recovery.guards.lockFileDetectorStarted;

    // ============================================
    // STEP 6.6: Initialize Phase 1 Services (Phase 13 — extracted)
    // ============================================
    initializePhase1Services(logBot);

    logBot("\n╔═══════════════════════════════════════════════════════════════╗", "info");
    logBot("║           🚀 INITIALIZATION COMPLETE - 24/7 ACTIVE            ║", "success");
    logBot("║        All enabled accounts initialized with keep-alive       ║", "success");
    logBot("║              Linda AI Assistant System Ready!                 ║", "success");
    logBot("╚═══════════════════════════════════════════════════════════════╝\n", "info");

    // ============================================
    // STEP 7: Startup Diagnostics Report (Phase 12 — extracted)
    // ============================================
    printStartupDiagnostics({
      accountClients, connectionManagers,
      sessionCleanupStarted, browserProcessMonitorStarted,
      lockFileDetectorStarted, healthChecksStarted,
      analyticsModule, adminConfigModule, conversationModule,
      reportGeneratorModule, commandHandler,
      keepAliveManager, deviceLinkedManager, accountConfigManager,
      bootstrapManager, recoveryManager, dynamicAccountManager,
      logBot,
    });

    // ============================================
    // STEP 8: Setup Interactive Terminal Dashboard (Phase 13 — extracted)
    // ============================================
    setupTerminalInputListener({
      logBot,
      terminalHealthDashboard,
      accountConfigManager,
      deviceLinkedManager,
      accountClients,
      setupClientFlow,
      getFlowDeps,
    });
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
services.register('getConnectionDiagnostics', getAllConnectionDiagnostics);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GRACEFUL SHUTDOWN (Phase 12 — extracted to GracefulShutdown.js)
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const gracefulShutdown = createGracefulShutdown({
  logBot,
  sessionStateManager,
  accountHealthMonitor,
  connectionManagers,
  accountClients,
  allInitializedAccounts,
  sessionCleanupManager,
  browserProcessMonitor,
  lockFileDetector,
  clearAccounts: () => { allInitializedAccounts = []; },
});

installShutdownHandlers(gracefulShutdown);

// NOTE: Global error handlers (unhandledRejection, uncaughtException) are
// installed above via installProcessErrorHandlers(). Do NOT duplicate them.

// Start the bot
logBot("Starting Linda WhatsApp Bot...", "info");
initializeBot();
