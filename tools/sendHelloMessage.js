#!/usr/bin/env node

/**
 * sendHelloMessage.js
 * Send a hello message to a contact if session is active
 * 
 * USAGE:
 * Method 1 - Run with bot already running in another terminal:
 *   node tools/sendHelloMessage.js 971505110636
 * 
 * Method 2 - Start bot together with message sender:
 *   npm run send-hello 971505110636
 */

import 'dotenv/config';
import { CreatingNewWhatsAppClient } from "../code/WhatsAppBot/CreatingNewWhatsAppClient.js";
import DeviceLinker from "../code/WhatsAppBot/DeviceLinker.js";
import { checkAndHandleExistingSession } from "../code/utils/interactiveSetup.js";

async function sendHelloMessage(phoneNumber) {
  try {
    const masterNumber = process.env.BOT_MASTER_NUMBER || '971505760056';
    const targetNumber = phoneNumber || '971505110636';
    
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║        📱 Hello Message Sender - Session Active Check     ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");
    
    console.log(`🤖 Master Account: ${masterNumber}`);
    console.log(`📞 Target Number: ${targetNumber}\n`);
    
    // Check if session exists
    const sessionStatus = await checkAndHandleExistingSession(masterNumber);
    
    if (sessionStatus === "new") {
      console.log("❌ No active session found!\n");
      console.log("📝 Please follow these steps:");
      console.log("   1. Run: npm run fresh-start");
      console.log("   2. Run: npm run dev");
      console.log("   3. Link your device when prompted");
      console.log("   4. Then run this script again\n");
      process.exit(1);
    }
    
    console.log("✅ Session found! Creating WhatsApp client...\n");
    
    // Create WhatsApp client
    const client = await CreatingNewWhatsAppClient(masterNumber);
    
    if (!client) {
      throw new Error("Failed to create WhatsApp client");
    }
    
    console.log("✅ WhatsApp client created\n");
    console.log("⏳ Checking device status and waiting for ready state...\n");
    
    // Track if ready
    let isReady = false;
    let sendSuccess = false;
    const timeout = 30000; // 30 second timeout
    const startTime = Date.now();
    
    // Setup event listeners
    client.on('ready', async () => {
      if (!isReady) {
        isReady = true;
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("✅ DEVICE LINKED & BOT READY!");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        
        try {
          // Prepare message
          const helloMessage = `Hello! 👋 This is a test message from WhatsApp Bot Lion0. Your device is active and ready to serve!`;
          const chatId = `${targetNumber}@c.us`;
          
          console.log(`📤 Sending hello message to ${targetNumber}...`);
          console.log(`💬 Message: "${helloMessage}"\n`);
          
          // Send message
          const result = await client.sendMessage(chatId, helloMessage);
          
          sendSuccess = true;
          
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log("✅ MESSAGE SENT SUCCESSFULLY!");
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
          
          console.log("📨 Message Details:");
          console.log(`   • From: WhatsApp Bot (${masterNumber})`);
          console.log(`   • To: ${targetNumber}`);
          console.log(`   • Status: ✅ SENT`);
          console.log(`   • Timestamp: ${new Date().toLocaleString()}`);
          console.log(`   • Message ID: ${result.id || 'N/A'}\n`);
          
          // Close client and exit
          setTimeout(() => {
            process.exit(0);
          }, 2000);
          
        } catch (sendError) {
          console.error("❌ Error sending message:", sendError.message);
          console.error("\nTroubleshooting:");
          console.error("  • Check if contact number is correct");
          console.error("  • Ensure WhatsApp has permission to send messages");
          console.error("  • Verify internet connection\n");
          process.exit(1);
        }
      }
    });
    
    client.on('auth_failure', (msg) => {
      console.error("❌ Authentication failed:", msg);
      console.error("\nPlease re-link your device:");
      console.error("   1. Run: npm run clean-sessions");
      console.error("   2. Run: npm run fresh-start");
      console.error("   3. Run: npm run dev");
      console.error("   4. Link device when prompted\n");
      process.exit(1);
    });
    
    client.on('qr', (qr) => {
      console.log("📱 QR Code generated - please scan with WhatsApp\n");
    });
    
    // Initialize client
    console.log("🚀 Initializing WhatsApp client...\n");
    client.initialize();
    
    // Timeout check
    setTimeout(() => {
      if (!sendSuccess && !isReady) {
        console.error("❌ Timeout: Device not ready after 30 seconds\n");
        console.error("⚠️  Possible issues:");
        console.error("   • Device not properly linked");
        console.error("   • WhatsApp servers not responding");
        console.error("   • Check your internet connection\n");
        console.error("Try again with:");
        console.error("   npm run clean-sessions");
        console.error("   npm run fresh-start");
        console.error("   npm run dev\n");
        process.exit(1);
      }
    }, timeout);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.stack) {
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  }
}

// Get phone number from command line or use default
const phoneNumber = process.argv[2];
sendHelloMessage(phoneNumber);

