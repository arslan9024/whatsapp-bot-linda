/**
 * Conversation Intelligence Engine for WhatsApp Integration
 * Analyzes and learns from conversations for improved responses
 * 
 * Features:
 * - Conversation analysis and sentiment detection
 * - Topic extraction and categorization
 * - Intent recognition
 * - Learning from user interactions
 * - Response quality assessment
 * - Conversation patterns identification
 * - User preference tracking
 * - Knowledge base learning
 * 
 * Version: 1.0.0
 * Created: February 26, 2026
 * Phase: 6 M2 Module 1
 */

const logger = require('../Integration/Google/utils/logger');

class ConversationIntelligenceEngine {
  constructor(options = {}) {
    this.conversations = new Map();
    this.conversationPatterns = new Map();
    this.conversationHistory = [];  // ← ADD: For test compatibility
    this.contextWindow = options.contextWindow || 5;  // ← ADD: Context window size
    this.sentimentThresholds = options.sentimentThresholds || {
      positive: 0.5,
      negative: -0.5
    };
    this.learningEnabled = options.learningEnabled !== false;
    this.minContextWords = options.minContextWords || 3;
    this.topicKewords = this.initializeTopicKeywords();
    this.initialized = false;
  }

  /**
   * Initialize intelligence engine
   */
  async initialize() {
    try {
      this.initialized = true;
      logger.info('Conversation Intelligence Engine initialized successfully');
      return { success: true, message: 'Intelligence engine ready' };
    } catch (error) {
      logger.error('Failed to initialize intelligence engine', { error: error.message });
      throw error;
    }
  }

  /**
   * Process a single message and extract intelligence
   */
  async processMessage(message, botContext) {
    try {
      if (!message || !message.body) {
        return {
          success: true,
          isEmpty: true,
          messageId: message?.id,
          timestamp: new Date().toISOString(),
          contactId: botContext?.contact?.id
        };
      }

      const tokens = message.body.toLowerCase().split(/\s+/).filter(t => t.length > 0);
      const sentiment = this.analyzeSentiment([message]);
      const topics = this.extractTopics([message]);
      const intents = this.recognizeIntents([message]);

      return {
        success: true,
        isEmpty: false,
        messageId: message.id,
        timestamp: new Date().toISOString(),
        contactId: botContext?.contact?.id,
        analysis: {
          sentiment: sentiment.overall,
          sentimentScore: sentiment.score,
          topics,
          intents,
          wordCount: tokens.length
        },
        tokens,
        body: message.body,
        metadata: {
          from: botContext?.contact?.id,
          timestamp: new Date().toISOString(),
          messageId: message.id
        }
      };
    } catch (error) {
      logger.error('Error processing message', { error: error.message });
      return {
        success: false,
        error: error.message,
        messageId: message?.id
      };
    }
  }

  /**
   * Initialize topic keywords
   */
  initializeTopicKeywords() {
    return {
      greeting: ['hello', 'hi', 'hey', 'greetings', 'welcome', 'good morning', 'good afternoon', 'good evening'],
      contact: ['contact', 'phone', 'number', 'email', 'address', 'reach', 'call', 'message', 'whatsapp'],
      schedule: ['meeting', 'appointment', 'schedule', 'time', 'date', 'when', 'availability', 'book'],
      payment: ['payment', 'invoice', 'bill', 'cost', 'price', 'fee', 'charge', 'pay', 'transaction'],
      error: ['error', 'problem', 'issue', 'fail', 'not working', 'broken', 'crash', 'bug', 'wrong'],
      feedback: ['thank', 'great', 'awesome', 'good', 'excellent', 'hate', 'bad', 'terrible', 'poor'],
      technical: ['sync', 'database', 'server', 'connection', 'api', 'data', 'integration', 'system'],
      help: ['help', 'assist', 'support', 'guide', 'how to', 'tutorial', 'instructions', 'steps']
    };
  }

