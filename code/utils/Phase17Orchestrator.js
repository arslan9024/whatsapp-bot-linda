/**
 * ============================================
 * PHASE 17 CONVERSATION HANDLING ORCHESTRATOR
 * ============================================
 * 
 * Central hub that integrates all Phase 17 services
 * into the message processing pipeline.
 * 
 * Import this in index.js and call initialize() at startup.
 */

import { messagePersistenceService } from '../Services/MessagePersistenceService.js';
import { messageDeduplicator } from '../utils/MessageDeduplicator.js';
import { textNormalizationService } from '../Services/TextNormalizationService.js';
import { advancedEntityExtractor } from '../Services/AdvancedEntityExtractor.js';
import { emojiReactionService } from '../Services/EmojiReactionService.js';
import { actionAggregator } from '../Services/ActionAggregator.js';
import { conversationContextService } from '../Services/ConversationContextService.js';
import { advancedResponseGenerator } from '../Services/AdvancedResponseGenerator.js';
import { messageValidationService, rateLimiter } from '../Services/MessageValidationService.js';
import crypto from 'crypto';

export class Phase17Orchestrator {
  constructor() {
    this.persistence = messagePersistenceService;
    this.deduplicator = messageDeduplicator;
    this.normalizer = textNormalizationService;
    this.extractor = advancedEntityExtractor;
    this.emotions = emojiReactionService;
    this.actions = actionAggregator;
    this.context = conversationContextService;
    this.responses = advancedResponseGenerator;
    this.validator = messageValidationService;
    this.rateLimiter = rateLimiter;
    
    this.stats = {
      messagesProcessed: 0,
      duplicatesDetected: 0,
      rateLimitHits: 0,
      validationErrors: 0,
    };
  }

  /**
   * Initialize all Phase 17 services
   */
  async initialize() {
    try {
      console.log('\n🚀 Initializing Phase 17: Comprehensive Conversation Handling...\n');

      // Initialize persistence
      const persistenceOk = await this.persistence.initialize();
      console.log(persistenceOk ? '✅ Persistence' : '⚠️ Persistence (fallback mode)');

      // Start periodic cleanups
      this.startPeriodicMaintenance();

      console.log('✅ Phase 17 Orchestrator initialized successfully\n');
      return true;
    } catch (error) {
      console.error('❌ Phase 17 Orchestrator initialization error:', error.message);
      return false;
    }
  }

  /**
   * Process message through full pipeline
   */
  async processMessage(msg) {
    try {
      const startTime = Date.now();
      const conversationId = this.generateConversationId(msg.from);

      // ===== VALIDATION =====
      msg.validation = this.validator.validate(msg);
      if (!msg.validation.isValid) {
        this.stats.validationErrors++;
        console.warn('⚠️ Message validation failed:', msg.validation.errors);
        return null;
      }

      // ===== RATE LIMITING =====
      const rateLimitCheck = this.rateLimiter.canSend(msg.from);
      if (!rateLimitCheck.allowed) {
        this.stats.rateLimitHits++;
        console.warn(`⚠️ Rate limit hit (${rateLimitCheck.reason})`);
        
        // Queue for retry
        this.rateLimiter.queueForRetry(msg.from, msg);
        return null;
      }

      // ===== DEDUPLICATION =====
      const isDuplicate = this.deduplicator.isDuplicate(
        msg.from,
        msg.body || '',
        msg.timestamp
      );

      if (isDuplicate) {
        this.stats.duplicatesDetected++;
        console.log('⏭️  Duplicate message skipped');
        return null;
      }

      this.deduplicator.register(msg.from, msg.body || '', msg.timestamp);

      // ===== TEXT NORMALIZATION =====
      const normalizedBody = msg.body 
        ? this.normalizer.normalize(msg.body)
        : msg.body;

      const processedMsg = {
        ...msg,
        messageId: msg.id || crypto.randomUUID(),
        conversationId,
        body: normalizedBody,
        timestamp: msg.timestamp || new Date(),
        fromNumber: msg.from,
        toNumber: msg.to,
        type: msg.type,
        language: this.normalizer.detectLanguage(normalizedBody),
        isRTL: this.normalizer.isRTL(normalizedBody),
        extractedEmoji: this.normalizer.extractEmoji(normalizedBody),
      };

      // ===== ENTITY EXTRACTION =====
      processedMsg.entities = this.extractor.extractAll(normalizedBody, msg.from);
      processedMsg.entities.confidence = this.extractor.getConfidenceScore(processedMsg.entities);

      // ===== SENTIMENT & INTENT ANALYSIS =====
      if (msg.type === 'chat' || msg.type === 'text') {
        processedMsg.sentiment = this.analyzeSentiment(normalizedBody);
        processedMsg.intent = this.analyzeIntent(normalizedBody);
      }

      // ===== PERSISTENCE =====
      await this.persistence.saveMessage(processedMsg);

      // ===== CONTEXT UPDATE =====
      this.context.updateContext(msg.from, processedMsg);

      // ===== RESPONSE GENERATION =====
      const msgContext = this.context.getContext(msg.from);
      const suggestedResponse = await this.responses.generateResponse(
        processedMsg,
        msgContext
      );
      processedMsg.suggestedResponse = suggestedResponse;

      // ===== DEDUPLICATION REGISTRATION =====
      this.deduplicator.register(msg.from, msg.body || '', msg.timestamp);

      // ===== STATS =====
      this.stats.messagesProcessed++;
      const processingTime = Date.now() - startTime;
      processedMsg.processingTime = processingTime;

      // Log summary
      console.log(`✅ Message processed in ${processingTime}ms`);
      if (processedMsg.entities.phones.length > 0) {
        console.log(`   📞 ${processedMsg.entities.phones.length} phone(s) extracted`);
      }
      if (processedMsg.entities.currencies.length > 0) {
        console.log(`   💰 ${processedMsg.entities.currencies.length} price(s) extracted`);
      }
      if (processedMsg.sentiment) {
        console.log(`   💭 Sentiment: ${processedMsg.sentiment}`);
      }

      return processedMsg;
    } catch (error) {
      console.error('❌ Message processing error:', error.message);
      console.error(error.stack);
      return null;
    }
  }

