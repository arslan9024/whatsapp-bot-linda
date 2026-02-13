/**
 * Real-time Analytics Dashboard
 * Provides comprehensive metrics, insights, and visualizations for bot performance
 * 
 * Features:
 * - Real-time message statistics
 * - User engagement metrics
 * - Handler performance analytics
 * - Conversation flow analysis
 * - Activity heatmaps
 * - Trend analysis
 */

import fs from 'fs';
import path from 'path';
import { logger } from '../Integration/Google/utils/logger.js';

class AnalyticsDashboard {
  constructor(config = {}) {
    this.analyticsPath = config.analyticsPath || './code/Data/analytics.json';
    this.metricsWindow = config.metricsWindow || 24; // hours
    
    this.metrics = {
      messages: {
        total: 0,
        byType: {},
        byHour: {},
        byUser: {},
        averageResponseTime: 0
      },
      users: {
        active: 0,
        total: 0,
        returning: 0,
        engagement: {}
      },
      handlers: {
        totalInvocations: 0,
        performance: {},
        errors: 0,
        successRate: 100
      },
      conversations: {
        totalConversations: 0,
        averageLength: 0,
        topics: {},
        sentimentDistribution: {}
      },
      system: {
        uptime: 0,
        memory: {},
        cpu: {},
        errors: []
      },
      trends: {
        hourly: [],
        daily: [],
        predictions: {}
      }
    };

    this.sessionMetrics = new Map(); // userId → metrics
    this.hourlyBuckets = new Map(); // hour → bucket data
    this.errorLog = [];
  }

  /**
   * Initialize dashboard - load persisted data
   */
  async initialize() {
    try {
      if (fs.existsSync(this.analyticsPath)) {
        const data = JSON.parse(fs.readFileSync(this.analyticsPath, 'utf8'));
        this.metrics = data.metrics || this.metrics;
        this.errorLog = data.errors || [];
        logger.info('✅ Analytics Dashboard initialized from persisted data');
      } else {
        logger.info('ℹ️ Analytics Dashboard starting fresh');
      }
      return true;
    } catch (error) {
      logger.error(`❌ Failed to initialize Analytics Dashboard: ${error.message}`);
      return false;
    }
  }

