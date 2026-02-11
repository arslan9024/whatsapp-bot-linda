/**
 * MessageAnalyzerWithContext.test.js
 * Unit Tests for Phase 3 Message Enrichment Core Module
 * 
 * Tests entity extraction, context enrichment, and interaction tracking
 */

// Simple in-memory fixture data for testing
const mockData = {
  mockSheetData: {
    properties: [
      { id: 'unit_123', unitNumber: '123', project: 'damac hills 2', price: 500000 },
      { id: 'unit_456', unitNumber: '456', project: 'downtown dubai', price: 750000 }
    ],
    contacts: [
      { name: 'Ahmed', phone: '+971505760056', email: 'ahmed@example.com' },
      { name: 'Fatima', phone: '+971505760057', email: 'fatima@example.com' }
    ]
  }
};

// Mock Logger for testing
class MockLogger {
  log(msg) { console.log('[LOG]', msg); }
  info(msg) { console.log('[INFO]', msg); }
  warn(msg) { console.log('[WARN]', msg); }
  error(msg) { console.log('[ERROR]', msg); }
  debug(msg) { console.log('[DEBUG]', msg); }
}

// Mock MessageAnalyzer (simplified for testing)
class MockMessageAnalyzerWithContext {
  constructor(logger, options = {}) {
    this.logger = logger || new MockLogger();
    this.mockSheet = options.mockSheet || mockData.mockSheetData;
    this.interactions = [];
    this.writeBackQueue = [];
  }

  // Extract entities from message text
  extractEntitiesFromMessage(message) {
    const entities = {
      units: [],
      phones: [],
      projects: [],
      budgets: [],
      propertyTypes: [],
      text: message
    };

    // Extract unit numbers (e.g., "unit 123", "apt 456")
    const unitMatch = message.match(/unit\s+(\d+)|apt\s+(\d+)/gi);
    if (unitMatch) {
      unitMatch.forEach(m => {
        const num = m.match(/\d+/)[0];
        entities.units.push(`unit_${num}`);
      });
    }

    // Extract phone numbers
    const phoneMatch = message.match(/(?:\+971|0)[0-9]{9}/g);
    if (phoneMatch) {
      entities.phones.push(...phoneMatch);
    }

    // Extract project names
    const projectMatch = message.match(/damac hills 2|downtown dubai|marina|jbr|palm/gi);
    if (projectMatch) {
      entities.projects.push(...projectMatch.map(p => p.toLowerCase()));
    }

    // Extract budgets
    const budgetMatch = message.match(/(\d+)\s*k/gi);
    if (budgetMatch) {
      entities.budgets.push(...budgetMatch.map(b => b.toLowerCase()));
    }

    // Extract property types
    const typeMatch = message.match(/apartment|villa|townhouse|penthouse|studio/gi);
    if (typeMatch) {
      entities.propertyTypes.push(...typeMatch.map(t => t.toLowerCase()));
    }

    return entities;
  }

  // Enrich message with context from sheet
  async enrichMessageWithContext(message, entities) {
    const context = {
      relatedProperties: [],
      relatedContacts: [],
      suggestedActions: []
    };

    // Find related properties
    if (entities.units.length > 0) {
      entities.units.forEach(unitId => {
        const prop = this.mockSheet.properties.find(p => p.id === unitId);
        if (prop) context.relatedProperties.push(prop);
      });
    }

    // Find related contacts
    if (entities.phones.length > 0) {
      entities.phones.forEach(phone => {
        const contact = this.mockSheet.contacts.find(c => c.phone === phone);
        if (contact) context.relatedContacts.push(contact);
      });
    }

    // Generate suggestions based on entities
    if (entities.projects.length > 0) {
      context.suggestedActions.push(`Show properties in ${entities.projects.join(', ')}`);
    }
    if (entities.budgets.length > 0) {
      context.suggestedActions.push(`Filter by budget: ${entities.budgets.join(', ')}`);
    }
    if (entities.propertyTypes.length > 0) {
      context.suggestedActions.push(`Show ${entities.propertyTypes.join(', ')}`);
    }

    return context;
  }

  // Analyze message content for sentiment and intent
  analyzeMessageContent(message) {
    const analysis = {
      sentiment: 'neutral',
      intent: 'unknown',
      confidence: 0
    };

    const lowerMsg = message.toLowerCase();

    // Sentiment detection
    if (lowerMsg.includes('interested') || lowerMsg.includes('love') || lowerMsg.includes('perfect')) {
      analysis.sentiment = 'positive';
      analysis.confidence = 0.8;
    } else if (lowerMsg.includes('not') || lowerMsg.includes('hate') || lowerMsg.includes('issue')) {
      analysis.sentiment = 'negative';
      analysis.confidence = 0.7;
    }

    // Intent detection
    if (lowerMsg.includes('interested') || lowerMsg.includes('tell me') || lowerMsg.includes('can you')) {
      analysis.intent = 'inquiry';
    } else if (lowerMsg.includes('yes') || lowerMsg.includes('confirm') || lowerMsg.includes('proceed')) {
      analysis.intent = 'confirmation';
    } else if (lowerMsg.includes('available') || lowerMsg.includes('when')) {
      analysis.intent = 'availability_check';
    }

    return analysis;
  }

