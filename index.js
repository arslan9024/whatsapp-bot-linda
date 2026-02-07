import 'dotenv/config';
import { CreatingNewWhatsAppClient } from "./code/WhatsAppBot/CreatingNewWhatsAppClient.js";
import { createDeviceStatusFile } from "./code/utils/deviceStatus.js";
import { fullCleanup, killBrowserProcesses, sleep, setupShutdownHandlers } from "./code/utils/browserCleanup.js";
import SessionManager from "./code/utils/SessionManager.js";
import fs from "fs";
import path from "path";
import qrcode from "qrcode-terminal";

// Global bot instance
let Lion0 = null;
let isInitializing = false;
let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 2;

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
  });

  client.once("ready", () => {
    if (readyFired) return;
    readyFired = true;
    
    logBot("🟢 READY - Bot is online and listening", "ready");
    logBot(`Auth Method: ${deviceStatus.authMethod === "code" ? "6-Digit Code" : "QR Code"}`, "success");
    logBot("Waiting for messages...", "info");
    
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

  client.on("qr", (qr) => {
    if (!qrShown) {
      qrShown = true;
      console.clear();
      console.log("\n╔════════════════════════════════════════════════════════════╗");
      console.log("║         🔗 DEVICE LINKING - SCAN QR CODE                  ║");
      console.log("╚════════════════════════════════════════════════════════════╝\n");
      console.log("📱 Master Device Number: " + masterNumber + "\n");
      console.log("⏳ Scanning... Open WhatsApp → Settings → Linked Devices\n");
      
      // Display compact QR code using imported qrcode-terminal
      qrcode.generate(qr, { small: true, quiet: 1 });
      
      console.log("ℹ️  Waiting for you to scan the QR code with your phone...\n");
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
  });

  client.once("ready", () => {
    logBot("🟢 READY - Bot is online and listening", "ready");
    logBot("Session saved for future restarts", "success");
    logBot("Waiting for messages...", "info");
    
    // Create session backup for emergency recovery
    SessionManager.backupSession(masterNumber);
    
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
  client.on("message", (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    const from = msg.from.includes("@g.us") ? `Group: ${msg.from}` : `User: ${msg.from}`;
    
    logBot(`📨 [${timestamp}] ${from}: ${msg.body.substring(0, 50)}${msg.body.length > 50 ? "..." : ""}`, "info");

    // Test ping command
    if (msg.body === "!ping") {
      msg.reply("pong");
      logBot("📤 Ping reply sent", "success");
    }
  });

  logBot("Message listeners ready", "success");
}

/**
 * Graceful shutdown
 */
process.on("SIGINT", async () => {
  console.log("\n");
  logBot("Received shutdown signal", "warn");
  
  if (Lion0) {
    try {
      logBot("Closing WhatsApp connection...", "info");
      await Lion0.destroy();
      logBot("WhatsApp connection closed", "success");
    } catch (e) {
      logBot(`Error closing connection: ${e.message}`, "error");
    }
  }

  logBot("Bot stopped", "success");
  process.exit(0);
});

// Start the bot
logBot("Starting Linda WhatsApp Bot...", "info");
initializeBot();
