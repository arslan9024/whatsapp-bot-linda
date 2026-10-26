/**
 * ConversationFlowAnalyzer.js
 * 
 * Detects conversation context switches and topic changes
 * Prevents enrichment confusion when user abandons one topic for another
 * 
 * Signals detected:
 * - Explicit keywords (actually, wait, never mind, ignore that)
 * - Entity changes (Unit 123 → Unit 456)
 * - Sentiment flips
 * - Time gaps (>5 min no activity)
 * - Question type changes
 * 
 * Features:
 * - Context switch scoring
 * - Topic history tracking
 * - Intent pattern recognition
 * - Thread creation triggers
 * 
 * Version: 1.0
 * Created: February 17, 2026
 * Status: Production Ready - Workstream 2
 */

class ConversationFlowAnalyzer {
  constructor() {
    // Keywords that signal context switches
    this.switchKeywords = {
      explicit: [
        "actually", "wait", "hold on", "never mind", "ignore that", "scratch that",
        "different topic", "back to", "something else", "forget about it", "disregard",
        "change of subject", "by the way", "speaking of which", "meanwhile",
        "anyway", "besides", "rather", "instead", "on second thought", "forget i said",
      ],
      negation: [
        "no", "not", "don't want", "don't need", "cancel", "nope", "absolutely not",
      ],
      reversal: [
        "opposite", "reverse", "other way", "backwards", "the other one",
      ],
    };

    // Intent patterns
    this.intentPatterns = {
      buying: /(?:buy|purchase|interested|want to|looking for|need)/i,
      selling: /(?:sell|put up|list|advertise|property for sale)/i,
      renting: /(?:rent|lease|looking to rent|need rental)/i,
      viewing: /(?:view|see|visit|tour|schedule|appointment)/i,
      pricing: /(?:price|cost|rate|how much|afford)/i,
      inquiry: /(?:tell me|information|details|about|describe|features)/i,
    };

    // Configuration
    this.timeGapThreshold = 5 * 60 * 1000; // 5 minutes
    this.confidenceThreshold = 0.6; // 60% to trigger switch
  }

  /**
   * Analyze message for context switches
   * @param {string} currentMessage - Current message
   * @param {array} previousMessages - Last 5 messages
   * @param {object} currentContext - Current conversation context
   * @returns {object} - Context switch analysis
   */
  analyzeContextSwitch(currentMessage, previousMessages = [], currentContext = {}) {
    try {
      const signals = [];
      let switchConfidence = 0;
      const switchReason = [];

      // Signal 1: Explicit switch keywords
      const keywordSignal = this._detectExplicitKeywords(currentMessage);
      if (keywordSignal.detected) {
        signals.push(keywordSignal);
        switchConfidence += 0.4;
        switchReason.push(keywordSignal.keyword);
      }

      // Signal 2: Intent change
      const intentSignal = this._detectIntentChange(currentMessage, previousMessages);
      if (intentSignal.detected) {
        signals.push(intentSignal);
        switchConfidence += 0.3;
        switchReason.push(`Intent: ${intentSignal.from} → ${intentSignal.to}`);
      }

      // Signal 3: Entity change (different unit, project, contact)
      const entitySignal = this._detectEntityChange(currentMessage, currentContext);
      if (entitySignal.detected) {
        signals.push(entitySignal);
        switchConfidence += 0.25;
        switchReason.push(`Entity: ${entitySignal.from} → ${entitySignal.to}`);
      }

      // Signal 4: Time gap
      const timeGapSignal = this._detectTimeGap(previousMessages);
      if (timeGapSignal.detected) {
        signals.push(timeGapSignal);
        switchConfidence += 0.15;
        switchReason.push(`Time gap: ${timeGapSignal.gapMinutes}m`);
      }

      // Signal 5: Sentiment flip
      const sentimentSignal = this._detectSentimentFlip(currentMessage, previousMessages);
      if (sentimentSignal.detected) {
        signals.push(sentimentSignal);
        switchConfidence += 0.1;
        switchReason.push(`Sentiment: ${sentimentSignal.from} → ${sentimentSignal.to}`);
      }

      // Normalize confidence to 0-1
      switchConfidence = Math.min(1, switchConfidence);

      const result = {
        messageId: this._generateMessageId(),
        contextSwitchDetected: switchConfidence >= this.confidenceThreshold,
        switchConfidence: Math.round(switchConfidence * 100),
        signals,
        reasons: switchReason,
        recommendation: this._getRecommendation(switchConfidence),
      };

      return result;
    } catch (error) {
      console.error(`❌ Context switch analysis failed: ${error.message}`);
      return {
        contextSwitchDetected: false,
        switchConfidence: 0,
        signals: [],
        error: error.message,
      };
    }
  }