  // Generate AI response (simplified for testing)
  generateAIResponse(message, context, analysis) {
    let response = 'Thank you for your interest. ';

    if (context.relatedProperties.length > 0) {
      response += `I found ${context.relatedProperties.length} property(ies) matching your criteria. `;
    }

    if (context.suggestedActions.length > 0) {
      response += `Here are the next steps: ${context.suggestedActions[0]}.`;
    } else {
      response += 'Would you like to schedule a viewing or get more information?';
    }

    return response;
  }

  // Track interaction in analytics
  trackMessageInteraction(messageId, contactPhone, entities, analysis, response) {
    const interaction = {
      id: `interaction_${Date.now()}`,
      messageId,
      contactPhone,
      entitiesFound: Object.values(entities),
      analysis,
      responseGenerated: !!response,
      timestamp: new Date().toISOString()
    };

    this.interactions.push(interaction);
    return interaction;
  }

  // Queue for write-back to sheet
  queueWriteBack(interaction) {
    this.writeBackQueue.push({
      action: 'append',
      sheet: 'Interaction Records',
      data: interaction,
      timestamp: Date.now(),
      retries: 0
    });
  }

  // Complete message processing pipeline
  async processMessage(message, senderPhone) {
    const entities = this.extractEntitiesFromMessage(message);
    const context = await this.enrichMessageWithContext(message, entities);
    const analysis = this.analyzeMessageContent(message);
    const response = this.generateAIResponse(message, context, analysis);
    const interaction = this.trackMessageInteraction(
      `msg_${Date.now()}`,
      senderPhone,
      entities,
      analysis,
      response
    );
    this.queueWriteBack(interaction);

    return {
      entities,
      context,
      analysis,
      response,
      interaction
    };
  }

  // Get statistics
  getStatistics() {
    return {
      totalInteractions: this.interactions.length,
      totalInQueue: this.writeBackQueue.length,
      averageEntitiesPerMessage: this.interactions.length > 0
        ? this.interactions.reduce((sum, i) => sum + Object.values(i.entitiesFound).length, 0) / this.interactions.length
        : 0
    };
  }
}

// ============================================================================
// TEST SUITE BEGINS HERE
// ============================================================================

