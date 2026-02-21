/**
 * Custom Hybrid WhatsApp Bot Engine
 * Combines best features from whatsapp-web.js, Baileys, and Twilio
 * 
 * Features:
 * - Browser automation (whatsapp-web.js) OR WebSocket (Baileys)
 * - Cloud webhook support (Twilio-style)
 * - Session persistence
 * - Automatic retry & reconnection
 * - Message queuing
 * - Event-driven architecture
 * 
 * Usage:
 * const bot = new CustomBotEngine({ mode: 'hybrid' });
 * await bot.connect();
 * bot.on('message', handler);
 */

import EventEmitter from 'events';
import SessionManager from './SessionManager.js';
import MessageHandler from './MessageHandler.js';
import BotConnection from './BotConnection.js';
import CommandRouter from './CommandRouter.js';

class CustomBotEngine extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = {
      mode: options.mode || 'hybrid', // 'browser', 'websocket', or 'hybrid'
      apiUrl: options.apiUrl || process.env.API_URL || 'http://localhost:3000/api',
      sessionDir: options.sessionDir || './sessions',
      webhookPort: options.webhookPort || 3001,
      reconnectInterval: options.reconnectInterval || 5000,
      maxReconnectAttempts: options.maxReconnectAttempts || 10,
      messageQueueSize: options.messageQueueSize || 100,
      logLevel: options.logLevel || 'info',
      autoStart: options.autoStart !== false, // Default true
      enableWebhook: options.enableWebhook || false,
      webhookUrl: options.webhookUrl || null,
    };

    // Initialize components
    this.sessionManager = new SessionManager(this.config.sessionDir);
    this.commandRouter = new CommandRouter(this.config.apiUrl);
    this.messageHandler = new MessageHandler(this.commandRouter, {
      logLevel: this.config.logLevel
    });

    // Connection manager
    this.connection = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;

    // Message queue for offline handling
    this.messageQueue = [];
    this.maxQueueSize = this.config.messageQueueSize;

    // Event listeners
    this.setupEventHandlers();

    // Auto-start if configured
    if (this.config.autoStart) {
      setTimeout(() => this.connect(), 1000);
    }
  }

  /**
   * Setup internal event handlers
   */
  setupEventHandlers() {
    this.on('authenticated', () => {
      this.log('✅ Bot authenticated successfully');
      this.reconnectAttempts = 0;
      this.flushMessageQueue();
    });

    this.on('disconnected', () => {
      this.log('⚠️ Bot disconnected, attempting reconnection...', 'warn');
      this.scheduleReconnection();
    });

    this.on('error', (error) => {
      this.log(`❌ Bot error: ${error.message}`, 'error');
    });
  }

  /**
   * Connect bot using configured mode
   */
  async connect() {
    try {
      this.log('🔄 Connecting bot...');

      // Create connection based on mode
      this.connection = new BotConnection(this.config);

      // Listen for connection events
      this.connection.on('authenticated', () => this.emit('authenticated'));
      this.connection.on('disconnected', () => this.emit('disconnected'));
      this.connection.on('error', (err) => this.emit('error', err));
      this.connection.on('message', (msg) => this.handleIncomingMessage(msg));
      this.connection.on('qr', (qr) => this.emit('qr', qr)); // For browser mode

      // Connect
      await this.connection.connect();
      this.isConnected = true;
      this.log('✅ Bot connected successfully');

    } catch (error) {
      this.log(`❌ Connection failed: ${error.message}`, 'error');
      this.emit('error', error);
      this.scheduleReconnection();
    }
  }

  /**
   * Handle incoming messages
   */
  async handleIncomingMessage(message) {
    try {
      // Parse message
      const parsedMessage = {
        from: message.from,
        to: message.to || message.author,
        text: message.body || message.text || '',
        timestamp: message.timestamp || Date.now(),
        isGroup: message.isGroup || false,
        groupId: message.groupId || null,
        raw: message
      };

      // Emit raw message event
      this.emit('message', parsedMessage);

      // Process if starts with command
      if (parsedMessage.text.startsWith('/')) {
        await this.handleCommand(parsedMessage);
      }

    } catch (error) {
      this.log(`Error processing message: ${error.message}`, 'error');
    }
  }

  /**
   * Handle command messages
   */
  async handleCommand(message) {
    try {
      this.log(`📨 Command from ${message.from}: ${message.text}`);

      // Route command through CommandRouter
      const response = await this.messageHandler.processMessage(message.text);

      // Send response
      await this.sendMessage(message.from, response);

    } catch (error) {
      this.log(`Command error: ${error.message}`, 'error');
      await this.sendMessage(message.from, `❌ Error: ${error.message}`);
    }
  }

  /**
   * Send message
   */
  async sendMessage(chatId, text, options = {}) {
    try {
      if (!this.isConnected) {
        this.log('🔴 Bot offline, queueing message', 'warn');
        this.queueMessage(chatId, text, options);
        return false;
      }

      // Send through connection
      const result = await this.connection.sendMessage(chatId, text, options);
      this.log(`✅ Message sent to ${chatId}`);
      return result;

    } catch (error) {
      this.log(`Send error: ${error.message}`, 'error');
      this.queueMessage(chatId, text, options);
      return false;
    }
  }

  /**
   * Queue message for offline delivery
   */
  queueMessage(chatId, text, options) {
    if (this.messageQueue.length < this.maxQueueSize) {
      this.messageQueue.push({
        chatId,
        text,
        options,
        timestamp: Date.now()
      });
      this.log(`📦 Queued message (${this.messageQueue.length}/${this.maxQueueSize})`);
    } else {
      this.log('❌ Message queue full, message dropped', 'error');
    }
  }

  /**
   * Flush queued messages on reconnection
   */
  async flushMessageQueue() {
    if (this.messageQueue.length === 0) return;

    this.log(`💾 Flushing ${this.messageQueue.length} queued messages...`);

    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      try {
        await this.sendMessage(msg.chatId, msg.text, msg.options);
        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
      } catch (error) {
        this.log(`Failed to flush message: ${error.message}`, 'warn');
        this.messageQueue.unshift(msg); // Put back if failed
        break;
      }
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnection() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log('❌ Max reconnection attempts reached', 'error');
      this.emit('maxReconnectAttemptsExceeded');
      return;
    }

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      60000 // Max 1 minute
    );

    this.reconnectAttempts++;
    this.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    setTimeout(() => this.connect(), delay);
  }

  /**
   * Disconnect bot gracefully
   */
  async disconnect() {
    try {
      this.log('🛑 Disconnecting bot...');
      if (this.connection) {
        await this.connection.disconnect();
      }
      this.isConnected = false;
      this.emit('disconnected');
      this.log('✅ Bot disconnected');
    } catch (error) {
      this.log(`Disconnect error: ${error.message}`, 'error');
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      mode: this.config.mode,
      queuedMessages: this.messageQueue.length,
      reconnectAttempts: this.reconnectAttempts,
      uptime: this.connection?.getUptime?.() || 0
    };
  }

  /**
   * Logging utility
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };

    if (logLevels[level] >= logLevels[this.config.logLevel]) {
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    }

    // Emit log event for external handlers
    this.emit('log', { timestamp, level, message });
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      // Check API connection
      const apiHealthy = await this.commandRouter.api.healthCheck();

      // Check bot connection
      const botHealthy = this.isConnected;

      // Check message queue
      const queueHealthy = this.messageQueue.length < (this.maxQueueSize * 0.9);

      return {
        healthy: apiHealthy && botHealthy && queueHealthy,
        api: apiHealthy,
        bot: botHealthy,
        queue: queueHealthy,
        status: this.getStatus()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        status: this.getStatus()
      };
    }
  }
}

export default CustomBotEngine;