  /**
   * Handle message action (reaction, edit, delete, etc)
   */
  async handleAction(actionData) {
    try {
      const action = {
        actionId: crypto.randomUUID(),
        messageId: actionData.messageId,
        conversationId: actionData.conversationId,
        actionType: actionData.actionType,
        actor: actionData.actor,
        data: actionData.data || {},
        timestamp: actionData.timestamp || new Date(),
      };

      // Save action
      await this.persistence.saveAction(action);

      // Register with aggregator
      this.actions.registerAction(action);

      // Handle specific action types
      if (actionData.actionType === 'reaction') {
        this.emotions.recordReaction(
          actionData.messageId,
          actionData.data.emoji,
          actionData.actor,
          actionData.timestamp
        );
      }

      console.log(`✅ Action handled: ${actionData.actionType} on message ${actionData.messageId}`);
      return action;
    } catch (error) {
      console.error('❌ Action handling error:', error.message);
      return null;
    }
  }

  /**
   * Simple sentiment analysis
   */
  analyzeSentiment(text) {
    const positiveWords = ['good', 'great', 'awesome', 'excellent', 'yes', 'thank', 'love', '👍', '😊', '❤️', '🙏'];
    const negativeWords = ['bad', 'terrible', 'awful', 'no', 'hate', 'problem', '😠', '😭', '❌'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(w => lowerText.includes(w)).length;
    const negativeCount = negativeWords.filter(w => lowerText.includes(w)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Simple intent analysis
   */
  analyzeIntent(text) {
    const lowerText = text.toLowerCase();

    if (/hello|hi|hey|greet/.test(lowerText)) return 'greeting';
    if (/villa|apartment|property|unit|bedroom/.test(lowerText)) return 'property_query';
    if (/\?/.test(text)) return 'question';
    if (/thank|appreciate|thank you/.test(lowerText)) return 'appreciation';
    if (/problem|issue|complain|angry/.test(lowerText)) return 'complaint';
    if (/contact|reach|call|connect/.test(lowerText)) return 'contact_request';
    return 'general';
  }

  /**
   * Generate conversation ID from sender
   */
  generateConversationId(phoneNumber) {
    // Format: CONV_<phone>_<date>
    const date = new Date().toISOString().split('T')[0];
    return `CONV_${phoneNumber}_${date}`;
  }

  /**
   * Start periodic maintenance tasks
   */
  startPeriodicMaintenance() {
    try {
      // Cleanup interval: every 5 minutes
      setInterval(() => {
        const dedupCleaned = this.deduplicator.cleanup();
        const emotionsCleaned = this.emotions.cleanup();
        const actionsCleaned = this.actions.cleanup();
        const contextCleaned = this.context.cleanup();

        if (dedupCleaned + emotionsCleaned + actionsCleaned + contextCleaned > 0) {
          console.log(`🧹 Maintenance: Cleaned ${dedupCleaned + emotionsCleaned + actionsCleaned + contextCleaned} expired entries`);
        }
      }, 300000);

      // Process queued messages: every 10 seconds
      setInterval(() => {
        const processed = this.rateLimiter.processQueue();
        if (processed > 0) {
          console.log(`🔄 Rate limiter: Processed ${processed} queued messages`);
        }
      }, 10000);
    } catch (error) {
      console.error('❌ Maintenance setup error:', error.message);
    }
  }

  /**
   * Get comprehensive statistics
   */
  getStats() {
    return {
      processing: this.stats,
      persistence: this.persistence.getStats(),
      deduplicator: this.deduplicator.getStats(),
      rateLimiter: this.rateLimiter.getStats(),
      emotions: this.emotions.getStats(),
      context: this.context.getStats(),
      actions: this.actions.getStats(),
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      return {
        status: 'healthy',
        timestamp: new Date(),
        services: {
          persistence: this.persistence.isConnected ? 'connected' : 'disconnected',
          deduplicator: 'active',
          normalizer: 'active',
          extractor: 'active',
          emotions: 'active',
          actions: 'active',
          context: 'active',
          responses: 'active',
          validator: 'active',
          rateLimiter: 'active',
        },
        stats: this.getStats(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }
}

// Export singleton
export const phase17Orchestrator = new Phase17Orchestrator();
