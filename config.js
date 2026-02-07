/**
 * Centralized Configuration Module
 * Loads and validates environment variables
 * Provides type-safe configuration access
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Configuration object with all environment variables
 * @typedef {Object} Config
 */
const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs/bot.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '14'),
    debugMode: process.env.DEBUG_MODE === 'true',
  },

  // WhatsApp Bot
  bot: {
    numbers: process.env.BOT_NUMBERS?.split(',') || [],
    enablePairingCode: process.env.BOT_ENABLE_PAIRING_CODE === 'true',
    sessionStorePath: process.env.BOT_SESSION_STORE_PATH || './sessions',
  },

  // Server
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || 'localhost',
  },

  // Google Sheets
  googleSheets: {
    keyPath: process.env.GOOGLE_SHEETS_KEY_PATH || './code/GoogleAPI/keys.json',
    sheetId: process.env.GOOGLE_SHEET_ID,
  },

  // Message Delays (in milliseconds)
  delays: {
    message: parseInt(process.env.MESSAGE_DELAY_MS || '1000'),
    batch: parseInt(process.env.BATCH_DELAY_MS || '5000'),
  },

  // Contact Validation
  validation: {
    countryCodeCheck: process.env.COUNTRY_CODE_VALIDATION === 'true',
    primaryCountryCode: process.env.PRIMARY_COUNTRY_CODE || '971',
  },

  // Campaign Settings
  campaign: {
    mode: process.env.CAMPAIGN_MODE || 'batch',
    batchSize: parseInt(process.env.CAMPAIGN_BATCH_SIZE || '50'),
  },
};

/**
 * Validates required configuration
 * @throws {Error} If required config is missing
 */
function validateConfig() {
  const errors = [];

  if (!config.bot.numbers || config.bot.numbers.length === 0) {
    errors.push('BOT_NUMBERS environment variable is required');
  }

  if (!config.googleSheets.keyPath) {
    errors.push('GOOGLE_SHEETS_KEY_PATH environment variable is required');
  }

  if (errors.length > 0) {
    console.error('Configuration validation errors:');
    errors.forEach(err => console.error(`  - ${err}`));
    throw new Error('Invalid configuration');
  }
}

// Validate on module load (in production)
if (config.isProduction) {
  validateConfig();
}

export default config;
