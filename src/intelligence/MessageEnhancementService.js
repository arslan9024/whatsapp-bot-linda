/**
 * ==========================================
 * MESSAGE ENHANCEMENT SERVICE (Phase 1)
 * ==========================================
 * 
 * Handles message manipulation:
 * - Edit messages
 * - Delete messages
 * - Forward messages
 * - Add/view reactions
 * - Get quoted message context
 * 
 * Author: WhatsApp Bot Linda
 * Date: February 11, 2026
 */

class MessageEnhancementService {
  constructor() {
    this.logger = console;
  }

  /**
   * Edit a sent message
   * @param {Message} message - WhatsApp message object
   * @param {string} newContent - New message content
   * @returns {Promise<Message>} Updated message
   */
  async editMessage(message, newContent) {
    try {
      if (!message || !message.edit) {
        throw new Error("Message object doesn't support editing");
      }
      
      await message.edit(newContent);
      this.logger.log(`✏️  Message edited successfully`);
      return message;
    } catch (error) {
      this.logger.error(`❌ Error editing message:`, error.message);
      throw error;
    }
  }

  /**
   * Delete a message
   * @param {Message} message - WhatsApp message object
   * @param {boolean} deleteForEveryone - Delete for all participants
   * @returns {Promise<boolean>} Success status
   */
  async deleteMessage(message, deleteForEveryone = false) {
    try {
      if (!message || !message.delete) {
        throw new Error("Message object doesn't support deletion");
      }

      await message.delete(deleteForEveryone);
      this.logger.log(`🗑️  Message deleted successfully (For ${deleteForEveryone ? 'everyone' : 'me'})`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error deleting message:`, error.message);
      throw error;
    }
  }

  /**
   * Add emoji reaction to message
   * @param {Message} message - WhatsApp message object
   * @param {string} emoji - Emoji string (❤️, 😂, 😮, 😢, 🙏, 🔥)
   * @returns {Promise<boolean>} Success status
   */
  async addReaction(message, emoji) {
    try {
      if (!message || !message.react) {
        throw new Error("Message object doesn't support reactions");
      }

      // Validate emoji (whatsapp-web.js supports: ❤️, 😂, 😮, 😢, 🙏, 🔥)
      const supportedEmojis = ['❤️', '😂', '😮', '😢', '🙏', '🔥'];
      if (!supportedEmojis.includes(emoji)) {
        throw new Error(`Emoji "${emoji}" not supported. Use: ${supportedEmojis.join(', ')}`);
      }

      await message.react(emoji);
      this.logger.log(`😊 Reaction added: ${emoji}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error adding reaction:`, error.message);
      throw error;
    }
  }

  /**
   * Get all reactions on a message
   * @param {Message} message - WhatsApp message object
   * @returns {Promise<Array>} Array of reaction objects
   */
  async getReactions(message) {
    try {
      if (!message) {
        throw new Error("Message object is required");
      }

      // If message has reactions built-in (v1.34.6+)
      if (message.getReactions && typeof message.getReactions === 'function') {
        const reactions = await message.getReactions();
        this.logger.log(`📊 Found ${reactions?.length || 0} reactions`);
        return reactions || [];
      }

      // Fallback: check if reactions are in message object
      if (message.reactions) {
        this.logger.log(`📊 Found ${message.reactions.length} reactions`);
        return message.reactions;
      }

      this.logger.log(`📊 No reactions found on message`);
      return [];
    } catch (error) {
      this.logger.error(`❌ Error getting reactions:`, error.message);
      throw error;
    }
  }

  /**
   * Forward message to another chat
   * @param {Message} message - WhatsApp message object
   * @param {Chat} targetChat - Target chat object
   * @returns {Promise<Message>} Forwarded message
   */
  async forwardMessage(message, targetChat) {
    try {
      if (!message || !message.forward) {
        throw new Error("Message object doesn't support forwarding");
      }

      if (!targetChat) {
        throw new Error("Target chat is required for forwarding");
      }

      await message.forward(targetChat);
      this.logger.log(`➡️  Message forwarded successfully`);
      return message;
    } catch (error) {
      this.logger.error(`❌ Error forwarding message:`, error.message);
      throw error;
    }
  }

  /**
   * Get quoted/replied message content
   * @param {Message} message - WhatsApp message object
   * @returns {Promise<Message>} Quoted message object
   */
  async getQuotedMessage(message) {
    try {
      if (!message) {
        throw new Error("Message object is required");
      }

      // Check if message is a reply
      if (!message.hasQuotedMsg) {
        this.logger.log(`ℹ️  Message is not a reply`);
        return null;
      }

      if (!message.getQuotedMessage) {
        throw new Error("Reply quote extraction not supported");
      }

      const quotedMsg = await message.getQuotedMessage();
      this.logger.log(`💬 Quoted message retrieved:`, {
        from: quotedMsg.from,
        body: quotedMsg.body?.substring(0, 50) + '...',
        timestamp: quotedMsg.timestamp,
      });
      return quotedMsg;
    } catch (error) {
      this.logger.error(`❌ Error getting quoted message:`, error.message);
      throw error;
    }
  }

  /**
   * Pin a message in chat
   * @param {Message} message - WhatsApp message object
   * @param {number} duration - Duration in seconds (0 = permanent)
   * @returns {Promise<boolean>} Success status
   */
  async pinMessage(message, duration = 0) {
    try {
      if (!message || !message.pin) {
        throw new Error("Message object doesn't support pinning");
      }

      await message.pin(duration);
      this.logger.log(`📌 Message pinned (Duration: ${duration || 'permanent'})`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error pinning message:`, error.message);
      throw error;
    }
  }

