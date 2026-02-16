/**
 * ============================================
 * EMOJI REACTION SERVICE (Phase 17)
 * ============================================
 * 
 * Tracks message reactions (emoji) and maps them
 * to semantic meanings for response generation.
 */

export class EmojiReactionService {
  constructor() {
    // Maps emoji to semantic meanings
    this.emojiMappings = {
      '👍': { meaning: 'approval', sentiment: 'positive', strength: 'strong' },
      '👎': { meaning: 'disapproval', sentiment: 'negative', strength: 'strong' },
      '❤️': { meaning: 'interest', sentiment: 'positive', strength: 'strong' },
      '😂': { meaning: 'amusement', sentiment: 'positive', strength: 'moderate' },
      '😊': { meaning: 'happiness', sentiment: 'positive', strength: 'moderate' },
      '😠': { meaning: 'anger', sentiment: 'negative', strength: 'strong' },
      '😭': { meaning: 'sadness', sentiment: 'negative', strength: 'strong' },
      '🔥': { meaning: 'excitement', sentiment: 'positive', strength: 'strong' },
      '🙏': { meaning: 'gratitude', sentiment: 'positive', strength: 'moderate' },
      '✅': { meaning: 'confirmation', sentiment: 'positive', strength: 'strong' },
      '❌': { meaning: 'rejection', sentiment: 'negative', strength: 'strong' },
      '⚠️': { meaning: 'warning', sentiment: 'neutral', strength: 'moderate' },
      '💼': { meaning: 'business', sentiment: 'neutral', strength: 'moderate' },
      '🏠': { meaning: 'property', sentiment: 'neutral', strength: 'moderate' },
      '🏢': { meaning: 'building', sentiment: 'neutral', strength: 'moderate' },
      '💰': { meaning: 'money', sentiment: 'neutral', strength: 'moderate' },
      '💵': { meaning: 'payment', sentiment: 'neutral', strength: 'moderate' },
      '📞': { meaning: 'contact', sentiment: 'neutral', strength: 'moderate' },
      '📧': { meaning: 'email', sentiment: 'neutral', strength: 'moderate' },
      '🚀': { meaning: 'momentum', sentiment: 'positive', strength: 'strong' },
    };
    
    this.reactionHistory = new Map();  // messageId -> reactions array
  }

  /**
   * Record a reaction to a message
   */
  recordReaction(messageId, emoji, actor, timestamp = null) {
    try {
      if (!this.emojiMappings[emoji]) {
        console.warn(`⚠️ Unknown emoji: ${emoji}`);
        return false;
      }

      if (!this.reactionHistory.has(messageId)) {
        this.reactionHistory.set(messageId, []);
      }

      const reaction = {
        emoji,
        actor,
        timestamp: timestamp || new Date(),
        meaning: this.emojiMappings[emoji],
      };

      this.reactionHistory.get(messageId).push(reaction);
      console.log(`✅ Reaction recorded: ${emoji} on message ${messageId}`);
      return true;
    } catch (error) {
      console.error('❌ Error recording reaction:', error.message);
      return false;
    }
  }

  /**
   * Get reactions for a message
   */
  getReactions(messageId) {
    return this.reactionHistory.get(messageId) || [];
  }

  /**
   * Get reaction summary for a message
   */
  getReactionSummary(messageId) {
    try {
      const reactions = this.getReactions(messageId);
      if (reactions.length === 0) return null;

      const summary = {
        totalReactions: reactions.length,
        uniqueEmojis: new Set(reactions.map(r => r.emoji)).size,
        emojiCounts: {},
        sentimentBreakdown: {
          positive: 0,
          negative: 0,
          neutral: 0,
        },
        dominantMeaning: null,
        actors: new Set(reactions.map(r => r.actor)).size,
      };

      // Count emoji frequencies
      for (const reaction of reactions) {
        const emoji = reaction.emoji;
        summary.emojiCounts[emoji] = (summary.emojiCounts[emoji] || 0) + 1;
        summary.sentimentBreakdown[reaction.meaning.sentiment] += 1;
      }

      // Find dominant emoji
      const [dominantEmoji, count] = Object.entries(summary.emojiCounts)
        .sort(([, a], [, b]) => b - a)[0] || [null, 0];
      
      if (dominantEmoji) {
        summary.dominantMeaning = this.emojiMappings[dominantEmoji].meaning;
        summary.dominantEmoji = dominantEmoji;
        summary.dominantCount = count;
      }

      return summary;
    } catch (error) {
      console.error('❌ Error getting summary:', error.message);
      return null;
    }
  }

