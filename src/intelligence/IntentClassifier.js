/**
 * IntentClassifier.js
 * 
 * Classifies messages into 15 predefined intent categories
 * Uses keyword matching + bag-of-words scoring (no ML overhead)
 * 
 * Intents:
 * 1. PROPERTY_INQUIRY - Questions about properties
 * 2. PROPERTY_INFO - Requests for property details
 * 3. CONTACT_REQUEST - Needs agent/seller contact
 * 4. PRICE_NEGOTIATION - Discussion of price/payment
 * 5. VIEWING_REQUEST - Wants to schedule viewing
 * 6. OFFER_SUBMISSION - Making an offer
 * 7. AGREEMENT_ACCEPTANCE - Accepting terms/agreement
 * 8. COMPLAINT - Issue or complaint
 * 9. FEEDBACK - General feedback
 * 10. GENERAL_QUESTION - Other questions
 * 11. SMALL_TALK - Casual conversation
 * 12. SPAM - Likely spam/bot detection
 * 13. GREETING - Hello, intro, etc.
 * 14. FAREWELL - Goodbye, ending conversation
 * 15. OTHER - Unclassified
 * 
 * Version: 1.0
 * Created: February 17, 2026
 * Status: Production Ready - Workstream 2
 */

class IntentClassifier {
  constructor() {
    this.intents = {
      PROPERTY_INQUIRY: {
        weight: 1.0,
        keywords: [
          "available", "any properties", "do you have", "looking for", "unit available",
          "is there", "can you find", "properties in", "units in", "anything",
        ],
      },
      PROPERTY_INFO: {
        weight: 1.0,
        keywords: [
          "details", "size", "area", "bedrooms", "rooms", "facilities", "features",
          "amenities", "layout", "floor plan", "specifications", "description",
          "tell me about", "information about", "specs", "info on",
        ],
      },
      CONTACT_REQUEST: {
        weight: 0.95,
        keywords: [
          "agent", "contact", "owner", "seller", "landlord", "phone", "number",
          "who is", "reach", "call", "whatsapp", "email", "send me",
        ],
      },
      PRICE_NEGOTIATION: {
        weight: 0.95,
        keywords: [
          "price", "cost", "rate", "negotiate", "discount", "offer", "deal",
          "lower", "reduce", "aed", "how much", "affordable", "budget", "payment",
          "commission", "fees", "price range", "quote",
        ],
      },
      VIEWING_REQUEST: {
        weight: 1.0,
        keywords: [
          "see", "view", "visit", "tour", "schedule", "appointment", "time",
          "when", "available", "can i", "would like to", "interested in seeing",
          "want to see", "come see", "look at",
        ],
      },
      OFFER_SUBMISSION: {
        weight: 0.95,
        keywords: [
          "offer", "propose", "bid", "submit", "interested", "want to buy",
          "would like to", "interested to purchase", "serious", "ready to",
        ],
      },
      AGREEMENT_ACCEPTANCE: {
        weight: 0.90,
        keywords: [
          "agree", "accept", "ok", "yes", "confirmed", "confirmed", "signed",
          "approved", "done", "let's go", "okay", "sounds good", "all set",
          "agreement", "terms", "conditions",
        ],
      },
      COMPLAINT: {
        weight: 0.95,
        keywords: [
          "problem", "issue", "wrong", "broken", "not working", "complaint",
          "complain", "issue with", "problem with", "can't", "unable",
          "frustrated", "angry", "upset", "disappointed",
        ],
      },
      FEEDBACK: {
        weight: 0.80,
        keywords: [
          "feedback", "suggest", "suggestion", "comment", "think", "opinion",
          "seems", "appears", "could be", "might be", "review", "rate",
        ],
      },
      GENERAL_QUESTION: {
        weight: 1.0,
        keywords: [
          "what", "when", "where", "which", "how", "why", "who", "can you",
          "could you", "would you", "is it", "are there", "do you know",
        ],
      },
      SMALL_TALK: {
        weight: 0.80,
        keywords: [
          "how are you", "how have you been", "how's it going", "what's up",
          "how's life", "how's everything", "good morning", "good afternoon",
          "how do you do", "nice to", "good to",
        ],
      },
      SPAM: {
        weight: 0.95,
        keywords: [
          "click here", "buy now", "limited offer", "act now", "urgent",
          "guarantee", "free money", "earn money", "work from home", "bitcoin",
          "crypto", "lottery", "prize", "winner", "verify account",
        ],
        blockPatterns: [
          /^.{500,}$/, // Very long messages
          /(.)\1{20,}/, // Repeated characters
          /https?:\/\/[\w.-]+/g, // Multiple URLs
        ],
      },
      GREETING: {
        weight: 1.0,
        keywords: [
          "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
          "greetings", "welcome", "introduction", "first time", "new customer",
        ],
      },
      FAREWELL: {
        weight: 1.0,
        keywords: [
          "goodbye", "bye", "see you", "farewell", "take care", "until later",
          "talk soon", "will be in touch", "looking forward", "thank you for",
          "thanks for", "appreciate", "that's it", "end of", "no more",
        ],
      },
    };

    this.intentsArray = Object.keys(this.intents);
    this.confidenceThreshold = 0.5; // Require 50% confident
  }

