import CampaignService from './CampaignService.js';
import { DailyLimit } from '../Database/CampaignSchema.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('CampaignRateLimiter');

/**
 * CampaignRateLimiter - Enforce rate limits for campaigns
 * 
 * WhatsApp Rate Limits:
 * - 45 messages per day per account (hard limit to avoid banning)
 * - Campaign-specific limits (typically 10/day)
 * 
 * This service ensures we never exceed these limits
 */
class CampaignRateLimiter {
  
  // Global rate limit constants
  WHATSAPP_DAILY_LIMIT = 45;          // WhatsApp's hard limit
  CHECK_INTERVAL = 1000;              // Check rate limit every 1 second
  RESET_HOUR_UTC = 0;                 // Reset at midnight UTC
  
  constructor() {
    this.accountLimits = new Map();    // Track per-account limits
    this.campaignLimits = new Map();   // Track per-campaign limits
  }
  
  /**
   * Check if we can send a message for a campaign
   * Returns detailed permission with reasons
   */
  async canSendMessage(campaignId, accountPhone, messagesPerDayLimit = 10) {
    try {
      if (!campaignId || !accountPhone) {
        return {
          allowed: false,
          reason: 'Missing required parameters'
        };
      }
      
      // Check campaign daily limit
      const campaignCheck = await this._checkCampaignLimit(campaignId, accountPhone, messagesPerDayLimit);
      if (!campaignCheck.allowed) {
        return campaignCheck;
      }
      
      // Check account daily limit (WhatsApp global limit)
      const accountCheck = await this._checkAccountLimit(accountPhone);
      if (!accountCheck.allowed) {
        return accountCheck;
      }
      
      return {
        allowed: true,
        reason: 'Message can be sent',
        campaignRemaining: campaignCheck.remaining,
        accountRemaining: accountCheck.remaining,
        nextResetAt: campaignCheck.nextResetAt
      };
    } catch (error) {
      logger.error(`Rate limit check failed: ${error.message}`);
      return {
        allowed: false,
        reason: `Rate limit check failed: ${error.message}`
      };
    }
  }
  
  /**
   * Check campaign-specific daily limit
   * @private
   */
  async _checkCampaignLimit(campaignId, accountPhone, limit) {
    try {
      const result = await CampaignService.getOrCreateDailyLimit(campaignId, accountPhone);
      
      if (!result.success) {
        return {
          allowed: false,
          reason: 'Failed to retrieve daily limit'
        };
      }
      
      const dailyLimit = result.dailyLimit;
      const remaining = limit - dailyLimit.sentCount;
      const allowed = dailyLimit.canSendMessage(limit);
      
      if (!allowed) {
        return {
          allowed: false,
          reason: `Campaign daily limit reached (${dailyLimit.sentCount}/${limit})`,
          sent: dailyLimit.sentCount,
          limit,
          remaining: 0,
          nextResetAt: dailyLimit.resetAt
        };
      }
      
      return {
        allowed: true,
        sent: dailyLimit.sentCount,
        limit,
        remaining,
        nextResetAt: dailyLimit.resetAt
      };
    } catch (error) {
      logger.error(`Campaign limit check failed: ${error.message}`);
      return {
        allowed: false,
        reason: error.message
      };
    }
  }
  
  /**
   * Check account-level WhatsApp limit (45/day)
   * @private
   */
  async _checkAccountLimit(accountPhone) {
    try {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      
      // Get all campaign daily limits for this account today
      const accountLimits = await DailyLimit.find({
        accountNumber: accountPhone,
        date: today
      });
      
      const totalSentToday = accountLimits.reduce((sum, limit) => sum + limit.sentCount, 0);
      const remaining = this.WHATSAPP_DAILY_LIMIT - totalSentToday;
      const allowed = totalSentToday < this.WHATSAPP_DAILY_LIMIT;
      
      if (!allowed) {
        return {
          allowed: false,
          reason: `WhatsApp daily account limit reached (${totalSentToday}/${this.WHATSAPP_DAILY_LIMIT})`,
          sent: totalSentToday,
          limit: this.WHATSAPP_DAILY_LIMIT,
          remaining: 0
        };
      }
      
      return {
        allowed: true,
        sent: totalSentToday,
        limit: this.WHATSAPP_DAILY_LIMIT,
        remaining
      };
    } catch (error) {
      logger.error(`Account limit check failed: ${error.message}`);
      return {
        allowed: false,
        reason: error.message
      };
    }
  }
  
