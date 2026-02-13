/**
 * Admin Configuration Interface
 * Enables dynamic bot configuration without restarting
 * 
 * Features:
 * - Dynamic handler configuration
 * - Message template management
 * - User permission controls
 * - Feature flags
 * - White/blacklisting
 * - Rate limiting controls
 */

import fs from 'fs';
import path from 'path';
import { logger } from '../Integration/Google/utils/logger.js';

class AdminConfigInterface {
  constructor(config = {}) {
    this.configPath = config.configPath || './code/Data/admin-config.json';
    this.auditLogPath = config.auditLogPath || './code/Data/admin-audit.json';

    this.config = {
      handlers: {
        enabled: {},
        disabled: {},
        settings: {}
      },
      features: {
        enabled: {},
        disabled: {},
        betaFeatures: {}
      },
      users: {
        admins: [],
        whitelist: [],
        blacklist: [],
        roles: {}
      },
      messaging: {
        templates: {},
        defaultLanguage: 'en',
        messageQuotas: {},
        autoRespond: true
      },
      security: {
        rateLimit: { enabled: true, maxMessagesPerMinute: 10 },
        commandValidation: true,
        encryptSensitiveData: true,
        apiKeyRotation: { enabled: true, intervalDays: 30 }
      },
      monitoring: {
        logLevel: 'info',
        errorReporting: true,
        performanceTracking: true,
        analyticsEnabled: true
      }
    };

    this.auditLog = [];
  }

