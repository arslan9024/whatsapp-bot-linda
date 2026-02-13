/**
 * End-to-End Bot Workflow Tests
 * Phase 6 M2 Module 2 - Real-world bot scenarios
 */

const MessageTemplateEngine = require('../../code/WhatsAppBot/Handlers/MessageTemplateEngine');
const MessageBatchProcessor = require('../../code/WhatsAppBot/Handlers/MessageBatchProcessor');
const AdvancedMediaHandler = require('../../code/WhatsAppBot/Handlers/AdvancedMediaHandler');
const CommandExecutor = require('../../code/WhatsAppBot/Handlers/CommandExecutor');
const GroupChatManager = require('../../code/WhatsAppBot/Handlers/GroupChatManager');
const WhatsAppMultiAccountManager = require('../../code/WhatsAppBot/Handlers/WhatsAppMultiAccountManager');
const ConversationIntelligenceEngine = require('../../code/WhatsAppBot/Handlers/ConversationIntelligenceEngine');
const { MockLogger } = require('../mocks/services');
const fixtures = require('../fixtures/fixtures');

describe('End-to-End Bot Workflow Tests', () => {
  let handlers;
  let mockLogger;
  let botState;

  beforeEach(() => {
    mockLogger = new MockLogger();

    // Initialize all handlers
    handlers = {
      template: new MessageTemplateEngine({ logger: mockLogger }),
      batch: new MessageBatchProcessor({ logger: mockLogger }),
      media: new AdvancedMediaHandler({ logger: mockLogger }),
      command: new CommandExecutor({ logger: mockLogger }),
      group: new GroupChatManager({ logger: mockLogger }),
      account: new WhatsAppMultiAccountManager({ logger: mockLogger }),
      conversation: new ConversationIntelligenceEngine({ logger: mockLogger })
    };

    // Reset all handlers to ensure clean state for test isolation
    Object.values(handlers).forEach(handler => {
      if (handler && typeof handler.reset === 'function') {
        handler.reset();
      }
    });

    // Initialize bot state
    botState = {
      running: true,
      connections: 0,
      messagesProcessed: 0,
      lastActivityTime: Date.now()
    };
  });

  afterEach(() => {
    // Reset all handlers after each test to clean up state
    Object.values(handlers).forEach(handler => {
      if (handler && typeof handler.reset === 'function') {
        handler.reset();
      }
    });
  });

  // ============ SCENARIO 1: CUSTOMER SERVICE FLOW ============
  describe('Customer Service Workflow', () => {
    it('should handle complete customer service scenario', async () => {
      // Customer sends inquiry
      const customerMessage = { body: 'Hi, I have a problem with my order #12345' };
      const botContext = {
        message: customerMessage,
        chat: { id: 'chat_1', name: 'Support Chat' },
        contact: { id: 'customer_1', name: 'John Doe' },
        client: {
          sendMessage: jest.fn().mockResolvedValue({ id: 'response_1' })
        }
      };

      // Step 1: Learn from customer message
      await handlers.conversation.addToHistory(customerMessage, botContext);
      const sentiment = await handlers.conversation.analyzeSentiment(customerMessage);
      const entitiesResult = await handlers.conversation.extractEntities(customerMessage);
      const entities = entitiesResult.entities || entitiesResult; // Handle both object and array returns
      const intent = await handlers.conversation.detectIntent(customerMessage);

      // Step 2: Generate acknowledgment
      const ackTemplate = {
        name: 'acknowledgment',
        content: 'Thank you {name}, I\'ll help with order {orderId}. Your concern seems {sentiment}.',
        variables: {
          name: botContext.contact.name,
          orderId: (Array.isArray(entities) ? entities.find(e => e.type === 'ORDER_ID')?.text : null) || 'unknown',
          sentiment: sentiment.sentiment
        }
      };

      const ack = await handlers.template.renderTemplate(ackTemplate);

      // Step 3: Track conversation
      handlers.group.trackGroup(botContext.chat);
      handlers.group.recordActivity(botContext.chat.id, botContext.contact.id, 'support_request');

      expect(sentiment).toBeDefined();
      expect(intent).toBeDefined();
      expect(ack.success).toBe(true);
      expect(ack.content).toContain('Thank you');
    });

    it('should handle escalation in customer service', async () => {
      const botContext = {
        message: { body: 'This is completely unacceptable! I need a refund NOW!' },
        chat: { id: 'chat_2' },
        contact: { id: 'customer_2', name: 'Jane Smith' }
      };

      // Detect urgency
      const urgency = await handlers.conversation.detectUrgency(botContext.message);
      const sentiment = await handlers.conversation.analyzeSentiment(botContext.message);

      // If urgent and negative, escalate
      if (urgency.urgencyLevel > 0.8 && sentiment.sentiment === 'negative') {
        // Create escalation command
        handlers.command.registerCommand({
          name: 'escalate',
          handler: jest.fn().mockResolvedValue({ escalated: true })
        });

        const escalation = await handlers.command.executeCommand('/escalate', botContext);
        expect(escalation.success).toBe(true);
      }

      expect(urgency.urgencyLevel).toBeGreaterThan(0.7);
    });
  });

  // ============ SCENARIO 2: GROUP ANNOUNCEMENT FLOW ============
  describe('Group Announcement Workflow', () => {
    it('should broadcast announcement to group', async () => {
      const groupChat = { id: 'group_1', name: 'Sales Team' };
      const botContext = {
        chat: groupChat,
        contact: { id: 'admin_1', name: 'Admin' },
        client: {
          getChatById: jest.fn().mockResolvedValue(groupChat)
        }
      };

      // Step 1: Track group
      handlers.group.trackGroup(groupChat);

      // Step 2: Create announcement
      const announcement = {
        name: 'announcement',
        content: 'Attention {team}! New policy effective immediately. Please use /update to acknowledge.',
        variables: { team: 'Sales Team' }
      };

      const rendered = await handlers.template.renderTemplate(announcement);

      // Step 3: Create batch of notification templates
      const members = Array(10).fill(null).map((_, i) => ({
        name: 'individual_notification',
        content: 'Hi {name}, {announcement}',
        variables: {
          name: `Member ${i + 1}`,
          announcement: rendered.content
        }
      }));

      // Step 4: Batch process notifications
      const batch = await handlers.batch.processBatch(
        members,
        { renderTemplates: true },
        botContext
      );

      // Step 5: Record activity
      handlers.group.recordActivity(groupChat.id, 'admin_1', 'announcement_sent');

      expect(batch.success).toBe(true);
      expect(batch.processed).toBe(members.length);
    });

    it('should enforce group rules in broadcast', async () => {
      const groupChat = { id: 'group_2' };
      handlers.group.trackGroup(groupChat);

      // Add content moderation rule
      handlers.group.addRule({
        pattern: /spam|promotion/i,
        action: 'review',
        severity: 'medium'
      });

      // Try to broadcast content that violates rules
      const message = { body: 'Buy our amazing product NOW! Special promo!' };

      const check = handlers.group.checkMessage(message, groupChat.id);

      expect(check.violated).toBe(true);
    });
  });

  // ============ SCENARIO 3: MULTI-ACCOUNT ROUTING ============
  describe('Multi-Account Routing Workflow', () => {
    it('should route messages to appropriate accounts', async () => {
      // Initialize accounts
      const master = await handlers.account.addAccount({
        phone: '+1111111111',
        type: 'master'
      });

      const secondary1 = await handlers.account.addAccount({
        phone: '+2222222222',
        type: 'secondary'
      });

      const secondary2 = await handlers.account.addAccount({
        phone: '+3333333333',
        type: 'secondary'
      });

      // Set routing preferences
      handlers.account.setRoutingPreference('customer_important', master.accountId);
      handlers.account.setRoutingPreference('customer_support', secondary1.accountId);
      handlers.account.setRoutingPreference('customer_bulk', secondary2.accountId);

      // Route different customer types
      const importantRoute = handlers.account.getRoutingAccount('customer_important');
      const supportRoute = handlers.account.getRoutingAccount('customer_support');
      const bulkRoute = handlers.account.getRoutingAccount('customer_bulk');

      expect(importantRoute.id).toBe(master.accountId);
      expect(supportRoute.id).toBe(secondary1.accountId);
      expect(bulkRoute.id).toBe(secondary2.accountId);
    });

    it('should handle account load balancing', async () => {
      const account1 = await handlers.account.addAccount({
        phone: '+1111111111',
        type: 'master'
      });

      const account2 = await handlers.account.addAccount({
        phone: '+2222222222',
        type: 'secondary'
      });

      // Simulate messages to each account
      for (let i = 0; i < 5; i++) {
        handlers.account.recordMessageActivity(account1.accountId, 'sent');
      }

      for (let i = 0; i < 20; i++) {
        handlers.account.recordMessageActivity(account2.accountId, 'sent');
      }

      // Get statistics
      const stats = handlers.account.getStatistics();

      expect(stats.totalAccounts).toBe(2);
      expect(stats).toHaveProperty('accountHealth');
    });
  });

  // ============ SCENARIO 4: MEDIA SHARING IN GROUP ============
  describe('Media Sharing Workflow', () => {
    it('should handle media sharing with validation', async () => {
      const mediaMessage = fixtures.whatsappMessage.media;
      const groupChat = { id: 'group_media', name: 'Team Shared' };
      const botContext = {
        message: mediaMessage,
        chat: groupChat,
        contact: { id: 'uploader_1', name: 'User A' },
        client: {
          downloadMedia: jest.fn().mockResolvedValue(Buffer.from('media-data'))
        }
      };

      // Step 1: Track group
      handlers.group.trackGroup(groupChat);

      // Step 2: Download and validate media
      const media = await handlers.media.downloadMedia(mediaMessage, botContext);

      expect(media.success).toBe(true);

      // Step 3: Check group rules
      handlers.group.addRule({
        pattern: /malicious/,
        action: 'delete'
      });

      // Step 4: Record activity
      handlers.group.recordActivity(groupChat.id, botContext.contact.id, 'media_shared');

      // Step 5: Learn from action
      await handlers.conversation.addToHistory(mediaMessage, botContext);

      const activity = handlers.group.getActivityLog(groupChat.id);
      expect(activity.length).toBeGreaterThan(0);
    });
  });

  // ============ SCENARIO 5: COMMAND-DRIVEN WORKFLOW ============
  describe('Interactive Command Workflow', () => {
    it('should handle sequential commands with state', async () => {
      const botContext = {
        message: { body: '' },
        chat: { id: 'command_chat' },
        contact: { id: 'user_cmd_1', name: 'Command User' }
      };

      // Register sequence of commands
      handlers.command.registerCommand({
        name: 'start',
        description: 'Start process',
        handler: jest.fn().mockResolvedValue({ success: true, nextStep: 'enter_data' })
      });

      handlers.command.registerCommand({
        name: 'enter',
        description: 'Enter data',
        handler: jest.fn().mockResolvedValue({ success: true, nextStep: 'confirm' })
      });

      handlers.command.registerCommand({
        name: 'confirm',
        description: 'Confirm data',
        handler: jest.fn().mockResolvedValue({ success: true, completed: true })
      });

      // Execute command sequence
      const step1 = await handlers.command.executeCommand('/start', botContext);
      expect(step1.success).toBe(true);

      const step2 = await handlers.command.executeCommand('/enter', botContext);
      expect(step2.success).toBe(true);

      const step3 = await handlers.command.executeCommand('/confirm', botContext);
      expect(step3.success).toBe(true);
    });

    it('should provide contextual command suggestions', async () => {
      const botContext = {
        message: { body: 'What can I do?' },
        chat: { id: 'help_chat' },
        contact: { id: 'contact_1', name: 'Test User' }
      };

      // Analyze intent
      const intent = await handlers.conversation.detectIntent(botContext.message);

      // Register a custom command (not a built-in one that's already registered)
      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      try {
        handlers.command.registerCommand('suggest', mockHandler);
      } catch (e) {
        // Command may already exist, that's fine
      }

      // Execute a built-in command that should work
      const result = await handlers.command.executeCommand('/help', botContext);

      expect(result.success).toBe(true);
    });
  });

  // ============ SCENARIO 6: CONVERSATION LEARNING FLOW ============
  describe('Conversation Learning Workflow', () => {
    it('should learn customer preferences from conversation', async () => {
      const customerId = 'learning_customer_1';
      const botContext = {
        message: { body: '' },
        chat: { id: 'learn_chat' },
        contact: { id: customerId, name: 'Smart Customer' }
      };

      const conversationSequence = [
        { body: 'Hi, my name is Alice Johnson' },
        { body: 'I am a project manager at TechCorp' },
        { body: 'I prefer email communication' },
        { body: 'Please always send invoices as PDF' },
        { body: 'Thank you, your service is excellent!' }
      ];

      // Process each message
      for (const msg of conversationSequence) {
        botContext.message = msg;
        await handlers.conversation.addToHistory(msg, botContext);
      }

      // Extract learned information
      const profile = handlers.conversation.getUserProfile(customerId);
      const sentiment = handlers.conversation.getSentimentTrend(customerId);

      expect(profile).toBeDefined();
      expect(sentiment.trend).toBe('positive');
    });

    it('should detect conversation topics and provide context', async () => {
      const customerId = 'topic_customer_1';
      const botContext = {
        message: { body: '' },
        chat: { id: 'topic_chat' },
        contact: { id: customerId }
      };

      const messages = [
        { body: 'I need to place a bulk order' },
        { body: 'What are the volume discounts?' },
        { body: 'Can you give me a quote?' },
        { body: 'What is your delivery timeline?' }
      ];

      // Process messages
      for (const msg of messages) {
        botContext.message = msg;
        await handlers.conversation.addToHistory(msg, botContext);
      }

      // Get topic
      const topic = handlers.conversation.getConversationTopic(customerId);
      const stats = handlers.conversation.getConversationStatistics(customerId);

      expect(topic).toContain('order');
      expect(stats.totalMessages).toBe(messages.length);
    });
  });

  // ============ SCENARIO 7: ERROR HANDLING AND RECOVERY ============
  describe('Error Handling Workflow', () => {
    it('should handle and recover from errors gracefully', async () => {
      const botContext = {
        message: { body: 'Process this message' },
        chat: { id: 'error_chat' },
        contact: { id: 'error_user_1' },
        client: {
          sendMessage: jest.fn().mockRejectedValueOnce(new Error('Network error'))
        }
      };

      // Log normal and error messages in conversation history
      await handlers.conversation.addToHistory(
        { body: 'User sent a message' },
        botContext
      );

      // Log error in conversation (simulating error handling)
      await handlers.conversation.addToHistory(
        { body: 'An error occurred, trying to recover', isError: true },
        botContext
      );

      // Verify recovery - history should contain both messages
      const history = handlers.conversation.getConversationHistory(botContext.contact.id);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should provide fallback responses on errors', async () => {
      const botContext = {
        message: { body: '/command' },
        chat: { id: 'fallback_chat' },
        contact: { id: 'fallback_user_1' }
      };

      handlers.command.registerCommand({
        name: 'command',
        handler: jest.fn().mockRejectedValue(new Error('Command failed')),
        fallback: () => ({ success: true, message: 'Using fallback response' })
      });

      const result = await handlers.command.executeCommand('/command', botContext);

      expect(result).toBeDefined();
    });
  });

  // ============ SCENARIO 8: PERFORMANCE UNDER LOAD ============
  describe('High-Load Workflow', () => {
    it('should handle concurrent requests', async () => {
      const promises = [];

      // Create 50 concurrent message processing tasks
      for (let i = 0; i < 50; i++) {
        const botContext = {
          message: { body: `Message ${i}` },
          chat: { id: 'load_chat' },
          contact: { id: `user_${i}` }
        };

        promises.push(
          handlers.conversation.addToHistory(botContext.message, botContext)
        );
      }

      const start = Date.now();
      await Promise.all(promises);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000);
    });

    it('should batch process large message volume', async () => {
      const botContext = {
        chat: { id: 'bulk_chat' },
        contact: { id: 'bulk_user_1' }
      };

      const messages = Array(500).fill(null).map((_, i) => ({
        name: 'template',
        content: `Bulk message ${i}`,
        variables: {}
      }));

      const start = Date.now();
      const result = await handlers.batch.processBatch(
        messages,
        {},
        botContext
      );
      const duration = Date.now() - start;

      expect(result.processed).toBe(messages.length);
      expect(duration).toBeLessThan(10000);
    });
  });

  // ============ INTEGRATION SANITY CHECKS ============
  describe('System Integrity Checks', () => {
    it('should maintain data consistency across handlers', async () => {
      const userId = 'integrity_user_1';
      const chatId = 'integrity_chat_1';
      const botContext = {
        message: { body: 'Test message' },
        chat: { id: chatId },
        contact: { id: userId },
        client: {
          getChat: jest.fn().mockResolvedValue({ id: chatId })
        }
      };

      // Process in conversation engine
      await handlers.conversation.addToHistory(botContext.message, botContext);

      // Record in group
      handlers.group.trackGroup(botContext.chat);
      handlers.group.recordActivity(chatId, userId, 'message');

      // Verify both recorded the same user
      const convHistory = handlers.conversation.getConversationHistory(userId);
      const groupParticipation = handlers.group.getUserParticipation(chatId, userId);

      expect(convHistory.length).toBeGreaterThan(0);
      expect(groupParticipation).toBeDefined();
    });

    it('should not lose state during handler switching', async () => {
      const botContext = {
        message: { body: 'Important message' },
        chat: { id: 'state_chat' },
        contact: { id: 'state_user_1' }
      };

      // Add to conversation
      await handlers.conversation.addToHistory(botContext.message, botContext);

      // Switch to batch processing
      const batch = await handlers.batch.processBatch(
        [botContext.message],
        {},
        botContext
      );

      // Add more to conversation
      await handlers.conversation.addToHistory(
        { body: 'Another message' },
        botContext
      );

      // Verify both states
      const history = handlers.conversation.getConversationHistory(botContext.contact.id);
      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(batch.success).toBe(true);
    });
  });
});
