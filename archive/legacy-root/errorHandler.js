/**
 * Error Handler Module
 * Provides centralized error handling with recovery strategies
 */

import { Logger } from './logger.js';

const logger = new Logger('ErrorHandler');

/**
 * Custom Error Classes
 */
export class BotError extends Error {
  constructor(message, code = 'BOT_ERROR', details = {}) {
    super(message);
    this.name = 'BotError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

export class WhatsAppError extends BotError {
  constructor(message, details = {}) {
    super(message, 'WHATSAPP_ERROR', details);
    this.name = 'WhatsAppError';
  }
}

export class ConfigError extends BotError {
  constructor(message, details = {}) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigError';
  }
}

export class ValidationError extends BotError {
  constructor(message, details = {}) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Handles errors with logging and recovery
 */
export function handleError(error, context = {}) {
  // Extract error information
  const errorInfo = {
    name: error.name || 'UnknownError',
    message: error.message,
    code: error.code || 'UNKNOWN',
    details: error.details || {},
    context,
    timestamp: new Date().toISOString(),
  };

  // Log the error
  logger.exception(error, {
    ...context,
    code: error.code,
  });

  // Return structured error response
  return {
    success: false,
    error: errorInfo,
  };
}

/**
 * Wraps async functions with error handling
 */
export function withErrorHandling(asyncFn, errorContext = {}) {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      return handleError(error, {
        ...errorContext,
        args: args.length > 0 ? String(args[0]).substring(0, 100) : 'none',
      });
    }
  };
}

/**
 * Validates required parameters
 */
export function validateParams(params = {}, required = []) {
  const missing = required.filter(key => !params[key]);
  
  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required parameters: ${missing.join(', ')}`,
      { missing }
    );
  }
  
  return true;
}

/**
 * Global error handlers
 */
export function setupGlobalErrorHandlers() {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
      reason: String(reason),
      promise: String(promise),
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
      message: error.message,
      stack: error.stack,
    });
    // Exit process in production
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });
}

export default {
  BotError,
  WhatsAppError,
  ConfigError,
  ValidationError,
  handleError,
  withErrorHandling,
  validateParams,
  setupGlobalErrorHandlers,
};