  /**
   * Classify message intent
   * @param {string} message - Message text
   * @returns {object} - Intent classification with confidence
   */
  classify(message) {
    try {
      if (!message || message.length === 0) {
        return {
          intent: "OTHER",
          confidence: 0,
          reasons: ["Empty message"],
        };
      }

      const lower = message.toLowerCase();
      const scores = {};

      // Score each intent
      for (const [intent, config] of Object.entries(this.intents)) {
        // Check block patterns (for SPAM)
        if (intent === "SPAM" && config.blockPatterns) {
          const blocked = config.blockPatterns.some((pattern) => pattern.test(message));
          if (blocked) {
            scores[intent] = 1.0; // High confidence spam
            continue;
          }
        }

        // Count keyword matches
        let matches = 0;
        for (const keyword of config.keywords) {
          const regex = new RegExp(`\\b${keyword}\\b`, "gi");
          const found = message.match(regex) || [];
          matches += found.length;
        }

        // Calculate score: keyword matches * weight / total words
        const totalWords = lower.split(/\s+/).length;
        const score = (matches * config.weight) / Math.max(1, totalWords);
        scores[intent] = Math.min(1, score); // Normalize to 0-1
      }

      // Find top intent
      const topIntents = Object.entries(scores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3); // Top 3 candidates

      const [topIntent, topScore] = topIntents[0] || ["OTHER", 0];
      const alternativeIntents = topIntents.slice(1).map(([intent, score]) => ({
        intent,
        confidence: Math.round(score * 100),
      }));

      // Handle low confidence
      let finalIntent = topIntent;
      let finalConfidence = topScore;

      if (topScore < this.confidenceThreshold) {
        // Try simple heuristics
        if (message.includes("?")) {
          finalIntent = "GENERAL_QUESTION";
          finalConfidence = 0.5;
        } else {
          finalIntent = "OTHER";
          finalConfidence = topScore;
        }
      }

      return {
        intent: finalIntent,
        confidence: Math.round(finalConfidence * 100),
        topAlternatives: alternativeIntents,
        keywords: this._extractMatchedKeywords(message.toLowerCase(), finalIntent),
        score: topScore,
      };
    } catch (error) {
      console.error(`❌ Intent classification failed: ${error.message}`);
      return {
        intent: "OTHER",
        confidence: 0,
        error: error.message,
      };
    }
  }

