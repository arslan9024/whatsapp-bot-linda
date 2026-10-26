/**
 * Data Processing Service
 * Phase 2 Week 2 Implementation - COMPLETE
 * 
 * Handles data extraction, transformation, and validation
 * Focused on phone number processing with zero sleep delays
 * 
 * MIGRATION:
 * ✅ getPhoneNumbersArrayFromRows() → extractPhoneNumbers()
 * ✅ getNumbersArrayFromRows() → extractPhoneNumbers() (consolidated)
 * ✨ NEW: Phone validation service (PhoneValidator)
 * ✨ NEW: Phone categorization service
 * ✨ NEW: Performance optimization (eliminate sleep)
 * ✨ NEW: Async batch processing
 * 
 * Version: 1.0.0 - PRODUCTION READY
 * Status: Week 2 Implementation Complete
 * Created: February 7, 2026
 */

import { logger } from '../utils/logger.js';
import { errorHandler } from '../utils/errorHandler.js';
import { readFileSync } from 'fs';

/**
 * DataProcessingService - Handle data transformation and validation
 * Focus: Phone number extraction, validation, and categorization
 */
class DataProcessingService {
  constructor(config = {}) {
    this.config = config;
    this.countryPhoneCodes = null;
    this.uaeMobileNetworkCodes = null;
    this.phoneValidator = new PhoneValidator();
    
    logger.info('DataProcessingService instantiated');
  }

  /**
   * Initialize the service - Load lookup tables
   */
  async initialize() {
    try {
      // Load country phone codes
      const countryCodesData = JSON.parse(
        readFileSync('./code/Contacts/countryPhoneCodes.json', 'utf8')
      );
      this.countryPhoneCodes = new Map();
      countryCodesData.forEach(item => {
        this.countryPhoneCodes.set(item.code, item);
      });

      // Load UAE mobile network codes
      const mobileCodesData = JSON.parse(
        readFileSync('./code/Contacts/UAEMobileNetworkCodes.json', 'utf8')
      );
      this.uaeMobileNetworkCodes = new Map();
      mobileCodesData.forEach(item => {
        this.uaeMobileNetworkCodes.set(item.code, item);
      });

      logger.info('DataProcessingService initialized', {
        countryCodesLoaded: this.countryPhoneCodes.size,
        mobileCodesLoaded: this.uaeMobileNetworkCodes.size
      });

      return true;
    } catch (error) {
      logger.error('DataProcessingService initialization failed', { error: error.message });
      throw errorHandler.handle(error, { 
        service: 'DataProcessingService', 
        method: 'initialize' 
      });
    }
  }

