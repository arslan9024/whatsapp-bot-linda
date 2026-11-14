// @ts-nocheck
/**
 * ==========================================
 * CHAT ORGANIZATION SERVICE (Phase 1)
 * ==========================================
 * 
 * Handles chat management:
 * - Pin/unpin chats
 * - Archive/unarchive chats
 * - Mute/unmute notifications
 * - Delete chats
 * - Mark as unread
 * - Add labels/tags
 * 
 * Author: WhatsApp Bot Linda
 * Date: February 11, 2026
 */

class ChatOrganizationService {
  constructor(mongoDb = null) {
    this.db = mongoDb;
    this.logger = console;
    this.chatSettingsCollection = 'chatSettings';
  }

  /**
   * Pin chat to top
   * @param {Chat} chat - Chat object
   * @returns {Promise<boolean>} Success status
   */
  async pinChat(chat) {
    try {
      if (!chat || !chat.pin) {
        throw new Error("Valid chat object required");
      }

      await chat.pin();
      this.logger.log(`📌 Chat pinned to top`);

      // Store in database
      if (this.db) {
        await this._saveChatSetting(chat.id, { pinned: true });
      }

      return true;
    } catch (error) {
      this.logger.error(`❌ Error pinning chat:`, error.message);
      throw error;
    }
  }

  /**
   * Unpin chat
   * @param {Chat} chat - Chat object
   * @returns {Promise<boolean>} Success status
   */
  async unpinChat(chat) {
    try {
      if (!chat || !chat.unpin) {
        throw new Error("Valid chat object required");
      }

      await chat.unpin();
      this.logger.log(`📍 Chat unpinned`);

      if (this.db) {
        await this._saveChatSetting(chat.id, { pinned: false });
      }

      return true;
    } catch (error) {
      this.logger.error(`❌ Error unpinning chat:`, error.message);
      throw error;
    }
  }

  /**
   * Archive chat
   * @param {Chat} chat - Chat object
   * @returns {Promise<boolean>} Success status
   */
  async archiveChat(chat) {
    try {
      if (!chat || !chat.archive) {
        throw new Error("Valid chat object required");
      }

      await chat.archive();
      this.logger.log(`📦 Chat archived`);

      if (this.db) {
        await this._saveChatSetting(chat.id, { archived: true });
      }

      return true;
    } catch (error) {
      this.logger.error(`❌ Error archiving chat:`, error.message);
      throw error;
    }
  }

  /**
   * Unarchive chat
   * @param {Chat} chat - Chat object
   * @returns {Promise<boolean>} Success status
   */
  async unarchiveChat(chat) {
    try {
      if (!chat || !chat.unarchive) {
        throw new Error("Valid chat object required");
      }

      await chat.unarchive();
      this.logger.log(`📂 Chat unarchived`);

      if (this.db) {
        await this._saveChatSetting(chat.id, { archived: false });
      }

      return true;
    } catch (error) {
      this.logger.error(`❌ Error unarchiving chat:`, error.message);
      throw error;
    }
  }

  /**
   * Mute chat notifications
   * @param {Chat} chat - Chat object
   * @param {number} duration - Mute duration in seconds (0 = indefinite)
   * @returns {Promise<boolean>} Success status
   */
  async muteChat(chat, duration = 0) {
    try {
      if (!chat || !chat.mute) {
        throw new Error("Valid chat object required");
      }

      await chat.mute(duration);
      const durationText = duration === 0 ? 'indefinitely' : `for ${duration}s`;
      this.logger.log(`🔇 Chat muted ${durationText}`);

      if (this.db) {
        await this._saveChatSetting(chat.id, {
          muted: true,
          mutedUntil: duration === 0 ? null : new Date(Date.now() + duration * 1000),
        });
      }

      return true;
    } catch (error) {
      this.logger.error(`❌ Error muting chat:`, error.message);
      throw error;
    }
  }

  /**
   * Unmute chat
   * @param {Chat} chat - Chat object
   * @returns {Promise<boolean>} Success status
   */
  async unmuteChat(chat) {
    try {
      if (!chat || !chat.unmute) {
        throw new Error("Valid chat object required");
      }

      await chat.unmute();
      this.logger.log(`🔊 Chat unmuted`);

      if (this.db) {
        await this._saveChatSetting(chat.id, { muted: false });
      }

      return true;
    } catch (error) {
      this.logger.error(`❌ Error unmuting chat:`, error.message);
      throw error;
    }
  }

  /**
   * Mark chat as unread
   * @param {Chat} chat - Chat object
   * @returns {Promise<boolean>} Success status
   */
  async markUnread(chat) {
    try {
      if (!chat || !chat.markUnread) {
        throw new Error("Valid chat object required");
      }

      await chat.markUnread();
      this.logger.log(`📨 Chat marked as unread`);

      return true;
    } catch (error) {
      this.logger.error(`❌ Error marking chat as unread:`, error.message);
      throw error;
    }
  }

  /**
   * Delete entire chat
   * @param {Chat} chat - Chat object
   * @returns {Promise<boolean>} Success status
   */
  async deleteChat(chat) {
    try {
      if (!chat || !chat.delete) {
        throw new Error("Valid chat object required");
      }

      await chat.delete();
      this.logger.log(`🗑️  Chat deleted`);

      return true;
    } catch (error) {
      this.logger.error(`❌ Error deleting chat:`, error.message);
      throw error;
    }
  }

