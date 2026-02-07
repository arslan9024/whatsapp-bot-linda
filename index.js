import { WhatsAppClientFunctions } from "./code/WhatsAppBot/WhatsAppClientFunctions.js";
import { CreatingNewWhatsAppClient } from "./code/WhatsAppBot/CreatingNewWhatsAppClient.js";
import { askForMasterNumber, askForAuthMethod, checkAndHandleExistingSession, closeInterface } from "./code/utils/interactiveSetup.js";
import { createDeviceStatusFile } from "./code/utils/deviceStatus.js";

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

// Create and initialize the client
export const Lion0 = await CreatingNewWhatsAppClient(masterNumber);
export const Lion = Lion0; // Alias for backward compatibility
export const MasterBot = Lion0; // Alias for clarity

// Initialize with chosen authentication method
WhatsAppClientFunctions(Lion0, masterNumber, authMethod, sessionStatus);

// Close readline interface after initialization
setTimeout(() => {
  closeInterface();
}, 1000);

// Additional bots can be added here with different authentication methods
// export const Lion1 = await CreatingNewWhatsAppClient(otherNumber);
// WhatsAppClientFunctions(Lion1, otherNumber, "code", "new");
// export const Lion2 = await CreatingNewWhatsAppClient(anotherNumber);
// WhatsAppClientFunctions(Lion2, anotherNumber, "qr", "new");