  /**
   * Extract phone numbers from sheet rows
   * MIGRATION: Replaces legacy getPhoneNumbersArrayFromRows()
   * KEY IMPROVEMENT: Uses async/parallel processing (NO SLEEP DELAYS)
   * 
   * @param {Array<Array>} rows - Sheet rows (2D array)
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>} Categorized phone numbers with statistics
   */
  async extractPhoneNumbers(rows, options = {}) {
    const startTime = Date.now();
    
    try {
      // Validate input
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error('Rows must be a non-empty array');
      }

      const defaultOptions = {
        phoneColumns: [5, 7, 8],
        ...options
      };

      // Result containers
      const result = {
        rows: rows.length,
        CorrectNumbers: [],
        HalfCorrectNumbers: [],
        updatedUAENumbers: [],
        WrongNumbers: [],
        stats: {
          totalProcessed: 0,
          correct: 0,
          halfCorrect: 0,
          uaeUpdated: 0,
          wrong: 0,
          processingTimeMs: 0,
          avgTimePerRowMs: 0
        }
      };

      // ASYNC PARALLEL PROCESSING - NO SLEEP DELAYS
      // Create task for each row
      const tasks = rows.map((row, idx) => 
        this.processRow(row, defaultOptions.phoneColumns, idx)
      );

      // Execute all tasks in parallel
      const processedRows = await Promise.all(tasks);

      // Consolidate all results
      for (const rowResult of processedRows) {
        result.CorrectNumbers.push(...rowResult.correct);
        result.HalfCorrectNumbers.push(...rowResult.halfCorrect);
        result.updatedUAENumbers.push(...rowResult.uaeUpdated);
        result.WrongNumbers.push(...rowResult.wrong);
      }

      // Calculate statistics
      result.stats.correct = result.CorrectNumbers.length;
      result.stats.halfCorrect = result.HalfCorrectNumbers.length;
      result.stats.uaeUpdated = result.updatedUAENumbers.length;
      result.stats.wrong = result.WrongNumbers.length;
      result.stats.totalProcessed = result.stats.correct + 
                                    result.stats.halfCorrect + 
                                    result.stats.uaeUpdated + 
                                    result.stats.wrong;
      result.stats.processingTimeMs = Date.now() - startTime;
      result.stats.avgTimePerRowMs = Math.round(result.stats.processingTimeMs / rows.length);

      logger.info('Phone extraction complete', result.stats);
      return result;
    } catch (error) {
      logger.error('Failed to extract phone numbers', { error: error.message });
      throw errorHandler.handle(error, { 
        service: 'DataProcessingService', 
        method: 'extractPhoneNumbers'
      });
    }
  }

  /**
   * Process a single row - Extract and categorize phones
   * Internal helper for extractPhoneNumbers
   */
  async processRow(row, phoneColumns, rowIndex) {
    const result = {
      correct: [],
      halfCorrect: [],
      uaeUpdated: [],
      wrong: []
    };

    try {
      for (const colIndex of phoneColumns) {
        if (!row[colIndex]) continue;

        const phoneNumber = String(row[colIndex]).trim();
        if (!phoneNumber) continue;

        // Validate phone number
        const validation = this.phoneValidator.validate(
          phoneNumber,
          this.countryPhoneCodes,
          this.uaeMobileNetworkCodes
        );

        // Categorize
        const category = this.phoneValidator.categorize(phoneNumber, validation);

        // Add to appropriate list
        switch (category) {
          case 'correct':
            result.correct.push(validation.formatted || phoneNumber);
            break;
          case 'halfCorrect':
            result.halfCorrect.push(phoneNumber);
            break;
          case 'uae':
            const formatted = this.phoneValidator.formatUAE(phoneNumber);
            result.uaeUpdated.push(formatted);
            break;
          case 'wrong':
          default:
            result.wrong.push(phoneNumber);
        }
      }
      return result;
    } catch (error) {
      logger.error('Failed to process row', { rowIndex, error: error.message });
      return result;
    }
  }

  /**
   * Validate a single phone number
   */
  async validatePhoneNumber(phoneNumber) {
    try {
      const validation = this.phoneValidator.validate(
        phoneNumber,
        this.countryPhoneCodes,
        this.uaeMobileNetworkCodes
      );

      const category = this.phoneValidator.categorize(phoneNumber, validation);

      return {
        isValid: validation.isValid,
        category,
        formatted: validation.formatted,
        countryCode: validation.countryCode,
        mobileCode: validation.mobileCode,
        validation
      };
    } catch (error) {
      logger.error('Failed to validate phone', { phoneNumber, error: error.message });
      throw errorHandler.handle(error, { 
        service: 'DataProcessingService', 
        method: 'validatePhoneNumber'
      });
    }
  }

  /**
   * De-duplicate phone numbers
   */
  deduplicatePhones(phoneNumbers) {
    try {
      const unique = [...new Set(phoneNumbers)];
      logger.debug('Deduplicated phones', { 
        before: phoneNumbers.length, 
        after: unique.length 
      });
      return unique;
    } catch (error) {
      logger.error('Failed to deduplicate phones', { error: error.message });
      throw errorHandler.handle(error, { 
        service: 'DataProcessingService', 
        method: 'deduplicatePhones'
      });
    }
  }

  /**
   * Format phone numbers to standard format
   */
  formatPhones(phoneNumbers, format = '971XXXXXXXXX') {
    try {
      const formatted = phoneNumbers.map(phone => {
        const cleaned = this.phoneValidator.cleanse(phone);
        if (cleaned.length === 9) {
          return '971' + cleaned;
        }
        return cleaned;
      });

      logger.debug('Formatted phones', { count: formatted.length });
      return formatted;
    } catch (error) {
      logger.error('Failed to format phones', { error: error.message });
      throw errorHandler.handle(error, { 
        service: 'DataProcessingService', 
        method: 'formatPhones'
      });
    }
  }

  /**
   * Batch process multiple datasets
   */
  async batchExtract(datasets) {
    try {
      if (!Array.isArray(datasets) || datasets.length === 0) {
        throw new Error('Datasets must be a non-empty array');
      }

      const tasks = datasets.map(dataset => 
        this.extractPhoneNumbers(dataset.rows, dataset.options || {})
      );

      const results = await Promise.all(tasks);

      logger.info('Batch extraction complete', { 
        datasetCount: datasets.length, 
        results: results.map(r => r.stats) 
      });

      return results;
    } catch (error) {
      logger.error('Failed to batch extract', { error: error.message });
      throw errorHandler.handle(error, { 
        service: 'DataProcessingService', 
        method: 'batchExtract'
      });
    }
  }
}

