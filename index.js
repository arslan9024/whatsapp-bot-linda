import 'dotenv/config';
import { WhatsAppClientFunctions } from "./code/WhatsAppBot/WhatsAppClientFunctions.js";
import { CreatingNewWhatsAppClient } from "./code/WhatsAppBot/CreatingNewWhatsAppClient.js";
import DeviceLinker from "./code/WhatsAppBot/DeviceLinker.js";
import SessionRestoreHandler from "./code/WhatsAppBot/SessionRestoreHandler.js";
import { checkAndHandleExistingSession } from "./code/utils/interactiveSetup.js";
import { createDeviceStatusFile } from "./code/utils/deviceStatus.js";
import SessionManager from "./code/utils/SessionManager.js";

// Global references for the bot
let Lion0 = null;
let isInitializing = false; // Guard to prevent multiple initializations

// Main initialization function
async function initializeBot() {
  // Guard to prevent multiple simultaneous initializations
  if (isInitializing) {
    console.log("⚠️  Bot initialization already in progress, skipping...\n");
    return;
  }
  
  isInitializing = true;
  
  try {
    // Get master number from .env file
    const masterNumber = process.env.BOT_MASTER_NUMBER;
    
    if (!masterNumber) {
      throw new Error("BOT_MASTER_NUMBER not found in .env file");
    }
    
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║          🚀 WhatsApp Bot - Automatic Initialization        ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");
    
    console.log(`📱 Master Account (from .env): ${masterNumber}`);
    console.log(`🤖 Bot Instance: Lion0\n`);

    // Check if session already exists
    const sessionStatus = await checkAndHandleExistingSession(masterNumber);

    // Create or update device status file
    if (sessionStatus === "new") {
      console.log("📝 Creating new device status file...\n");
      createDeviceStatusFile(masterNumber);
    }

    // Use QR code authentication for headless/local development
    // (6-digit code requires full browser APIs not available in headless mode)
    const authMethod = "qr"; // Use QR code for local development
    
    // Only show authentication message if new session
    if (sessionStatus === "new") {
      console.log(`🔐 Authentication Method: QR Code (Headless Mode)\n`);
    }
    
    console.log("⏳ Creating WhatsApp client...\n");

    // Create the WhatsApp client
    Lion0 = await CreatingNewWhatsAppClient(masterNumber);
    
    if (!Lion0) {
      throw new Error("Failed to create WhatsApp client");
    }

    console.log("✅ WhatsApp client created successfully\n");
    
    // Handle new vs restore sessions with different flows
    if (sessionStatus === "new") {
      console.log("🔄 Initializing device linking for NEW session...\n");
      const deviceLinker = new DeviceLinker(Lion0, masterNumber, authMethod, "new");
      deviceLinker.startLinking();
      // Don't await - event listeners handle completion
    } else {
      console.log("✅ Existing session found - Reactivating device connection...\n");
      console.log("⏳ Attempting to reactivate previous session (max 3 attempts)...\n");
      
      // For restore sessions: use dedicated session restore handler
      const restoreHandler = new SessionRestoreHandler(Lion0, masterNumber);
      restoreHandler.startRestore();
      // Handler manages the entire restore flow including fallback
    }

    // Make bot available globally immediately (before session ready)
    global.Lion0 = Lion0;
    global.Lion = Lion0; // Alias for backward compatibility
    global.MasterBot = Lion0; // Alias for clarity

  } catch (error) {
    console.error("\n❌ Initialization Error:", error.message);
    console.error("Stack:", error.stack);
    
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔧 Troubleshooting Tips:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("1. Clear old sessions: npm run clean-sessions");
    console.log("2. Check .env file: BOT_MASTER_NUMBER=971505760056");
    console.log("3. Verify internet connection");
    console.log("4. Try again: npm run dev\n");
    
    process.exit(1);
  }
}

// Start the bot
initializeBot();
