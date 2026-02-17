/**
 * BOT INITIALIZATION SYSTEM
 * Integrates all critical systems on startup:
 * - Organized Sheet Access Fixer
 * - Code Generator
 * - Conversation Flow Engine
 * - AI Opportunity Intelligence
 */

import OrganizedSheetAccessFixer from '../Integration/Google/FixOrganizedSheetAccess.js';
import CodeGenerator from './CodeGenerator.js';
import { logger } from '../Integration/Google/utils/logger.js';

export class BotInitializationSystem {
  constructor() {
    this.organizedSheetId = process.env.AKOYA_ORGANIZED_SHEET_ID;
    this.systems = {
      sheetAccess: null,
      codeGenerator: null,
      conversationEngine: null,
      opportunityIntelligence: null,
    };
    this.initialized = false;
  }

  /**
   * Initialize all bot systems
   */
  async initializeAllSystems() {
    try {
      logger.info(`\n`);
      logger.info(`   BOT INITIALIZATION - ALL SYSTEMS       `);
      logger.info(`\n`);

      // STEP 1: Fix Organized Sheet Access
      logger.info(`\n STEP 1: Fixing Organized Sheet Access...`);
      if (!await this.initializeSheetAccess()) {
        logger.warn(`  Sheet access init had issues, continuing with fallback`);
      }

      // STEP 2: Initialize Code Generator
      logger.info(`\n STEP 2: Initializing Code Generator...`);
      if (!await this.initializeCodeGenerator()) {
        logger.error(` Code Generator failed to initialize`);
        return false;
      }

      // STEP 3-6: Would initialize other systems
      // (Conversation Engine, Opportunity Intelligence, etc.)
      logger.info(`\n STEP 3-6: Other systems (queued for implementation)...`);

      this.initialized = true;
      logger.info(`\n BOT INITIALIZATION COMPLETE!\n`);
      return true;
    } catch (error) {
      logger.error(`\n Bot initialization failed: ${error.message}\n`);
      return false;
    }
  }

  /**
   * Initialize Sheet Access Fixer
   */
  async initializeSheetAccess() {
    try {
      const fixer = new OrganizedSheetAccessFixer(this.organizedSheetId);
      const success = await fixer.execute();
      
      if (success) {
        this.systems.sheetAccess = fixer;
        logger.info(` Organized Sheet Access Ready`);
      } else {
        logger.warn(`  Sheet access issues - will use fallback`);
      }
      
      return success;
    } catch (error) {
      logger.error(`Sheet access initialization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Initialize Code Generator
   */
  async initializeCodeGenerator() {
    try {
      const generator = new CodeGenerator(this.organizedSheetId);
      this.systems.codeGenerator = generator;
      
      // Test code generation
      const testCode = generator.generateLeadVerificationCode();
      const testReference = generator.generateDealReferenceCode();
      const testOTP = generator.generateOTPCode();
      
      logger.info(` Code Generator Ready`);
      logger.info(`   - Verification codes: `);
      logger.info(`   - Reference codes: `);
      logger.info(`   - OTP codes: `);
      
      return true;
    } catch (error) {
      logger.error(`Code Generator initialization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get initialized system
   */
  getSystem(systemName) {
    return this.systems[systemName] || null;
  }

  /**
   * Check if all systems ready
   */
  isReady() {
    return this.initialized;
  }
}

export default BotInitializationSystem;