/**
 * PhoneValidator - Validates phone numbers against rules and lookup tables
 */
class PhoneValidator {
  /**
   * Cleanse phone number - Remove special chars and leading zeros
   */
  cleanse(number) {
    return String(number)
      .replace(/[^\d]/g, '')
      .replace(/^0+|(?<=971)0+/g, '');
  }

  /**
   * Validate phone number - Check format, country code, mobile code
   */
  validate(number, countryCodesMap, mobileCodesMap) {
    const cleaned = this.cleanse(number);
    
    // Find country code
    let countryCode = null;
    let countryCodeLength = 0;
    
    for (let len = 3; len >= 1; len--) {
      const code = cleaned.substring(0, len);
      if (countryCodesMap.has(code)) {
        countryCode = code;
        countryCodeLength = len;
        break;
      }
    }

    // Find mobile code (for UAE numbers)
    let mobileCode = null;
    if (countryCode === '971') {
      const nextThree = cleaned.substring(3, 6);
      if (mobileCodesMap.has(nextThree)) {
        mobileCode = nextThree;
      }
    }

    const length = cleaned.length;
    const formatted = countryCode ? 
      `${countryCode}${cleaned.substring(countryCodeLength)}` : null;

    return {
      isValid: countryCode !== null,
      length,
      countryCode,
      countryCodeLength,
      mobileCode,
      cleaned,
      formatted
    };
  }

  /**
   * Categorize phone number based on validation result
   */
  categorize(number, validation) {
    if (!validation.isValid) {
      return validation.length === 9 ? 'uae' : 'wrong';
    }

    if (validation.length === 12 && validation.countryCode && validation.mobileCode) {
      return 'correct';
    }

    if (validation.length === 10 && validation.countryCode === '971') {
      return 'halfCorrect';
    }

    return validation.mobileCode ? 'correct' : 'halfCorrect';
  }

  /**
   * Format UAE mobile number - Add 971 prefix
   */
  formatUAE(number) {
    const cleaned = this.cleanse(number);
    if (cleaned.length === 9) {
      return '971' + cleaned;
    }
    return cleaned;
  }
}

/**
 * PhoneCountryCodes - Utility for country code lookups
 */
class PhoneCountryCodes {
  static findCountryCode(number, codesArray) {
    return codesArray.find(item => number.startsWith(item.code));
  }

  static findMobileCode(number, codesArray) {
    return codesArray.find(item => number.substring(3, 6) === item.code);
  }

  static isValidCountryCode(code, codesArray) {
    return codesArray.some(item => item.code === code);
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let dataProcessingServiceInstance = null;

function getDataProcessingService(config = {}) {
  if (!dataProcessingServiceInstance) {
    dataProcessingServiceInstance = new DataProcessingService(config);
  }
  return dataProcessingServiceInstance;
}

export {
  DataProcessingService,
  PhoneValidator,
  PhoneCountryCodes,
  getDataProcessingService
};
