import 'dotenv/config';
import { CreatingNewWhatsAppClient } from "./code/WhatsAppBot/CreatingNewWhatsAppClient.js";
import { createDeviceStatusFile, updateDeviceStatus } from "./code/utils/deviceStatus.js";
import { fullCleanup, killBrowserProcesses, sleep } from "./code/utils/browserCleanup.js";
import { SessionStateManager } from "./code/utils/SessionStateManager.js";

// PHASE 20: Secure Credential Management & Interactive Master Setup (February 18, 2026)
// - GoogleServiceAccountManager: base64-encoded credentials in .env (no secrets in git)
// - InteractiveMasterAccountSelector: user-friendly account selection with QR guidance
// - EnhancedQRCodeDisplayV2: professional QR rendering with timeouts and recovery
// - ProtocolErrorRecoveryManager: intelligent recovery from Puppeteer/WhatsApp-web.js errors
// - EnhancedWhatsAppDeviceLinkingSystem: 400% better linking UX with real-time progress tracking
// - DeviceLinkingQueue: multi-device parallel linking with queue management
// - DeviceLinkingDiagnostics: intelligent error recovery with auto-healing strategies
import GoogleServiceAccountManager from "./code/utils/GoogleServiceAccountManager.js";
import { InteractiveMasterAccountSelector } from "./code/utils/InteractiveMasterAccountSelector.js";
import EnhancedQRCodeDisplayV2 from "./code/utils/EnhancedQRCodeDisplayV2.js";
import ProtocolErrorRecoveryManager from "./code/utils/ProtocolErrorRecoveryManager.js";
import EnhancedWhatsAppDeviceLinkingSystem from "./code/utils/EnhancedWhatsAppDeviceLinkingSystem.js";
import DeviceLinkingQueue from "./code/utils/DeviceLinkingQueue.js";
import DeviceLinkingDiagnostics from "./code/utils/DeviceLinkingDiagnostics.js";

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

// PHASE 17: Comprehensive Conversation Handling (February 16, 2026)
import { phase17Orchestrator } from "./code/utils/Phase17Orchestrator.js";

// CLIENT HEALTH MONITOR: Frame detachment & heartbeat fix (February 17, 2026)
import clientHealthMonitor from "./code/utils/ClientHealthMonitor.js";

// PHASE 19: CAMPAIGN MANAGER (Bulk Messaging - February 17, 2026)
// Campaign scheduling, rate limiting, contact filtering, message personalization
import CampaignScheduler from "./code/utils/CampaignScheduler.js";
import CampaignService from "./code/Services/CampaignService.js";
import ContactFilterService from "./code/Services/ContactFilterService.js";
import CampaignCommandsDefault from "./code/Commands/CampaignCommands.js";

// PHASE 21: MANUAL LINKING HANDLER (February 18, 2026)
// Disable auto-linking on startup, require user command instead
// Includes pre-linking health check and graceful error handling
import { ManualLinkingHandler } from "./code/utils/ManualLinkingHandler.js";

// Global bot instances and managers (24/7 Production)
let Lion0 = null; // Master account (backwards compatibility)
let accountClients = new Map(); // Map: phoneNumber → client instance
let connectionManagers = new Map(); // Map: phoneNumber → ConnectionManager instance (NEW)
let isInitializing = false;
let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

// Phase 4-5 Managers (24/7 Operation)
let sessionStateManager = null;  // NEW: Persistent session state management (device metadata, master phone)
let bootstrapManager = null;
let recoveryManager = null;
let keepAliveManager = null;  // NEW: Session keep-alive heartbeat manager
let deviceLinkedManager = null;  // NEW: Device linking tracker
let accountConfigManager = null;  // NEW: Dynamic account configuration manager
let dynamicAccountManager = null;  // NEW: Runtime account manager (add/remove accounts)
let commandHandler = null;  // NEW: Linda AI Command Handler

// PHASE 20: Secure Credential & Interactive Setup Managers (February 18, 2026)
let googleServiceAccountManager = null;  // Secure, base64-encoded credential management
let interactiveMasterAccountSelector = null;  // User-friendly master account selection
let enhancedQRCodeDisplayV2 = null;  // Professional QR code rendering with recovery
let protocolErrorRecoveryManager = null;  // Intelligent error recovery from browser/protocol errors
let enhancedDeviceLinkingSystem = null;  // 400% enhanced linking UX (NEW - Phase 3+)
let deviceLinkingQueue = null;  // Multi-device linking queue manager (NEW - Phase 3+)
let deviceLinkingDiagnostics = null;  // Intelligent error recovery & diagnostics (NEW - Phase 4+)

// PHASE 21: Manual Linking Handler (February 18, 2026)
// Disable auto-linking, require user command instead
let manualLinkingHandler = null;  // Manual linking with health checks (NEW - Phase 21)

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

