import cron from 'node-cron';
import campaignService from '../Services/CampaignService.js';
import campaignRateLimiter from '../Services/CampaignRateLimiter.js';
import campaignExecutor from '../Services/CampaignExecutor.js';
import { Logger } from './logger.js';

const logger = new Logger('CampaignScheduler');

/**
 * CampaignScheduler - Manages scheduled campaign execution
 * 
 * Features:
 * - Cron-based scheduling
 * - Automatic daily limit reset at midnight
 * - Campaign status tracking
 * - Error handling & notifications
 */
class CampaignScheduler {
  
  constructor() {
    this.scheduledTasks = new Map();      // Maps campaignId -> cron task
    this.executingCampaigns = new Set();  // Currently executing campaigns
  }
  
  /**
   * Initialize scheduler
   * Loads all active campaigns and schedules them
   */
  async initialize() {
    try {
      logger.info('Initializing Campaign Scheduler...');
      
      // Schedule daily limit reset at midnight UTC
      this.scheduleDailyReset();
      
      // Load and schedule all active campaigns
      const campaignResult = await campaignService.listCampaigns({
        status: 'active',
        enabled: true
      });
      
      if (campaignResult.success && campaignResult.campaigns.length > 0) {
        logger.info(`Found ${campaignResult.campaigns.length} active campaigns`);
        
        for (const campaign of campaignResult.campaigns) {
          await this.scheduleCampaign(campaign);
        }
      } else {
        logger.info('No active campaigns to schedule');
      }
      
      logger.info('Campaign Scheduler initialized');
      
      return { success: true };
    } catch (error) {
      logger.error(`Failed to initialize Campaign Scheduler: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Schedule a campaign for recurring execution
   */
  async scheduleCampaign(campaign) {
    try {
      const { campaignId, name, schedule } = campaign;
      
      if (!schedule || !schedule.enabled) {
        logger.debug(`Campaign ${campaignId} is not enabled for scheduling`);
        return { success: false };
      }
      
      // Cancel existing schedule if it exists
      if (this.scheduledTasks.has(campaignId)) {
        this.unscheduleCampaign(campaignId);
      }
      
      // Build cron expression
      let cronExpression = schedule.cronExpression;
      
      if (!cronExpression) {
        // Generate from sendTime
        const [hours, minutes] = schedule.sendTime.split(':').map(Number);
        cronExpression = `${minutes} ${hours} * * *`; // Every day at specified time
      }
      
      // Validate cron expression
      if (!cron.validate(cronExpression)) {
        throw new Error(`Invalid cron expression: ${cronExpression}`);
      }
      
      logger.info(`Scheduling campaign "${name}" (${campaignId}) with cron: "${cronExpression}"`);
      
      // Create cron task
      const task = cron.schedule(cronExpression, async () => {
        await this._executeCampaignIfReady(campaign);
      }, {
        scheduled: true,
        timezone: schedule.timezone || 'Asia/Dubai'
      });
      
      // Store task
      this.scheduledTasks.set(campaignId, {
        task,
        campaign,
        cronExpression,
        createdAt: new Date()
      });
      
      logger.info(`Campaign "${name}" scheduled successfully`);
      
      return { success: true };
    } catch (error) {
      logger.error(`Failed to schedule campaign: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Unschedule a campaign
   */
  unscheduleCampaign(campaignId) {
    try {
      const scheduled = this.scheduledTasks.get(campaignId);
      
      if (!scheduled) {
        return { success: false, error: 'Campaign not scheduled' };
      }
      
      // Stop cron task
      scheduled.task.stop();
      scheduled.task.destroy();
      
      // Remove from map
      this.scheduledTasks.delete(campaignId);
      
      logger.info(`Campaign ${campaignId} unscheduled`);
      
      return { success: true };
    } catch (error) {
      logger.error(`Failed to unschedule campaign: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Execute campaign if conditions are met
   * @private
   */
  async _executeCampaignIfReady(campaign) {
    try {
      const { campaignId, name, limits } = campaign;
      
      // Prevent concurrent execution of same campaign
      if (this.executingCampaigns.has(campaignId)) {
        logger.warn(`Campaign "${name}" is already executing, skipping scheduled run`);
        return;
      }
      
      // Get first agent (TODO: make configurable)
      const { SelectingBotForCampaign } = await import('../WhatsAppBot/SelectingBotForCampaign.js');
      const agent = await SelectingBotForCampaign(0);
      
      if (!agent) {
        logger.error(`No agents available for campaign "${name}"`);
        return;
      }
      
      this.executingCampaigns.add(campaignId);
      
      try {
        logger.info(`Executing scheduled campaign: "${name}" (${campaignId})`);
        
        const results = await campaignExecutor.executeCampaign(
          campaignId,
          agent.authStrategy?.clientId || 'unknown',
          limits?.messagesPerDay || 10,
          [agent]
        );
        
        logger.info(`Campaign execution completed: ${results.successCount} sent, ${results.failureCount} failed`);
        
        // Update campaign stats
        await campaignService.updateCampaign(campaignId, {
          'stats.lastExecutionAt': new Date(),
          'stats.nextExecutionAt': this._getNextExecutionTime(campaign)
        });
        
      } finally {
        this.executingCampaigns.delete(campaignId);
      }
      
    } catch (error) {
      logger.error(`Failed to execute scheduled campaign: ${error.message}`);
    }
  }
  
  /**
   * Calculate next execution time
   * @private
   */
  _getNextExecutionTime(campaign) {
    try {
      const { schedule } = campaign;
      const [hours, minutes] = schedule.sendTime.split(':').map(Number);
      
      const nextRun = new Date();
      nextRun.setHours(hours, minutes, 0, 0);
      
      // If time has passed, schedule for tomorrow
      if (nextRun <= new Date()) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      
      return nextRun;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Schedule daily limit reset at midnight UTC
   */
  scheduleDailyReset() {
    try {
      logger.info('Scheduling daily limit reset at midnight UTC');
      
      // Run at 00:00 UTC every day
      const resetTask = cron.schedule('0 0 * * *', async () => {
        try {
          logger.info('Running daily limit reset...');
          const result = await campaignRateLimiter.resetDaily();
          
          if (result.success) {
            logger.info(`Daily reset completed: ${result.resetCount} records reset`);
          } else {
            logger.error(`Daily reset failed: ${result.error}`);
          }
        } catch (error) {
          logger.error(`Daily reset error: ${error.message}`);
        }
      }, {
        scheduled: true,
        timezone: 'UTC'
      });
      
      this.scheduledTasks.set('_daily_reset', {
        task: resetTask,
        type: 'system',
        description: 'Daily limit reset'
      });
      
    } catch (error) {
      logger.error(`Failed to schedule daily reset: ${error.message}`);
    }
  }
  
  /**
   * Execute a campaign immediately (bypass schedule)
   */
  async executeCampaignNow(campaignId, agents = []) {
    try {
      const campaignResult = await campaignService.getCampaignById(campaignId);
      
      if (!campaignResult.success) {
        return { success: false, error: 'Campaign not found' };
      }
      
      const campaign = campaignResult.campaign;
      
      if (!agents || agents.length === 0) {
        const { SelectingBotForCampaign } = await import('../WhatsAppBot/SelectingBotForCampaign.js');
        const agent = await SelectingBotForCampaign(0);
        
        if (!agent) {
          return { success: false, error: 'No agents available' };
        }
        
        agents = [agent];
      }
      
      logger.info(`Executing campaign immediately: ${campaign.name}`);
      
      const results = await campaignExecutor.executeCampaign(
        campaignId,
        agents[0].authStrategy?.clientId || 'unknown',
        campaign.limits?.messagesPerDay || 10,
        agents
      );
      
      return { success: true, results };
    } catch (error) {
      logger.error(`Failed to execute campaign: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * List all scheduled campaigns
   */
  listScheduled() {
    const scheduled = [];
    
    for (const [campaignId, taskInfo] of this.scheduledTasks) {
      if (taskInfo.campaign) {
        scheduled.push({
          campaignId,
          name: taskInfo.campaign.name,
          cronExpression: taskInfo.cronExpression,
          timezone: taskInfo.campaign.schedule?.timezone || 'UTC',
          enabled: taskInfo.campaign.schedule?.enabled,
          createdAt: taskInfo.createdAt
        });
      }
    }
    
    return scheduled;
  }
  
  /**
   * Get execution status
   */
  getStatus() {
    return {
      totalScheduled: this.scheduledTasks.size,
      executing: Array.from(this.executingCampaigns),
      executingCount: this.executingCampaigns.size,
      scheduled: this.listScheduled()
    };
  }
  
  /**
   * Stop all campaigns
   */
  stopAll() {
    let stoppedCount = 0;
    
    for (const [campaignId, taskInfo] of this.scheduledTasks) {
      try {
        taskInfo.task.stop();
        taskInfo.task.destroy();
        stoppedCount++;
      } catch (error) {
        logger.error(`Error stopping ${campaignId}: ${error.message}`);
      }
    }
    
    this.scheduledTasks.clear();
    logger.info(`Stopped ${stoppedCount} scheduled tasks`);
    
    return { success: true, stoppedCount };
  }
}

export default new CampaignScheduler();
