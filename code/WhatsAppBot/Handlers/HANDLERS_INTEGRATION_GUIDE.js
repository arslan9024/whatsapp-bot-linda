/**
 * Linda WhatsApp Bot - M2 Module 1 Integration Guide
 * All Handlers Integration and Usage Documentation
 * 
 * Created: February 26, 2026
 * Phase: 6 M2 Module 1
 * 
 * This guide provides comprehensive instructions for integrating all 7 new handlers
 * into the Linda WhatsApp Bot ecosystem.
 */

const logger = require('../Integration/Google/utils/logger');

/**
 * HANDLERS OVERVIEW
 * =================
 * 
 * 1. AdvancedMediaHandler.js (Previously created)
 *    - Handles media uploads (photos, videos, documents, audio)
 *    - Media validation and compression
 *    - Streaming and chunking for large files
 *    - Media caching and optimization
 * 
 * 2. GroupChatManager.js (Previously created)
 *    - Create and manage WhatsApp groups
 *    - Add/remove participants
 *    - Handle group permissions and settings
 *    - Broadcast list management
 * 
 * 3. MessageTemplateEngine.js
 *    - Template creation and management
 *    - Variable substitution
 *    - Conditional rendering
 *    - Batch template rendering
 *    - Template analytics and usage tracking
 * 
 * 4. MessageBatchProcessor.js
 *    - Queue and batch message sending
 *    - Rate limiting and throttling
 *    - Retry logic with exponential backoff
 *    - Progress tracking and metrics
 *    - Concurrent batch processing
 * 
 * 5. ConversationIntelligenceEngine.js
 *    - Analyze conversations for sentiment and topics
 *    - Intent recognition
 *    - Pattern identification
 *    - User learning and feedback incorporation
 *    - Conversation insights and analytics
 * 
 * 6. CommandExecutor.js
 *    - Parse and execute Linda commands
 *    - WhatsApp: /whatsapp list, add, switch, send
 *    - Contacts: /contacts sync, list, add, update, search
 *    - Sheets: /sheets list, create, append, query
 *    - Learning: /learn add, list, feedback, insights
 *    - Help and status commands
 * 
 * 7. WhatsAppMultiAccountManager.js (NEW - Multi-Account Support)
 *    - Add/remove multiple WhatsApp accounts
 *    - Master and secondary account management
 *    - Dynamic account switching
 *    - Routing and load balancing
 *    - Device linking management
 *    - Account health metrics
 */

class LindaHandlerIntegration {
  constructor() {
    this.handlers = {};
    this.initialized = false;
  }

