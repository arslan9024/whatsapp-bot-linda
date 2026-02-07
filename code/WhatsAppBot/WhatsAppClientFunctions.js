import qrcode from "qrcode-terminal";
import { MessageAnalyzer } from "./MessageAnalyzer.js";
import { displayCode, displayQRInstructions, closeInterface } from "../utils/interactiveSetup.js";
import { displayFeatureStatus } from "../utils/featureStatus.js";

export const WhatsAppClientFunctions = (client, number, authMethod, sessionStatus) => {

  try {
    // client initialize does not finish at ready now.
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
      console.clear();
      console.log("\n✅ ✅ ✅ AUTHENTICATED SUCCESSFULLY! ✅ ✅ ✅\n");
      console.log(`📱 Bot ID: ${number}`);
      console.log("Status: Connected to WhatsApp");
      console.log("Session: Saved in /sessions folder\n");
    });

    client.on("auth_failure", msg => {
      // Fired if session restore was unsuccessful
      console.error("\n❌ AUTHENTICATION FAILURE:", msg);
      console.error("Please try again with the QR code or pairing code.\n");
    });

    // When the client is ready, run this code (only once)
    client.once("ready", () => {
      console.clear();
      console.log("\n╔════════════════════════════════════════════════════════════╗");
      console.log("║               🤖 BOT IS READY TO SERVE!                   ║");
      console.log("╚════════════════════════════════════════════════════════════╝\n");
      console.log(`✅ Master Account: ${number}`);
      console.log("✅ Status: Connected & Authenticated");
      console.log("✅ Session: Stored & Persistent");
      console.log("✅ Listening for incoming messages...\n");
      
      // Display connected features
      displayFeatureStatus(number);
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

  } catch (error) {
    console.log(error);
  }





};
