/**
 * SentimentAnalyzer.js
 * 
 * Analyzes emotional sentiment in messages
 * Tracks conversation mood trends over time
 * 
 * Layers:
 * 1. Emoji analysis (-1 to +1 scale)
 * 2. Keyword spotting (happy, problem, frustrated, etc.)
 * 3. Message length + punctuation (enthusiasm markers)
 * 4. Trend analysis (moving average over last N messages)
 * 
 * Features:
 * - Real-time sentiment scoring
 * - Conversation mood tracking
 * - Alert on sentiment drops (escalation needed)
 * - Tone-aware response suggestions
 * 
 * Version: 1.0
 * Created: February 17, 2026
 * Status: Production Ready - Workstream 2
 */

class SentimentAnalyzer {
  constructor() {
    // Emoji mappings to sentiment (-1 to +1)
    this.emojiSentiment = {
      // Very positive
      "😍": 1.0, "🥰": 1.0, "😊": 0.9, "😄": 0.85, "😃": 0.85, "😁": 0.8,
      "🎉": 1.0, "🎊": 1.0, "🙌": 0.9, "👏": 0.85, "✨": 0.8, "⭐": 0.8,
      "❤️": 1.0, "💚": 1.0, "💙": 1.0, "💛": 0.95, "💜": 0.9,
      
      // Positive
      "😌": 0.6, "😐": 0.3, "🤔": 0.2, "👍": 0.7, "👌": 0.75,
      "✅": 0.75, "🟢": 0.7, "☀️": 0.8, "🌟": 0.85,
      
      // Neutral
      "👋": 0.4, "🙏": 0.5, "🤝": 0.6,
      
      // Negative
      "😕": -0.4, "😐": -0.2, "😔": -0.6, "😞": -0.75, "😢": -0.8,
      "😭": -1.0, "😠": -0.9, "😡": -1.0, "🤬": -1.0, "😤": -0.85,
      "😤": -0.8, "😒": -0.6, "🙄": -0.5, "🤮": -1.0,
      "❌": -0.8, "🚫": -0.8, "⚠️": -0.6, "😰": -0.7, "😨": -0.8,
      "😱": -0.75, "😖": -0.85, "😫": -0.8, "😩": -0.7,
      
      // Confused/Frustrated
      "😕": -0.4, "😖": -0.65, "😤": -0.7, "🤷": -0.3,
      "🔴": -0.7, "💔": -1.0, "👎": -0.8,
    };

    // Keyword sentiment mapping
    this.keywordSentiment = {
      // Very positive
      happy: 0.9, excited: 0.95, love: 0.95, amazing: 0.9, excellent: 0.9,
      great: 0.85, good: 0.8, nice: 0.75, thank: 0.7, thanks: 0.7, grateful: 0.8,
      perfect: 0.9, wonderful: 0.9, fantastic: 0.9, awesome: 0.9, brilliant: 0.9,
      
      // Positive
      liked: 0.6, prefer: 0.5, enjoy: 0.75, interested: 0.6, ready: 0.5,
      confirmed: 0.6, approved: 0.65, okay: 0.4, fine: 0.5,
      
      // Negative
      problem: -0.7, issue: -0.65, wrong: -0.8, broken: -0.85, error: -0.7,
      fail: -0.85, failed: -0.85, complaint: -0.8, complain: -0.75,
      angry: -0.95, upset: -0.8, frustrated: -0.85, disappointed: -0.75,
      hate: -1.0, dislike: -0.8, refuse: -0.7, denied: -0.75, reject: -0.8,
      terrible: -0.95, horrible: -0.95, awful: -0.9, bad: -0.8, worse: -0.85,
      
      // Confused/Uncertain
      confused: -0.5, unclear: -0.4, uncertain: -0.45, unsure: -0.4,
      question: -0.2, help: -0.3, stuck: -0.6,
      
      // Urgent/Pressure
      urgent: -0.4, hurry: -0.3, asap: -0.3, immediately: -0.3,
      wait: -0.2, delay: -0.5, late: -0.5,
    };

    this.conversationSentiments = new Map(); // phoneNumber -> [sentiment scores]
    this.confidenceWeights = {
      emoji: 0.4,
      keyword: 0.35,
      punctuation: 0.15,
      length: 0.1,
    };
  }

