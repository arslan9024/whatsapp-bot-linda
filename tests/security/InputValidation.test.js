/*
 * PHASE 4 MILESTONE 3: SECURITY TESTING
 * InputValidation.test.js - Input validation and sanitization tests
 * 
 * Tests: 8 comprehensive input validation scenarios
 * Coverage: Message validation, phone number validation, config validation
 * Target: 100% pass rate, zero injection vulnerabilities
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Inline malicious inputs fixture
const maliciousInputsFixture = {
  xssPayloads: [
    "<script>alert('xss')</script>",
    "<img src=x onerror=alert('xss')>",
    "<svg onload=alert('xss')>",
    "javascript:alert('xss')",
    "<iframe src='javascript:alert(\"xss\")'></iframe>",
    "<body onload=alert('xss')>",
    "<input onfocus=alert('xss') autofocus>",
    "<marquee onstart=alert('xss')></marquee>"
  ],
  sqlInjectionPayloads: [
    "1' OR '1'='1",
    "admin' --",
    "1'; DROP TABLE users--",
    "1' UNION SELECT NULL--",
    "1' AND 1=1--",
    "' OR 1=1 --",
    "admin'; DELETE FROM users WHERE ''='",
    "1' OR 'a'='a"
  ],
  commandInjectionPayloads: [
    "$(rm -rf /)",
    "; rm -rf /",
    "| cat /etc/passwd",
    "& whoami",
    "`whoami`",
    "$(whoami)",
    "; nc -e /bin/sh",
    "|| cat /etc/shadow"
  ],
  validMessages: [
    "Hello, how are you?",
    "Simple text message",
    "Text with 123 numbers",
    "Message with @mention and #hashtag",
    "Text with emoji 😊",
    "Multi\nline\nmessage"
  ],
  invalidMessages: [
    "",
    "   ",
    "\n\n\n",
    "\t\t\t"
  ],
  validPhoneNumbers: [
    "+94712345678",
    "0712345678",
    "+1234567890",
    "+442071838750",
    "+33123456789",
    "+971501234567"
  ],
  invalidPhoneNumbers: [
    "12345",
    "abc123def",
    "+++1234567890",
    "0123456789a",
    "phone",
    "",
    "1234567890000000"
  ]
};

// Mock input validation module
class InputValidator {
  static isValidMessage(message) {
    if (typeof message !== 'string') {
      return false;
    }
    if (message.trim().length === 0) {
      return false;
    }
    if (message.length > 4096) {
      return false;
    }
    return true;
  }

  static isValidPhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') {
      return false;
    }
    // Remove common formatting characters
    const cleaned = phone.replace(/[\s\-\.\(\)]/g, '');
    // International format: +[country code][number]
    // Or local format: 0[number]
    const phoneRegex = /^(\+[1-9]\d{1,14}|0\d{9,14})$/;
    return phoneRegex.test(cleaned);
  }

  static sanitizeInput(input) {
    if (typeof input !== 'string') {
      return '';
    }
    // Remove HTML/script tags
    let sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
    
    return sanitized.trim();
  }

  static isValidConfig(config) {
    if (!config || typeof config !== 'object') {
      return false;
    }
    // Check required fields
    const requiredFields = ['accountId', 'accountName', 'phoneNumber'];
    for (const field of requiredFields) {
      if (!config[field] || typeof config[field] !== 'string') {
        return false;
      }
    }
    // Validate phone as part of config
    if (!this.isValidPhoneNumber(config.phoneNumber)) {
      return false;
    }
    return true;
  }

  static validateMessageLength(message, maxLength = 4096) {
    if (typeof message !== 'string') {
      return { valid: false, reason: 'Message must be a string' };
    }
    if (message.length > maxLength) {
      return { valid: false, reason: `Message exceeds max length of ${maxLength}` };
    }
    if (message.trim().length === 0) {
      return { valid: false, reason: 'Message cannot be empty' };
    }
    return { valid: true };
  }

  static validatePhoneFormat(phone) {
    if (typeof phone !== 'string') {
      return { valid: false, format: 'unknown' };
    }
    
    const cleanPhone = phone.replace(/\s|-|\.|\(|\)/g, '');
    
    // Check international format
    if (cleanPhone.startsWith('+')) {
      if (/^\+[1-9]\d{1,14}$/.test(cleanPhone)) {
        return { valid: true, format: 'international' };
      }
    }
    
    // Check local format
    if (/^0\d{9,14}$/.test(cleanPhone)) {
      return { valid: true, format: 'local' };
    }
    
    return { valid: false, format: 'unknown' };
  }
}

describe('InputValidation - Security Tests', () => {
  let validator;

  beforeEach(() => {
    validator = InputValidator;
  });

  // ============================================================================
  // TEST GROUP 1: MESSAGE VALIDATION (3 tests)
  // ============================================================================

  describe('Message Validation', () => {
    it('Test 1: should accept valid messages', () => {
      const validMessages = maliciousInputsFixture.validMessages;
      
      validMessages.forEach((message) => {
        const result = validator.isValidMessage(message);
        expect(result).toBe(true);
      });
    });

    it('Test 2: should reject empty and whitespace-only messages', () => {
      const invalidMessages = maliciousInputsFixture.invalidMessages;
      
      invalidMessages.forEach((message) => {
        const result = validator.isValidMessage(message);
        expect(result).toBe(false);
      });
    });

    it('Test 3: should enforce maximum message length', () => {
      const tooLongMessage = 'a'.repeat(5000);
      const maxLengthMessage = 'a'.repeat(4096);
      const withinLimitMessage = 'a'.repeat(100);
      
      expect(validator.isValidMessage(tooLongMessage)).toBe(false);
      expect(validator.isValidMessage(maxLengthMessage)).toBe(true);
      expect(validator.isValidMessage(withinLimitMessage)).toBe(true);
    });
  });

  // ============================================================================
  // TEST GROUP 2: PHONE NUMBER VALIDATION (3 tests)
  // ============================================================================

  describe('Phone Number Validation', () => {
    it('Test 4: should accept valid phone numbers', () => {
      const validPhones = maliciousInputsFixture.validPhoneNumbers;
      
      validPhones.forEach((phone) => {
        const result = validator.isValidPhoneNumber(phone);
        expect(result).toBe(true);
      });
    });

    it('Test 5: should reject invalid phone numbers', () => {
      const invalidPhones = maliciousInputsFixture.invalidPhoneNumbers;
      
      invalidPhones.forEach((phone) => {
        const result = validator.isValidPhoneNumber(phone);
        expect(result).toBe(false);
      });
    });

    it('Test 6: should correctly identify phone number formats', () => {
      const internationalPhone = '+94712345678';
      const localPhone = '0712345678';
      const invalidPhone = '123abc456';
      
      const intlResult = validator.validatePhoneFormat(internationalPhone);
      expect(intlResult.valid).toBe(true);
      expect(intlResult.format).toBe('international');
      
      const localResult = validator.validatePhoneFormat(localPhone);
      expect(localResult.valid).toBe(true);
      expect(localResult.format).toBe('local');
      
      const invalidResult = validator.validatePhoneFormat(invalidPhone);
      expect(invalidResult.valid).toBe(false);
    });
  });

  // ============================================================================
  // TEST GROUP 3: ACCOUNT CONFIGURATION VALIDATION (2 tests)
  // ============================================================================

  describe('Account Configuration Validation', () => {
    it('Test 7: should accept valid account configurations', () => {
      const validConfigs = [
        {
          accountId: 'account-001',
          accountName: 'Main Account',
          phoneNumber: '+94712345678'
        },
        {
          accountId: 'account-002',
          accountName: 'Secondary Account',
          phoneNumber: '0712345678'
        },
        {
          accountId: 'acc-third',
          accountName: 'Test Account',
          phoneNumber: '+1234567890'
        }
      ];
      
      validConfigs.forEach((config) => {
        const result = validator.isValidConfig(config);
        expect(result).toBe(true);
      });
    });

    it('Test 8: should reject incomplete or invalid configurations', () => {
      const invalidConfigs = [
        // Missing required field
        {
          accountId: 'account-001',
          accountName: 'Incomplete Config'
          // Missing phoneNumber
        },
        // Invalid phone number
        {
          accountId: 'account-002',
          accountName: 'Bad Phone Config',
          phoneNumber: 'not-a-phone'
        },
        // Empty values
        {
          accountId: '',
          accountName: '',
          phoneNumber: ''
        },
        // Null/undefined
        {
          accountId: null,
          accountName: 'Test',
          phoneNumber: '+94712345678'
        },
        // Non-object
        null,
        undefined,
        'string',
        []
      ];
      
      invalidConfigs.forEach((config) => {
        const result = validator.isValidConfig(config);
        expect(result).toBe(false);
      });
    });
  });

  // ============================================================================
  // ADDITIONAL VALIDATION TESTS
  // ============================================================================

  describe('Input Sanitization', () => {
    it('should sanitize XSS attack vectors from input', () => {
      const xssPayloads = maliciousInputsFixture.xssPayloads;
      
      xssPayloads.forEach((payload) => {
        const sanitized = validator.sanitizeInput(payload);
        // After sanitization, should not contain script tags or event handlers
        expect(sanitized).not.toMatch(/<script/i);
        expect(sanitized).not.toMatch(/on\w+=/i);
        expect(sanitized).not.toMatch(/javascript:/i);
      });
    });
  });

  describe('Message Length Validation Details', () => {
    it('should provide detailed validation feedback for message length', () => {
      const validMessage = 'Hello World';
      const emptyMessage = '';
      const tooLongMessage = 'x'.repeat(5000);
      
      const validResult = validator.validateMessageLength(validMessage);
      expect(validResult.valid).toBe(true);
      
      const emptyResult = validator.validateMessageLength(emptyMessage);
      expect(emptyResult.valid).toBe(false);
      expect(emptyResult.reason).toContain('empty');
      
      const lengthResult = validator.validateMessageLength(tooLongMessage);
      expect(lengthResult.valid).toBe(false);
      expect(lengthResult.reason).toContain('exceeds');
    });
  });

  // ============================================================================
  // EDGE CASES & BOUNDARY TESTS
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle special characters safely in messages', () => {
      const specialMessages = [
        'Message with @mention @user',
        'Message with #hashtag #test',
        'Message with emoji 😊 🎉 🚀',
        'Message with quotes "double" and \'single\'',
        'Message with \\ backslash and / forward slash',
        'Message with $special{characters}[brackets]'
      ];
      
      specialMessages.forEach((msg) => {
        const result = validator.isValidMessage(msg);
        expect(result).toBe(true);
      });
    });

    it('should handle unicode and international characters', () => {
      const internationalMessages = [
        'হোয়েলো ওয়ার্ল্ড',  // Bengali
        'مرحبا بالعالم',       // Arabic
        'Привет мир',          // Russian
        ' 你好世界',             // Chinese
        'こんにちは世界'       // Japanese
      ];
      
      internationalMessages.forEach((msg) => {
        const result = validator.isValidMessage(msg);
        expect(result).toBe(true);
      });
    });

    it('should handle phone numbers with formatting variations', () => {
      const formattedPhones = [
        '+94 (71) 234-5678',
        '+94 71 234 5678',
        '+94-71-234-5678',
        '+94.71.234.5678'
      ];
      
      formattedPhones.forEach((phone) => {
        // Should normalize and validate
        const result = validator.isValidPhoneNumber(phone);
        expect(result).toBe(true);
      });
    });
  });

  // ============================================================================
  // PERFORMANCE & STRESS TESTS
  // ============================================================================

  describe('Performance Validations', () => {
    it('should validate messages efficiently (no timeout)', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        validator.isValidMessage('Test message ' + i);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 1000 validation calls should complete in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should validate phone numbers efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        validator.isValidPhoneNumber('+9471' + String(i).padStart(8, '0'));
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 1000 validation calls should complete in less than 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});
