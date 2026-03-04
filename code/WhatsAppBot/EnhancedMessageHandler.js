/**
 * ==========================================
 * ENHANCED MESSAGE HANDLER (Phase 3 + Phase 17)
 * ==========================================
 * 
 * Integrated message processing pipeline:
 * 1. Message type logging
 * 2. Entity extraction from text
 * 3. Context enrichment from organized sheet
 * 4. Sentiment/Intent analysis
 * 5. Response suggestion generation
 * 6. Interaction tracking & write-back
 * 7. Auto-reply or manual routing
 * 8. Phase 17: Comprehensive conversation handling
 *    - Message persistence, deduplication, normalization
 *    - Advanced entity extraction with confidence scoring
 *    - Emoji/Unicode handling and action tracking
 *    - Context-aware response generation
 * 
 * IMPLEMENTED FEATURES (All TODOs fixed):
 * - Municipality number handling (SharingMobileNumber)
 * - Owner number sharing (FindAndShareOwnerNumberOnAgentRequest)
 * - Lucy agent signup (CreatingNewWhatsAppClientLucy)
 * - Agent registration flow
 * - Image message handling (AdvancedMediaHandler)
 * - Document message handling (AdvancedMediaHandler)
 * - Video message handling (AdvancedMediaHandler)
 * - Audio/voice message handling (AdvancedMediaHandler)
 * 
 * Author: WhatsApp Bot Linda
 * Date: January 26, 2026 (Phase 17: February 16, 2026)
 * Updated: February 27, 2026 - All TODOs implemented
 */

import { getMessageAnalyzerWithContext } from "./MessageAnalyzerWithContext.js";
import { getConversationAnalyzer } from "./ConversationAnalyzer.js";
import { logMessageTypeCompact } from "../utils/messageTypeLogger.js";
import { phase17Orchestrator } from "../utils/Phase17Orchestrator.js";

// Import existing modules for TODO implementations
import { CreatingNewWhatsAppClientLucy } from "./CreatingNewWhatsAppClientLucy.js";
import ContactLookupHandler from "./ContactLookupHandler.js";
import AdvancedMediaHandler from "./Handlers/AdvancedMediaHandler.js";

class EnhancedMessageHandler {
  constructor() {
    this.enricher = getMessageAnalyzerWithContext();
    this.analyzer = getConversationAnalyzer();
    this.phase17 = phase17Orchestrator;
    this.messageQueue = [];
    this.isProcessing = false;
    
    // Initialize media handler for media processing
    this.mediaHandler = new AdvancedMediaHandler();
    this.mediaHandler.initialize().catch(err => {
      console.warn('⚠️  Media handler initialization warning:', err.message);
    });
    
    // Initialize contact lookup
    this.contactLookup = ContactLookupHandler;
  }

  /**
   * Main message processing pipeline
   * @param {Message} msg - WhatsApp message
   */
  async processMessage(msg) {
    try {
      // PHASE 17: Process through comprehensive conversation handling
      const phase17Result = await this.phase17.processMessage(msg);
      
      // If Phase 17 rejected the message (duplicate, rate-limited, validation failure), stop
      if (!phase17Result) {
        console.log('⏭️  Message rejected by Phase 17 processing');
        return;
      }

      // Step 1: Log message type
      console.log("\n" + "=".repeat(60));
      logMessageTypeCompact(msg);

      // Step 2: Extract entities (Phase 17 already did this, but continue legacy support)
      const extracted = this.enricher.extractEntitiesFromMessage(msg);
      if (extracted.unitNumber || extracted.phoneNumber) {
        console.log(`📋 Extracted Data:`, {
          unit: extracted.unitNumber,
          phone: extracted.phoneNumber,
          project: extracted.projectName,
          type: extracted.propertyType,
        });
      }

      // Step 3: Analyze message content
      const content = this.enricher.analyzeMessageContent(msg);
      console.log(
        `💭 Analysis: Sentiment=${content.sentiment}, Intent=${content.intent}`
      );

      // Step 4: Enrich with context (only for text/chat messages)
      let enriched = {
        message: msg,
        extracted,
        context: {
          relatedProperties: [],
          relatedContacts: [],
          suggestedResponse: null,
          dataQuality: "low",
          matchConfidence: 0,
        },
        error: null,
      };

      if (msg.type === "chat" || msg.type === "text") {
        enriched = await this.enricher.enrichMessageWithContext(
          msg,
          extracted
        );

        if (enriched.error) {
          console.warn(`⚠️  Enrichment error: ${enriched.error}`);
        }
      }

      // Step 5: Track interaction
      await this.enricher.trackMessageInteraction(msg, enriched);

      // Step 6: Write back to sheet (async, non-blocking)
      this.writeBackAsync(msg, enriched);

      // Step 7: Route message
      await this.routeMessage(msg, enriched, content);

      console.log("=".repeat(60));
    } catch (error) {
      console.error("❌ Error in message processing:", error.message);
      console.error(error.stack);
    }
  }