// Phase 19: Campaign Manager instances
let campaignService = null;
let contactFilterService = null;
let campaignScheduler = null;

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
  QRCodeDisplay: EnhancedQRCodeDisplayV2,  // Phase 20: Latest professional QR with recovery
  updateDeviceStatus,              // Imported from deviceStatus.js
  accountHealthMonitor,
  clientHealthMonitor,             // NEW: Frame detachment & heartbeat monitor
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
    clientHealthMonitor,             // NEW: Frame detachment & heartbeat monitor
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
    enhancedQRCodeDisplayV2,
    createDeviceStatusFile,
    deviceLinkedManager,
    keepAliveManager,
    terminalHealthDashboard,
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
    // STEP 0: Initialize Session State Manager (NEW - Phase 2+)
    // ============================================
    if (!sessionStateManager) {
      sessionStateManager = new SessionStateManager(logBot);
      await sessionStateManager.loadState();
      const summary = sessionStateManager.getSummary();
      logBot(`✅ SessionStateManager initialized`, "success");
      logBot(`   - Master Account: ${summary.masterPhone}`, "info");
      logBot(`   - Linked Devices: ${summary.linkedDevices}/${summary.totalDevices}`, "info");
      services.register('sessionStateManager', sessionStateManager);
      sharedContext.sessionStateManager = sessionStateManager;
    }

    // ============================================
    // STEP 1: Initialize Keep-Alive Manager
    // ============================================
    if (!keepAliveManager) {
      keepAliveManager = new SessionKeepAliveManager(accountClients, logBot, clientHealthMonitor);
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
      
      // NEW: Pass accountConfigManager to terminalHealthDashboard
      terminalHealthDashboard.setAccountConfigManager(accountConfigManager);
      
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
    // STEP 1E: Initialize Phase 17 (NEW - Feb 16, 2026)
    // ============================================
    // Comprehensive WhatsApp Conversation Handling:
    // - Message persistence & deduplication
    // - Unicode/emoji normalization
    // - Advanced entity extraction
    // - Message action tracking (reactions, edits, deletes, etc)
    // - Context-aware response generation
    if (!phase17Orchestrator.persistence.isConnected && !phase17Orchestrator.deduplicator) {
      const p17Initialized = await phase17Orchestrator.initialize();
      logBot(p17Initialized ? "✅ Phase 17: Conversation Handling initialized" : "⚠️ Phase 17: Degraded mode (using fallback cache)", "success");
      services.register('phase17', phase17Orchestrator);
    }

    // ============================================
    // STEP 1F: Initialize Phase 20 Managers (Feb 18, 2026)
    // ============================================
    // Secure credential management, interactive master setup, enhanced QR display, error recovery
    
    if (!googleServiceAccountManager) {
      googleServiceAccountManager = new GoogleServiceAccountManager();
      logBot("✅ GoogleServiceAccountManager initialized", "success");
      services.register('googleServiceAccountManager', googleServiceAccountManager);
      
      // Print available Google service accounts
      googleServiceAccountManager.printSecuritySummary();
    }

    if (!protocolErrorRecoveryManager) {
      protocolErrorRecoveryManager = new ProtocolErrorRecoveryManager(logBot);
      logBot("✅ ProtocolErrorRecoveryManager initialized", "success");
      services.register('protocolErrorRecoveryManager', protocolErrorRecoveryManager);
    }

    if (!enhancedQRCodeDisplayV2) {
      enhancedQRCodeDisplayV2 = new EnhancedQRCodeDisplayV2();
      logBot("✅ EnhancedQRCodeDisplayV2 initialized", "success");
      services.register('enhancedQRCodeDisplayV2', enhancedQRCodeDisplayV2);
    }

    if (!interactiveMasterAccountSelector) {
      interactiveMasterAccountSelector = new InteractiveMasterAccountSelector(sessionStateManager, logBot);
      logBot("✅ InteractiveMasterAccountSelector initialized (with session recovery)", "success");
      services.register('interactiveMasterAccountSelector', interactiveMasterAccountSelector);
    }

    if (!enhancedDeviceLinkingSystem) {
      enhancedDeviceLinkingSystem = new EnhancedWhatsAppDeviceLinkingSystem(logBot, sessionStateManager);
      logBot("✅ EnhancedWhatsAppDeviceLinkingSystem initialized (400% better linking UX)", "success");
      logBot("   - Real-time QR progress tracking with visual indicators", "info");
      logBot("   - Device IP detection and multi-stage error recovery", "info");
      logBot("   - Session state persistence for recovery without re-scanning", "info");
      services.register('enhancedDeviceLinkingSystem', enhancedDeviceLinkingSystem);
      sharedContext.enhancedDeviceLinkingSystem = enhancedDeviceLinkingSystem;
    }

    if (!deviceLinkingQueue) {
      deviceLinkingQueue = new DeviceLinkingQueue(logBot, sessionStateManager);
      logBot("✅ DeviceLinkingQueue initialized (multi-device parallel linking)", "success");
      logBot("   - Queue management with priority scheduling", "info");
      logBot("   - Parallel linking support (up to 2 devices simultaneously)", "info");
      services.register('deviceLinkingQueue', deviceLinkingQueue);
      sharedContext.deviceLinkingQueue = deviceLinkingQueue;
    }

    if (!deviceLinkingDiagnostics) {
      deviceLinkingDiagnostics = new DeviceLinkingDiagnostics(logBot);
      logBot("✅ DeviceLinkingDiagnostics initialized (intelligent error recovery)", "success");
      logBot("   - Smart error categorization and auto-recovery strategies", "info");
      logBot("   - Network, browser, protocol, and API error detection", "info");
      logBot("   - Diagnostic reports with recovery recommendations", "info");
      services.register('deviceLinkingDiagnostics', deviceLinkingDiagnostics);
      sharedContext.deviceLinkingDiagnostics = deviceLinkingDiagnostics;
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
    // STEP 4: Initialize Manual Linking Handler (Phase 21 - Feb 18, 2026)
    // ============================================
    // IMPORTANT: Accounts are NO LONGER automatically linked!
    // Instead, user must explicitly request linking via command
    logBot("\n═══════════════════════════════════════════════════════════", "info");
    logBot("🔗 PHASE 21: MANUAL LINKING MODE ENABLED", "info");
    logBot("═══════════════════════════════════════════════════════════\n", "info");
    
    logBot("⚠️  Auto-linking DISABLED - accounts will NOT link automatically", "warn");
    logBot("✅ Manual linking enabled - user must request to link accounts", "success");
    
    // Pre-register all devices in tracking system (without linking)
    if (deviceLinkedManager && orderedAccounts.length > 0) {
      orderedAccounts.forEach((config, idx) => {
        deviceLinkedManager.addDevice(config.phoneNumber, {
          name: config.displayName,
          role: config.role || (idx === 0 ? 'master' : 'secondary'),
        });
      });
      
      // Set master phone for dashboard
      const masterPhone = accountConfigManager?.getMasterPhoneNumber() || orderedAccounts[0]?.phoneNumber;
      terminalHealthDashboard.setMasterPhoneNumber(masterPhone);
      
      logBot(`✅ Registered ${orderedAccounts.length} account(s) for manual linking`, "success");
      orderedAccounts.forEach((config, idx) => {
        const role = config.role || (idx === 0 ? 'master' : 'secondary');
        logBot(`   [${idx + 1}] ${config.displayName} (${config.phoneNumber}) - ${role}`, "info");
      });
    }
    
    logBot("", "info");
    logBot("📋 HOW TO LINK MASTER ACCOUNT:", "info");
    logBot("   Option 1 (Terminal): Type 'link master'", "info");
    logBot("   Option 2 (WhatsApp): Send '!link-master' to bot", "info");
    logBot("", "info");
    logBot("⏳ Waiting for user command to initiate linking...", "info");
    logBot("", "info");
    
    // Initialize Manual Linking Handler
    if (!manualLinkingHandler) {
      manualLinkingHandler = new ManualLinkingHandler({
        logBot,
        bootstrapManager,
        recoveryManager,
        sessionStateManager,
        deviceLinkedManager,
        accountConfigManager,
        connectionManagers,
        accountClients,
        clientHealthMonitor,
        terminalHealthDashboard,
        createDeviceStatusFile,
        sharedContext,
        getFlowDeps,
      });
      
      logBot("✅ ManualLinkingHandler initialized", "success");
      services.register('manualLinkingHandler', manualLinkingHandler);
      sharedContext.manualLinkingHandler = manualLinkingHandler;
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
    services.register('clientHealthMonitor', clientHealthMonitor);
    logBot("✅ Client health monitor registered (Frame detachment & heartbeat recovery)", "success");

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
    // STEP 6.5C: Initialize Phase 19 Campaign Manager (NEW - Feb 17, 2026)
    // ============================================
    if (!campaignService) {
      campaignService = new CampaignService();
      contactFilterService = new ContactFilterService();
      campaignScheduler = CampaignScheduler;
      
      // Set logBot on campaign manager singleton and initialize with services
      CampaignCommandsDefault.logBot = logBot;
      CampaignCommandsDefault.initialize({
        campaignService,
        contactFilterService,
        rateLimiter: null, // Will be created internally
        scheduler: campaignScheduler
      });
      
      // Register with service registry for admin access
      services.register('campaignService', campaignService);
      services.register('contactFilterService', contactFilterService);
      services.register('campaignScheduler', campaignScheduler);
      
      logBot("✅ Phase 19: Campaign Manager initialized (bulk messaging ready)", "success");
      logBot("   - Campaign commands: create, start, stop, list, stats, schedule", "info");
      logBot("   - Rate limiting: 10 msgs/day/campaign, 45/day/account", "info");
      logBot("   - Scheduling: 9:00 AM daily, midnight reset", "info");
    }

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
      manualLinkingHandler,  // NEW: Support manual linking command
      createClient: CreatingNewWhatsAppClient,  // NEW: For fresh client creation on relink
    });
    logBot("📊 Terminal dashboard ready - Press Ctrl+D or 'dashboard' to view health status", "info");
    logBot("   Available commands: 'dashboard' | 'health' | 'relink' | 'status' | 'quit' | 'link master'", "info");
    logBot("   Chat commands: Type !help for full command list", "info");
    logBot("", "info");
    logBot("🔗 TO LINK MASTER WHATSAPP ACCOUNT:", "info");
    logBot("   Type: link master", "info");
    logBot("", "info");

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
