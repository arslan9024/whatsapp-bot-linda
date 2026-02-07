/**
 * SessionRestoreHandler.js
 * Handles WhatsApp session restoration and device reactivation
 * Ensures seamless reconnection when bot restarts with existing session
 */

import { updateDeviceStatus, getDeviceStatus, displayDeviceStatus } from "../utils/deviceStatus.js";
import { logSessionEvent } from "../utils/sessionLogger.js";
import DeviceLinker from "./DeviceLinker.js";

export class SessionRestoreHandler {
  constructor(client, masterNumber) {
    this.client = client;
    this.masterNumber = masterNumber;
    this.restoreStartTime = null;
    this.restoreAttempts = 0;
    this.maxRestoreAttempts = 3;
    this.deviceReactivated = false;
    this.previousDeviceStatus = null;
    this.restoreInProgress = false;  // NEW: Prevent double initialization
  }

  /**
   * Start the session restore process
   */
  async startRestore() {
    // Prevent duplicate restore attempts
    if (this.restoreInProgress) {
      console.log("⏸️  Restore already in progress, waiting...\n");
      return;
    }

    this.restoreInProgress = true;

    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║          🔄 SESSION RESTORE - REACTIVATING DEVICE         ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    this.restoreStartTime = Date.now();
    this.restoreAttempts++;
    this.previousDeviceStatus = getDeviceStatus(this.masterNumber);

    console.log(`📱 Master Account: ${this.masterNumber}`);
    console.log(`🔄 Restore Attempt: ${this.restoreAttempts}/${this.maxRestoreAttempts}`);
    
    if (this.previousDeviceStatus) {
      console.log(`📊 Previous Status: ${this.previousDeviceStatus.deviceLinked ? "LINKED" : "NOT LINKED"}`);
      console.log(`📊 Previous Activity: ${new Date(this.previousDeviceStatus.lastConnected).toLocaleString()}`);
    }
    
    console.log("\n⏳ Verifying session files and authenticating device...\n");

    this.setupRestoreListeners();
  }

  /**
   * Setup event listeners specifically for restore process
   */
  setupRestoreListeners() {
    // Track loading progress during restore
    this.client.on("loading_screen", (percent, message) => {
      if (percent === 0 || percent === 100 || percent % 25 === 0) {
        console.log(`📊 Restore Progress: ${percent}% - ${message}`);
      }
    });

    // When authenticated event fires during restore
    this.client.once("authenticated", () => {
      this.handleRestoreAuthenticated();
    });

    // If authentication fails during restore
    this.client.once("auth_failure", (msg) => {
      this.handleRestoreAuthFailure(msg);
    });

    // When client is ready after restore
    this.client.once("ready", () => {
      this.handleRestoreReady();
    });

    // If disconnect happens during restore
    this.client.on("disconnected", (reason) => {
      if (!this.deviceReactivated) {
        this.handleRestoreDisconnect(reason);
      }
    });

    // Important: Only initialize if not already in progress
    // Client should already be initializing from CreatingNewWhatsAppClient
    if (!this.client._state) {
      console.log("🚀 Initializing WhatsApp client with existing session...\n");
      try {
        this.client.initialize();
      } catch (error) {
        // Handle browser already running error
        if (error.message.includes("browser is already running")) {
          console.warn("⚠️  Browser already running for this session");
          console.log("🔄 Waiting for existing browser to connect...\n");
          // Don't retry - let the existing browser complete
        } else {
          throw error;
        }
      }
    } else {
      console.log("⏳ Waiting for client initialization with existing session...\n");
    }
  }

  /**
   * Handle successful authentication during session restore
   */
  handleRestoreAuthenticated() {
    const restoreDuration = Date.now() - this.restoreStartTime;

    console.log("\n" + "━".repeat(60));
    console.log("✅ AUTHENTICATION SUCCESSFUL DURING SESSION RESTORE!");
    console.log("━".repeat(60) + "\n");

    console.log(`⏱️  Restore Duration: ${(restoreDuration / 1000).toFixed(2)}s`);
    console.log(`✅ Device Reactivation: IN PROGRESS\n`);

    // Update device status to indicate restore success and reactivation
    updateDeviceStatus(this.masterNumber, {
      deviceLinked: true,
      isActive: true,
      linkedAt: this.previousDeviceStatus?.linkedAt || new Date().toISOString(),
      lastConnected: new Date().toISOString(),
      restoreCount: (this.previousDeviceStatus?.restoreCount || 0) + 1,
      lastRestoreTime: new Date().toISOString(),
      restoreStatus: "authenticated",
      restoreDuration: restoreDuration,
    });

    logSessionEvent(this.masterNumber, "restore_authenticated", {
      duration: restoreDuration,
      attempt: this.restoreAttempts,
    });
  }

