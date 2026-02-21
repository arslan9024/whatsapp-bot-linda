/**
 * Bot Performance Tests
 * Tests bot performance under load and stress conditions
 */

import BotIntegration from '../BotIntegration.js';
import { performance } from 'perf_hooks';

describe('Bot Performance Tests', () => {
  let bot;
  const PERFORMANCE_THRESHOLDS = {
    messageProcessing: 100,      // ms
    sessionCreation: 50,         // ms
    apiCall: 500,                // ms
    commandExecution: 200,       // ms
    memoryPerSession: 1024 * 50, // 50KB
  };

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    process.env.USE_IN_MEMORY_DB = 'true';
    process.env.BOT_MODE = 'websocket';
    bot = new BotIntegration();
    await bot.start();
  });

  afterEach(async () => {
    if (bot) await bot.stop();
  });

  describe('Message Processing Performance', () => {
    test('should process message within threshold', () => {
      const message = {
        from: '+971501234567',
        body: 'hello world',
        timestamp: Date.now(),
        isGroup: false
      };

      const start = performance.now();
      bot.messageHandler.parseMessage(message);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.messageProcessing);
    });

    test('should process command within threshold', () => {
      const message = {
        from: '+971501234567',
        body: '/search dubai marina 2bed price:1m-5m',
        timestamp: Date.now(),
        isGroup: false
      };

      const start = performance.now();
      bot.messageHandler.parseMessage(message);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.commandExecution);
    });

    test('should process 100 messages in reasonable time', () => {
      const messages = [];
      for (let i = 0; i < 100; i++) {
        messages.push({
          from: '+971501234567',
          body: `Message ${i}`,
          timestamp: Date.now() + i,
          isGroup: false
        });
      }

      const start = performance.now();
      messages.forEach(msg => bot.messageHandler.parseMessage(msg));
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.messageProcessing * 100);
    });

    test('should handle message variations efficiently', () => {
      const variations = [
        { body: 'simple text' },
        { body: '/command arg1 arg2' },
        { body: 'text with @mention and #hashtag' },
        { body: 'Check https://example.com' },
        { body: 'Price range: 1M-5M' }
      ];

      const start = performance.now();
      variations.forEach(msg => {
        bot.messageHandler.parseMessage({
          from: '+971501234567',
          ...msg,
          timestamp: Date.now(),
          isGroup: false
        });
      });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.messageProcessing * variations.length * 2);
    });
  });

  describe('Session Management Performance', () => {
    test('should create session within threshold', () => {
      const start = performance.now();
      bot.sessionManager.getSession('+971501234567');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.sessionCreation);
    });

    test('should handle multiple concurrent sessions', () => {
      const sessionCount = 1000;
      const userIds = Array.from({ length: sessionCount }, (_, i) =>
        `+971${String(i).padStart(8, '0')}`
      );

      const start = performance.now();
      userIds.forEach(userId => {
        bot.sessionManager.getSession(userId);
      });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.sessionCreation * sessionCount * 2);
    });

    test('should maintain low memory per session', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 100; i++) {
        const userId = `+971${String(i).padStart(8, '0')}`;
        bot.sessionManager.getSession(userId);
        bot.sessionManager.setState(userId, 'test_state', 'test_value');
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryDiff = finalMemory - initialMemory;
      const avgPerSession = memoryDiff / 100;

      expect(avgPerSession).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryPerSession);
    });

    test('should retrieve session states quickly', () => {
      const userId = '+971501234567';
      bot.sessionManager.getSession(userId);

      // Add multiple states
      for (let i = 0; i < 50; i++) {
        bot.sessionManager.setState(userId, `key_${i}`, `value_${i}`);
      }

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        bot.sessionManager.getState(userId, `key_${i % 50}`);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10); // Should be nearly instant
    });

    test('should query sessions by tag efficiently', () => {
      const sessionCount = 500;

      // Create sessions with tags
      for (let i = 0; i < sessionCount; i++) {
        const userId = `+971${String(i).padStart(8, '0')}`;
        bot.sessionManager.getSession(userId);
        if (i % 3 === 0) bot.sessionManager.addTag(userId, 'vip');
        if (i % 2 === 0) bot.sessionManager.addTag(userId, 'buyer');
      }

      const start = performance.now();
      const vipSessions = bot.sessionManager.getSessionsByTag('vip');
      const buyerSessions = bot.sessionManager.getSessionsByTag('buyer');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
      expect(vipSessions.length).toBeGreaterThan(0);
      expect(buyerSessions.length).toBeGreaterThan(0);
    });
  });

  describe('Message History Performance', () => {
    test('should add messages efficiently', () => {
      const userId = '+971501234567';
      bot.sessionManager.getSession(userId);

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        bot.sessionManager.addMessage(userId, {
          text: `Message ${i}`,
          timestamp: Date.now() + i,
          from: userId
        });
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    test('should retrieve history efficiently', () => {
      const userId = '+971501234567';
      bot.sessionManager.getSession(userId);

      // Add 1000 messages
      for (let i = 0; i < 1000; i++) {
        bot.sessionManager.addMessage(userId, {
          text: `Message ${i}`,
          timestamp: Date.now() + i,
          from: userId
        });
      }

      const start = performance.now();
      const history = bot.sessionManager.getHistory(userId);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
      expect(history.length).toBeGreaterThan(0);
    });

    test('should truncate old messages without performance impact', () => {
      const userId = '+971501234567';
      bot.sessionManager.getSession(userId);

      // Add more messages than max history
      for (let i = 0; i < 2000; i++) {
        bot.sessionManager.addMessage(userId, {
          text: `Message ${i}`,
          timestamp: Date.now() + i,
          from: userId
        });
      }

      const history = bot.sessionManager.getHistory(userId);
      expect(history.length).toBeLessThanOrEqual(1000); // Max history
    });
  });

  describe('Counter Operations Performance', () => {
    test('should increment counter efficiently', () => {
      const userId = '+971501234567';
      bot.sessionManager.getSession(userId);

      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        bot.sessionManager.incrementCounter(userId, 'test_counter');
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    test('should retrieve counter efficiently', () => {
      const userId = '+971501234567';
      bot.sessionManager.getSession(userId);

      for (let i = 0; i < 100; i++) {
        bot.sessionManager.incrementCounter(userId, `counter_${i}`);
      }

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        bot.sessionManager.getCounter(userId, `counter_${i % 100}`);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });
  });

  describe('Engine Performance', () => {
    test('should maintain healthy queue size', () => {
      for (let i = 0; i < 100; i++) {
        bot.engine.emit('test:message', {
          userId: `+971${String(i).padStart(8, '0')}`,
          message: `Test message ${i}`
        });
      }

      const stats = bot.engine.getStats();
      expect(stats.queueSize).toBeLessThan(1000);
    });

    test('should process events efficiently', () => {
      let processedCount = 0;

      bot.engine.on('test:event', () => {
        processedCount++;
      });

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        bot.engine.emit('test:event', { index: i });
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('Concurrent User Simulation', () => {
    test('should handle 100 concurrent users', async () => {
      const userCount = 100;
      const messageCount = 10;

      const start = performance.now();

      // Simulate 100 users sending messages
      for (let u = 0; u < userCount; u++) {
        const userId = `+971${String(u).padStart(8, '0')}`;
        const session = bot.sessionManager.getSession(userId);

        for (let m = 0; m < messageCount; m++) {
          const message = {
            from: userId,
            body: `Message ${m} from user ${u}`,
            timestamp: Date.now(),
            isGroup: false
          };

          bot.messageHandler.parseMessage(message);
          bot.sessionManager.addMessage(userId, message);
        }
      }

      const duration = performance.now() - start;
      const totalMessages = userCount * messageCount;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.messageProcessing * totalMessages * 1.5);
    });

    test('should handle 500 concurrent users', async () => {
      const userCount = 500;
      const messagePerUser = 3;

      const start = performance.now();

      for (let u = 0; u < userCount; u++) {
        const userId = `+971${String(u).padStart(8, '0')}`;
        const session = bot.sessionManager.getSession(userId);

        for (let m = 0; m < messagePerUser; m++) {
          const message = {
            from: userId,
            body: `Message from user`,
            timestamp: Date.now(),
            isGroup: false
          };
          bot.sessionManager.addMessage(userId, message);
        }
      }

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5000);

      const stats = bot.sessionManager.getStats();
      expect(stats.totalSessions).toBeGreaterThanOrEqual(userCount);
    });

    test('should handle burst traffic', () => {
      const burstSize = 500;
      const start = performance.now();

      for (let i = 0; i < burstSize; i++) {
        const userId = `+971${String(i).padStart(8, '0')}`;
        bot.sessionManager.getSession(userId);
        bot.messageHandler.parseMessage({
          from: userId,
          body: `Burst message ${i}`,
          timestamp: Date.now(),
          isGroup: false
        });
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Memory Performance', () => {
    test('should not leak memory on session creation/deletion', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 1000; i++) {
        const userId = `+971${String(i).padStart(8, '0')}`;
        bot.sessionManager.getSession(userId);
      }

      const afterCreate = process.memoryUsage().heapUsed;
      const memoryIncrease = afterCreate - initialMemory;

      // Should not use excessive memory
      expect(memoryIncrease).toBeLessThan(1024 * 1024 * 50); // 50MB
    });

    test('should report accurate stats', () => {
      // Create diverse sessions
      for (let i = 0; i < 100; i++) {
        const userId = `+971${String(i).padStart(8, '0')}`;
        const session = bot.sessionManager.getSession(userId);

        for (let m = 0; m < (i % 10 + 1); m++) {
          bot.sessionManager.addMessage(userId, {
            text: `Message ${m}`,
            timestamp: Date.now(),
            from: userId
          });
        }
      }

      const stats = bot.sessionManager.getStats();

      expect(stats.totalSessions).toBe(100);
      expect(stats.activeSessions).toBeGreaterThan(0);
      expect(stats.totalMessages).toBeGreaterThan(450);
      expect(stats.averageMessagesPerSession).toBeGreaterThan(0);
    });
  });

  describe('Stress Testing', () => {
    test('should survive rapid start/stop cycles', async () => {
      for (let i = 0; i < 5; i++) {
        await bot.stop();
        await new Promise(r => setTimeout(r, 10));
        await bot.start();
      }

      const health = bot.getHealth();
      expect(health.running).toBe(true);
    });

    test('should handle sustained high message rate', () => {
      const userId = '+971501234567';
      bot.sessionManager.getSession(userId);

      const start = performance.now();

      // Simulate high message rate (100 messages/sec)
      for (let i = 0; i < 500; i++) {
        bot.messageHandler.parseMessage({
          from: userId,
          body: `Message ${i}`,
          timestamp: Date.now() + i,
          isGroup: false
        });
        bot.sessionManager.addMessage(userId, {
          text: `Message ${i}`,
          timestamp: Date.now() + i,
          from: userId
        });
      }

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(2000);
      expect(duration).toBeGreaterThan(0);
    });
  });

  describe('Response Time Percentiles', () => {
    test('should track p95 message processing time', () => {
      const times = [];
      const totalRequests = 1000;

      for (let i = 0; i < totalRequests; i++) {
        const start = performance.now();

        bot.messageHandler.parseMessage({
          from: `+971${String(i).padStart(8, '0')}`,
          body: `Message ${i}`,
          timestamp: Date.now(),
          isGroup: false
        });

        const duration = performance.now() - start;
        times.push(duration);
      }

      times.sort((a, b) => a - b);
      const p95Index = Math.floor(times.length * 0.95);
      const p95 = times[p95Index];

      expect(p95).toBeLessThan(50); // 95th percentile should be < 50ms
    });

    test('should track p99 session creation time', () => {
      const times = [];
      const totalRequests = 500;

      for (let i = 0; i < totalRequests; i++) {
        const start = performance.now();
        bot.sessionManager.getSession(`+971${String(i).padStart(8, '0')}`);
        const duration = performance.now() - start;
        times.push(duration);
      }

      times.sort((a, b) => a - b);
      const p99Index = Math.floor(times.length * 0.99);
      const p99 = times[p99Index];

      expect(p99).toBeLessThan(100); // 99th percentile should be < 100ms
    });
  });
});
