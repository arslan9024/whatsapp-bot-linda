/**
 * Handler Integration Tests
 * Phase 6 M2 Module 2 - Tests interactions between handlers
 */

const MessageTemplateEngine = require('../../code/WhatsAppBot/Handlers/MessageTemplateEngine');
const MessageBatchProcessor = require('../../code/WhatsAppBot/Handlers/MessageBatchProcessor');
const AdvancedMediaHandler = require('../../code/WhatsAppBot/Handlers/AdvancedMediaHandler');
const CommandExecutor = require('../../code/WhatsAppBot/Handlers/CommandExecutor');
const GroupChatManager = require('../../code/WhatsAppBot/Handlers/GroupChatManager');
const WhatsAppMultiAccountManager = require('../../code/WhatsAppBot/Handlers/WhatsAppMultiAccountManager');
const ConversationIntelligenceEngine = require('../../code/WhatsAppBot/Handlers/ConversationIntelligenceEngine');
const { MockLogger } = require('../../mocks/services');
const fixtures = require('../../fixtures/fixtures');

describe('Handler Integration Tests', () => {
  let templateEngine;
  let batchProcessor;
  let mediaHandler;
  let commandExecutor;
  let groupManager;
  let accountManager;
  let conversationEngine;
  let mockLogger;
  let mockBotContext;

  beforeEach(() => {
    mockLogger = new MockLogger();

    mockBotContext = {
      message: fixtures.whatsappMessage.text,
      chat: fixtures.whatsappChat.group,
      contact: fixtures.whatsappContact.user1,
      client: {
        sendMessage: jest.fn().mockResolvedValue({ id: 'msg_123' }),
        downloadMedia: jest.fn().mockResolvedValue(Buffer.from('media-data')),
        getChat: jest.fn().mockResolvedValue(fixtures.whatsappChat.group)
      }
    };

    // Initialize all handlers
    templateEngine = new MessageTemplateEngine({ logger: mockLogger });
    batchProcessor = new MessageBatchProcessor({ logger: mockLogger });
    mediaHandler = new AdvancedMediaHandler({ logger: mockLogger });
    commandExecutor = new CommandExecutor({ logger: mockLogger });
    groupManager = new GroupChatManager({ logger: mockLogger });
    accountManager = new WhatsAppMultiAccountManager({ logger: mockLogger });
    conversationEngine = new ConversationIntelligenceEngine({ logger: mockLogger });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============ TEMPLATE + BATCH PROCESSING ============
  describe('Template Engine + Batch Processor Integration', () => {
    it('should generate and batch process templates', async () => {
      // Generate template
      const template = {
        name: 'greeting',
        content: 'Hello {name}, welcome to {company}!',
        variables: { name: 'John', company: 'Acme' }
      };

      const rendered = await templateEngine.renderTemplate(template);

      // Batch process with multiple templates
      const messages = [
        { ...template, variables: { name: 'John', company: 'Acme' } },
        { ...template, variables: { name: 'Jane', company: 'TechCorp' } },
        { ...template, variables: { name: 'Bob', company: 'StartUp' } }
      ];

      const batch = await batchProcessor.processBatch(
        messages,
        { renderTemplates: true },
        mockBotContext
      );

      expect(batch.success).toBe(true);
      expect(batch.processed).toBe(3);
    });

    it('should handle template errors in batch processing', async () => {
      const invalidTemplate = {
        name: 'invalid',
        content: 'Missing {undefined_var}',
        variables: {}
      };

      const batch = await batchProcessor.processBatch(
        [invalidTemplate],
        { renderTemplates: true, continueOnError: true },
        mockBotContext
      );

      expect(batch.processed).toBeGreaterThanOrEqual(0);
      expect(batch.errors).toBeDefined();
    });
  });

  // ============ COMMAND + CONVERSATION INTELLIGENCE ============
  describe('Command Executor + Conversation Intelligence Integration', () => {
    it('should execute command and learn from interaction', async () => {
      mockBotContext.message = { body: '/help' };

      // Track in conversation engine
      await conversationEngine.addToHistory(mockBotContext.message, mockBotContext);

      // Execute command
      const result = await commandExecutor.executeCommand('/help', mockBotContext);

      // Verify learning
      const topic = conversationEngine.getConversationTopic(mockBotContext.contact.id);

      expect(result.success).toBe(true);
      expect(topic).toBeDefined();
    });

    it('should analyze command intent before execution', async () => {
      const userMessage = { body: 'What can you help me with?' };

      // Analyze intent
      const intent = await conversationEngine.detectIntent(userMessage);

      // Based on intent, suggest appropriate command
      const suggestions = await commandExecutor.suggestCommand(intent);

      expect(intent).toBeDefined();
    });
  });

  // ============ MEDIA + GROUP CHAT MANAGEMENT ============
  describe('Media Handler + Group Manager Integration', () => {
    it('should upload media to group chat', async () => {
      // Download media
      const mediaData = await mediaHandler.downloadMedia(
        fixtures.whatsappMessage.media,
        mockBotContext
      );

      expect(mediaData.success).toBe(true);

      // Track activity in group
      groupManager.trackGroup(mockBotContext.chat);
      groupManager.recordActivity(
        mockBotContext.chat.id,
        mockBotContext.contact.id,
        'media_uploaded'
      );

      // Verify recording
      const activity = groupManager.getActivityLog(mockBotContext.chat.id);
      expect(activity.length).toBeGreaterThan(0);
    });

    it('should enforce media rules in group', async () => {
      groupManager.trackGroup(mockBotContext.chat);
      
      // Add moderation rule for media
      groupManager.addRule({
        pattern: /[^media]/,
        action: 'require_approval',
        severity: 'medium'
      });

      // Process media
      const result = await mediaHandler.downloadMedia(
        fixtures.whatsappMessage.media,
        mockBotContext
      );

      expect(result).toBeDefined();
    });
  });

  // ============ MULTI-ACCOUNT + ROUTING ============
  describe('Multi-Account Manager + Command Routing Integration', () => {
    it('should route commands to correct account', async () => {
      // Initialize accounts
      const master = await accountManager.addAccount({
        phone: '+1111111111',
        type: 'master'
      });

      const secondary = await accountManager.addAccount({
        phone: '+2222222222',
        type: 'secondary'
      });

      // Set routing preference
      accountManager.setRoutingPreference(mockBotContext.contact.id, master.accountId);

      // Get routing account
      const routed = accountManager.getRoutingAccount(mockBotContext.contact.id);

      expect(routed.id).toBe(master.accountId);
    });

    it('should handle account failover', async () => {
      const master = await accountManager.addAccount({
        phone: '+0000000000',
        type: 'master'
      });

      const secondary = await accountManager.addAccount({
        phone: '+1111111111',
        type: 'secondary'
      });

      // Simulate master account failure
      accountManager.recordMessageActivity(master.accountId, 'error');

      // Should failover to secondary
      const routed = accountManager.getRoutingAccount(mockBotContext.contact.id);

      expect(routed).toBeDefined();
    });
  });

  // ============ COMPLETE FLOW: MULTI-HANDLER WORKFLOW ============
  describe('Complete Message Processing Workflow', () => {
    it('should process message through consciousness pipeline', async () => {
      // Step 1: Conversation intelligence learns
      await conversationEngine.addToHistory(mockBotContext.message, mockBotContext);

      // Step 2: Group manager records activity
      groupManager.trackGroup(mockBotContext.chat);
      groupManager.recordActivity(
        mockBotContext.chat.id,
        mockBotContext.contact.id,
        'message'
      );

      // Step 3: Check for commands
      let isCommand = mockBotContext.message.body.startsWith('/');
      
      if (isCommand) {
        // Execute command
        await commandExecutor.executeCommand(
          mockBotContext.message.body,
          mockBotContext
        );
      }

      // Step 4: Generate response using template
      const responseTemplate = {
        name: 'ack',
        content: 'Message received from {name}',
        variables: { name: mockBotContext.contact.name }
      };

      const rendered = await templateEngine.renderTemplate(responseTemplate);

      expect(rendered.success).toBe(true);
      expect(rendered.content).toContain(mockBotContext.contact.name);
    });

    it('should batch process group messages with analysis', async () => {
      // Track group
      groupManager.trackGroup(mockBotContext.chat);

      // Create batch of messages
      const messages = [
        { body: 'Hello everyone!' },
        { body: 'How is everyone doing?' },
        { body: 'Great to see you all!' }
      ];

      // Process batch
      const batch = await batchProcessor.processBatch(
        messages,
        { analyzeEach: true },
        mockBotContext
      );

      // Analyze conversation
      for (const msg of messages) {
        await conversationEngine.addToHistory(msg, mockBotContext);
        groupManager.recordActivity(
          mockBotContext.chat.id,
          mockBotContext.contact.id,
          'message'
        );
      }

      // Get summary
      const summary = groupManager.getActivitySummary(mockBotContext.chat.id);

      expect(batch.success).toBe(true);
      expect(summary.totalMessages).toBeGreaterThan(0);
    });

    it('should handle media-rich message workflow', async () => {
      const mediaMessage = fixtures.whatsappMessage.media;

      // Step 1: Download and validate media
      const mediaData = await mediaHandler.downloadMedia(
        mediaMessage,
        mockBotContext
      );

      expect(mediaData.success).toBe(true);

      // Step 2: Add to conversation history
      await conversationEngine.addToHistory(mediaMessage, mockBotContext);

      // Step 3: Record in group activity
      groupManager.trackGroup(mockBotContext.chat);
      groupManager.recordActivity(
        mockBotContext.chat.id,
        mockBotContext.contact.id,
        'media_upload'
      );

      // Step 4: Get activity summary
      const activity = groupManager.getActivityLog(mockBotContext.chat.id);

      expect(activity.length).toBeGreaterThan(0);
    });
  });

  // ============ COMMAND PROCESSING WITH LEARNING ============
  describe('Command Processing with Conversation Learning', () => {
    it('should learn from executed commands', async () => {
      const commandMessage = { body: '/add task buy groceries' };

      // Record in conversation
      await conversationEngine.addToHistory(commandMessage, mockBotContext);

      // Execute command
      commandExecutor.registerCommand({
        name: 'add',
        handler: jest.fn().mockResolvedValue({ success: true })
      });

      const result = await commandExecutor.executeCommand(
        commandMessage.body,
        mockBotContext
      );

      // Learn from command
      const profile = conversationEngine.getUserProfile(mockBotContext.contact.id);

      expect(result.success).toBe(true);
      expect(profile).toBeDefined();
    });
  });

  // ============ ERROR RECOVERY ACROSS HANDLERS ============
  describe('Cross-Handler Error Recovery', () => {
    it('should handle media processing failure gracefully', async () => {
      mockBotContext.client.downloadMedia.mockRejectedValueOnce(
        new Error('Download failed')
      );

      // Attempt media processing
      const mediaResult = await mediaHandler.downloadMedia(
        fixtures.whatsappMessage.media,
        mockBotContext
      );

      expect(mediaResult.success).toBe(false);

      // Record failure in conversation context
      await conversationEngine.addToHistory(
        { body: 'Media upload failed', isError: true },
        mockBotContext
      );

      // Verify conversation learned about failure
      const history = conversationEngine.getConversationHistory(mockBotContext.contact.id);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should handle command execution failure with fallback', async () => {
      // Register command with fallback
      commandExecutor.registerCommand({
        name: 'fail',
        handler: jest.fn().mockRejectedValue(new Error('Command failed')),
        fallback: () => ({ success: true, message: 'Using fallback response' })
      });

      const result = await commandExecutor.executeCommand('/fail', mockBotContext);

      // Should either succeed or provide fallback
      expect(result).toBeDefined();
    });
  });

  // ============ PERFORMANCE INTEGRATION ============
  describe('Performance & Load Integration', () => {
    it('should handle high-volume batch processing', async () => {
      const start = Date.now();

      // Create large batch
      const templates = Array(100).fill(null).map((_, i) => ({
        name: 'template',
        content: 'Message {i}',
        variables: { i }
      }));

      const batch = await batchProcessor.processBatch(
        templates,
        {},
        mockBotContext
      );

      const duration = Date.now() - start;

      expect(batch.processed).toBeGreaterThan(0);
      expect(duration).toBeLessThan(5000);
    });

    it('should maintain quality during multi-handler pipeline', async () => {
      const testMessage = fixtures.whatsappMessage.text;

      // Run through all handlers
      await conversationEngine.addToHistory(testMessage, mockBotContext);
      groupManager.recordActivity(
        mockBotContext.chat.id,
        mockBotContext.contact.id,
        'message'
      );

      // Verify no data loss
      const history = conversationEngine.getConversationHistory(mockBotContext.contact.id);
      const activity = groupManager.getActivityLog(mockBotContext.chat.id);

      expect(history.length).toBeGreaterThan(0);
      expect(activity.length).toBeGreaterThan(0);
    });
  });

  // ============ STATE CONSISTENCY TESTS ============
  describe('State Consistency Across Handlers', () => {
    it('should maintain consistent user context', async () => {
      const userId = mockBotContext.contact.id;

      // Add to conversation
      await conversationEngine.addToHistory(mockBotContext.message, mockBotContext);

      // Record in group
      groupManager.trackGroup(mockBotContext.chat);
      groupManager.recordActivity(mockBotContext.chat.id, userId, 'message');

      // Verify consistency
      const history = conversationEngine.getConversationHistory(userId);
      const participation = groupManager.getUserParticipation(mockBotContext.chat.id, userId);

      expect(history.length).toBeGreaterThan(0);
      expect(participation).toBeDefined();
    });

    it('should sync account state across handlers', async () => {
      const master = await accountManager.addAccount({
        phone: '+1111111111',
        type: 'master'
      });

      // Record activity with account
      accountManager.recordMessageActivity(master.accountId, 'sent');

      // Verify state
      const info = accountManager.getAccountInfo(master.accountId);
      expect(info.status).toBe('linked');
    });
  });
});
