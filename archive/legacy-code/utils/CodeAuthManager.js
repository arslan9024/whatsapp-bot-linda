/**
 * CodeAuthManager.js
 * 
 * Handles 6-digit code based authentication for WhatsApp device linking
 * Alternative to QR code when page injection fails
 * 
 * Flow:
 * 1. Generate 6-digit code (000000-999999)
 * 2. Display in terminal (large and visible)
 * 3. User enters code in WhatsApp Web for device linking
 * 4. System validates and confirms linking
 * 5. Automatic fallback from QR to code on page injection failure
 * 
 * Features:
 * - Cryptographically secure random code generation
 * - Color-coded terminal display
 * - Code expiration (5 minutes default)
 * - Retry logic with new code generation
 * - Analytics tracking
 * 
 * @author Linda Bot Team
 * @version 1.0
 * @date February 17, 2026
 */

import crypto from 'crypto';
import EventEmitter from 'events';

export default class CodeAuthManager extends EventEmitter {
  constructor(logFunction) {
    super();
    this.logFunction = logFunction || console.log;
    
    // Map: phoneNumber → active auth code
    this.activeCodes = new Map();
    
    // Code configuration
    this.codeDigits = 6;
    this.codeExpirationMs = 5 * 60 * 1000; // 5 minutes
    this.codeAttempts = new Map(); // phoneNumber → { count, timestamp }
    this.maxCodeAttempts = 10; // Max attempts before cooldown
    this.cooldownMs = 30 * 60 * 1000; // 30 minute cooldown
    
    // Analytics
    this.metrics = {
      codesGenerated: 0,
      codesUsed: 0,
      codesExpired: 0,
      codesRejected: 0,
      fallbacksFromQR: 0,
      averageTimeToLink: null,
      linkTimes: []
    };
  }

  /**
   * Generate new 6-digit code
   * @param {string} phoneNumber - Device phone number
   * @returns {string|null} - 6-digit code or null if failed
   */
  generateCode(phoneNumber) {
    try {
      // Check cooldown
      const attempt = this.codeAttempts.get(phoneNumber);
      if (attempt && attempt.count >= this.maxCodeAttempts) {
        const timeSinceCooldown = Date.now() - attempt.timestamp;
        if (timeSinceCooldown < this.cooldownMs) {
          const minutesRemaining = Math.ceil((this.cooldownMs - timeSinceCooldown) / 60000);
          this.logFunction(
            `[CodeAuth] ${phoneNumber}: Too many code attempts (${attempt.count}/${this.maxCodeAttempts}). Try again in ${minutesRemaining} minutes.`,
            'warn'
          );
          return null;
        } else {
          // Cooldown expired, reset
          this.codeAttempts.delete(phoneNumber);
        }
      }

      // Check if active code already exists (prevent spam)
      if (this.activeCodes.has(phoneNumber)) {
        const existing = this.activeCodes.get(phoneNumber);
        const timeSinceGeneration = Date.now() - existing.generatedAt;
        if (timeSinceGeneration < 10000) { // Less than 10s old
          this.logFunction(
            `[CodeAuth] ${phoneNumber}: Code already generated. Please use it or wait 5 minutes for it to expire.`,
            'info'
          );
          return existing.code;
        }
      }

      // Generate cryptographically secure 6-digit code
      const randomBytes = crypto.randomBytes(4);
      const randomNumber = randomBytes.readUInt32BE(0) % 1000000;
      const code = String(randomNumber).padStart(this.codeDigits, '0');

      // Store code with metadata
      this.activeCodes.set(phoneNumber, {
        code,
        phoneNumber,
        generatedAt: Date.now(),
        expiresAt: Date.now() + this.codeExpirationMs,
        attempts: 0,
        used: false,
        usedAt: null
      });

      // Track attempts
      if (!this.codeAttempts.has(phoneNumber)) {
        this.codeAttempts.set(phoneNumber, { count: 0, timestamp: Date.now() });
      }
      const attempts = this.codeAttempts.get(phoneNumber);
      attempts.count++;
      attempts.timestamp = Date.now();

      // Update metrics
      this.metrics.codesGenerated++;

      this.logFunction(
        `[CodeAuth] Generated new code for ${phoneNumber}: ${code}`,
        'info'
      );

      this.emit('code:generated', { phoneNumber, code });
      return code;
    } catch (error) {
      this.logFunction(
        `[CodeAuth] Error generating code: ${error.message}`,
        'error'
      );
      return null;
    }
  }

  /**
   * Display code prominently in terminal
   * @param {string} code - 6-digit code
   * @param {string} phoneNumber - Device phone number
   */
  displayCodeInTerminal(code, phoneNumber) {
    const box = [
      '',
      '╔════════════════════════════════════════════════════════════╗',
      '║           🔐 WHATSAPP DEVICE LINKING CODE 🔐               ║',
      '╠════════════════════════════════════════════════════════════╣',
      `║                                                              ║`,
      `║  Device: ${phoneNumber.padEnd(55)}║`,
      `║                                                              ║`,
      `║  Enter this code in WhatsApp:                               ║`,
      `║                                                              ║`,
      `║              ${code[0]} ${code[1]} ${code[2]}  ${code[3]} ${code[4]} ${code[5]}                    ║`,
      `║                                                              ║`,
      `║  Code expires in 5 minutes                                  ║`,
      `║                                                              ║`,
      '╠════════════════════════════════════════════════════════════╣',
      '║  Instructions:                                               ║',
      '║  1. Open WhatsApp on your device                            ║',
      '║  2. Go to Settings → Linked Devices                         ║',
      '║  3. Click "Link a Device"                                   ║',
      '║  4. Enter the 6-digit code above                            ║',
      '║  5. Follow the prompts to complete linking                  ║',
      '╚════════════════════════════════════════════════════════════╝',
      ''
    ];

    box.forEach(line => console.log(line));
    this.logFunction(`[CodeAuth] Code displayed for ${phoneNumber}`, 'info');
  }

