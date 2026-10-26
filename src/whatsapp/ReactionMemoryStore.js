/**
 * ==========================================
 * REACTION MEMORY STORE (Temporary - Phase 1)
 * ==========================================
 *
 * In-memory store for reactions and group events
 * Used until MongoDB persistence is implemented (Week 3-4)
 *
 * After MongoDB integration, this will be replaced with database persistence
 *
 * Author: Linda Architecture Team
 * Date: February 12, 2026
 */

class ReactionMemoryStore {
  constructor() {
    // Store reactions by message ID
    this.reactions = new Map();
    
    // Store group events by group ID
    this.groupEvents = new Map();
    
    // Store message metadata
    this.messageMetadata = new Map();
    
    // Size limits (prevents memory bloat)
    this.MAX_REACTIONS = 10000;
    this.MAX_GROUP_EVENTS = 5000;
    this.MAX_MESSAGES = 5000;
    
    // Cleanup interval (every 24 hours)
    this.startCleanupTimer();
    
    console.log('[ReactionMemoryStore] Initialized - In-memory store for Phase 1');
  }

  /**
   * Track a reaction to a message
   * @param {Object} reaction - WhatsApp reaction object
   * @returns {Object} - Tracked reaction record
   */
  trackReaction(reaction) {
    try {
      const messageId = reaction.msg.id.id || reaction.msg.id;
      const emoji = reaction.reaction;
      const from = reaction.from;
      const timestamp = new Date();

      // Initialize message reactions if not exists
      if (!this.reactions.has(messageId)) {
        this.reactions.set(messageId, {
          messageId,
          reactions: [],
          createdAt: timestamp,
          lastUpdated: timestamp
        });
      }

      const msgReactions = this.reactions.get(messageId);

      // Add or update reaction
      const existingReaction = msgReactions.reactions.find(
        (r) => r.from === from && r.emoji === emoji
      );

      if (existingReaction) {
        // Update existing reaction timestamp
        existingReaction.timestamp = timestamp;
        existingReaction.count = (existingReaction.count || 1) + 1;
      } else {
        // Add new reaction
        msgReactions.reactions.push({
          emoji,
          from,
          timestamp,
          count: 1
        });
      }

      msgReactions.lastUpdated = timestamp;

      // Store message metadata if not exists
      if (!this.messageMetadata.has(messageId)) {
        this.messageMetadata.set(messageId, {
          messageId,
          reactionCount: 0,
          createdAt: timestamp
        });
      }

      const metadata = this.messageMetadata.get(messageId);
      metadata.reactionCount = msgReactions.reactions.length;
      metadata.lastUpdated = timestamp;

      // Cleanup if exceeding size limit
      if (this.reactions.size > this.MAX_REACTIONS) {
        this._pruneOldestReactions();
      }

      return {
        success: true,
        messageId,
        emoji,
        from,
        totalReactions: msgReactions.reactions.length,
        timestamp
      };
    } catch (error) {
      console.error('[ReactionMemoryStore] Error tracking reaction:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all reactions for a message
   * @param {string} messageId - Message ID
   * @returns {Array} - Array of reactions
   */
  getReactionsForMessage(messageId) {
    try {
      const msgReactions = this.reactions.get(messageId);
      if (!msgReactions) {
        return [];
      }
      return msgReactions.reactions;
    } catch (error) {
      console.error('[ReactionMemoryStore] Error getting reactions:', error.message);
      return [];
    }
  }

  /**
   * Calculate sentiment from reactions
   * Positive emoji 👍👏😍 = +1, Negative emoji 👎🤮 = -1, Neutral = 0
   * @param {Array} reactions - Array of reactions
   * @returns {Object} - Sentiment analysis
   */
  calculateSentiment(reactions) {
    try {
      const POSITIVE_EMOJIS = ['👍', '👏', '😂', '❤️', '😍', '🎉', '✨', '🙏', '😁'];
      const NEGATIVE_EMOJIS = ['👎', '🤮', '😡', '😤', '😞', '😭', '🚫', '⛔', '💔'];

      let positiveCount = 0;
      let negativeCount = 0;
      let neutralCount = 0;

      reactions.forEach((reaction) => {
        if (POSITIVE_EMOJIS.includes(reaction.emoji)) {
          positiveCount += reaction.count || 1;
        } else if (NEGATIVE_EMOJIS.includes(reaction.emoji)) {
          negativeCount += reaction.count || 1;
        } else {
          neutralCount += reaction.count || 1;
        }
      });

      const total = positiveCount + negativeCount + neutralCount;
      const sentiment = total > 0 ? (positiveCount - negativeCount) / total : 0;

      return {
        sentiment: sentiment > 0 ? 'positive' : sentiment < 0 ? 'negative' : 'neutral',
        score: Math.round(sentiment * 100) / 100,
        positiveCount,
        negativeCount,
        neutralCount,
        totalReactions: total
      };
    } catch (error) {
      console.error('[ReactionMemoryStore] Error calculating sentiment:', error.message);
      return {
        sentiment: 'unknown',
        score: 0,
        positiveCount: 0,
        negativeCount: 0,
        neutralCount: 0,
        totalReactions: 0
      };
    }
  }

  /**
   * Track a group event (join, leave, update)
   * @param {string} groupId - Group ID
   * @param {string} eventType - 'join', 'leave', 'update'
   * @param {Object} eventData - Event metadata
   * @returns {Object} - Tracked event record
   */
  trackGroupEvent(groupId, eventType, eventData) {
    try {
      if (!this.groupEvents.has(groupId)) {
        this.groupEvents.set(groupId, {
          groupId,
          events: [],
          createdAt: new Date()
        });
      }

      const groupHistory = this.groupEvents.get(groupId);
      groupHistory.events.push({
        type: eventType,
        data: eventData,
        timestamp: new Date()
      });

      // Keep only last 100 events per group
      if (groupHistory.events.length > 100) {
        groupHistory.events = groupHistory.events.slice(-100);
      }

      groupHistory.lastUpdated = new Date();

      // Cleanup if exceeding size limit
      if (this.groupEvents.size > this.MAX_GROUP_EVENTS) {
        this._pruneOldestGroupEvents();
      }

      return {
        success: true,
        groupId,
        eventType,
        eventCount: groupHistory.events.length,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('[ReactionMemoryStore] Error tracking group event:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all events for a group
   * @param {string} groupId - Group ID
   * @returns {Array} - Array of group events
   */
  getGroupEvents(groupId) {
    try {
      const groupHistory = this.groupEvents.get(groupId);
      if (!groupHistory) {
        return [];
      }
      return groupHistory.events;
    } catch (error) {
      console.error('[ReactionMemoryStore] Error getting group events:', error.message);
      return [];
    }
  }

  /**
   * Get summary statistics
   * @returns {Object} - Statistics summary
   */
  getStats() {
    return {
      totalMessages: this.messageMetadata.size,
      totalMessageReactions: this.reactions.size,
      totalGroupEvents: this.groupEvents.size,
      memory: {
        reactions: this.reactions.size,
        groupEvents: this.groupEvents.size,
        messages: this.messageMetadata.size
      },
      limits: {
        maxReactions: this.MAX_REACTIONS,
        maxGroupEvents: this.MAX_GROUP_EVENTS,
        maxMessages: this.MAX_MESSAGES
      }
    };
  }

  /**
   * Clear all data (for reset/testing)
   */
  clearAll() {
    this.reactions.clear();
    this.groupEvents.clear();
    this.messageMetadata.clear();
    console.log('[ReactionMemoryStore] All data cleared');
  }

  /**
   * Remove oldest reactions when limit exceeded
   * @private
   */
  _pruneOldestReactions() {
    try {
      // Sort by lastUpdated and remove oldest 10%
      const sorted = Array.from(this.reactions.entries())
        .sort((a, b) => a[1].lastUpdated - b[1].lastUpdated);

      const remove = Math.ceil(this.MAX_REACTIONS * 0.1);
      for (let i = 0; i < remove; i++) {
        const [messageId] = sorted[i];
        this.reactions.delete(messageId);
        this.messageMetadata.delete(messageId);
      }

      console.log(`[ReactionMemoryStore] Pruned ${remove} oldest reactions (limit: ${this.MAX_REACTIONS})`);
    } catch (error) {
      console.error('[ReactionMemoryStore] Error pruning reactions:', error.message);
    }
  }

  /**
   * Remove oldest group events when limit exceeded
   * @private
   */
  _pruneOldestGroupEvents() {
    try {
      // Sort by creation time and remove oldest 10%
      const sorted = Array.from(this.groupEvents.entries())
        .sort((a, b) => a[1].createdAt - b[1].createdAt);

      const remove = Math.ceil(this.MAX_GROUP_EVENTS * 0.1);
      for (let i = 0; i < remove; i++) {
        const [groupId] = sorted[i];
        this.groupEvents.delete(groupId);
      }

      console.log(`[ReactionMemoryStore] Pruned ${remove} oldest group events (limit: ${this.MAX_GROUP_EVENTS})`);
    } catch (error) {
      console.error('[ReactionMemoryStore] Error pruning group events:', error.message);
    }
  }

  /**
   * Start cleanup timer (runs every 24 hours)
   * Removes stale data older than 30 days
   * @private
   */
  startCleanupTimer() {
    setInterval(() => {
      this._cleanupStaleData();
    }, 24 * 60 * 60 * 1000); // Every 24 hours
  }

  /**
   * Clean up stale data (older than 30 days)
   * @private
   */
  _cleanupStaleData() {
    try {
      const AGE_LIMIT = 30 * 24 * 60 * 60 * 1000; // 30 days
      const now = new Date().getTime();
      let removed = 0;

      // Cleanup old reactions
      for (const [messageId, reaction] of this.reactions.entries()) {
        if (now - reaction.lastUpdated.getTime() > AGE_LIMIT) {
          this.reactions.delete(messageId);
          this.messageMetadata.delete(messageId);
          removed++;
        }
      }

      // Cleanup old group events
      for (const [groupId, groupHistory] of this.groupEvents.entries()) {
        if (now - groupHistory.createdAt.getTime() > AGE_LIMIT) {
          this.groupEvents.delete(groupId);
          removed++;
        }
      }

      if (removed > 0) {
        console.log(`[ReactionMemoryStore] Cleanup: Removed ${removed} stale entries`);
      }
    } catch (error) {
      console.error('[ReactionMemoryStore] Error cleaning up stale data:', error.message);
    }
  }
}

// Export singleton instance
const reactionMemoryStore = new ReactionMemoryStore();
export default reactionMemoryStore;

/**
 * Export for use in other modules
 */
export { ReactionMemoryStore };