  /**
   * STEP 1: INITIALIZE ALL HANDLERS
   * 
   * Required services that need to be passed to handlers:
   * - whatsappClient: WhatsApp Web client
   * - mongoConnection: MongoDB connection for persistence
   * - googleAuth: Google APIs authentication
   * - logger: Logging service
   * 
   * Timeline: Each handler takes 100-500ms to initialize
   */
  async initializeAllHandlers(services) {
    try {
      console.log('🚀 Initializing Linda Handler Integration...');
      const startTime = Date.now();

      // Initialize Multi-Account Manager FIRST (foundation)
      this.handlers.accountManager = new (require('./WhatsAppMultiAccountManager'))({
        maxSecondaryAccounts: 5,
        loadBalancingStrategy: 'round-robin',
        failoverEnabled: true
      });
      await this.handlers.accountManager.initialize();
      console.log('✅ WhatsApp Multi-Account Manager initialized');

      // Initialize Media Handler
      this.handlers.mediaHandler = new (require('./AdvancedMediaHandler'))({
        maxFileSize: 50 * 1024 * 1024,
        supportedFormats: ['jpg', 'png', 'pdf', 'docx', 'mp3', 'mp4']
      });
      await this.handlers.mediaHandler.initialize();
      console.log('✅ Advanced Media Handler initialized');

      // Initialize Group Chat Manager
      this.handlers.groupManager = new (require('./GroupChatManager'))({
        maxGroupParticipants: 250,
        defaultMessageExpiration: 0
      });
      await this.handlers.groupManager.initialize();
      console.log('✅ Group Chat Manager initialized');

      // Initialize Message Templates
      this.handlers.templateEngine = new (require('./MessageTemplateEngine'))({
        defaultLocale: 'en-US'
      });
      await this.handlers.templateEngine.initialize();
      console.log('✅ Message Template Engine initialized');

      // Initialize Message Batch Processor
      this.handlers.batchProcessor = new (require('./MessageBatchProcessor'))({
        maxConcurrentBatches: 3,
        maxMessagesPerBatch: 100,
        rateLimit: { messagesPerSecond: 10 }
      });
      await this.handlers.batchProcessor.initialize();
      console.log('✅ Message Batch Processor initialized');

      // Initialize Conversation Intelligence
      this.handlers.intelligenceEngine = new (require('./ConversationIntelligenceEngine'))({
        learningEnabled: true,
        minContextWords: 3
      });
      await this.handlers.intelligenceEngine.initialize();
      console.log('✅ Conversation Intelligence Engine initialized');

      // Initialize Command Executor LAST (depends on others)
      this.handlers.commandExecutor = new (require('./CommandExecutor'))({
        whatsappService: this.handlers.accountManager,
        contactsService: services.contactsService,
        sheetsService: services.sheetsService,
        conversationEngine: this.handlers.intelligenceEngine
      });
      await this.handlers.commandExecutor.initialize();
      console.log('✅ Command Executor initialized');

      const duration = Date.now() - startTime;
      this.initialized = true;

      console.log(`\n✨ All handlers initialized successfully in ${duration}ms\n`);

      return {
        success: true,
        handlersCount: Object.keys(this.handlers).length,
        duration
      };
    } catch (error) {
      logger.error('Failed to initialize handlers', { error: error.message });
      throw error;
    }
  }

  /**
   * STEP 2: HANDLER INITIALIZATION DEPENDENCY GRAPH
   * 
   * ┌─────────────────────────────────────────┐
   * │  Services Layer                          │
   * │  - MongoDB, Google APIs, WhatsApp Web   │
   * └──────────────────┬──────────────────────┘
   *                    │
   *                    ▼
   * ┌─────────────────────────────────────────┐
   * │  Multi-Account Manager (FOUNDATION)      │
   * │  - Manages account lifecycle            │
   * └──────────────────┬──────────────────────┘
   *                    │
   *        ┌───────────┼───────────┬──────────────────┐
   *        ▼           ▼           ▼                  ▼
   *  Media Handler  Group Mgr  Templates        Batch Processor
   *  (media)        (groups)   (messages)       (queue/rate limit)
   *        │           │           │                  │
   *        └───────────┼───────────┴──────────────────┘
   *                    │
   *                    ▼
   *  ┌──────────────────────────────────────┐
   *  │  Conversation Intelligence Engine    │
   *  │  - Analyzes all conversations       │
   *  └──────────────────┬───────────────────┘
   *                    │
   *                    ▼
   *  ┌──────────────────────────────────────┐
   *  │  Command Executor (ORCHESTRATOR)     │
   *  │  - Routes all user commands         │
   *  └──────────────────────────────────────┘
   */

  /**
   * STEP 3: HANDLER USAGE PATTERNS
   */

  // Pattern 1: Send a message via Linda command
  async sendMessageViaCommand(userId, input) {
    return await this.handlers.commandExecutor.executeCommand(userId, input);
  }

