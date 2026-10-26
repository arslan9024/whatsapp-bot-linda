/**
 * DeviceLinker.js
 * Handles WhatsApp device linking with 6-digit pairing code
 * Provides robust error handling and reconnection logic
 */

import { displayCode, displayQRInstructions } from "../terminal/interactiveSetup.js";
import { updateDeviceStatus, displayAuthenticationSuccess } from "./deviceStatus.js";
import qrcode from "qrcode-terminal";

export class DeviceLinker {
  constructor(client, masterNumber, authMethod, sessionStatus = "new") {
    this.client = client;
    this.masterNumber = masterNumber;
    this.authMethod = authMethod;
    this.sessionStatus = sessionStatus; // "new" or "restore"
    this.pairingCodeRequested = false;
    this.qrDisplayed = false;
    this.authAttempts = 0;
    this.maxAuthAttempts = 3;
  }

  /**
   * Start the device linking process
   */
  async startLinking() {
    console.log(`\n🔄 Starting device linking for: ${this.masterNumber}`);
    console.log(`🔐 Authentication Method: ${this.authMethod === "code" ? "6-Digit Code" : "QR Code"}\n`);

    this.setupEventListeners();
  }

  /**
   * Setup all event listeners for device linking
   */
  setupEventListeners() {
    // Loading screen progress
    this.client.on("loading_screen", (percent, message) => {
      if (percent % 20 === 0) {
        console.log(`📊 Loading: ${percent}% - ${message}`);
      }
    });

    // QR Code event
    this.client.on("qr", (qr) => this.handleQREvent(qr));

    // Authenticated successfully
    this.client.on("authenticated", () => this.handleAuthenticated());

    // Authentication failure
    this.client.on("auth_failure", (msg) => this.handleAuthFailure(msg));

    // Ready event - bot is fully initialized
    this.client.once("ready", () => this.handleReady());

    // Disconnected event
    this.client.on("disconnected", (reason) => this.handleDisconnected(reason));

    // Initialize the client
    console.log("🚀 Initializing WhatsApp client...\n");
    this.client.initialize();
  }

  /**
   * Handle QR code event
   */
  async handleQREvent(qr) {
    try {
      // Skip QR display if this is a restored session (already linked)
      if (this.sessionStatus === "restore") {
        console.log("✅ Session restored - Authenticating with existing device...\n");
        return;
      }

      if (this.qrDisplayed) {
        return;
      }

      this.qrDisplayed = true;

      if (this.authMethod === "code") {
        // Try to use 6-digit pairing code
        await this.requestPairingCode();
      } else {
        // Display QR code
        this.displayQRCode(qr);
      }
    } catch (error) {
      console.error("❌ QR Event Error:", error.message);
    }
  }

  /**
   * Request 6-digit pairing code from WhatsApp
   */
  async requestPairingCode() {
    try {
      if (this.pairingCodeRequested) {
        return;
      }

      this.pairingCodeRequested = true;

      console.log("📲 Requesting 6-digit pairing code from WhatsApp...\n");
      
      const pairingCode = await this.client.requestPairingCode(this.masterNumber);

      if (pairingCode) {
        console.log("✅ Pairing code generated successfully!\n");
        displayCode(pairingCode, this.masterNumber);
      } else {
        console.warn("⚠️  Pairing code generation returned empty");
        this.fallbackToQR();
      }
    } catch (error) {
      console.warn("⚠️  Pairing code not available:", error.message);
      console.log("↪️  Falling back to QR code authentication...\n");
      this.pairingCodeRequested = false;
      this.qrDisplayed = false;
    }
  }

  /**
   * Display QR code in terminal (compact size)
   */
  displayQRCode(qr) {
    displayQRInstructions(this.masterNumber);
    
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║            📱 SCAN QR CODE WITH YOUR PHONE                 ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");
    
    try {
      // Generate QR code - small and compact
      qrcode.generate(qr, { small: true });
      console.log("\n");
    } catch (error) {
      console.error("⚠️  QR Code generation issue");
    }

    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("│ Bot ID: 971505760056");
    console.log("│ Status: Waiting for device link...");
    console.log("│ Timeout: 60 seconds");
    console.log("╚════════════════════════════════════════════════════════════╝\n");
  }

  /**
   * Fallback to QR code when pairing code fails
   */
  fallbackToQR() {
    this.authMethod = "qr";
    this.qrDisplayed = false;
    console.log("📱 QR code method will be used for authentication\n");
  }

  /**
   * Handle successful authentication
   */
  handleAuthenticated() {
    this.authAttempts = 0;
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ AUTHENTICATION SUCCESSFUL!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    updateDeviceStatus(this.masterNumber, {
      deviceLinked: true,
      isActive: true,
      linkedAt: new Date().toISOString(),
      lastConnected: new Date().toISOString(),
      authMethod: this.authMethod,
      status: "authenticated",
    });

    displayAuthenticationSuccess(this.masterNumber, this.authMethod);
  }

  /**
   * Handle authentication failure
   */
  handleAuthFailure(msg) {
    this.authAttempts++;

    console.error("\n" + "━".repeat(60));
    console.error("❌ AUTHENTICATION FAILURE");
    console.error("━".repeat(60));
    console.error(`Error: ${msg}`);
    console.error(`Attempt: ${this.authAttempts}/${this.maxAuthAttempts}\n`);

    updateDeviceStatus(this.masterNumber, {
      deviceLinked: false,
      isActive: false,
      status: "auth_failed",
      lastError: msg,
      failureTime: new Date().toISOString(),
    });

    if (this.authAttempts < this.maxAuthAttempts) {
      console.log("🔄 Retrying authentication...\n");
      this.resetAuthState();
    } else {
      console.error("❌ Maximum authentication attempts reached.");
      console.error("Please clear sessions and restart the bot.\n");
      process.exit(1);
    }
  }

  /**
   * Handle ready event
   */
  handleReady() {
    console.clear();
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║          🤖 LION0 BOT IS READY TO SERVE!                  ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    console.log(`📱 Master Account: ${this.masterNumber}`);
    console.log(`✅ Device Status: LINKED & ACTIVE`);
    console.log(`✅ Connection: AUTHENTICATED`);
    console.log(`✅ Session: PERSISTENT`);
    console.log(`✅ Auth Method: ${this.authMethod === "code" ? "6-Digit Code" : "QR Code"}\n`);

    console.log(`🤖 Bot Instance: Lion0`);
    console.log(`📍 Global Reference: global.Lion0\n`);

    updateDeviceStatus(this.masterNumber, {
      deviceLinked: true,
      isActive: true,
      status: "ready",
      readyTime: new Date().toISOString(),
    });
  }

  /**
   * Handle disconnected event
   */
  handleDisconnected(reason) {
    console.warn(`\n⚠️  Bot disconnected: ${reason}`);

    updateDeviceStatus(this.masterNumber, {
      isActive: false,
      status: "disconnected",
      disconnectReason: reason,
      disconnectTime: new Date().toISOString(),
    });

    if (reason === "NAVIGATION" && reason !== "LOGOUT") {
      console.log("🔄 Attempting to reconnect...\n");
    }
  }

  /**
   * Reset authentication state for retry
   */
  resetAuthState() {
    this.pairingCodeRequested = false;
    this.qrDisplayed = false;
  }

  /**
   * Get device linker status
   */
  getStatus() {
    return {
      masterNumber: this.masterNumber,
      authMethod: this.authMethod,
      authAttempts: this.authAttempts,
      paringCodeRequested: this.pairingCodeRequested,
      qrDisplayed: this.qrDisplayed,
    };
  }
}

export default DeviceLinker;
