/**
 * ============================================
 * MESSAGE PERSISTENCE SERVICE (Phase 17)
 * ============================================
 * 
 * Saves WhatsApp messages to MongoDB with automatic retry,
 * deduplication, and graceful fallback to in-memory cache.
 */

import {
  Message,
  Conversation,
  MessageAction,
} from '../Database/MessageSchema.js';
import crypto from 'crypto';

export class MessagePersistenceService {
  constructor() {
    this.batchQueue = [];
    this.maxBatchSize = 50;
    this.flushIntervalMs = 5000;
    this.isConnected = false;
    this.fallbackCache = new Map();
    this.maxCacheSize = 10000;
    this.retryAttempts = 3;
    this.retryDelayMs = 1000;
  }

  /**
   * Initialize persistence service
   */
  async initialize() {
    try {
      if (global.mongooseConnection && global.mongooseConnection.readyState === 1) {
        this.isConnected = true;
        console.log('✅ MessagePersistenceService initialized (MongoDB connected)');
      } else {
        console.warn('⚠️ MessagePersistenceService: MongoDB not available, using fallback cache');
      }
      
      this.startBatchFlush();
      return true;
    } catch (error) {
      console.error('❌ MessagePersistenceService init error:', error.message);
      return false;
    }
  }

  /**
   * Save a single message
   */
  async saveMessage(msgObj) {
    try {
      if (!msgObj.messageId || !msgObj.fromNumber || !msgObj.timestamp) {
        console.warn('⚠️ Invalid message object for persistence');
        return { success: false, reason: 'invalid_message' };
      }

      if (this.isConnected) {
        this.batchQueue.push(msgObj);
        
        if (this.batchQueue.length >= this.maxBatchSize) {
          await this.flushBatch();
        }
        
        return { success: true, persisted: 'mongodb' };
      } else {
        const cacheKey = msgObj.fromNumber;
        if (!this.fallbackCache.has(cacheKey)) {
          this.fallbackCache.set(cacheKey, []);
        }
        this.fallbackCache.get(cacheKey).push(msgObj);
        
        if (this.fallbackCache.size > this.maxCacheSize) {
          await this.pruneFallbackCache();
        }
        
        return { success: true, persisted: 'memory' };
      }
    } catch (error) {
      console.error('❌ Error saving message:', error.message);
      return { success: false, reason: error.message };
    }
  }

  /**
   * Batch insert messages
   */
  async flushBatch() {
    if (this.batchQueue.length === 0) return;

    const messages = [...this.batchQueue];
    this.batchQueue = [];

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const result = await Message.insertMany(messages, { ordered: false });
        console.log(`✅ Batch persisted: ${result.length} messages`);
        
        await this.updateConversationMetadata(messages);
        return true;
      } catch (error) {
        if (attempt < this.retryAttempts - 1) {
          console.warn(`⚠️ Batch save attempt ${attempt + 1} failed, retrying...`);
          await this.sleep(this.retryDelayMs * (attempt + 1));
        } else {
          console.error('❌ Batch save failed after retries:', error.message);
          this.batchQueue.push(...messages);
          return false;
        }
      }
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(phoneNumber, limit = 100) {
    try {
      if (this.isConnected) {
        const messages = await Message.find({
          fromNumber: phoneNumber,
        })
          .sort({ timestamp: -1 })
          .limit(limit)
          .lean();
        return messages.reverse();
      } else {
        const cached = this.fallbackCache.get(phoneNumber) || [];
        return cached.slice(-limit).reverse();
      }
    } catch (error) {
      console.error('❌ Error fetching conversation history:', error.message);
      return [];
    }
  }

  /**
   * Query messages by criteria
   */
  async queryMessages(criteria, options = {}) {
    try {
      if (!this.isConnected) {
        console.warn('⚠️ MongoDB not available, cannot query');
        return [];
      }

      const limit = options.limit || 100;
      const skip = options.skip || 0;

      const query = Message.find(criteria)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      return await query.exec();
    } catch (error) {
      console.error('❌ Query error:', error.message);
      return [];
    }
  }

  /**
   * Update message properties
   */
  async updateMessage(messageId, updates) {
    try {
      if (!this.isConnected) {
        console.warn('⚠️ MongoDB not available, cannot update');
        return false;
      }

      const result = await Message.updateOne(
        { messageId },
        { $set: { ...updates, updatedAt: new Date() } }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      console.error('❌ Update message error:', error.message);
      return false;
    }
  }

  /**
   * Save message action (reaction, edit, delete, etc)
   */
  async saveAction(actionObj) {
    try {
      if (!this.isConnected) {
        console.warn('⚠️ MongoDB not available, cannot save action');
        return false;
      }

      const action = new MessageAction(actionObj);
      await action.save();
      
      return true;
    } catch (error) {
      console.error('❌ Error saving action:', error.message);
      return false;
    }
  }

  /**
   * Get actions for a message
   */
  async getMessageActions(messageId) {
    try {
      if (!this.isConnected) return [];

      return await MessageAction.find({
        messageId,
      }).sort({ timestamp: -1 }).lean();
    } catch (error) {
      console.error('❌ Error fetching actions:', error.message);
      return [];
    }
  }

  /**
   * Start automatic batch flush interval
   */
  startBatchFlush() {
    setInterval(async () => {
      if (this.batchQueue.length > 0) {
        await this.flushBatch();
      }
    }, this.flushIntervalMs);
  }

  /**
   * Update conversation metadata based on messages
   */
  async updateConversationMetadata(messages) {
    try {
      if (!this.isConnected) return;

      const convs = new Map();
      messages.forEach(msg => {
        if (!convs.has(msg.conversationId)) {
          convs.set(msg.conversationId, {
            conversationId: msg.conversationId,
            phoneNumber: msg.fromNumber,
            lastMessageAt: msg.timestamp,
            messageCount: 0,
          });
        }
        const conv = convs.get(msg.conversationId);
        conv.messageCount += 1;
      });

      for (const [, convData] of convs) {
        await Conversation.updateOne(
          { conversationId: convData.conversationId },
          {
            $set: {
              lastMessageAt: convData.lastMessageAt,
              updatedAt: new Date(),
            },
            $inc: { messageCount: convData.messageCount },
          },
          { upsert: true }
        );
      }
    } catch (error) {
      console.error('❌ Error updating conversation metadata:', error.message);
    }
  }

  /**
   * Prune fallback cache to prevent memory overflow
   */
  async pruneFallbackCache() {
    try {
      for (const [phoneNumber, messages] of this.fallbackCache) {
        if (messages.length > 5000) {
          this.fallbackCache.set(
            phoneNumber,
            messages.slice(-5000)
          );
        }
      }
      console.log('✅ Fallback cache pruned');
    } catch (error) {
      console.error('❌ Error pruning cache:', error.message);
    }
  }

  /**
   * Get persistence statistics
   */
  getStats() {
    return {
      isConnected: this.isConnected,
      batchQueueSize: this.batchQueue.length,
      fallbackCacheSize: this.fallbackCache.size,
      fallbackMessagesCount: Array.from(this.fallbackCache.values())
        .reduce((sum, msgs) => sum + msgs.length, 0),
    };
  }

  /**
   * Utility: sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const messagePersistenceService = new MessagePersistenceService();
