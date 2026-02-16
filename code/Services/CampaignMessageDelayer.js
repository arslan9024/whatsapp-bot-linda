import { Logger } from '../utils/logger.js';

const logger = new Logger('CampaignMessageDelayer');

/**
 * CampaignMessageDelayer - Smart delays between campaign messages
 * 
 * Purpose:
 * - Prevent WhatsApp from rate limiting/banning our account
 * - Respect office hours (don't send at night)
 * - Exponential backoff for retries
 * - Consistent, unpredictable delays to avoid detection
 */
class CampaignMessageDelayer {
  
  // Delay configuration
  BASE_DELAY_MIN = 3000;              // 3 seconds minimum
  BASE_DELAY_MAX = 5000;              // 5 seconds maximum
  BURST_THRESHOLD = 5;                // After 5 consecutive messages
  BURST_DELAY = 60000;                // 60 seconds after burst
  NIGHT_START_HOUR = 18;              // 6 PM
  NIGHT_END_HOUR = 8;                 // 8 AM
  WORKING_HOURS_TIMEZONE = 'Asia/Dubai';
  
  // Retry backoff configuration
  RETRY_DELAYS = [
    3000,    // 1st retry: 3 seconds
    5000,    // 2nd retry: 5 seconds
    10000    // 3rd retry: 10 seconds
  ];
  
  constructor() {
    this.messageCount = 0;             // Messages sent in current batch
    this.lastMessageTime = 0;         // Last message send timestamp
    this.failedRetries = new Map();   // Track retries per contact
  }
  
  /**
   * Get intelligent delay before sending next message
   */
  async getMessageDelay(retryCount = 0) {
    try {
      let delay = this._getRandomDelay();
      
      // Apply exponential backoff for retries
      if (retryCount > 0 && retryCount <= this.RETRY_DELAYS.length) {
        delay = this.RETRY_DELAYS[retryCount - 1];
        logger.debug(`Retry ${retryCount}: applying ${delay}ms exponential backoff`);
      }
      
      // Apply burst protection (after 5 consecutive messages)
      if (this.messageCount > 0 && this.messageCount % this.BURST_THRESHOLD === 0) {
        logger.warn(`Burst threshold reached (${this.BURST_THRESHOLD} messages), applying ${this.BURST_DELAY}ms delay`);
        delay = this.BURST_DELAY;
      }
      
      // Check if we should wait for working hours
      const workingHoursCheck = this._isWithinWorkingHours();
      if (!workingHoursCheck.inWorkingHours && !workingHoursCheck.willBeWorkingHours) {
        const sleepTime = this._getHoursUntilWorkingHours();
        logger.info(`Outside working hours. Sleeping ${sleepTime}ms until ${this.NIGHT_END_HOUR}:00`);
        delay = sleepTime;
      }
      
      this.messageCount++;
      return delay;
    } catch (error) {
      logger.error(`Failed to calculate delay: ${error.message}`);
      return this.BASE_DELAY_MIN; // Default safe delay
    }
  }
  
  /**
   * Get random delay between BASE_DELAY_MIN and BASE_DELAY_MAX
   * @private
   */
  _getRandomDelay() {
    return Math.floor(
      Math.random() * (this.BASE_DELAY_MAX - this.BASE_DELAY_MIN) + this.BASE_DELAY_MIN
    );
  }
  
  /**
   * Check if current time is within working hours
   * @private
   */
  _isWithinWorkingHours() {
    try {
      const now = new Date();
      
      // Get hour in timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: this.WORKING_HOURS_TIMEZONE,
        hour: 'numeric',
        hour12: false
      });
      
      const hour = parseInt(formatter.format(now));
      
      const inWorkingHours = hour >= this.NIGHT_END_HOUR && hour < this.NIGHT_START_HOUR;
      
      // Check if we'll be in working hours if we wait until next morning
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      const formatter2 = new Intl.DateTimeFormat('en-US', {
        timeZone: this.WORKING_HOURS_TIMEZONE,
        hour: 'numeric',
        hour12: false
      });
      const hourLater = parseInt(formatter2.format(oneHourLater));
      const willBeWorkingHours = hourLater >= this.NIGHT_END_HOUR && hourLater < this.NIGHT_START_HOUR;
      