  /**
   * Get response strategy based on intent
   * @param {string} intent - Intent type
   * @returns {object} - Recommended response strategy
   */
  getResponseStrategy(intent) {
    const strategies = {
      PROPERTY_INQUIRY: {
        type: "query_results",
        tone: "helpful",
        include: ["search_results", "filters"],
        suggest: "narrow_search",
      },
      PROPERTY_INFO: {
        type: "information",
        tone: "informative",
        include: ["details", "images", "amenities"],
        suggest: "view_property",
      },
      CONTACT_REQUEST: {
        type: "contact",
        tone: "professional",
        include: ["agent_info", "phone", "email"],
        suggest: "schedule_call",
      },
      PRICE_NEGOTIATION: {
        type: "negotiation",
        tone: "business-like",
        include: ["price_breakdown", "payment_options"],
        suggest: "offer_terms",
      },
      VIEWING_REQUEST: {
        type: "scheduling",
        tone: "helpful",
        include: ["available_times", "location"],
        suggest: "confirm_appointment",
      },
      OFFER_SUBMISSION: {
        type: "transaction",
        tone: "formal",
        include: ["offer_form", "terms"],
        suggest: "review_offer",
      },
      AGREEMENT_ACCEPTANCE: {
        type: "confirmation",
        tone: "formal",
        include: ["summary", "next_steps"],
        suggest: "proceed_to_completion",
      },
      COMPLAINT: {
        type: "support",
        tone: "empathetic",
        include: ["acknowledgment", "solution"],
        suggest: "escalate_if_needed",
      },
      FEEDBACK: {
        type: "feedback",
        tone: "appreciative",
        include: ["thank_you", "improvement_note"],
        suggest: "close_interaction",
      },
      GENERAL_QUESTION: {
        type: "answer",
        tone: "helpful",
        include: ["answer", "resources"],
        suggest: "offer_help",
      },
      SMALL_TALK: {
        type: "engagement",
        tone: "friendly",
        include: ["personalization"],
        suggest: "guide_to_needs",
      },
      SPAM: {
        type: "block",
        tone: "neutral",
        include: ["block"],
        suggest: "ignore",
      },
      GREETING: {
        type: "welcome",
        tone: "friendly",
        include: ["welcome_message"],
        suggest: "assess_needs",
      },
      FAREWELL: {
        type: "closing",
        tone: "grateful",
        include: ["thank_you", "goodbye"],
        suggest: "close_interaction",
      },
      OTHER: {
        type: "generic",
        tone: "neutral",
        include: ["generic_help"],
        suggest: "assess_intent",
      },
    };

    return strategies[intent] || strategies.OTHER;
  }

  /**
   * Track intent history for account
   * @param {array} recentIntents - Recent intents in chronological order
   * @returns {object} - Intent distribution and dominant intent
   */
  analyzeIntentHistory(recentIntents = []) {
    try {
      const distribution = {};
      const transitions = [];

      for (let i = 0; i < recentIntents.length; i++) {
        const intent = recentIntents[i];
        distribution[intent] = (distribution[intent] || 0) + 1;

        if (i > 0 && recentIntents[i] !== recentIntents[i - 1]) {
          transitions.push({
            from: recentIntents[i - 1],
            to: intent,
            index: i,
          });
        }
      }

      const sorted = Object.entries(distribution).sort(([, a], [, b]) => b - a);
      const dominantIntent = sorted[0]?.[0] || "OTHER";
      const focusLevel = sorted.length === 1 ? "high" : sorted.length <= 3 ? "medium" : "low";

      return {
        distribution,
        dominantIntent,
        intentCount: sorted.length,
        totalMessages: recentIntents.length,
        transitions: transitions.length,
        focusLevel,
      };
    } catch (error) {
      console.error(`Error analyzing intent history: ${error.message}`);
      return { dominantIntent: "OTHER", distribution: {}, transitions: 0 };
    }
  }

  /**
   * PRIVATE: Extract keywords that matched
   */
  _extractMatchedKeywords(message, intent) {
    const config = this.intents[intent];
    if (!config) return [];

    const matched = [];
    for (const keyword of config.keywords) {
      if (message.includes(keyword)) {
        matched.push(keyword);
      }
    }

    return matched.slice(0, 5); // Top 5
  }
}

export default IntentClassifier;
export { IntentClassifier };
