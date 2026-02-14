/**
 * PHASE 7: ADVANCED FEATURES VALIDATION TEST SUITE
 * Tests for Analytics, Admin Config, Conversation, and Report modules
 * Session 9 - Integration & Validation (Fixed: Feb 14, 2026)
 *
 * Fixes applied:
 * - Added .default for ESM→CJS interop (babel-jest)
 * - Corrected all method names to match actual class APIs
 * - Added fs mock for SafeLogger and module filesystem access
 * - Proper error handling for module loading
 */

// ─── Mock filesystem (all 4 modules import fs) ─────────────────────
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  readFileSync: jest.fn().mockReturnValue('{}'),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

describe('Phase 7: Advanced Features Validation', () => {
  let AnalyticsDashboard;
  let AdminConfigInterface;
  let AdvancedConversationFeatures;
  let ReportGenerator;

  beforeAll(() => {
    // Load modules with .default for ESM→CJS interop via babel-jest
    try {
      const adMod = require('../code/Analytics/AnalyticsDashboard.js');
      AnalyticsDashboard = adMod.default || adMod;
    } catch (e) {
      console.log('AnalyticsDashboard load error:', e.message);
    }

    try {
      const acMod = require('../code/Admin/AdminConfigInterface.js');
      AdminConfigInterface = acMod.default || acMod;
    } catch (e) {
      console.log('AdminConfigInterface load error:', e.message);
    }

    try {
      const cfMod = require('../code/Conversation/AdvancedConversationFeatures.js');
      AdvancedConversationFeatures = cfMod.default || cfMod;
    } catch (e) {
      console.log('AdvancedConversationFeatures load error:', e.message);
    }

    try {
      const rgMod = require('../code/Reports/ReportGenerator.js');
      ReportGenerator = rgMod.default || rgMod;
    } catch (e) {
      console.log('ReportGenerator load error:', e.message);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS DASHBOARD
  // Actual API: trackMessage, trackHandlerExecution,
  //             getDashboardSnapshot, generateAnalyticsReport
  // ═══════════════════════════════════════════════════════════════
  describe('AnalyticsDashboard', () => {
    let dashboard;

    beforeEach(() => {
      dashboard = new AnalyticsDashboard();
    });

    test('should initialize with default state', () => {
      expect(dashboard).toBeDefined();
      expect(dashboard.metrics).toBeDefined();
      expect(dashboard.metrics.messages).toBeDefined();
      expect(dashboard.metrics.messages.total).toBe(0);
    });

    test('should track message events', () => {
      const result = dashboard.trackMessage({ from: 'user123' }, { type: 'text' });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    test('should track handler execution', () => {
      const result = dashboard.trackHandlerExecution('testHandler', 100, true);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    test('should provide dashboard snapshot', () => {
      const snapshot = dashboard.getDashboardSnapshot();
      expect(snapshot).toBeDefined();
      expect(snapshot.metrics).toBeDefined();
      expect(snapshot.timestamp).toBeDefined();
    });

    test('should generate analytics report', () => {
      dashboard.trackMessage({ from: 'user1' }, {});
      dashboard.trackMessage({ from: 'user2' }, {});
      dashboard.trackMessage({ from: 'user1' }, {});

      const report = dashboard.generateAnalyticsReport('json');
      expect(report).toBeDefined();
    });

    test('should count messages by user', () => {
      dashboard.trackMessage({ from: 'user1' }, {});
      dashboard.trackMessage({ from: 'user1' }, {});
      dashboard.trackMessage({ from: 'user2' }, {});

      expect(dashboard.metrics.messages.total).toBe(3);
      expect(dashboard.metrics.messages.byUser['user1']).toBe(2);
      expect(dashboard.metrics.messages.byUser['user2']).toBe(1);
    });

    test('should track handler success rate', () => {
      dashboard.trackHandlerExecution('handler1', 50, true);
      dashboard.trackHandlerExecution('handler1', 75, true);
      dashboard.trackHandlerExecution('handler1', 100, false);

      const perf = dashboard.metrics.handlers.performance['handler1'];
      expect(perf.invocations).toBe(3);
      expect(perf.successCount).toBe(2);
      expect(perf.errorCount).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ADMIN CONFIG INTERFACE
  // Actual API: initialize, toggleHandler, configureHandler,
  //             setFeatureFlag, getConfiguration, listPermissions
  // ═══════════════════════════════════════════════════════════════
  describe('AdminConfigInterface', () => {
    let adminConfig;

    beforeEach(() => {
      adminConfig = new AdminConfigInterface();
    });

    test('should initialize successfully', () => {
      expect(adminConfig).toBeDefined();
      expect(adminConfig.config).toBeDefined();
    });

    test('should have initialize method', () => {
      expect(typeof adminConfig.initialize).toBe('function');
    });

    test('should initialize config', async () => {
      const result = await adminConfig.initialize();
      expect(result).toBeDefined();
    });

    test('should have toggleHandler method', () => {
      expect(typeof adminConfig.toggleHandler).toBe('function');
    });

    test('should toggle handler state', () => {
      const result = adminConfig.toggleHandler('testHandler');
      expect(result).toBeDefined();
      expect(result.enabled !== undefined).toBe(true);
    });

    test('should set feature flag', async () => {
      const result = await adminConfig.setFeatureFlag('darkMode', true, { source: 'test' });
      expect(result).toBeDefined();
    });

    test('should get configuration', () => {
      const config = adminConfig.getConfiguration();
      expect(typeof config === 'object').toBe(true);
      expect(config.handlers).toBeDefined();
      expect(config.features).toBeDefined();
    });

    test('should get configuration section', () => {
      const security = adminConfig.getConfiguration('security');
      expect(security).toBeDefined();
    });

    test('should list user permissions', () => {
      const perms = adminConfig.listPermissions('user123');
      expect(typeof perms === 'object').toBe(true);
      expect(perms.role).toBeDefined();
    });

    test('should check user authorization', () => {
      const result = adminConfig.isUserAuthorized('+971501234567');
      expect(typeof result).toBe('boolean');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ADVANCED CONVERSATION FEATURES
  // Actual API: processMessage, generateResponse,
  //             getConversationSummary, getConversationHistory
  // (analyzeSentiment, detectIntent, extractEntities are private)
  // ═══════════════════════════════════════════════════════════════
  describe('AdvancedConversationFeatures', () => {
    let conversationFeatures;

    beforeEach(() => {
      conversationFeatures = new AdvancedConversationFeatures();
    });

    test('should initialize successfully', () => {
      expect(conversationFeatures).toBeDefined();
      expect(conversationFeatures.activeConversations).toBeDefined();
    });

    test('should process message and detect sentiment', () => {
      const result = conversationFeatures.processMessage('user1', 'This is great!');
      expect(result).toBeDefined();
      expect(result.sentiment).toBeDefined();
    });

    test('should generate contextual response', () => {
      // First process a message to establish context
      conversationFeatures.processMessage('user1', 'Hello');
      const result = conversationFeatures.generateResponse('user1', 'Can you help me?');
      expect(result).toBeDefined();
    });

    test('should detect intent via processMessage', () => {
      const result = conversationFeatures.processMessage('user1', 'I want to buy a property');
      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
      expect(result.intent).toBe('property_query');
    });

    test('should extract entities via processMessage', () => {
      const result = conversationFeatures.processMessage('user1', 'I want an apartment for 500k');
      expect(result).toBeDefined();
      expect(result.entities).toBeDefined();
      expect(typeof result.entities).toBe('object');
    });

    test('should maintain conversation history via processMessage', () => {
      conversationFeatures.processMessage('user1', 'Hello');
      conversationFeatures.processMessage('user1', 'How are you?');
      const history = conversationFeatures.getConversationHistory('user1');
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    test('should provide conversation summary', () => {
      conversationFeatures.processMessage('user1', 'Hello there');
      conversationFeatures.processMessage('user1', 'I need help');
      const summary = conversationFeatures.getConversationSummary('user1');
      expect(summary).toBeDefined();
    });

    test('should detect greeting intent', () => {
      const result = conversationFeatures.processMessage('user1', 'Hi there!');
      expect(result.intent).toBe('greeting');
    });

    test('should detect help intent', () => {
      const result = conversationFeatures.processMessage('user1', 'I need help please');
      expect(result.intent).toBe('help');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // REPORT GENERATOR
  // Actual API: initialize, generateWeeklyReport, generateDailyReport,
  //             exportJSON, exportCSV, listReports
  // ═══════════════════════════════════════════════════════════════
  describe('ReportGenerator', () => {
    let reportGenerator;

    beforeEach(() => {
      reportGenerator = new ReportGenerator();
    });

    test('should initialize successfully', () => {
      expect(reportGenerator).toBeDefined();
      expect(reportGenerator.generatedReports).toBeDefined();
    });

    test('should have initialize method', () => {
      expect(typeof reportGenerator.initialize).toBe('function');
    });

    test('should initialize report generator', async () => {
      const result = await reportGenerator.initialize();
      expect(result).toBeDefined();
    });

    test('should generate weekly report', () => {
      const analyticsData = {
        metrics: {
          messages: {
            total: 100,
            byType: { text: 80, media: 20 },
            byHour: {},
            byUser: { user1: 50, user2: 50 },
          },
          handlers: { performance: {}, successRate: 95 },
          conversations: { totalConversations: 10, averageLength: 5, topics: {} },
          system: { errors: 2 },
        },
      };

      const report = reportGenerator.generateWeeklyReport(analyticsData);
      expect(report).toBeDefined();
      expect(report.type).toBe('weekly');
      expect(report.summary).toBeDefined();
    });

    test('should generate daily report', () => {
      const report = reportGenerator.generateDailyReport();
      expect(report).toBeDefined();
      expect(report.type).toBe('daily');
    });

    test('should list generated reports', () => {
      reportGenerator.generateWeeklyReport({
        metrics: {
          messages: { total: 0, byType: {}, byHour: {}, byUser: {} },
          handlers: { performance: {}, successRate: 100 },
          conversations: { totalConversations: 0, averageLength: 0, topics: {} },
          system: { errors: 0 },
        },
      });

      const reports = reportGenerator.listReports();
      expect(Array.isArray(reports) || typeof reports === 'object').toBe(true);
    });

    test('should export report to JSON', () => {
      const report = reportGenerator.generateWeeklyReport({
        metrics: {
          messages: { total: 0, byType: {}, byHour: {}, byUser: {} },
          handlers: { performance: {}, successRate: 100 },
          conversations: { totalConversations: 0, averageLength: 0, topics: {} },
          system: { errors: 0 },
        },
      });

      const exported = reportGenerator.exportJSON(report);
      expect(exported).toBeDefined();
      expect(typeof exported).toBe('string');
    });

    test('should export report to CSV', () => {
      const report = reportGenerator.generateWeeklyReport({
        metrics: {
          messages: { total: 0, byType: {}, byHour: {}, byUser: {} },
          handlers: { performance: {}, successRate: 100 },
          conversations: { totalConversations: 0, averageLength: 0, topics: {} },
          system: { errors: 0 },
        },
      });

      const exported = reportGenerator.exportCSV(report);
      expect(exported).toBeDefined();
      expect(typeof exported).toBe('string');
    });

    test('should include report summary metrics', () => {
      const report = reportGenerator.generateWeeklyReport({
        metrics: {
          messages: { total: 250, byType: {}, byHour: {}, byUser: { a: 100, b: 150 } },
          handlers: { performance: {}, successRate: 97 },
          conversations: { totalConversations: 20, averageLength: 8, topics: {} },
          system: { errors: 1 },
        },
      });

      expect(report.summary.metrics.totalMessages).toBe(250);
      expect(report.summary.metrics.uniqueUsers).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // INTEGRATION TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('Integration Tests', () => {
    test('should work together in a workflow', async () => {
      const adminConfig = new AdminConfigInterface();
      const dashboard = new AnalyticsDashboard();
      const reportGenerator = new ReportGenerator();
      const conversationFeatures = new AdvancedConversationFeatures();

      // Initialize
      await adminConfig.initialize();
      await reportGenerator.initialize();

      // Track analytics
      dashboard.trackMessage({ from: 'user1' }, { type: 'text' });

      // Generate report from dashboard snapshot
      const snapshot = dashboard.getDashboardSnapshot();
      const report = reportGenerator.generateWeeklyReport(snapshot);

      // Verify integration
      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.summary.metrics.totalMessages >= 0).toBe(true);
    });

    test('should handle concurrent operations', async () => {
      const adminConfig = new AdminConfigInterface();
      const dashboard = new AnalyticsDashboard();

      const promises = [
        Promise.resolve(adminConfig.initialize()),
        Promise.resolve(dashboard.trackMessage({ from: 'user1' }, {})),
        Promise.resolve(dashboard.trackMessage({ from: 'user2' }, {})),
        Promise.resolve(adminConfig.toggleHandler('testHandler')),
      ];

      const results = await Promise.all(promises);
      expect(results.length).toBe(4);
    });

    test('should process conversation and generate report', () => {
      const conversation = new AdvancedConversationFeatures();
      const dashboard = new AnalyticsDashboard();
      const reportGenerator = new ReportGenerator();

      // Process conversation
      const msgResult = conversation.processMessage('user1', 'I want to buy an apartment');
      expect(msgResult.intent).toBe('property_query');

      // Track in analytics
      dashboard.trackMessage({ from: 'user1' }, { type: 'text' });
      dashboard.trackHandlerExecution('propertyHandler', 120, true);

      // Generate report
      const snapshot = dashboard.getDashboardSnapshot();
      const report = reportGenerator.generateWeeklyReport(snapshot);
      expect(report.type).toBe('weekly');
      expect(report.summary).toBeDefined();
    });
  });
});