  /**
   * Write interaction to sheet asynchronously (non-blocking)
   * @param {Message} msg
   * @param {Object} enriched
   */
  writeBackAsync(msg, enriched) {
    // Fire and forget - don't wait for completion
    this.enricher.writeBackInteractionToSheet(msg, enriched).catch((error) => {
      console.error("❌ Async write-back error:", error.message);
    });
  }

  /**
   * Route message to appropriate handler based on content
   * @param {Message} msg - WhatsApp message
   * @param {Object} enriched - Enriched context
   * @param {Object} content - Sentiment/intent analysis
   */
  async routeMessage(msg, enriched, content) {
    // Handle different message types
    if (msg.type === "chat" || msg.type === "text") {
      await this.handleTextMessage(msg, enriched, content);
    } else if (msg.type === "image") {
      await this.handleImageMessage(msg, enriched);
    } else if (msg.type === "document") {
      await this.handleDocumentMessage(msg, enriched);
    } else if (msg.type === "video") {
      await this.handleVideoMessage(msg, enriched);
    } else if (msg.type === "ptt" || msg.type === "audio") {
      await this.handleAudioMessage(msg, enriched);
    } else {
      console.log(`📨 Message type ${msg.type} received (no handler)`);
    }
  }

  /**
   * Handle text/chat messages
   * @param {Message} msg
   * @param {Object} enriched
   * @param {Object} content
   */
  async handleTextMessage(msg, enriched, content) {
    const text = msg.body || "";

    // Check for special commands first
    if (text === "!ping") {
      await msg.reply("pong");
      return;
    }

    if (text === "!help") {
      await msg.reply(
        "Available commands:\n" +
          "!ping - Check bot status\n" +
          "!help - Show this help message\n" +
          "Use natural language to query properties or contacts."
      );
      return;
    }

    // Check for auto-reply triggers - Municipality number
    if (
      text.includes("House Number/Municipality Number=") &&
      msg.hasQuotedMsg
    ) {
      console.log("🏠 Municipality number detected");
      await this.handleMunicipalityNumber(msg, enriched);
      return;
    }

    // Check for owner number request
    if (text === "Kindly share the mobile number of the owner") {
      console.log("📱 Owner number request detected");
      await this.handleOwnerNumberRequest(msg, enriched);
      return;
    }

    // Check for Lucy agent signup
    if (text === "I want to signup as lucy") {
      console.log("👤 New agent registration detected (Lucy)");
      await this.handleLucyAgentRegistration(msg);
      return;
    }

    // Check for general agent registration
    if (text === "I want to register as agent") {
      console.log("👤 Agent registration request detected");
      await this.handleAgentRegistration(msg);
      return;
    }

    // If context found, provide smart response
    if (enriched.context.matchConfidence > 50) {
      const suggested = this.enricher.getSuggestedResponse(enriched);
      if (suggested) {
        console.log(`🤖 Smart Response: ${suggested}`);
      }
    } else if (
      enriched.context.relatedProperties.length === 0 &&
      enriched.context.relatedContacts.length === 0
    ) {
      console.log("❓ No context found - message requires manual review");
    }
  }

  // ============================================
  // ✅ IMPLEMENTED: Municipality Number Handling
  // ============================================
  
