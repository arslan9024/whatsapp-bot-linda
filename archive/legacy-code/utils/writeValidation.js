/**
 * Write Validation Service (Session 16 - Phase 6)
 * 
 * Validates records before writing to organized sheet
 * Ensures data quality, prevents duplicates, and validates permissions
 * 
 * Usage:
 *   import { validateRecordBeforeWrite } from './writeValidation.js';
 *   const validation = await validateRecordBeforeWrite('CONTACT', {
 *     phone: '+971501234567',
 *     name: 'Ahmed'
 *   });
 *   if (validation.canWrite) {
 *     await sheetWriteBackService.writeNewRecord(...);
 *   }
 */

import { PhoneValidator } from '../Integration/Google/utils/PhoneValidator.js';

/**
 * Comprehensive validation before write
 * @param {string} recordType - 'CONTACT' | 'PROPERTY' | 'FINANCIAL' | 'OTHER'
 * @param {Object} record - Record to validate
 * @param {Object} options - Validation options
 * @returns {Promise<Object>} Validation result
 */
export async function validateRecordBeforeWrite(recordType, record, options = {}) {
  const {
    checkDuplicate = true,
    existingRecords = [],
    checkPermissions = false,
    sheetsService = null
  } = options;

  const validation = {
    canWrite: true,
    reason: null,
    warnings: [],
    errors: [],
    fieldValidation: {}
  };

  // Step 1: Type validation
  const typeValidation = validateRecordType(recordType);
  if (!typeValidation.valid) {
    validation.canWrite = false;
    validation.reason = typeValidation.reason;
    return validation;
  }

  // Step 2: Required fields validation
  const fieldValidation = validateRequiredFields(recordType, record);
  validation.fieldValidation = fieldValidation;
  
  if (!fieldValidation.valid) {
    validation.canWrite = false;
    validation.reason = fieldValidation.reason;
    validation.errors = fieldValidation.missingFields;
    return validation;
  }

  // Step 3: Field format validation
  const formatValidation = validateFieldFormats(recordType, record);
  if (!formatValidation.valid) {
    if (formatValidation.critical) {
      validation.canWrite = false;
      validation.reason = formatValidation.reason;
      return validation;
    } else {
      validation.warnings.push(formatValidation.reason);
    }
  }

  // Step 4: Duplicate detection
  if (checkDuplicate && existingRecords.length > 0) {
    const duplicateCheck = checkForDuplicates(recordType, record, existingRecords);
    if (duplicateCheck.isDuplicate) {
      validation.canWrite = false;
      validation.reason = `Duplicate detected: ${duplicateCheck.matchType}`;
      validation.existingCode = duplicateCheck.code;
      return validation;
    }
    if (duplicateCheck.similar) {
      validation.warnings.push(`Similar record found: ${duplicateCheck.code} (${duplicateCheck.similarity}% match)`);
    }
  }

  // Step 5: Phone validation (if applicable)
  if (record.phone) {
    const phoneValidation = await validatePhoneNumber(record.phone);
    if (!phoneValidation.valid) {
      validation.warnings.push(`Phone validation: ${phoneValidation.reason}`);
    } else {
      validation.normalizedPhone = phoneValidation.normalized;
    }
  }

  // Step 6: Sheet permissions check
  if (checkPermissions && sheetsService) {
    const permissionCheck = await checkSheetWritePermissions(sheetsService);
    if (!permissionCheck.hasWriteAccess) {
      validation.canWrite = false;
      validation.reason = 'No write access to organized sheet';
      return validation;
    }
  }

  // Step 7: Code format validation
  if (record.Code) {
    const codeValidation = validateCodeFormat(record.Code);
    if (!codeValidation.valid) {
      validation.canWrite = false;
      validation.reason = `Invalid code format: ${codeValidation.reason}`;
      return validation;
    }
  }

  // Final decision
  if (validation.errors.length > 0) {
    validation.canWrite = false;
    validation.reason = `Validation errors: ${validation.errors.join(', ')}`;
  }

  return validation;
}

/**
 * Validate record type
 * @private
 */
