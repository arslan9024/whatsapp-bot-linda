/**
 * ============================================
 * CONVERSATION CONTEXT SERVICE (Phase 17)
 * ============================================
 * 
 * Maintains conversation state with last N messages,
 * topics, sentiment trends, and extracted data
 * for context-aware response generation.
 */

export class ConversationContextService {
  constructor(maxContextDepth = 10, ttlMs = 86400000) {
    this.contexts = new Map();  // phoneNumber -> context object
    this.maxContextDepth = maxContextDepth;
    this.ttlMs = ttlMs;  // Time-to-live for contexts (24 hours default)
  }

  /**
   * Get or create context for a conversation
   */
  getContext(phoneNumber) {
    if (!this.contexts.has(phoneNumber)) {
      this.contexts.set(phoneNumber, {
        phoneNumber,
        createdAt: new Date(),
        lastUpdated: new Date(),
        messages: [],
        currentTopic: null,
        sentimentTrend: [],
        extractedEntities: {
          phones: [],
          properties: [],
          contacts: [],
          projects: [],
        },
        userProfile: {
          interests: [],
          preferences: {},
          interactionCount: 0,
          lastInteractionType: null,
        },
      });
    }

    return this.contexts.get(phoneNumber);
  }

  /**
   * Update context with new message
   */
  updateContext(phoneNumber, messageObj) {
    try {
      const context = this.getContext(phoneNumber);
      
      // Add message to history (keep last N)
      context.messages.push({
        timestamp: messageObj.timestamp,
        body: messageObj.body,
        type: messageObj.type,
        sentiment: messageObj.sentiment,
        intent: messageObj.intent,
        entities: messageObj.entities,
      });

      if (context.messages.length > this.maxContextDepth) {
        context.messages = context.messages.slice(-this.maxContextDepth);
      }

      // Update sentiment trend
      if (messageObj.sentiment) {
        context.sentimentTrend.push({
          timestamp: messageObj.timestamp,
          sentiment: messageObj.sentiment,
        });

        if (context.sentimentTrend.length > 20) {
          context.sentimentTrend = context.sentimentTrend.slice(-20);
        }
      }

      // Update topic
      if (messageObj.intent) {
        context.currentTopic = messageObj.intent;
      }

      // Update user profile
      context.userProfile.interactionCount += 1;
      context.userProfile.lastInteractionType = messageObj.type;

      // Update entities
      if (messageObj.entities) {
        if (messageObj.entities.phones) {
          context.extractedEntities.phones = [
            ...new Set([
              ...context.extractedEntities.phones,
              ...messageObj.entities.phones.map(p => p.value),
            ])
          ];
        }
        if (messageObj.entities.properties) {
          messageObj.entities.properties.forEach(prop => {
            if (prop.project && !context.extractedEntities.projects.includes(prop.project)) {
              context.extractedEntities.projects.push(prop.project);
            }
          });
        }
      }

      context.lastUpdated = new Date();
      return context;
    } catch (error) {
      console.error('❌ Error updating context:', error.message);
      return null;
    }
  }

  /**
   * Get conversation summary
   */
  getSummary(phoneNumber) {
    try {
      const context = this.getContext(phoneNumber);
      
      return {
        phoneNumber,
        messageCount: context.messages.length,
        currentTopic: context.currentTopic,
        sentimentTrend: this.getSentimentTrend(phoneNumber),
        recentMessages: context.messages.slice(-3),
        extractedEntities: context.extractedEntities,
        userProfile: context.userProfile,
        lastUpdated: context.lastUpdated,
      };
    } catch (error) {
      console.error('❌ Error getting summary:', error.message);
      return null;
    }
  }

  /**
   * Get sentiment trend analysis
   */
  getSentimentTrend(phoneNumber) {
    try {
      const context = this.getContext(phoneNumber);
      const trends = context.sentimentTrend;

      if (trends.length === 0) return 'unknown';

      const recentTrends = trends.slice(-5);
      const counts = {
        positive: 0,
        negative: 0,
        neutral: 0,
      };

      for (const trend of recentTrends) {
        counts[trend.sentiment] = (counts[trend.sentiment] || 0) + 1;
      }

      if (counts.positive > counts.negative) {
        return 'improving';
      } else if (counts.negative > counts.positive) {
        return 'declining';
      } else {
        return 'stable';
      }
    } catch (error) {
      console.error('❌ Error analyzing trend:', error.message);
      return 'unknown';
    }
  }

