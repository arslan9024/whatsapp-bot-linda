/**
 * ============================================
 * MESSAGE VALIDATION SERVICE (Phase 17)
 * ============================================
 * 
 * Validates message content against WhatsApp limits,
 * safety rules, and quality standards.
 */

export class MessageValidationService {
  constructor() {
    this.maxBodyLength = 65536;  // WhatsApp limit
    this.maxPhoneLength = 20;
    this.maxMediaSize = 104857600;  // 100MB
    this.allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
  }

  /**
   * Validate message
   */
  validate(message) {
    try {
      const errors = [];
      const warnings = [];

      // Check required fields
      if (!message.messageId) {
        errors.push('Missing messageId');
      }
      if (!message.fromNumber) {
        errors.push('Missing fromNumber');
      }
      if (!message.timestamp) {
        errors.push('Missing timestamp');
      }

      // Check body length
      if (message.body && message.body.length > this.maxBodyLength) {
        errors.push(`Message body exceeds ${this.maxBodyLength} characters`);
      }

      // Check media
      if (message.media) {
        if (message.media.size && message.media.size > this.maxMediaSize) {
          errors.push(`Media size exceeds ${this.maxMediaSize} bytes`);
        }
        if (message.media.mimeType && !this.allowedMimeTypes.includes(message.media.mimeType)) {
          warnings.push(`MIME type ${message.media.mimeType} not in whitelist`);
        }
      }

      // Check phone number format
      if (message.fromNumber && !/^\+?\d{7,20}$/.test(message.fromNumber.replace(/[\s\-()]/g, ''))) {
        warnings.push('Phone number format may be invalid');
      }

      // Check for special characters in critical fields
      if (message.conversationId && /[<>'"&]/g.test(message.conversationId)) {
        warnings.push('Suspicious characters in conversationId');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        severity: errors.length > 0 ? 'error' : (warnings.length > 0 ? 'warning' : 'ok'),
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error.message],
        warnings: [],
        severity: 'error',
      };
    }
  }

  /**
   * Validate body text
   */
  validateBody(body) {
    try {
      if (!body || typeof body !== 'string') {
        return { isValid: false, error: 'Body must be a non-empty string' };
      }

      if (body.length > this.maxBodyLength) {
        return { isValid: false, error: `Exceeds ${this.maxBodyLength} character limit` };
      }

      // Check for control characters
      if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(body)) {
        return { isValid: false, error: 'Contains invalid control characters' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: error.message };
    }
  }

  /**
   * Validate phone number
   */
  validatePhone(phone) {
    try {
      if (!phone) return { isValid: false, error: 'Phone number required' };

      const cleaned = phone.replace(/[\s\-()]/g, '');
      
      if (cleaned.length < 7 || cleaned.length > 20) {
        return { isValid: false, error: 'Invalid phone length' };
      }

      if (!/^\+?\d+$/.test(cleaned)) {
        return { isValid: false, error: 'Invalid phone format' };
      }

      return { isValid: true, cleaned };
    } catch (error) {
      return { isValid: false, error: error.message };
    }
  }

  /**
   * Validate media
   */
  validateMedia(media) {
    try {
      if (!media) return { isValid: true };  // Media is optional

      if (media.size && media.size > this.maxMediaSize) {
        return { isValid: false, error: `Media exceeds ${this.maxMediaSize} bytes` };
      }

      if (media.mimeType && !this.allowedMimeTypes.includes(media.mimeType)) {
        return { 
          isValid: false, 
          error: `MIME type ${media.mimeType} not allowed`,
          warning: true 
        };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: error.message };
    }
  }

  /**
   * Sanitize message for storage
   */
  sanitize(message) {
    try {
      return {
        ...message,
        body: message.body 
          ? message.body.substring(0, this.maxBodyLength)
          : message.body,
        fromNumber: message.fromNumber 
          ? message.fromNumber.trim()
          : message.fromNumber,
      };
    } catch (error) {
      console.error('❌ Sanitization error:', error.message);
      return message;
    }
  }
}

/**
 * ============================================
 * RATE LIMITER (Phase 17)
 * ============================================
 * 
 * Token bucket algorithm for per-sender and global
 * message rate limiting.
 */

export class RateLimiter {
  constructor(options = {}) {
    this.perSenderLimit = options.perSenderLimit || 10;  // messages/minute per sender
    this.perSenderWindow = options.perSenderWindow || 60000;  // 1 minute
    this.globalLimit = options.globalLimit || 100;  // messages/minute globally
    this.globalWindow = options.globalWindow || 60000;
    
    this.senderBuckets = new Map();  // phoneNumber -> { tokens, lastRefill }
    this.globalBucket = {
      tokens: this.globalLimit,
      lastRefill: Date.now(),
    };
    
    this.rejectionQueue = new Map();  // phoneNumber -> messages waiting
    this.backoffFactor = options.backoffFactor || 2;
    this.maxBackoff = options.maxBackoff || 300000;  // 5 minutes
  }

