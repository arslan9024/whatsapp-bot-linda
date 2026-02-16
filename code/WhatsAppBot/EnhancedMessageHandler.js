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
 * Author: WhatsApp Bot Linda
 * Date: January 26, 2026 (Phase 17: February 16, 2026)
 */

import { getMessageAnalyzerWithContext } from "./MessageAnalyzerWithContext.js";
import { getConversationAnalyzer } from "./ConversationAnalyzer.js";
import { logMessageTypeCompact } from "../utils/messageTypeLogger.js";
import { phase17Orchestrator } from "../utils/Phase17Orchestrator.js";

class EnhancedMessageHandler {
  constructor() {
    this.enricher = getMessageAnalyzerWithContext();
    this.analyzer = getConversationAnalyzer();
    this.phase17 = phase17Orchestrator;
    this.messageQueue = [];
    this.isProcessing = false;
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

    // Check for auto-reply triggers
    if (
      text.includes("House Number/Municipality Number=") &&
      msg.hasQuotedMsg
    ) {
      console.log("🏠 Municipality number detected");
      // TODO: Implement SharingMobileNumber or similar
      return;
    }

    if (
      text === "Kindly share the mobile number of the owner"
    ) {
      console.log("📱 Owner number request detected");
      // TODO: Implement FindAndShareOwnerNumberOnAgentRequest or similar
      return;
    }

    // Check for agent registration requests
    if (text === "I want to signup as lucy") {
      console.log("👤 New agent registration detected");
      // TODO: Implement CreatingNewWhatsAppClientLucy or similar
      return;
    }

    if (text === "I want to register as agent") {
      console.log("👤 Agent registration request detected");
      // TODO: Implement agent registration flow
      return;
    }

    // If context found, provide smart response
    if (enriched.context.matchConfidence > 50) {
      const suggested = this.enricher.getSuggestedResponse(enriched);
      if (suggested) {
        console.log(`🤖 Smart Response: ${suggested}`);
        // Optionally auto-reply (can be disabled for manual review)
        // await msg.reply(suggested);
      }
    } else if (
      enriched.context.relatedProperties.length === 0 &&
      enriched.context.relatedContacts.length === 0
    ) {
      console.log("❓ No context found - message requires manual review");
    }
  }

  /**
   * Handle image messages
   * @param {Message} msg
   * @param {Object} enriched
   */
  async handleImageMessage(msg, enriched) {
    console.log("🖼️  Image message received");
    // TODO: Implement image handling (property photo processing, OCR, etc.)
  }

  /**
   * Handle document messages
   * @param {Message} msg
   * @param {Object} enriched
   */
  async handleDocumentMessage(msg, enriched) {
    console.log("📄 Document message received");
    // TODO: Implement document handling (contract processing, etc.)
  }

  /**
   * Handle video messages
   * @param {Message} msg
   * @param {Object} enriched
   */
  async handleVideoMessage(msg, enriched) {
    console.log("🎬 Video message received");
    // TODO: Implement video handling (property tour processing, etc.)
  }

  /**
   * Handle audio/voice messages
   * @param {Message} msg
   * @param {Object} enriched
   */
  async handleAudioMessage(msg, enriched) {
    console.log("🎤 Audio message received");
    // TODO: Implement audio handling (transcription, etc.)
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
      phase17: this.phase17.getStats(),
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
