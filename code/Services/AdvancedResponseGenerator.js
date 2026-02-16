/**
 * ============================================
 * ADVANCED RESPONSE GENERATOR (Phase 17)
 * ============================================
 * 
 * Multi-layer response generation with context awareness,
 * template selection, entity injection, and fallback strategies.
 */

export class AdvancedResponseGenerator {
  constructor() {
    this.templates = {
      greeting: [
        'Hello! 👋 How can I help you today?',
        'Hi there! What can I do for you?',
        'Welcome! 😊 How may I assist?',
      ],
      question_confirmation: [
        'I understand you\'re asking about {topic}. Is that correct?',
        'So you need information about {topic}?',
        'You\'re interested in {topic}, right?',
      ],
      property_query: [
        '🏠 {property_type} in {project} with {bedrooms} bedrooms?\nPrice range: AED {budget}',
        'Looking for a {property_type} in {project}?\nI can help find something suitable.',
        '{property_type} units in {project} are available!\nLet me get you details.',
      ],
      contact_suggestion: [
        'Would you like me to connect you with {contact_name}?\nPhone: {phone}',
        'I can arrange a meeting with {contact_name} for you.\nContact: {phone}',
        '{contact_name} may be able to help.\nReach out: {phone}',
      ],
      appreciation: [
        'Thank you! 😊 Happy to help.',
        'You\'re welcome! Let me know if you need anything else.',
        'Glad I could assist! 🙌',
      ],
      apology: [
        'I apologize. 😔 Let me help you figure this out.',
        'Sorry to hear that. How can I make it right?',
        'My apologies. What can I do to help?',
      ],
      clarification: [
        'I didn\'t quite understand. Could you clarify?',
        'Can you give me more details about that?',
        'I need a bit more information. Can you explain further?',
      ],
      escalation: [
        'Let me connect you with a specialist who can better help.',
        'I\'ll escalate this to our team for proper assistance.',
        'Please wait while I find the right person to help you.',
      ],
    };

    this.fallbackResponses = [
      'I\'m here to help! Can you tell me more?',
      'Let me look into that for you.',
      'I understand. How else can I assist?',
      'Thanks for reaching out. What\'s your main concern?',
    ];
  }

  /**
   * Generate response based on message and context
   */
  async generateResponse(message, context = {}) {
    try {
      // Layer 1: Check if context has suggestion
      if (context.suggestedResponse && context.responseConfidence > 0.75) {
        return {
          text: context.suggestedResponse,
          confidence: context.responseConfidence,
          source: 'context',
        };
      }

      // Layer 2: Intent-based template selection
      let response = null;
      
      if (message.intent === 'greeting') {
        response = this.selectRandom(this.templates.greeting);
      } else if (message.intent === 'property_query') {
        response = this.injectEntities(
          this.selectRandom(this.templates.property_query),
          message.entities
        );
      } else if (message.intent === 'question') {
        response = this.injectEntities(
          this.selectRandom(this.templates.question_confirmation),
          { topic: message.topic || 'that topic' }
        );
      } else if (message.intent === 'appreciation') {
        response = this.selectRandom(this.templates.appreciation);
      } else if (message.intent === 'complaint') {
        response = this.selectRandom(this.templates.apology);
      } else if (message.sentiment === 'negative') {
        response = this.selectRandom(this.templates.clarification);
      }

      // Layer 3: Fallback if no template matched
      if (!response) {
        response = this.selectRandom(this.fallbackResponses);
      }

      // Layer 4: Sentiment adaptation
      if (message.sentiment === 'negative') {
        response = this.adaptForNegativeSentiment(response);
      } else if (message.sentiment === 'positive') {
        response = this.adaptForPositiveSentiment(response);
      }

      return {
        text: response,
        confidence: this.calculateConfidence(message, context),
        source: 'generated',
      };
    } catch (error) {
      console.error('❌ Response generation error:', error.message);
      return {
        text: this.selectRandom(this.fallbackResponses),
        confidence: 0.3,
        source: 'fallback',
      };
    }
  }