  /**
   * Record a message as sent and increment counters
   */
  async recordSend(campaignId, accountPhone, contactPhone) {
    try {
      const result = await CampaignService.recordMessageSent(
        campaignId,
        contactPhone,
        null,      // contactName (can be fetched later if needed)
        '',        // messageText (recorded separately in executor)
        accountPhone
      );
      
      return result;
    } catch (error) {
      logger.error(`Failed to record send: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get remaining quota for a campaign today
   */
  async getRemainingQuota(campaignId, accountPhone, limit = 10) {
    try {
      const result = await this._checkCampaignLimit(campaignId, accountPhone, limit);
      
      return {
        success: true,
        remaining: result.remaining || 0,
        sent: result.sent || 0,
        limit,
        resetAt: result.nextResetAt
      };
    } catch (error) {
      logger.error(`Failed to get remaining quota: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get account-level statistics
   */
  async getAccountLimitsStats(accountPhone) {
    try {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      
      const limits = await DailyLimit.find({
        accountNumber: accountPhone,
        date: today
      }).lean();
      
      const totalSent = limits.reduce((sum, l) => sum + l.sentCount, 0);
      const totalFailed = limits.reduce((sum, l) => sum + l.failedCount, 0);
      const remaining = this.WHATSAPP_DAILY_LIMIT - totalSent;
      
      return {
        success: true,
        accountPhone,
        date: today,
        totalSent,
        totalFailed,
        remaining,
        limit: this.WHATSAPP_DAILY_LIMIT,
        percentageUsed: (totalSent / this.WHATSAPP_DAILY_LIMIT * 100).toFixed(2),
        campaigns: limits.map(l => ({
          campaignId: l.campaignId,
          sent: l.sentCount,
          failed: l.failedCount
        }))
      };
    } catch (error) {
      logger.error(`Failed to get account stats: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Reset all daily counters (called at midnight)
   * This is an additional safety reset beyond MongoDB TTL
   */
  async resetDaily() {
    try {
      logger.info('Running daily rate limit reset...');
      
      const result = await CampaignService.resetDailyCounters();
      
      if (result.success) {
        logger.info(`Daily reset complete: ${result.resetCount} records reset`);
      }
      
      return result;
    } catch (error) {
      logger.error(`Failed to reset daily limits: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Check if a specific time is within working hours
   * (Helps avoid sending at night or on non-business days)
   */
  isWithinWorkingHours(timezone = 'Asia/Dubai') {
    try {
      const now = new Date();
      
      // Get hour in specific timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false
      });
      
      const hour = parseInt(formatter.format(now));
      
      // Working hours: 8 AM to 6 PM
      const inWorkingHours = hour >= 8 && hour <= 18;
      
      return { inWorkingHours, hour };
    } catch (error) {
      logger.warn(`Failed to check working hours: ${error.message}`);
      return { inWorkingHours: true, hour: -1 }; // Allow if check fails
    }
  }
  
  /**
   * Get next available send time for a campaign
   * Useful for UI notifications
   */
  getNextAvailableSendTime(campaignId, accountPhone, scheduledTime = '09:00') {
    try {
      const now = new Date();
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      
      const nextSend = new Date(now);
      nextSend.setHours(hours, minutes, 0, 0);
      
      // If the time has already passed today, schedule for tomorrow
      if (nextSend <= now) {
        nextSend.setDate(nextSend.getDate() + 1);
      }
      
      return {
        nextAvailableAt: nextSend,
        secondsUntilAvailable: Math.max(0, Math.floor((nextSend - now) / 1000)),
        isSoon: (nextSend - now) < 300000 // Less than 5 minutes
      };
    } catch (error) {
      logger.error(`Failed to calculate next send time: ${error.message}`);
      return { nextAvailableAt: null, secondsUntilAvailable: -1 };
    }
  }
}

export default new CampaignRateLimiter();
