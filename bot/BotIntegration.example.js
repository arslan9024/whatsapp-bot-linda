/**
 * WhatsApp Bot Integration Example
 * Shows how to integrate DamacApiClient with your WhatsApp bot
 */

import CommandRouter from './CommandRouter.js';

/**
 * Example: Using with WhatsApp Bot Library (e.g., whatsapp-web.js)
 */
class BotIntegration {
  constructor() {
    this.router = new CommandRouter('http://localhost:3000/api');
  }

  /**
   * Handle incoming WhatsApp messages
   * This is an example - adapt to your bot framework
   */
  async handleMessage(message) {
    // Ignore messages from bot itself
    if (message.from === message.to) return;

    // Get message text
    const text = message.body?.trim() || '';
    if (!text) return;

    console.log(`[Bot] Received from ${message.from}: ${text}`);

    try {
      // Route command to handler
      const response = await this.router.route(text);

      // Send response
      await this.sendMessage(message.from, response);
    } catch (error) {
      console.error('[Bot] Error:', error);
      await this.sendMessage(message.from, `❌ Error: ${error.message}`);
    }
  }

  /**
   * Send response message
   * Adapt this to your bot framework
   */
  async sendMessage(userId, text) {
    // Example implementation
    console.log(`[Bot] Sending to ${userId}:`);
    console.log(text);
    // In real implementation: await client.sendMessage(userId, { body: text });
  }
}

/**
 * Example Bot Setup (pseudocode)
 */
export default async function initializeBot(client) {
  const botIntegration = new BotIntegration();

  // Listen for messages
  client.on('message', async (message) => {
    await botIntegration.handleMessage(message);
  });

  console.log('🤖 Bot initialized and ready for commands');
  console.log('📱 Type /help for available commands');

  return botIntegration;
}

/**
 * Example Usage with Different Bot Libraries
 */

/*
// ==================== whatsapp-web.js Example ====================
import { Client, LocalAuth } from 'whatsapp-web.js';
import initializeBot from './BotIntegration.js';

const client = new Client({ authStrategy: new LocalAuth() });

client.on('ready', async () => {
  console.log('✅ WhatsApp Bot Ready');
  await initializeBot(client);
});

client.on('message', async (message) => {
  const botIntegration = new BotIntegration();
  await botIntegration.handleMessage(message);
});

client.initialize();

// ==================== Baileys Example ====================
import makeWASocket, { DisconnectReason } from '@whiskeysockets/baileys';

const sock = makeWASocket.default();

sock.ev.on('messages.upsert', async (m) => {
  const message = m.messages[0];
  if (!message.message) return;

  const text = message.message.conversation || '';
  const botIntegration = new BotIntegration();
  const response = await botIntegration.router.route(text);

  await sock.sendMessage(message.key.remoteJid, { text: response });
});

// ==================== Twilio Botpress Example ====================
import send from './api';

bot.hear(/^\//, async (message, next) => {
  const botIntegration = new BotIntegration();
  const response = await botIntegration.router.route(message.text);
  await message.reply(response);
});

////==================== Direct API Call Example ====================
import CommandRouter from './CommandRouter.js';

const router = new CommandRouter('http://localhost:3000/api');

// Simulate bot commands
async function simulateBotCommands() {
  const commands = [
    '/property list',
    '/property available',
    '/tenancy active',
    '/buying inquiries',
    '/status',
    '/help'
  ];

  for (const command of commands) {
    console.log(`\n📱 Bot Command: ${command}`);
    const response = await router.route(command);
    console.log(response);
  }
}

simulateBotCommands().catch(console.error);
*/
