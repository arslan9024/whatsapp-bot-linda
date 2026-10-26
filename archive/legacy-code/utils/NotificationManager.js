/**
 * ====================================================================
 * NOTIFICATION MANAGER (Phase 16)
 * ====================================================================
 * Manages multi-channel notifications (SMS, Email, Slack, Push, In-app)
 * with retry logic, cooldowns, and aggregation.
 *
 * Key Responsibilities:
 * - Send notifications to multiple channels
 * - Implement retry logic with exponential backoff
 * - Enforce cooldown periods per alert type
 * - Aggregate notifications within time windows
 * - Log notification delivery status
 * - Support templating for different channels
 *
 * @since Phase 16 - February 15, 2026
 */

export default class NotificationManager {
  /**
   * Initialize the Notification Manager
   * @param {Object} db - MongoDB database instance
   * @param {Function} logFunc - Logging function
   * @param {Object} config - Phase 16 configuration
   * @param {Object} providers - External service providers
   *   - providers.twilio - Twilio client for SMS
   *   - providers.sendgrid - SendGrid client for email
   *   - providers.slack - Slack webhook handler
   *   - providers.firebase - Firebase admin SDK
   */
  constructor(db, logFunc, config, providers = {}) {
    this.db = db;
    this.log = logFunc;
    this.config = config.notifications;
    this.providers = providers;
    
    // In-memory tracking
    this.lastSentTime = new Map(); // Map<alertId, timestamp>
    this.aggregationQueue = new Map(); // Map<aggregationKey, notifications>
    
    this._initializeDatabase();
    this._startAggregationTimer();
  }

  /**
   * Initialize MongoDB collections
   * @private
   */
  async _initializeDatabase() {
    try {
      if (this.db && this.db.collection) {
        this.collection = this.db.collection('notifications');
        
        await this.collection.createIndex({ phoneNumber: 1, status: 1 });
        await this.collection.createIndex({ createdAt: 1 });
        
        this.log('[NotificationManager] Database initialized', 'info');
      }
    } catch (err) {
      this.log(`[NotificationManager] DB init error: ${err.message}`, 'warn');
    }
  }

  /**
   * Start aggregation timer for batching notifications
   * @private
   */
  _startAggregationTimer() {
    setInterval(() => {
      this._flushAggregationQueue();
    }, this.config.aggregationWindow);
  }

  /**
   * Send a notification
   * @param {Object} options - Notification options
   *   - type: Alert type (e.g., 'QR_REGENERATION_FAILED')
   *   - phoneNumber: Account phone number
   *   - channels: Array of channels to send to ['sms', 'email', 'slack', 'push', 'inApp']
   *   - priority: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
   *   - template: Template string or object
   *   - data: Data for template interpolation
   *   - aggregationKey: Optional key for grouping (automatic if not provided)
   * @returns {Promise<Object>} - Send result with status per channel
   */
  async send(options) {
    const {
      type,
      phoneNumber,
      channels = [],
      priority = 'MEDIUM',
      template,
      data = {},
      aggregationKey = null
    } = options;

    try {
      // Check cooldown
      if (!this._isInCooldown(type, phoneNumber)) {
        // Add to aggregation queue if applicable
        if (aggregationKey || this.config.aggregationWindow > 0) {
          const key = aggregationKey || `${type}:${phoneNumber}`;
          this._addToAggregationQueue(key, options);
          
          this.log(
            `[${phoneNumber}] Notification queued for aggregation: ${type}`,
            'debug'
          );
          
          return {
            status: 'aggregated',
            type,
            aggregationKey: key
          };
        }

        // Send immediately
        return await this._sendImmediate(options);
      } else {
        this.log(
          `[${phoneNumber}] Notification throttled (cooldown): ${type}`,
          'debug'
        );
        
        return {
          status: 'throttled',
          reason: 'cooldown',
          type
        };
      }
    } catch (err) {
      this.log(
        `[${phoneNumber}] Error sending notification: ${err.message}`,
        'error'
      );
      
      return {
        status: 'error',
        error: err.message,
        type
      };
    }
  }