  /**
   * Track incoming message
   */
  trackMessage(msg, metadata = {}) {
    try {
      const timestamp = new Date();
      const hour = timestamp.toISOString().split('T')[0];
      const userId = msg.from || 'unknown';
      const messageType = metadata.type || 'text';

      // Update message metrics
      this.metrics.messages.total++;
      this.metrics.messages.byType[messageType] = (this.metrics.messages.byType[messageType] || 0) + 1;
      this.metrics.messages.byHour[hour] = (this.metrics.messages.byHour[hour] || 0) + 1;
      this.metrics.messages.byUser[userId] = (this.metrics.messages.byUser[userId] || 0) + 1;

      // Session tracking
      if (!this.sessionMetrics.has(userId)) {
        this.sessionMetrics.set(userId, {
          userId,
          firstSeen: timestamp,
          lastSeen: timestamp,
          messageCount: 1,
          topics: [],
          sentiment: 'neutral'
        });
      } else {
        const session = this.sessionMetrics.get(userId);
        session.lastSeen = timestamp;
        session.messageCount++;
      }

      return { success: true };
    } catch (error) {
      logger.error(`❌ Error tracking message: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Track handler execution
   */
  trackHandlerExecution(handlerName, executionTime, success = true) {
    try {
      const timestamp = new Date().toISOString();

      if (!this.metrics.handlers.performance[handlerName]) {
        this.metrics.handlers.performance[handlerName] = {
          name: handlerName,
          invocations: 0,
          totalTime: 0,
          averageTime: 0,
          minTime: Infinity,
          maxTime: 0,
          errorCount: 0,
          successCount: 0
        };
      }

      const handler = this.metrics.handlers.performance[handlerName];
      handler.invocations++;
      handler.totalTime += executionTime;
      handler.averageTime = handler.totalTime / handler.invocations;
      handler.minTime = Math.min(handler.minTime, executionTime);
      handler.maxTime = Math.max(handler.maxTime, executionTime);

      if (success) {
        handler.successCount++;
      } else {
        handler.errorCount++;
        this.metrics.handlers.errors++;
      }

      this.metrics.handlers.totalInvocations++;
      this._updateSuccessRate();

      return { success: true };
    } catch (error) {
      logger.error(`❌ Error tracking handler: ${error.message}`);
      return { success: false };
    }
  }

  /**
   * Track conversation metrics
   */
  trackConversation(conversationId, metadata = {}) {
    try {
      this.metrics.conversations.totalConversations++;

      if (metadata.length) {
        this.metrics.conversations.averageLength = 
          (this.metrics.conversations.averageLength * (this.metrics.conversations.totalConversations - 1) + 
           metadata.length) / this.metrics.conversations.totalConversations;
      }

      if (metadata.topic) {
        this.metrics.conversations.topics[metadata.topic] = 
          (this.metrics.conversations.topics[metadata.topic] || 0) + 1;
      }

      if (metadata.sentiment) {
        this.metrics.conversations.sentimentDistribution[metadata.sentiment] = 
          (this.metrics.conversations.sentimentDistribution[metadata.sentiment] || 0) + 1;
      }

      return { success: true };
    } catch (error) {
      logger.error(`❌ Error tracking conversation: ${error.message}`);
      return { success: false };
    }
  }

  /**
   * Log system error
   */
  logError(error, context = {}) {
    try {
      const errorEntry = {
        timestamp: new Date().toISOString(),
        message: error.message || String(error),
        stack: error.stack || '',
        context,
        count: 1
      };

      // Check if similar error already exists
      const existing = this.errorLog.find(e => 
        e.message === errorEntry.message && 
        JSON.stringify(e.context) === JSON.stringify(context)
      );

      if (existing) {
        existing.count++;
        existing.timestamp = errorEntry.timestamp;
      } else {
        this.errorLog.push(errorEntry);
      }

      this.metrics.system.errors += 1;

      return { success: true };
    } catch (err) {
      logger.error(`❌ Error logging error: ${err.message}`);
      return { success: false };
    }
  }

  /**
   * Get real-time dashboard snapshot
   */
  getDashboardSnapshot() {
    try {
      return {
        timestamp: new Date().toISOString(),
        metrics: this.metrics,
        activeUsers: this.sessionMetrics.size,
        topHandlers: this._getTopHandlers(5),
        topTopics: this._getTopTopics(5),
        recentErrors: this.errorLog.slice(-10),
        systemHealth: this._calculateSystemHealth()
      };
    } catch (error) {
      logger.error(`❌ Error getting dashboard snapshot: ${error.message}`);
      return null;
    }
  }

  /**
   * Get user engagement metrics
   */
  getUserEngagementMetrics(userId) {
    try {
      const userSession = this.sessionMetrics.get(userId);
      if (!userSession) return null;

      const messageCount = this.metrics.messages.byUser[userId] || 0;
      const handlerInvocations = this.metrics.handlers.totalInvocations;

      return {
        userId,
        messageCount,
        firstSeen: userSession.firstSeen,
        lastSeen: userSession.lastSeen,
        sessionDuration: new Date(userSession.lastSeen) - new Date(userSession.firstSeen),
        topics: userSession.topics,
        engagement: {
          level: messageCount > 10 ? 'high' : messageCount > 5 ? 'medium' : 'low',
          score: Math.min((messageCount / 100) * 100, 100)
        }
      };
    } catch (error) {
      logger.error(`❌ Error getting user engagement: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate analytics report
   */
  generateAnalyticsReport(format = 'json') {
    try {
      const report = {
        generatedAt: new Date().toISOString(),
        period: `Last ${this.metricsWindow} hours`,
        
        messagingStats: {
          total: this.metrics.messages.total,
          byType: this.metrics.messages.byType,
          uniqueUsers: Object.keys(this.metrics.messages.byUser).length,
          averageMessagesPerUser: this.metrics.messages.total / Object.keys(this.metrics.messages.byUser).length
        },

        userStats: {
          activeUsers: this.sessionMetrics.size,
          totalUsers: Object.keys(this.metrics.messages.byUser).length,
          returningUserRate: this._calculateReturningUserRate(),
          engagement: this._getEngagementStats()
        },

        handlerStats: {
          totalInvocations: this.metrics.handlers.totalInvocations,
          uniqueHandlers: Object.keys(this.metrics.handlers.performance).length,
          averageResponseTime: this._calculateAverageResponseTime(),
          successRate: this.metrics.handlers.successRate
        },

        conversationStats: {
          total: this.metrics.conversations.totalConversations,
          averageLength: this.metrics.conversations.averageLength.toFixed(2),
          topTopics: this._getTopTopics(10),
          sentimentDistribution: this.metrics.conversations.sentimentDistribution
        },

        errorStats: {
          totalErrors: this.metrics.system.errors,
          uniqueErrors: this.errorLog.length,
          mostCommon: this._getMostCommonErrors(5)
        }
      };

      return report;
    } catch (error) {
      logger.error(`❌ Error generating report: ${error.message}`);
      return null;
    }
  }

  /**
   * Persist analytics data
   */
  async persistAnalytics() {
    try {
      const data = {
        metrics: this.metrics,
        errors: this.errorLog,
        lastUpdated: new Date().toISOString()
      };

      fs.writeFileSync(this.analyticsPath, JSON.stringify(data, null, 2));
      return { success: true };
    } catch (error) {
      logger.error(`❌ Failed to persist analytics: ${error.message}`);
      return { success: false };
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  _updateSuccessRate() {
    const totalHandlers = this.metrics.handlers.totalInvocations;
    if (totalHandlers === 0) return;
    const successCount = totalHandlers - this.metrics.handlers.errors;
    this.metrics.handlers.successRate = (successCount / totalHandlers) * 100;
  }

  _getTopHandlers(limit = 5) {
    return Object.values(this.metrics.handlers.performance)
      .sort((a, b) => b.invocations - a.invocations)
      .slice(0, limit)
      .map(h => ({ name: h.name, invocations: h.invocations, avgTime: h.averageTime.toFixed(2) }));
  }

  _getTopTopics(limit = 5) {
    return Object.entries(this.metrics.conversations.topics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([topic, count]) => ({ topic, count }));
  }

  _getMostCommonErrors(limit = 5) {
    return this.errorLog
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(e => ({ message: e.message, count: e.count, lastSeen: e.timestamp }));
  }

  _calculateSystemHealth() {
    const successRate = this.metrics.handlers.successRate;
    let health = 'good';

    if (successRate < 95) health = 'warning';
    if (successRate < 90) health = 'critical';

    return {
      status: health,
      score: successRate.toFixed(2),
      errorCount: this.metrics.system.errors,
      lastUpdated: new Date().toISOString()
    };
  }

  _calculateAverageResponseTime() {
    const handlers = Object.values(this.metrics.handlers.performance);
    if (handlers.length === 0) return 0;
    const total = handlers.reduce((sum, h) => sum + h.averageTime, 0);
    return (total / handlers.length).toFixed(2);
  }

  _calculateReturningUserRate() {
    const users = this.sessionMetrics.values();
    let returning = 0;
    for (const user of users) {
      if (user.messageCount > 1) returning++;
    }
    return ((returning / this.sessionMetrics.size) * 100).toFixed(2);
  }

  _getEngagementStats() {
    const users = Array.from(this.sessionMetrics.values());
    const avgMessages = users.reduce((sum, u) => sum + u.messageCount, 0) / users.length;
    const maxMessages = Math.max(...users.map(u => u.messageCount));

    return {
      averageMessagesPerUser: avgMessages.toFixed(2),
      maxMessagesFromUser: maxMessages,
      activeUserShare: ((this.sessionMetrics.size / Object.keys(this.metrics.messages.byUser).length) * 100).toFixed(2)
    };
  }
}

export default AnalyticsDashboard;