  /**
   * Analyze sentiment of a message
   * @param {string} message - Message text
   * @returns {object} - Sentiment score and details
   */
  analyzeSentiment(message) {
    try {
      if (!message || message.length === 0) {
        return {
          sentiment: 0,
          confidence: 0,
          reason: "Empty message",
        };
      }

      // Layer 1: Emoji sentiment
      const emojiScore = this._analyzeEmoji(message);

      // Layer 2: Keyword sentiment
      const keywordScore = this._analyzeKeywords(message);

      // Layer 3: Punctuation/excitement markers
      const punctuationScore = this._analyzePunctuation(message);

      // Layer 4: Message length indicator
      const lengthScore = this._analyzeLength(message);

      // Weighted combination
      const sentiment =
        emojiScore.score * this.confidenceWeights.emoji +
        keywordScore.score * this.confidenceWeights.keyword +
        punctuationScore.score * this.confidenceWeights.punctuation +
        lengthScore.score * this.confidenceWeights.length;

      // Calculate confidence (average of component confidences)
      const confidence =
        (emojiScore.confidence * this.confidenceWeights.emoji +
          keywordScore.confidence * this.confidenceWeights.keyword +
          punctuationScore.confidence * this.confidenceWeights.punctuation +
          lengthScore.confidence * this.confidenceWeights.length) /
        (emojiScore.confidence > 0 ? 1 : 0.3); // Reduce confidence if no indicators found

      return {
        sentiment: Math.max(-1, Math.min(1, sentiment)),
        confidence: Math.min(1, confidence),
        components: {
          emoji: emojiScore,
          keyword: keywordScore,
          punctuation: punctuationScore,
          length: lengthScore,
        },
        label: this._getSentimentLabel(sentiment),
      };
    } catch (error) {
      console.error(`❌ Sentiment analysis failed: ${error.message}`);
      return {
        sentiment: 0,
        confidence: 0,
        error: error.message,
      };
    }
  }

  /**
   * Track sentiment over conversation
   * @param {string} phoneNumber - User identifier
   * @param {Array} recentMessages - Recent messages in order
   * @returns {object} - Sentiment trend analysis
   */
  analyzeSentimentTrend(phoneNumber, recentMessages = []) {
    try {
      if (recentMessages.length === 0) {
        return {
          trend: "unknown",
          trendDirection: "stable",
          averageSentiment: 0,
          messages: 0,
        };
      }

      // Analyze each message
      const sentiments = recentMessages.map((msg) =>
        this.analyzeSentiment(msg.content || msg).sentiment
      );

      // Store in map
      if (!this.conversationSentiments.has(phoneNumber)) {
        this.conversationSentiments.set(phoneNumber, []);
      }
      this.conversationSentiments.get(phoneNumber).push(...sentiments);

      // Keep only last 50 messages
      const stored = this.conversationSentiments.get(phoneNumber);
      if (stored.length > 50) {
        stored.shift();
      }

      // Calculate trend (moving average)
      const recent5 = sentiments.slice(-5);
      const recent10 = sentiments.slice(-10);
      const avg5 = recent5.reduce((a, b) => a + b, 0) / recent5.length;
      const avg10 = recent10.reduce((a, b) => a + b, 0) / recent10.length;

      // Trend direction
      const trend = avg5 - avg10;
      const trendDirection =
        trend > 0.1 ? "improving" : trend < -0.1 ? "declining" : "stable";

      // Mood classification
      const currentMood = avg5;
      let mood = "neutral";
      if (currentMood > 0.5) mood = "very_positive";
      else if (currentMood > 0.2) mood = "positive";
      else if (currentMood < -0.5) mood = "very_negative";
      else if (currentMood < -0.2) mood = "negative";

      return {
        currentSentiment: sentiments[sentiments.length - 1],
        averageSentiment: Math.round(avg5 * 100) / 100,
        trend: trendDirection,
        trendValue: Math.round(trend * 100) / 100,
        mood,
        messagesAnalyzed: sentiments.length,
        recommendation: this._getRecommendation(mood, trendDirection),
      };
    } catch (error) {
      console.error(`❌ Sentiment trend analysis failed: ${error.message}`);
      return {
        trend: "unknown",
        error: error.message,
      };
    }
  }

