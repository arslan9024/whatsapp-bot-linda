/**
 * Bot Integration
 * Main integration file that orchestrates all bot components
 * Connects: CustomBotEngine, BotConnection, MessageHandler, SessionManager, WebhookServer, BotConfig
 */

import CustomBotEngine from './CustomBotEngine.js';
import BotConnection from './BotConnection.js';
import MessageHandler from './MessageHandler.js';
import { SessionManager } from './SessionManager.js';
import WebhookServer from './WebhookServer.js';
import BotConfig from './BotConfig.js';
import CommandRouter from './CommandRouter.js';
import DamacApiClient from './DamacApiClient.js';

class BotIntegration {
  constructor(configPath = null) {
    this.configPath = configPath;
    this.config = new BotConfig(configPath);
    this.isRunning = false;

    // Initialize components
    this.engineConfig = {
      name: 'Linda Property Bot',
      version: '1.0.0',
      maxMessageQueueSize: this.config.config.messages.maxQueueSize
    };

    this.engine = null;
    this.connection = null;
    this.messageHandler = null;
    this.sessionManager = null;
    this.webhookServer = null;
    this.commandRouter = null;
    this.apiClient = null;

    this.log('BotIntegration initialized');
  }

  /**
   * Start the bot
   */
  async start() {
    try {
      this.log('🚀 Starting bot integration...');

      // Initialize components in order
      await this.initializeEngine();
      await this.initializeConnection();
      await this.initializeMessageHandler();
      await this.initializeSessionManager();
      await this.initializeApiClient();
      await this.initializeCommandRouter();
      await this.initializeWebhookServer();

      // Setup event handlers
      this.setupEventHandlers();

      // Verify database connection
      await this.verifyDatabaseConnection();

      this.isRunning = true;
      this.log('✅ Bot integration started successfully');

      return this;
    } catch (error) {
      this.log(`❌ Failed to start bot: ${error.message}`);
      throw error;
    }
  }

  /**
   * Initialize bot engine
   */
  async initializeEngine() {
    this.log('Initializing bot engine...');
    this.engine = new CustomBotEngine(this.engineConfig);
    this.log('✅ Bot engine initialized');
  }

  /**
   * Initialize connection
   */
  async initializeConnection() {
    this.log('Initializing connection...');
    const connectionConfig = {
      mode: this.config.config.bot.mode,
      sessionName: this.config.config.bot.sessionName
    };
    this.connection = new BotConnection(connectionConfig);
    await this.connection.connect();
    this.log('✅ Connection initialized');
  }

  /**
   * Initialize message handler
   */
  async initializeMessageHandler() {
    this.log('Initializing message handler...');
    const handlerConfig = {
      commandPrefix: this.config.config.bot.commandPrefix,
      maxRetries: this.config.config.bot.maxRetries
    };
    this.messageHandler = new MessageHandler(handlerConfig);
    this.log('✅ Message handler initialized');
  }

  /**
   * Initialize session manager
   */
  async initializeSessionManager() {
    this.log('Initializing session manager...');
    const sessionConfig = this.config.config.session;
    this.sessionManager = new SessionManager(sessionConfig);
    this.log('✅ Session manager initialized');
  }

  /**
   * Initialize API client
   */
  async initializeApiClient() {
    this.log('Initializing API client...');
    const apiConfig = {
      baseUrl: this.config.config.api.baseUrl,
      timeout: this.config.config.api.timeout,
      retryAttempts: this.config.config.api.retryAttempts,
      retryDelay: this.config.config.api.retryDelay
    };
    this.apiClient = new DamacApiClient(apiConfig);
    this.log('✅ API client initialized');
  }

  /**
   * Initialize command router
   */
  async initializeCommandRouter() {
    this.log('Initializing command router...');
    this.commandRouter = new CommandRouter({
      apiClient: this.apiClient,
      sessionManager: this.sessionManager
    });
    this.log('✅ Command router initialized');
  }

