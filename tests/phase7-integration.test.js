/**
 * Phase 7 Integration Tests
 * Date: February 14, 2026
 * Tests all Phase 7 modules for correct integration
 */

import AnalyticsDashboard from '../code/Analytics/AnalyticsDashboard.js';
import AdminConfigInterface from '../code/Admin/AdminConfigInterface.js';
import AdvancedConversationFeatures from '../code/Conversation/AdvancedConversationFeatures.js';
import ReportGenerator from '../code/Reports/ReportGenerator.js';

describe('Phase 7: Advanced Features Integration Tests', () => {
  let analytics, adminConfig, conversations, reportGen;

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZATION TESTS
  // ═══════════════════════════════════════════════════════════════
  
  describe('Module Initialization', () => {
    test('AnalyticsDashboard should initialize', async () => {
      analytics = new AnalyticsDashboard();
      await analytics.initialize();
      expect(analytics).toBeDefined();
      expect(analytics.getData).toBeDefined();
      expect(typeof analytics.trackMessage).toBe('function');
    });

    test('AdminConfigInterface should initialize', async () => {
      adminConfig = new AdminConfigInterface();
      await adminConfig.initialize();
      expect(adminConfig).toBeDefined();
      expect(adminConfig.isUserAuthorized).toBeDefined();
      expect(typeof adminConfig.toggleHandler).toBe('function');
    });

    test('AdvancedConversationFeatures should initialize', async () => {
      conversations = new AdvancedConversationFeatures();
      await conversations.initialize();
      expect(conversations).toBeDefined();
      expect(conversations.processMessage).toBeDefined();
      expect(typeof conversations.generateResponse).toBe('function');
    });

    test('ReportGenerator should initialize', async () => {
      reportGen = new ReportGenerator();
      await reportGen.initialize();
      expect(reportGen).toBeDefined();
      expect(reportGen.generateDailyReport).toBeDefined();
      expect(typeof reportGen.exportAsJSON).toBe('function');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('AnalyticsDashboard Functionality', () => {
    test('should track messages', () => {
      const msg = { from: '+971501234567', body: 'hello', type: 'chat' };
      analytics.trackMessage(msg, { type: 'text' });
      const data = analytics.getData();
      expect(data.messages.length).toBeGreaterThan(0);
    });

    test('should track handler performance', () => {
      analytics.trackHandlerExecution('propertySearchHandler', 250, true);
      const data = analytics.getData();
      expect(data.handlers).toBeDefined();
    });

    test('should generate dashboard snapshot', () => {
      const snapshot = analytics.getDashboardSnapshot();
      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot).toHaveProperty('metrics');
      expect(snapshot.metrics).toHaveProperty('messages');
      expect(snapshot.metrics).toHaveProperty('handlers');
      expect(snapshot.metrics).toHaveProperty('systemHealth');
    });

    test('should calculate message statistics', () => {
      for (let i = 0; i < 5; i++) {
        analytics.trackMessage({ from: '+971501234567', body: `msg ${i}`, type: 'chat' }, {});
      }
      const snapshot = analytics.getDashboardSnapshot();
      expect(snapshot.metrics.messages.total).toBeGreaterThanOrEqual(5);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ADMIN CONFIG TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('AdminConfigInterface Functionality', () => {
    test('should verify admin access', () => {
      const result = adminConfig.verifyAdminAccess('admin-number');
      expect(result).toHaveProperty('authorized');
    });

    test('should check user authorization', () => {
      const isAuthorized = adminConfig.isUserAuthorized('+971501234567');
      expect(typeof isAuthorized).toBe('boolean');
    });

    test('should toggle handler status', () => {
      const result = adminConfig.toggleHandler('testHandler');
      expect(result).toHaveProperty('enabled');
      expect(typeof result.enabled).toBe('boolean');
    });

    test('should track configuration changes in audit log', () => {
      adminConfig.toggleHandler('testHandler2');
      const audit = adminConfig.getAuditLog();
      expect(Array.isArray(audit)).toBe(true);
      expect(audit.length).toBeGreaterThan(0);
    });

    test('should list user permissions', () => {
      const perms = adminConfig.listPermissions('user-id');
      expect(typeof perms).toBe('object');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CONVERSATION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('AdvancedConversationFeatures Functionality', () => {
    test('should process messages and extract intent', () => {
      const result = conversations.processMessage('+971501234567', 'I want to buy a villa');
      expect(result).toHaveProperty('intent');
      expect(['property_query', 'greeting', 'help', 'complaint', 'feedback', 'goodbye']).toContain(result.intent);
    });

    test('should detect message sentiment', () => {
      const result = conversations.processMessage('+971501234567', 'I love this property!');
      expect(result).toHaveProperty('sentiment');
      expect(['positive', 'negative', 'neutral']).toContain(result.sentiment);
    });

    test('should extract entities from messages', () => {
      const result = conversations.processMessage('+971501234567', 'I am looking for a villa in Dubai');
      expect(result).toHaveProperty('entities');
      expect(result.entities).toHaveProperty('locations');
    });

    test('should generate appropriate responses', () => {
      const response = conversations.generateResponse('+971501234567', 'hello');
      expect(response).toHaveProperty('message');
      expect(typeof response.message).toBe('string');
      expect(response.message.length).toBeGreaterThan(0);
    });

    test('should provide suggestions in responses', () => {
      const response = conversations.generateResponse('+971501234567', 'show me properties');
      expect(response).toHaveProperty('suggestions');
      expect(Array.isArray(response.suggestions)).toBe(true);
    });

    test('should maintain conversation context', () => {
      const userId = '+971501234567';
      conversations.processMessage(userId, 'hello');
      const context = conversations.getConversationContext(userId);
      expect(context).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // REPORT GENERATION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('ReportGenerator Functionality', () => {
    beforeEach(() => {
      // Seed some data
      for (let i = 0; i < 5; i++) {
        analytics.trackMessage({ from: `+9715012345${i}`, body: `msg ${i}` }, {});
      }
    });

    test('should generate daily report', () => {
      const report = reportGen.generateDailyReport();
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('details');
    });

    test('should generate weekly report', () => {
      const report = reportGen.generateWeeklyReport();
      expect(report.summary).toHaveProperty('period', 'weekly');
    });

    test('should generate monthly report', () => {
      const report = reportGen.generateMonthlyReport();
      expect(report.summary).toHaveProperty('period', 'monthly');
    });

    test('should export report as JSON', () => {
      const report = reportGen.generateDailyReport();
      const json = reportGen.exportAsJSON(report);
      expect(json).toBeDefined();
      expect(() => JSON.parse(json)).not.toThrow();
    });

    test('should export report as CSV', () => {
      const report = reportGen.generateDailyReport();
      const csv = reportGen.exportAsCSV(report);
      expect(csv).toBeDefined();
      expect(csv.includes(',')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // INTEGRATION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('End-to-End Message Flow', () => {
    test('should handle complete message workflow', () => {
      const userId = '+971501234567';
      const message = 'I want to buy a villa in Dubai';

      // Step 1: Track
      analytics.trackMessage({ from: userId, body: message }, { type: 'text' });

      // Step 2: Authorize
      const isAuthorized = adminConfig.isUserAuthorized(userId);
      expect(typeof isAuthorized).toBe('boolean');

      // Step 3: Analyze
      const analysis = conversations.processMessage(userId, message);
      expect(analysis.intent).toBe('property_query');

      // Step 4: Generate response
      const response = conversations.generateResponse(userId, message);
      expect(response.message).toBeDefined();

      // Step 5: Verify tracking
      const snapshot = analytics.getDashboardSnapshot();
      expect(snapshot.metrics.messages.total).toBeGreaterThan(0);
    });

    test('should generate reports from tracked data', () => {
      const userId = '+971501234567';
      
      // Track some messages
      for (let i = 0; i < 5; i++) {
        analytics.trackMessage({ from: userId, body: `message ${i}` }, { type: 'text' });
      }

      // Generate report
      const report = reportGen.generateDailyReport();
      expect(report.summary.metrics.totalMessages).toBeGreaterThan(0);
    });

    test('should handle admin commands workflow', () => {
      // Verify admin access
      const adminAccess = adminConfig.verifyAdminAccess('admin-phone');
      expect(adminAccess).toHaveProperty('authorized');

      // Toggle handler
      const toggleResult = adminConfig.toggleHandler('handler1');
      expect(toggleResult).toHaveProperty('enabled');

      // Get audit log
      const audit = adminConfig.getAuditLog();
      expect(Array.isArray(audit)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ERROR HANDLING TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Error Handling', () => {
    test('should handle invalid messages gracefully', () => {
      expect(() => {
        analytics.trackMessage(null, {});
      }).not.toThrow();
    });

    test('should handle missing conversation context', () => {
      const response = conversations.generateResponse('+unknown', 'test');
      expect(response).toHaveProperty('message');
    });

    test('should handle report generation errors', () => {
      expect(() => {
        const report = reportGen.generateDailyReport();
        reportGen.exportAsJSON(report);
      }).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PERFORMANCE TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Performance', () => {
    test('analytics should handle bulk message tracking', () => {
      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        analytics.trackMessage({ from: `+9715${i}`, body: `msg ${i}` }, {});
      }
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in < 1 second
    });

    test('conversation should process message in reasonable time', () => {
      const startTime = Date.now();
      conversations.processMessage('+971501234567', 'I want to buy a villa in Dubai');
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500); // Should complete in < 500ms
    });

    test('report generation should be fast', () => {
      const startTime = Date.now();
      reportGen.generateDailyReport();
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in < 1 second
    });
  });
});
