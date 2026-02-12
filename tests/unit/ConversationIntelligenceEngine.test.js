/**
 * ConversationIntelligenceEngine Unit Tests
 * Phase 6 M2 Module 2
 */

const ConversationIntelligenceEngine = require('../../code/WhatsAppBot/Handlers/ConversationIntelligenceEngine');
const { MockLogger } = require('../mocks/services');
const fixtures = require('../fixtures/fixtures');

describe('ConversationIntelligenceEngine', () => {
  let engine;
  let mockLogger;
  let mockBotContext;

  beforeEach(() => {
    mockLogger = new MockLogger();

    mockBotContext = {
      message: fixtures.whatsappMessage.text,
      chat: fixtures.whatsappChat.private,
      contact: fixtures.whatsappContact.user1
    };

    engine = new ConversationIntelligenceEngine({
      logger: mockLogger,
      enableSentimentAnalysis: true,
      enableEntityExtraction: true,
      enableIntentDetection: true,
      maxContextLength: 10
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============ INITIALIZATION TESTS ============
  describe('Initialization', () => {
    it('should initialize engine', () => {
      expect(engine).toBeDefined();
      expect(engine.conversationHistory).toBeDefined();
      expect(engine.contextWindow).toBeDefined();
    });

    it('should load NLP models', async () => {
      const ready = await engine.isReady();
      expect(ready).toBe(true);
    });
  });

  // ============ MESSAGE PROCESSING TESTS ============
  describe('processMessage', () => {
    it('should process text message', async () => {
      const result = await engine.processMessage(
        mockBotContext.message,
        mockBotContext
      );

      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
    });

    it('should extract message tokens', async () => {
      const message = {
        body: 'Hello, my name is John and I live in New York'
      };

      const result = await engine.processMessage(message, mockBotContext);

      expect(result.tokens).toBeDefined();
      expect(Array.isArray(result.tokens)).toBe(true);
    });

    it('should handle empty message', async () => {
      const emptyMessage = { body: '' };

      const result = await engine.processMessage(emptyMessage, mockBotContext);

      expect(result.success).toBe(true);
      expect(result.isEmpty).toBe(true);
    });

    it('should preserve message metadata', async () => {
      const result = await engine.processMessage(
        mockBotContext.message,
        mockBotContext
      );

      expect(result.messageId).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.contactId).toBeDefined();
    });
  });

  // ============ SENTIMENT ANALYSIS TESTS ============
  describe('Sentiment Analysis', () => {
    it('should analyze positive sentiment', async () => {
      const positiveMessage = { body: 'I love this! It is amazing and wonderful!' };

      const result = await engine.analyzeSentiment(positiveMessage);

      expect(result.sentiment).toBe('positive');
      expect(result.score).toBeGreaterThan(0.5);
    });

    it('should analyze negative sentiment', async () => {
      const negativeMessage = { body: 'This is terrible, awful, and completely useless!' };

      const result = await engine.analyzeSentiment(negativeMessage);

      expect(result.sentiment).toBe('negative');
      expect(result.score).toBeLessThan(-0.5);
    });

    it('should analyze neutral sentiment', async () => {
      const neutralMessage = { body: 'The weather is cloudy today' };

      const result = await engine.analyzeSentiment(neutralMessage);

      expect(result.sentiment).toBe('neutral');
      expect(Math.abs(result.score)).toBeLessThan(0.3);
    });

    it('should provide sentiment confidence', async () => {
      const result = await engine.analyzeSentiment(mockBotContext.message);

      expect(result.confidence).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should detect mixed sentiments', async () => {
      const mixedMessage = {
        body: 'I love the product but the customer service was terrible'
      };

      const result = await engine.analyzeSentiment(mixedMessage);

      expect(result.sentiments).toBeDefined();
      expect(Array.isArray(result.sentiments)).toBe(true);
    });
  });

  // ============ ENTITY EXTRACTION TESTS ============
  describe('Entity Extraction', () => {
    it('should extract named entities', async () => {
      const message = {
        body: 'John Smith from Apple Inc. lives in San Francisco'
      };

      const result = await engine.extractEntities(message);

      expect(result.entities).toBeDefined();
      expect(result.entities.length).toBeGreaterThan(0);
    });

    it('should classify entity types', async () => {
      const message = {
        body: 'Call me at 555-1234 or email john@example.com'
      };

      const result = await engine.extractEntities(message);

      const phoneEntity = result.entities.find(e => e.type === 'PHONE');
      const emailEntity = result.entities.find(e => e.type === 'EMAIL');

      expect(phoneEntity).toBeDefined();
      expect(emailEntity).toBeDefined();
    });

    it('should extract person names', async () => {
      const message = { body: 'Hello, my name is Alice Johnson' };

      const result = await engine.extractEntities(message);

      const person = result.entities.find(e => e.type === 'PERSON');

      expect(person).toBeDefined();
      expect(person.text).toContain('Alice');
    });

    it('should extract locations', async () => {
      const message = { body: 'I will visit New York and London next month' };

      const result = await engine.extractEntities(message);

      const locations = result.entities.filter(e => e.type === 'LOCATION');

      expect(locations.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract dates and times', async () => {
      const message = { body: 'Meeting on January 15, 2024 at 3:30 PM' };

      const result = await engine.extractEntities(message);

      const dateEntity = result.entities.find(e => e.type === 'DATE');

      expect(dateEntity).toBeDefined();
    });
  });

  // ============ INTENT DETECTION TESTS ============
  describe('Intent Detection', () => {
    it('should detect greeting intent', async () => {
      const message = { body: 'Hello! How are you?' };

      const result = await engine.detectIntent(message);

      expect(result.intent).toBe('greeting');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect query intent', async () => {
      const message = { body: 'What is the price of your product?' };

      const result = await engine.detectIntent(message);

      expect(result.intent).toBe('query');
    });

    it('should detect request intent', async () => {
      const message = { body: 'Can you send me the invoice please?' };

      const result = await engine.detectIntent(message);

      expect(result.intent).toBe('request');
    });

    it('should detect complaint intent', async () => {
      const message = { body: 'I have a problem with my order' };

      const result = await engine.detectIntent(message);

      expect(result.intent).toBe('complaint');
    });

    it('should provide intent confidence', async () => {
      const result = await engine.detectIntent(mockBotContext.message);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should suggest alternative intents', async () => {
      const ambiguousMessage = { body: 'Bank' };

      const result = await engine.detectIntent(ambiguousMessage);

      expect(result.alternatives).toBeDefined();
      expect(Array.isArray(result.alternatives)).toBe(true);
    });
  });

  // ============ CONVERSATION HISTORY TESTS ============
  describe('Conversation History', () => {
    it('should store message in history', async () => {
      await engine.addToHistory(mockBotContext.message, mockBotContext);

      const history = engine.getConversationHistory(mockBotContext.contact.id);

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].body).toBe(mockBotContext.message.body);
    });

    it('should maintain conversation context', async () => {
      const messages = [
        { body: 'Hi, I want to order something' },
        { body: 'What do you have?' },
        { body: 'I am interested in the blue one' }
      ];

      for (const msg of messages) {
        await engine.addToHistory(msg, mockBotContext);
      }

      const context = engine.getConversationContext(mockBotContext.contact.id);

      expect(context.messageCount).toBe(messages.length);
      expect(context.firstMessage).toBe(messages[0].body);
    });

    it('should truncate old history', async () => {
      const smallEngine = new ConversationIntelligenceEngine({
        maxContextLength: 3
      });

      for (let i = 1; i <= 5; i++) {
        await smallEngine.addToHistory(
          { body: `Message ${i}` },
          mockBotContext
        );
      }

      const history = smallEngine.getConversationHistory(mockBotContext.contact.id);

      expect(history.length).toBeLessThanOrEqual(3);
    });

    it('should clear conversation history', () => {
      engine.addToHistory(mockBotContext.message, mockBotContext);

      engine.clearConversationHistory(mockBotContext.contact.id);

      const history = engine.getConversationHistory(mockBotContext.contact.id);

      expect(history.length).toBe(0);
    });
  });

  // ============ TOPIC TRACKING TESTS ============
  describe('Topic Tracking', () => {
    it('should detect conversation topic', async () => {
      const messages = [
        { body: 'I need help with my order' },
        { body: 'It was supposed to arrive yesterday' },
        { body: 'Can you track it?' }
      ];

      for (const msg of messages) {
        await engine.addToHistory(msg, mockBotContext);
      }

      const topic = engine.getConversationTopic(mockBotContext.contact.id);

      expect(topic).toBeDefined();
      expect(topic).toContain('order');
    });

    it('should track topic transitions', async () => {
      const message1 = { body: 'I want to buy a laptop' };
      const message2 = { body: 'What is the warranty?' };

      await engine.addToHistory(message1, mockBotContext);
      await engine.addToHistory(message2, mockBotContext);

      const topics = engine.getTopicHistory(mockBotContext.contact.id);

      expect(topics.length).toBeGreaterThan(0);
    });
  });

  // ============ CONTEXTUAL UNDERSTANDING TESTS ============
  describe('Contextual Understanding', () => {
    it('should understand pronouns in context', async () => {
      const messages = [
        { body: 'I bought a laptop yesterday' },
        { body: 'It is very fast' }
      ];

      for (const msg of messages) {
        await engine.addToHistory(msg, mockBotContext);
      }

      const understanding = await engine.analyzeContext(mockBotContext.contact.id);

      expect(understanding.pronounResolution).toBeDefined();
    });

    it('should detect sarcasm', async () => {
      const sarcasticMessage = {
        body: 'Oh great, another delay! This is just what I needed!'
      };

      const result = await engine.detectSarcasm(sarcasticMessage);

      expect(result.hasSarcasm).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should detect urgency', async () => {
      const urgentMessage = { body: 'PLEASE HELP ME RIGHT NOW! This is critical!' };

      const result = await engine.detectUrgency(urgentMessage);

      expect(result.urgencyLevel).toBeGreaterThan(0.7);
    });
  });

  // ============ RESPONSE SUGGESTION TESTS ============
  describe('Response Suggestions', () => {
    it('should suggest response', async () => {
      const message = { body: 'Do you have this product in stock?' };

      const result = await engine.suggestResponse(message);

      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should prioritize suggestions', async () => {
      const result = await engine.suggestResponse(mockBotContext.message);

      if (result.suggestions.length > 1) {
        expect(result.suggestions[0].score).toBeGreaterThanOrEqual(
          result.suggestions[1].score
        );
      }
    });

    it('should provide response templates', async () => {
      const result = await engine.suggestResponse(mockBotContext.message);

      expect(result.templates).toBeDefined();
      expect(Array.isArray(result.templates)).toBe(true);
    });
  });

  // ============ LEARNING TESTS ============
  describe('Learning from Conversations', () => {
    it('should learn from user preferences', async () => {
      const messages = [
        { body: 'I prefer email communication' },
        { body: 'Please always send invoice as PDF' }
      ];

      for (const msg of messages) {
        await engine.addToHistory(msg, mockBotContext);
      }

      const profile = engine.getUserProfile(mockBotContext.contact.id);

      expect(profile.preferences).toBeDefined();
      expect(profile.preferences.length).toBeGreaterThan(0);
    });

    it('should build customer profile', async () => {
      await engine.addToHistory(
        { body: 'My name is John and I work at Google' },
        mockBotContext
      );

      const profile = engine.getUserProfile(mockBotContext.contact.id);

      expect(profile.name).toBe('John');
      expect(profile.company).toBe('Google');
    });

    it('should track sentiment trends', async () => {
      const messages = [
        { body: 'The product is okay' },
        { body: 'Actually, it is getting better' },
        { body: 'I really love it now!' }
      ];

      for (const msg of messages) {
        await engine.addToHistory(msg, mockBotContext);
      }

      const trends = engine.getSentimentTrend(mockBotContext.contact.id);

      expect(trends.trend).toBe('positive');
      expect(trends.trajectory).toBeDefined();
    });
  });

  // ============ DUPLICATE DETECTION TESTS ============
  describe('Duplicate Detection', () => {
    it('should detect duplicate messages', async () => {
      const message = { body: 'I have a problem with my order' };

      await engine.addToHistory(message, mockBotContext);
      const isDuplicate = engine.isDuplicateMessage(message, mockBotContext.contact.id);

      expect(isDuplicate).toBe(true);
    });

    it('should detect similar messages', async () => {
      const message1 = { body: 'I cannot log in to my account' };
      const message2 = { body: 'I am unable to access my account' };

      await engine.addToHistory(message1, mockBotContext);
      const similarity = engine.calculateMessageSimilarity(
        message2,
        mockBotContext.contact.id
      );

      expect(similarity).toBeGreaterThan(0.7);
    });
  });

  // ============ PATTERN RECOGNITION TESTS ============
  describe('Pattern Recognition', () => {
    it('should recognize common patterns', async () => {
      const messages = [
        { body: 'Do you have this in red?' },
        { body: 'What about in blue?' },
        { body: 'Do you have it in green?' }
      ];

      for (const msg of messages) {
        await engine.addToHistory(msg, mockBotContext);
      }

      const patterns = engine.recognizePatterns(mockBotContext.contact.id);

      expect(patterns.length).toBeGreaterThan(0);
    });
  });

  // ============ STATISTICAL ANALYSIS TESTS ============
  describe('Statistical Analysis', () => {
    it('should calculate conversation statistics', async () => {
      const messages = [
        { body: 'Hello' },
        { body: 'Can you help?' },
        { body: 'Thank you!'
        }
      ];

      for (const msg of messages) {
        await engine.addToHistory(msg, mockBotContext);
      }

      const stats = engine.getConversationStatistics(mockBotContext.contact.id);

      expect(stats).toHaveProperty('totalMessages');
      expect(stats).toHaveProperty('averageMessageLength');
      expect(stats).toHaveProperty('messageFrequency');
    });
  });

  // ============ ERROR HANDLING TESTS ============
  describe('Error Handling', () => {
    it('should handle empty message', async () => {
      const result = await engine.processMessage({ body: '' }, mockBotContext);

      expect(result.isEmpty).toBe(true);
    });

    it('should handle non-text content gracefully', async () => {
      const nonTextMessage = { media: 'image.jpg', body: '' };

      const result = await engine.processMessage(nonTextMessage, mockBotContext);

      expect(result.success).toBe(true);
    });

    it('should handle API failures', async () => {
      const mockFailureEngine = new ConversationIntelligenceEngine();

      // Simulate API failure
      mockFailureEngine.apiAvailable = false;

      const result = await mockFailureEngine.processMessage(
        mockBotContext.message,
        mockBotContext
      );

      expect(result).toBeDefined();
    });
  });

  // ============ PERFORMANCE TESTS ============
  describe('Performance', () => {
    it('should process messages efficiently', async () => {
      const start = Date.now();

      await engine.processMessage(mockBotContext.message, mockBotContext);

      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle bulk message processing', async () => {
      const messages = Array(100).fill(null).map((_, i) => ({
        body: `Test message ${i}`
      }));

      const start = Date.now();

      for (const msg of messages) {
        await engine.processMessage(msg, mockBotContext);
      }

      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000); // 100 messages in under 5 seconds
    });
  });
});
