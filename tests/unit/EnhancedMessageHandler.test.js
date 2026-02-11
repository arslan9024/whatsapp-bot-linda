/**
 * EnhancedMessageHandler.test.js
 * Unit Tests for Phase 3 Enhanced Message Processing
 * 
 * Tests message validation, enrichment, and context processing pipeline
 */

// Mock Logger for testing
class MockLogger {
  log(msg) { console.log('[LOG]', msg); }
  info(msg) { console.log('[INFO]', msg); }
  warn(msg) { console.log('[WARN]', msg); }
  error(msg) { console.log('[ERROR]', msg); }
  debug(msg) { console.log('[DEBUG]', msg); }
}

/**
 * Enhanced Message Handler Mock
 * Simulates the real service for testing message processing
 */
class MockEnhancedMessageHandler {
  constructor(logger, options = {}) {
    this.logger = logger || new MockLogger();
    this.config = options;
    this.processedMessages = [];
    this.validationErrors = [];
    this.enrichmentCache = new Map();
  }

  // Validate incoming message structure
  validateMessage(message) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check required fields
    if (!message) {
      validation.isValid = false;
      validation.errors.push('Message object is null or undefined');
      return validation;
    }

    if (!message.id) {
      validation.errors.push('Missing message ID');
    }

    if (!message.body || typeof message.body !== 'string') {
      validation.errors.push('Missing or invalid message body');
    }

    if (!message.from) {
      validation.errors.push('Missing sender information');
    }

    // Check for suspicious patterns
    if (message.body && message.body.length > 10000) {
      validation.warnings.push('Message exceeds recommended length (10000 chars)');
    }

    if (message.body && message.body.includes('<script>')) {
      validation.errors.push('Message contains potentially malicious code');
    }