  /**
   * Get recent topic
   */
  getRecentTopic(phoneNumber) {
    try {
      const context = this.getContext(phoneNumber);
      if (context.messages.length === 0) return null;

      // Find most recent message with intent
      for (let i = context.messages.length - 1; i >= 0; i--) {
        if (context.messages[i].intent) {
          return context.messages[i].intent;
        }
      }

      return context.currentTopic;
    } catch (error) {
      console.error('❌ Error getting topic:', error.message);
      return null;
    }
  }

  /**
   * Get recent messages (for context window)
   */
  getRecentMessages(phoneNumber, limit = 5) {
    try {
      const context = this.getContext(phoneNumber);
      return context.messages.slice(-limit);
    } catch (error) {
      console.error('❌ Error getting messages:', error.message);
      return [];
    }
  }

  /**
   * Get user interests based on message history
   */
  getUserInterests(phoneNumber) {
    try {
      const context = this.getContext(phoneNumber);
      const interests = new Set();
      
      // Infer from extracted entities
      context.extractedEntities.properties.forEach(p => interests.add(p));
      context.extractedEntities.projects.forEach(p => interests.add(p));
      
      // Infer from topics
      if (context.currentTopic) {
        interests.add(context.currentTopic);
      }

      return Array.from(interests);
    } catch (error) {
      console.error('❌ Error getting interests:', error.message);
      return [];
    }
  }

  /**
   * Check if conversation needs follow-up
   */
  needsFollowUp(phoneNumber) {
    try {
      const context = this.getContext(phoneNumber);
      if (context.messages.length === 0) return false;

      const lastMsg = context.messages[context.messages.length - 1];
      const now = new Date();
      const hoursSinceLastMsg = (now - lastMsg.timestamp) / (1000 * 60 * 60);

      // Follow up if > 24 hours and no resolution
      return hoursSinceLastMsg > 24 && context.currentTopic;
    } catch (error) {
      console.error('❌ Error checking follow-up:', error.message);
      return false;
    }
  }

  /**
   * Update user preferences
   */
  updateUserPreferences(phoneNumber, preferences) {
    try {
      const context = this.getContext(phoneNumber);
      context.userProfile.preferences = {
        ...context.userProfile.preferences,
        ...preferences,
      };
      context.lastUpdated = new Date();
      return true;
    } catch (error) {
      console.error('❌ Error updating preferences:', error.message);
      return false;
    }
  }

  /**
   * Clear context for a conversation
   */
  clearContext(phoneNumber) {
    try {
      this.contexts.delete(phoneNumber);
      console.log(`✅ Context cleared for ${phoneNumber}`);
      return true;
    } catch (error) {
      console.error('❌ Error clearing context:', error.message);
      return false;
    }
  }

  /**
   * Clean expired contexts
   */
  cleanup() {
    try {
      const now = Date.now();
      const toDelete = [];

      for (const [phoneNumber, context] of this.contexts) {
        if (now - context.lastUpdated > this.ttlMs) {
          toDelete.push(phoneNumber);
        }
      }

      for (const phoneNumber of toDelete) {
        this.contexts.delete(phoneNumber);
      }

      if (toDelete.length > 0) {
        console.log(`✅ Cleaned ${toDelete.length} expired contexts`);
      }

      return toDelete.length;
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
      let totalMessages = 0;
      let activeContexts = 0;

      for (const context of this.contexts.values()) {
        totalMessages += context.messages.length;
        activeContexts++;
      }

      return {
        activeContexts,
        totalMessages,
        avgMessagesPerContext: activeContexts > 0 
          ? (totalMessages / activeContexts).toFixed(2)
          : 0,
        maxContextDepth: this.maxContextDepth,
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Clear all contexts
   */
  clear() {
    this.contexts.clear();
    console.log('✅ All contexts cleared');
  }
}

// Export singleton
export const conversationContextService = new ConversationContextService();