  /**
   * Send notification immediately to all channels
   * @private
   */
  async _sendImmediate(options) {
    const { type, phoneNumber, channels, template, data } = options;
    const results = {};
    
    for (const channel of channels) {
      try {
        results[channel] = await this._sendToChannel(
          channel,
          template,
          data
        );
      } catch (err) {
        results[channel] = {
          status: 'error',
          error: err.message
        };
      }
    }

    // Record in database
    await this._recordNotification({
      ...options,
      results,
      sentAt: new Date(),
      status: this._getOverallStatus(results)
    });

    // Update cooldown
    this._updateCooldown(type, phoneNumber);

    return {
      status: 'sent',
      type,
      results
    };
  }

  /**
   * Send to a specific channel
   * @private
   */
  async _sendToChannel(channel, template, data) {
    const startTime = Date.now();
    let attempt = 0;

    while (attempt < this.config.retryCount) {
      try {
        let result;
        
        switch (channel) {
          case 'sms':
            result = await this._sendSMS(template, data);
            break;
          case 'email':
            result = await this._sendEmail(template, data);
            break;
          case 'slack':
            result = await this._sendSlack(template, data);
            break;
          case 'push':
            result = await this._sendPush(template, data);
            break;
          case 'inApp':
            result = await this._sendInApp(template, data);
            break;
          default:
            return { status: 'error', error: 'Unknown channel' };
        }

        result.deliveryTime = Date.now() - startTime;
        return { status: 'sent', ...result };
      } catch (err) {
        attempt++;
        
        if (attempt >= this.config.retryCount) {
          return {
            status: 'failed',
            error: err.message,
            attempts: attempt,
            deliveryTime: Date.now() - startTime
          };
        }

        // Wait before retry
        await new Promise(resolve =>
          setTimeout(resolve, this.config.retryDelay * Math.pow(2, attempt - 1))
        );
      }
    }
  }

  /**
   * Send SMS via Twilio
   * @private
   */
  async _sendSMS(template, data) {
    if (!this.config.channels.sms.enabled || !this.providers.twilio) {
      throw new Error('SMS channel not configured');
    }

    const message = this._interpolateTemplate(template, data);
    
    // TODO: Implement Twilio integration
    // const result = await this.providers.twilio.messages.create({
    //   body: message,
    //   from: process.env.TWILIO_FROM,
    //   to: data.phoneNumber
    // });

    return {
      channel: 'sms',
      messageId: 'sms_' + Date.now(),
      recipient: data.phoneNumber
    };
  }

  /**
   * Send Email via SendGrid
   * @private
   */
  async _sendEmail(template, data) {
    if (!this.config.channels.email.enabled || !this.providers.sendgrid) {
      throw new Error('Email channel not configured');
    }

    const message = this._interpolateTemplate(template, data);
    
    // TODO: Implement SendGrid integration
    // const result = await this.providers.sendgrid.send({
    //   to: data.email || data.phoneNumber,
    //   from: process.env.SENDGRID_FROM,
    //   subject: data.subject || 'Linda Bot Alert',
    //   html: message
    // });

    return {
      channel: 'email',
      messageId: 'email_' + Date.now(),
      recipient: data.email
    };
  }

  /**
   * Send Slack message via webhook
   * @private
   */
  async _sendSlack(template, data) {
    if (!this.config.channels.slack.enabled || !this.providers.slack) {
      throw new Error('Slack channel not configured');
    }

    const message = this._interpolateTemplate(template, data);
    
    // TODO: Implement Slack webhook integration
    // const result = await this.providers.slack.send({
    //   text: message,
    //   channel: process.env.SLACK_CHANNEL
    // });

    return {
      channel: 'slack',
      messageId: 'slack_' + Date.now(),
      channel_name: process.env.SLACK_CHANNEL || '#alerts'
    };
  }

  /**
   * Send Push notification via Firebase
   * @private
   */
  async _sendPush(template, data) {
    if (!this.config.channels.push.enabled || !this.providers.firebase) {
      throw new Error('Push channel not configured');
    }

    const message = this._interpolateTemplate(template, data);
    
    // TODO: Implement Firebase Cloud Messaging
    // const result = await this.providers.firebase.messaging().send({
    //   notification: {
    //     title: 'Linda Bot Alert',
    //     body: message
    //   },
    //   topic: data.phoneNumber
    // });

    return {
      channel: 'push',
      messageId: 'push_' + Date.now()
    };
  }

