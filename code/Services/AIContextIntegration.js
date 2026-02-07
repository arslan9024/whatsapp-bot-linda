/**
 * AI Context Integration
 * 
 * Bridges DataContextService with MessageAnalyzer/bot logic
 * Enriches bot decisions with context from organized sheets
 */

import { DataContextService } from './DataContextService.js';
import { Logger } from '../Utils/Logger.js';

const logger = new Logger('AIContextIntegration');

class AIContextIntegration {
  constructor(dataContextService = null, messageAnalyzer = null) {
    this.dataContextService = dataContextService || new DataContextService();
    this.messageAnalyzer = messageAnalyzer;
    this.contextCache = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize AI context integration
   */
  async initialize(organizerSheetId) {
    try {
      logger.info('🚀 Initializing AI Context Integration...');
      await this.dataContextService.loadContext(organizerSheetId);
      this.isInitialized = true;
      logger.info('✅ AI Context Integration initialized successfully');
      return { success: true };
    } catch (error) {
      logger.error(`Failed to initialize: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enrich message with context before processing
   * Called before MessageAnalyzer processes the message
   */
  async enrichMessage(messageData) {
    if (!this.isInitialized) {
      logger.warn('DataContext not initialized. Skipping enrichment.');
      return messageData;
    }

    try {
      const messageText = messageData.body || '';
      const context = this.dataContextService.buildMessageContext(messageText);

      // Add context to message data
      return {
        ...messageData,
        _context: context,
        _enrichedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Message enrichment failed: ${error.message}`);
      return messageData; // Return original message if enrichment fails
    }
  }

  /**
   * Extract context-aware decision inputs
   * Helps determine bot response type
   */
  getDecisionInput(enrichedMessage) {
    const context = enrichedMessage._context || {};

    return {
      // Presence flags
      hasPropertyReference: context.extracted?.properties.length > 0,
      hasContactReference: context.extracted?.contacts.length > 0,
      hasCodeReference: context.extracted?.codes.length > 0,

      // Primary record info
      primaryRecord: context.primaryRecord,
      primaryCode: context.primaryRecord?.code,
      primaryType: context.primaryRecord?.record?._type,

      // Record count and distribution
      totalRecords: context.recordCount || 0,
      recordsByType: {
        properties: context.extracted?.properties.length || 0,
        contacts: context.extracted?.contacts.length || 0,
        financials: context.extracted?.financials.length || 0
      },

      // Helper methods for decision logic
      hasRecords: context.hasRecords || false,
      getProperty: () => context.extracted?.properties[0]?.record || null,
      getContact: () => context.extracted?.contacts[0]?.record || null,
      getAllRecords: () => context.allRecords || [],

      // For debugging
      contextMetadata: context.metadata
    };
  }

  /**
   * Generate context-aware response suggestions
   */
  generateResponseSuggestions(enrichedMessage) {
    const decision = this.getDecisionInput(enrichedMessage);
    const suggestions = [];

    // If property reference found
    if (decision.hasPropertyReference) {
      const property = decision.getProperty();
      if (property) {
        suggestions.push({
          type: 'PROPERTY_DETAILS',
          action: 'Return detailed property information',
          data: {
            code: decision.primaryCode,
            property: property.Property || property.Project,
            unit: property.Unit,
            status: property.Status || 'N/A',
            price: property.Price || 'N/A'
          }
        });
      }
    }

    // If contact reference found
    if (decision.hasContactReference) {
      const contact = decision.getContact();
      if (contact) {
        suggestions.push({
          type: 'CONTACT_DETAILS',
          action: 'Return contact information',
          data: {
            code: decision.primaryCode,
            name: contact._normalizedFields?.name,
            phone: contact._normalizedFields?.phone,
            email: contact._normalizedFields?.email
          }
        });
      }
    }

    // If code reference found
    if (decision.hasCodeReference) {
      const record = decision.primaryRecord?.record;
      if (record) {
        suggestions.push({
          type: 'CODE_LOOKUP',
          action: 'Provide information about referenced code',
          data: {
            code: decision.primaryCode,
            type: decision.primaryType,
            dataQuality: record._metadata?.dataQuality,
            fullRecord: record
          }
        });
      }
    }

    // Generic record present
    if (decision.hasRecords && suggestions.length === 0) {
      suggestions.push({
        type: 'GENERIC_RECORD',
        action: 'Acknowledge reference and ask for clarification',
        count: decision.totalRecords
      });
    }

    // No context found
    if (suggestions.length === 0) {
      suggestions.push({
        type: 'NO_CONTEXT',
        action: 'Use standard message processing without context'
      });
    }

    return suggestions;
  }

  /**
   * Apply context to message response
   * Modifies bot response based on available context
   */
  applyContextToResponse(enrichedMessage, originalResponse) {
    const decision = this.getDecisionInput(enrichedMessage);
    let enhancedResponse = originalResponse;

    if (!decision.hasRecords) {
      return enhancedResponse; // No context to apply
    }

    // Build context summary
    const contextSummary = this._buildContextSummary(decision);

    // Inject context into response
    if (contextSummary) {
      enhancedResponse = {
        ...originalResponse,
        _contextEnhanced: true,
        contextSummary: contextSummary,
        contextMetadata: {
          recordCount: decision.totalRecords,
          primaryType: decision.primaryType,
          primaryCode: decision.primaryCode
        }
      };
    }

    return enhancedResponse;
  }

  /**
   * Extract codes from user message for bot action
   */
  extractCodesForAction(messageText) {
    const context = this.dataContextService.extractContext(messageText);
    
    return {
      codes: context.codes.map(c => ({ code: c.code, type: c.record._type })),
      codeCount: context.codes.length,
      hasCodes: context.codes.length > 0,
      primaryCode: context.codes[0]?.code || null,
      action: this._suggestActionForCodes(context.codes)
    };
  }

  /**
   * Search and link similar contacts across multiple projects
   */
  async findSimilarContacts(phone, excludeCode = null) {
    if (!this.isInitialized) return [];

    try {
      const matches = this.dataContextService.searchByField('Phone', phone, false);
      return matches
        .filter(m => m.code !== excludeCode)
        .sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
    } catch (error) {
      logger.error(`Failed to find similar contacts: ${error.message}`);
      return [];
    }
  }

  /**
   * Batch lookup multiple codes
   */
  batchLookup(codes) {
    const results = {};

    codes.forEach(code => {
      const record = this.dataContextService.getByCode(code);
      results[code] = record 
        ? {
            found: true,
            type: record._type,
            name: record._normalizedFields?.name || record.Name || 'N/A',
            record: record._metadata ? 
              { ...record._metadata } : 
              { code, type: record._type }
          }
        : { found: false };
    });

    return results;
  }

  /**
   * Get AI-ready context object for LLM processing
   */
  getAIContext(enrichedMessage) {
    const decision = this.getDecisionInput(enrichedMessage);

    return {
      message: enrichedMessage.body || enrichedMessage.text || '',
      hasContext: decision.hasRecords,
      records: decision.getAllRecords(),
      summary: this._buildContextSummary(decision),
      
      // For LLM instruction crafting
      systemPromptAdditions: this._generateSystemPromptAdditions(decision),
      contextForInstructions: {
        knownProperty: decision.getProperty() || null,
        knownContact: decision.getContact() || null,
        knownCode: decision.primaryCode || null
      }
    };
  }

  /**
   * Helper: Build context summary
   */
  _buildContextSummary(decision) {
    if (!decision.hasRecords) return null;

    const summary = [];

    if (decision.primaryRecord) {
      summary.push(`Reference found: ${decision.primaryCode} (${decision.primaryType})`);
    }

    if (decision.recordsByType.properties > 0) {
      summary.push(`${decision.recordsByType.properties} property record(s) referenced`);
    }

    if (decision.recordsByType.contacts > 0) {
      summary.push(`${decision.recordsByType.contacts} contact record(s) referenced`);
    }

    if (decision.recordsByType.financials > 0) {
      summary.push(`${decision.recordsByType.financials} financial record(s) referenced`);
    }

    return summary.join(' | ');
  }

  /**
   * Helper: Suggest bot action based on codes found
   */
  _suggestActionForCodes(codes) {
    if (codes.length === 0) return 'NO_ACTION';
    if (codes.length === 1) {
      const type = codes[0].record._type;
      if (type === 'PROPERTY') return 'SHOW_PROPERTY_DETAILS';
      if (type === 'CONTACT') return 'SHOW_CONTACT_DETAILS';
      if (type === 'FINANCIAL') return 'SHOW_FINANCIAL_DETAILS';
      return 'SHOW_RECORD_DETAILS';
    }
    return 'SHOW_MULTIPLE_RECORDS';
  }

  /**
   * Helper: Generate system prompt additions for context
   */
  _generateSystemPromptAdditions(decision) {
    const additions = [];

    if (decision.primaryType === 'PROPERTY') {
      additions.push(
        `The user has referenced property record ${decision.primaryCode}. ` +
        `Provide detailed property information including status and pricing.`
      );
    }

    if (decision.primaryType === 'CONTACT') {
      additions.push(
        `The user has referenced contact record ${decision.primaryCode}. ` +
        `Include relevant contact information in your response.`
      );
    }

    if (decision.totalRecords > 1) {
      additions.push(
        `User has referenced ${decision.totalRecords} records. ` +
        `Provide organized information about each.`
      );
    }

    return additions;
  }

  /**
   * Health check
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      dataContextLoaded: this.dataContextService.isLoaded,
      stats: this.dataContextService.getStats(),
      cacheSize: this.contextCache.size
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.contextCache.clear();
    logger.info('✅ AI Context cache cleared');
  }
}

export { AIContextIntegration };
