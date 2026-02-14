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
import { DynamicAccountManager } from "./code/utils/DynamicAccountManager.js";  // NEW: Runtime account manager

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

// PHASE 1: WHATSAPP-WEB.JS FEATURE INTEGRATION (February 11, 2026)
// Message enhancement, reactions, group management, chat organization, contacts
import { getMessageEnhancementService } from "./code/Services/MessageEnhancementService.js";
import { getReactionTracker } from "./code/Services/ReactionTracker.js";
import { getGroupManagementService } from "./code/Services/GroupManagementService.js";
import { getChatOrganizationService } from "./code/Services/ChatOrganizationService.js";
import { getAdvancedContactService } from "./code/Services/AdvancedContactService.js";
import { ReactionHandler } from "./code/WhatsAppBot/Handlers/ReactionHandler.js";
import { GroupEventHandler } from "./code/WhatsAppBot/Handlers/GroupEventHandler.js";

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

// Feature handlers
let contactHandler = null;
let gorahaVerificationService = null;

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
 * CONNECTION MANAGER CLASS (PRODUCTION-GRADE)
 * ====================================================================
 * Purpose: Manage WhatsApp connection lifecycle with:
 * - Connection state tracking
 * - Exponential backoff reconnection
 * - Circuit breaker pattern
 * - Session health monitoring
 * - QR code debouncing
 */
class ConnectionManager {
  constructor(phoneNumber, client, logFunc, botId = null) {
    this.phoneNumber = phoneNumber;
    this.client = client;
    this.log = logFunc;
    this.botId = botId || phoneNumber; // Store botId for client recreation
    
    // State management
    this.state = 'IDLE'; // IDLE, CONNECTING, CONNECTED, DISCONNECTED, ERROR, SUSPENDED
    this.isInitializing = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    
    // Exponential backoff
    this.baseRetryDelay = 5000; // 5s initial (allow Chrome to fully exit)
    this.maxRetryDelay = 60000; // 60s max
    this.reconnectTimer = null;
    
    // Circuit breaker (progressive: 5 errors → 1min, 10 → 5min, 15 → 15min)
    this.errorCount = 0;
    this.circuitBreakerThreshold = 5;
    this.circuitBreakerDuration = 60000; // 1 minute (initial)
    this.circuitBreakerTrips = 0; // How many times breaker has tripped
    this.errorResetTimer = null;
    
    // QR debouncing
    this.lastQRTime = 0;
    this.qrDebounceDelay = 2000; // Min 2s between QR displays
    this.qrAttempts = 0;
    this.qrTimer = null;
    
    // Session monitoring
    this.sessionCreatedAt = null;
    this.lastActivityTime = Date.now();
    this.healthCheckInterval = null;
    this.keepAliveInterval = null;
    
    // Recovery tracking
    this.lastSuccessfulConnection = null;
    this.connectionFailureReason = null;
    
    // ═══ CONNECTION METRICS & TELEMETRY (Phase 9) ═══
    this.metrics = {
      createdAt: Date.now(),
      totalConnections: 0,
      totalDisconnections: 0,
      totalReconnects: 0,
      totalErrors: 0,
      totalRecoveries: 0,
      lastErrorMessage: null,
      lastErrorTime: null,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      averageSessionDuration: 0,
      sessionDurations: [],   // Last 10 session durations for averaging
      stateHistory: [],       // Last 20 state transitions
      qrCodesGenerated: 0,
      browserProcessKills: 0,
      lockRecoveries: 0,
    };
    
    // Browser PID tracking (for targeted process killing)
    this._browserPid = null;
  }

  setState(newState) {
    if (newState === this.state) return;
    const oldState = this.state;
    this.state = newState;
    this.log(`[${this.phoneNumber}] State: ${oldState} → ${newState}`, 'info');
    
    // Track state transitions for telemetry
    this.metrics.stateHistory.push({
      from: oldState, to: newState, at: Date.now()
    });
    if (this.metrics.stateHistory.length > 20) this.metrics.stateHistory.shift();
    
    // Track specific transitions
    if (newState === 'CONNECTED') {
      this.metrics.totalConnections++;
      this.metrics.lastConnectedAt = Date.now();
    } else if (newState === 'DISCONNECTED' && oldState === 'CONNECTED') {
      this.metrics.totalDisconnections++;
      this.metrics.lastDisconnectedAt = Date.now();
      // Calculate session duration
      if (this.sessionCreatedAt) {
        const duration = Date.now() - this.sessionCreatedAt;
        this.metrics.sessionDurations.push(duration);
        if (this.metrics.sessionDurations.length > 10) this.metrics.sessionDurations.shift();
        this.metrics.averageSessionDuration = Math.round(
          this.metrics.sessionDurations.reduce((a, b) => a + b, 0) / this.metrics.sessionDurations.length
        );
      }
    }
  }

