/**
 * ==========================================
 * REACTION TRACKER SERVICE (Phase 1)
 * ==========================================
 * 
 * Tracks emoji reactions on messages:
 * - Store reactions in MongoDB (or in-memory fallback)
 * - Track sentiment indicators
 * - Generate reaction statistics
 * - Real-time reaction updates
 * 
 * Author: WhatsApp Bot Linda
 * Date: February 11, 2026
 */

import reactionMemoryStore from "../utils/ReactionMemoryStore.js";

class ReactionTracker {
  constructor(mongoDb) {
    this.db = mongoDb;
    this.logger = console;
    this.reactionsCollection = 'reactions';
    this.memoryStore = reactionMemoryStore; // Fallback to in-memory store
  }

  /**
   * Track a reaction event
   * @param {Reaction} reaction - Reaction object from event
   * @returns {Promise<Object>} Stored reaction data
   */
  async trackReaction(reaction) {
    try {
      const reactionData = {
        messageId: reaction.msg.id.id || reaction.msg.id,
        emoji: reaction.reaction,
        userId: reaction.from,
        chatId: reaction.msg.from,
        timestamp: new Date(),
        senderName: reaction.msg.author || 'unknown',
        status: 'tracked',
      };

      // Try MongoDB first
      if (this.db) {
        try {
          const collection = this.db.collection(this.reactionsCollection);
          await collection.insertOne(reactionData);
          this.logger.log(`📊 Reaction tracked in MongoDB: ${reaction.reaction} from ${reaction.from}`);
          return reactionData;
        } catch (dbError) {
          this.logger.warn(`⚠️  MongoDB error, using memory store:`, dbError.message);
        }
      }

      // Fallback to memory store
      const result = this.memoryStore.trackReaction(reaction);
      this.logger.log(`📊 Reaction tracked in memory: ${reaction.reaction} from ${reaction.from}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Error tracking reaction:`, error.message);
      return null;
    }
  }

  /**
   * Get reactions for a specific message
   * @param {string} messageId - WhatsApp message ID
   * @returns {Promise<Array>} Array of reactions
   */
  async getMessageReactions(messageId) {
    try {
      // Try MongoDB first
      if (this.db) {
        try {
          const collection = this.db.collection(this.reactionsCollection);
          const reactions = await collection.find({ messageId }).toArray();
          this.logger.log(`📊 Found ${reactions.length} reactions in MongoDB for message ${messageId}`);
          return reactions;
        } catch (dbError) {
          this.logger.warn(`⚠️  MongoDB error, using memory store:`, dbError.message);
        }
      }

      // Fallback to memory store
      const reactions = this.memoryStore.getReactionsForMessage(messageId);
      this.logger.log(`📊 Found ${reactions.length} reactions in memory for message ${messageId}`);
      return reactions;
    } catch (error) {
      this.logger.error(`❌ Error getting message reactions:`, error.message);
      return [];
    }
  }

  /**
   * Calculate sentiment score from reactions
   * Positive: ❤️ (+2), 😂 (+1), 🙏 (+1)
   * Negative: 😢 (-1)
   * Neutral: 😮 (0)
   * @param {Array} reactions - Array of reaction objects
   * @returns {Object} Sentiment metrics
   */
  calculateSentiment(reactions) {
    const sentimentMap = {
      '❤️': 2,   // Love
      '😂': 1,   // Laugh/Positive
      '🙏': 1,   // Respect/Positive
      '😮': 0,   // Surprised/Neutral
      '😢': -1,  // Sad/Negative
      '🔥': 1,   // Hot/Positive
    };

    let totalScore = 0;
    let positive = 0;
    let negative = 0;
    let neutral = 0;

    reactions.forEach((reaction) => {
      const emoji = reaction.emoji;
      const score = sentimentMap[emoji] || 0;

      totalScore += score;
      if (score > 0) positive++;
      else if (score < 0) negative++;
      else neutral++;
    });

    const sentiment = totalScore > 0 ? 'positive' : totalScore < 0 ? 'negative' : 'neutral';

    return {
      totalScore,
      sentiment,
      positive,
      negative,
      neutral,
      total: reactions.length,
      averageScore: reactions.length > 0 ? (totalScore / reactions.length).toFixed(2) : 0,
    };
  }

