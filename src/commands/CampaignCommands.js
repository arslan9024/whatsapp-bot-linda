/**
 * Campaign Manager CLI Commands
 * 
 * Commands for creating, managing, and executing bulk messaging campaigns
 * 
 * !create-campaign <name> <filter>     - Create new campaign
 * !start-campaign <campaign-id>        - Start campaign execution
 * !stop-campaign <campaign-id>         - Stop running campaign
 * !list-campaigns                      - List all campaigns with status
 * !campaign-stats <campaign-id>        - Show campaign statistics
 * !campaign-schedule <campaign-id>     - Check schedule for campaign
 * 
 * @since Phase 19 - February 17, 2026
 */

import CampaignService from '../campaigns/CampaignService.js';
import ContactFilterService from '../campaigns/ContactFilterService.js';
import CampaignRateLimiter from '../campaigns/CampaignRateLimiter.js';
import CampaignScheduler from '../campaigns/CampaignScheduler.js';

class CampaignManager {
  constructor(logBot) {
    this.logBot = logBot;
    this.campaignService = null;
    this.contactFilterService = null;
    this.rateLimiter = null;
    this.scheduler = null;
  }

  initialize(deps = {}) {
    this.campaignService = deps.campaignService || new CampaignService();
    this.contactFilterService = deps.contactFilterService || new ContactFilterService();
    this.rateLimiter = deps.rateLimiter || new CampaignRateLimiter();
    this.scheduler = deps.scheduler || CampaignScheduler;
    this.logBot('✅ Campaign Manager initialized', 'success');
  }

  /**
   * Process campaign commands
   */
  async processCommand(command, args, context = {}) {
    try {
      const { client, phoneNumber, isMasterAccount } = context;

      // Only master account can manage campaigns
      if (!isMasterAccount) {
        return {
          processed: true,
          reply: '📢 Campaign commands are master account only.\nPlease use the master account to manage campaigns.'
        };
      }

      switch (command) {
        case 'create-campaign':
          return await this.createCampaign(args, context);

        case 'start-campaign':
          return await this.startCampaign(args[0], context);

        case 'stop-campaign':
          return await this.stopCampaign(args[0], context);

        case 'list-campaigns':
          return await this.listCampaigns(context);

        case 'campaign-stats':
          return await this.getCampaignStats(args[0], context);

        case 'campaign-schedule':
          return await this.getCampaignSchedule(args[0], context);

        default:
          return { processed: false };
      }
    } catch (error) {
      this.logBot(`Campaign command error: ${error.message}`, 'error');
      return {
        processed: true,
        reply: `❌ Campaign error: ${error.message}`
      };
    }
  }

  /**
   * Create a new campaign
   * Usage: !create-campaign D2Security "name:D2" 
   */
  async createCampaign(args, context) {
    const campaignName = args[0];
    const filterExpression = args.slice(1).join(' ') || 'all';

    if (!campaignName) {
      return {
        processed: true,
        reply: `❌ Usage: !create-campaign <name> <filter>
Example: !create-campaign "D2 Security" "name:D2"`
      };
    }

    try {
      // Create campaign in database
      const campaign = await this.campaignService.createCampaign({
        name: campaignName,
        filter: filterExpression,
        dailyLimit: 10,  // Default: 10 messages/day
        status: 'paused',
        createdAt: new Date(),
        createdBy: context.phoneNumber
      });

      this.logBot(`Created campaign: ${campaignName} (${campaign.id})`, 'success');

      return {
        processed: true,
        reply: `✅ Campaign created: ${campaignName}
📋 Campaign ID: ${campaign.id}
🔍 Filter: ${filterExpression}
📊 Daily limit: 10 messages
⏸️ Status: paused

To start: !start-campaign ${campaign.id}`
      };
    } catch (error) {
      return {
        processed: true,
        reply: `❌ Failed to create campaign: ${error.message}`
      };
    }
  }

  /**
   * Start campaign execution
   * Usage: !start-campaign <campaign-id>
   */
  async startCampaign(campaignId, context) {
    if (!campaignId) {
      return {
        processed: true,
        reply: `❌ Usage: !start-campaign <campaign-id>
Example: !start-campaign 507f1f77bcf86cd9`
      };
    }

    try {
      const campaign = await this.campaignService.getCampaign(campaignId);
      if (!campaign) {
        return {
          processed: true,
          reply: `❌ Campaign not found: ${campaignId}`
        };
      }

      // Update campaign status
      await this.campaignService.updateCampaign(campaignId, {
        status: 'running',
        startedAt: new Date()
      });

      // Schedule execution (9 AM daily)
      await this.scheduler.scheduleCampaign(campaignId, campaign);

      this.logBot(`Started campaign: ${campaign.name} (${campaignId})`, 'success');

      return {
        processed: true,
        reply: `✅ Campaign started: ${campaign.name}
🚀 Status: running
⏰ Schedule: 9:00 AM daily
📊 Daily limit: ${campaign.dailyLimit} messages

Use !campaign-stats ${campaignId} to monitor`
      };
    } catch (error) {
      return {
        processed: true,
        reply: `❌ Failed to start campaign: ${error.message}`
      };
    }
  }

