/**
 * Google API Error Handler
 * Centralized error handling for Google API services
 * 
 * Version: 1.0.0
 * Last Updated: February 7, 2026
 */

import { logger } from './logger.js';
import { ERROR_CODES, ERROR_MESSAGES } from '../config/constants.js';

// ============================================================================
// CLASS: GoogleApiError
// ============================================================================

class GoogleApiError extends Error {
  /**
   * Initialize API error
   * @param {string} code - Error code
   * @param {string} message - Error message
   * @param {Object} details - Additional error details
   * @param {number} statusCode - HTTP status code
   */
  constructor(code, message, details = {}, statusCode = 500) {
    super(message);
    this.name = 'GoogleApiError';
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
    this.retryable = this.isRetryable();
  }

  /**
   * Check if error is retryable
   * @returns {boolean} True if error can be retried
   */
  isRetryable() {
    // Rate limit and quota errors are retryable
    if (this.code === ERROR_CODES.API_RATE_LIMIT || 
        this.code === ERROR_CODES.API_QUOTA_EXCEEDED) {
      return true;
    }

    // 5xx errors are retryable
    if (this.statusCode >= 500) {
      return true;
    }

    // Token refresh errors are retryable
    if (this.code === ERROR_CODES.TOKEN_REFRESH_FAILED) {
      return true;
    }

    return false;
  }

  /**
   * Convert error to plain object
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      retryable: this.retryable,
    };
  }
}

// ============================================================================
// CLASS: GoogleApiErrorHandler
// ============================================================================

class GoogleApiErrorHandler {
  /**
   * Initialize error handler
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = options;
    this.errorMetrics = {
      total: 0,
      byCode: {},
      byStatusCode: {},
    };
  }

  /**
   * Handle error from Google API call
   * @param {Error} error - Original error
   * @param {Object} context - Error context
   * @returns {GoogleApiError} Handled error
   */
  handle(error, context = {}) {
    const { service = 'Unknown', method = 'Unknown', retryAttempt = 0 } = context;

    logger.error(`API Error occurred`, {
      service,
      method,
      retryAttempt,
      error: error.message,
    });

    // Parse the error
    let apiError;

    if (error instanceof GoogleApiError) {
      apiError = error;
    } else if (error.response && error.response.status) {
      // Axios or similar error
      apiError = this.parseHttpError(error, context);
    } else if (error.code) {
      // Google API error
      apiError = this.parseGoogleApiError(error, context);
    } else {
      // Unknown error
      apiError = new GoogleApiError(
        ERROR_CODES.UNKNOWN_ERROR,
        error.message || ERROR_MESSAGES.UNKNOWN_ERROR,
        { originalError: error.message },
        500
      );
    }

    // Update metrics
    this.recordError(apiError);

    return apiError;
  }

  /**
   * Parse HTTP error response
   * @param {Error} error - HTTP error
   * @param {Object} context - Error context
   * @returns {GoogleApiError} Parsed error
   * @private
   */
  parseHttpError(error, context = {}) {
    const statusCode = error.response?.status || 500;
    const responseData = error.response?.data || {};

    let code = ERROR_CODES.API_ERROR;
    let message = ERROR_MESSAGES.API_ERROR;

    // Map HTTP status codes to error codes
    switch (statusCode) {
      case 400:
        code = ERROR_CODES.VALIDATION_ERROR;
        message = responseData.error?.message || 'Invalid request';
        break;
      case 401:
        code = ERROR_CODES.INVALID_CREDENTIALS;
        message = 'Authentication failed. Invalid or expired credentials.';
        break;
      case 403:
        code = ERROR_CODES.INVALID_CREDENTIALS;
        message = 'Access denied. Check permissions.';
        break;
      case 404:
        code = ERROR_CODES.API_NOT_FOUND;
        message = 'Resource not found.';
        break;
      case 429:
        code = ERROR_CODES.API_RATE_LIMIT;
        message = 'Rate limit exceeded. Please wait and retry.';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        code = ERROR_CODES.SERVICE_UNAVAILABLE;
        message = 'Google service temporarily unavailable.';
        break;
    }

    return new GoogleApiError(
      code,
      message,
      {
        statusCode,
        originalError: error.message,
        responseData: responseData.error || responseData,
      },
      statusCode
    );
  }

  /**
   * Parse Google API error
   * @param {Error} error - Google API error
   * @param {Object} context - Error context
   * @returns {GoogleApiError} Parsed error
   * @private
   */
  parseGoogleApiError(error, context = {}) {
    const errorDetails = error.errors?.[0] || {};
    const code = errorDetails.code;

    let apiCode = ERROR_CODES.API_ERROR;
    let message = ERROR_MESSAGES.API_ERROR;

    // Map Google error codes
    switch (code) {
      case 'invalid_grant':
        apiCode = ERROR_CODES.TOKEN_INVALID;
        message = 'Invalid or expired token. Please re-authenticate.';
        break;
      case 'invalid_client':
        apiCode = ERROR_CODES.INVALID_CREDENTIALS;
        message = 'Invalid client credentials.';
        break;
      case 'quotaExceeded':
        apiCode = ERROR_CODES.API_QUOTA_EXCEEDED;
        message = 'API quota exceeded. Please wait.';
        break;
      case 'rateLimitExceeded':
        apiCode = ERROR_CODES.API_RATE_LIMIT;
        message = 'Rate limit exceeded. Please slow down.';
        break;
      case 'notFound':
        apiCode = ERROR_CODES.API_NOT_FOUND;
        message = 'Resource not found.';
        break;
    }

    return new GoogleApiError(
      apiCode,
      message,
      {
        googleErrorCode: code,
        googleErrorMessage: errorDetails.message || error.message,
        originalError: error.message,
      },
      error.code || 500
    );
  }