  // Pattern 2: Send templated messages to batch
  async sendBatchTemplateMessages(templateId, recipients) {
    // 1. Create batch
    const batch = this.handlers.batchProcessor.createBatch({
      name: `Template_${templateId}_${Date.now()}`,
      priority: 'normal'
    });

    // 2. Render templates for all recipients
    const messages = await this.handlers.templateEngine.renderBatchTemplates(
      templateId,
      recipients
    );

    // 3. Add to batch processor
    this.handlers.batchProcessor.addMessagesToBatch(batch.batchId, messages.messages);

    // 4. Process batch with sending logic
    return await this.handlers.batchProcessor.processBatch(
      batch.batchId,
      async (message) => {
        // Get routing account for this contact
        const account = this.handlers.accountManager.getRoutingAccount(message.recipientId);
        // Send via account
        return await this.sendWhatsAppMessage(account.id, message.recipientNumber, message.content);
      }
    );
  }

  // Pattern 3: Analyze conversation and learn
  async analyzeAndLearnConversation(conversationId, conversationMessages) {
    // 1. Analyze conversation
    const analysis = await this.handlers.intelligenceEngine.analyzeConversation(
      conversationId,
      conversationMessages
    );

    // 2. Extract insights
    const insights = analysis.analysis;

    // 3. Process feedback if user provides it
    if (insights.sentiment.negative > 0.5) {
      // Log for review
      logger.warn('Negative sentiment detected - flagging for review', {
        conversationId,
        sentiment: insights.sentiment.overall
      });
    }

    return insights;
  }

  // Pattern 4: Manage multiple WhatsApp accounts
  async setupMultipleAccounts(accountsConfig) {
    const results = [];

    for (const config of accountsConfig) {
      const result = await this.handlers.accountManager.addAccount(config);
      results.push(result);
    }

    return results;
  }

  // Pattern 5: Handle media in messages
  async sendMediaMessage(accountId, recipients, mediaPath, caption) {
    // 1. Validate and process media
    const mediaData = await this.handlers.mediaHandler.processMedia(mediaPath);

    // 2. For each recipient, route to appropriate account
    for (const recipient of recipients) {
      const routingAccount = this.handlers.accountManager.getRoutingAccount(recipient.id);
      
      // 3. Send media
      await this.sendWhatsAppMedia(
        routingAccount.id,
        recipient.number,
        mediaData,
        caption
      );
    }
  }

  // Pattern 6: Create and manage groups
  async createAndBroadcastToGroup(groupData, message, mediaPath) {
    // 1. Create group
    const group = await this.handlers.groupManager.createGroup(groupData);

    // 2. Get master account for broadcasting
    const masterAccount = this.handlers.accountManager.getMasterAccount();

    // 3. Render template message
    const rendered = this.handlers.templateEngine.renderTemplate(
      'broadcast_message',
      { groupName: group.name, timestamp: new Date().toISOString() }
    );

    // 4. Send to group with media if provided
    if (mediaPath) {
      await this.sendWhatsAppMedia(
        masterAccount.id,
        group.id,
        mediaPath,
        rendered.content
      );
    } else {
      await this.sendWhatsAppMessage(masterAccount.id, group.id, rendered.content);
    }
  }