  /**
   * Get topic from message
   * @param {string} message - Message text
   * @returns {string} - Detected topic
   */
  getTopic(message) {
    for (const [topic, pattern] of Object.entries(this.intentPatterns)) {
      if (pattern.test(message)) {
        return topic;
      }
    }
    return "general";
  }

  /**
   * Analyze conversation thread
   * Splits conversations into threads based on context switches
   * @param {array} messages - Array of messages
   * @returns {array} - Topics/threads identified
   */
  analyzeConversationThread(messages) {
    try {
      if (!messages || messages.length === 0) {
        return [];
      }

      const threads = [];
      let currentThread = {
        threadId: this._generateThreadId(),
        startIndex: 0,
        topic: null,
        messages: [],
        startTime: messages[0]?.timestamp || Date.now(),
      };

      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const previousMsgs = messages.slice(Math.max(0, i - 5), i);
        const context = currentThread;

        // Check for context switch
        const analysis = this.analyzeContextSwitch(msg.content, previousMsgs, context);

        if (i > 0 && analysis.contextSwitchDetected) {
          // Close current thread
          currentThread.endIndex = i - 1;
          currentThread.endTime = messages[i - 1]?.timestamp || Date.now();
          currentThread.messageCount = i - currentThread.startIndex;
          threads.push(currentThread);

          // Start new thread
          currentThread = {
            threadId: this._generateThreadId(),
            startIndex: i,
            topic: this.getTopic(msg.content),
            messages: [msg],
            startTime: msg.timestamp || Date.now(),
            switchReason: analysis.reasons.join(", "),
          };
        } else {
          currentThread.messages.push(msg);
          if (!currentThread.topic) {
            currentThread.topic = this.getTopic(msg.content);
          }
        }
      }

      // Add final thread
      if (currentThread.messages.length > 0) {
        currentThread.endIndex = messages.length - 1;
        currentThread.endTime = messages[messages.length - 1]?.timestamp || Date.now();
        currentThread.messageCount = messages.length - currentThread.startIndex;
        threads.push(currentThread);
      }

      return threads;
    } catch (error) {
      console.error(`❌ Thread analysis failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get conversation flow summary
   * @param {array} messages - Messages
   * @returns {object} - Flow summary
   */
  getConversationFlow(messages) {
    try {
      const threads = this.analyzeConversationThread(messages);

      const topicCounts = {};
      let topicTransitions = 0;

      for (let i = 0; i < threads.length; i++) {
        const topic = threads[i].topic;
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;

        if (i > 0 && threads[i].topic !== threads[i - 1].topic) {
          topicTransitions++;
        }
      }

      const dominantTopic = Object.entries(topicCounts).sort(([, a], [, b]) => b - a)[0]?.[0];

      return {
        totalMessages: messages.length,
        totalThreads: threads.length,
        topicDistribution: topicCounts,
        dominantTopic,
        topicTransitions,
        avgThreadLength: Math.round(messages.length / threads.length),
        focusLevel: threads.length === 1 ? "high" : threads.length <= 3 ? "medium" : "low",
      };
    } catch (error) {
      console.error(`❌ Flow analysis failed: ${error.message}`);
      return null;
    }
  }

  /**
   * PRIVATE: Detect explicit keywords
   */
  _detectExplicitKeywords(message) {
    const lower = message.toLowerCase();

    for (const [category, keywords] of Object.entries(this.switchKeywords)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          return {
            detected: true,
            type: "explicit_keyword",
            keyword,
            category,
            confidence: 0.95,
          };
        }
      }
    }

    return { detected: false };
  }

  /**
   * PRIVATE: Detect intent change
   */
  _detectIntentChange(currentMessage, previousMessages = []) {
    if (previousMessages.length === 0) {
      return { detected: false };
    }

    const currentIntent = this.getTopic(currentMessage);

    // Get dominant intent from previous messages
    const previousIntents = previousMessages.map((m) => this.getTopic(m.content || m));
    const dominantPreviousIntent = this._getMostCommon(previousIntents);

    if (currentIntent !== dominantPreviousIntent && dominantPreviousIntent !== "general") {
      return {
        detected: true,
        type: "intent_change",
        from: dominantPreviousIntent,
        to: currentIntent,
        confidence: 0.85,
      };
    }

    return { detected: false };
  }

  /**
   * PRIVATE: Detect entity change
   */
  _detectEntityChange(currentMessage, currentContext = {}) {
    // Look for unit/project/price references
    const currentEntities = this._extractReferences(currentMessage);
    const contextEntities = currentContext.entities || [];

    // Simple heuristic: if mention different unit, it's entity change
    if (
      currentEntities.units &&
      contextEntities.units &&
      JSON.stringify(currentEntities.units) !== JSON.stringify(contextEntities.units)
    ) {
      return {
        detected: true,
        type: "entity_change",
        from: contextEntities.units?.[0] || "unknown",
        to: currentEntities.units?.[0] || "unknown",
        confidence: 0.80,
      };
    }

    return { detected: false };
  }

  /**
   * PRIVATE: Detect time gap
   */
  _detectTimeGap(previousMessages = []) {
    if (previousMessages.length === 0) {
      return { detected: false };
    }

    const lastMessage = previousMessages[previousMessages.length - 1];
    const gap = Date.now() - (lastMessage.timestamp || Date.now());

    if (gap > this.timeGapThreshold) {
      return {
        detected: true,
        type: "time_gap",
        gapMinutes: Math.round(gap / 60000),
        confidence: 0.75,
      };
    }

    return { detected: false };
  }

  /**
   * PRIVATE: Detect sentiment change
   */
  _detectSentimentFlip(currentMessage, previousMessages = []) {
    if (previousMessages.length === 0) {
      return { detected: false };
    }

    const currentSentiment = this._analyzeSentiment(currentMessage);
    const previousSentiments = previousMessages.map((m) => this._analyzeSentiment(m.content || m));
    const avgPreviousSentiment =
      previousSentiments.reduce((a, b) => a + b, 0) / previousSentiments.length;

    // Flip is when sentiment changes significantly
    const flip = Math.abs(currentSentiment - avgPreviousSentiment) > 0.5;

    if (flip && Math.abs(avgPreviousSentiment) > 0.3) {
      return {
        detected: true,
        type: "sentiment_flip",
        from: avgPreviousSentiment > 0 ? "positive" : "negative",
        to: currentSentiment > 0 ? "positive" : "negative",
        confidence: 0.70,
      };
    }

    return { detected: false };
  }

  /**
   * PRIVATE: Analyze sentiment (-1 to 1)
   */
  _analyzeSentiment(text) {
    const positive = /good|great|excellent|love|happy|please|thank/gi;
    const negative = /bad|terrible|awful|hate|angry|frustrated|problem|issue/gi;

    const positiveCount = (text.match(positive) || []).length;
    const negativeCount = (text.match(negative) || []).length;

    return (positiveCount - negativeCount) / (positiveCount + negativeCount || 1);
  }

  /**
   * PRIVATE: Extract entity references
   */
  _extractReferences(message) {
    const units = (message.match(/(?:Unit|Apt|Villa|House)\s*(?:#\s*)?([A-Z0-9-]+)/gi) || []).map(
      (u) => u.split(/[\s#]+/)[1]
    );
    const projects = (
      message.match(/(?:Akoya|Damac|Emaar|Beachfront)/gi) || []
    );

    return { units, projects };
  }

  /**
   * PRIVATE: Get most common item in array
   */
  _getMostCommon(arr) {
    const counts = {};
    arr.forEach((item) => {
      counts[item] = (counts[item] || 0) + 1;
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] || "general";
  }

  /**
   * PRIVATE: Generate message ID
   */
  _generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * PRIVATE: Generate thread ID
   */
  _generateThreadId() {
    return `thread_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * PRIVATE: Get recommendation
   */
  _getRecommendation(confidence) {
    if (confidence >= 0.8) {
      return "createNewThread";
    } else if (confidence >= 0.6) {
      return "updateContext";
    } else {
      return "continueCurrentThread";
    }
  }
}

export default ConversationFlowAnalyzer;
export { ConversationFlowAnalyzer };