  /**
   * Stop campaign execution
   * Usage: !stop-campaign <campaign-id>
   */
  async stopCampaign(campaignId, context) {
    if (!campaignId) {
      return {
        processed: true,
        reply: `❌ Usage: !stop-campaign <campaign-id>`
      };
    }

    try {
      const campaign = await this.campaignService.getCampaign(campaignId);
      if (!campaign) {
        return {
          processed: true,
          reply: `❌ Campaign not found: ${campaignId}`
        };
      }

      // Update campaign status
      await this.campaignService.updateCampaign(campaignId, {
        status: 'paused',
        pausedAt: new Date()
      });

      // Cancel scheduled execution
      await this.scheduler.unscheduleCampaign(campaignId);

      this.logBot(`Stopped campaign: ${campaign.name} (${campaignId})`, 'success');

      return {
        processed: true,
        reply: `⏸️ Campaign paused: ${campaign.name}
✅ Status: paused
📊 Progress saved

To resume: !start-campaign ${campaignId}`
      };
    } catch (error) {
      return {
        processed: true,
        reply: `❌ Failed to stop campaign: ${error.message}`
      };
    }
  }

  /**
   * List all campaigns
   * Usage: !list-campaigns
   */
  async listCampaigns(context) {
    try {
      const campaigns = await this.campaignService.getAllCampaigns();

      if (campaigns.length === 0) {
        return {
          processed: true,
          reply: `📋 No campaigns found.

To create: !create-campaign "Name" "filter"`
        };
      }

      let reply = `📋 *CAMPAIGNS* (${campaigns.length})\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      for (const campaign of campaigns) {
        const icon = campaign.status === 'running' ? '🟢' : 
                    campaign.status === 'paused' ? '⏸️' : '🔴';
        const sent = campaign.totalSent || 0;
        const daily = campaign.dailyLimit || 10;
        
        reply += `${icon} *${campaign.name}*\n`;
        reply += `   ID: ${campaign.id}\n`;
        reply += `   Status: ${campaign.status}\n`;
        reply += `   Today: ${sent}/${daily} messages sent\n`;
        reply += `   Filter: ${campaign.filter || 'all'}\n\n`;
      }

      return {
        processed: true,
        reply
      };
    } catch (error) {
      return {
        processed: true,
        reply: `❌ Failed to list campaigns: ${error.message}`
      };
    }
  }

  /**
   * Get campaign statistics
   * Usage: !campaign-stats <campaign-id>
   */
  async getCampaignStats(campaignId, context) {
    if (!campaignId) {
      return {
        processed: true,
        reply: `❌ Usage: !campaign-stats <campaign-id>`
      };
    }

    try {
      const stats = await this.campaignService.getCampaignStats(campaignId);
      if (!stats) {
        return {
          processed: true,
          reply: `❌ Campaign not found: ${campaignId}`
        };
      }

      const dayPercent = ((stats.sentToday || 0) / (stats.dailyLimit || 10) * 100).toFixed(1);

      return {
        processed: true,
        reply: `📊 *${stats.name}* Statistics
━━━━━━━━━━━━━━━━━━━━━━━━
📈 Status: ${stats.status}
📅 Created: ${new Date(stats.createdAt).toLocaleDateString()}

📤 *Delivery*
   Today: ${stats.sentToday || 0}/${stats.dailyLimit || 10} (${dayPercent}%)
   Total: ${stats.totalSent || 0} messages
   
✅ Success: ${stats.successCount || 0}
❌ Failed: ${stats.failedCount || 0}
🔄 Retrying: ${stats.retryingCount || 0}

📨 Rate: ${stats.messagesPerMinute || 0} msg/min
⏰ Avg Interval: ${stats.avgDelaySeconds || 45}s`
      };
    } catch (error) {
      return {
        processed: true,
        reply: `❌ Failed to get stats: ${error.message}`
      };
    }
  }

  /**
   * Get campaign schedule
   * Usage: !campaign-schedule <campaign-id>
   */
  async getCampaignSchedule(campaignId, context) {
    if (!campaignId) {
      return {
        processed: true,
        reply: `❌ Usage: !campaign-schedule <campaign-id>`
      };
    }

    try {
      const campaign = await this.campaignService.getCampaign(campaignId);
      if (!campaign) {
        return {
          processed: true,
          reply: `❌ Campaign not found: ${campaignId}`
        };
      }

      const schedule = await this.scheduler.getSchedule(campaignId);

      return {
        processed: true,
        reply: `⏰ *${campaign.name}* Schedule
━━━━━━━━━━━━━━━━━━━━━━━━
📅 Status: ${campaign.status}
🕐 Run time: 9:00 AM daily
🔁 Frequency: Every 24 hours
🌍 Timezone: UTC (adjustable)

📊 Rate Limiting
   Daily cap: ${campaign.dailyLimit || 10}/day
   Account cap: 45/day
   Min interval: 30-60s random
   
💾 Message Storage:
   Logs: MongoDB
   Retry: 24 hours
   
${schedule ? `✅ Next run: ${schedule.nextRun || 'Today 9:00 AM'}` : '⏸️ Not scheduled (paused)'}
`
      };
    } catch (error) {
      return {
        processed: true,
        reply: `❌ Failed to get schedule: ${error.message}`
      };
    }
  }
}

// Export both the class and a default instance for backwards compatibility
export { CampaignManager };
export default new CampaignManager();