  /**
   * Validate code entry
   * @param {string} phoneNumber - Device phone number
   * @param {string} enteredCode - Code entered by user
   * @returns {boolean} - Valid or not
   */
  validateCode(phoneNumber, enteredCode) {
    const entry = this.activeCodes.get(phoneNumber);
    
    if (!entry) {
      this.logFunction(
        `[CodeAuth] ${phoneNumber}: No active code. Generate a new one.`,
        'warn'
      );
      return false;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.logFunction(
        `[CodeAuth] ${phoneNumber}: Code expired. Generating new one.`,
        'warn'
      );
      this.metrics.codesExpired++;
      this.activeCodes.delete(phoneNumber);
      return false;
    }

    // Check if already used
    if (entry.used) {
      this.logFunction(
        `[CodeAuth] ${phoneNumber}: Code already used.`,
        'warn'
      );
      return false;
    }

    // Increment attempt count
    entry.attempts++;

    // Check attempt limit
    if (entry.attempts > 3) {
      this.logFunction(
        `[CodeAuth] ${phoneNumber}: Too many invalid attempts (${entry.attempts}/3).`,
        'warn'
      );
      this.metrics.codesRejected++;
      this.activeCodes.delete(phoneNumber);
      return false;
    }

    // Validate code
    const normalizedEntered = String(enteredCode).replace(/\D/g, '').slice(0, 6).padStart(6, '0');
    const normalizedStored = String(entry.code).replace(/\D/g, '').padStart(6, '0');

    if (normalizedEntered === normalizedStored) {
      entry.used = true;
      entry.usedAt = Date.now();
      this.metrics.codesUsed++;

      // Calculate and track link time
      const linkTime = entry.usedAt - entry.generatedAt;
      this.metrics.linkTimes.push(linkTime);
      if (this.metrics.linkTimes.length > 50) {
        this.metrics.linkTimes.shift();
      }
      this.metrics.averageTimeToLink = Math.round(
        this.metrics.linkTimes.reduce((a, b) => a + b, 0) / this.metrics.linkTimes.length / 1000
      );

      this.logFunction(
        `[CodeAuth] ✅ Code validated for ${phoneNumber} (${linkTime / 1000}s)`,
        'success'
      );

      this.emit('code:validated', { phoneNumber, code: entry.code, linkTime });
      return true;
    }

    this.logFunction(
      `[CodeAuth] ❌ Invalid code for ${phoneNumber} (Attempt ${entry.attempts}/3)`,
      'warn'
    );
    
    this.emit('code:invalid', { phoneNumber, attempts: entry.attempts });
    return false;
  }

  /**
   * Get active code for phone number (for debugging/display)
   */
  getActiveCode(phoneNumber) {
    const entry = this.activeCodes.get(phoneNumber);
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.activeCodes.delete(phoneNumber);
      return null;
    }

    return {
      code: entry.code,
      expiresIn: Math.ceil((entry.expiresAt - Date.now()) / 1000),
      used: entry.used,
      attempts: entry.attempts
    };
  }

  /**
   * Clear code for phone number (after successful linking)
   */
  clearCode(phoneNumber) {
    if (this.activeCodes.has(phoneNumber)) {
      this.activeCodes.delete(phoneNumber);
      this.logFunction(`[CodeAuth] Code cleared for ${phoneNumber}`, 'debug');
      return true;
    }
    return false;
  }

  /**
   * Clean up expired codes (run periodically)
   */
  cleanupExpiredCodes() {
    const now = Date.now();
    let expiredCount = 0;

    for (const [phoneNumber, entry] of this.activeCodes.entries()) {
      if (now > entry.expiresAt) {
        this.activeCodes.delete(phoneNumber);
        expiredCount++;
        this.metrics.codesExpired++;
      }
    }

    if (expiredCount > 0) {
      this.logFunction(
        `[CodeAuth] Cleaned up ${expiredCount} expired codes`,
        'debug'
      );
    }
  }

  /**
   * Get metrics and statistics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeCodesCount: this.activeCodes.size,
      successRate: this.metrics.codesUsed > 0
        ? Math.round((this.metrics.codesUsed / this.metrics.codesGenerated) * 100)
        : 0
    };
  }

  /**
   * Handle fallback from QR to code
   * Called when QR code display fails
   */
  fallbackFromQR(phoneNumber) {
    this.metrics.fallbacksFromQR++;
    const code = this.generateCode(phoneNumber);
    
    if (code) {
      this.logFunction(
        `[CodeAuth] 🔄 Fallback from QR: Generated 6-digit code for ${phoneNumber}`,
        'info'
      );
      this.displayCodeInTerminal(code, phoneNumber);
      return code;
    }

    return null;
  }

  /**
   * Start cleanup interval (run every 10 seconds)
   */
  startCleanupInterval() {
    if (this.cleanupInterval) return; // Already running

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredCodes();
    }, 10000);

    this.logFunction('[CodeAuth] Cleanup interval started', 'debug');
  }

  /**
   * Stop cleanup interval
   */
  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.logFunction('[CodeAuth] Cleanup interval stopped', 'debug');
    }
  }
}
