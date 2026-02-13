/**
 * Security Utilities Module
 * Handles error sanitization, input validation, and security hardening
 * 
 * Phase 6 Security Audit Implementation
 * Created: February 13, 2026
 */

class SecurityUtils {
  /**
   * Sanitize error messages for external consumption
   * Hides internal system details in production
   */
  static sanitizeError(error, environment = process.env.NODE_ENV) {
    if (!error) {
      return 'An error occurred';
    }

    // In production, return generic message
    if (environment === 'production') {
      // Log full error internally but don't expose to user
      if (typeof error === 'object' && error.message) {
        return 'An error occurred. Please try again later.';
      }
      return 'An error occurred. Please contact support if the problem persists.';
    }

    // In development/staging, return detailed message
    if (typeof error === 'string') {
      return error;
    }
    if (error.message) {
      return error.message;
    }
    return String(error);
  }

  /**
   * Mask sensitive data in log messages
   * Prevents PII leakage in logs
   */
  static maskSensitiveData(text) {
    if (!text || typeof text !== 'string') {
      return text;
    }

    let masked = text;

    // Mask phone numbers (various formats)
    masked = masked.replace(/\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/g, '[PHONE_NUMBER]');
    masked = masked.replace(/\b\+?1?\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, '[PHONE_NUMBER]');

    // Mask email addresses
    masked = masked.replace(/[\w\.-]+@[\w\.-]+\.\w+/g, '[EMAIL_ADDRESS]');

    // Mask credit card numbers
    masked = masked.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD_NUMBER]');

    // Mask SSN
    masked = masked.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');

    // Mask API keys (basic pattern)
    masked = masked.replace(/sk_[a-zA-Z0-9]{32,}/g, '[API_KEY]');
    masked = masked.replace(/api_key["\s:]*[a-zA-Z0-9]{32,}/gi, 'api_key=[API_KEY]');

    return masked;
  }

  /**
   * Validate command input
   * Ensures commands meet security and format requirements
   */
  static validateCommandInput(input, options = {}) {
    const {
      maxLength = 1000,
      allowedPrefixes = ['/'],
      minLength = 1
    } = options;

    // Check if input is string
    if (typeof input !== 'string') {
      return {
        valid: false,
        error: 'Command must be a string'
      };
    }

    // Check length
    if (input.length < minLength) {
      return {
        valid: false,
        error: `Command must be at least ${minLength} characters`
      };
    }

    if (input.length > maxLength) {
      return {
        valid: false,
        error: `Command exceeds maximum length of ${maxLength} characters`
      };
    }

    // Check for valid prefix if specified
    if (allowedPrefixes.length > 0) {
      const hasValidPrefix = allowedPrefixes.some(prefix => input.startsWith(prefix));
      if (!hasValidPrefix && input.length > 0) {
        // Allow commands without prefix, but log it
        console.warn(`Command without expected prefix: "${input.substring(0, 50)}..."`);
      }
    }

    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      /eval\s*\(/i,
      /exec\s*\(/i,
      /spawn\s*\(/i,
      /require\s*\(/i,  // Prevent dynamic requires
      /<script/i,
      /javascript:/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(input)) {
        return {
          valid: false,
          error: 'Command contains potentially dangerous patterns'
        };
      }
    }

    return {
      valid: true
    };
  }

  /**
   * Validate message content
   * Ensures messages meet security and format requirements
   */
  static validateMessageContent(message, options = {}) {
    const {
      maxLength = 65536,  // WhatsApp message limit
      minLength = 1
    } = options;

    // Check if message is object or string
    if (typeof message === 'object' && message.body) {
      const content = message.body;
      
      if (typeof content !== 'string') {
        return {
          valid: false,
          error: 'Message body must be a string'
        };
      }

      if (content.length < minLength) {
        return {
          valid: false,
          error: `Message must contain at least ${minLength} character`
        };
      }

      if (content.length > maxLength) {
        return {
          valid: false,
          error: `Message exceeds maximum length of ${maxLength} characters`
        };
      }
    } else if (typeof message === 'string') {
      if (message.length < minLength || message.length > maxLength) {
        return {
          valid: false,
          error: `Message length must be between ${minLength} and ${maxLength}`
        };
      }
    } else {
      return {
        valid: false,
        error: 'Message must be a string or object with body property'
      };
    }

    return {
      valid: true
    };
  }

  /**
   * Generate secure request ID for tracking
   * Used in logs and monitoring
   */
  static generateRequestId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `req_${timestamp}_${random}`;
  }

  /**
   * Rate limit check using token bucket algorithm
   */
  static createRateLimiter(options = {}) {
    const {
      maxTokens = 10,           // Maximum requests per interval
      refillRate = 1,           // Tokens added per interval
      refillInterval = 1000     // Interval in ms
    } = options;

    let tokens = maxTokens;
    let lastRefill = Date.now();

    return {
      isAllowed() {
        const now = Date.now();
        const timePassed = now - lastRefill;
        const tokensToAdd = (timePassed / refillInterval) * refillRate;
        
        tokens = Math.min(maxTokens, tokens + tokensToAdd);
        lastRefill = now;

        if (tokens >= 1) {
          tokens -= 1;
          return { allowed: true, remaining: Math.floor(tokens) };
        }

        return {
          allowed: false,
          remaining: 0,
          retryAfter: Math.ceil((1 - tokens) / refillRate)
        };
      },

      reset() {
        tokens = maxTokens;
        lastRefill = Date.now();
      }
    };
  }

  /**
   * Validate API authentication
   * Extracts and validates Bearer tokens
   */
  static validateAuthHeader(authHeader) {
    if (!authHeader) {
      return {
        valid: false,
        error: 'Authorization header missing'
      };
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return {
        valid: false,
        error: 'Invalid authorization header format. Expected: Bearer <token>'
      };
    }

    const token = parts[1];
    if (!token || token.length < 10) {
      return {
        valid: false,
        error: 'Invalid or empty token'
      };
    }

    return {
      valid: true,
      token
    };
  }

  /**
   * Create security event log entry
   * Used for audit trails
   */
  static createSecurityEvent(type, data = {}) {
    return {
      type,
      timestamp: new Date().toISOString(),
      requestId: data.requestId || this.generateRequestId(),
      userId: data.userId || 'unknown',
      action: data.action || 'unknown',
      severity: data.severity || 'info',  // info, warning, error
      details: this.maskSensitiveData(JSON.stringify(data.details || {})),
      source: data.source || 'unknown',
      status: data.status || 'completed'
    };
  }

  /**
   * Validate JSON data safely
   * Prevents JSON injection attacks
   */
  static parseJSON(jsonString, defaultValue = null) {
    try {
      if (typeof jsonString !== 'string') {
        return defaultValue;
      }

      const parsed = JSON.parse(jsonString);
      return parsed;
    } catch (error) {
      console.error('Invalid JSON:', error.message);
      return defaultValue;
    }
  }

  /**
   * Content Security Policy validator
   */
  static validateCSPHeaders(headers = {}) {
    const cspHeader = {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",  // Adjust as needed
        "style-src 'self' 'unsafe-inline'",   // Adjust as needed
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "form-action 'self'"
      ].join('; ')
    };

    return {
      ...headers,
      ...cspHeader,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    };
  }
}

module.exports = SecurityUtils;
