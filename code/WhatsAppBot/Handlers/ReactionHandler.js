/**
 * ==========================================
 * REACTION HANDLER (Phase 1)
 * ==========================================
 * 
 * Listens to message reactions and updates:
 * - Tracks reactions in database
 * - Logs sentiment changes
 * - Alerts on suspicious activity
 * 
 * Event: client.on('message_reaction')
 * 
 * Author: WhatsApp Bot Linda
 * Date: February 11, 2026
 */

import { getReactionTracker } from "../../Services/ReactionTracker.js";

export class ReactionHandler {
  constructor(mongoDb = null) {
    this.reactionTracker = getReactionTracker(mongoDb);
    this.logger = console;
  }

  /**
   * Handle message reaction event
   * Called when someone reacts to a message
   * @param {Reaction} reaction - Reaction event object
   */
  async handleReaction(reaction) {
    try {
      this.logger.log(`\n📊 [REACTION EVENT]`);
      this.logger.log(`Emoji: ${reaction.reaction}`);
      this.logger.log(`From: ${reaction.from}`);
      this.logger.log(`Message: ${reaction.msg.id.id || reaction.msg.id}`);

      // Track in database
      const tracked = await this.reactionTracker.trackReaction(reaction);

      if (!tracked) {
        this.logger.warn(`⚠️  Reaction tracking unavailable (no database)`);
      }

      return tracked;
    } catch (error) {
      this.logger.error(`❌ Error in reaction handler:`, error.message);
    }
  }

  /**
   * Get reactions for a message ID
   * @param {string} messageId - WhatsApp message ID
   */
  async getReactionsForMessage(messageId) {
    try {
      const reactions = await this.reactionTracker.getMessageReactions(messageId);
      return reactions;
    } catch (error) {
      this.logger.error(`❌ Error getting reactions:`, error.message);
      return [];
    }
  }

  /**
   * Get sentiment for a message's reactions
   * @param {string} messageId - WhatsApp message ID
   */
  async getSentimentForMessage(messageId) {
    try {
      const reactions = await this.reactionTracker.getMessageReactions(messageId);
      const sentiment = this.reactionTracker.calculateSentiment(reactions);
      return sentiment;
    } catch (error) {
      this.logger.error(`❌ Error calculating sentiment:`, error.message);
      return null;
    }
  }
}

export default ReactionHandler;
