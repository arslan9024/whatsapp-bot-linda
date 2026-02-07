#!/usr/bin/env node

/**
 * listSessions.js
 * List all WhatsApp sessions in the project
 * Usage: npm run list-sessions
 */

import 'dotenv/config';
import SessionManager from "../code/utils/SessionManager.js";

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║         📱 WhatsApp Sessions List Utility                 ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  try {
    const masterNumber = process.env.BOT_MASTER_NUMBER;

    console.log("📋 All Available Sessions:\n");

    // List all sessions with details
    await SessionManager.listSessions(true);

    if (masterNumber) {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`📌 Master Account: ${masterNumber}\n`);

      const sessionExists = await SessionManager.sessionExists(masterNumber);
      const validation = await SessionManager.validateSession(masterNumber);

      if (sessionExists) {
        console.log(`✅ Session Status: EXISTS`);
        console.log(`🔍 Validation: ${validation.reason}`);
        
        const size = await SessionManager.getSessionSize(masterNumber);
        const created = await SessionManager.getSessionCreationTime(masterNumber);
        
        console.log(`💾 Size: ${size}`);
        console.log(`📅 Created: ${created?.toLocaleString() || "unknown"}\n`);

        console.log("🔧 Actions:");
        console.log("   • npm run dev          → Start bot with this session");
        console.log("   • npm run clean-sessions → Clear this session");
        console.log("   • npm run fresh-start  → Create a fresh session\n");
      } else {
        console.log(`❌ Session Status: NOT FOUND\n`);

        console.log("🔧 Actions:");
        console.log("   • npm run dev          → Create new session automatically");
        console.log("   • npm run fresh-start  → Explicitly create fresh session\n");
      }
    } else {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("⚠️  BOT_MASTER_NUMBER not set in .env\n");
      console.log("📝 Add this to .env file:");
      console.log("   BOT_MASTER_NUMBER=971505760056\n");
    }

  } catch (error) {
    console.error("❌ Error listing sessions:", error.message);
    process.exit(1);
  }
}

main();