  /**
   * Inject extracted entities into template
   */
  injectEntities(template, entities = {}) {
    try {
      let result = template;

      // Replace placeholders
      const placeholders = template.match(/\{[^}]+\}/g) || [];
      
      for (const placeholder of placeholders) {
        const key = placeholder.replace(/[{}]/g, '');
        const value = entities[key] || entities[key + 's']?.[0] || 'information';
        result = result.replace(placeholder, value);
      }

      return result;
    } catch (error) {
      console.warn('⚠️ Entity injection error:', error.message);
      return template;
    }
  }

  /**
   * Adapt response for negative sentiment
   */
  adaptForNegativeSentiment(response) {
    return response
      .replace(/!$/, '?, 😔')
      .replace(/\?/, '? I\'m here to help.')
      + '\nHow can I make this better for you?';
  }

  /**
   * Adapt response for positive sentiment
   */
  adaptForPositiveSentiment(response) {
    if (!response.includes('😊') && !response.includes('🙌')) {
      response += ' 😊';
    }
    return response;
  }

  /**
   * Calculate response confidence score
   */
  calculateConfidence(message, context = {}) {
    try {
      let score = 0.5;  // base

      // Template match bonus
      if (message.intent) {
        score += 0.15;
      }

      // Entity extraction bonus
      if (message.entities && Object.keys(message.entities).length > 0) {
        score += 0.15;
      }

      // Sentiment clarity bonus
      if (message.sentiment && message.sentiment !== 'neutral') {
        score += 0.1;
      }

      // Context history bonus
      if (context.recentMessages && context.recentMessages.length > 2) {
        score += 0.1;
      }

      // Cap at 1.0
      return Math.min(score, 1.0);
    } catch (error) {
      return 0.5;
    }
  }

  /**
   * Select random item from array
   */
  selectRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Add custom template group
   */
  addTemplates(intent, templates) {
    try {
      if (!Array.isArray(templates)) {
        console.warn('⚠️ Templates must be an array');
        return false;
      }

      this.templates[intent] = templates;
      return true;
    } catch (error) {
      console.error('❌ Error adding templates:', error.message);
      return false;
    }
  }

  /**
   * Get template suggestions for intent
   */
  getTemplates(intent) {
    return this.templates[intent] || null;
  }

  /**
   * Generate response with quality scoring
   */
  async generateWithQualityScore(message, context = {}) {
    try {
      const response = await this.generateResponse(message, context);
      
      return {
        ...response,
        quality: {
          relevance: this.scoreRelevance(response.text, message),
          completeness: this.scoreCompleteness(response.text, message),
          tone: this.scoreTone(response.text, message),
          naturalness: this.scoreNaturalness(response.text),
        },
      };
    } catch (error) {
      console.error('❌ Error with quality scoring:', error.message);
      return null;
    }
  }

  /**
   * Score response relevance to message intent
   */
  scoreRelevance(response, message) {
    try {
      if (!message.intent) return 0.5;

      const intentWords = {
        'greeting': ['hello', 'hi', 'welcome'],
        'property_query': ['property', 'villa', 'apartment', 'price'],
        'contact': ['contact', 'connect', 'reach'],
        'appreciation': ['thank', 'help', 'welcome'],
      };

      const words = intentWords[message.intent] || [];
      const matchCount = words.filter(w => response.toLowerCase().includes(w)).length;
      
      return Math.min((matchCount / Math.max(words.length, 1)) * 0.9 + 0.1, 1.0);
    } catch (error) {
      return 0.5;
    }
  }

  /**
   * Score response completeness
   */
  scoreCompleteness(response, message) {
    try {
      const hasEntities = response.match(/\{[^}]+\}/g) === null;  // All placeholders filled
      const isLongEnough = response.length > 10;
      const hasEnding = /[!?.]\s*$/.test(response);

      const score = (hasEntities ? 0.3 : 0) + (isLongEnough ? 0.4 : 0) + (hasEnding ? 0.3 : 0);
      return score;
    } catch (error) {
      return 0.5;
    }
  }

  /**
   * Score tone match with message sentiment
   */
  scoreTone(response, message) {
    try {
      if (!message.sentiment) return 0.5;

      const hasEmoji = /[😊😔😠🙌👋]/.test(response);
      const hasQuestion = /\?/.test(response);
      const hasExclamation = /!/.test(response);

      if (message.sentiment === 'positive') {
        return (hasEmoji ? 0.4 : 0) + (hasExclamation ? 0.3 : 0) + 0.3;
      } else if (message.sentiment === 'negative') {
        return (hasQuestion ? 0.4 : 0) + (hasEmoji ? 0.3 : 0) + 0.3;
      } else {
        return 0.6;
      }
    } catch (error) {
      return 0.5;
    }
  }

  /**
   * Score response naturalness
   */
  scoreNaturalness(response) {
    try {
      let score = 0.5;

      // Penalize unfilled placeholders
      const unfilled = (response.match(/\{[^}]+\}/g) || []).length;
      score -= unfilled * 0.1;

      // Bonus for conversational tone
      if (/[?!]/.test(response)) score += 0.15;
      if (/you|your/i.test(response)) score += 0.1;
      if (/I|we/i.test(response)) score += 0.1;

      return Math.max(0, Math.min(score, 1.0));
    } catch (error) {
      return 0.5;
    }
  }
}

// Export singleton
export const advancedResponseGenerator = new AdvancedResponseGenerator();