  /**
   * Clear all messages in chat
   * @param {Chat} chat - Chat object
   * @returns {Promise<boolean>} Success status
   */
  async clearChat(chat) {
    try {
      if (!chat || !chat.clearMessages) {
        throw new Error("Valid chat object required");
      }

      await chat.clearMessages();
      this.logger.log(`🧹 Chat messages cleared`);

      return true;
    } catch (error) {
      this.logger.error(`❌ Error clearing chat:`, error.message);
      throw error;
    }
  }

  /**
   * Send seen receipt to chat
   * @param {Chat} chat - Chat object
   * @returns {Promise<boolean>} Success status
   */
  async markChatSeen(chat) {
    try {
      if (!chat || !chat.sendSeen) {
        throw new Error("Valid chat object required");
      }

      await chat.sendSeen();
      this.logger.log(`✓ Chat marked as seen`);

      return true;
    } catch (error) {
      this.logger.error(`❌ Error marking chat as seen:`, error.message);
      throw error;
    }
  }

  /**
   * Add label/tag to chat
   * @param {Chat} chat - Chat object
   * @param {string} label - Label name
   * @returns {Promise<boolean>} Success status
   */
  async addLabel(chat, label) {
    try {
      if (!chat || !label) {
        throw new Error("Chat and label are required");
      }

      if (this.db) {
        const setting = await this._getChatSetting(chat.id);
        const labels = setting?.labels || [];

        if (!labels.includes(label)) {
          labels.push(label);
          await this._saveChatSetting(chat.id, { labels });
          this.logger.log(`🏷️  Label "${label}" added to chat`);
        }
      }

      return true;
    } catch (error) {
      this.logger.error(`❌ Error adding label:`, error.message);
      throw error;
    }
  }

  /**
   * Remove label/tag from chat
   * @param {Chat} chat - Chat object
   * @param {string} label - Label name
   * @returns {Promise<boolean>} Success status
   */
  async removeLabel(chat, label) {
    try {
      if (!chat || !label) {
        throw new Error("Chat and label are required");
      }

      if (this.db) {
        const setting = await this._getChatSetting(chat.id);
        let labels = setting?.labels || [];
        labels = labels.filter((l) => l !== label);

        await this._saveChatSetting(chat.id, { labels });
        this.logger.log(`🏷️  Label "${label}" removed from chat`);
      }

      return true;
    } catch (error) {
      this.logger.error(`❌ Error removing label:`, error.message);
      throw error;
    }
  }

  /**
   * Get all chats for a label
   * @param {string} label - Label name
   * @returns {Promise<Array>} Chats with label
   */
  async getChatsByLabel(label) {
    try {
      if (!this.db || !label) {
        throw new Error("Database and label required");
      }

      const collection = this.db.collection(this.chatSettingsCollection);
      const chats = await collection.find({ labels: label }).toArray();

      this.logger.log(`Found ${chats.length} chats with label "${label}"`);
      return chats;
    } catch (error) {
      this.logger.error(`❌ Error getting chats by label:`, error.message);
      return [];
    }
  }

  /**
   * Get chat settings
   * @param {Chat} chat - Chat object
   * @returns {Promise<Object>} Chat settings
   */
  async getChatSettings(chat) {
    try {
      if (!chat) {
        throw new Error("Chat object required");
      }

      if (!this.db) {
        return null;
      }

      const settings = await this._getChatSetting(chat.id.toString());
      this.logger.log(`📋 Retrieved settings for chat`);
      return settings;
    } catch (error) {
      this.logger.error(`❌ Error getting chat settings:`, error.message);
      return null;
    }
  }

  /**
   * Get all pinned chats
   * @returns {Promise<Array>} Pinned chats
   */
  async getPinnedChats() {
    try {
      if (!this.db) {
        return [];
      }

      const collection = this.db.collection(this.chatSettingsCollection);
      const pinnedChats = await collection.find({ pinned: true }).toArray();

      this.logger.log(`📌 Retrieved ${pinnedChats.length} pinned chats`);
      return pinnedChats;
    } catch (error) {
      this.logger.error(`❌ Error getting pinned chats:`, error.message);
      return [];
    }
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  /**
   * Get chat setting from database
   * @private
   */
  async _getChatSetting(chatId) {
    try {
      if (!this.db) return null;

      const collection = this.db.collection(this.chatSettingsCollection);
      const setting = await collection.findOne({ chatId: chatId.toString() });
      return setting;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save chat setting to database
   * @private
   */
  async _saveChatSetting(chatId, data) {
    try {
      if (!this.db) return;

      const collection = this.db.collection(this.chatSettingsCollection);
      const chatIdStr = chatId.toString();

      await collection.updateOne(
        { chatId: chatIdStr },
        {
          $set: {
            ...data,
            chatId: chatIdStr,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    } catch (error) {
      this.logger.error(`Error saving chat setting:`, error.message);
    }
  }
}

export function getChatOrganizationService(mongoDb = null) {
  return new ChatOrganizationService(mongoDb);
}

export default ChatOrganizationService;
