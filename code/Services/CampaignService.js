import { Campaign, DailyLimit, CampaignMessageLog } from '../Database/CampaignSchema.js';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger.js';

const logger = new Logger('CampaignService');

/**
 * CampaignService - Main orchestration for campaign management
 * Handles:
 * - Campaign CRUD operations
 * - Daily limit tracking
 * - Contact target management
 * - Campaign statistics
 */
class CampaignService {
  
  /**
   * Create a new campaign
   */
  async createCampaign(campaignConfig) {
    try {
      logger.info(`Creating campaign: ${campaignConfig.name}`);
      
      // Validate required fields
      if (!campaignConfig.campaignId || !campaignConfig.name || !campaignConfig.messageTemplate) {
        throw new Error('Missing required fields: campaignId, name, messageTemplate');
      }
      
      const campaign = new Campaign({
        ...campaignConfig,
        createdAt: new Date(),
        updatedAt: new Date(),
        stats: {
          totalContacts: 0,
          sentCount: 0,
          failedCount: 0,
          deliveredCount: 0,
          readCount: 0,
          skippedCount: 0
        }
      });
      
      await campaign.save();
      logger.info(`Campaign created successfully: ${campaignConfig.campaignId}`);
      
      return {
        success: true,
        campaign
      };
    } catch (error) {
      logger.error(`Failed to create campaign: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get campaign by ID
   */
  async getCampaignById(campaignId) {
    try {
      const campaign = await Campaign.findOne({ campaignId });
      
      if (!campaign) {
        return { success: false, error: 'Campaign not found' };
      }
      
      return { success: true, campaign };
    } catch (error) {
      logger.error(`Failed to get campaign: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * List all campaigns with optional filtering
   */
  async listCampaigns(filters = {}) {
    try {
      const query = {};
      
      if (filters.status) query.status = filters.status;
      if (filters.enabled !== undefined) query['schedule.enabled'] = filters.enabled;
      
      const campaigns = await Campaign.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 100);
      
      return { success: true, campaigns, count: campaigns.length };
    } catch (error) {
      logger.error(`Failed to list campaigns: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Update campaign configuration
   */
  async updateCampaign(campaignId, updates) {
    try {
      const campaign = await Campaign.findOneAndUpdate(
        { campaignId },
        { $set: { ...updates, updatedAt: new Date() } },
        { new: true }
      );
      
      if (!campaign) {
        return { success: false, error: 'Campaign not found' };
      }
      
      logger.info(`Campaign updated: ${campaignId}`);
      return { success: true, campaign };
    } catch (error) {
      logger.error(`Failed to update campaign: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId) {
    try {
      const result = await Campaign.deleteOne({ campaignId });
      
      if (result.deletedCount === 0) {
        return { success: false, error: 'Campaign not found' };
      }
      
      logger.info(`Campaign deleted: ${campaignId}`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to delete campaign: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get or create daily limit tracker for a campaign
   */
  async getOrCreateDailyLimit(campaignId, accountNumber) {
    try {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      
      let dailyLimit = await DailyLimit.findOne({
        campaignId,
        accountNumber,
        date: today
      });
      
      if (!dailyLimit) {
        // Create new daily limit tracker
        const resetTime = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        
        dailyLimit = new DailyLimit({
          campaignId,
          accountNumber,
          date: today,
          sentCount: 0,
          failedCount: 0,
          failedQueue: [],
          resetAt: resetTime
        });
        
        await dailyLimit.save();
        logger.debug(`Created daily limit tracker for ${campaignId} on ${accountNumber}`);
      }
      
      return { success: true, dailyLimit };
    } catch (error) {
      logger.error(`Failed to get/create daily limit: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Check if campaign can send another message today
   */
  async canSendMessage(campaignId, accountNumber, messagesPerDay) {
    try {
      const result = await this.getOrCreateDailyLimit(campaignId, accountNumber);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      const dailyLimit = result.dailyLimit;
      const canSend = dailyLimit.sentCount < messagesPerDay;
      const remaining = messagesPerDay - dailyLimit.sentCount;
      
      return {
        success: true,
        canSend,
        sentToday: dailyLimit.sentCount,
        remaining: Math.max(0, remaining),
        dailyLimit: messagesPerDay
      };
    } catch (error) {
      logger.error(`Failed to check send permission: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Record a message as sent
   */
  async recordMessageSent(campaignId, contactPhone, contactName, messageText, agentPhone = null) {
    try {
      if (!campaignId || !contactPhone || !messageText) {
        throw new Error('Missing required fields: campaignId, contactPhone, messageText');
      }
      
      // Create message log entry
      const messageId = uuidv4();
      const messageLog = new CampaignMessageLog({
        messageId,
        campaignId,
        contactPhone,
        contactName,
        messageText,
        agentPhone,
        status: 'sent',
        sentAt: new Date(),
        createdAt: new Date()
      });
      
      await messageLog.save();
      
      // Increment campaign sent count
      await Campaign.updateOne(
        { campaignId },
        { 
          $inc: { 'stats.sentCount': 1 },
          updatedAt: new Date()
        }
      );
      
      // Update daily limit
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      
      await DailyLimit.updateOne(
        { campaignId, contactPhone, date: today },
        {
          $inc: { sentCount: 1 },
          $set: { updatedAt: new Date() }
        }
      );
      
      return { success: true, messageId, messageLog };
    } catch (error) {
      logger.error(`Failed to record sent message: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Record a message as failed for retry
   */
  async recordMessageFailed(campaignId, accountNumber, contactPhone, contactName, messageText, failureReason) {
    try {
      if (!campaignId || !contactPhone) {
        throw new Error('Missing required fields');
      }
      
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      
      // Add to failed queue for next day retry
      await DailyLimit.updateOne(
        { campaignId, accountNumber, date: today },
        {
          $push: {
            failedQueue: {
              contactPhone,
              contactName,
              messageText,
              failedAt: new Date(),
              failureReason,
              retryCount: 0
            }
          },
          $inc: { failedCount: 1 }
        },
        { upsert: true }
      );
      
      // Also update campaign stats
      await Campaign.updateOne(
        { campaignId },
        { 
          $inc: { 'stats.failedCount': 1 },
          updatedAt: new Date()
        }
      );
      
      return { success: true };
    } catch (error) {
      logger.error(`Failed to record failed message: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get failed messages from previous day for retry
   */
  async getFailedMessagesForRetry(campaignId, accountNumber) {
    try {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      
      const dailyLimit = await DailyLimit.findOne({
        campaignId,
        accountNumber,
        date: yesterday
      });
      
      if (!dailyLimit || !dailyLimit.failedQueue) {
        return { success: true, failedMessages: [] };
      }
      
      return {
        success: true,
        failedMessages: dailyLimit.failedQueue || []
      };
    } catch (error) {
      logger.error(`Failed to get retry messages: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId) {
    try {
      const campaign = await Campaign.findOne({ campaignId });
      
      if (!campaign) {
        return { success: false, error: 'Campaign not found' };
      }
      
      // Get message logs for additional analytics
      const messageLogs = await CampaignMessageLog.find({ campaignId });
      const deliveredCount = messageLogs.filter(m => m.status === 'delivered').length;
      const readCount = messageLogs.filter(m => m.status === 'read').length;
      const failedCount = messageLogs.filter(m => m.status === 'failed').length;
      
      return {
        success: true,
        stats: {
          campaignId,
          name: campaign.name,
          status: campaign.status,
          totalContacts: campaign.stats.totalContacts,
          sentCount: campaign.stats.sentCount,
          deliveredCount,
          readCount,
          failedCount,
          skippedCount: campaign.stats.skippedCount,
          successRate: campaign.getSuccessRate(),
          createdAt: campaign.createdAt,
          lastExecutionAt: campaign.stats.lastExecutionAt,
          nextExecutionAt: campaign.stats.nextExecutionAt
        }
      };
    } catch (error) {
      logger.error(`Failed to get campaign stats: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get daily statistics for a campaign
   */
  async getDailyStats(campaignId, accountNumber) {
    try {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      
      const dailyLimit = await DailyLimit.findOne({
        campaignId,
        accountNumber,
        date: today
      });
      
      if (!dailyLimit) {
        return {
          success: true,
          dailyStats: {
            campaignId,
            accountNumber,
            date: today,
            sentCount: 0,
            failedCount: 0,
            remainingQuota: 0,
            failedQueue: []
          }
        };
      }
      
      return {
        success: true,
        dailyStats: {
          campaignId,
          accountNumber,
          date: today,
          sentCount: dailyLimit.sentCount,
          failedCount: dailyLimit.failedCount,
          remainingQuota: dailyLimit.getRemainingQuota(10), // Default 10/day
          failedQueue: dailyLimit.failedQueue || [],
          executionStarted: dailyLimit.executionStarted,
          executionCompleted: dailyLimit.executionCompleted,
          resetAt: dailyLimit.resetAt
        }
      };
    } catch (error) {
      logger.error(`Failed to get daily stats: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Reset daily counters (called at midnight)
   */
  async resetDailyCounters() {
    try {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      
      const result = await DailyLimit.updateMany(
        { resetAt: { $lte: new Date() } },
        {
          $set: {
            date: today,
            sentCount: 0,
            failedCount: 0,
            resetAt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
            updatedAt: new Date()
          }
        }
      );
      
      logger.info(`Daily counters reset for ${result.modifiedCount} records`);
      
      return { success: true, resetCount: result.modifiedCount };
    } catch (error) {
      logger.error(`Failed to reset daily counters: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

export default CampaignService;
