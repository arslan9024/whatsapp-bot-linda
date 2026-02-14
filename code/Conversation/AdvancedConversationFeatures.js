/**
 * Advanced Conversation Features
 * Intelligent conversation management with context, memory, and adaptive responses
 * 
 * Features:
 * - Conversation context tracking
 * - Multi-turn conversation memory
 * - Intent recognition
 * - Sentiment analysis
 * - Intelligent response generation
 * - Conversation flow control
 */

import fs from 'fs';
import getSafeLogger from '../utils/SafeLogger.js';

const logger = getSafeLogger('AdvancedConversationFeatures');

class AdvancedConversationFeatures {
  constructor(config = {}) {
    this.conversationPath = config.conversationPath || './code/Data/conversations.json';
    this.contextWindow = config.contextWindow || 5; // previous messages

    this.activeConversations = new Map(); // userId → conversation
    this.conversationTemplates = {
      greeting: ['Hi there! 👋', 'Hello! How can I help?', 'Welcome! What can I do for you?'],
      clarification: ['Could you clarify that?', 'I didn\'t quite understand. Can you rephrase?', 'Help me understand better...'],
      suggestion: ['Would you like to...?', 'I suggest trying...', 'You might want to consider...'],
      confirmation: ['Did that help?', 'Is there anything else?', 'Would you like more information?']
    };

    this.intents = {
      greeting: ['hi', 'hello', 'hey', 'good morning', 'good afternoon'],
      property_query: ['property', 'real estate', 'apartment', 'villa', 'rent', 'buy', 'sell'],
      help: ['help', 'assist', 'support', 'question', 'how to', 'guide'],
      complaint: ['problem', 'issue', 'broken', 'error', 'not working', 'complain'],
      feedback: ['feedback', 'suggestion', 'improve', 'better', 'comment'],
      goodbye: ['bye', 'goodbye', 'see you', 'done', 'exit', 'quit']
    };

    this.sentimentKeywords = {
      positive: ['great', 'good', 'excellent', 'happy', 'satisfied', 'perfect'],
      negative: ['bad', 'awful', 'terrible', 'angry', 'frustrated', 'hate'],
      neutral: ['ok', 'fine', 'neutral', 'okay', 'alright']
    };
  }

  /**
   * Initialize conversation features
   */
  async initialize() {
    try {
      if (fs.existsSync(this.conversationPath)) {
        const data = JSON.parse(fs.readFileSync(this.conversationPath, 'utf8'));
        if (data.conversations) {
          for (const [userId, conv] of Object.entries(data.conversations)) {
            this.activeConversations.set(userId, conv);
          }
        }
      }
      logger.info('✅ Advanced Conversation Features initialized');
      return true;
    } catch (error) {
      logger.error(`❌ Failed to initialize AdvancedConversationFeatures: ${error.message}`);
      return false;
    }
  }

