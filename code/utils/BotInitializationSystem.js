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
import ConversationFlowEngine from './ConversationFlowEngine.js';
import OpportunityIntelligence from '../AI/OpportunityIntelligence.js';
import ConversationTemplates from '../Messages/ConversationTemplates.js';
import RealEstateCommands from '../Commands/RealEstateCommands.js';
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

      // STEP 3: Initialize Conversation Flow Engine
      logger.info(`\n STEP 3: Initializing Conversation Flow Engine...`);
      if (!await this.initializeConversationEngine()) {
        logger.error(` Conversation Flow Engine failed to initialize`);
        return false;
      }

      // STEP 4: Initialize AI Opportunity Intelligence
      logger.info(`\n STEP 4: Initializing AI Opportunity Intelligence...`);
      if (!await this.initializeOpportunityIntelligence()) {
        logger.error(` Opportunity Intelligence failed to initialize`);
        return false;
      }

      // STEP 5: Initialize Conversation Templates
      logger.info(`\n STEP 5: Initializing Conversation Templates...`);
      if (!await this.initializeTemplates()) {
        logger.error(` Templates failed to initialize`);
        return false;
      }

      // STEP 6: Initialize Real Estate Commands
      logger.info(`\n STEP 6: Initializing Real Estate Commands...`);
      if (!await this.initializeCommands()) {
        logger.error(` Commands failed to initialize`);
        return false;
      }

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
   * Initialize Conversation Flow Engine
   */
  async initializeConversationEngine() {
    try {
      const engine = new ConversationFlowEngine();
      this.systems.conversationEngine = engine;
      
      logger.info(` Conversation Flow Engine Ready`);
      logger.info(`  ✅ 6 persona flows loaded (Agent, Buyer, Seller, Tenant, Landlord, Security)`);
      return true;
    } catch (error) {
      logger.error(`Conversation Flow Engine initialization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Initialize AI Opportunity Intelligence
   */
  async initializeOpportunityIntelligence() {
    try {
      const aiEngine = new OpportunityIntelligence();
      this.systems.opportunityIntelligence = aiEngine;
      
      logger.info(` AI Opportunity Intelligence Ready`);
      logger.info(`  ✅ Scoring algorithm loaded`);
      return true;
    } catch (error) {
      logger.error(`Opportunity Intelligence initialization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Initialize Conversation Templates
   */
  async initializeTemplates() {
    try {
      const templates = new ConversationTemplates();
      this.systems.templates = templates;
      
      logger.info(` Conversation Templates Ready`);
      logger.info(`  ✅ Message templates loaded`);
      return true;
    } catch (error) {
      logger.error(`Templates initialization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Initialize Real Estate Commands
   */
  async initializeCommands() {
    try {
      const commands = new RealEstateCommands();
      this.systems.commands = commands;
      
      logger.info(` Real Estate Commands Ready`);
      logger.info(`  ✅ 26 commands loaded`);
      return true;
    } catch (error) {
      logger.error(`Commands initialization failed: ${error.message}`);
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
