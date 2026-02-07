#!/usr/bin/env node

/**
 * freshStart.js
 * Create a completely fresh session for WhatsApp Bot
 * Usage: npm run fresh-start
 */

import 'dotenv/config';
import SessionManager from "../code/utils/SessionManager.js";

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║        🆕 WhatsApp Fresh Session Creator                  ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  try {
    const masterNumber = process.env.BOT_MASTER_NUMBER;

    if (!masterNumber) {
      console.log("❌ Error: BOT_MASTER_NUMBER not found in .env file");
      console.log("📝 Please add BOT_MASTER_NUMBER=<your_number> to .env\n");
      process.exit(1);
    }

    console.log(`📱 Master Account: ${masterNumber}\n`);
    console.log("🔄 Starting fresh session initialization...\n");

    // Clean up old session if exists
    const existingSession = await SessionManager.sessionExists(masterNumber);
    if (existingSession) {
      console.log("🧹 Removing old session...\n");
      await SessionManager.cleanupSession(masterNumber);
    }

    // Create fresh session
    const created = await SessionManager.createFreshSession(masterNumber);

    if (created) {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("✅ FRESH SESSION CREATED SUCCESSFULLY!");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      console.log("🚀 Ready to start bot migration!\n");
      console.log("📋 Next Steps:");
      console.log("   1. Run: npm run dev");
      console.log("   2. You will receive a 6-digit pairing code");
      console.log("   3. Open WhatsApp on your phone");
      console.log("   4. Go to: Settings → Linked Devices → Link a Device");
      console.log("   5. Select: Use 6-digit code");
      console.log("   6. Enter the code from terminal\n");

      console.log("💡 Tips:");
      console.log("   • Keep both windows (terminal & phone) open during linking");
      console.log("   • Code expires after 60 seconds, you may need to refresh");
      console.log("   • Once linked, bot will start automatically\n");
    } else {
      console.error("❌ Failed to create fresh session\n");
      process.exit(1);
    }

  } catch (error) {
    console.error("❌ Error during fresh start:", error.message);
    process.exit(1);
  }
}

main();