  /**
   * Check if sender can send message (token bucket)
   */
  canSend(phoneNumber) {
    try {
      // Refill global bucket
      this.refillGlobal();

      // Refill sender bucket
      this.refillSender(phoneNumber);

      // Check global limit
      if (this.globalBucket.tokens < 1) {
        return {
          allowed: false,
          reason: 'global_rate_limit',
          retryAfter: this.perSenderWindow / 1000,
        };
      }

      // Check per-sender limit
      const senderBucket = this.senderBuckets.get(phoneNumber);
      if (!senderBucket || senderBucket.tokens < 1) {
        return {
          allowed: false,
          reason: 'sender_rate_limit',
          retryAfter: this.perSenderWindow / 1000,
        };
      }

      // Consume tokens
      this.globalBucket.tokens -= 1;
      senderBucket.tokens -= 1;

      return { allowed: true };
    } catch (error) {
      console.error('❌ Rate limit check error:', error.message);
      return { allowed: false, reason: 'error', error: error.message };
    }
  }

  /**
   * Refill sender token bucket
   */
  refillSender(phoneNumber) {
    try {
      if (!this.senderBuckets.has(phoneNumber)) {
        this.senderBuckets.set(phoneNumber, {
          tokens: this.perSenderLimit,
          lastRefill: Date.now(),
        });
        return;
      }

      const bucket = this.senderBuckets.get(phoneNumber);
      const now = Date.now();
      const timePassed = now - bucket.lastRefill;
      
      if (timePassed >= this.perSenderWindow) {
        bucket.tokens = this.perSenderLimit;
        bucket.lastRefill = now;
      }
    } catch (error) {
      console.error('❌ Refill sender error:', error.message);
    }
  }

  /**
   * Refill global token bucket
   */
  refillGlobal() {
    try {
      const now = Date.now();
      const timePassed = now - this.globalBucket.lastRefill;
      
      if (timePassed >= this.globalWindow) {
        this.globalBucket.tokens = this.globalLimit;
        this.globalBucket.lastRefill = now;
      }
    } catch (error) {
      console.error('❌ Refill global error:', error.message);
    }
  }

  /**
   * Queue message for retry
   */
  queueForRetry(phoneNumber, message, attempt = 1) {
    try {
      if (attempt > 5) {
        console.warn(`⚠️ Message from ${phoneNumber} dropped after 5 retry attempts`);
        return false;
      }

      if (!this.rejectionQueue.has(phoneNumber)) {
        this.rejectionQueue.set(phoneNumber, []);
      }

      const backoffMs = Math.min(
        1000 * Math.pow(this.backoffFactor, attempt - 1),
        this.maxBackoff
      );

      this.rejectionQueue.get(phoneNumber).push({
        message,
        attempt,
        scheduledRetry: Date.now() + backoffMs,
      });

      console.log(`⏰ Message queued for retry in ${backoffMs / 1000}s (attempt ${attempt})`);
      return true;
    } catch (error) {
      console.error('❌ Queue for retry error:', error.message);
      return false;
    }
  }

  /**
   * Process queued messages
   */
  processQueue() {
    try {
      const now = Date.now();
      let processed = 0;

      for (const [phoneNumber, queue] of this.rejectionQueue) {
        const readyMessages = queue.filter(item => item.scheduledRetry <= now);
        
        if (readyMessages.length > 0) {
          console.log(`🔄 Processing ${readyMessages.length} queued messages from ${phoneNumber}`);
          processed += readyMessages.length;

          // Remove processed items
          this.rejectionQueue.set(
            phoneNumber,
            queue.filter(item => item.scheduledRetry > now)
          );
        }

        // Clean up empty queues
        if (this.rejectionQueue.get(phoneNumber).length === 0) {
          this.rejectionQueue.delete(phoneNumber);
        }
      }

      return processed;
    } catch (error) {
      console.error('❌ Process queue error:', error.message);
      return 0;
    }
  }

  /**
   * Get rate limit stats
   */
  getStats() {
    try {
      const stats = {
        globalTokens: this.globalBucket.tokens,
        globalLimit: this.globalLimit,
        activeSenders: this.senderBuckets.size,
        queuedMessages: Array.from(this.rejectionQueue.values())
          .reduce((sum, queue) => sum + queue.length, 0),
      };

      // Top senders
      const senderTokens = Array.from(this.senderBuckets.entries())
        .map(([phone, bucket]) => ({ phone, tokens: bucket.tokens }))
        .sort((a, b) => a.tokens - b.tokens)
        .slice(0, 5);
      
      stats.lowestTokenSenders = senderTokens;

      return stats;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Reset rate limiter
   */
  reset() {
    this.senderBuckets.clear();
    this.rejectionQueue.clear();
    this.globalBucket = {
      tokens: this.globalLimit,
      lastRefill: Date.now(),
    };
    console.log('✅ Rate limiter reset');
  }

  /**
   * Set limits dynamically
   */
  setLimits(options) {
    try {
      if (options.perSenderLimit) this.perSenderLimit = options.perSenderLimit;
      if (options.globalLimit) this.globalLimit = options.globalLimit;
      console.log(`✅ Rate limits updated: ${this.perSenderLimit}/min per sender, ${this.globalLimit}/min global`);
      return true;
    } catch (error) {
      console.error('❌ Error setting limits:', error.message);
      return false;
    }
  }
}

// Export singletons
export const messageValidationService = new MessageValidationService();
export const rateLimiter = new RateLimiter();