  /**
   * Analyze conversation
   */
  analyzeConversation(conversationId, messages) {
    try {
      const analysis = {
        conversationId,
        messageCount: messages.length,
        timestamp: new Date().toISOString(),
        sentiment: this.analyzeSentiment(messages),
        topics: this.extractTopics(messages),
        intents: this.recognizeIntents(messages),
        patterns: this.identifyPatterns(messages),
        keyPhrases: this.extractKeyPhrases(messages),
        engagement: this.calculateEngagement(messages),
        averageResponseTime: this.calculateAverageResponseTime(messages),
        summary: this.generateSummary(messages)
      };

      // Store conversation analysis
      this.conversations.set(conversationId, {
        messages,
        analysis,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      logger.info('Conversation analyzed', { conversationId, messageCount: messages.length });

      return {
        success: true,
        conversationId,
        analysis
      };
    } catch (error) {
      logger.error('Failed to analyze conversation', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze sentiment of messages
   * Handles both single message and array of messages
   */
  analyzeSentiment(messages) {
    // Handle both single message and array of messages
    const messageArray = Array.isArray(messages) ? messages : [messages];
    
    const sentiments = messageArray.map(msg => {
      const text = msg.text?.toLowerCase() || '';
      const words = text.split(/\s+/);

      let score = 0;
      let wordCount = 0;

      for (const word of words) {
        if (this.isPositiveWord(word)) {
          score += 1;
          wordCount++;
        } else if (this.isNegativeWord(word)) {
          score -= 1;
          wordCount++;
        }
      }

      const sentiment = wordCount > 0 ? score / wordCount : 0;

      return {
        messageId: msg.id,
        sentiment,
        score: score,
        wordCount,
        category: this.categorizeSentiment(sentiment)
      };
    });

    const averageSentiment = sentiments.reduce((sum, s) => sum + s.sentiment, 0) / sentiments.length;

    return {
      overall: this.categorizeSentiment(averageSentiment),
      score: averageSentiment.toFixed(2),
      details: sentiments,
      positive: sentiments.filter(s => s.category === 'positive').length,
      neutral: sentiments.filter(s => s.category === 'neutral').length,
      negative: sentiments.filter(s => s.category === 'negative').length
    };
  }

  /**
   * Extract topics from messages
   */
  extractTopics(messages) {
    const topics = {};
    const text = messages.map(m => m.text?.toLowerCase() || '').join(' ');

    for (const [topic, keywords] of Object.entries(this.topicKewords)) {
      const matches = keywords.filter(kw => text.includes(kw)).length;
      if (matches > 0) {
        topics[topic] = {
          count: matches,
          relevance: (matches / message.length).toFixed(2)
        };
      }
    }

    const sortedTopics = Object.entries(topics)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([topic, data]) => ({ topic, ...data }));

    return sortedTopics;
  }

  /**
   * Recognize intents from messages
   */
  recognizeIntents(messages) {
    const intents = [];

    for (const message of messages) {
      const text = message.text?.toLowerCase() || '';
      const detected = {
        messageId: message.id,
        intents: []
      };

      // Detect common intents
      if (/^(hello|hi|hey|greetings)/.test(text)) {
        detected.intents.push({ intent: 'greeting', confidence: 0.95 });
      }

      if (/\b(help|support|assist)\b/.test(text)) {
        detected.intents.push({ intent: 'help_request', confidence: 0.9 });
      }

      if (/\?$/.test(text) || text.includes('what') || text.includes('how')) {
        detected.intents.push({ intent: 'question', confidence: 0.85 });
      }

      if (/\b(confirm|yes|okay|ok)\b/.test(text)) {
        detected.intents.push({ intent: 'confirmation', confidence: 0.9 });
      }

      if (/\b(no|disagree|cancel)\b/.test(text)) {
        detected.intents.push({ intent: 'rejection', confidence: 0.9 });
      }

      if (detected.intents.length > 0) {
        intents.push(detected);
      }
    }

    return intents;
  }

  /**
   * Identify conversation patterns
   */
  identifyPatterns(messages) {
    const patterns = {
      conversationLength: messages.length,
      averageMessageLength: messages.reduce((sum, m) => sum + (m.text?.length || 0), 0) / messages.length,
      longestMessage: Math.max(...messages.map(m => m.text?.length || 0)),
      shortestMessage: Math.min(...messages.map(m => m.text?.length || 0)),
      totalCharacters: messages.reduce((sum, m) => sum + (m.text?.length || 0), 0),
      questionCount: messages.filter(m => m.text?.includes('?')).length,
      exclamationCount: messages.filter(m => m.text?.includes('!')).length,
      hasUrls: messages.some(m => /https?:\/\//.test(m.text || '')),
      hasEmojis: messages.some(m => /[\u{1F600}-\u{1F64F}]/u.test(m.text || '')),
      hasNumbers: messages.some(m => /\d+/.test(m.text || ''))
    };

    // Store pattern for learning
    if (this.learningEnabled) {
      this.conversationPatterns.set(Date.now().toString(), patterns);
    }

    return patterns;
  }

  /**
   * Extract key phrases from messages
   */
  extractKeyPhrases(messages) {
    const keyPhrases = [];
    const allText = messages.map(m => m.text || '').join(' ');
    const words = allText.toLowerCase().split(/\s+/);

    // Extract 2-3 word phrases that appear multiple times
    for (let i = 0; i < words.length - 2; i++) {
      const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      const existing = keyPhrases.find(kp => kp.phrase === phrase);

      if (existing) {
        existing.frequency++;
      } else if (words[i].length > 3 && words[i + 1].length > 3) {
        keyPhrases.push({ phrase, frequency: 1 });
      }
    }

    return keyPhrases
      .filter(kp => kp.frequency > 1)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  /**
   * Calculate engagement metrics
   */
  calculateEngagement(messages) {
    const totalMessages = messages.length;
    const userMessages = messages.filter(m => m.sender === 'user').length;
    const botMessages = messages.filter(m => m.sender === 'bot').length;

    return {
      totalMessages,
      userMessages,
      botMessages,
      exchangeRatio: totalMessages > 0 ? (userMessages / totalMessages).toFixed(2) : 0,
      isPaired: userMessages > 0 && botMessages > 0,
      isActive: totalMessages > 5
    };
  }

  /**
   * Calculate average response time
   */
  calculateAverageResponseTime(messages) {
    let totalTime = 0;
    let responseCount = 0;

    for (let i = 0; i < messages.length - 1; i++) {
      if (messages[i].sender === 'user' && messages[i + 1].sender === 'bot') {
        const time = new Date(messages[i + 1].timestamp) - new Date(messages[i].timestamp);
        totalTime += time;
        responseCount++;
      }
    }

    return responseCount > 0 ? Math.round(totalTime / responseCount) : 0;
  }

  /**
   * Generate conversation summary
   */
  generateSummary(messages) {
    const topics = this.extractTopics(messages);
    const intents = this.recognizeIntents(messages);
    const mainTopic = topics.length > 0 ? topics[0].topic : 'unknown';
    const mainIntent = intents.length > 0 ? intents[0].intents[0]?.intent || 'unknown' : 'unknown';

    return {
      messageCount: messages.length,
      mainTopic,
      mainIntent,
      duration: messages.length > 0 
        ? new Date(messages[messages.length - 1].timestamp) - new Date(messages[0].timestamp)
        : 0,
      topicCount: topics.length,
      intentCount: intents.length
    };
  }

  /**
   * Add message to conversation history
   */
  async addToHistory(message, botContext) {
    try {
      const conversationId = botContext?.contact?.id || 'unknown';
      const conversation = this.conversations.get(conversationId) || {
        messages: [],
        createdAt: new Date().toISOString()
      };

      conversation.messages.push({
        ...message,
        timestamp: new Date().toISOString(),
        from: botContext?.contact?.id
      });

      this.conversations.set(conversationId, conversation);
      logger.info('Added message to history', { conversationId });

      return { success: true, conversationId };
    } catch (error) {
      logger.error('Failed to add to history', { error: error.message });
      throw error;
    }
  }

  /**
   * Detect urgency level in message
   */
  async detectUrgency(message) {
    try {
      if (!message || !message.body) {
        return { urgency: 'normal', score: 0 };
      }

      const text = message.body.toLowerCase();
      const urgencyKeywords = {
        critical: ['urgent', 'emergency', 'critical', 'asap', 'immediately', 'now', 'crisis'],
        high: ['important', 'soon', 'quickly', 'hurry', 'rush', 'serious'],
        normal: ['regular', 'standard', 'whenever', 'no rush']
      };

      let urgency = 'normal';
      let score = 0;

      for (const word of urgencyKeywords.critical) {
        if (text.includes(word)) {
          urgency = 'critical';
          score = 0.9;
          break;
        }
      }

      if (urgency === 'normal') {
        for (const word of urgencyKeywords.high) {
          if (text.includes(word)) {
            urgency = 'high';
            score = 0.6;
            break;
          }
        }
      }

      return { urgency, score, text };
    } catch (error) {
      logger.error('Failed to detect urgency', { error: error.message });
      return { urgency: 'normal', score: 0, error: error.message };
    }
  }

  /**
   * Extract entities from message (names, numbers, emails, etc.)
   */
  async extractEntities(message) {
    try {
      if (!message || !message.body) {
        return { entities: [], names: [], emails: [], phones: [] };
      }

      const text = message.body;
      const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
      const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
      const nameRegex = /\b[A-Z][a-z]+\s[A-Z][a-z]+\b/g;

      const emails = text.match(emailRegex) || [];
      const phones = text.match(phoneRegex) || [];
      const names = text.match(nameRegex) || [];

      const entities = [
        ...names.map(n => ({ type: 'person', value: n })),
        ...emails.map(e => ({ type: 'email', value: e })),
        ...phones.map(p => ({ type: 'phone', value: p }))
      ];

      return {
        entities,
        names,
        emails,
        phones,
        entityCount: entities.length
      };
    } catch (error) {
      logger.error('Failed to extract entities', { error: error.message });
      return { entities: [], names: [], emails: [], phones: [], error: error.message };
    }
  }

  /**
   * Detect intent of message (simplified version)
   */
  async detectIntent(message) {
    try {
      if (!message || !message.body) {
        return { intent: 'unknown', confidence: 0 };
      }

      const text = message.body.toLowerCase();
      const intents = this.recognizeIntents([message]);

      if (intents.detected && intents.detected.length > 0) {
        return {
          intent: intents.detected[0],
          intents: intents.detected,
          confidence: 0.8,
          text
        };
      }

      return { intent: 'unknown', confidence: 0, text };
    } catch (error) {
      logger.error('Failed to detect intent', { error: error.message });
      return { intent: 'unknown', confidence: 0, error: error.message };
    }
  }

  /**
   * Analyze sentiment of a message synchronously and return result
   */
  async getSentimentAnalysis(message) {
    try {
      if (!message || !message.body) {
        return { sentiment: 'neutral', score: 0 };
      }

      const result = this.analyzeSentiment([message]);
      return {
        sentiment: result.overall,
        score: parseFloat(result.score),
        details: result.details?.[0],
        category: result.overall
      };
    } catch (error) {
      logger.error('Failed to analyze sentiment', { error: error.message });
      return { sentiment: 'neutral', score: 0, error: error.message };
    }
  }

  /**
   * Learn from conversation feedback
   */
  learnFromFeedback(conversationId, feedback) {
    try {
      if (!this.learningEnabled) {
        return { success: false, message: 'Learning is disabled' };
      }

      const conversation = this.conversations.get(conversationId);
      if (!conversation) {
        throw new Error(`Conversation not found: ${conversationId}`);
      }

      conversation.feedback = {
        rating: feedback.rating,
        comment: feedback.comment,
        timestamp: new Date().toISOString(),
        helpful: feedback.helpful || false,
        improvements: feedback.improvements || []
      };

      logger.info('Learning from feedback', { conversationId, rating: feedback.rating });

      return { success: true, conversationId };
    } catch (error) {
      logger.error('Failed to learn from feedback', { error: error.message });
      throw error;
    }
  }

  /**
   * Get conversation insights
   */
  getConversationInsights(conversationId) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return null;
    }

    return {
      conversationId,
      analysis: conversation.analysis,
      feedback: conversation.feedback,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt
    };
  }

  /**
   * Check if word is positive
   */
  isPositiveWord(word) {
    const positiveWords = ['good', 'great', 'excellent', 'awesome', 'perfect', 'thank', 'thanks', 'happy', 'love', 'amazing'];
    return positiveWords.includes(word);
  }

  /**
   * Check if word is negative
   */
  isNegativeWord(word) {
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'poor', 'worst', 'fail', 'error', 'problem', 'issue'];
    return negativeWords.includes(word);
  }

  /**
   * Categorize sentiment
   */
  categorizeSentiment(score) {
    if (score >= this.sentimentThresholds.positive) {
      return 'positive';
    }

    if (score <= this.sentimentThresholds.negative) {
      return 'negative';
    }

    return 'neutral';
  }

  /**
   * Get conversation history
   */
  getConversationHistory(conversationId = null) {
    try {
      if (conversationId) {
        const conversation = this.conversations.get(conversationId);
        return conversation ? conversation.messages || [] : [];
      }
      
      // Return all conversation messages
      const allMessages = [];
      for (const conversation of this.conversations.values()) {
        if (conversation.messages) {
          allMessages.push(...conversation.messages);
        }
      }
      return allMessages;
    } catch (error) {
      logger.error('Failed to get conversation history', { error: error.message });
      return [];
    }
  }

  /**
   * Get user profile/information from conversation history
   */
  getUserProfile(userId) {
    try {
      const conversation = this.conversations.get(userId);
      if (!conversation) {
        return {
          userId,
          conversationCount: 0,
          messageCount: 0,
          preferences: {},
          lastInteraction: null
        };
      }

      const messages = conversation.messages || [];
      return {
        userId,
        conversationCount: 1,
        messageCount: messages.length,
        preferences: conversation.preferences || {},
        lastInteraction: messages.length > 0 ? messages[messages.length - 1].timestamp : null,
        createdAt: conversation.createdAt
      };
    } catch (error) {
      logger.error('Failed to get user profile', { error: error.message });
      return { userId, conversationCount: 0, messageCount: 0, preferences: {}, lastInteraction: null };
    }
  }

  /**
   * Get learning statistics
   */
  getLearningStats() {
    const allConversations = Array.from(this.conversations.values());
    const conversationsWithFeedback = allConversations.filter(c => c.feedback).length;
    const averageRating = allConversations.reduce((sum, c) => sum + (c.feedback?.rating || 0), 0) / allConversations.length;

    return {
      totalConversations: this.conversations.size,
      conversationsAnalyzed: allConversations.length,
      conversationsWithFeedback,
      averageRating: averageRating.toFixed(2),
      learningEnabled: this.learningEnabled,
      patternsLearned: this.conversationPatterns.size
    };
  }

  /**
   * Get engine statistics
   */
  getEngineStats() {
    return {
      conversationsStored: this.conversations.size,
      patternsIdentified: this.conversationPatterns.size,
      topicsTracked: Object.keys(this.topicKewords).length,
      learningStats: this.getLearningStats()
    };
  }

  /**
   * Check if engine is ready (async for compatibility)
   */
  async isReady() {
    return new Promise(resolve => {
      setTimeout(() => resolve(this.initialized), 10);
    });
  }

  /**
   * Get conversation topic for a contact
   */
  getConversationTopic(contactId) {
    if (!contactId) return 'general';
    
    const conversation = this.conversations.get(contactId);
    if (conversation && conversation.topic) {
      return conversation.topic;
    }
    
    return 'general';
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
    this.conversations.clear();
    return { success: true, cleared: true };
  }
}

module.exports = ConversationIntelligenceEngine;
