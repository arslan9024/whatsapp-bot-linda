/**
 * Bot Configuration Management
 * Centralized configuration for all bot components
 * Supports: environment variables, config files, defaults
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

class BotConfig {
  static instance = null;

  constructor(configPath = null) {
    if (BotConfig.instance) {
      return BotConfig.instance;
    }

    this.env = process.env.NODE_ENV || 'development';
    this.config = this.loadConfig(configPath);
    this.validate();

    BotConfig.instance = this;
  }

  /**
   * Load configuration from file or environment
   */
  loadConfig(configPath) {
    const defaultConfig = {
      // Environment
      env: this.env,
      debug: process.env.DEBUG === 'true',

      // Bot connection
      bot: {
        mode: process.env.BOT_MODE || 'hybrid', // 'browser', 'websocket', 'hybrid'
        sessionName: process.env.BOT_SESSION_NAME || 'linda-bot',
        commandPrefix: process.env.COMMAND_PREFIX || '/',
        reconnectInterval: parseInt(process.env.RECONNECT_INTERVAL || '5000'),
        maxRetries: parseInt(process.env.MAX_RETRIES || '3')
      },

      // Message handling
      messages: {
        maxQueueSize: parseInt(process.env.MAX_QUEUE_SIZE || '1000'),
        processingTimeout: parseInt(process.env.PROCESSING_TIMEOUT || '30000'),
        commandTimeout: parseInt(process.env.COMMAND_TIMEOUT || '60000')
      },

      // Session management
      session: {
        maxSessions: parseInt(process.env.MAX_SESSIONS || '10000'),
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '1200000'), // 20 mins
        cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL || '300000'), // 5 mins
        maxHistoryPerSession: parseInt(process.env.MAX_HISTORY || '100')
      },

      // Webhook server
      webhook: {
        port: parseInt(process.env.WEBHOOK_PORT || '3001'),
        host: process.env.WEBHOOK_HOST || 'localhost',
        adminSecret: process.env.ADMIN_SECRET || 'changeme'
      },

      // API integration
      api: {
        baseUrl: process.env.API_URL || 'http://localhost:5000',
        timeout: parseInt(process.env.API_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.API_RETRY_ATTEMPTS || '3'),
        retryDelay: parseInt(process.env.API_RETRY_DELAY || '1000')
      },

      // Database
      database: {
        url: process.env.MONGODB_URL || process.env.DATABASE_URL,
        useInMemory: process.env.USE_IN_MEMORY_DB === 'true',
        poolSize: parseInt(process.env.DB_POOL_SIZE || '10')
      },

      // Google Sheets
      sheets: {
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        credentialsPath: process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json'
      },

      // Twilio (optional)
      twilio: {
        enabled: process.env.TWILIO_ENABLED === 'true',
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER
      },

      // Firebase (optional)
      firebase: {
        enabled: process.env.FIREBASE_ENABLED === 'true',
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
      },

      // Logging
      logging: {
        level: process.env.LOG_LEVEL || 'info', // 'debug', 'info', 'warn', 'error'
        format: process.env.LOG_FORMAT || 'json', // 'json', 'text'
        file: process.env.LOG_FILE, // optional log file path
        maxSize: parseInt(process.env.LOG_MAX_SIZE || '10485760'), // 10MB
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '5')
      },

      // Rate limiting
      rateLimit: {
        enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
        messagesPerMinute: parseInt(process.env.MESSAGES_PER_MINUTE || '60'),
        commandsPerMinute: parseInt(process.env.COMMANDS_PER_MINUTE || '20')
      },

      // Features
      features: {
        propertySearch: process.env.FEATURE_PROPERTY_SEARCH !== 'false',
        propertyDetails: process.env.FEATURE_PROPERTY_DETAILS !== 'false',
        booking: process.env.FEATURE_BOOKING !== 'false',
        payment: process.env.FEATURE_PAYMENT !== 'false', 
        support: process.env.FEATURE_SUPPORT !== 'false',
        analytics: process.env.FEATURE_ANALYTICS !== 'false'
      },

      // Notification settings
      notifications: {
        enabled: process.env.NOTIFICATIONS_ENABLED !== 'false',
        channels: (process.env.NOTIFICATION_CHANNELS || 'whatsapp').split(','),
        retryAttempts: parseInt(process.env.NOTIFICATION_RETRY || '3'),
        delayMs: parseInt(process.env.NOTIFICATION_DELAY || '1000')
      },

      // Admin settings
      admin: {
        adminNumbers: (process.env.ADMIN_NUMBERS || '').split(',').filter(n => n),
        superAdminNumbers: (process.env.SUPER_ADMIN_NUMBERS || '').split(',').filter(n => n),
        allowCommandsFromNonAdmin: process.env.ALLOW_COMMANDS_FROM_NON_ADMIN === 'true'
      }
    };

    // Load from config file if provided
    if (configPath && fs.existsSync(configPath)) {
      try {
        const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        return this.deepMerge(defaultConfig, fileConfig);
      } catch (error) {
        console.error(`Error loading config file: ${error.message}`);
      }
    }

    return defaultConfig;
  }

  /**
   * Validate configuration
   */
  validate() {
    const errors = [];

    // Required fields
    if (!this.config.sheets.spreadsheetId) {
      errors.push('GOOGLE_SHEET_ID is required');
    }

    if (!this.config.database.url && !this.config.database.useInMemory) {
      errors.push('DATABASE_URL or USE_IN_MEMORY_DB must be set');
    }

    // Validate bot mode
    const validModes = ['browser', 'websocket', 'hybrid'];
    if (!validModes.includes(this.config.bot.mode)) {
      errors.push(`BOT_MODE must be one of: ${validModes.join(', ')}`);
    }

    // Validate numeric configs
    if (this.config.bot.maxRetries < 1) {
      errors.push('MAX_RETRIES must be >= 1');
    }

    if (this.config.session.maxSessions < 10) {
      errors.push('MAX_SESSIONS must be >= 10');
    }

    if (this.config.webhook.port < 1 || this.config.webhook.port > 65535) {
      errors.push('WEBHOOK_PORT must be between 1 and 65535');
    }

    if (errors.length > 0) {
      console.error('Configuration validation errors:');
      errors.forEach(err => console.error(`  - ${err}`));
      if (this.config.env === 'production') {
        throw new Error('Configuration validation failed');
      }
    }
  }

  /**
   * Get config value
   */
  get(path) {
    const parts = path.split('.');
    let value = this.config;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Set config value
   */
  set(path, value) {
    const parts = path.split('.');
    const lastPart = parts.pop();
    let obj = this.config;

    for (const part of parts) {
      if (!obj[part] || typeof obj[part] !== 'object') {
        obj[part] = {};
      }
      obj = obj[part];
    }

    obj[lastPart] = value;
  }

  /**
   * Get all config
   */
  getAll() {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Deep merge objects
   */
  deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * Is production
   */
  isProduction() {
    return this.env === 'production';
  }

  /**
   * Is development
   */
  isDevelopment() {
    return this.env === 'development';
  }

  /**
   * Export whole config (for logging)
   */
  toString() {
    const sanitized = { ...this.config };
    // Remove sensitive data
    if (sanitized.database) sanitized.database.url = '***';
    if (sanitized.twilio) {
      sanitized.twilio.accountSid = '***';
      sanitized.twilio.authToken = '***';
    }
    if (sanitized.firebase) {
      sanitized.firebase.privateKey = '***';
    }
    return JSON.stringify(sanitized, null, 2);
  }
}

// Singleton getter
export function getConfig(configPath) {
  if (!BotConfig.instance) {
    new BotConfig(configPath);
  }
  return BotConfig.instance.config;
}

// Direct instance access
export function getBotConfig(configPath) {
  return new BotConfig(configPath);
}

export default BotConfig;
