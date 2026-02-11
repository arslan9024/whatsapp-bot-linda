import pkg from "whatsapp-web.js";
import { CreatingNewWhatsAppClient } from "./code/WhatsAppBot/CreatingNewWhatsAppClient.js";

const { Client, LocalAuth } = pkg;

console.log("🔍 Testing WhatsApp Client Creation with Chrome Configuration...\n");

// Set Chrome path
process.env.PUPPETEER_EXECUTABLE_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
process.env.PUPPETEER_SKIP_DOWNLOAD = 'true';

console.log("📋 Environment Variables:");
console.log("  PUPPETEER_EXECUTABLE_PATH:", process.env.PUPPETEER_EXECUTABLE_PATH);
console.log("  PUPPETEER_SKIP_DOWNLOAD:", process.env.PUPPETEER_SKIP_DOWNLOAD);
console.log("");

async function testClientCreation() {
  try {
    console.log("🟡 Creating WhatsApp client...");
    const client = await CreatingNewWhatsAppClient("test-account");
    
    console.log("✅ Client created successfully!");
    console.log("🟡 Adding ready listener...");
    
    client.on("ready", () => {
      console.log("✅ Client is ready!");
      process.exit(0);
    });
    
    client.on("qr", (qr) => {
      console.log("✅ QR code received!");
    });
    
    client.on("auth_failure", (error) => {
      console.log("❌ Auth failure:", error.message);
      process.exit(1);
    });
    
    client.on("disconnected", (reason) => {
      console.log("❌ Disconnected:", reason);
      process.exit(1);
    });
    
    console.log("🟡 Initializing client...");
    await client.initialize();
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

// Timeout after 30 seconds
setTimeout(() => {
  console.log("⏱️  Timeout - exiting");
  process.exit(0);
}, 30000);

testClientCreation();