  /**
   * Alert if sentiment drops significantly
   * @param {string} phoneNumber - User identifier
   * @param {number} currentSentiment - Current sentiment score
   * @returns {object} - Alert info or null
   */
  checkSentimentAlert(phoneNumber, currentSentiment) {
    try {
      const history = this.conversationSentiments.get(phoneNumber) || [];

      if (history.length < 3) {
        return null; // Not enough history
      }

      const previousSentiment = history[history.length - 2];
      const avgSentiment = history.reduce((a, b) => a + b) / history.length;

      // Check for significant drop
      const drop = previousSentiment - currentSentiment;
      const dropFromAvg = avgSentiment - currentSentiment;

      let alert = null;

      if (drop > 0.5) {
        alert = {
          severity: "high",
          message: `Major sentiment drop detected (${(drop * 100).toFixed(0)}% decline)`,
          code: "SENTIMENT_DROP_MAJOR",
          recommendation: "Consider escalating to human agent",
        };
      } else if (drop > 0.3) {
        alert = {
          severity: "medium",
          message: `Significant sentiment decline (${(drop * 100).toFixed(0)}%)`,
          code: "SENTIMENT_DROP_SIGNIFICANT",
          recommendation: "Monitor closely, offer assistance",
        };
      } else if (dropFromAvg > 0.6 && currentSentiment < -0.5) {
        alert = {
          severity: "critical",
          message: `Sentiment critically low and below average`,
          code: "SENTIMENT_CRITICAL",
          recommendation: "Immediate escalation recommended",
        };
      }

      return alert;
    } catch (error) {
      console.error(`❌ Sentiment alert check failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get conversation mood as emoji
   * @param {number} sentiment - Sentiment score (-1 to 1)
   * @returns {string} - Mood emoji
   */
  getMoodEmoji(sentiment) {
    if (sentiment > 0.7) return "😍";
    if (sentiment > 0.4) return "😊";
    if (sentiment > 0.1) return "😐";
    if (sentiment > -0.3) return "😕";
    if (sentiment > -0.7) return "😞";
    return "😡";
  }

  /**
   * PRIVATE: Analyze emoji sentiment
   */
  _analyzeEmoji(message) {
    let score = 0;
    let count = 0;

    for (const [emoji, sentiment] of Object.entries(this.emojiSentiment)) {
      const regex = new RegExp(emoji, "g");
      const matches = message.match(regex) || [];
      count += matches.length;
      score += matches.length * sentiment;
    }

    if (count === 0) {
      return { score: 0, confidence: 0 };
    }

    return {
      score: score / count,
      confidence: Math.min(1, count / 5), // Max confidence with 5+ emojis
    };
  }

  /**
   * PRIVATE: Analyze keyword sentiment
   */
  _analyzeKeywords(message) {
    const lower = message.toLowerCase();
    let score = 0;
    let count = 0;

    for (const [keyword, sentiment] of Object.entries(this.keywordSentiment)) {
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      const matches = message.match(regex) || [];
      count += matches.length;
      score += matches.length * sentiment;
    }

    if (count === 0) {
      return { score: 0, confidence: 0 };
    }

    return {
      score: score / count,
      confidence: Math.min(1, count / 3), // Max confidence with 3+ keywords
    };
  }

  /**
   * PRIVATE: Analyze punctuation (enthusiasm markers)
   */
  _analyzePunctuation(message) {
    let score = 0;

    // Exclamation marks = positive enthusiasm
    const exclamations = (message.match(/!/g) || []).length;
    score += exclamations * 0.2;

    // Multiple exclamations = stronger positive
    if (exclamations > 3) score += 0.3;

    // Question marks = uncertainty/confusion
    const questions = (message.match(/\?/g) || []).length;
    score -= questions * 0.1;

    // All caps = strong emotion (positive or negative)
    const capsRatio = (message.match(/[A-Z]/g) || []).length / message.length;
    if (capsRatio > 0.8 && message.length > 5) {
      score += exclamations > 0 ? 0.3 : -0.3;
    }

    // Multiple punctuation = emotional
    const totalPunct = exclamations + questions + (message.match(/\.\.\./g) || []).length;

    return {
      score: Math.max(-0.5, Math.min(0.5, score)),
      confidence: Math.min(1, totalPunct / 2),
    };
  }

  /**
   * PRIVATE: Analyze message length indicator
   */
  _analyzeLength(message) {
    const words = message.split(/\s+/).length;

    // Very short messages might be frustration or brevity (context dependent)
    // Long messages suggest engagement
    let score = 0;
    let confidence = 0;

    if (words < 3) {
      score = -0.1; // Might be dismissive
      confidence = 0.2;
    } else if (words > 30) {
      score = 0.1; // Engaged conversation
      confidence = 0.2;
    }

    return { score, confidence };
  }

  /**
   * PRIVATE: Get sentiment label
   */
  _getSentimentLabel(sentiment) {
    if (sentiment > 0.6) return "very_positive";
    if (sentiment > 0.2) return "positive";
    if (sentiment > -0.2) return "neutral";
    if (sentiment > -0.6) return "negative";
    return "very_negative";
  }

  /**
   * PRIVATE: Get recommendation based on mood
   */
  _getRecommendation(mood, trend) {
    const recommendations = {
      very_positive: "✨ User is very satisfied. Encourage action.",
      positive: "😊 User is engaged. Continue conversation.",
      neutral: "😐 User is neutral. Provide helpful information.",
      negative: "😞 User is unhappy. Show empathy and support.",
      very_negative: "😡 User is very upset. Escalate to human agent.",
    };

    let rec = recommendations[mood] || "Unknown mood";

    if (trend === "declining") {
      rec += " ⚠️ Mood is declining - address concerns.";
    } else if (trend === "improving") {
      rec += " ✨ Good progress - continue supporting.";
    }

    return rec;
  }
}

export default SentimentAnalyzer;
export { SentimentAnalyzer };