  /**
   * Unpin a message
   * @param {Message} message - WhatsApp message object
   * @returns {Promise<boolean>} Success status
   */
  async unpinMessage(message) {
    try {
      if (!message || !message.unpin) {
        throw new Error("Message object doesn't support unpinning");
      }

      await message.unpin();
      this.logger.log(`📍 Message unpinned`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error unpinning message:`, error.message);
      throw error;
    }
  }

  /**
   * Star/bookmark a message
   * @param {Message} message - WhatsApp message object
   * @returns {Promise<boolean>} Success status
   */
  async starMessage(message) {
    try {
      if (!message || !message.star) {
        throw new Error("Message object doesn't support starring");
      }

      await message.star();
      this.logger.log(`⭐ Message starred`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error starring message:`, error.message);
      throw error;
    }
  }

  /**
   * Unstar/unbookmark a message
   * @param {Message} message - WhatsApp message object
   * @returns {Promise<boolean>} Success status
   */
  async unstarMessage(message) {
    try {
      if (!message || !message.unstar) {
        throw new Error("Message object doesn't support unstarring");
      }

      await message.unstar();
      this.logger.log(`✨ Message unstarred`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error unstarring message:`, error.message);
      throw error;
    }
  }

  /**
   * Get all mentioned users in message
   * @param {Message} message - WhatsApp message object
   * @returns {Array} Array of mentioned user IDs
   */
  getMentions(message) {
    try {
      if (!message) {
        throw new Error("Message object is required");
      }

      const mentions = message.mentionedIds || [];
      this.logger.log(`👥 Found ${mentions.length} mentions`);
      return mentions;
    } catch (error) {
      this.logger.error(`❌ Error getting mentions:`, error.message);
      return [];
    }
  }

  /**
   * Check if message has media
   * @param {Message} message - WhatsApp message object
   * @returns {boolean} Has media status
   */
  hasMedia(message) {
    return message?.hasMedia || false;
  }

  /**
   * Get message metadata/info
   * @param {Message} message - WhatsApp message object
   * @returns {Object} Message metadata
   */
  getMessageInfo(message) {
    try {
      return {
        id: message.id?.id || 'unknown',
        from: message.from,
        to: message.to,
        body: message.body?.substring(0, 100),
        timestamp: message.timestamp,
        isForwarded: message.isForwarded,
        forwardingScore: message.forwardingScore,
        isStarred: message.isStarred,
        hasMedia: message.hasMedia,
        hasQuotedMsg: message.hasQuotedMsg,
        mentionedIds: message.mentionedIds || [],
        type: message.type,
      };
    } catch (error) {
      this.logger.error(`❌ Error getting message info:`, error.message);
      return null;
    }
  }
}

// Export singleton instance
let instance = null;
export function getMessageEnhancementService() {
  if (!instance) {
    instance = new MessageEnhancementService();
  }
  return instance;
}

export default MessageEnhancementService;
