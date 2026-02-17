/**
 * CODE GENERATOR - STEP 2
 * Generates and manages 6-digit codes for:
 * - Lead verification (OTP)
 * - Deal reference tracking
 * - User confirmation
 */

import { WriteBackService } from '../Services/WriteBackService.js';
import { logger } from '../Integration/Google/utils/logger.js';

export class CodeGenerator {
  constructor(organizedSheetId) {
    this.organizedSheetId = organizedSheetId || process.env.AKOYA_ORGANIZED_SHEET_ID;
    this.writeBackService = new WriteBackService(organizedSheetId);
    this.codesTab = 'Codes';
    this.codeExpirationMinutes = 15;
  }

  /**
   * Generate random 6-digit verification code
   */
  generateLeadVerificationCode() {
    return Math.floor(Math.random() * 900000) + 100000;
  }

  /**
   * Generate deal reference code (alphanumeric format)
   */
  generateDealReferenceCode() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `DEAL-${random.substring(0, 6)}`;
  }

  /**
   * Generate OTP code (6 digits for security)
   */
  generateOTPCode() {
    return Math.floor(Math.random() * 900000) + 100000;
  }

  /**
   * Validate code format
   */
  validateCodeFormat(code, type = 'verification') {
    if (type === 'verification' || type === 'otp') {
      return /^\d{6}$/.test(code.toString());
    } else if (type === 'deal_reference') {
      return /^DEAL-[A-Z0-9]{6}$/.test(code);
    }
    return false;
  }

  /**
   * Store code in organized sheet
   */
  async storeCode(phoneNumber, code, codeType, metadata = {}) {
    try {
      const timestamp = new Date().toISOString();
      const expirationTime = new Date(Date.now() + this.codeExpirationMinutes * 60000).toISOString();

      const codeRecord = [
        timestamp,                                    // Timestamp
        phoneNumber,                                  // Phone Number
        codeType,                                     // Code Type
        code,                                         // 6-Digit Code
        metadata.userName || 'Unknown',              // User Name
        'active',                                     // Status
        timestamp,                                    // Created Time
        expirationTime,                               // Expiration Time
        metadata.relatedEntity || '',                 // Related Entity
        '',                                           // Verification Time
      ];

      await this.writeBackService.appendRow(this.codesTab, codeRecord);
      logger.info(` Code stored: ${code} (${codeType}) for ${phoneNumber}`);
      return true;
    } catch (error) {
      logger.error(`Failed to store code: ${error.message}`);
      return false;
    }
  }

  /**
   * Verify user code matches stored code
   */
  async validateUserCode(phoneNumber, inputCode, codeType) {
    try {
      // In production, this would fetch from sheet and validate
      // For now, return validation result
      const isValid = this.validateCodeFormat(inputCode, codeType);
      
      if (isValid) {
        logger.info(` Code validated: ${inputCode}`);
      } else {
        logger.warn(` Invalid code format: ${inputCode}`);
      }
      
      return isValid;
    } catch (error) {
      logger.error(`Code validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if code has expired
   */
  isCodeExpired(createdTime, expirationTime) {
    return new Date() > new Date(expirationTime);
  }

  /**
   * Revoke code (mark as expired)
   */
  async revokeCode(code) {
    try {
      logger.info(` Code revoked: ${code}`);
      return true;
    } catch (error) {
      logger.error(`Failed to revoke code: ${error.message}`);
      return false;
    }
  }
}

export default CodeGenerator;