    validation.isValid = validation.errors.length === 0;
    return validation;
  }

  // Enrich message with metadata
  enrichMessage(message) {
    // Return cached enrichment if available
    if (this.enrichmentCache.has(message.id)) {
      return this.enrichmentCache.get(message.id);
    }

    const enriched = {
      originalId: message.id,
      body: message.body,
      from: message.from,
      timestamp: message.timestamp || new Date().toISOString(),
      wordCount: message.body.split(/\s+/).length,
      charCount: message.body.length,
      languageCode: 'en', // Simplified detection
      hasNumbers: /\d+/.test(message.body),
      hasEmojis: /[\u{1F300}-\u{1F9FF}]/u.test(message.body),
      hasUrls: /https?:\/\/[^\s]+/.test(message.body),
      hasPhoneNumbers: /[\+\d][\d\s\-\(\)]{7,}/g.test(message.body)
    };

    // Cache the enrichment
    this.enrichmentCache.set(message.id, enriched);
    return enriched;
  }

  // Process message through full pipeline
  async processMessage(message) {
    const validation = this.validateMessage(message);
    
    if (!validation.isValid) {
      this.validationErrors.push({
        messageId: message?.id,
        errors: validation.errors,
        timestamp: new Date().toISOString()
      });
      return {
        success: false,
        validation,
        error: 'Message validation failed'
      };
    }

    try {
      const enriched = this.enrichMessage(message);
      
      const processed = {
        messageId: message.id,
        originalMessage: message.body,
        enriched: enriched,
        validationResult: validation,
        processedAt: new Date().toISOString()
      };

      this.processedMessages.push(processed);
      return {
        success: true,
        data: processed
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Detect message intent
  detectIntent(message) {
    const body = message.body.toLowerCase();
    
    const intents = {
      greeting: body.match(/^(hi|hello|hey|greetings|salam)/i) ? 0.9 : 0,
      question: body.includes('?') ? 0.8 : 0,
      command: body.startsWith('/') ? 0.95 : 0,
      farewell: body.match(/(bye|goodbye|farewell|exit)/i) ? 0.85 : 0,
      feedback: body.match(/(thanks|thank you|appreciate|love)/i) ? 0.75 : 0,
      complaint: body.match(/(problem|issue|error|broken|not working)/i) ? 0.8 : 0
    };

    const sorted = Object.entries(intents)
      .filter(([_, score]) => score > 0)
      .sort((a, b) => b[1] - a[1]);

    return {
      primary: sorted.length > 0 ? sorted[0][0] : 'unknown',
      confidence: sorted.length > 0 ? sorted[0][1] : 0,
      allIntents: Object.fromEntries(sorted)
    };
  }

  // Extract urgency level
  extractUrgency(message) {
    const body = message.body.toLowerCase();
    
    let urgency = 'normal';
    let score = 0;

    if (body.includes('urgent') || body.includes('asap') || body.includes('emergency')) {
      urgency = 'critical';
      score = 0.95;
    } else if (body.includes('soon') || body.includes('quickly')) {
      urgency = 'high';
      score = 0.7;
    } else if (body.includes('when available') || body.includes('no rush')) {
      urgency = 'low';
      score = 0.3;
    }

    return { urgency, score };
  }

  // Define interactions for analytics
  recordInteraction(messageId, intent, urgency, status) {
    return {
      id: `interaction_${Date.now()}`,
      messageId,
      intent,
      urgency,
      status,
      recordedAt: new Date().toISOString()
    };
  }

  // Get processing statistics
  getStatistics() {
    return {
      totalProcessed: this.processedMessages.length,
      totalValidationErrors: this.validationErrors.length,
      avgWordCount: this.processedMessages.length > 0
        ? this.processedMessages.reduce((sum, m) => sum + m.enriched.wordCount, 0) / this.processedMessages.length
        : 0,
      cacheSize: this.enrichmentCache.size,
      successRate: this.processedMessages.length > 0
        ? (this.processedMessages.length / (this.processedMessages.length + this.validationErrors.length)) * 100
        : 0
    };
  }
}

// ============================================================================
// TEST SUITE BEGINS HERE
// ============================================================================

describe('EnhancedMessageHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new MockEnhancedMessageHandler(new MockLogger());
  });

  // ========================================================================
  // TEST GROUP 1: Message Validation (3 tests)
  // ========================================================================
  describe('validateMessage()', () => {
    
    test('should accept valid message structure', () => {
      const message = {
        id: 'msg_001',
        body: 'Hello, I am interested in a property',
        from: '+971505760056',
        timestamp: new Date().toISOString()
      };
      const result = handler.validateMessage(message);
      
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('should reject message with missing required fields', () => {
      const message = {
        id: 'msg_002',
        body: 'Hello'
        // Missing 'from' field
      };
      const result = handler.validateMessage(message);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Missing sender information');
    });

    test('should detect malicious content in message', () => {
      const message = {
        id: 'msg_003',
        body: 'Hello <script>alert("xss")</script>',
        from: '+971505760056'
      };
      const result = handler.validateMessage(message);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('malicious'))).toBe(true);
    });
  });

  // ========================================================================
  // TEST GROUP 2: Message Enrichment (3 tests)
  // ========================================================================
  describe('enrichMessage()', () => {
    
    test('should enrich message with metadata', () => {
      const message = {
        id: 'msg_004',
        body: 'I am looking for a 2BR villa in Dubai with gym facility',
        from: '+971505760056'
      };
      const enriched = handler.enrichMessage(message);
      
      expect(enriched.wordCount).toBe(12);
      expect(enriched.charCount).toBeGreaterThan(0);
      expect(enriched.hasNumbers).toBe(true);
      expect(enriched.timestamp).toBeDefined();
    });

    test('should cache enrichment results', () => {
      const message = {
        id: 'msg_005',
        body: 'Test message with URL https://example.com',
        from: '+971505760056'
      };
      
      const enriched1 = handler.enrichMessage(message);
      const enriched2 = handler.enrichMessage(message);
      
      expect(enriched1).toBe(enriched2); // Same reference from cache
      expect(handler.getStatistics().cacheSize).toBe(1);
    });

    test('should detect URLs and phone numbers in message', () => {
      const message = {
        id: 'msg_006',
        body: 'Visit https://example.com or call +971505760056',
        from: '+971505760056'
      };
      const enriched = handler.enrichMessage(message);
      
      expect(enriched.hasUrls).toBe(true);
      expect(enriched.hasPhoneNumbers).toBe(true);
    });
  });

  // ========================================================================
  // TEST GROUP 3: Intent Detection (2 tests)
  // ========================================================================
  describe('detectIntent()', () => {
    
    test('should detect greeting intent', () => {
      const message = { body: 'Hello! How are you?' };
      const result = handler.detectIntent(message);
      
      expect(result.primary).toBe('greeting');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test('should detect multiple intents with confidence scoring', () => {
      const message = { body: 'Hi! Do you have availability? Thanks!' };
      const result = handler.detectIntent(message);
      
      expect(result.allIntents).toBeDefined();
      expect(Object.keys(result.allIntents).length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // TEST GROUP 4: Urgency Extraction (2 tests)
  // ========================================================================
  describe('extractUrgency()', () => {
    
    test('should detect urgent messages', () => {
      const message = { body: 'URGENT: Please respond ASAP' };
      const result = handler.extractUrgency(message);
      
      expect(result.urgency).toBe('critical');
      expect(result.score).toBeGreaterThan(0.9);
    });

    test('should classify normal priority messages', () => {
      const message = { body: 'Just browsing for properties' };
      const result = handler.extractUrgency(message);
      
      expect(result.urgency).toBe('normal');
      expect(result.score).toBeGreaterThan(-1);
    });
  });

  // ========================================================================
  // TEST GROUP 5: Message Processing Pipeline (2 tests)
  // ========================================================================
  describe('processMessage()', () => {
    
    test('should process valid message through complete pipeline', async () => {
      const message = {
        id: 'msg_007',
        body: 'I am interested in studio apartments',
        from: '+971505760056'
      };
      const result = await handler.processMessage(message);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.enriched).toBeDefined();
      expect(handler.processedMessages.length).toBe(1);
    });

    test('should handle invalid message gracefully', async () => {
      const result = await handler.processMessage({ body: 'No ID' });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(handler.validationErrors.length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // TEST GROUP 6: Statistics & Analytics (2 tests)
  // ========================================================================
  describe('getStatistics()', () => {
    
    test('should calculate processing statistics', async () => {
      const messages = [
        { id: 'msg_100', body: 'First message here', from: '+971505760056' },
        { id: 'msg_101', body: 'Second message text content', from: '+971505760057' }
      ];
      
      for (const msg of messages) {
        await handler.processMessage(msg);
      }
      
      const stats = handler.getStatistics();
      expect(stats.totalProcessed).toBe(2);
      expect(stats.avgWordCount).toBeGreaterThan(0);
      expect(stats.successRate).toBe(100);
    });

    test('should track validation errors in statistics', async () => {
      await handler.processMessage({ body: 'Invalid' });
      await handler.processMessage({ id: 'msg_102', body: 'Valid message', from: '+971505760056' });
      
      const stats = handler.getStatistics();
      expect(stats.totalValidationErrors).toBeGreaterThan(0);
      expect(stats.successRate).toBeLessThan(100);
    });
  });
});

// ============================================================================
// EXPORT FOR INTEGRATION
// ============================================================================
export default MockEnhancedMessageHandler;