  /**
   * STEP 4: HANDLER STATISTICS AND MONITORING
   */
  getHandlerStats() {
    return {
      accountManager: this.handlers.accountManager?.getStatistics(),
      mediaHandler: this.handlers.mediaHandler?.getEngineStats(),
      groupManager: this.handlers.groupManager?.getEngineStats(),
      templateEngine: this.handlers.templateEngine?.getEngineStats(),
      batchProcessor: this.handlers.batchProcessor?.getEngineStats(),
      intelligenceEngine: this.handlers.intelligenceEngine?.getEngineStats(),
      commandExecutor: this.handlers.commandExecutor?.getStats(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * STEP 5: ERROR HANDLING AND RECOVERY
   */
  async handleHandlerError(handlerName, error) {
    logger.error(`Error in ${handlerName}`, { error: error.message });

    // Implement fallback strategies
    switch (handlerName) {
      case 'accountManager':
        // Fallback to master account
        return { fallback: 'master_account' };

      case 'batchProcessor':
        // Retry with exponential backoff
        return { fallback: 'retry_with_backoff' };

      case 'intelligenceEngine':
        // Continue without analysis
        return { fallback: 'skip_analysis' };

      default:
        return { fallback: 'none' };
    }
  }

  /**
   * STEP 6: INTEGRATION CHECKLIST
   * 
   * Before deploying to production, ensure:
   * 
   * ✓ All 7 handlers initialized successfully
   * ✓ Multi-Account Manager has at least 1 master account linked
   * ✓ Message Template Engine has default templates loaded
   * ✓ Command Executor can parse all Linda commands
   * ✓ Conversation Intelligence Engine connected to analytics storage
   * ✓ Media Handler configured with supported file types
   * ✓ Group Chat Manager has corresponding implementation in WhatsApp service
   * ✓ All error handlers have fallback strategies
   * ✓ Logging is configured and working
   * ✓ Tests for each handler passing
   * ✓ Performance benchmarks meeting requirements
   * ✓ Security checks completed
   * ✓ Documentation updated with new handlers
   * ✓ Team training completed
   */

  /**
   * STEP 7: DEPLOYMENT SCRIPT
   * 
   * const integration = new LindaHandlerIntegration();
   * 
   * // Initialize with services
   * await integration.initializeAllHandlers({
   *   contactsService: require('./ContactsService'),
   *   sheetsService: require('./SheetsService')
   * });
   * 
   * // Verify initialization
   * const stats = integration.getHandlerStats();
   * console.log('Handler Stats:', stats);
   * 
   * // Ready for command execution
   * const result = await integration.sendMessageViaCommand(userId, '/whatsapp send +1234567890 Hello!');
   * console.log('Command Result:', result);
   */
}

// QUICK START EXAMPLES
const QuickStartExamples = {
  // Example 1: Add two WhatsApp accounts (master + secondary)
  setupDualAccounts: async (integration) => {
    await integration.handlers.accountManager.addAccount({
      phone: '+1234567890',
      displayName: 'Linda Master',
      type: 'master'
    });

    await integration.handlers.accountManager.addAccount({
      phone: '+0987654321',
      displayName: 'Linda Secondary',
      type: 'secondary'
    });

    console.log('Accounts:', integration.handlers.accountManager.getStatus());
  },

  // Example 2: Create and use a message template
  createAndUseTemplate: async (integration) => {
    integration.handlers.templateEngine.createTemplate({
      name: 'order_confirmation',
      content: 'Order #{{orderId}} confirmed! Total: {{amount}} {{currency}}'
    });

    const rendered = integration.handlers.templateEngine.renderTemplate(
      'order_confirmation',
      { orderId: '12345', amount: '100', currency: 'USD' }
    );

    console.log('Message:', rendered.content);
  },

  // Example 3: Execute a Linda command
  executeCommand: async (integration) => {
    const result = await integration.handlers.commandExecutor.executeCommand(
      'user123',
      '/contacts sync'
    );

    console.log('Command Result:', result);
  },

  // Example 4: Send batch messages
  sendBatchMessages: async (integration) => {
    const batch = integration.handlers.batchProcessor.createBatch({
      name: 'Newsletter_February_2026'
    });

    const messages = [
      { id: 'msg1', to: '+1111111111', text: 'Hello User 1!' },
      { id: 'msg2', to: '+2222222222', text: 'Hello User 2!' },
      { id: 'msg3', to: '+3333333333', text: 'Hello User 3!' }
    ];

    integration.handlers.batchProcessor.addMessagesToBatch(batch.batchId, messages);

    const result = await integration.handlers.batchProcessor.processBatch(
      batch.batchId,
      async (message) => {
        // Actual sending logic here
        return { status: 'sent' };
      }
    );

    console.log('Batch Result:', result);
  }
};

module.exports = LindaHandlerIntegration;
module.exports.QuickStartExamples = QuickStartExamples;