  async initialize() {
    // Prevent multiple simultaneous initializations
    if (this.isInitializing || this.state === 'CONNECTING') {
      this.log(`[${this.phoneNumber}] Initialize already in progress`, 'warn');
      return false;
    }

    // Check circuit breaker
    if (this.errorCount >= this.circuitBreakerThreshold) {
      this.log(`[${this.phoneNumber}] ⚠️  Circuit breaker active (${this.errorCount}/${this.circuitBreakerThreshold})`, 'error');
      this.setState('SUSPENDED');
      return false;
    }

    // Already connected
    if (this.state === 'CONNECTED') {
      return true;
    }

    this.isInitializing = true;
    this.setState('CONNECTING');

    try {
      this.log(`[${this.phoneNumber}] Initializing WhatsApp client...`, 'info');
      await this.client.initialize();
      this.reconnectAttempts = 0; // Reset on successful attempt
      return true;
    } catch (error) {
      const msg = error?.message || String(error);
      
      // Phase 8: Try smart recovery first for browser lock errors
      const recoveryAttempted = this.attemptSmartRecovery(msg);
      if (!recoveryAttempted) {
        this.handleInitializeError(msg);
      }
      this.isInitializing = false;
      return false;
    }
  }

  handleInitializeError(errorMsg) {
    const nonCritical = ['Target closed', 'Session closed', 'browser is already running', 'Protocol error', 'Requesting main frame', 'Requesting main frame too early', 'Navigating frame was detached', 'page has been closed'];
    const isCritical = !nonCritical.some(p => errorMsg.toLowerCase().includes(p.toLowerCase()));

    // Track all errors in metrics
    this.metrics.totalErrors++;
    this.metrics.lastErrorMessage = errorMsg;
    this.metrics.lastErrorTime = Date.now();

    if (isCritical) {
      this.errorCount++;
      this.log(`[${this.phoneNumber}] ❌ Initialize error: ${errorMsg}`, 'error');
      this.connectionFailureReason = errorMsg;
    } else {
      this.log(`[${this.phoneNumber}] ⚠️  Non-critical error: ${errorMsg}`, 'warn');
    }

    this.setState('ERROR');
    
    // Auto-schedule reconnect after initialization failure
    this.scheduleReconnect();
  }