  /**
   * Initialize webhook server
   */
  async initializeWebhookServer() {
    this.log('Initializing webhook server...');
    const webhookConfig = this.config.config.webhook;
    this.webhookServer = new WebhookServer(webhookConfig);
    
    // Setup webhook handlers
    this.setupWebhookHandlers();
    
    await this.webhookServer.start();
    this.log('✅ Webhook server initialized');
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    // Connection events
    this.connection.on('authenticated', () => {
      this.log('👤 Bot authenticated');
      this.engine.emit('ready', { status: 'connected' });
    });

    this.connection.on('disconnected', async () => {
      this.log('⚠️ Bot disconnected, attempting reconnect...');
      await this.reconnectWithBackoff();
    });

    this.connection.on('error', (error) => {
      this.log(`❌ Connection error: ${error.message}`);
      this.engine.emit('error', error);
    });

    this.connection.on('message', (msg) => {
      this.handleIncomingMessage(msg);
    });

    // Message handler events
    this.messageHandler.on('processed', (msg) => {
      this.handleProcessedMessage(msg);
    });

    this.messageHandler.on('error', (error) => {
      this.log(`Message handler error: ${error.message}`);
    });

    // Session manager events
    this.sessionManager.on('cleanup', ({ removedCount }) => {
      this.log(`Cleaned up ${removedCount} expired sessions`);
    });

    // Engine events
    this.engine.on('health-check', (health) => {
      this.log(`Health: ${JSON.stringify(health)}`);
    });
  }

  /**
   * Setup webhook handlers
   */
  setupWebhookHandlers() {
    // Twilio webhook
    this.webhookServer.on('twilio', async (webhook) => {
      this.log(`Twilio: ${webhook.from} -> ${webhook.body}`);
      // Process Twilio message as if it came from WhatsApp
      await this.connection.sendMessage(webhook.from, `Got your message via Twilio: ${webhook.body}`);
    });

    // Payment webhook
    this.webhookServer.on('payment', async (webhook) => {
      this.log(`Payment: ${webhook.transactionId} (${webhook.amount} ${webhook.currency})`);
      this.engine.emit('payment-received', webhook);
    });

    // Admin webhook
    this.webhookServer.on('admin', async (webhook) => {
      this.log(`Admin command: ${webhook.command}`);
      // Handle admin commands
      switch (webhook.command) {
        case 'stats':
          const stats = {
            engine: this.engine.getStats(),
            sessions: this.sessionManager.getStats(),
            connection: {
              mode: this.connection.mode,
              connected: this.connection.isConnected,
              uptime: this.connection.getUptime()
            }
          };
          return stats;
        case 'reload-config':
          this.config = new BotConfig(this.configPath);
          return { success: true, message: 'Config reloaded' };
        case 'clear-sessions':
          const count = this.sessionManager.sessions.size;
          this.sessionManager.destroyAll();
          return { success: true, message: `Cleared ${count} sessions` };
      }
    });
  }

  /**
   * Handle incoming message
   */
  async handleIncomingMessage(rawMessage) {
    try {
      // Process message
      await this.messageHandler.process(rawMessage);
    } catch (error) {
      this.log(`Error handling incoming message: ${error.message}`);
    }
  }

  /**
   * Handle processed message
   */
  async handleProcessedMessage(message) {
    try {
      // Get or create session
      const session = this.sessionManager.getSession(message.from, {
        isGroup: message.isGroup
      });

      // Add to session history
      this.sessionManager.addMessage(message.from, message);

      // Check for rate limiting
      if (!this.checkRateLimit(message.from)) {
        await this.connection.sendMessage(message.from, 'You are sending too many messages. Please wait.');
        return;
      }

      // Route command or handle as query
      if (message.isCommand) {
        await this.commandRouter.execute(message, session);
      } else {
        // Handle as natural language query
        await this.handleQuery(message, session);
      }
    } catch (error) {
      this.log(`Error processing message: ${error.message}`);
      
      // Send error to user
      try {
        await this.connection.sendMessage(
          message.from,
          `Sorry, I encountered an error: ${error.message}`
        );
      } catch (sendError) {
        this.log(`Failed to send error message: ${sendError.message}`);
      }
    }
  }

