/**
 * ====================================================================
 * FEATURE INITIALIZER (Extracted from index.js — Phase 13)
 * ====================================================================
 * Initializes all feature subsystems in the correct order:
 *   1. Phase 7  — Analytics, Admin Config, Conversation AI, Reports
 *   2. Phase 8  — Auto-Recovery (SessionCleanup, BrowserMonitor, LockFile)
 *   3. Phase 1  — whatsapp-web.js Features (message enhancement, reactions,
 *                 groups, chat org, contacts, event handlers)
 *
 * Returns the initialized module references so index.js can store them
 * for dependency injection into the message router.
 *
 * @since Phase 13 — February 14, 2026
 */

import services from './ServiceRegistry.js';

// Phase 7 imports
import AnalyticsDashboard from '../Analytics/AnalyticsDashboard.js';
import AdminConfigInterface from '../Admin/AdminConfigInterface.js';
import AdvancedConversationFeatures from '../Conversation/AdvancedConversationFeatures.js';
import ReportGenerator from '../Reports/ReportGenerator.js';

// Phase 8 imports
import SessionCleanupManager from './SessionCleanupManager.js';
import BrowserProcessMonitor from './BrowserProcessMonitor.js';
import LockFileDetector from './LockFileDetector.js';

// Phase 1 imports
import { getMessageEnhancementService } from '../Services/MessageEnhancementService.js';
import { getReactionTracker } from '../Services/ReactionTracker.js';
import { getGroupManagementService } from '../Services/GroupManagementService.js';
import { getChatOrganizationService } from '../Services/ChatOrganizationService.js';
import { getAdvancedContactService } from '../Services/AdvancedContactService.js';
import { ReactionHandler } from '../WhatsAppBot/Handlers/ReactionHandler.js';
import { GroupEventHandler } from '../WhatsAppBot/Handlers/GroupEventHandler.js';

/**
 * Initialize a module with safe try/catch wrapping.
 * @param {string}   label       - Display label for logging
 * @param {Function} factory     - Async factory that returns the module instance
 * @param {Function} logBot      - Logger
 * @returns {Promise<object|null>} The initialized module, or null on failure
 */
async function safeInit(label, factory, logBot) {
  try {
    const instance = await factory();
    logBot(`  ✅ ${label}`, 'success');
    return instance;
  } catch (error) {
    logBot(`  ⚠️  ${label} initialization failed: ${error?.message || error}`, 'warn');
    return null;
  }
}

/**
 * Initialize all Phase 7 Advanced Feature modules.
 * @param {Function} logBot
 * @returns {Promise<{analyticsModule, adminConfigModule, conversationModule, reportGeneratorModule}>}
 */
export async function initializeAdvancedFeatures(logBot) {
  logBot('\n📊 Initializing Phase 7 Advanced Features...', 'info');

  const analyticsModule = await safeInit(
    'Analytics Dashboard (real-time metrics & monitoring)',
    async () => { const m = new AnalyticsDashboard(); await m.initialize(); return m; },
    logBot,
  );
  if (analyticsModule) services.register('analytics', analyticsModule);

  const adminConfigModule = await safeInit(
    'Admin Config Interface (dynamic configuration management)',
    async () => { const m = new AdminConfigInterface(); await m.initialize(); return m; },
    logBot,
  );
  if (adminConfigModule) services.register('adminConfig', adminConfigModule);

  const conversationModule = await safeInit(
    'Advanced Conversation Features (intent, sentiment, context)',
    async () => { const m = new AdvancedConversationFeatures(); await m.initialize(); return m; },
    logBot,
  );
  if (conversationModule) services.register('conversationAI', conversationModule);

  const reportGeneratorModule = await safeInit(
    'Report Generator (daily/weekly/monthly reports)',
    async () => { const m = new ReportGenerator(); await m.initialize(); return m; },
    logBot,
  );
  if (reportGeneratorModule) services.register('reportGenerator', reportGeneratorModule);

  logBot('✅ Phase 7 modules initialization complete', 'success');

  return { analyticsModule, adminConfigModule, conversationModule, reportGeneratorModule };
}

