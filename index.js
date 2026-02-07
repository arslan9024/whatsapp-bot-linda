import { WhatsAppClientFunctions } from "./code/WhatsAppBot/WhatsAppClientFunctions.js";
import { CreatingNewWhatsAppClient } from "./code/WhatsAppBot/CreatingNewWhatsAppClient.js";
import { askForMasterNumber, askForAuthMethod, checkAndHandleExistingSession, closeInterface } from "./code/utils/interactiveSetup.js";
import { createDeviceStatusFile } from "./code/utils/deviceStatus.js";

// Global references for the bot (for backward compatibility)
let Lion0 = null;

// Main initialization function
async function initializeBot() {
  try {
    // Start interactive setup
    console.log("\n");
    const masterNumber = await askForMasterNumber();

    // Check if session already exists
    const sessionStatus = await checkAndHandleExistingSession(masterNumber);

    // Create or update device status file
    if (sessionStatus === "new") {
      createDeviceStatusFile(masterNumber);
    }

    // Only ask for auth method if it's a new session
    let authMethod = "code"; // default to 6-digit code

    if (sessionStatus === "new") {
      authMethod = await askForAuthMethod();
    }

    console.log("\n⏳ Initializing WhatsApp Bot...\n");

    // Create the WhatsApp client
    Lion0 = await CreatingNewWhatsAppClient(masterNumber);
    
    if (!Lion0) {
      throw new Error("Failed to create WhatsApp client");
    }

    // Initialize with chosen authentication method
    WhatsAppClientFunctions(Lion0, masterNumber, authMethod, sessionStatus);

    // Make bot available globally
    global.Lion0 = Lion0;
    global.Lion = Lion0; // Alias for backward compatibility
    global.MasterBot = Lion0; // Alias for clarity

    // Close readline interface after client setup
    setTimeout(() => {
      closeInterface();
    }, 2000);

  } catch (error) {
    console.error("\n❌ Initialization Error:", error.message);
    console.error("Stack:", error.stack);
    closeInterface();
    process.exit(1);
  }
}

// Start the bot
initializeBot();