  /**
   * Send in-app notification (WebSocket)
   * @private
   */
  async _sendInApp(template, data) {
    // In-app notifications are handled via WebSocket
    // Just log and return success
    return {
      channel: 'inApp',
      messageId: 'inapp_' + Date.now(),
      method: 'websocket'
    };
  }

  /**
   * Interpolate template with data
   * @private
   */
  _interpolateTemplate(template, data) {
    if (typeof template === 'string') {
      let result = template;
      Object.entries(data).forEach(([key, value]) => {
        result = result.replace(new RegExp(`{${key}}`, 'g'), value);
      });
      return result;
    }
    
    return JSON.stringify(template);
  }

  /**
   * Check if alert is in cooldown
   * @private
   */
  _isInCooldown(alertType, phoneNumber) {
    const key = `${alertType}:${phoneNumber}`;
    const lastSent = this.lastSentTime.get(key);
    
    if (!lastSent) {
      return false;
    }

    // Default 1 hour cooldown
    const cooldown = this.config.channels.sms?.cooldown || 3600;
    return Date.now() - lastSent < cooldown * 1000;
  }

  /**
   * Update cooldown timestamp
   * @private
   */
  _updateCooldown(alertType, phoneNumber) {
    const key = `${alertType}:${phoneNumber}`;
    this.lastSentTime.set(key, Date.now());
  }

  /**
   * Add notification to aggregation queue
   * @private
   */
  _addToAggregationQueue(key, notification) {
    if (!this.aggregationQueue.has(key)) {
      this.aggregationQueue.set(key, []);
    }
    
    this.aggregationQueue.get(key).push(notification);
  }

  /**
   * Flush aggregation queue
   * @private
   */
  async _flushAggregationQueue() {
    if (this.aggregationQueue.size === 0) {
      return;
    }

    for (const [key, notifications] of this.aggregationQueue) {
      if (notifications.length === 0) {
        continue;
      }

      // Send aggregated notification
      const combined = this._combineNotifications(notifications);
      await this._sendImmediate(combined);
    }

    this.aggregationQueue.clear();
  }

  /**
   * Combine multiple notifications into one
   * @private
   */
  _combineNotifications(notifications) {
    const first = notifications[0];
    return {
      ...first,
      count: notifications.length,
      aggregated: true,
      originalNotifications: notifications
    };
  }

  /**
   * Get overall status from channel results
   * @private
   */
  _getOverallStatus(results) {
    const statuses = Object.values(results).map(r => r.status);
    
    if (statuses.includes('error') || statuses.includes('failed')) {
      return 'partial_failure';
    }
    
    if (statuses.every(s => s === 'sent')) {
      return 'success';
    }
    
    return 'unknown';
  }

  /**
   * Record notification to database
   * @private
   */
  async _recordNotification(notification) {
    try {
      if (this.collection) {
        await this.collection.insertOne({
          ...notification,
          createdAt: new Date()
        });
      }
    } catch (err) {
      this.log(
        `Error recording notification: ${err.message}`,
        'warn'
      );
    }
  }

  /**
   * Get notification history
   * @param {string} phoneNumber - Account phone number
   * @param {Object} options - Query options
   *   - limit: Number of records to return
   *   - filter: Filter by type
   *   - since: Unix timestamp
   * @returns {Promise<Array>} - Notification records
   */
  async getHistory(phoneNumber, options = {}) {
    try {
      if (!this.collection) {
        return [];
      }

      const query = { phoneNumber };
      
      if (options.filter) {
        query.type = options.filter;
      }
      
      if (options.since) {
        query.createdAt = { $gte: new Date(options.since) };
      }

      const history = await this.collection
        .find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 50)
        .toArray();

      return history;
    } catch (err) {
      this.log(`Error getting notification history: ${err.message}`, 'warn');
      return [];
    }
  }

  /**
   * Get notification statistics
   * @returns {Promise<Object>} - Statistics
   */
  async getStatistics() {
    try {
      if (!this.collection) {
        return null;
      }

      const stats = await this.collection
        .aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ])
        .toArray();

      return Object.fromEntries(
        stats.map(s => [s._id, s.count])
      );
    } catch (err) {
      this.log(`Error getting statistics: ${err.message}`, 'warn');
      return null;
    }
  }
}