  /**
   * Process message with full conversation context
   */
  processMessage(userId, messageBody) {
    try {
      // Get or create conversation
      let conversation = this.activeConversations.get(userId);
      if (!conversation) {
        conversation = this._createConversation(userId);
      }

      // Detect intent
      const intent = this._detectIntent(messageBody);

      // Analyze sentiment
      const sentiment = this._analyzeSentiment(messageBody);

      // Extract entities
      const entities = this._extractEntities(messageBody);

      // Add to conversation history
      const messageEntry = {
        timestamp: new Date().toISOString(),
        content: messageBody,
        intent,
        sentiment,
        entities
      };

      conversation.messages.push(messageEntry);
      conversation.lastMessageTime = new Date().toISOString();
      conversation.messageCount++;

      // Update conversation state
      this._updateConversationState(conversation, intent, sentiment);

      this.activeConversations.set(userId, conversation);

      return {
        conversationId: conversation.id,
        intent,
        sentiment,
        entities,
        context: this._getConversationContext(conversation),
        suggestedResponses: this._generateSuggestedResponses(conversation, intent)
      };
    } catch (error) {
      logger.error(`❌ Error processing message: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate intelligent responses based on context
   */
  generateResponse(userId, messageBody, responseType = 'auto') {
    try {
      const conversation = this.activeConversations.get(userId);
      if (!conversation) {
        return this._getTemplate('greeting')[0];
      }

      const messageData = this.processMessage(userId, messageBody);
      const intent = messageData.intent;

      let response = '';

      if (responseType === 'auto') {
        // Generate response based on intent
        switch (intent) {
          case 'greeting':
            response = this._getTemplate('greeting');
            break;
          case 'help':
            response = this._generateHelpResponse(conversation);
            break;
          case 'property_query':
            response = this._generatePropertyResponse(conversation, messageData.entities);
            break;
          case 'feedback':
            response = this._generateFeedbackAck();
            break;
          case 'goodbye':
            response = 'Goodbye! Feel free to reach out anytime. 👋';
            break;
          default:
            response = this._generateSmartResponse(conversation, messageData);
        }
      }

      // Store response in conversation
      conversation.responses.push({
        timestamp: new Date().toISOString(),
        content: response,
        intent
      });

      return Array.isArray(response) ? response[0] : response;
    } catch (error) {
      logger.error(`❌ Error generating response: ${error.message}`);
      return 'I apologize, I encountered an error. Please try again.';
    }
  }

  /**
   * Get conversation summary
   */
  getConversationSummary(userId) {
    try {
      const conversation = this.activeConversations.get(userId);
      if (!conversation) return null;

      const recentMessages = conversation.messages.slice(-this.contextWindow);
      const intents = {};
      const sentiments = {};

      for (const msg of conversation.messages) {
        intents[msg.intent] = (intents[msg.intent] || 0) + 1;
        sentiments[msg.sentiment] = (sentiments[msg.sentiment] || 0) + 1;
      }

      return {
        userId,
        conversationId: conversation.id,
        startTime: conversation.startTime,
        lastMessageTime: conversation.lastMessageTime,
        messageCount: conversation.messageCount,
        intents,
        sentiments,
        state: conversation.state,
        recentMessages: recentMessages.map(m => ({
          content: m.content,
          intent: m.intent,
          sentiment: m.sentiment
        })),
        suggestedAction: this._suggestNextAction(conversation)
      };
    } catch (error) {
      logger.error(`❌ Error getting conversation summary: ${error.message}`);
      return null;
    }
  }

  /**
   * End conversation and archive
   */
  endConversation(userId) {
    try {
      const conversation = this.activeConversations.get(userId);
      if (!conversation) return { success: false, error: 'No active conversation' };

      conversation.endTime = new Date().toISOString();
      conversation.archived = true;

      // Persist before removing
      this._persistConversations();

      this.activeConversations.delete(userId);

      logger.info(`✅ Conversation ended for user ${userId}`);
      return { success: true, conversationId: conversation.id };
    } catch (error) {
      logger.error(`❌ Error ending conversation: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get conversation history
   */
  getConversationHistory(userId, limit = 50) {
    try {
      const conversation = this.activeConversations.get(userId);
      if (!conversation) return [];

      return conversation.messages.slice(-limit).map(msg => ({
        timestamp: msg.timestamp,
        content: msg.content,
        intent: msg.intent,
        sentiment: msg.sentiment
      }));
    } catch (error) {
      logger.error(`❌ Error getting conversation history: ${error.message}`);
      return [];
    }
  }

  /**
   * Persist conversations to storage
   */
  async _persistConversations() {
    try {
      const data = {
        conversations: {},
        lastUpdated: new Date().toISOString()
      };

      for (const [userId, conversation] of this.activeConversations) {
        data.conversations[userId] = conversation;
      }

      fs.writeFileSync(this.conversationPath, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error(`❌ Failed to persist conversations: ${error.message}`);
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  _createConversation(userId) {
    return {
      id: `conv-${Date.now()}`,
      userId,
      startTime: new Date().toISOString(),
      lastMessageTime: new Date().toISOString(),
      messageCount: 0,
      messages: [],
      responses: [],
      state: 'greeting_pending'
    };
  }

  _detectIntent(messageBody) {
    const text = messageBody.toLowerCase();

    for (const [intent, keywords] of Object.entries(this.intents)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return intent;
      }
    }

    return 'general_inquiry';
  }

  _analyzeSentiment(messageBody) {
    const text = messageBody.toLowerCase();
    let sentiment = 'neutral';

    for (const [sent, keywords] of Object.entries(this.sentimentKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        sentiment = sent;
        break;
      }
    }

    return sentiment;
  }

  _extractEntities(messageBody) {
    const entities = {
      locations: [],
      propertyTypes: [],
      prices: [],
      dateReferences: []
    };

    // Extract property types
    const propertyKeywords = ['apartment', 'villa', 'townhouse', 'penthouse', 'flat', 'condo'];
    propertyKeywords.forEach(prop => {
      if (messageBody.toLowerCase().includes(prop)) {
        entities.propertyTypes.push(prop);
      }
    });

    // Extract price references
    const priceMatch = messageBody.match(/(\d+,?\d*)\s*(k|m|aed|dhs)?/gi);
    if (priceMatch) {
      entities.prices = priceMatch;
    }

    return entities;
  }

  _updateConversationState(conversation, intent, sentiment) {
    if (sentiment === 'negative') {
      conversation.state = 'needs_assistance';
    } else if (intent === 'property_query') {
      conversation.state = 'showing_interest';
    } else if (intent === 'greeting') {
      conversation.state = 'interacting';
    }
  }

  _getConversationContext(conversation) {
    const recentMessages = conversation.messages.slice(-this.contextWindow);
    return {
      previousMessagesCount: conversation.messages.length,
      recent: recentMessages.map(m => ({ content: m.content, intent: m.intent })),
      totalSentiment: this._calculateOverallSentiment(conversation)
    };
  }

  _calculateOverallSentiment(conversation) {
    const sentiments = conversation.messages.map(m => m.sentiment);
    const positive = sentiments.filter(s => s === 'positive').length;
    const negative = sentiments.filter(s => s === 'negative').length;

    if (positive > negative) return 'positive';
    if (negative > positive) return 'negative';
    return 'neutral';
  }

  _generateSuggestedResponses(conversation, intent) {
    const suggestions = [];

    if (intent === 'property_query') {
      suggestions.push('Would you like to see available properties?');
      suggestions.push('What is your budget range?');
      suggestions.push('When are you looking to move?');
    } else if (intent === 'help') {
      suggestions.push('I can help with property searches.');
      suggestions.push('Would you like to schedule a viewing?');
    }

    return suggestions;
  }

  _generateSmartResponse(conversation, messageData) {
    const state = conversation.state;

    if (state === 'needs_assistance') {
      return 'I apologize for any inconvenience. How can I assist you better?';
    }

    if (messageData.entities.propertyTypes.length > 0) {
      return `Great! I found several ${messageData.entities.propertyTypes[0]}s available. Would you like to know more?`;
    }

    return this._getTemplate('clarification')[0];
  }

  _generateHelpResponse(conversation) {
    return `I can help you with:\n1. Finding properties\n2. Scheduling viewings\n3. Getting information\n\nWhat would you like to do?`;
  }

  _generatePropertyResponse(conversation, entities) {
    let response = 'Let me help you find the perfect property';

    if (entities.propertyTypes.length > 0) {
      response += ` (${entities.propertyTypes.join(', ')})`;
    }

    response += '. ';

    if (entities.prices.length > 0) {
      response += `In your budget range? Let me search...`;
    } else {
      response += 'What is your budget?';
    }

    return response;
  }

  _generateFeedbackAck() {
    return 'Thank you for your feedback! We appreciate your input and will work to improve.';
  }

  _suggestNextAction(conversation) {
    const lastMessage = conversation.messages[conversation.messages.length - 1];

    if (lastMessage.intent === 'property_query') {
      return 'Schedule a property viewing';
    } else if (lastMessage.intent === 'feedback') {
      return 'Review feedback and improve';
    } else if (lastMessage.intent === 'complaint') {
      return 'Escalate to support team';
    }

    return 'Continue conversation';
  }

  _getTemplate(type) {
    return this.conversationTemplates[type] || ['How can I help?'];
  }
}

export default AdvancedConversationFeatures;