function validateRecordType(type) {
  const validTypes = ['CONTACT', 'PROPERTY', 'FINANCIAL', 'OTHER'];
  
  if (!validTypes.includes(type)) {
    return {
      valid: false,
      reason: `Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Validate required fields by type
 * @private
 */
function validateRequiredFields(recordType, record) {
  const requirements = {
    CONTACT: {
      required: [],  // At least one of: phone, email, name
      atLeastOne: ['phone', 'email', 'name']
    },
    PROPERTY: {
      required: [],  // At least one of: property, unit
      atLeastOne: ['property', 'unit']
    },
    FINANCIAL: {
      required: [],  // At least one of: price, amount
      atLeastOne: ['price', 'amount']
    },
    OTHER: {
      required: [],
      atLeastOne: []
    }
  };

  const req = requirements[recordType];
  
  // Check required fields
  const missingRequired = req.required.filter(field => !record[field]);
  if (missingRequired.length > 0) {
    return {
      valid: false,
      reason: `Missing required fields: ${missingRequired.join(', ')}`,
      missingFields: missingRequired
    };
  }

  // Check at-least-one fields
  if (req.atLeastOne.length > 0) {
    const hasAtLeastOne = req.atLeastOne.some(field => record[field]);
    if (!hasAtLeastOne) {
      return {
        valid: false,
        reason: `Must have at least one of: ${req.atLeastOne.join(', ')}`,
        missingFields: req.atLeastOne
      };
    }
  }

  return { valid: true };
}

/**
 * Validate field formats (phone, email, etc)
 * @private
 */
function validateFieldFormats(recordType, record) {
  // Email validation
  if (record.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(record.email)) {
      return {
        valid: false,
        critical: false,
        reason: `Invalid email format: ${record.email}`
      };
    }
  }

  // Price/amount validation
  if (record.price || record.amount) {
    const value = record.price || record.amount;
    if (isNaN(value)) {
      return {
        valid: false,
        critical: true,
        reason: `Invalid price/amount: ${value} (not a number)`
      };
    }
  }

  // Unit number validation
  if (record.unit) {
    if (!/^[A-Z0-9\-]+$/.test(record.unit)) {
      return {
        valid: false,
        critical: false,
        reason: `Unit format unusual: ${record.unit} (expected alphanumeric)`
      };
    }
  }

  return { valid: true };
}

/**
 * Check for duplicate records
 * @private
 */
function checkForDuplicates(recordType, record, existingRecords) {
  const result = {
    isDuplicate: false,
    similar: false,
    code: null,
    matchType: null,
    similarity: 0
  };

  for (const existing of existingRecords) {
    // Exact match checks
    if (recordType === 'CONTACT') {
      // Phone exact match
      if (record.phone && existing.phone === record.phone) {
        result.isDuplicate = true;
        result.matchType = 'phone';
        result.code = existing.Code;
        return result;
      }

      // Email exact match
      if (record.email && existing.email === record.email) {
        result.isDuplicate = true;
        result.matchType = 'email';
        result.code = existing.Code;
        return result;
      }

      // Last 9 digits of phone match (alternate phone number)
      if (record.phone && existing.phone) {
        const rec9 = record.phone.slice(-9);
        const ex9 = existing.phone.slice(-9);
        if (rec9 === ex9) {
          result.similar = true;
          result.code = existing.Code;
          result.similarity = 85;
          return result;
        }
      }
    }

    if (recordType === 'PROPERTY') {
      // Exact property + unit match
      if (record.property === existing.property && record.unit === existing.unit) {
        result.isDuplicate = true;
        result.matchType = 'property_unit';
        result.code = existing.Code;
        return result;
      }
    }

    if (recordType === 'FINANCIAL') {
      // Same property + price match
      if (record.property === existing.property && record.price === existing.price) {
        result.isDuplicate = true;
        result.matchType = 'property_price';
        result.code = existing.Code;
        return result;
      }
    }
  }

  return result;
}

/**
 * Validate phone number
 * @private
 */
async function validatePhoneNumber(phone) {
  try {
    const validator = new PhoneValidator();
    const validation = await validator.validateContactNumber(phone, 'AE');
    
    return {
      valid: validation.isValid,
      reason: validation.error || 'Valid phone',
      normalized: validation.formattedNumber
    };
  } catch (error) {
    return {
      valid: false,
      reason: `Phone validation error: ${error.message}`,
      normalized: phone
    };
  }
}

/**
 * Check sheet write permissions
 * @private
 */
async function checkSheetWritePermissions(sheetsService) {
  try {
    // Attempt a test write to a dummy cell
    await sheetsService.updateCell('Master Data!ZZ1', 'test');
    return { hasWriteAccess: true };
  } catch (error) {
    return {
      hasWriteAccess: false,
      error: error.message
    };
  }
}

/**
 * Validate code format
 * @private
 */
function validateCodeFormat(code) {
  // Format: P/C/F followed by 5 digits
  const codeRegex = /^[PCF]\d{5}$/;
  
  if (!codeRegex.test(code)) {
    return {
      valid: false,
      reason: `Expected format: P/C/F followed by 5 digits (e.g., P00001). Got: ${code}`
    };
  }

  return { valid: true };
}

/**
 * Batch validate multiple records
 * @param {Array} records - Records to validate
 * @param {Object} options - Validation options
 * @returns {Promise<Array>} Array of validation results
 */
export async function batchValidateRecords(records, options = {}) {
  const results = await Promise.all(
    records.map(record =>
      validateRecordBeforeWrite(
        record.recordType,
        record.recordData,
        options
      )
    )
  );

  return {
    total: records.length,
    valid: results.filter(r => r.canWrite).length,
    invalid: results.filter(r => !r.canWrite).length,
    details: results
  };
}

export default { validateRecordBeforeWrite, batchValidateRecords };