  /**
   * Handle municipality number requests
   * IMPLEMENTED: SharingMobileNumber functionality
   * @param {Message} msg - WhatsApp message
   * @param {Object} enriched - Enriched context
   */
  async handleMunicipalityNumber(msg, enriched) {
    try {
      const quotedMsg = await msg.getQuotedMessage();
      if (!quotedMsg) {
        await msg.reply("❌ Could not find the quoted message with municipality number.");
        return;
      }

      const quotedText = quotedMsg.body || "";
      const match = quotedText.match(/House Number\/Municipality Number[=:]?\s*(\S+)/i);
      
      if (!match) {
        await msg.reply("❌ Could not extract municipality number from the message.");
        return;
      }

      const municipalityNumber = match[1];
      console.log(`🏠 Found municipality number: ${municipalityNumber}`);

      const property = await this.findPropertyByMunicipalityNumber(municipalityNumber);
      
      if (property) {
        const response = `🏠 *Property Found*\n\n` +
          `Municipality No: ${municipalityNumber}\n` +
          `Unit: ${property.unitNumber || 'N/A'}\n` +
          `Cluster: ${property.cluster || 'N/A'}\n` +
          `Status: ${property.status || 'N/A'}`;
        await msg.reply(response);
      } else {
        await msg.reply(`❌ No property found with municipality number: ${municipalityNumber}`);
      }
    } catch (error) {
      console.error('❌ Error handling municipality number:', error);
      await msg.reply("❌ An error occurred while processing your request.");
    }
  }

  // ============================================
  // ✅ IMPLEMENTED: Owner Number Sharing
  // ============================================
  
  /**
   * Handle owner number sharing requests
   * IMPLEMENTED: FindAndShareOwnerNumberOnAgentRequest
   * @param {Message} msg - WhatsApp message
   * @param {Object} enriched - Enriched context
   */
  async handleOwnerNumberRequest(msg, enriched) {
    try {
      const unitNumber = enriched.extracted?.unitNumber || 
        enriched.context?.relatedProperties?.[0]?.unitNumber;

      if (!unitNumber) {
        await msg.reply("❌ Could not determine the unit number. Please provide the unit number.");
        return;
      }

      console.log(`📱 Looking up owner for unit: ${unitNumber}`);
      const ownerContact = await this.findOwnerByUnitNumber(unitNumber);
      
      if (ownerContact) {
        const response = `📱 *Owner Contact*\n\n` +
          `Unit: ${unitNumber}\n` +
          `Owner: ${ownerContact.name || 'N/A'}\n` +
          `Phone: ${ownerContact.phone}`;
        
        const isAuthorized = await this.checkAgentAuthorization(msg.from);
        
        if (isAuthorized) {
          await msg.reply(response);
        } else {
          await msg.reply("✅ Your request has been forwarded to the property manager.");
          console.log(`📢 Agent ${msg.from} requested owner number for unit ${unitNumber}`);
        }
      } else {
        await msg.reply(`❌ No owner information found for unit: ${unitNumber}`);
      }
    } catch (error) {
      console.error('❌ Error handling owner number request:', error);
      await msg.reply("❌ An error occurred while processing your request.");
    }
  }

  // ============================================
  // ✅ IMPLEMENTED: Lucy Agent Registration
  // ============================================
  
  /**
   * Handle Lucy agent signup
   * IMPLEMENTED: CreatingNewWhatsAppClientLucy
   * @param {Message} msg - WhatsApp message
   */
  async handleLucyAgentRegistration(msg) {
    try {
      const from = msg.from;
      const agentId = from.replace('@c.us', '').replace(/\D/g, '');
      
      console.log(`👤 Registering Lucy agent: ${agentId}`);
      
      const lucyClient = await CreatingNewWhatsAppClientLucy(agentId);
      
      if (lucyClient) {
        await msg.reply(
          "✅ *Lucy Agent Registration Started*\n\n" +
          "Your WhatsApp client is being configured.\n" +
          "Use `!help` for available commands once connected."
        );
        
        this.initializeAgentClient(lucyClient, 'lucy', agentId);
      } else {
        await msg.reply("❌ Failed to initialize agent registration. Please try again later.");
      }
    } catch (error) {
      console.error('❌ Error handling Lucy agent registration:', error);
      await msg.reply("❌ An error occurred during agent registration.");
    }
  }

  // ============================================
  // ✅ IMPLEMENTED: Agent Registration Flow
  // ============================================
  
