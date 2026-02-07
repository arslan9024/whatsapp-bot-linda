import qrcode from "qrcode-terminal";
import { MessageAnalyzer } from "./MessageAnalyzer.js";
import { displayCode, displayQRInstructions, closeInterface } from "../utils/interactiveSetup.js";
import { displayFeatureStatus } from "../utils/featureStatus.js";
import { createDeviceStatusFile, updateDeviceStatus, displayDeviceStatus, displayAuthenticationSuccess } from "../utils/deviceStatus.js";

export const WhatsAppClientFunctions = (client, number, authMethod, sessionStatus) => {
  if (!client) {
    console.error("❌ Client is null or undefined");
    return;
  }

  try {
    // client initialize does not finish at ready now.
    console.log(`\n🔄 Initializing WhatsApp client for: ${number}`);
    client.initialize();
    
    let pairingCodeRequested = false;
    let qrDisplayed = false;
    
    client.on("loading_screen", (percent, message) => {
      console.log("📊 LOADING:", percent + "%", message);
    });
    
    client.on('qr', async (qr) => {
      // Skip QR if this is a restored session
      if (sessionStatus === "restore") {
        return;
      }
      
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
      // Update device status when authenticated
      updateDeviceStatus(number, {
        deviceLinked: true,
        isActive: true,
        linkedAt: new Date().toISOString(),
        lastConnected: new Date().toISOString(),
        authMethod: authMethod,
      });
      
      displayAuthenticationSuccess(number, authMethod);
    });

    client.on("auth_failure", msg => {
      // Fired if session restore was unsuccessful
      updateDeviceStatus(number, {
        deviceLinked: false,
        isActive: false,
      });
      
      console.error("\n❌ AUTHENTICATION FAILURE:", msg);
      console.error("Your device has been unlinked. Please re-authenticate.\n");
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

    client.on("ready", async () => {
      console.log("READY");
      const debugWWebVersion = await client.getWWebVersion();
      console.log(`WWebVersion = ${debugWWebVersion}`);

      client.pupPage.on("pageerror", function (err) {
        console.log("Page error: " + err.toString());
      });
      client.pupPage.on("error", function (err) {
        console.log("Page error: " + err.toString());
      });
    });
    // // When the client received QR-Code
    // client.on("qr", (qr) => {
    //   // console.log('QR RECEIVED', qr);
    //   // QRCodeScanner(qr);
    //   qrcode.generate(qr, { small: true });

    // });

    // client.on("ready", () => {
    //   console.log("CLient is ready again for service, My King!", WhatsAppBotClient.info);
    // });
    // client.initialize();

    client.on("message", msg => {
      if (msg.body == "!ping") {
        msg.reply("pong");
      }
      MessageAnalyzer(msg);
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