  /**
   * Handle authentication error
   * @param {Error} error - Auth error
   * @returns {GoogleApiError} Handled error
   */
  handleAuthError(error) {
    logger.error('Authentication error', { error: error.message });

    return this.handle(error, { service: 'Authentication', method: 'authenticate' });
  }

  /**
   * Handle quota error
   * @param {Error} error - Quota error
   * @returns {GoogleApiError} Handled error
   */
  handleQuotaError(error) {
    logger.warn('Quota error', { error: error.message });

    return new GoogleApiError(
      ERROR_CODES.API_QUOTA_EXCEEDED,
      ERROR_MESSAGES.API_QUOTA_EXCEEDED,
      { originalError: error.message },
      429
    );
  }

  /**
   * Handle rate limit error
   * @param {Error} error - Rate limit error
   * @param {number} retryAfter - Retry after seconds
   * @returns {GoogleApiError} Handled error
   */
  handleRateLimitError(error, retryAfter = null) {
    logger.warn('Rate limit error', { error: error.message, retryAfter });

    return new GoogleApiError(
      ERROR_CODES.API_RATE_LIMIT,
      ERROR_MESSAGES.API_RATE_LIMIT,
      { originalError: error.message, retryAfter },
      429
    );
  }

  /**
   * Handle token expiration
   * @returns {GoogleApiError} Handled error
   */
  handleTokenExpiration() {
    logger.warn('Token expired');

    return new GoogleApiError(
      ERROR_CODES.TOKEN_EXPIRED,
      ERROR_MESSAGES.TOKEN_EXPIRED,
      { recoverable: true },
      401
    );
  }

  /**
   * Handle validation error
   * @param {string} message - Validation error message
   * @param {Object} details - Validation details
   * @returns {GoogleApiError} Handled error
   */
  handleValidationError(message, details = {}) {
    logger.warn('Validation error', { message, details });

    return new GoogleApiError(
      ERROR_CODES.VALIDATION_ERROR,
      message || ERROR_MESSAGES.VALIDATION_ERROR,
      details,
      400
    );
  }

  /**
   * Record error metric
   * @param {GoogleApiError} error - Error to record
   * @private
   */
  recordError(error) {
    this.errorMetrics.total++;

    // Count by code
    if (!this.errorMetrics.byCode[error.code]) {
      this.errorMetrics.byCode[error.code] = 0;
    }
    this.errorMetrics.byCode[error.code]++;

    // Count by status code
    const statusCode = error.statusCode || 500;
    if (!this.errorMetrics.byStatusCode[statusCode]) {
      this.errorMetrics.byStatusCode[statusCode] = 0;
    }
    this.errorMetrics.byStatusCode[statusCode]++;
  }

  /**
   * Get error metrics
   * @returns {Object} Error metrics
   */
  getMetrics() {
    return JSON.parse(JSON.stringify(this.errorMetrics));
  }

  /**
   * Reset error metrics
   */
  resetMetrics() {
    this.errorMetrics = {
      total: 0,
      byCode: {},
      byStatusCode: {},
    };
  }

  /**
   * Calculate exponential backoff delay
   * @param {number} retryAttempt - Current retry attempt (0-based)
   * @param {number} maxDelay - Maximum delay in milliseconds
   * @returns {number} Delay in milliseconds
   */
  calculateBackoffDelay(retryAttempt = 0, maxDelay = 30000) {
    const baseDelay = 1000; // 1 second
    const multiplier = 2;
    const delay = baseDelay * Math.pow(multiplier, retryAttempt);

    // Add random jitter (±10%)
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
    const totalDelay = Math.min(delay + jitter, maxDelay);

    return Math.max(totalDelay, baseDelay);
  }

  /**
   * Check if error is retryable
   * @param {GoogleApiError} error - Error to check
   * @returns {boolean} True if can retry
   */
  isRetryable(error) {
    if (!(error instanceof GoogleApiError)) {
      return false;
    }
    return error.retryable;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let errorHandlerInstance = null;

/**
 * Get or create error handler instance
 * @param {Object} options - Configuration options
 * @returns {GoogleApiErrorHandler} Error handler instance
 */
function getErrorHandler(options = {}) {
  if (!errorHandlerInstance) {
    errorHandlerInstance = new GoogleApiErrorHandler(options);
  }
  return errorHandlerInstance;
}

// ============================================================================
// EXPORTS
// ============================================================================

const errorHandler = getErrorHandler();

export {
  GoogleApiError,
  GoogleApiErrorHandler,
  getErrorHandler,
  errorHandler,
};