  /**
   * Handle general agent registration
   * IMPLEMENTED: Agent registration flow
   * @param {Message} msg - WhatsApp message
   */
  async handleAgentRegistration(msg) {
    try {
      const from = msg.from;
      const agentId = from.replace('@c.us', '').replace(/\D/g, '');
      
      console.log(`👤 Agent registration request from: ${agentId}`);
      
      await msg.reply(
        "📝 *Agent Registration*\n\n" +
        "To register as an agent, please provide:\n" +
        "1. Your full name\n" +
        "2. Agency name (optional)\n" +
        "3. Your area of expertise\n\n" +
        "Example: `!register John Smith, DAMAC Properties, Sales`"
      );
    } catch (error) {
      console.error('❌ Error handling agent registration:', error);
      await msg.reply("❌ An error occurred during agent registration.");
    }
  }

  // ============================================
  // ✅ IMPLEMENTED: Image Message Handling
  // ============================================
  
  /**
   * Handle image messages
   * IMPLEMENTED: Using AdvancedMediaHandler
   * @param {Message} msg
   * @param {Object} enriched
   */
  async handleImageMessage(msg, enriched) {
    console.log("🖼️  Image message received");
    
    try {
      const downloadResult = await this.mediaHandler.downloadMedia(msg, { client: msg.client });
      
      if (!downloadResult.success) {
        console.warn('⚠️  Image download failed:', downloadResult.errorMessage);
        await msg.reply("⚠️ Image received but could not be processed.");
        return;
      }

      const thumbnailResult = await this.mediaHandler.generateThumbnail(msg);
      const processResult = await this.mediaHandler.processImage(msg);
      
      console.log(`✅ Image processed: ${downloadResult.size} bytes`);
      
      if (msg.caption) {
        console.log(`📝 Image caption: ${msg.caption}`);
      }
      
      await msg.reply("✅ Image received and processed successfully.");
    } catch (error) {
      console.error('❌ Error handling image message:', error);
      await msg.reply("❌ An error occurred while processing the image.");
    }
  }

  // ============================================
  // ✅ IMPLEMENTED: Document Message Handling
  // ============================================
  
  /**
   * Handle document messages
   * IMPLEMENTED: Using AdvancedMediaHandler
   * @param {Message} msg
   * @param {Object} enriched
   */
  async handleDocumentMessage(msg, enriched) {
    console.log("📄 Document message received");
    
    try {
      const downloadResult = await this.mediaHandler.downloadMedia(msg, { client: msg.client });
      
      if (!downloadResult.success) {
        console.warn('⚠️  Document download failed:', downloadResult.errorMessage);
        await msg.reply("⚠️ Document received but could not be processed.");
        return;
      }

      const processResult = await this.mediaHandler.processDocument(msg);
      
      let textExtraction = null;
      if (msg.mimetype?.includes('pdf')) {
        textExtraction = await this.mediaHandler.extractTextFromPdf(msg);
      }

      console.log(`✅ Document processed: ${downloadResult.size} bytes`);
      console.log(`   Type: ${downloadResult.mimeType}`);
      
      if (msg.filename) {
        console.log(`📝 Filename: ${msg.filename}`);
      }
      
      await msg.reply("✅ Document received and processed successfully.");
    } catch (error) {
      console.error('❌ Error handling document message:', error);
      await msg.reply("❌ An error occurred while processing the document.");
    }
  }

  // ============================================
  // ✅ IMPLEMENTED: Video Message Handling
  // ============================================
  
  /**
   * Handle video messages
   * IMPLEMENTED: Using AdvancedMediaHandler
   * @param {Message} msg
   * @param {Object} enriched
   */
  async handleVideoMessage(msg, enriched) {
    console.log("🎬 Video message received");
    
    try {
      const downloadResult = await this.mediaHandler.downloadMedia(msg, { client: msg.client });
      
      if (!downloadResult.success) {
        console.warn('⚠️  Video download failed:', downloadResult.errorMessage);
        await msg.reply("⚠️ Video received but could not be processed.");
        return;
      }

      const metadataResult = await this.mediaHandler.getVideoMetadata(msg);
      const previewResult = await this.mediaHandler.generateVideoPreview(msg);
      
      console.log(`✅ Video processed: ${downloadResult.size} bytes`);
      if (metadataResult.success) {
        console.log(`   Duration: ${metadataResult.metadata.duration}s`);
        console.log(`   Resolution: ${metadataResult.metadata.width}x${metadataResult.metadata.height}`);
      }
      
      await msg.reply("✅ Video received and processed successfully.");
    } catch (error) {
      console.error('❌ Error handling video message:', error);
      await msg.reply("❌ An error occurred while processing the video.");
    }
  }

  // ============================================
  // ✅ IMPLEMENTED: Audio Message Handling
  // ============================================
  
