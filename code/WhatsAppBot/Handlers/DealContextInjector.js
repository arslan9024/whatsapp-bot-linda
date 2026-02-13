/**
 * Deal Context Injector
 * Enriches every WhatsApp message with deal-related context
 * Enables multi-scenario deal processing (buyer, seller, tenant, landlord, agent)
 */

import { logger } from '../Integration/Google/utils/logger.js';

class DealContextInjector {
  constructor(config = {}) {
    this.personaDetectionEngine = config.personaDetectionEngine;
    this.dealMatchingEngine = config.dealMatchingEngine;
    this.dealLifecycleManager = config.dealLifecycleManager;
    this.propertyEngine = config.propertyEngine;
    this.clientEngine = config.clientEngine;
  }

  /**
   * Inject deal context into message
   * Adds rich information about deals, properties, inquiries
   */
  async injectContext(msg, phoneNumber) {
    try {
      const context = {
        // Source account context
        sourceAccount: {
          botPhone: msg.accountContext?.botPhone,
          sessionId: msg.accountContext?.sessionId,
          displayName: msg.accountContext?.displayName
        },

        // Persona detection
        persona: null,
        personaRole: null,

        // Deal information
        relevantDeals: [],
        activeDeals: [],

        // Detected intent from message
        detectedIntent: null,
        detectedIssue: null,

        // Extracted data
        extracted: {
          mentionedPropertyIds: [],
          offeredPrice: null,
          viewingTime: null,
          questions: [],
          feedback: null,
          keywords: []
        },

        // AI suggestions
        suggestedAction: null,
        suggestedResponse: null,

        // Message classification
        messageType: 'general'  // inquiry, offer, viewing, feedback, question, etc.
      };

      // Detect persona
      const personaResult = await this.personaDetectionEngine.detectPersona(msg, phoneNumber);
      if (personaResult) {
        context.persona = personaResult.persona;
        context.personaRole = personaResult.detectedRole;
      }

      // Get relevant deals
      let clientObj = null;
      let agentObj = null;

      if (context.personaRole === 'buyer' || context.personaRole === 'tenant') {
        clientObj = this.clientEngine.getClientByPhone(phoneNumber);
        if (clientObj) {
          context.relevantDeals = this.dealLifecycleManager.getDealsForClient(clientObj.id) || [];
        }
      } else if (context.personaRole === 'agent' || context.personaRole === 'seller') {
        agentObj = context.persona;
        if (agentObj && agentObj.id) {
          context.relevantDeals = this.dealLifecycleManager.getActiveDeals()
            .filter(d => d.agentId === agentObj.id) || [];
        }
      }

      // Extract message content
      await this._extractMessageInfo(msg, context);

      // Classify message type
      context.messageType = this._classifyMessage(msg, context);

      // Generate suggestion based on persona and context
      context.suggestedAction = await this._suggestAction(context, clientObj, agentObj);

      // Store context
      msg.dealContext = context;

      return context;

    } catch (error) {
      logger.error(`❌ Error injecting deal context: ${error.message}`);
      msg.dealContext = { error: error.message };
      return msg.dealContext;
    }
  }

  /**
   * Extract information from message text
   * @private
   */
  async _extractMessageInfo(msg, context) {
    try {
      const text = msg.body.toLowerCase();

      // Check for price mentions
      const priceMatches = text.match(/(\d+[\d,]*)\s*(aed|k|million|m|\/month|\/yearly)/gi);
      if (priceMatches && priceMatches.length > 0) {
        const priceStr = priceMatches[0].replace(/[^\d]/g, '');
        context.extracted.offeredPrice = parseInt(priceStr);
      }

      // Check for property mentions
      const propertyKeywords = ['property', 'villa', 'apartment', 'flat', 'unit', '#prop'];
      for (const keyword of propertyKeywords) {
        if (text.includes(keyword)) {
          const regex = new RegExp(keyword + '-?(\\d+)', 'gi');
          const matches = text.matchAll(regex);
          for (const match of matches) {
            context.extracted.mentionedPropertyIds.push(`prop-${match[1]}`);
          }
        }
      }

      // Extract questions
      if (text.includes('?')) {
        const sentences = msg.body.split(/[.!?]/);
        context.extracted.questions = sentences
          .filter(s => s.includes('?'))
          .map(s => s.trim())
          .filter(s => s.length > 0);
      }

      // Extract keywords
      const dealKeywords = ['viewing', 'schedule', 'price', 'offer', 'sold', 'leased', 'interested', 'feedback', 'condition'];
      context.extracted.keywords = dealKeywords.filter(kw => text.includes(kw));

      // Detect viewing feedback
      const feedbackKeywords = {
        positive: ['love', 'great', 'perfect', 'excellent', 'interested', 'yes'],
        negative: ['not interested', 'not suitable', 'too expensive', 'too small', 'no']
      };

      for (const keyword of feedbackKeywords.positive) {
        if (text.includes(keyword)) {
          context.extracted.feedback = 'positive';
          break;
        }
      }

      for (const keyword of feedbackKeywords.negative) {
        if (text.includes(keyword)) {
          context.extracted.feedback = 'negative';
          break;
        }
      }

    } catch (error) {
      logger.error(`⚠️ Error extracting message info: ${error.message}`);
    }
  }

  /**
   * Classify message type
   * @private
   */
  _classifyMessage(msg, context) {
    const text = msg.body.toLowerCase();

    if (context.extracted.offeredPrice) return 'offer';
    if (text.includes('viewing') || text.includes('schedule') || text.includes('time')) return 'viewing';
    if (context.extracted.feedback) return 'feedback';
    if (text.includes('?') || context.extracted.questions.length > 0) return 'question';
    if (text.includes('interested') || text.includes('love') || text.includes('perfect')) return 'interest';
    if (text.includes('sold') || text.includes('deal closed')) return 'closure';

    return 'general';
  }

  /**
   * Suggest action based on context
   * @private
   */
  async _suggestAction(context, clientObj, agentObj) {
    try {
      const role = context.personaRole;
      const msgType = context.messageType;

      // Buyer/Tenant inquiry
      if ((role === 'buyer' || role === 'tenant') && msgType === 'inquiry') {
        return {
          action: 'find_matches',
          description: 'Search properties matching preferences',
          priority: 'high'
        };
      }

      // Interest expressed
      if ((role === 'buyer' || role === 'tenant') && msgType === 'interest') {
        return {
          action: 'schedule_viewing',
          description: 'Offer to schedule property viewing',
          priority: 'high'
        };
      }

      // Price offer submitted
      if (msgType === 'offer' && context.extracted.offeredPrice) {
        return {
          action: 'record_offer',
          description: `Record offer: ${context.extracted.offeredPrice} AED`,
          price: context.extracted.offeredPrice,
          priority: 'high'
        };
      }

      // Viewing feedback
      if (msgType === 'feedback' && context.extracted.feedback) {
        return {
          action: 'process_feedback',
          description: `Record ${context.extracted.feedback} viewing feedback`,
          feedback: context.extracted.feedback,
          priority: 'medium'
        };
      }

      return {
        action: 'continue_conversation',
        description: 'Continue conversation naturally',
        priority: 'low'
      };

    } catch (error) {
      logger.error(`⚠️ Error suggesting action: ${error.message}`);
      return null;
    }
  }
}

export default DealContextInjector;