  /**
   * Handle authentication failure during session restore
   */
  handleRestoreAuthFailure(msg) {
    console.error("\n" + "━".repeat(60));
    console.error("❌ AUTHENTICATION FAILED DURING SESSION RESTORE");
    console.error("━".repeat(60));
    console.error(`Error: ${msg}`);
    console.error(`Attempt: ${this.restoreAttempts}/${this.maxRestoreAttempts}\n`);

    updateDeviceStatus(this.masterNumber, {
      deviceLinked: false,
      isActive: false,
      restoreStatus: "auth_failed",
      lastError: msg,
      failureTime: new Date().toISOString(),
      restoreFailureAttempts: this.restoreAttempts,
    });

    logSessionEvent(this.masterNumber, "restore_auth_failed", {
      error: msg,
      attempt: this.restoreAttempts,
    });

    if (this.restoreAttempts < this.maxRestoreAttempts) {
      console.log(`🔄 Retrying restore (attempt ${this.restoreAttempts + 1}/${this.maxRestoreAttempts})...\n`);
      console.log("⏳ Waiting 5 seconds before retry...\n");
      
      setTimeout(() => {
        this.restoreInProgress = false;  // Reset flag for retry
        // Don't call setupRestoreListeners here - just restart
        this.startRestore();
      }, 5000);
    } else {
      console.error("❌ Maximum restore attempts exceeded.");
      console.error("⚠️  Session cannot be reactivated.\n");
      console.log("╔════════════════════════════════════════════════════════════╗");
      console.log("║   SESSION REACTIVATION FAILED - REQUESTING FRESH AUTH      ║");
      console.log("╚════════════════════════════════════════════════════════════╝\n");
      
      console.log("📱 The device link has expired or been removed.\n");
      console.log("↪️  Bot will now request fresh device authentication.\n");
      console.log("📋 Steps to Reactivate:");
      console.log("   1. A QR code will be displayed below");
      console.log("   2. Open WhatsApp on your phone");
      console.log("   3. Go to: Settings → Linked Devices");
      console.log("   4. Tap: Link a Device");
      console.log("   5. Scan the QR code shown\n");
      
      // Trigger fallback to fresh authentication
      this.triggerFreshAuthentication();
    }
  }

  /**
   * Trigger fresh device authentication when restore fails
   */
  triggerFreshAuthentication() {
    // Clear old session data
    updateDeviceStatus(this.masterNumber, {
      deviceLinked: false,
      isActive: false,
      restoreStatus: "fallback_to_fresh_auth",
      fallbackTime: new Date().toISOString(),
    });

    logSessionEvent(this.masterNumber, "restore_fallback_fresh_auth", {
      reason: "max_attempts_exceeded",
      timestamp: new Date().toISOString(),
    });

    // Set up fresh authentication with DeviceLinker
    const freshLinker = new DeviceLinker(this.client, this.masterNumber, "qr", "new");
    
    console.log("🚀 Initializing fresh device linking...\n");
    freshLinker.startLinking();
  }

