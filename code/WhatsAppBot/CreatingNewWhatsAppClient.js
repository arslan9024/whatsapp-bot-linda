import pkg from "whatsapp-web.js";
const { LocalAuth, Client } = pkg;

export async function CreatingNewWhatsAppClient(ClientID) {
  let RegisteredAgentWAClient;

  if (!ClientID) {
    throw new Error("Client ID is not defined - cannot register agent");
  }

  console.log(`🔧 Creating WhatsApp client for: ${ClientID}`);

  try {
    RegisteredAgentWAClient = new Client({
      authStrategy: new LocalAuth({
        clientId: `${ClientID}`,
        dataPath: "sessions"
      }),
      restartOnAuthFail: true,
      // Local development - headless mode for VSCode terminal only
      headless: true,
      seleniumOpts: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-gpu",
          "--single-process",
          "--disable-dev-shm-usage"
        ]
      },
      webVersionCache: {
        type: "remote",
        remotePath:
          "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html"
      }
    });

    console.log(`✅ WhatsApp client created successfully for: ${ClientID}`);
    return RegisteredAgentWAClient;
  } catch (error) {
    console.error(`❌ Error creating WhatsApp client: ${error.message}`);
    throw error;
  }
}
