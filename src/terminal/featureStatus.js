import fs from "fs";
import path from "path";
import GoogleServiceAccountManager from "../integrations/google/GoogleServiceAccountManager.js";

export const checkSessionExists = (number) => {
  const sessionPath = path.join(process.cwd(), "sessions", `session-${number}`);
  return fs.existsSync(sessionPath);
};

export const checkGoogleAccountConnected = async () => {
  try {
    // Phase 22: Use GoogleServiceAccountManager to check all configured accounts
    const credManager = new GoogleServiceAccountManager();
    const accounts = credManager.listAvailableAccounts();
    
    if (accounts.length > 0) {
      return {
        connected: true,
        accounts: accounts,
        email: `${accounts.length} account(s) configured`,
        type: "Service Account (via .env or legacy)"
      };
    }
    
    return { connected: false };
  } catch (error) {
    return { connected: false };
  }
};

export const checkGoogleSheetConnected = () => {
  try {
    const tokenPath = path.join(process.cwd(), "config", "google", "token.json");
    if (fs.existsSync(tokenPath)) {
      return {
        connected: true,
        type: "Google Sheets API"
      };
    }
    return { connected: false };
  } catch (error) {
    return { connected: false };
  }
};

export const displayFeatureStatus = (number) => {
  console.clear();
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║         📊 WhatsApp Bot - Connected Features & Status      ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log(`📱 Master Account: ${number}`);
  console.log(`🤖 Bot Instance: Lion0`);
  console.log(`📍 Global Reference: global.Lion0\n`);
  
  console.log("🔌 Connected Services:\n");

  // Check WhatsApp Session
  const sessionExists = checkSessionExists(number);
  if (sessionExists) {
    console.log("  ✅ WhatsApp Session (Lion0)");
    console.log("     └─ Status: LINKED & ACTIVE");
    console.log("     └─ Location: /sessions/session-" + number);
    console.log("     └─ Type: Master Account\n");
  } else {
    console.log("  ⚠️  WhatsApp Session (Lion0)");
    console.log("     └─ Status: Not yet authenticated");
    console.log("     └─ Action: Link device with QR or 6-digit code\n");
  }

  // Check Google API
  const googleAPI = checkGoogleAccountConnected();
  if (googleAPI.connected) {
    console.log("  ✅ Google Cloud API");
    console.log(`     └─ Account: ${googleAPI.email}`);
    console.log("     └─ Type: " + googleAPI.type + "\n");
  } else {
    console.log("  ⚪ Google Cloud API");
    console.log("     └─ Status: Not configured");
    console.log("     └─ Action: Add Google API keys in /config/google/\n");
  }

  // Check Google Sheets
  const googleSheets = checkGoogleSheetConnected();
  if (googleSheets.connected) {
    console.log("  ✅ Google Sheets Integration");
    console.log("     └─ Status: Connected & Ready\n");
  } else {
    console.log("  ⚪ Google Sheets Integration");
    console.log("     └─ Status: Not configured");
    console.log("     └─ Action: Authenticate Google Sheets API\n");
  }

  console.log("═".repeat(60) + "\n");
};

export const displaySessionRestored = (number) => {
  console.clear();
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║        ✅ Session Restored Successfully                    ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log(`📱 Master Account: ${number}`);
  console.log(`🤖 Bot Instance: Lion0`);
  console.log(`📍 Global Reference: global.Lion0\n`);
  
  console.log("✅ Your previous session has been restored!");
  console.log("✅ Device linking status: CHECKING...\n");
  console.log("🔄 Reconnecting to WhatsApp...\n");
};

export const displayNewSetup = (number) => {
  console.clear();
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║     🚀 New Setup - First Time Authentication (Lion0)       ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log(`📱 Master Account: ${number}`);
  console.log(`🤖 Bot Instance: Lion0`);
  console.log(`📍 Global Reference: global.Lion0\n`);
  
  console.log("🔧 Setup Status:");
  console.log("   • First time using this account");
  console.log("   • Session will be created and stored");
  console.log("   • Device linking required\n");
  
  displayFeatureStatus(number);
};
