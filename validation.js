/**
 * Validation Utilities Module
 * Provides common validation functions for bot operations
 */

import logger from './logger.js';

/**
 * Validates phone number format
 * @param {string} number - Phone number to validate
 * @param {string} countryCode - Expected country code (default: 971 for UAE)
 * @returns {boolean}
 */
export function validatePhoneNumber(number, countryCode = '971') {
  if (!number || typeof number !== 'string') {
    logger.warn('Invalid phone number type', { number });
    return false;
  }

  // Remove any non-digit characters
  const cleaned = number.replace(/\D/g, '');

  // Check if it starts with country code
  if (!cleaned.startsWith(countryCode)) {
    logger.warn('Phone number missing country code', {
      number: cleaned,
      expected: countryCode,
    });
    return false;
  }

  // Check length (typical: 12 digits for 971 + 9 digit number)
  if (cleaned.length < 10 || cleaned.length > 15) {
    logger.warn('Phone number length invalid', {
      number: cleaned,
      length: cleaned.length,
    });
    return false;
  }

  return true;
}

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates that value is non-empty
 * @param {any} value - Value to validate
 * @returns {boolean}
 */
export function validateRequired(value) {
  return value !== null && value !== undefined && value !== '';
}

/**
 * Validates array is not empty
 * @param {array} arr - Array to validate
 * @returns {boolean}
 */
export function validateNonEmptyArray(arr) {
  return Array.isArray(arr) && arr.length > 0;
}

/**
 * Validates message content
 * @param {string} message - Message to validate
 * @param {number} maxLength - Maximum message length
 * @returns {boolean}
 */
export function validateMessage(message, maxLength = 4096) {
  if (!validateRequired(message)) {
    return false;
  }

  if (typeof message !== 'string') {
    return false;
  }

  if (message.length > maxLength) {
    logger.warn('Message exceeds maximum length', {
      length: message.length,
      maxLength,
    });
    return false;
  }

  return true;
}

/**
 * Validates JSON data
 * @param {any} data - Data to validate as JSON
 * @returns {boolean}
 */
export function validateJSON(data) {
  try {
    JSON.stringify(data);
    return true;
  } catch {
    logger.warn('Invalid JSON data');
    return false;
  }
}

/**
 * Sanitizes input string (removes dangerous characters)
 * @param {string} input - Input string to sanitize
 * @returns {string}
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
}

/**
 * Validates file path for safety
 * @param {string} filePath - File path to validate
 * @returns {boolean}
 */
export function validateFilePath(filePath) {
  if (!validateRequired(filePath)) {
    return false;
  }

  // Prevent path traversal attacks
  if (filePath.includes('..')) {
    logger.warn('Invalid file path - contains path traversal', { filePath });
    return false;
  }

  return true;
}

export default {
  validatePhoneNumber,
  validateEmail,
  validateRequired,
  validateNonEmptyArray,
  validateMessage,
  validateJSON,
  sanitizeInput,
  validateFilePath,
};
