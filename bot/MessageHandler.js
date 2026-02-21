/**
 * Message Handler
 * Processes incoming messages, extracts data, routes to command handler
 * Handles: text, media, locations, contact cards, etc.
 */

import EventEmitter from 'events';

class MessageHandler extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = config;
    this.messageQueue = [];
    this.isProcessing = false;
    this.commandPrefix = config.commandPrefix || '/';
    this.maxRetries = config.maxRetries || 3;

    this.log('MessageHandler initialized');
  }

  /**
   * Main message processor
   */
  async process(rawMessage) {
    this.messageQueue.push(rawMessage);

    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  /**
   * Process queued messages
   */
  async processQueue() {
    this.isProcessing = true;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();

      try {
        const processed = await this.parseMessage(message);
        this.emit('processed', processed);
      } catch (error) {
        this.log(`Error processing message: ${error.message}`);
        this.emit('error', error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Parse raw message into structured format
   */
  async parseMessage(rawMessage) {
    const message = {
      id: this.generateId(),
      timestamp: rawMessage.timestamp || Date.now(),
      from: rawMessage.from,
      isGroup: rawMessage.isGroup || false,
      sender: rawMessage.author || rawMessage.from,
      text: rawMessage.body || '',
      raw: rawMessage
    };

    // Extract metadata
    if (message.text) {
      message.isCommand = message.text.startsWith(this.commandPrefix);
      message.command = message.isCommand
        ? message.text.split(' ')[0].slice(1).toLowerCase()
        : null;
      message.args = message.isCommand
        ? message.text.split(' ').slice(1)
        : [];
    }

    // Extract entities (mentions, links, etc)
    message.entities = this.extractEntities(message.text);

    // Classify message type
    message.type = this.classifyMessage(rawMessage);

    return message;
  }

  /**
   * Extract entities from text
   */
  extractEntities(text) {
    const entities = {
      mentions: [],
      hashtags: [],
      urls: [],
      emails: [],
      phoneNumbers: []
    };

    if (!text) return entities;

    // Mentions (@username)
    const mentionRegex = /@[\w.]+/g;
    entities.mentions = text.match(mentionRegex) || [];

    // Hashtags (#topic)
    const hashtagRegex = /#[\w]+/g;
    entities.hashtags = text.match(hashtagRegex) || [];

    // URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    entities.urls = text.match(urlRegex) || [];

    // Emails
    const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/g;
    entities.emails = text.match(emailRegex) || [];

    // Phone numbers (basic)
    const phoneRegex = /(?:\+\d{1,3})?[-.\s]?\(?(?:\d{1,3})?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;
    entities.phoneNumbers = text.match(phoneRegex) || [];

    return entities;
  }

  /**
   * Classify message type
   */
  classifyMessage(rawMessage) {
    if (rawMessage.body) return 'text';
    if (rawMessage.image) return 'image';
    if (rawMessage.document) return 'document';
    if (rawMessage.audio) return 'audio';
    if (rawMessage.video) return 'video';
    if (rawMessage.location) return 'location';
    if (rawMessage.vcard) return 'contact';
    if (rawMessage.sticker) return 'sticker';
    if (rawMessage.quote) return 'quoted_message';
    return 'unknown';
  }

  /**
   * Filter messages based on criteria
   */
  filter(message, criteria = {}) {
    // Command filter
    if (criteria.isCommand !== undefined && message.isCommand !== criteria.isCommand) {
      return false;
    }

    // Command name filter
    if (criteria.command && message.command !== criteria.command.toLowerCase()) {
      return false;
    }

    // From filter
    if (criteria.from && message.from !== criteria.from) {
      return false;
    }

    // Group filter
    if (criteria.isGroup !== undefined && message.isGroup !== criteria.isGroup) {
      return false;
    }

    // Text contains filter
    if (criteria.contains) {
      const searchText = message.text.toLowerCase();
      const terms = Array.isArray(criteria.contains) ? criteria.contains : [criteria.contains];
      if (!terms.some(term => searchText.includes(term.toLowerCase()))) {
        return false;
      }
    }

    // Type filter
    if (criteria.type && message.type !== criteria.type) {
      return false;
    }

    return true;
  }

  /**
   * Validate message
   */
  validate(message) {
    const errors = [];

    // Check required fields
    if (!message.from) errors.push('Missing "from" field');
    if (!message.timestamp) errors.push('Missing "timestamp" field');

    // Check text length
    if (message.text && message.text.length > 4096) {
      errors.push('Message text exceeds 4096 characters');
    }

    // Check for spam patterns
    if (this.isSpam(message)) {
      errors.push('Message matches spam pattern');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Simple spam detection
   */
  isSpam(message) {
    const text = message.text.toLowerCase();

    // Too many mentions
    if ((message.entities?.mentions?.length || 0) > 5) return true;

    // Too many links
    if ((message.entities?.urls?.length || 0) > 3) return true;

    // Repeated characters (spamspamspam)
    if (/(.)\1{9,}/.test(text)) return true;

    // All caps (unless short message)
    if (text === text.toUpperCase() && text.length > 10) return true;

    return false;
  }

  /**
   * Extract intent from message
   * Returns: { type, confidence, data }
   */
  extractIntent(message) {
    // Command-based intent
    if (message.isCommand) {
      return {
        type: 'command',
        confidence: 1.0,
        data: {
          command: message.command,
          args: message.args
        }
      };
    }

    // Query intent based on keywords
    const intents = {
      'property_search': {
        keywords: ['find', 'search', 'property', 'apartment', 'villa', 'flat'],
        confidence: 0.8
      },
      'property_list': {
        keywords: ['list', 'show', 'available', 'properties'],
        confidence: 0.8
      },
      'property_detail': {
        keywords: ['detail', 'info', 'about', 'tell me'],
        confidence: 0.7
      },
      'booking': {
        keywords: ['book', 'reserve', 'buy', 'rent'],
        confidence: 0.8
      },
      'payment': {
        keywords: ['pay', 'payment', 'invoice', 'bill', 'price'],
        confidence: 0.8
      },
      'support': {
        keywords: ['help', 'support', 'issue', 'problem', 'error'],
        confidence: 0.8
      },
      'greeting': {
        keywords: ['hi', 'hello', 'hey', 'good morning', 'good evening'],
        confidence: 0.9
      },
      'farewell': {
        keywords: ['bye', 'goodbye', 'see you', 'later'],
        confidence: 0.9
      }
    };

    const text = message.text.toLowerCase();
    let bestMatch = null;
    let bestConfidence = 0;

    for (const [type, config] of Object.entries(intents)) {
      const matches = config.keywords.filter(keyword => text.includes(keyword));
      if (matches.length > 0) {
        const confidence = config.confidence * (matches.length / config.keywords.length);
        if (confidence > bestConfidence) {
          bestMatch = type;
          bestConfidence = confidence;
        }
      }
    }

    return {
      type: bestMatch || 'unknown',
      confidence: bestConfidence,
      data: { text: message.text }
    };
  }

  /**
   * Format response message
   */
  formatResponse(content, options = {}) {
    const response = {
      text: typeof content === 'string' ? content : JSON.stringify(content, null, 2),
      timestamp: Date.now(),
      mentions: options.mentions || [],
      buttons: options.buttons || []
    };

    // Add formatting
    if (options.format === 'bold') {
      response.text = `*${response.text}*`;
    } else if (options.format === 'italic') {
      response.text = `_${response.text}_`;
    } else if (options.format === 'code') {
      response.text = `\`\`\`\n${response.text}\n\`\`\``;
    }

    return response;
  }

  /**
   * Batch process messages
   */
  async processBatch(messages) {
    const results = [];

    for (const msg of messages) {
      try {
        const processed = await this.parseMessage(msg);
        results.push({ success: true, data: processed });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Logging utility
   */
  log(message) {
    console.log(`[MessageHandler] ${message}`);
  }
}

export default MessageHandler;
