import 'dotenv/config';
import { WhatsAppClientFunctions } from "./code/WhatsAppBot/WhatsAppClientFunctions.js";
import { CreatingNewWhatsAppClient } from "./code/WhatsAppBot/CreatingNewWhatsAppClient.js";
import DeviceLinker from "./code/WhatsAppBot/DeviceLinker.js";
import { checkAndHandleExistingSession } from "./code/utils/interactiveSetup.js";
import { createDeviceStatusFile } from "./code/utils/deviceStatus.js";
import SessionManager from "./code/utils/SessionManager.js";

// Global references for the bot
let Lion0 = null;

// Main initialization function
async function initializeBot() {
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

    // Auto-use 6-digit code for authentication
    const authMethod = "code"; // Always use 6-digit code
    console.log(`🔐 Authentication Method: 6-Digit Code (Recommended)\n`);
    
    console.log("⏳ Creating WhatsApp client...\n");

    // Create the WhatsApp client
    Lion0 = await CreatingNewWhatsAppClient(masterNumber);
    
    if (!Lion0) {
      throw new Error("Failed to create WhatsApp client");
    }

    console.log("✅ WhatsApp client created successfully\n");
    
    // Initialize device linker for proper 6-digit code handling
    const deviceLinker = new DeviceLinker(Lion0, masterNumber, authMethod);
    
    console.log("🔄 Initializing device linking...\n");
    await deviceLinker.startLinking();

    // Make bot available globally
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