  /**
   * Handle ready event after session restore
   */
  handleRestoreReady() {
    const restoreDuration = Date.now() - this.restoreStartTime;
    this.deviceReactivated = true;

    console.clear();
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║     ✅ DEVICE REACTIVATED - BOT READY TO SERVE!           ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    console.log(`📱 Master Account: ${this.masterNumber}`);
    console.log(`✅ Session: RESTORED & VERIFIED`);
    console.log(`✅ Device Status: REACTIVATED & ACTIVE`);
    console.log(`✅ Connection: AUTHENTICATED & READY`);
    console.log(`✅ Auth Method: ${this.previousDeviceStatus?.authMethod === "code" ? "6-Digit Code" : "QR Code"}\n`);

    console.log(`⚡ Performance Metrics:`);
    console.log(`   ⏱️  Restore Duration: ${(restoreDuration / 1000).toFixed(2)}s`);
    console.log(`   🔄 Restore Attempt: ${this.restoreAttempts}/${this.maxRestoreAttempts}`);
    console.log(`   📊 Previous Session: ${new Date(this.previousDeviceStatus?.lastConnected).toLocaleString()}\n`);

    console.log(`🤖 Bot Instance: Lion0`);
    console.log(`📍 Global Reference: global.Lion0\n`);

    // Final device status update
    updateDeviceStatus(this.masterNumber, {
      deviceLinked: true,
      isActive: true,
      lastConnected: new Date().toISOString(),
      restoreStatus: "ready",
      restoreCount: (this.previousDeviceStatus?.restoreCount || 0) + 1,
      lastRestoreTime: new Date().toISOString(),
      restoreDuration: restoreDuration,
    });

    logSessionEvent(this.masterNumber, "restore_complete", {
      duration: restoreDuration,
      attempt: this.restoreAttempts,
      status: "fully_reactivated",
    });

    console.log(`✅ Device reactivation completed.`);
    console.log(`🚀 Bot is now listening for messages and commands.\n`);
  }

  /**
   * Handle disconnection during restore
   */
  handleRestoreDisconnect(reason) {
    console.error(`\n⚠️  Device disconnected during restore: ${reason}`);
    
    updateDeviceStatus(this.masterNumber, {
      isActive: false,
      restoreStatus: "disconnected_during_restore",
      disconnectReason: reason,
      disconnectTime: new Date().toISOString(),
    });

    logSessionEvent(this.masterNumber, "restore_disconnect", {
      reason: reason,
      attempt: this.restoreAttempts,
    });

    if (this.restoreAttempts < this.maxRestoreAttempts) {
      console.log("🔄 Will retry restore on next connection...\n");
    }
  }

  /**
   * Verify device reactivation
   */
  async verifyDeviceReactivation() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const status = getDeviceStatus(this.masterNumber);
        
        if (status && status.deviceLinked && status.isActive) {
          clearInterval(checkInterval);
          console.log("✅ Device reactivation verified successfully!\n");
          resolve(true);
        }
      }, 1000);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        const status = getDeviceStatus(this.masterNumber);
        const isActive = status?.deviceLinked && status?.isActive;
        
        if (!isActive) {
          console.warn("⚠️  Device reactivation verification timeout\n");
        }
        resolve(isActive);
      }, 30000);
    });
  }

  /**
   * Get restore handler status
   */
  getStatus() {
    const status = getDeviceStatus(this.masterNumber);
    
    return {
      masterNumber: this.masterNumber,
      restoreAttempts: this.restoreAttempts,
      maxRestoreAttempts: this.maxRestoreAttempts,
      deviceReactivated: this.deviceReactivated,
      currentStatus: status,
      restoreStartTime: this.restoreStartTime,
    };
  }

  /**
   * Display restore summary
   */
  displayRestoreSummary() {
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║          📊 SESSION RESTORE SUMMARY                        ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    const status = this.getStatus();
    
    console.log(`🔢 Restore Attempts: ${status.restoreAttempts}/${status.maxRestoreAttempts}`);
    console.log(`✅ Device Reactivated: ${status.deviceReactivated ? "YES" : "NO"}`);
    
    if (status.currentStatus) {
      console.log(`📊 Device Linked: ${status.currentStatus.deviceLinked ? "YES" : "NO"}`);
      console.log(`📊 Device Active: ${status.currentStatus.isActive ? "YES" : "NO"}`);
      console.log(`📊 Restore Count: ${status.currentStatus.restoreCount || 0}`);
      console.log(`⏱️  Last Restore: ${new Date(status.currentStatus.lastRestoreTime).toLocaleString()}`);
    }
    
    console.log("\n");
  }

  /**
   * Full device reactivation check
   */
  async ensureFullReactivation() {
    console.log("🔍 Ensuring full device reactivation...\n");

    const verified = await this.verifyDeviceReactivation();
    
    if (verified) {
      console.log("✅ Full device reactivation confirmed.\n");
      displayDeviceStatus(this.masterNumber);
      return true;
    } else {
      console.warn("⚠️  Device reactivation incomplete. Manual intervention may be needed.\n");
      displayDeviceStatus(this.masterNumber);
      return false;
    }
  }
}

export default SessionRestoreHandler;
