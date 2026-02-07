import readline from "readline";
import { checkSessionExists, displaySessionRestored, displayNewSetup, displayFeatureStatus } from "./featureStatus.js";
import { displayDeviceStatus } from "./deviceStatus.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
};

export const displayHeader = () => {
  console.clear();
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║          🚀 WhatsApp Bot - Interactive Setup               ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
};

export const askForMasterNumber = async () => {
  displayHeader();
  console.log("📱 Step 1: Setup Master Account\n");
  console.log("Enter the WhatsApp phone number for your master account.");
  console.log("(Include country code, e.g., 971505760056)\n");
  
  const number = await question("📞 Enter master WhatsApp number: ");
  
  if (!number || number.length < 10) {
    console.log("\n❌ Invalid number. Please try again.\n");
    return askForMasterNumber();
  }
  
  return number;
};

export const checkAndHandleExistingSession = async (number) => {
  const sessionExists = checkSessionExists(number);
  
  if (sessionExists) {
    displaySessionRestored(number);
    displayDeviceStatus(number);
    return "restore"; // Signal to restore existing session
  } else {
    displayNewSetup(number);
    return "new"; // Signal to create new session
  }
};

export const askForAuthMethod = async () => {
  console.log("🔐 Step 3: Choose Authentication Method\n");
  console.log("1️⃣  Link Device with 6-Digit Code (Recommended)");
  console.log("2️⃣  Scan QR Code with WhatsApp\n");
  
  const choice = await question("Choose option (1 or 2, press Enter for default): ");
  
  if (choice === "1" || choice === "") {
    return "code"; // Default to 6-digit code if empty
  } else if (choice === "2") {
    return "qr";
  } else {
    console.log("\n❌ Invalid choice. Please enter 1 or 2.\n");
    return askForAuthMethod();
  }
};

export const displayCode = (code, number) => {
  console.clear();
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║          🚀 WhatsApp Bot - Link Device by Code            ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  
  console.log("✅ Pairing code generated successfully!\n");
  console.log(`📱 Master Number: ${number}\n`);
  console.log("🔐 Your 6-digit code:\n");
  console.log(`   ┌─────────────────────────┐`);
  console.log(`   │  ${code}          │`);
  console.log(`   └─────────────────────────┘\n`);
  
  console.log("📝 Steps to Link Device:");
  console.log("   1. Open WhatsApp on your phone");
  console.log("   2. Go to: Settings → Linked Devices");
  console.log("   3. Tap: Link a Device");
  console.log("   4. Select: Use 6-digit code");
  console.log("   5. Enter the code shown above\n");
  console.log("⏳ Waiting for you to enter the code on your phone...\n");
};

export const displayQRInstructions = (number) => {
  console.clear();
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║          🚀 WhatsApp Bot - QR Code Authentication         ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  
  console.log(`📱 Master Number: ${number}\n`);
  console.log("Follow these steps:");
  console.log("  1️⃣  Open WhatsApp on your phone");
  console.log("  2️⃣  Go to: Settings → Linked Devices");
  console.log("  3️⃣  Tap: Link a Device");
  console.log("  4️⃣  Scan the QR code below:\n");
};

export const closeInterface = () => {
  rl.close();
};