  /**
   * Get reaction statistics for a chat
   * @param {string} chatId - Chat ID
   * @param {Object} options - Query options {startDate, endDate, limit}
   * @returns {Promise<Object>} Reaction statistics
   */
  async getChatReactionStats(chatId, options = {}) {
    try {
      if (!this.db) {
        return null;
      }

      const collection = this.db.collection(this.reactionsCollection);
      const query = { chatId };

      if (options.startDate || options.endDate) {
        query.timestamp = {};
        if (options.startDate) query.timestamp.$gte = options.startDate;
        if (options.endDate) query.timestamp.$lte = options.endDate;
      }

      const reactions = await collection
        .find(query)
        .sort({ timestamp: -1 })
        .limit(options.limit || 100)
        .toArray();

      // Group by emoji
      const emojiCount = {};
      reactions.forEach((reaction) => {
        emojiCount[reaction.emoji] = (emojiCount[reaction.emoji] || 0) + 1;
      });

      const sentiment = this.calculateSentiment(reactions);

      return {
        chatId,
        totalReactions: reactions.length,
        emojiBreakdown: emojiCount,
        sentiment,
        topEmoji: Object.entries(emojiCount).sort((a, b) => b[1] - a[1])[0],
        recentReactions: reactions.slice(0, 10),
      };
    } catch (error) {
      this.logger.error(`❌ Error getting chat reaction stats:`, error.message);
      return null;
    }
  }

  /**
   * Get most reacted messages in chat
   * @param {string} chatId - Chat ID
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} Most reacted messages
   */
  async getMostReactedMessages(chatId, limit = 10) {
    try {
      if (!this.db) {
        return [];
      }

      const collection = this.db.collection(this.reactionsCollection);

      const mostReacted = await collection
        .aggregate([
          { $match: { chatId } },
          { $group: { _id: '$messageId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: limit },
        ])
        .toArray();

      this.logger.log(`📊 Found ${mostReacted.length} most reacted messages`);
      return mostReacted;
    } catch (error) {
      this.logger.error(`❌ Error getting most reacted messages:`, error.message);
      return [];
    }
  }

  /**
   * Get user's favorite emoji
   * @param {string} userId - User ID
   * @param {string} chatId - Optional: filter by chat
   * @returns {Promise<String>} Most used emoji
   */
  async getUserFavoriteEmoji(userId, chatId = null) {
    try {
      if (!this.db) {
        return null;
      }

      const collection = this.db.collection(this.reactionsCollection);
      const query = { userId };
      if (chatId) query.chatId = chatId;

      const favoriteEmoji = await collection
        .aggregate([
          { $match: query },
          { $group: { _id: '$emoji', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 1 },
        ])
        .toArray();

      if (favoriteEmoji.length > 0) {
        this.logger.log(`😊 User's favorite emoji: ${favoriteEmoji[0]._id}`);
        return favoriteEmoji[0]._id;
      }

      return null;
    } catch (error) {
      this.logger.error(`❌ Error getting favorite emoji:`, error.message);
      return null;
    }
  }

  /**
   * Generate reaction report for time period
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} chatId - Optional: specific chat
   * @returns {Promise<Object>} Reaction report
   */
  async generateReport(startDate, endDate, chatId = null) {
    try {
      if (!this.db) {
        return null;
      }

      const collection = this.db.collection(this.reactionsCollection);
      const query = {
        timestamp: {
          $gte: startDate,
          $lte: endDate,
        },
      };

      if (chatId) query.chatId = chatId;

      const reactions = await collection.find(query).toArray();
      const sentiment = this.calculateSentiment(reactions);

      // Emoji breakdown
      const emojiBreakdown = {};
      reactions.forEach((r) => {
        emojiBreakdown[r.emoji] = (emojiBreakdown[r.emoji] || 0) + 1;
      });

      return {
        period: { startDate, endDate },
        chatId: chatId || 'all',
        totalReactions: reactions.length,
        emojiBreakdown,
        sentiment,
        averagePerMessage: reactions.length > 0 ? reactions.length.toFixed(2) : 0,
        topEmoji: Object.entries(emojiBreakdown).sort((a, b) => b[1] - a[1])[0],
        reportGeneratedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`❌ Error generating report:`, error.message);
      return null;
    }
  }
}

export function getReactionTracker(mongoDb = null) {
  return new ReactionTracker(mongoDb);
}

export default ReactionTracker;
