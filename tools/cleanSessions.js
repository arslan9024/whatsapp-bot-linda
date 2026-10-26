#!/usr/bin/env node

/**
 * cleanSessions.js
 * Utility tool to clean up old WhatsApp sessions
 * Usage: npm run clean-sessions
 */

import 'dotenv/config';
import SessionManager from "../src/sessions/SessionManager.js";

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║           🧹 WhatsApp Session Cleanup Utility             ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  try {
    const masterNumber = process.env.BOT_MASTER_NUMBER;

    if (!masterNumber) {
      console.log("⚠️  BOT_MASTER_NUMBER not found in .env file");
      console.log("📋 Listing all sessions instead...\n");
      await SessionManager.listSessions(true);
      return;
    }

    console.log(`🎯 Master Account: ${masterNumber}\n`);

    // Check if session exists
    const sessionExists = await SessionManager.sessionExists(masterNumber);

    if (!sessionExists) {
      console.log("✅ No session found to clean\n");
      console.log("📝 Ready to create fresh session on next startup\n");
      return;
    }

    // Validate session
    const validation = await SessionManager.validateSession(masterNumber);
    console.log(`🔍 Session Validation: ${validation.reason}\n`);

    // Clean up the session
    await SessionManager.cleanupSession(masterNumber);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Session cleanup complete!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("📝 Next Steps:");
    console.log("   1. Run: npm run dev");
    console.log("   2. You will get a fresh 6-digit pairing code");
    console.log("   3. Enter the code on WhatsApp: Settings → Linked Devices\n");

  } catch (error) {
    console.error("❌ Error during cleanup:", error.message);
    process.exit(1);
  }
}

main();
