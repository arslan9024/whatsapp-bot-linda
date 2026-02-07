import qrcode from "qrcode-terminal";
import { MessageAnalyzer } from "./MessageAnalyzer.js";

export const WhatsAppClientFunctions = (client, number, PCE) => {

  try {
    // client initialize does not finish at ready now.
    client.initialize();
    
    let pairingCodeRequested = false;
    let qrDisplayed = false;
    
    client.on("loading_screen", (percent, message) => {
      console.log("📊 LOADING:", percent + "%", message);
    });
    
    client.on('qr', async (qr) => {
      if (!qrDisplayed) {
        qrDisplayed = true;
        console.clear();
        console.log("\n╔════════════════════════════════════════════════════════════╗");
        console.log("║       🚀 WhatsApp Bot - Quick Link Setup                   ║");
        console.log("╚════════════════════════════════════════════════════════════╝\n");
        
        console.log("📱 SCAN QR CODE WITH YOUR PHONE:\n");
        console.log("Follow these steps:");
        console.log("  1️⃣  Open WhatsApp on your phone");
        console.log("  2️⃣  Go to: Settings → Linked Devices");
        console.log("  3️⃣  Tap: Link a Device");
        console.log("  4️⃣  Scan the code below:\n");
        
        // Display the QR code
        qrcode.generate(qr, { small: true });
        
        console.log(`\n${number} - Waiting for scan...\n`);
      }
    });

    client.on("authenticated", () => {
      console.clear();
      console.log("\n✅ ✅ ✅ AUTHENTICATED SUCCESSFULLY! ✅ ✅ ✅\n");
      console.log(`📱 Bot ID: ${number}`);
      console.log("Status: Connected to WhatsApp\n");
    });

    client.on("auth_failure", msg => {
      // Fired if session restore was unsuccessful
      console.error("\n❌ AUTHENTICATION FAILURE:", msg);
      console.error("Please try scanning the QR code again.\n");
    });

    // When the client is ready, run this code (only once)
    client.once("ready", () => {
      console.clear();
      console.log("\n╔════════════════════════════════════════════════════════════╗");
      console.log("║                  🤖 BOT IS READY TO SERVE!                 ║");
      console.log("╚════════════════════════════════════════════════════════════╝\n");
      console.log(`✅ Bot ID: ${number}`);
      console.log("✅ Status: Connected & Authenticated");
      console.log("✅ Listening for incoming messages...\n");
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