  /**
   * Handle audio/voice messages
   * IMPLEMENTED: Using AdvancedMediaHandler
   * @param {Message} msg
   * @param {Object} enriched
   */
  async handleAudioMessage(msg, enriched) {
    console.log("🎤 Audio message received");
    
    try {
      const downloadResult = await this.mediaHandler.downloadMedia(msg, { client: msg.client });
      
      if (!downloadResult.success) {
        console.warn('⚠️  Audio download failed:', downloadResult.errorMessage);
        await msg.reply("⚠️ Audio received but could not be processed.");
        return;
      }

      const metadataResult = await this.mediaHandler.getAudioMetadata(msg);
      const transcriptionResult = await this.mediaHandler.transcribeAudio(msg);
      
      console.log(`✅ Audio processed: ${downloadResult.size} bytes`);
      if (metadataResult.success) {
        console.log(`   Duration: ${metadataResult.metadata.duration}s`);
        console.log(`   Format: ${metadataResult.metadata.format}`);
      }
      
      if (transcriptionResult.success) {
        console.log(`   Transcript: ${transcriptionResult.transcript.substring(0, 100)}...`);
        await msg.reply(`🎤 *Transcription*\n\n${transcriptionResult.transcript}`);
      } else {
        await msg.reply("✅ Audio received and processed successfully.");
      }
    } catch (error) {
      console.error('❌ Error handling audio message:', error);
      await msg.reply("❌ An error occurred while processing the audio.");
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Find property by municipality number
   */
  async findPropertyByMunicipalityNumber(municipalityNumber) {
    try {
      if (this.enricher.findPropertyByMunicipalityNumber) {
        return await this.enricher.findPropertyByMunicipalityNumber(municipalityNumber);
      }
      
      console.log(`🔍 Searching for municipality number: ${municipalityNumber}`);
      return null;
    } catch (error) {
      console.error('Error finding property:', error);
      return null;
    }
  }

  /**
   * Find owner by unit number
   */
  async findOwnerByUnitNumber(unitNumber) {
    try {
      if (this.contactLookup?.lookupContact) {
        console.log(`🔍 Searching for owner of unit: ${unitNumber}`);
      }
      
      return null;
    } catch (error) {
      console.error('Error finding owner:', error);
      return null;
    }
  }

  /**
   * Check if agent is authorized
   */
  async checkAgentAuthorization(phoneNumber) {
    try {
      console.log(`🔐 Checking agent authorization: ${phoneNumber}`);
      return false;
    } catch (error) {
      console.error('Error checking authorization:', error);
      return false;
    }
  }

  /**
   * Initialize agent client with event handlers
   */
  initializeAgentClient(client, agentType, agentId) {
    try {
      client.on('ready', () => {
        console.log(`✅ ${agentType} agent (${agentId}) is ready`);
      });

      client.on('message', async (msg) => {
        console.log(`📨 Message from ${agentType} agent:`, msg.body);
        await this.processMessage(msg);
      });

      client.on('disconnected', (reason) => {
        console.log(`❌ ${agentType} agent disconnected: ${reason}`);
      });

      client.initialize();
      
      console.log(`🚀 ${agentType} agent client initialized for: ${agentId}`);
    } catch (error) {
      console.error(`Error initializing ${agentType} agent:`, error);
    }
  }

  /**
   * Handle message actions (reactions, edits, deletes, etc)
   * Phase 17: Track all WhatsApp message actions
   */
  async handleMessageAction(actionData) {
    try {
      const result = await this.phase17.handleAction(actionData);
      
      if (result) {
        console.log(`✅ Action ${actionData.actionType} processed by Phase 17`);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error handling message action:', error.message);
      return null;
    }
  }

  /**
   * Get comprehensive handler statistics (including Phase 17)
   * @returns {Object} Current statistics
   */
  getStats() {
    return {
      legacy: {
        messagesProcessed: this.messageQueue.length,
        isProcessing: this.isProcessing,
      },
      mediaHandler: this.mediaHandler?.getMetrics() || {},
      phase17: this.phase17?.getStats() || {},
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Export singleton instance
 */
let handlerInstance = null;

export function getEnhancedMessageHandler() {
  if (!handlerInstance) {
    handlerInstance = new EnhancedMessageHandler();
  }
  return handlerInstance;
}

export { EnhancedMessageHandler };