  /**
   * Get sentiment from reactions
   */
  getSentimentFromReactions(messageId) {
    try {
      const reactions = this.getReactions(messageId);
      if (reactions.length === 0) return null;

      const sentiments = reactions.reduce((acc, r) => ({
        ...acc,
        [r.meaning.sentiment]: (acc[r.meaning.sentiment] || 0) + 1,
      }), {});

      // Determine overall sentiment
      if (sentiments.positive > sentiments.negative) {
        return 'positive';
      } else if (sentiments.negative > sentiments.positive) {
        return 'negative';
      } else {
        return 'neutral';
      }
    } catch (error) {
      console.error('❌ Error getting sentiment:', error.message);
      return null;
    }
  }

  /**
   * Get response suggestion based on reactions
   */
  getSuggestedResponse(messageId) {
    try {
      const summary = this.getReactionSummary(messageId);
      if (!summary) return null;

      const meanings = Object.keys(summary.emojiCounts)
        .map(emoji => this.emojiMappings[emoji].meaning);

      if (meanings.includes('approval')) {
        return '😊 Thank you for the positive feedback!';
      } else if (meanings.includes('disapproval')) {
        return '😔 I apologize. Can you help me understand what went wrong?';
      } else if (meanings.includes('gratitude')) {
        return '😊 You\'re welcome! Happy to help.';
      } else if (meanings.includes('anger')) {
        return '😞 I\'m sorry to hear that. How can I make it right?';
      } else if (meanings.includes('sadness')) {
        return '💙 I\'m here to help. What do you need?';
      } else {
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting response:', error.message);
      return null;
    }
  }

  /**
   * Get emoji meaning
   */
  getEmojiMeaning(emoji) {
    return this.emojiMappings[emoji] || null;
  }

  /**
   * Get all tracked reactions by actor
   */
  getReactionsByActor(actor) {
    try {
      const results = [];
      
      for (const [messageId, reactions] of this.reactionHistory) {
        const actorReactions = reactions.filter(r => r.actor === actor);
        if (actorReactions.length > 0) {
          results.push({
            messageId,
            reactions: actorReactions,
            count: actorReactions.length,
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('❌ Error getting actor reactions:', error.message);
      return [];
    }
  }

  /**
   * Clean old reactions (older than ttl)
   */
  cleanup(ttlMs = 86400000) {  // 24 hours default
    try {
      const now = Date.now();
      let removed = 0;

      for (const [messageId, reactions] of this.reactionHistory) {
        const filtered = reactions.filter(r => now - r.timestamp < ttlMs);
        if (filtered.length === 0) {
          this.reactionHistory.delete(messageId);
          removed++;
        } else if (filtered.length < reactions.length) {
          this.reactionHistory.set(messageId, filtered);
        }
      }

      if (removed > 0) {
        console.log(`✅ Cleaned ${removed} expired reaction entries`);
      }
      return removed;
    } catch (error) {
      console.error('❌ Cleanup error:', error.message);
      return 0;
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    try {
      let totalReactions = 0;
      let totalMessages = 0;

      for (const reactions of this.reactionHistory.values()) {
        totalMessages++;
        totalReactions += reactions.length;
      }

      return {
        trackedMessages: totalMessages,
        totalReactions,
        averageReactionsPerMessage: totalMessages > 0 
          ? (totalReactions / totalMessages).toFixed(2)
          : 0,
        supportedEmojis: Object.keys(this.emojiMappings).length,
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Clear all reactions
   */
  clear() {
    this.reactionHistory.clear();
    console.log('✅ Reaction history cleared');
  }
}

// Export singleton
export const emojiReactionService = new EmojiReactionService();