/**
 * Initialize Phase 8 Auto-Recovery System.
 *
 * @param {Object} opts
 * @param {Function}  opts.logBot
 * @param {Map}       opts.connectionManagers
 * @param {object}    opts.sharedContext
 * @param {Object}    opts.guards   - { sessionCleanupStarted, browserProcessMonitorStarted, lockFileDetectorStarted }
 * @returns {{ sessionCleanupManager, browserProcessMonitor, lockFileDetector, guards }}
 */
export function initializeAutoRecovery({ logBot, connectionManagers, sharedContext, guards }) {
  logBot('\n🔧 Initializing Phase 8 Auto-Recovery System...', 'info');

  let { sessionCleanupStarted, browserProcessMonitorStarted, lockFileDetectorStarted } = guards;
  let sessionCleanupManager = null;
  let browserProcessMonitor = null;
  let lockFileDetector = null;

  if (!sessionCleanupStarted) {
    sessionCleanupManager = new SessionCleanupManager(logBot);
    sessionCleanupManager.startAutoCleanup();
    sessionCleanupStarted = true;
    logBot('  ✅ SessionCleanupManager (auto-clean sessions every 90s)', 'success');
    sharedContext.sessionCleanupManager = sessionCleanupManager;
  }

  if (!browserProcessMonitorStarted) {
    browserProcessMonitor = new BrowserProcessMonitor(connectionManagers, logBot);
    browserProcessMonitor.startMonitoring();
    browserProcessMonitorStarted = true;
    logBot('  ✅ BrowserProcessMonitor (detect process loss every 60s)', 'success');
  }

  if (!lockFileDetectorStarted) {
    lockFileDetector = new LockFileDetector(logBot);
    lockFileDetector.startMonitoring();
    lockFileDetectorStarted = true;
    logBot('  ✅ LockFileDetector (remove stale locks every 45s)', 'success');
    sharedContext.lockFileDetector = lockFileDetector;
  }

  logBot('✅ Phase 8 Auto-Recovery System active', 'success');

  return {
    sessionCleanupManager,
    browserProcessMonitor,
    lockFileDetector,
    guards: { sessionCleanupStarted, browserProcessMonitorStarted, lockFileDetectorStarted },
  };
}

/**
 * Initialize Phase 1 whatsapp-web.js feature services and register them.
 * @param {Function} logBot
 */
export function initializePhase1Services(logBot) {
  logBot('\n🔄 Initializing Phase 1 whatsapp-web.js Features...', 'info');

  services.register('messageEnhancementService', getMessageEnhancementService());
  logBot('  ✅ Message Enhancement Service (edit, delete, react, forward)', 'success');

  services.register('reactionTracker', getReactionTracker(null));
  logBot('  ✅ Reaction Tracker Service (sentiment analysis)', 'success');

  services.register('groupManagementService', getGroupManagementService(null));
  logBot('  ✅ Group Management Service (create, manage, invite)', 'success');

  services.register('chatOrganizationService', getChatOrganizationService(null));
  logBot('  ✅ Chat Organization Service (pin, archive, mute, label)', 'success');

  services.register('advancedContactService', getAdvancedContactService(null, null));
  logBot('  ✅ Advanced Contact Service (block, status, profile, verify)', 'success');

  const reactionHandler = new ReactionHandler(null);
  services.register('reactionHandler', reactionHandler);
  logBot('  ✅ Reaction Event Handler (on message_reaction)', 'success');

  const groupEventHandler = new GroupEventHandler(null);
  services.register('groupEventHandler', groupEventHandler);
  logBot('  ✅ Group Event Handler (on group_join, group_leave, etc.)', 'success');

  logBot('📲 Phase 1 Services Ready: 40+ new WhatsApp commands available!', 'success');
  logBot('   - Message manipulation: edit, delete, react, forward, pin, star', 'info');
  logBot('   - Group operations: create groups, add/remove members, promote admins', 'info');
  logBot('   - Chat management: pin, archive, mute, label conversations', 'info');
  logBot('   - Contact features: block, status, profile, verify WhatsApp', 'info');
}
