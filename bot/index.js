/**
 * WhatsApp Bot Framework - Master Index
 * Exports all components and utilities
 * Provides convenient APIs for bot usage
 */

// Core components
export { default as CustomBotEngine } from './CustomBotEngine.js';
export { default as BotConnection } from './BotConnection.js';
export { default as MessageHandler } from './MessageHandler.js';
export { SessionManager, Session } from './SessionManager.js';
export { default as WebhookServer } from './WebhookServer.js';
export { default as BotConfig, getConfig, getBotConfig } from './BotConfig.js';
export { default as CommandRouter } from './CommandRouter.js';
export { default as DamacApiClient } from './DamacApiClient.js';
export { default as BotIntegration } from './BotIntegration.js';

// Factory function for easy initialization
export async function createBot(configPath = null) {
  const integration = new BotIntegration(configPath);
  await integration.start();
  return integration;
}

// Export classes for direct usage
export { CustomBotEngine, BotConnection, MessageHandler } from './CustomBotEngine.js';