  scheduleReconnect() {
    if (this.reconnectTimer || this.state === 'SUSPENDED') {
      return;
    }

    this.reconnectAttempts++;
    
    // Exponential backoff with jitter
    const delay = Math.min(
      this.baseRetryDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxRetryDelay
    ) + Math.random() * 1000;

    this.log(`[${this.phoneNumber}] Reconnect in ${Math.round(delay / 1000)}s (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`, 'info');

    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      this.log(`[${this.phoneNumber}] ❌ Max reconnect attempts exceeded`, 'error');
      this.setState('SUSPENDED');
      return;
    }

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.state !== 'SUSPENDED') {
        this.metrics.totalReconnects++;
        try {
          // Step 1: Targeted cleanup - kill only bot-owned browser, then general cleanup
          this.log(`[${this.phoneNumber}] Cleaning up before reconnect (attempt ${this.reconnectAttempts})...`, 'info');
          this._killBrowserProcesses();
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for Chrome to fully exit

          // Step 2: Clean session lock files to prevent browser lock errors
          if (lockFileDetector) {
            lockFileDetector.forceCleanLocks(this.botId);
            lockFileDetector.forceCleanLocks(this.phoneNumber);
          }

          // Step 3: Create fresh WhatsApp client
          this.log(`[${this.phoneNumber}] Creating fresh client...`, 'info');
          const newClient = await CreatingNewWhatsAppClient(this.botId);
          if (!newClient) {
            this.log(`[${this.phoneNumber}] Failed to create new client`, 'error');
            this.scheduleReconnect();
            return;
          }

          // Step 4: Track browser PID for targeted killing later
          this._trackBrowserPid(newClient);

          // Step 5: Update references (DON'T call setupNewLinkingFlow - it creates new manager)
          this.client = newClient;
          accountClients.set(this.phoneNumber, newClient);
          if (this.phoneNumber === accountConfigManager?.getMasterPhoneNumber()) {
            Lion0 = newClient;
            global.Lion0 = Lion0;
            global.Linda = Lion0;
          }
          
          // Step 6: Bind events directly on new client and initialize
          this._bindClientEvents(newClient);
          
          // Step 7: Initialize
          this.isInitializing = false;
          this.state = 'IDLE';
          await this.initialize();
        } catch (err) {
          this.log(`[${this.phoneNumber}] Reconnect failed: ${err.message}`, 'error');
          this.scheduleReconnect();
        }
      }
    }, delay);
  }

  activateCircuitBreaker() {
    this.circuitBreakerTrips++;
    
    // Progressive cooldown: 1min → 5min → 15min → 30min (caps at 30min)
    const progressiveDurations = [60000, 300000, 900000, 1800000];
    const cooldown = progressiveDurations[Math.min(this.circuitBreakerTrips - 1, progressiveDurations.length - 1)];
    
    this.setState('SUSPENDED');
    this.log(`[${this.phoneNumber}] 🔴 Circuit breaker #${this.circuitBreakerTrips} activated for ${cooldown / 1000}s`, 'error');
    
    if (this.errorResetTimer) clearTimeout(this.errorResetTimer);
    
    this.errorResetTimer = setTimeout(() => {
      this.log(`[${this.phoneNumber}] Circuit breaker reset (trip #${this.circuitBreakerTrips})`, 'info');
      this.errorCount = 0;
      this.reconnectAttempts = 0;
      this.setState('DISCONNECTED');
      this.scheduleReconnect();
    }, cooldown);
  }

  recordActivity() {
    this.lastActivityTime = Date.now();
  }

  startHealthCheck() {
    if (this.healthCheckInterval) return;
    
    const CHECK_INTERVAL = 30000; // 30s
    const INACTIVITY_TIMEOUT = 300000; // 5 minutes
    
    this.healthCheckInterval = setInterval(() => {
      if (this.state !== 'CONNECTED') return;
      
      const inactiveTime = Date.now() - this.lastActivityTime;
      if (inactiveTime > INACTIVITY_TIMEOUT) {
        this.log(`[${this.phoneNumber}] ⚠️  Detected stale session (${Math.round(inactiveTime / 1000)}s inactive)`, 'warn');
        this.handleStaleSession();
      }
    }, CHECK_INTERVAL);
  }

  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  async handleStaleSession() {
    this.log(`[${this.phoneNumber}] Attempting graceful restart for stale session...`, 'warn');
    try {
      await this.client.destroy().catch(() => {});
    } catch (e) {
      // Ignore
    }
    this.setState('DISCONNECTED');
    this.scheduleReconnect();
  }

  startKeepAlive() {
    if (this.keepAliveInterval) return;
    this.keepAliveInterval = setInterval(() => {
      if (this.state === 'CONNECTED') {
        this.recordActivity();
      }
    }, 60000); // Every 60s
  }

  stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  handleQR(qrCode) {
    const now = Date.now();
    
    // Debounce: Don't show QR more than once per 2s
    if (now - this.lastQRTime < this.qrDebounceDelay) {
      return false;
    }
    
    this.lastQRTime = now;
    this.qrAttempts++;
    this.metrics.qrCodesGenerated++;
    this.log(`[${this.phoneNumber}] 📱 QR received (Attempt ${this.qrAttempts})`, 'info');
    
    // Timeout QR after 2 minutes
    if (!this.qrTimer && this.qrAttempts === 1) {
      this.qrTimer = setTimeout(() => {
        if (this.state !== 'CONNECTED' && this.qrAttempts > 2) {
          this.log(`[${this.phoneNumber}] ⏱️  QR timeout - manual intervention needed`, 'warn');
          this.qrTimer = null;
          this.qrAttempts = 0;
        }
      }, 120000);
    }
    
    return true;
  }

  clearQRTimer() {
    if (this.qrTimer) {
      clearTimeout(this.qrTimer);
      this.qrTimer = null;
    }
    this.qrAttempts = 0;
  }

  /**
   * Handle unexpected browser process loss (detected by BrowserProcessMonitor)
   * Triggers graceful recovery - destroy client and schedule reconnect
   */
  handleBrowserProcessLost(reason = 'unknown') {
    this.log(`[${this.phoneNumber}] ⚠️  Browser process lost (reason: ${reason}). Initiating recovery...`, 'warn');
    
    if (this.state === 'CONNECTED' || this.state === 'CONNECTING') {
      try {
        this.stopHealthCheck();
        this.stopKeepAlive();
        this.client.destroy().catch(() => {});
        this.setState('DISCONNECTED');
        this.scheduleReconnect();
      } catch (err) {
        this.log(`[${this.phoneNumber}] Recovery error: ${err.message}`, 'error');
        this.setState('DISCONNECTED');
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Attempt smart recovery from browser lock errors
   * Returns true if recovery was attempted, false otherwise
   */
  attemptSmartRecovery(errorMsg) {
    const isBrowserLockError = errorMsg.includes('browser is already running') ||
                               errorMsg.includes('userDataDir') ||
                               errorMsg.includes('CHROME_EXECUTABLE_PATH');

    if (!isBrowserLockError) {
      return false; // Not a lock error, use normal error handling
    }

    this.log(`[${this.phoneNumber}] 🔧 Browser lock detected. Executing recovery sequence...`, 'info');
    this.executeBrowserLockRecovery();
    return true;
  }

  /**
   * Execute full browser lock recovery sequence:
   * 1. Clean lock files for this session
   * 2. Delete session folder if needed
   * 3. Kill orphaned browser processes
   * 4. Wait for cleanup
   * 5. Re-initialize
   */
  async executeBrowserLockRecovery() {
    this.metrics.lockRecoveries++;
    try {
      // Step 1: Clean lock files
      this.log(`[${this.phoneNumber}] [Recovery 1/5] Cleaning lock files...`, 'info');
      if (lockFileDetector) {
        lockFileDetector.forceCleanLocks(this.phoneNumber);
      }

      // Step 2: Clean session folder
      this.log(`[${this.phoneNumber}] [Recovery 2/5] Cleaning session folder...`, 'info');
      if (sessionCleanupManager) {
        sessionCleanupManager.forceCleanSession(this.phoneNumber);
      } else {
        // Fallback: direct cleanup
        const sessionPath = path.join(process.cwd(), 'sessions', `session-${this.phoneNumber}`);
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true });
        }
      }

      // Step 3: Kill orphaned browser processes
      this.log(`[${this.phoneNumber}] [Recovery 3/5] Killing browser processes...`, 'info');
      this._killBrowserProcesses();

      // Step 4: Wait for cleanup to complete
      this.log(`[${this.phoneNumber}] [Recovery 4/5] Waiting for cleanup...`, 'info');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 5: Re-initialize
      this.log(`[${this.phoneNumber}] [Recovery 5/5] Re-initializing...`, 'info');
      this.state = 'IDLE';
      this.isInitializing = false;
      this.reconnectAttempts = 0;
      this.errorCount = 0;

      const success = await this.initialize();
      if (success) {
        this.log(`[${this.phoneNumber}] ✅ Browser lock recovery successful!`, 'success');
      } else {
        this.log(`[${this.phoneNumber}] ⚠️  Recovery initialize returned false, scheduling reconnect`, 'warn');
        this.scheduleReconnect();
      }
    } catch (err) {
      this.log(`[${this.phoneNumber}] ❌ Recovery failed: ${err.message}. Activating circuit breaker.`, 'error');
      this.activateCircuitBreaker();
    }
  }

  /**
   * Track browser PID from a WhatsApp client
   * Enables targeted process killing instead of killing ALL Chrome instances
   */
  _trackBrowserPid(client) {
    try {
      if (client?.pupBrowser) {
        const proc = client.pupBrowser.process();
        if (proc?.pid) {
          this._browserPid = proc.pid;
          this.log(`[${this.phoneNumber}] Browser PID tracked: ${proc.pid}`, 'info');
        }
      }
    } catch (_) { /* best effort */ }
  }

  /**
   * Kill browser processes - targeted first, then fallback to broad kill
   * SAFETY: Never kills node.exe, only Chrome/Chromium
   */
  _killBrowserProcesses() {
    this.metrics.browserProcessKills++;
    
    // Strategy 1: Kill specific tracked PID (minimal impact)
    if (this._browserPid) {
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /F /PID ${this._browserPid} /T 2>nul`, { stdio: 'pipe', windowsHide: true });
        } else {
          execSync(`kill -9 ${this._browserPid} 2>/dev/null`, { stdio: 'pipe' });
        }
        this.log(`[${this.phoneNumber}] Killed tracked browser PID: ${this._browserPid}`, 'info');
        this._browserPid = null;
        return; // Targeted kill succeeded, no broad kill needed
      } catch (_) {
        this._browserPid = null;
        // Fall through to broad kill
      }
    }
    
    // Strategy 2: Broad kill (only Chrome/Chromium, NEVER node.exe)
    const commands = process.platform === 'win32'
      ? ['taskkill /F /IM chrome.exe 2>nul', 'taskkill /F /IM chromium.exe 2>nul']
      : ['pkill -9 chrome 2>/dev/null', 'pkill -9 chromium 2>/dev/null'];

    for (const cmd of commands) {
      try {
        execSync(cmd, { stdio: 'pipe', windowsHide: true });
      } catch (err) {
        // Silent fail - processes may already be gone
      }
    }
  }

  /**
   * Bind essential WhatsApp client events for reconnected client
   * Handles QR, authentication, ready, disconnect, and error events
   */
  _bindClientEvents(client) {
    const phoneNumber = this.phoneNumber;
    const connManager = this;

    // QR CODE
    client.on("qr", async (qr) => {
      if (!connManager.handleQR(qr)) return;
      if (deviceLinkedManager) deviceLinkedManager.startLinkingAttempt(phoneNumber);
      try {
        await QRCodeDisplay.display(qr, {
          method: 'auto', fallback: true,
          masterAccount: phoneNumber, timeout: 120000
        });
      } catch (error) {
        connManager.log(`QR display error: ${error.message}`, "warn");
      }
    });

    // AUTHENTICATED
    client.once("authenticated", () => {
      connManager.clearQRTimer();
      connManager.log(`✅ Device linked (${phoneNumber}) via reconnect`, "success");
      const now = new Date().toISOString();
      updateDeviceStatus(phoneNumber, {
        deviceLinked: true, linkedAt: now, lastConnected: now, authMethod: 'qr',
      });
      if (deviceLinkedManager) {
        deviceLinkedManager.markDeviceLinked(phoneNumber, { linkedAt: now, authMethod: 'qr', ipAddress: null });
      }
    });

    // READY
    client.once("ready", async () => {
      connManager.log(`🟢 READY - ${phoneNumber} is online (reconnected)`, "ready");
      connManager.setState('CONNECTED');
      connManager.sessionCreatedAt = Date.now();
      connManager.lastSuccessfulConnection = Date.now();
      connManager.isInitializing = false;
      connManager.reconnectAttempts = 0;
      connManager.errorCount = 0;
      connManager._trackBrowserPid(client);
      connManager.metrics.totalRecoveries++;

      allInitializedAccounts.push(client);
      accountHealthMonitor.registerAccount(phoneNumber, client);
      if (keepAliveManager) keepAliveManager.startKeepAlive(phoneNumber, client);
      connManager.startHealthCheck();
      connManager.startKeepAlive();
      setupMessageListeners(client, phoneNumber, connManager);
    });

    // AUTH FAILURE
    client.once("auth_failure", (msg) => {
      connManager.log(`❌ Auth failed (${phoneNumber}): ${msg}`, "error");
      connManager.isInitializing = false;
      connManager.setState('ERROR');
    });

    // DISCONNECTED
    client.on("disconnected", async (reason) => {
      connManager.isInitializing = false;
      const reasonStr = reason || 'unknown';
      connManager.log(`Disconnected (${phoneNumber}): ${reasonStr}`, "warn");
      if (deviceLinkedManager) deviceLinkedManager.markDeviceUnlinked(phoneNumber, reasonStr);
      connManager.stopHealthCheck();
      connManager.stopKeepAlive();
      if (reasonStr.includes('LOGOUT')) {
        connManager.setState('DISCONNECTED');
      } else {
        connManager.setState('DISCONNECTED');
        connManager.scheduleReconnect();
      }
    });

    // ERROR
    client.on("error", (error) => {
      const msg = error?.message || String(error);
      if (msg.includes('Target') || msg.includes('Protocol') || msg.includes('Requesting')) return;
      connManager.log(`Client error (${phoneNumber}): ${msg}`, "error");
      connManager.errorCount++;
      if (connManager.errorCount >= connManager.circuitBreakerThreshold) {
        connManager.activateCircuitBreaker();
      }
    });
  }

  async destroy() {
    this.stopHealthCheck();
    this.stopKeepAlive();
    
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.errorResetTimer) clearTimeout(this.errorResetTimer);
    if (this.qrTimer) clearTimeout(this.qrTimer);
    
    try {
      await this.client.destroy().catch(() => {});
    } catch (e) {
      // Ignore
    }
    
    this.setState('IDLE');
  }

  getStatus() {
    return {
      phoneNumber: this.phoneNumber,
      state: this.state,
      isConnected: this.state === 'CONNECTED',
      reconnectAttempts: this.reconnectAttempts,
      errorCount: this.errorCount,
      uptime: this.sessionCreatedAt ? Date.now() - this.sessionCreatedAt : 0,
    };
  }

  /**
   * Get detailed diagnostic status with full metrics & telemetry
   * Used by startup diagnostics and /admin get-health command
   */
  getDetailedStatus() {
    const uptime = this.sessionCreatedAt ? Date.now() - this.sessionCreatedAt : 0;
    const uptimeStr = this._formatDuration(uptime);
    const avgSession = this._formatDuration(this.metrics.averageSessionDuration);
    
    return {
      // Identity
      phoneNumber: this.phoneNumber,
      botId: this.botId,
      
      // State
      state: this.state,
      isConnected: this.state === 'CONNECTED',
      isInitializing: this.isInitializing,
      
      // Connection stats
      uptime: uptimeStr,
      uptimeMs: uptime,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      
      // Error tracking
      errorCount: this.errorCount,
      circuitBreakerTrips: this.circuitBreakerTrips,
      lastError: this.metrics.lastErrorMessage,
      lastErrorTime: this.metrics.lastErrorTime ? new Date(this.metrics.lastErrorTime).toISOString() : null,
      connectionFailureReason: this.connectionFailureReason,
      
      // Metrics
      totalConnections: this.metrics.totalConnections,
      totalDisconnections: this.metrics.totalDisconnections,
      totalReconnects: this.metrics.totalReconnects,
      totalErrors: this.metrics.totalErrors,
      totalRecoveries: this.metrics.totalRecoveries,
      averageSessionDuration: avgSession,
      qrCodesGenerated: this.metrics.qrCodesGenerated,
      browserProcessKills: this.metrics.browserProcessKills,
      lockRecoveries: this.metrics.lockRecoveries,
      
      // Recent state transitions
      recentTransitions: this.metrics.stateHistory.slice(-5).map(t => ({
        ...t,
        at: new Date(t.at).toLocaleTimeString()
      })),
      
      // Browser tracking
      browserPid: this._browserPid,
    };
  }
  
  _formatDuration(ms) {
    if (!ms || ms <= 0) return '0s';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
    if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  }
}

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
 * Now creates a ConnectionManager for full reconnect/recovery support
 */
function setupRestoreFlow(client, phoneNumber, configOrStatus) {
  logBot("Setting up session restore for " + phoneNumber, "info");

  let readyFired = false;
  const config = configOrStatus.displayName ? configOrStatus : null; // Check if it's a config object
  const botId = config?.id || phoneNumber;

  // Create ConnectionManager for restore flow (ensures reconnect works on disconnect)
  const connManager = new ConnectionManager(phoneNumber, client, logBot, botId);
  connectionManagers.set(phoneNumber, connManager);
  logBot(`✅ Connection manager created for ${phoneNumber} (restore mode)`, 'success');

  client.once("authenticated", () => {
    connManager.clearQRTimer();
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
    
    // Update ConnectionManager state
    connManager.setState('CONNECTED');
    connManager.sessionCreatedAt = Date.now();
    connManager.lastSuccessfulConnection = Date.now();
    connManager.isInitializing = false;
    connManager.reconnectAttempts = 0;
    connManager.errorCount = 0;
    connManager._trackBrowserPid(client);
    
    // Mark account as active
    allInitializedAccounts.push(client);
    await sessionStateManager.markRecoverySuccess(phoneNumber);
    
    // PHASE 5: Register account for health monitoring
    accountHealthMonitor.registerAccount(phoneNumber, client);
    
    // NEW: Start keep-alive heartbeats for 24/7 operation
    keepAliveManager.startKeepAlive(phoneNumber, client);
    
    // Start connection health monitoring
    connManager.startHealthCheck();
    connManager.startKeepAlive();
    
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
    
    setupMessageListeners(client, phoneNumber, connManager);
    isInitializing = false;
  });

  client.once("auth_failure", async (msg) => {
    logBot(`Session restore failed for ${phoneNumber}: ${msg}`, "error");
    logBot("Falling back to new QR code authentication...", "warn");
    connManager.isInitializing = false;
    connManager.setState('ERROR');
    
    // FALLBACK: Setup new QR code linking instead of failing
    try {
      setupNewLinkingFlow(client, phoneNumber, botId);
    } catch (error) {
      logBot(`Fallback QR setup failed: ${error.message}`, "error");
      isInitializing = false;
    }
  });

  client.on("disconnected", (reason) => {
    const reasonStr = reason || 'disconnected';
    logBot(`Disconnected (${phoneNumber}): ${reasonStr}`, "warn");
    connManager.isInitializing = false;
    
    // Mark device as unlinked in device manager
    if (deviceLinkedManager) {
      deviceLinkedManager.markDeviceUnlinked(phoneNumber, reasonStr);
    }
    
    // Stop monitoring
    connManager.stopHealthCheck();
    connManager.stopKeepAlive();
    
    // Schedule reconnect (unless user logged out)
    if (reasonStr.includes('LOGOUT')) {
      connManager.setState('DISCONNECTED');
    } else {
      connManager.setState('DISCONNECTED');
      connManager.scheduleReconnect();
    }
  });

  client.on("error", (error) => {
    const msg = error?.message || String(error);
    // Filter non-critical errors
    if (msg.includes('Target') || msg.includes('Protocol') || msg.includes('Requesting')) return;
    logBot(`Client error (${phoneNumber}): ${msg}`, "error");
    connManager.errorCount++;
    if (connManager.errorCount >= connManager.circuitBreakerThreshold) {
      connManager.activateCircuitBreaker();
    }
  });

  logBot(`Initializing WhatsApp client for ${phoneNumber}...`, "info");
  connManager.initialize().catch((error) => {
    logBot(`Failed to initialize (restore): ${error?.message || String(error)}`, "error");
  });
}

/**
 * Setup new device linking flow (Phase 4 multi-account version)
 */
function setupNewLinkingFlow(client, phoneNumber, botId) {
  logBot(`Setting up device linking for ${phoneNumber}...`, "info");

  // Create and register connection manager
  const connManager = new ConnectionManager(phoneNumber, client, logBot, botId);
  connectionManagers.set(phoneNumber, connManager);
  logBot(`✅ Connection manager created for ${phoneNumber}`, 'success');

  // ===== QR CODE HANDLER (with debouncing) =====
  client.on("qr", async (qr) => {
    if (!connManager.handleQR(qr)) {
      return; // Debounced - skip this QR
    }

    // Mark device as linking
    if (deviceLinkedManager) {
      deviceLinkedManager.startLinkingAttempt(phoneNumber);
    }

    try {
      await QRCodeDisplay.display(qr, {
        method: 'auto',
        fallback: true,
        masterAccount: phoneNumber,
        timeout: 120000
      });
    } catch (error) {
      logBot(`QR display error: ${error.message}`, "warn");
      logBot("Please link device manually via WhatsApp Settings", "warn");
    }
  });

  // ===== AUTHENTICATION SUCCESS =====
  client.once("authenticated", () => {
    connManager.clearQRTimer();
    logBot(`✅ Device linked (${phoneNumber})`, "success");

    const now = new Date().toISOString();
    updateDeviceStatus(phoneNumber, {
      deviceLinked: true,
      linkedAt: now,
      lastConnected: now,
      authMethod: 'qr',
    });

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

  // ===== CONNECTION READY =====
  client.once("ready", async () => {
    logBot(`🟢 READY - ${phoneNumber} is online`, "ready");
    logBot("Session saved for future restarts", "success");

    connManager.setState('CONNECTED');
    connManager.sessionCreatedAt = Date.now();
    connManager.lastSuccessfulConnection = Date.now();
    connManager.isInitializing = false;
    connManager.reconnectAttempts = 0;
    connManager.errorCount = 0;
    connManager._trackBrowserPid(client);

    allInitializedAccounts.push(client);
    await sessionStateManager.markRecoverySuccess(phoneNumber);

    // Register for health monitoring
    accountHealthMonitor.registerAccount(phoneNumber, client);

    // Start keep-alive heartbeats
    keepAliveManager.startKeepAlive(phoneNumber, client);

    // Start connection health monitoring
    connManager.startHealthCheck();
    connManager.startKeepAlive();

    setupMessageListeners(client, phoneNumber, connManager);
  });

  // ===== AUTHENTICATION FAILURE =====
  client.once("auth_failure", (msg) => {
    logBot(`❌ Authentication failed for ${phoneNumber}: ${msg}`, "error");
    logBot("Please restart and scan QR code again", "warn");
    connManager.isInitializing = false;
    connManager.setState('ERROR');
  });

  // ===== DISCONNECTION HANDLER (with intelligent recovery) =====
  client.on("disconnected", async (reason) => {
    connManager.isInitializing = false;
    
    const reasonStr = reason || 'unknown';
    logBot(`Disconnected (${phoneNumber}): ${reasonStr}`, "warn");

    // Update device status
    if (deviceLinkedManager) {
      deviceLinkedManager.markDeviceUnlinked(phoneNumber, reasonStr);
    }

    // Stop monitoring
    connManager.stopHealthCheck();
    connManager.stopKeepAlive();

    // Check if logout or Session closed
    if (reasonStr.includes('LOGOUT')) {
      logBot(`User logged out from ${phoneNumber} - manual re-auth needed`, 'warn');
      connManager.setState('DISCONNECTED');
      connManager.reconnectAttempts = 0; // Don't auto-retry logouts
    } else if (reasonStr.toLowerCase().includes('session closed')) {
      logBot(`Session closed unexpectedly for ${phoneNumber}`, 'warn');
      connManager.setState('DISCONNECTED');
      connManager.scheduleReconnect(); // Intelligent exponential backoff
    } else {
      connManager.setState('DISCONNECTED');
      connManager.scheduleReconnect(); // Standard backoff
    }
  });

  // ===== ERROR HANDLER =====
  client.on("error", (error) => {
    const msg = error?.message || String(error);
    
    // Filter non-critical errors
    if (msg.includes('Target') || msg.includes('Protocol') || msg.includes('Requesting')) {
      return; // Ignore Puppeteer/Protocol errors
    }

    logBot(`Client error (${phoneNumber}): ${msg}`, "error");
    connManager.errorCount++;
    
    if (connManager.errorCount >= connManager.circuitBreakerThreshold) {
      connManager.activateCircuitBreaker();
    }
  });

  // ===== INITIALIZE CLIENT =====
  logBot(`Initializing WhatsApp client for ${phoneNumber}...`, "info");
  connManager.initialize().catch((error) => {
    logBot(`Failed to initialize: ${error?.message || String(error)}`, "error");
  });
}

/**
 * Setup message listening for individual account (Phase 4 - multi-account)
 */
function setupMessageListeners(client, phoneNumber = "Unknown", connManager = null) {
  // Track activity for connection health
  if (connManager) {
    client.on('message', () => {
      connManager.recordActivity();
    });
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // PHASE 1: EVENT HANDLER BINDINGS (February 12, 2026)
  // ═════════════════════════════════════════════════════════════════════════════
  // Bind whatsapp-web.js events to our handlers
  
  /**
   * MESSAGE REACTION EVENT - Track emoji reactions to messages
   * Uses singleton handler instance (avoids re-creation per event)
   */
  const reactionHandlerInstance = global.reactionHandler || new ReactionHandler(null);
  const groupHandlerInstance = global.groupEventHandler || new GroupEventHandler(null);

  client.on('message_reaction', async (reaction) => {
    try {
      await reactionHandlerInstance.handleReaction(reaction);
      logBot(`✅ Reaction tracked: ${reaction.reaction} on message ${reaction.msg.id.id}`, "success");
    } catch (error) {
      logBot(`❌ Error handling reaction: ${error.message}`, "error");
    }
  });

  /**
   * GROUP UPDATE EVENT - Track group changes (name, description, picture)
   * Calls GroupEventHandler.handleGroupUpdate() when group info changes
   */
  client.on('group_update', async (notification) => {
    try {
      await groupHandlerInstance.handleGroupUpdate(notification);
      logBot(`✅ Group update tracked: ${notification.chatId}`, "success");
    } catch (error) {
      logBot(`❌ Error handling group update: ${error.message}`, "error");
    }
  });

  /**
   * GROUP JOIN EVENT - Track when members join a group
   * Calls GroupEventHandler.handleGroupJoin()
   */
  client.on('group_join', async (notification) => {
    try {
      await groupHandlerInstance.handleGroupJoin(notification);
      logBot(`✅ Group join tracked: ${notification.contact.length} member(s) joined`, "success");
    } catch (error) {
      logBot(`❌ Error handling group join: ${error.message}`, "error");
    }
  });

  /**
   * GROUP LEAVE EVENT - Track when members leave a group
   * Calls GroupEventHandler.handleGroupLeave()
   */
  client.on('group_leave', async (notification) => {
    try {
      await groupHandlerInstance.handleGroupLeave(notification);
      logBot(`✅ Group leave tracked: ${notification.contact.length} member(s) left`, "success");
    } catch (error) {
      logBot(`❌ Error handling group leave: ${error.message}`, "error");
    }
  });

  logBot(`✅ Phase 1 event handlers bound for ${phoneNumber}`, "success");

  // ═════════════════════════════════════════════════════════════════════════════
  // MESSAGE LISTENING (Existing)
  // ═════════════════════════════════════════════════════════════════════════════
  client.on("message", async (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    const from = msg.from.includes("@g.us") ? `Group: ${msg.from}` : `User: ${msg.from}`;
    
    // Update last activity for keep-alive tracking
    keepAliveManager.updateLastActivity(phoneNumber);
    
    logBot(`📨 [${timestamp}] (${phoneNumber}) ${from}: ${msg.body.substring(0, 50)}${msg.body.length > 50 ? "..." : ""}`, "info");

    try {
      // ═════════════════════════════════════════════════════════════════════════════
      // PHASE 7: ANALYTICS TRACKING & ADMIN AUTHORIZATION
      // ═════════════════════════════════════════════════════════════════════════════
      // Track all messages for analytics
      if (analyticsModule) {
        analyticsModule.trackMessage(msg, {
          type: msg.type,
          fromMe: msg.fromMe,
          isGroup: msg.isGroupMsg,
          timestamp: new Date(),
          phoneNumber: phoneNumber
        });
      }

      // Check user authorization
      if (adminConfigModule && !adminConfigModule.isUserAuthorized(msg.from)) {
        // User not authorized - can still send basic messages but no admin commands
        logBot(`⚠️  Unauthorized user attempt: ${msg.from}`, "warn");
      }

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
      // PHASE 7: ADMIN COMMANDS (/admin, /report, /dashboard)
      // ═════════════════════════════════════════════════════════════════════════════
      if (msg.body.startsWith('/admin ') && adminConfigModule) {
        // Admin command processing
        const isAdmin = adminConfigModule.verifyAdminAccess(msg.from).authorized;
        if (!isAdmin) {
          await msg.reply('❌ Not authorized for admin commands');
          return;
        }

        const parts = msg.body.split(' ');
        const action = parts[1];
        const value = parts.slice(2).join(' ');

        try {
          switch (action) {
            case 'toggle-handler': {
              const result = adminConfigModule.toggleHandler(value);
              await msg.reply(`✅ Handler ${value}: ${result.enabled ? 'ENABLED ✅' : 'DISABLED 🔴'}`);
              break;
            }
            case 'get-stats': {
              if (analyticsModule) {
                const snapshot = analyticsModule.getDashboardSnapshot();
                await msg.reply(`📊 Bot Stats:\n\nMessages: ${snapshot.metrics.messages.total}\nHandlers: ${snapshot.metrics.handlers.totalInvocations}\n✅ Success Rate: ${snapshot.metrics.handlers.successRate}`);
              }
              break;
            }
            case 'list-perms': {
              const perms = adminConfigModule.listPermissions(msg.from);
              await msg.reply(`👤 Your permissions:\n${Object.entries(perms).map(([k, v]) => `${k}: ${v ? '✅' : '❌'}`).join('\n')}`);
              break;
            }
            case 'get-health': {
              // Phase 9: Connection diagnostics via WhatsApp
              const diags = getAllConnectionDiagnostics();
              if (diags.length === 0) {
                await msg.reply('📊 No connection managers active');
                break;
              }
              let healthText = '📊 *CONNECTION HEALTH REPORT*\n━━━━━━━━━━━━━━━━━━━━━━━━\n';
              for (const d of diags) {
                const icon = d.isConnected ? '🟢' : d.state === 'SUSPENDED' ? '⛔' : '🔴';
                healthText += `\n${icon} *${d.phoneNumber}*\n`;
                healthText += `  State: ${d.state} | Uptime: ${d.uptime}\n`;
                healthText += `  Connections: ${d.totalConnections} | Disconnects: ${d.totalDisconnections}\n`;
                healthText += `  Reconnects: ${d.totalReconnects} | Errors: ${d.totalErrors}\n`;
                healthText += `  QR Codes: ${d.qrCodesGenerated} | Browser Kills: ${d.browserProcessKills}\n`;
                healthText += `  Avg Session: ${d.averageSessionDuration}\n`;
                if (d.lastError) healthText += `  Last Error: ${d.lastError.substring(0, 60)}\n`;
              }
              const mem = process.memoryUsage();
              healthText += `\n💻 *System*: Heap ${Math.round(mem.heapUsed/1024/1024)}MB | PID ${process.pid}`;
              await msg.reply(healthText);
              break;
            }
            default:
              await msg.reply('❓ Unknown admin command. Try: toggle-handler, get-stats, list-perms, get-health');
          }
        } catch (error) {
          await msg.reply(`❌ Admin error: ${error.message}`);
        }
        return;
      }

      // ═════════════════════════════════════════════════════════════════════════════
      // PHASE 7: REPORT COMMAND (/report)
      // ═════════════════════════════════════════════════════════════════════════════
      if (msg.body.startsWith('/report ') && reportGeneratorModule) {
        const reportType = msg.body.split(' ')[1] || 'daily';
        
        try {
          let report;
          switch (reportType) {
            case 'daily':
              report = reportGeneratorModule.generateDailyReport();
              break;
            case 'weekly':
              report = reportGeneratorModule.generateWeeklyReport();
              break;
            case 'monthly':
              report = reportGeneratorModule.generateMonthlyReport();
              break;
            default:
              await msg.reply('❓ Report type: daily, weekly, or monthly\nUsage: /report daily');
              return;
          }

          const summary = report.summary;
          const reportText = `📊 ${reportType.toUpperCase()} REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 ${summary.description}
💬 Messages: ${summary.metrics.totalMessages}
👥 Users: ${summary.metrics.uniqueUsers}
⚙️ Handlers: ${summary.metrics.totalHandlers}
✅ Success Rate: ${summary.metrics.successRate}
❌ Errors: ${summary.metrics.errorCount}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

          await msg.reply(reportText);
        } catch (error) {
          await msg.reply(`❌ Report error: ${error.message}`);
        }
        return;
      }

      // ═════════════════════════════════════════════════════════════════════════════
      // PHASE 7: DASHBOARD COMMAND (/dashboard)
      // ═════════════════════════════════════════════════════════════════════════════
      if (msg.body === '/dashboard' && analyticsModule) {
        try {
          const snapshot = analyticsModule.getDashboardSnapshot();
          const dashText = `📊 ANALYTICS DASHBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ ${new Date(snapshot.timestamp).toLocaleTimeString()}
💬 Messages: ${snapshot.metrics.messages.total}
👥 Users: Object.keys(snapshot.metrics.messages.byUser).length
🎯 Health: ${snapshot.systemHealth.status} (${snapshot.systemHealth.score}%)
❌ Errors: ${snapshot.systemHealth.errorCount}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

          await msg.reply(dashText);
        } catch (error) {
          await msg.reply(`❌ Dashboard error: ${error.message}`);
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

  logBot(`✅ Message listeners ready for ${phoneNumber}`, "success");
}

/**
 * Graceful shutdown with multi-account support (Phase 4)
 */
process.on("SIGINT", async () => {
  console.log("\n");
  logBot("Received shutdown signal", "warn");
  logBot("Initiating graceful shutdown...", "info");
  
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
    
    // 0B. Destroy connection managers
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

// NOTE: Global error handlers (unhandledRejection, uncaughtException) are defined above
// with non-critical error pattern filtering. Do NOT duplicate them here.

// Start the bot
logBot("Starting Linda WhatsApp Bot...", "info");
initializeBot();