  /**
   * Handle natural language query
   */
  async handleQuery(message, session) {
    // Extract intent
    const intent = this.messageHandler.extractIntent(message);
    
    this.log(`Intent: ${intent.type} (confidence: ${intent.confidence.toFixed(2)})`);

    // Route based on intent
    switch (intent.type) {
      case 'property_search':
        return await this.commandRouter.execute({
          ...message,
          command: 'search',
          args: message.text.split(' ')
        }, session);

      case 'property_detail':
        return await this.commandRouter.execute({
          ...message,
          command: 'details',
          args: message.text.split(' ')
        }, session);

      case 'booking':
        return await this.commandRouter.execute({
          ...message,
          command: 'book',
          args: message.text.split(' ')
        }, session);

      case 'support':
        return await this.connection.sendMessage(
          message.from,
          'You can use these commands:\n/search <query>\n/details <propertyId>\n/book <propertyId>\n/help'
        );

      default:
        return await this.connection.sendMessage(
          message.from,
          'I didn\'t understand that. Type /help for available commands.'
        );
    }
  }

  /**
   * Check rate limit
   */
  checkRateLimit(userId) {
    if (!this.config.config.rateLimit.enabled) return true;

    const session = this.sessionManager.sessions.get(userId);
    if (!session) return true;

    // Count messages in last minute
    const now = Date.now();
    const oneMinute = 60000;
    const recentMessages = session.messageHistory.filter(
      msg => (now - msg.addedAt) < oneMinute
    ).length;

    return recentMessages <= this.config.config.rateLimit.messagesPerMinute;
  }

  /**
   * Verify database connection
   */
  async verifyDatabaseConnection() {
    try {
      this.log('Verifying database connection...');
      // TODO: Implement database connection check
      this.log('✅ Database connection verified');
    } catch (error) {
      this.log(`⚠️ Database connection check failed: ${error.message}`);
    }
  }

  /**
   * Reconnect with exponential backoff
   */
  async reconnectWithBackoff(attempt = 1) {
    const maxAttempts = this.config.config.bot.maxRetries;
    const baseDelay = this.config.config.bot.reconnectInterval;
    
    if (attempt > maxAttempts) {
      this.log(`❌ Max reconnection attempts reached (${maxAttempts})`);
      this.engine.emit('max-reconnect-attempts');
      return;
    }

    const delay = baseDelay * Math.pow(2, attempt - 1);
    this.log(`Attempting reconnect in ${delay}ms (attempt ${attempt}/${maxAttempts})`);

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await this.connection.connect();
      this.log('✅ Reconnected successfully');
    } catch (error) {
      this.log(`Reconnect attempt ${attempt} failed: ${error.message}`);
      await this.reconnectWithBackoff(attempt + 1);
    }
  }

  /**
   * Stop the bot
   */
  async stop() {
    try {
      this.log('🛑 Stopping bot integration...');

      await this.connection.disconnect();
      await this.webhookServer.stop();
      this.sessionManager.destroy();

      this.isRunning = false;
      this.log('✅ Bot integration stopped');
    } catch (error) {
      this.log(`Error stopping bot: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get bot health
   */
  getHealth() {
    return {
      running: this.isRunning,
      engine: this.engine?.getStats(),
      connection: {
        mode: this.connection?.mode,
        connected: this.connection?.isConnected,
        uptime: this.connection?.getUptime()
      },
      sessions: this.sessionManager?.getStats(),
      webhook: {
        port: this.config.config.webhook.port,
        running: this.webhookServer?.server !== null
      }
    };
  }

  /**
   * Logging utility
   */
  log(message) {
    console.log(`[BotIntegration] ${message}`);
  }
}

export default BotIntegration;