  /**
   * Initialize admin interface
   */
  async initialize() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        this.config = data.config || this.config;
      }

      if (fs.existsSync(this.auditLogPath)) {
        const data = JSON.parse(fs.readFileSync(this.auditLogPath, 'utf8'));
        this.auditLog = data.auditLog || [];
      }

      logger.info('✅ Admin Configuration Interface initialized');
      return true;
    } catch (error) {
      logger.error(`❌ Failed to initialize AdminConfigInterface: ${error.message}`);
      return false;
    }
  }

  /**
   * Verify admin credentials
   */
  verifyAdminAccess(adminId) {
    try {
      const isAdmin = this.config.users.admins.includes(adminId);

      if (!isAdmin) {
        this._logAudit('DENIED', 'Unauthorized admin access attempt', { adminId });
        return { authorized: false, error: 'Not authorized' };
      }

      return { authorized: true };
    } catch (error) {
      logger.error(`❌ Error verifying admin access: ${error.message}`);
      return { authorized: false, error: error.message };
    }
  }

  /**
   * Enable/disable handler dynamically
   */
  async configureHandler(handlerName, enabled = true, settings = {}) {
    try {
      const handlerConfig = {
        name: handlerName,
        enabled,
        settings: {
          maxInvocations: settings.maxInvocations || Infinity,
          timeout: settings.timeout || 30000,
          cacheable: settings.cacheable !== false,
          priority: settings.priority || 'normal',
          ...settings
        },
        configuredAt: new Date().toISOString()
      };

      if (enabled) {
        this.config.handlers.enabled[handlerName] = handlerConfig;
        delete this.config.handlers.disabled[handlerName];
      } else {
        this.config.handlers.disabled[handlerName] = handlerConfig;
        delete this.config.handlers.enabled[handlerName];
      }

      this.config.handlers.settings[handlerName] = handlerConfig.settings;

      this._logAudit('HANDLER_CONFIGURED', `${handlerName} ${enabled ? 'enabled' : 'disabled'}`, 
        { handler: handlerName, enabled, settings });

      await this.persistConfig();
      return { success: true, handler: handlerConfig };
    } catch (error) {
      logger.error(`❌ Error configuring handler: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Manage feature flags
   */
  async setFeatureFlag(featureName, enabled = true, metadata = {}) {
    try {
      const featureConfig = {
        name: featureName,
        enabled,
        metadata,
        enabledAt: new Date().toISOString()
      };

      if (enabled) {
        this.config.features.enabled[featureName] = featureConfig;
        delete this.config.features.disabled[featureName];
      } else {
        this.config.features.disabled[featureName] = featureConfig;
        delete this.config.features.enabled[featureName];
      }

      this._logAudit('FEATURE_FLAG_CHANGED', `${featureName}: ${enabled}`, { feature: featureName, enabled });

      await this.persistConfig();
      return { success: true, feature: featureConfig };
    } catch (error) {
      logger.error(`❌ Error setting feature flag: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add/remove admin user
   */
  async manageAdmin(userId, action = 'add') {
    try {
      if (action === 'add') {
        if (!this.config.users.admins.includes(userId)) {
          this.config.users.admins.push(userId);
          this._logAudit('ADMIN_ADDED', `User ${userId} granted admin access`, { userId });
        }
      } else if (action === 'remove') {
        this.config.users.admins = this.config.users.admins.filter(u => u !== userId);
        this._logAudit('ADMIN_REMOVED', `User ${userId} revoked admin access`, { userId });
      }

      await this.persistConfig();
      return { success: true, admins: this.config.users.admins };
    } catch (error) {
      logger.error(`❌ Error managing admin: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Manage user whitelist/blacklist
   */
  async manageUserList(userId, listType = 'whitelist', action = 'add') {
    try {
      const list = listType === 'whitelist' 
        ? this.config.users.whitelist 
        : this.config.users.blacklist;

      if (action === 'add') {
        if (!list.includes(userId)) {
          list.push(userId);
          this._logAudit('USER_LIST_UPDATED', `${userId} added to ${listType}`, { userId, listType });
        }
      } else if (action === 'remove') {
        const index = list.indexOf(userId);
        if (index > -1) {
          list.splice(index, 1);
          this._logAudit('USER_LIST_UPDATED', `${userId} removed from ${listType}`, { userId, listType });
        }
      }

      await this.persistConfig();
      return { success: true, [listType]: list };
    } catch (error) {
      logger.error(`❌ Error managing user list: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update message template
   */
  async updateMessageTemplate(templateName, content, variables = []) {
    try {
      this.config.messaging.templates[templateName] = {
        content,
        variables,
        updatedAt: new Date().toISOString()
      };

      this._logAudit('TEMPLATE_UPDATED', `Message template '${templateName}' updated`, 
        { template: templateName, variables });

      await this.persistConfig();
      return { success: true, template: this.config.messaging.templates[templateName] };
    } catch (error) {
      logger.error(`❌ Error updating template: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Configure rate limiting
   */
  async configureRateLimit(maxMessagesPerMinute, enabled = true) {
    try {
      this.config.security.rateLimit = {
        enabled,
        maxMessagesPerMinute,
        configuredAt: new Date().toISOString()
      };

      this._logAudit('RATE_LIMIT_UPDATED', `Rate limit: ${maxMessagesPerMinute}/min`, 
        { maxMessagesPerMinute, enabled });

      await this.persistConfig();
      return { success: true, rateLimit: this.config.security.rateLimit };
    } catch (error) {
      logger.error(`❌ Error configuring rate limit: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration(section = null) {
    try {
      if (section) {
        return this.config[section] || null;
      }
      return {
        handlers: this.config.handlers,
        features: this.config.features,
        users: this.config.users,
        messaging: this.config.messaging,
        security: this.config.security,
        monitoring: this.config.monitoring
      };
    } catch (error) {
      logger.error(`❌ Error getting configuration: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if handler is enabled
   */
  isHandlerEnabled(handlerName) {
    return this.config.handlers.enabled[handlerName] !== undefined;
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(featureName) {
    return this.config.features.enabled[featureName] !== undefined;
  }

  /**
   * Check user authorization
   */
  isUserAuthorized(userId, actionType = 'message') {
    try {
      // Check blacklist first
      if (this.config.users.blacklist.includes(userId)) {
        return false;
      }

      // If whitelist exists and user not in it, deny
      if (this.config.users.whitelist.length > 0 && !this.config.users.whitelist.includes(userId)) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error(`❌ Error checking user authorization: ${error.message}`);
      return false;
    }
  }

  /**
   * Get audit log
   */
  getAuditLog(limit = 100, filter = {}) {
    try {
      let logs = [...this.auditLog];

      if (filter.action) {
        logs = logs.filter(l => l.action === filter.action);
      }

      if (filter.startDate) {
        logs = logs.filter(l => new Date(l.timestamp) >= new Date(filter.startDate));
      }

      if (filter.endDate) {
        logs = logs.filter(l => new Date(l.timestamp) <= new Date(filter.endDate));
      }

      return logs.slice(-limit).reverse();
    } catch (error) {
      logger.error(`❌ Error getting audit log: ${error.message}`);
      return [];
    }
  }

  /**
   * Persist configuration to disk
   */
  async persistConfig() {
    try {
      const data = {
        config: this.config,
        lastUpdated: new Date().toISOString()
      };

      fs.writeFileSync(this.configPath, JSON.stringify(data, null, 2));

      const auditData = {
        auditLog: this.auditLog,
        lastUpdated: new Date().toISOString()
      };

      fs.writeFileSync(this.auditLogPath, JSON.stringify(auditData, null, 2));

      return { success: true };
    } catch (error) {
      logger.error(`❌ Failed to persist config: ${error.message}`);
      return { success: false };
    }
  }

  /**
   * Log audit event
   */
  _logAudit(action, description, metadata = {}) {
    try {
      const auditEntry = {
        timestamp: new Date().toISOString(),
        action,
        description,
        metadata
      };

      this.auditLog.push(auditEntry);

      // Keep only last 10,000 audit logs
      if (this.auditLog.length > 10000) {
        this.auditLog = this.auditLog.slice(-10000);
      }

      logger.info(`📋 Audit: ${action} - ${description}`);
    } catch (error) {
      logger.error(`❌ Error logging audit: ${error.message}`);
    }
  }
}

export default AdminConfigInterface;
