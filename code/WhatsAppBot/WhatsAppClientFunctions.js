import qrcode from "qrcode-terminal";
import { MessageAnalyzer } from "./MessageAnalyzer.js";
import { getEnhancedMessageHandler } from "./EnhancedMessageHandler.js";
import { displayCode, displayQRInstructions, closeInterface } from "../utils/interactiveSetup.js";
import { displayFeatureStatus } from "../utils/featureStatus.js";
import { createDeviceStatusFile, updateDeviceStatus, displayDeviceStatus, displayAuthenticationSuccess } from "../utils/deviceStatus.js";
import { logMessageType, logMessageTypeCompact } from "../utils/messageTypeLogger.js";
import SessionRestoreHandler from "./SessionRestoreHandler.js";

export const WhatsAppClientFunctions = (client, number, authMethod, sessionStatus) => {
  if (!client) {
    console.error("❌ Client is null or undefined");
    return;
  }

  try {
    // Handle session restore with dedicated handler
    let restoreHandler = null;
    
    if (sessionStatus === "restore") {
      console.log(`\n🔄 Session restoration detected for: ${number}`);
      restoreHandler = new SessionRestoreHandler(client, number);
      // Start restore process instead of regular initialization
      restoreHandler.startRestore();
      return; // Restore handler manages initialization
    }

    // Regular initialization for new sessions
    console.log(`\n🔄 Initializing WhatsApp client for: ${number}`);
    client.initialize();
    
    let pairingCodeRequested = false;
    let qrDisplayed = false;
    
    client.on("loading_screen", (percent, message) => {
      console.log("📊 LOADING:", percent + "%", message);
    });
    
    client.on('qr', async (qr) => {
      // QR display only happens on new sessions
      // (restore is handled by restoreHandler above)
      
      if (!qrDisplayed) {
        qrDisplayed = true;
        
        // If user chose pairing code method
        if (authMethod === "code") {
          if (!pairingCodeRequested) {
            try {
              const pairingCode = await client.requestPairingCode(number);
              displayCode(pairingCode, number);
              pairingCodeRequested = true;
            } catch (error) {
              console.warn("⚠️  Pairing code not available, falling back to QR code...\n");
              displayQRInstructions(number);
              qrcode.generate(qr, { small: true });
              console.log(`\n✅ Bot ID: ${number}`);
              console.log("⏳ Waiting for authentication...\n");
            }
          }
        } else {
          // QR code method
          displayQRInstructions(number);
          qrcode.generate(qr, { small: true });
          console.log(`\n✅ Bot ID: ${number}`);
          console.log("⏳ Waiting for authentication...\n");
        }
      }
    });

    client.on("authenticated", () => {
      // Update device status when authenticated (new session)
      console.log("\n✅ Authentication successful!");
      console.log("🔄 Reactivating device for new session...\n");
      
      updateDeviceStatus(number, {
        deviceLinked: true,
        isActive: true,
        linkedAt: new Date().toISOString(),
        lastConnected: new Date().toISOString(),
        authMethod: authMethod,
        sessionType: "new",
      });
      
      displayAuthenticationSuccess(number, authMethod);
    });

    client.on("auth_failure", msg => {
      // Authentication failure for new session
      console.error("\n" + "━".repeat(60));
      console.error("❌ AUTHENTICATION FAILURE");
      console.error("━".repeat(60));
      console.error(`Error: ${msg}`);
      console.error(`Session Type: ${sessionStatus}`);
      
      updateDeviceStatus(number, {
        deviceLinked: false,
        isActive: false,
        authFailure: true,
        failureTime: new Date().toISOString(),
        failureMessage: msg,
      });
      
      console.error("\n⚠️  Device has been unlinked. Please re-authenticate.\n");
      console.log("Creating new session file...\n");
    });

    // When the client is ready, run this code (only once)
    client.once("ready", () => {
      console.clear();
      console.log("\n╔════════════════════════════════════════════════════════════╗");
      console.log("║          🤖 LION0 BOT IS READY TO SERVE!                  ║");
      console.log("╚════════════════════════════════════════════════════════════╝\n");
      
      console.log(`📱 Master Account: ${number}`);
      console.log(`✅ Device Status: LINKED & ACTIVE`);
      console.log(`✅ Connection: AUTHENTICATED`);
      console.log(`✅ Session: PERSISTENT\n`);
      
      console.log(`🤖 Bot Instance: Lion0`);
      console.log(`📍 Global Reference: global.Lion0 = ${number}\n`);
      
      // Display device status
      displayDeviceStatus(number);
      
      // Display connected features
      displayFeatureStatus(number);
      
      console.log("\n╔════════════════════════════════════════════════════════════╗");
      console.log("║          ✅ LISTENING FOR MESSAGES                        ║");
      console.log("╚════════════════════════════════════════════════════════════╝\n");
      
      console.log(`📞 Commands Ready:`);
      console.log(`   • Incoming messages will be logged`);
      console.log(`   • Test with: !ping (bot will reply "pong")`);
      console.log(`   • Ready for message handlers\n`);
      
      console.log(`🚀 Ready for:`);
      console.log(`   ✓ Automated campaigns`);
      console.log(`   ✓ Contact management`);
      console.log(`   ✓ Message forwarding`);
      console.log(`   ✓ AI-powered responses\n`);
    });

    // NOTE: Removed duplicate client.on("ready") handler that was firing every time
    // The client.once("ready") above handles initial ready event
    // This prevents duplicate processing and display of feature status

    client.on("message", async (msg) => {
      // Phase 3: Use enhanced message handler with context enrichment
      try {
        const handler = getEnhancedMessageHandler();
        await handler.processMessage(msg);
      } catch (error) {
        console.error("❌ Error in enhanced handler:", error.message);
        // Fallback to legacy analyzer for stability
        try {
          MessageAnalyzer(msg);
        } catch (e) {
          console.error("❌ Fallback analyzer also failed:", e.message);
        }
      }
    });

    client.on("error", (error) => {
      console.error("❌ Client Error:", error.message);
    });

    client.on("disconnected", (reason) => {
      console.warn("⚠️  Client Disconnected:", reason);
    });

  } catch (error) {
    console.error("❌ Error in WhatsAppClientFunctions:", error.message);
    console.error("Stack:", error.stack);
  }
};