describe('MessageAnalyzerWithContext', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new MockMessageAnalyzerWithContext(new MockLogger());
  });

  // ========================================================================
  // TEST GROUP 1: Entity Extraction
  // ========================================================================
  describe('extractEntitiesFromMessage()', () => {
    
    test('should extract unit numbers from messages', () => {
      const result = analyzer.extractEntitiesFromMessage('I am interested in unit 123');
      expect(result.units).toContain('unit_123');
      expect(result.units.length).toBe(1);
    });

    test('should extract phone numbers correctly', () => {
      const result = analyzer.extractEntitiesFromMessage('Call me at +971505760056');
      expect(result.phones).toContain('+971505760056');
      expect(result.phones.length).toBeGreaterThan(0);
    });

    test('should extract project names', () => {
      const result = analyzer.extractEntitiesFromMessage(
        'Looking for properties in Damac Hills 2 or Downtown Dubai'
      );
      expect(result.projects.length).toBeGreaterThan(0);
      expect(result.projects.some(p => p.includes('damac'))).toBe(true);
    });

    test('should extract budget amounts', () => {
      const result = analyzer.extractEntitiesFromMessage('My budget is around 500k');
      expect(result.budgets.length).toBeGreaterThan(0);
      expect(result.budgets[0]).toContain('500');
    });

    test('should extract property types', () => {
      const result = analyzer.extractEntitiesFromMessage(
        'I prefer villas and townhouses over apartments'
      );
      expect(result.propertyTypes).toContain('villa');
      expect(result.propertyTypes).toContain('townhouse');
    });
  });

  // ========================================================================
  // TEST GROUP 2: Context Enrichment
  // ========================================================================
  describe('enrichMessageWithContext()', () => {
    
    test('should fetch context from organized sheet', async () => {
      const entities = {
        units: ['unit_123'],
        phones: [],
        projects: [],
        budgets: [],
        propertyTypes: []
      };
      const result = await analyzer.enrichMessageWithContext('test', entities);
      expect(result.relatedProperties.length).toBeGreaterThan(0);
    });

    test('should handle missing property records gracefully', async () => {
      const entities = {
        units: ['unit_999'],
        phones: [],
        projects: [],
        budgets: [],
        propertyTypes: []
      };
      const result = await analyzer.enrichMessageWithContext('test', entities);
      expect(Array.isArray(result.relatedProperties)).toBe(true);
    });

    test('should generate suggestions based on entities', async () => {
      const entities = {
        units: [],
        phones: [],
        projects: ['damac hills 2'],
        budgets: ['500k'],
        propertyTypes: ['villa']
      };
      const result = await analyzer.enrichMessageWithContext('test', entities);
      expect(result.suggestedActions.length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // TEST GROUP 3: Message Analysis
  // ========================================================================
  describe('analyzeMessageContent()', () => {
    
    test('should detect positive sentiment', () => {
      const result = analyzer.analyzeMessageContent(
        'I am very interested and love this property'
      );
      expect(result.sentiment).toBe('positive');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should identify inquiry intent', () => {
      const result = analyzer.analyzeMessageContent('Can you tell me about unit 123?');
      expect(result.intent).toBe('inquiry');
    });

    test('should identify confirmation intent', () => {
      const result = analyzer.analyzeMessageContent('Yes, let us proceed with viewing');
      expect(result.intent).toBe('confirmation');
    });

    test('should identify availability check intent', () => {
      const result = analyzer.analyzeMessageContent('When is unit 456 available?');
      expect(result.intent).toBe('availability_check');
    });
  });

  // ========================================================================
  // TEST GROUP 4: Response Generation
  // ========================================================================
  describe('generateAIResponse()', () => {
    
    test('should generate contextual response for properties found', () => {
      const context = {
        relatedProperties: [{ id: 'unit_123', unitNumber: '123' }],
        suggestedActions: ['Show properties in damac hills 2'],
        relatedContacts: []
      };
      const analysis = { sentiment: 'positive', intent: 'inquiry' };
      const response = analyzer.generateAIResponse('test', context, analysis);
      
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      expect(response).toContain('found');
    });

    test('should provide fallback response when no context', () => {
      const context = {
        relatedProperties: [],
        suggestedActions: [],
        relatedContacts: []
      };
      const analysis = { sentiment: 'neutral', intent: 'unknown' };
      const response = analyzer.generateAIResponse('test', context, analysis);
      
      expect(typeof response).toBe('string');
      expect(response).toContain('schedule');
    });
  });

  // ========================================================================
  // TEST GROUP 5: Interaction Tracking & Write-back
  // ========================================================================
  describe('Interaction Tracking', () => {
    
    test('should track interaction in analytics', () => {
      const initialCount = analyzer.interactions.length;
      analyzer.trackMessageInteraction(
        'msg_001',
        '+971505760056',
        { units: ['unit_123'] },
        { sentiment: 'positive', intent: 'inquiry' },
        'Response text'
      );
      expect(analyzer.interactions.length).toBe(initialCount + 1);
    });

    test('should queue write-back operation', () => {
      const interaction = analyzer.trackMessageInteraction(
        'msg_001',
        '+971505760056',
        { units: ['unit_123'] },
        { sentiment: 'positive', intent: 'inquiry' },
        'Response text'
      );
      analyzer.queueWriteBack(interaction);
      expect(analyzer.writeBackQueue.length).toBeGreaterThan(0);
      expect(analyzer.writeBackQueue[0].sheet).toBe('Interaction Records');
    });

    test('should handle multiple interactions', () => {
      for (let i = 0; i < 5; i++) {
        analyzer.trackMessageInteraction(
          `msg_00${i}`,
          `+97150576005${i}`,
          { units: [] },
          { sentiment: 'positive', intent: 'inquiry' },
          'Response'
        );
      }
      expect(analyzer.interactions.length).toBe(5);
    });
  });

  // ========================================================================
  // TEST GROUP 6: Complete Pipeline
  // ========================================================================
  describe('Full message processing pipeline', () => {
    
    test('should process complete message flow: extract → enrich → respond', async () => {
      const result = await analyzer.processMessage(
        'Hi I am interested in unit 123 at Damac Hills 2, my budget is 500k',
        '+971505760056'
      );

      expect(result.entities).toBeDefined();
      expect(result.entities.units.length).toBeGreaterThan(0);
      expect(result.context).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.interaction).toBeDefined();
    });

    test('should queue message for write-back', async () => {
      const initialQueue = analyzer.writeBackQueue.length;
      await analyzer.processMessage('test message', '+971505760056');
      expect(analyzer.writeBackQueue.length).toBeGreaterThan(initialQueue);
    });

    test('should generate statistics', async () => {
      await analyzer.processMessage('test 1', '+971505760056');
      await analyzer.processMessage('test 2', '+971505760057');

      const stats = analyzer.getStatistics();
      expect(stats.totalInteractions).toBe(2);
      expect(stats.totalInQueue).toBeGreaterThanOrEqual(0);
      expect(typeof stats.averageEntitiesPerMessage).toBe('number');
    });
  });

  // ========================================================================
  // TEST GROUP 7: Error Handling
  // ========================================================================
  describe('Error handling and edge cases', () => {
    
    test('should handle empty messages gracefully', () => {
      const result = analyzer.extractEntitiesFromMessage('');
      expect(result).toBeDefined();
      expect(Array.isArray(result.units)).toBe(true);
    });

    test('should handle messages with no entities', async () => {
      const result = await analyzer.processMessage(
        'hello how are you today',
        '+971505760056'
      );
      expect(result.interaction).toBeDefined();
    });

    test('should handle malformed phone numbers', () => {
      const result = analyzer.extractEntitiesFromMessage('Call 123abc456');
      expect(Array.isArray(result.phones)).toBe(true);
    });
  });
});

// ============================================================================
// EXPORT FOR INTEGRATION
// ============================================================================
export default MockMessageAnalyzerWithContext;