      return { inWorkingHours, willBeWorkingHours, currentHour: hour };
    } catch (error) {
      logger.warn(`Failed to check working hours: ${error.message}`);
      return { inWorkingHours: true, willBeWorkingHours: true };
    }
  }
  
  /**
   * Calculate milliseconds until working hours begin
   * @private
   */
  _getHoursUntilWorkingHours() {
    try {
      const now = new Date();
      
      // Get current time in timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: this.WORKING_HOURS_TIMEZONE,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
      });
      
      const timeString = formatter.format(now);
      const [hours, minutes, seconds] = timeString.split(':').map(Number);
      
      let msUntilWorkStart;
      
      if (hours < this.NIGHT_END_HOUR) {
        // Before working hours start today (e.g., 2 AM)
        const startTime = new Date(now);
        startTime.setHours(this.NIGHT_END_HOUR, 0, 0, 0);
        msUntilWorkStart = startTime - now;
      } else {
        // After working hours end (e.g., 9 PM)
        const nextDay = new Date(now);
        nextDay.setDate(nextDay.getDate() + 1);
        nextDay.setHours(this.NIGHT_END_HOUR, 0, 0, 0);
        msUntilWorkStart = nextDay - now;
      }
      
      return Math.max(msUntilWorkStart, 0);
    } catch (error) {
      logger.error(`Failed to calculate wait time: ${error.message}`);
      return 60 * 60 * 1000; // Default 1 hour
    }
  }
  
  /**
   * Wait for specified delay
   */
  async wait(delayMs) {
    if (delayMs <= 0) return;
    
    logger.debug(`Waiting ${delayMs}ms before next message...`);
    
    return new Promise(resolve => {
      setTimeout(() => {
        this.lastMessageTime = Date.now();
        resolve();
      }, delayMs);
    });
  }
  
  /**
   * Get retry delay for a contact
   */
  getRetryDelay(contactPhone, attemptNumber) {
    try {
      if (attemptNumber < 1 || attemptNumber > this.RETRY_DELAYS.length) {
        return null; // No more retries
      }
      
      const delay = this.RETRY_DELAYS[attemptNumber - 1];
      
      logger.debug(`Retry delay for ${contactPhone} (attempt ${attemptNumber}): ${delay}ms`);
      
      return delay;
    } catch (error) {
      logger.error(`Failed to get retry delay: ${error.message}`);
      return this.RETRY_DELAYS[0]; // Default to first retry delay
    }
  }
  
  /**
   * Reset message counter (for new batch)
   */
  resetBatchCounter() {
    this.messageCount = 0;
    logger.debug('Message counter reset for new batch');
  }
  
  /**
   * Track failed message for retry
   */
  trackFailedMessage(contactPhone) {
    const current = this.failedRetries.get(contactPhone) || 0;
    this.failedRetries.set(contactPhone, current + 1);
  }
  
  /**
   * Get retry count for a contact
   */
  getRetryCount(contactPhone) {
    return this.failedRetries.get(contactPhone) || 0;
  }
  
  /**
   * Clear retry tracking for a contact
   */
  clearRetryTracking(contactPhone) {
    this.failedRetries.delete(contactPhone);
  }
  
  /**
   * Get health status of delayer
   */
  getStatus() {
    return {
      messagesInCurrentBatch: this.messageCount,
      lastMessageTime: new Date(this.lastMessageTime),
      failedRetries: Array.from(this.failedRetries.entries()),
      baseDelayRange: `${this.BASE_DELAY_MIN}ms - ${this.BASE_DELAY_MAX}ms`,
      burstThreshold: this.BURST_THRESHOLD,
      workingHours: `${this.NIGHT_END_HOUR}:00 - ${this.NIGHT_START_HOUR}:00 (${this.WORKING_HOURS_TIMEZONE})`
    };
  }
}

export default new CampaignMessageDelayer();
