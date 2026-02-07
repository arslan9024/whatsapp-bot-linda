/**
 * ==========================================
 * MESSAGE ANALYZER WITH CONTEXT ENRICHMENT
 * ==========================================
 * Phase 3 Implementation
 * 
 * Integrates:
 * - Conversation analysis (sentiment, intent)
 * - Context enrichment from organized sheet
 * - AI-powered response suggestions
 * - Automatic write-back tracking
 * 
 * Dependencies:
 * - ConversationAnalyzer.js (sentiment/intent analysis)
 * - AIContextIntegration.js (property/contact lookup & enrichment)
 * - SheetWriteBackService.js (automatic data updates)
 * 
 * Author: WhatsApp Bot Linda - Phase 3
 * Date: January 26, 2026
 */

import { getConversationAnalyzer } from "./ConversationAnalyzer.js";
import { AIContextIntegration } from "../Services/AIContextIntegration.js";
import { SheetWriteBackService } from "../Services/SheetWriteBackService.js";
import { OperationalAnalytics } from "../Services/OperationalAnalytics.js";

/**
 * ManagerWithContextEnrichment
 * 
 * Core logic for message enrichment with organized sheet context
 * Extracts mentions, performs lookups, enriches context
 */
class MessageAnalyzerWithContextEnrichment {
  constructor() {
    this.analyzer = getConversationAnalyzer();
    this.aiContext = new AIContextIntegration();
    this.writeBackService = new SheetWriteBackService();
    this.analytics = new OperationalAnalytics();
    this.extractionPatterns = {
      // Unit number patterns (e.g., "Unit 123", "apt 456", etc.)
      unitNumber: /(?:unit|apt|apartment|villa|plot)\s*(?:no\.?|\#)?[\s-]*([A-Z0-9\-]+)/i,
      // Phone number patterns (validated by validateContactNumber.js)
      phoneNumber: /(?:\+?971|0)?[0-9]{7,9}/,
      // Project name patterns
      projectName: /(?:akoya|damac|emaar|beachfront)/i,
      // Price/budget patterns
      budget: /(?:aed|usd)\s*[\d,]+|budget\s*[\d,]+/i,
      // Property type patterns
      propertyType: /(?:villa|apartment|studio|1br|2br|3br|penthouse)/i,
    };
  }

  /**
   * Extract potential property/contact mentions from message
   * @param {Message} msg - WhatsApp message
   * @returns {Object} Extracted data (unitNumber, phoneNumber, projectName, etc.)
   */
  extractEntitiesFromMessage(msg) {
    const extracted = {
      unitNumber: null,
      phoneNumber: null,
      projectName: null,
      budget: null,
      propertyType: null,
      rawText: msg.body || "",
      from: msg.from,
      timestamp: msg.timestamp,
    };

    try {
      const text = msg.body || "";

      // Extract unit number
      const unitMatch = text.match(this.extractionPatterns.unitNumber);
      if (unitMatch) {
        extracted.unitNumber = unitMatch[1].trim().toUpperCase();
      }

      // Extract phone number
      const phoneMatch = text.match(this.extractionPatterns.phoneNumber);
      if (phoneMatch) {
        extracted.phoneNumber = phoneMatch[0];
      }

      // Extract project name
      const projectMatch = text.match(this.extractionPatterns.projectName);
      if (projectMatch) {
        extracted.projectName = projectMatch[0];
      }

      // Extract budget
      const budgetMatch = text.match(this.extractionPatterns.budget);
      if (budgetMatch) {
        extracted.budget = budgetMatch[0];
      }

      // Extract property type
      const typeMatch = text.match(this.extractionPatterns.propertyType);
      if (typeMatch) {
        extracted.propertyType = typeMatch[0];
      }
    } catch (error) {
      console.error(
        "❌ Error extracting entities from message:",
        error.message
      );
    }

    return extracted;
  }

  /**
   * Enrich message with context from organized sheet
   * @param {Message} msg - WhatsApp message
   * @param {Object} extracted - Extracted entities
   * @returns {Object} Enriched context with properties/contacts/suggestions
   */
  async enrichMessageWithContext(msg, extracted) {
    const enriched = {
      message: msg,
      extracted,
      context: {
        relatedProperties: [],
        relatedContacts: [],
        suggestedResponse: null,
        dataQuality: "low", // low, medium, high
        matchConfidence: 0, // 0-100
      },
      error: null,
    };

    try {
      // If unit number found, lookup in organized sheet
      if (extracted.unitNumber) {
        console.log(
          `🔍 Looking up property: Unit ${extracted.unitNumber}`
        );
        const properties = await this.aiContext.lookupProperty(
          extracted.unitNumber,
          extracted.projectName
        );

        if (properties && properties.length > 0) {
          enriched.context.relatedProperties = properties;
          enriched.context.dataQuality = "high";
          enriched.context.matchConfidence = 95;

          console.log(
            `✅ Found ${properties.length} matching properties`
          );
        }
      }

      // If phone number found, lookup in organized sheet
      if (extracted.phoneNumber) {
        console.log(
          `🔍 Looking up contact: ${extracted.phoneNumber}`
        );
        const contacts = await this.aiContext.lookupContact(
          extracted.phoneNumber
        );

        if (contacts && contacts.length > 0) {
          enriched.context.relatedContacts = contacts;
          enriched.context.dataQuality =
            enriched.context.dataQuality === "high" ? "high" : "medium";
          enriched.context.matchConfidence = Math.max(
            enriched.context.matchConfidence,
            90
          );

          console.log(
            `✅ Found ${contacts.length} matching contacts`
          );
        }
      }

      // Generate AI-powered response suggestion
      if (
        enriched.context.relatedProperties.length > 0 ||
        enriched.context.relatedContacts.length > 0
      ) {
        const suggestion = await this.aiContext.generateResponseSuggestion(
          msg.body,
          enriched.context.relatedProperties,
          enriched.context.relatedContacts,
          extracted
        );

        enriched.context.suggestedResponse = suggestion;
      }
    } catch (error) {
      console.error(
        "❌ Error enriching message with context:",
        error.message
      );
      enriched.error = error.message;
    }

    return enriched;
  }

  /**
   * Track message interaction for analytics
   * @param {Message} msg - WhatsApp message
   * @param {Object} enriched - Enriched context
   */
  async trackMessageInteraction(msg, enriched) {
    try {
      await this.analytics.logInteraction({
        type: "message_received",
        from: msg.from,
        timestamp: msg.timestamp,
        messageType: msg.type,
        hasContext: enriched.context.relatedProperties.length > 0 ||
          enriched.context.relatedContacts.length > 0,
        matchConfidence: enriched.context.matchConfidence,
        extracted: enriched.extracted,
      });

      // Log to console for visibility
      console.log(
        `📊 Tracked: ${msg.type} from ${msg.from} (Confidence: ${enriched.context.matchConfidence}%)`
      );
    } catch (error) {
      console.error("❌ Error tracking interaction:", error.message);
    }
  }

  /**
   * Write back interaction results to organized sheet
   * @param {Message} msg - WhatsApp message
   * @param {Object} enriched - Enriched context
   */
  async writeBackInteractionToSheet(msg, enriched) {
    try {
      // Only write back if we have contextual data
      if (
        enriched.context.relatedProperties.length === 0 &&
        enriched.context.relatedContacts.length === 0
      ) {
        return; // No context to track
      }

      const updateData = {
        from: msg.from,
        messageType: msg.type,
        timestamp: new Date(msg.timestamp * 1000),
        extractedUnitNumber: enriched.extracted.unitNumber,
        extractedPhoneNumber: enriched.extracted.phoneNumber,
        extractedProjectName: enriched.extracted.projectName,
        relatedProperties: enriched.context.relatedProperties
          .map((p) => p.code || p.unitNumber)
          .join(", "),
        relatedContacts: enriched.context.relatedContacts
          .map((c) => c.code || c.name)
          .join(", "),
        matchConfidence: enriched.context.matchConfidence,
        responseStatus: "pending_manual_review",
      };

      const result = await this.writeBackService.writeInteractionRecord(
        updateData
      );

      if (result.success) {
        console.log(
          `💾 Wrote interaction to sheet: ${result.rowsUpdated} rows updated`
        );
      } else {
        console.warn(
          `⚠️  Failed to write interaction: ${result.error}`
        );
      }
    } catch (error) {
      console.error(
        "❌ Error writing back interaction:",
        error.message
      );
    }
  }

  /**
   * Get suggested response for the message
   * @param {Object} enriched - Enriched context
   * @returns {string|null} Suggested response or null
   */
  getSuggestedResponse(enriched) {
    if (
      enriched.context.suggestedResponse &&
      enriched.context.suggestedResponse.trim()
    ) {
      return enriched.context.suggestedResponse;
    }

    // Generate fallback response based on data quality
    if (enriched.context.relatedProperties.length > 0) {
      const propCount = enriched.context.relatedProperties.length;
      return `Found ${propCount} property(ies) matching your criteria. Please provide more details to narrow down the selection.`;
    }

    if (enriched.context.relatedContacts.length > 0) {
      const contactCount = enriched.context.relatedContacts.length;
      return `Found ${contactCount} contact(s) in our database. How can I assist you further?`;
    }

    return null;
  }

  /**
   * Analyze message (sentiment, intent)
   * @param {Message} msg - WhatsApp message
   * @returns {Object} Analysis results
   */
  analyzeMessageContent(msg) {
    try {
      const sentiment = this.analyzer.analyzeSentiment(msg);
      const intent = this.analyzer.analyzeIntent(msg);

      return { sentiment, intent };
    } catch (error) {
      console.error(
        "❌ Error analyzing message content:",
        error.message
      );
      return { sentiment: "neutral", intent: "unknown" };
    }
  }
}

/**
 * Export singleton instance
 */
let enricherInstance = null;

export function getMessageAnalyzerWithContext() {
  if (!enricherInstance) {
    enricherInstance = new MessageAnalyzerWithContextEnrichment();
  }
  return enricherInstance;
}

export { MessageAnalyzerWithContextEnrichment };
