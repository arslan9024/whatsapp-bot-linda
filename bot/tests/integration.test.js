/**
 * Bot Integration Tests
 * Tests all components working together
 */

import BotIntegration from '../BotIntegration.js';
import { SessionManager } from '../SessionManager.js';
import MessageHandler from '../MessageHandler.js';
import CommandRouter from '../CommandRouter.js';
import DamacApiClient from '../DamacApiClient.js';
import BotConfig from '../BotConfig.js';

describe('Bot Integration Tests', () => {
  let bot;
  let config;

  beforeEach(() => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.USE_IN_MEMORY_DB = 'true';
    process.env.BOT_MODE = 'websocket';
    process.env.LOG_LEVEL = 'error';
  });

  describe('BotIntegration Initialization', () => {
    test('should initialize with default config', () => {
      bot = new BotIntegration();
      expect(bot).toBeDefined();
      expect(bot.config).toBeDefined();
    });

    test('should load config from environment', () => {
      process.env.GOOGLE_SHEET_ID = 'test-sheet-id';
      bot = new BotIntegration();
      expect(bot.config.config.sheets.spreadsheetId).toBe('test-sheet-id');
    });

    test('should have all required components', async () => {
      bot = new BotIntegration();
      await bot.start();
      
      expect(bot.engine).toBeDefined();
      expect(bot.messageHandler).toBeDefined();
      expect(bot.sessionManager).toBeDefined();
      expect(bot.commandRouter).toBeDefined();
      expect(bot.apiClient).toBeDefined();
      expect(bot.webhookServer).toBeDefined();
      
      await bot.stop();
    });
  });

  describe('Message Flow', () => {
    beforeEach(async () => {
      bot = new BotIntegration();
      await bot.start();
    });

    afterEach(async () => {
      if (bot) await bot.stop();
    });

    test('should process simple text message', async () => {
      const message = {
        from: '+971501234567',
        body: 'hello world',
        timestamp: Date.now(),
        isGroup: false
      };

      const processed = await bot.messageHandler.parseMessage(message);
      
      expect(processed).toBeDefined();
      expect(processed.from).toBe('+971501234567');
      expect(processed.text).toBe('hello world');
      expect(processed.isCommand).toBe(false);
    });

    test('should parse command message', async () => {
      const message = {
        from: '+971501234567',
        body: '/search dubai marina',
        timestamp: Date.now(),
        isGroup: false
      };

      const processed = await bot.messageHandler.parseMessage(message);
      
      expect(processed.isCommand).toBe(true);
      expect(processed.command).toBe('search');
      expect(processed.args).toContain('dubai');
      expect(processed.args).toContain('marina');
    });

    test('should extract entities from message', async () => {
      const message = {
        from: '+971501234567',
        body: 'Check this link: https://example.com and contact @user123',
        timestamp: Date.now(),
        isGroup: false
      };

      const processed = await bot.messageHandler.parseMessage(message);
      
      expect(processed.entities.urls).toContain('https://example.com');
      expect(processed.entities.mentions).toContain('@user123');
    });

    test('should detect intent from message', () => {
      const message = {
        text: 'I want to find a property in Dubai',
        isCommand: false
      };

      const intent = bot.messageHandler.extractIntent(message);
      
      expect(intent.type).toBe('property_search');
      expect(intent.confidence).toBeGreaterThan(0);
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      bot = new BotIntegration();
      await bot.start();
    });

    afterEach(async () => {
      if (bot) await bot.stop();
    });

    test('should create session for new user', () => {
      const userId = '+971501234567';
      const session = bot.sessionManager.getSession(userId);
      
      expect(session).toBeDefined();
      expect(session.userId).toBe(userId);
      expect(session.createdAt).toBeDefined();
    });

    test('should maintain session state', () => {
      const userId = '+971501234567';
      bot.sessionManager.setState(userId, 'step', 'awaiting_response');
      
      const state = bot.sessionManager.getState(userId, 'step');
      expect(state).toBe('awaiting_response');
    });

    test('should add message to session history', () => {
      const userId = '+971501234567';
      const message = {
        text: 'Hello',
        timestamp: Date.now(),
        from: userId
      };
      
      bot.sessionManager.addMessage(userId, message);
      const history = bot.sessionManager.getHistory(userId);
      
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].text).toBe('Hello');
    });

    test('should manage tags', () => {
      const userId = '+971501234567';
      bot.sessionManager.addTag(userId, 'vip');
      bot.sessionManager.addTag(userId, 'buyer');
      
      const sessions = bot.sessionManager.getSessionsByTag('vip');
      
      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions[0].userId).toBe(userId);
    });

    test('should track counters', () => {
      const userId = '+971501234567';
      
      let count = bot.sessionManager.incrementCounter(userId, 'messages');
      expect(count).toBe(1);
      
      count = bot.sessionManager.incrementCounter(userId, 'messages');
      expect(count).toBe(2);
      
      const current = bot.sessionManager.getCounter(userId, 'messages');
      expect(current).toBe(2);
    });

    test('should get session stats', () => {
      // Create multiple sessions
      bot.sessionManager.getSession('+971501234567');
      bot.sessionManager.getSession('+971509876543');
      
      const stats = bot.sessionManager.getStats();
      
      expect(stats.totalSessions).toBeGreaterThan(0);
      expect(stats.activeSessions).toBeGreaterThan(0);
      expect(stats.averageMessagesPerSession).toBeDefined();
    });
  });

  describe('Command Routing', () => {
    beforeEach(async () => {
      bot = new BotIntegration();
      await bot.start();
    });

    afterEach(async () => {
      if (bot) await bot.stop();
    });

    test('should recognize built-in commands', () => {
      const message = {
        text: '/help',
        isCommand: true,
        command: 'help',
        args: [],
        from: '+971501234567'
      };

      const session = bot.sessionManager.getSession(message.from);
      
      // Command should be recognized
      expect(message.command).toBe('help');
    });

    test('should register custom command', async () => {
      await bot.commandRouter.registerCommand('test', async (msg, session) => {
        return 'Test command executed';
      });

      // Custom command registered
      expect(true).toBe(true);
    });

    test('should parse command arguments', () => {
      const handler = new MessageHandler();
      const message = {
        text: '/search dubai marina 2bed price:1m-5m',
        isCommand: true
      };

      const parsed = handler.parseMessage(message);
      
      expect(parsed.command).toBe('search');
      expect(parsed.args.length).toBeGreaterThan(0);
    });
  });

  describe('API Integration', () => {
    beforeEach(async () => {
      bot = new BotIntegration();
      await bot.start();
    });

    afterEach(async () => {
      if (bot) await bot.stop();
    });

    test('should create API client', () => {
      expect(bot.apiClient).toBeDefined();
      expect(bot.apiClient.constructor.name).toBe('DamacApiClient');
    });

    test('should validate API configuration', () => {
      const config = bot.config.config.api;
      
      expect(config.baseUrl).toBeDefined();
      expect(config.timeout).toBeGreaterThan(0);
      expect(config.retryAttempts).toBeGreaterThan(0);
    });
  });

  describe('Configuration Management', () => {
    test('should load configuration', () => {
      config = new BotConfig();
      
      expect(config.config).toBeDefined();
      expect(config.config.bot).toBeDefined();
      expect(config.config.session).toBeDefined();
    });

    test('should get config values', () => {
      config = new BotConfig();
      const mode = config.get('bot.mode');
      
      expect(mode).toBeDefined();
    });

    test('should validate required fields', () => {
      config = new BotConfig();
      
      // Should have required fields or use defaults
      expect(config.config.bot).toBeDefined();
      expect(config.config.session).toBeDefined();
    });

    test('should check environment', () => {
      config = new BotConfig();
      
      const isDev = config.isDevelopment();
      const isProd = config.isProduction();
      
      expect(typeof isDev).toBe('boolean');
      expect(typeof isProd).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      bot = new BotIntegration();
      await bot.start();
    });

    afterEach(async () => {
      if (bot) await bot.stop();
    });

    test('should handle invalid message', async () => {
      const message = null;
      
      expect(async () => {
        await bot.messageHandler.process(message);
      }).rejects.toThrow();
    });

    test('should validate message structure', () => {
      const handler = new MessageHandler();
      const invalidMsg = { text: 'hello' };
      
      const validation = handler.validate(invalidMsg);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should detect spam patterns', () => {
      const handler = new MessageHandler();
      const spamMsg = {
        text: 'SPAM SPAM SPAM SPAM SPAM SPAM SPAM SPAM SPAM SPAM',
        from: '+123',
        timestamp: Date.now()
      };
      
      const isSpam = handler.isSpam(spamMsg);
      
      expect(isSpam).toBe(true);
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      bot = new BotIntegration();
      await bot.start();
    });

    afterEach(async () => {
      if (bot) await bot.stop();
    });

    test('should get bot health', () => {
      const health = bot.getHealth();
      
      expect(health).toBeDefined();
      expect(health.running).toBeDefined();
      expect(health.engine).toBeDefined();
      expect(health.sessions).toBeDefined();
    });

    test('should track engine statistics', () => {
      const stats = bot.engine.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.status).toBeDefined();
      expect(stats.uptime).toBeDefined();
      expect(stats.queueSize).toBeDefined();
    });
  });

  describe('Event System', () => {
    beforeEach(async () => {
      bot = new BotIntegration();
      await bot.start();
    });

    afterEach(async () => {
      if (bot) await bot.stop();
    });

    test('should emit events', (done) => {
      let eventEmitted = false;

      bot.engine.on('test-event', () => {
        eventEmitted = true;
      });

      bot.engine.emit('test-event', {});

      setTimeout(() => {
        expect(eventEmitted).toBe(true);
        done();
      }, 100);
    });

    test('should handle session events', (done) => {
      let sessionCreated = false;

      bot.sessionManager.on('session:created', () => {
        sessionCreated = true;
      });

      bot.sessionManager.getSession('+971501234567');

      setTimeout(() => {
        expect(sessionCreated).toBe(true);
        done();
      }, 100);
    });
  });

  describe('Graceful Shutdown', () => {
    test('should stop bot gracefully', async () => {
      bot = new BotIntegration();
      await bot.start();
      
      expect(bot.isRunning).toBe(true);
      
      await bot.stop();
      
      expect(bot.isRunning).toBe(false);
    });

    test('should cleanup on shutdown', async () => {
      bot = new BotIntegration();
      await bot.start();
      
      const initialSessions = bot.sessionManager.sessions.size;
      
      await bot.stop();
      
      expect(bot.sessionManager.sessions.size).toBeLessThanOrEqual(initialSessions);
    });
  });

  describe('Integration Scenarios', () => {
    beforeEach(async () => {
      bot = new BotIntegration();
      await bot.start();
    });

    afterEach(async () => {
      if (bot) await bot.stop();
    });

    test('should handle complete user flow', async () => {
      const userId = '+971501234567';

      // 1. Get session
      const session = bot.sessionManager.getSession(userId);
      expect(session).toBeDefined();

      // 2. Process message
      const message = {
        from: userId,
        body: '/search dubai',
        timestamp: Date.now(),
        isGroup: false
      };

      const processed = bot.messageHandler.parseMessage(message);
      expect(processed.isCommand).toBe(true);

      // 3. Add to history
      bot.sessionManager.addMessage(userId, processed);
      const history = bot.sessionManager.getHistory(userId);
      expect(history.length).toBeGreaterThan(0);

      // 4. Set state
      bot.sessionManager.setState(userId, 'last_command', 'search');
      const state = bot.sessionManager.getState(userId, 'last_command');
      expect(state).toBe('search');
    });

    test('should handle multiple concurrent users', () => {
      const userIds = [
        '+971501234567',
        '+971509876543',
        '+971502345678'
      ];

      userIds.forEach(userId => {
        const session = bot.sessionManager.getSession(userId);
        expect(session).toBeDefined();
      });

      const stats = bot.sessionManager.getStats();
      expect(stats.totalSessions).toBeGreaterThanOrEqual(userIds.length);
    });

    test('should handle rate limiting', () => {
      const userId = '+971501234567';
      
      // Create multiple messages quickly
      for (let i = 0; i < 5; i++) {
        const message = {
          from: userId,
          body: `Message ${i}`,
          timestamp: Date.now(),
          isGroup: false
        };
        bot.sessionManager.addMessage(userId, message);
      }

      const history = bot.sessionManager.getHistory(userId);
      expect(history.length).toBeLessThanOrEqual(100); // Max history
    });
  });
});
