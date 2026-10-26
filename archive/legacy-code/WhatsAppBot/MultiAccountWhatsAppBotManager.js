/**
 * MultiAccountWhatsAppBotManager.js
 * 
 * Manages multiple WhatsApp bot instances with unified interface
 * Supports:
 * - Arslan Malik (Primary) - +971505760056
 * - Big Broker (Secondary) - +971553633595
 * - Manager White Caves (Tertiary) - +971505110636
 * 
 * All bots use GorahaBot service account for Google Contacts
 */

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, LocalAuth } from 'whatsapp-web.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MultiAccountWhatsAppBotManager {
  constructor() {
    this.bots = new Map();
    this.config = this.loadBotsConfig();
    this.primaryBot = null;
    this.secondaryBots = new Map();
  }

  /**
   * Load bots configuration from bots-config.json
   */
  loadBotsConfig() {
    try {
      const configPath = path.join(__dirname, 'bots-config.json');
      const configData = readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error('Error loading bots configuration:', error.message);
      throw new Error('Failed to load WhatsApp bots configuration');
    }
  }

  /**
   * ✅ IMPLEMENTED: Initialize WhatsApp client for a bot
   * Creates and initializes a WhatsApp client instance for the specified bot
   * @param {Object} botConfig - Bot configuration
   * @returns {Promise<Client>} - Initialized WhatsApp client
   */
  async createWhatsAppClient(botConfig) {
    try {
      const sessionPath = path.join(__dirname, '..', '..', 'sessions', botConfig.id);
      
      const client = new Client({
        authStrategy: new LocalAuth({
          dataPath: sessionPath
        }),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      });

      // Set up event handlers
      client.on('ready', () => {
        console.log(`✅ [${botConfig.displayName}] WhatsApp client ready`);
      });

      client.on('authenticated', () => {
        console.log(`🔐 [${botConfig.displayName}] Authenticated successfully`);
      });

      client.on('auth_failure', (error) => {
        console.error(`❌ [${botConfig.displayName}] Authentication failed:`, error.message);
      });

      client.on('disconnected', (reason) => {
        console.log(`📴 [${botConfig.displayName}] Disconnected: ${reason}`);
      });

      client.on('message', (msg) => {
        console.log(`📨 [${botConfig.displayName}] Message from ${msg.from}: ${msg.body.substring(0, 50)}...`);
      });

      // Initialize the client
      await client.initialize();
      
      console.log(`🤖 [${botConfig.displayName}] WhatsApp client initialized`);
      return client;
      
    } catch (error) {
      console.error(`❌ [${botConfig.displayName}] Failed to create WhatsApp client:`, error.message);
      throw error;
    }
  }

  /**
   * Initialize all configured bots
   * @param {Object} whatsappClient - WhatsApp client factory or instance
   * @returns {Promise<Object>} - Initialization results
   */
  async initializeAllBots(whatsappClient) {
    console.log('[BotManager] Initializing WhatsApp bot accounts...');
    
    const results = {
      success: [],
      failed: [],
      pending: [],
      timestamp: new Date().toISOString()
    };

    try {
      const botsConfig = this.config.whatsappBots;

      for (const [botKey, botConfig] of Object.entries(botsConfig)) {
        try {
          if (!botConfig.enabled) {
            console.log(`⏭️ Skipping disabled bot: ${botConfig.displayName}`);
            continue;
          }

          console.log(`🤖 Initializing: ${botConfig.displayName} (${botConfig.phoneNumber})`);
          
          // Initialize bot instance
          const botInstance = {
            key: botKey,
            ...botConfig,
            client: null,
            initialized: false,
            error: null
          };

          // ✅ IMPLEMENTED: Initialize WhatsApp client for this bot
          // This connects to WhatsApp using the session path
          try {
            const client = await this.createWhatsAppClient(botConfig);
            botInstance.client = client;
            botInstance.initialized = true;
            console.log(`✅ ${botConfig.displayName} WhatsApp client ready`);
          } catch (clientError) {
            botInstance.error = clientError.message;
            console.warn(`⚠️ ${botConfig.displayName} client init failed: ${clientError.message}`);
          }
          
          this.bots.set(botKey, botInstance);

          // Set as primary if role is 'primary'
          if (botConfig.role === 'primary') {
            this.primaryBot = botInstance;
          } else {
            this.secondaryBots.set(botKey, botInstance);
          }

          results.success.push({
            name: botConfig.displayName,
            phone: botConfig.phoneNumber,
            role: botConfig.role,
            status: 'initialized'
          });

          console.log(`✅ ${botConfig.displayName} ready`);

        } catch (botError) {
          console.error(`❌ Failed to initialize ${botConfig.displayName}:`, botError.message);
          results.failed.push({
            name: botConfig.displayName,
            phone: botConfig.phoneNumber,
            error: botError.message
          });
        }
      }

      console.log(`\n📊 Bot Manager Status:`);
      console.log(`   ✅ Active: ${results.success.length}`);
      console.log(`   ❌ Failed: ${results.failed.length}`);
      console.log(`   ⏳ Pending: ${results.pending.length}`);

      return results;

    } catch (error) {
      console.error('Critical error initializing bots:', error.message);
      throw error;
    }
  }

  /**
   * Get primary bot instance
   * @returns {Object} - Primary bot config
   */
  getPrimaryBot() {
    return this.primaryBot || this.config.primaryAccount;
  }

  /**
   * Get all secondary bots
   * @returns {Map} - Secondary bots
   */
  getSecondaryBots() {
    return this.secondaryBots;
  }

  /**
   * Get bot by phone number
   * @param {string} phoneNumber - Bot phone number
   * @returns {Object} - Bot configuration
   */
  getBotByPhone(phoneNumber) {
    for (const [key, botConfig] of this.bots.entries()) {
      if (botConfig.phoneNumber === phoneNumber) {
        return botConfig;
      }
    }
    return null;
  }

  /**
   * Get bot by ID/key
   * @param {string} botId - Bot ID or key
   * @returns {Object} - Bot configuration
   */
  getBotById(botId) {
    return this.bots.get(botId) || this.config.whatsappBots[botId];
  }

  /**
   * Get all active bots
   * @returns {Array} - Array of active bot configurations
   */
  getActiveBots() {
    const active = [];
    for (const [key, botConfig] of Object.entries(this.config.whatsappBots)) {
      if (botConfig.enabled) {
        active.push(botConfig);
      }
    }
    return active;
  }

  /**
   * ✅ IMPLEMENTED: Send message from specific bot
   * @param {string} botId - Bot ID or phone number
   * @param {string} chatId - Target chat ID
   * @param {string} message - Message text
   * @returns {Promise<Object>} - Send result
   */
  async sendMessageFromBot(botId, chatId, message) {
    const bot = this.bots.get(botId) || this.getBotByPhone(botId);
    
    if (!bot) {
      throw new Error(`Bot not found: ${botId}`);
    }

    if (!bot.enabled) {
      throw new Error(`Bot is disabled: ${bot.displayName}`);
    }

    if (!bot.client) {
      throw new Error(`Bot client not initialized: ${bot.displayName}`);
    }

    try {
      console.log(`📨 [${bot.displayName}] Sending to ${chatId}...`);
      
      // ✅ IMPLEMENTED: Actual message sending using bot client
      const sentMessage = await bot.client.sendMessage(chatId, message);
      
      console.log(`✅ [${bot.displayName}] Message sent successfully`);
      
      return {
        success: true,
        messageId: sentMessage.id._serialized,
        botName: bot.displayName,
        botPhone: bot.phoneNumber,
        targetChat: chatId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error sending message from ${bot.displayName}:`, error);
      throw error;
    }
  }

  /**
   * ✅ IMPLEMENTED: Send message with media from specific bot
   * @param {string} botId - Bot ID or phone number
   * @param {string} chatId - Target chat ID
   * @param {string|MessageMedia} media - Media file path or MessageMedia object
   * @param {string} caption - Optional caption
   * @returns {Promise<Object>} - Send result
   */
  async sendMediaFromBot(botId, chatId, media, caption = null) {
    const bot = this.bots.get(botId) || this.getBotByPhone(botId);
    
    if (!bot) {
      throw new Error(`Bot not found: ${botId}`);
    }

    if (!bot.client) {
      throw new Error(`Bot client not initialized: ${bot.displayName}`);
    }

    try {
      console.log(`📨 [${bot.displayName}] Sending media to ${chatId}...`);
      
      const options = caption ? { caption } : {};
      const sentMessage = await bot.client.sendMessage(chatId, media, options);
      
      return {
        success: true,
        messageId: sentMessage.id._serialized,
        botName: bot.displayName,
        botPhone: bot.phoneNumber,
        targetChat: chatId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error sending media from ${bot.displayName}:`, error);
      throw error;
    }
  }

  /**
   * ✅ IMPLEMENTED: Send location from specific bot
   * @param {string} botId - Bot ID or phone number
   * @param {string} chatId - Target chat ID
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {string} title - Optional title
   * @returns {Promise<Object>} - Send result
   */
  async sendLocationFromBot(botId, chatId, latitude, longitude, title = null) {
    const bot = this.bots.get(botId) || this.getBotByPhone(botId);
    
    if (!bot) {
      throw new Error(`Bot not found: ${botId}`);
    }

    if (!bot.client) {
      throw new Error(`Bot client not initialized: ${bot.displayName}`);
    }

    try {
      console.log(`📍 [${bot.displayName}] Sending location to ${chatId}...`);
      
      const options = title ? { title } : {};
      const sentMessage = await bot.client.sendLocation(chatId, latitude, longitude, options);
      
      return {
        success: true,
        messageId: sentMessage.id._serialized,
        botName: bot.displayName,
        botPhone: bot.phoneNumber,
        targetChat: chatId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error sending location from ${bot.displayName}:`, error);
      throw error;
    }
  }

  /**
   * Broadcast message to all active bots
   * @param {string} chatId - Target chat ID
   * @param {string} message - Message text
   * @returns {Promise<Array>} - Results from all bots
   */
  async broadcastFromAllBots(chatId, message) {
    const results = [];
    
    for (const bot of this.getActiveBots()) {
      try {
        const result = await this.sendMessageFromBot(bot.id, chatId, message);
        results.push({
          ...result,
          status: 'success'
        });
      } catch (error) {
        results.push({
          botName: bot.displayName,
          botPhone: bot.phoneNumber,
          status: 'failed',
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get statistics for all bots
   * @returns {Object} - Statistics
   */
  getStatistics() {
    const activeBots = this.getActiveBots();
    const botsConfig = this.config.whatsappBots;

    return {
      totalBots: Object.keys(botsConfig).length,
      activeBots: activeBots.length,
      disabledBots: Object.keys(botsConfig).length - activeBots.length,
      bots: activeBots.map(bot => ({
        name: bot.displayName,
        phone: bot.phoneNumber,
        role: bot.role,
        enabled: bot.enabled,
        status: bot.status,
        googleAccount: bot.googleAccount,
        features: Object.keys(bot.features).filter(f => bot.features[f])
      })),
      lastModified: this.config.metadata.lastModified,
      configuration: {
        defaultBot: this.config.default,
        primaryBot: this.config.primaryAccount,
        multiAccountSupported: true,
        googleContactsSync: 'GorahaBot'
      }
    };
  }

  /**
   * Enable/disable a bot
   * @param {string} botId - Bot ID
   * @param {boolean} enable - Enable or disable
   */
  toggleBot(botId, enable) {
    const botConfig = this.config.whatsappBots[botId];
    if (botConfig) {
      botConfig.enabled = enable;
      console.log(`[BotManager] ${botConfig.displayName} ${enable ? 'enabled' : 'disabled'}`);
      return true;
    }
    return false;
  }

  /**
   * Disconnect a specific bot
   * @param {string} botId - Bot ID
   */
  async disconnectBot(botId) {
    const bot = this.bots.get(botId);
    if (bot && bot.client) {
      await bot.client.destroy();
      bot.client = null;
      bot.initialized = false;
      console.log(`[BotManager] ${bot.displayName} disconnected`);
    }
  }

  /**
   * Disconnect all bots
   */
  async disconnectAll() {
    for (const [botId, bot] of this.bots.entries()) {
      if (bot.client) {
        await bot.client.destroy();
        bot.client = null;
      }
    }
    this.bots.clear();
    console.log('[BotManager] All bots disconnected');
  }

  /**
   * Get bot configuration summary
   */
  getSummary() {
    return {
      manager: 'MultiAccountWhatsAppBotManager',
      format: this.config.format,
      version: this.config.version,
      accounts: this.getStatistics(),
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export default new MultiAccountWhatsAppBotManager();
