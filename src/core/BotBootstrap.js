/**
 * ====================================================================
 * BOT BOOTSTRAP SUBSYSTEMS (Extracted from index.js — Single Purpose Law)
 * ====================================================================
 * Modular initializers for:
 *   1. Linking, Credential & Device Diagnostics Subsystems (Phase 20)
 *   2. Resilience, Monitoring, Analytics & Reporting Subsystems (Phase 29c-30)
 *
 * Adheres to:
 *   - The Single Purpose File Law (< 350 lines per module)
 *   - Continuous Deduplication & Optimization Law (PERMANENT)
 *   - ES Modules Only
 *   - ServiceRegistry singleton pattern
 *
 * @since October 2026
 */

import services from './ServiceRegistry.js';

// Phase 20 Managers
import GoogleServiceAccountManager from '../integrations/google/GoogleServiceAccountManager.js';
import GorahaServicesBridge from '../integrations/goraha/GorahaServicesBridge.js';
import ProtocolErrorRecoveryManager from '../connection/ProtocolErrorRecoveryManager.js';
import EnhancedQRCodeDisplayV2 from '../linking/EnhancedQRCodeDisplayV2.js';
import { InteractiveMasterAccountSelector } from '../accounts/InteractiveMasterAccountSelector.js';
import EnhancedWhatsAppDeviceLinkingSystem from '../linking/EnhancedWhatsAppDeviceLinkingSystem.js';
import DeviceLinkingQueue from '../linking/DeviceLinkingQueue.js';
import DeviceLinkingDiagnostics from '../linking/DeviceLinkingDiagnostics.js';
import AccountBootstrapManager from '../accounts/AccountBootstrapManager.js';
import { DeviceRecoveryManager } from '../linking/DeviceRecoveryManager.js';

// Phase 29c-30 Managers
import AutoAccountRelinkingManager from '../accounts/AutoAccountRelinkingManager.js';
import AccountConnectionMonitor from '../accounts/AccountConnectionMonitor.js';
import AutoReconnectManager from '../connection/AutoReconnectManager.js';
import CircuitBreakerManager from '../connection/CircuitBreakerManager.js';
import GracefulDegradationManager from '../connection/GracefulDegradationManager.js';
import AnalyticsManager from '../analytics/AnalyticsManager.js';
import UptimeTracker from '../analytics/UptimeTracker.js';
import ReportGenerator from '../analytics/ReportGenerator.js';
import MetricsDashboard from '../analytics/MetricsDashboard.js';
import GoogleSheetsManager from '../integrations/google/GoogleSheetsManager.js';

/**
 * Initialize Phase 20 Linking, Credential, and Diagnostic Managers.
 * 
 * @param {Object} params
 * @param {Function} params.logBot
 * @param {Object} params.sessionStateManager
 * @param {Object} params.sharedContext
 * @returns {Promise<Object>} Initialized instances
 */
export async function initLinkingAndCredentialManagers({ logBot, sessionStateManager, sharedContext }) {
  const googleServiceAccountManager = new GoogleServiceAccountManager();
  logBot('✅ GoogleServiceAccountManager initialized', 'success');
  services.register('googleServiceAccountManager', googleServiceAccountManager);
  googleServiceAccountManager.printSecuritySummary();

  const gorahaServicesBridge = new GorahaServicesBridge();
  const bridgeInitialized = await gorahaServicesBridge.initialize(googleServiceAccountManager, null);
  if (bridgeInitialized) {
    logBot('✅ GorahaServicesBridge initialized (contact stats + account validation)', 'success');
    services.register('gorahaServicesBridge', gorahaServicesBridge);
  } else {
    logBot('⚠️  GorahaServicesBridge initialization failed - Goraha commands may not work', 'warn');
  }

  const protocolErrorRecoveryManager = new ProtocolErrorRecoveryManager(logBot);
  logBot('✅ ProtocolErrorRecoveryManager initialized', 'success');
  services.register('protocolErrorRecoveryManager', protocolErrorRecoveryManager);

  const enhancedQRCodeDisplayV2 = new EnhancedQRCodeDisplayV2();
  logBot('✅ EnhancedQRCodeDisplayV2 initialized', 'success');
  services.register('enhancedQRCodeDisplayV2', enhancedQRCodeDisplayV2);
  sharedContext.QRCodeDisplay = enhancedQRCodeDisplayV2;

  const interactiveMasterAccountSelector = new InteractiveMasterAccountSelector(sessionStateManager, logBot);
  logBot('✅ InteractiveMasterAccountSelector initialized (with session recovery)', 'success');
  services.register('interactiveMasterAccountSelector', interactiveMasterAccountSelector);

  const enhancedDeviceLinkingSystem = new EnhancedWhatsAppDeviceLinkingSystem(logBot, sessionStateManager);
  logBot('✅ EnhancedWhatsAppDeviceLinkingSystem initialized (400% better linking UX)', 'success');
  services.register('enhancedDeviceLinkingSystem', enhancedDeviceLinkingSystem);
  sharedContext.enhancedDeviceLinkingSystem = enhancedDeviceLinkingSystem;

  const deviceLinkingQueue = new DeviceLinkingQueue(logBot, sessionStateManager);
  logBot('✅ DeviceLinkingQueue initialized (multi-device parallel linking)', 'success');
  services.register('deviceLinkingQueue', deviceLinkingQueue);
  sharedContext.deviceLinkingQueue = deviceLinkingQueue;

  const deviceLinkingDiagnostics = new DeviceLinkingDiagnostics(logBot);
  logBot('✅ DeviceLinkingDiagnostics initialized (intelligent error recovery)', 'success');
  services.register('deviceLinkingDiagnostics', deviceLinkingDiagnostics);
  sharedContext.deviceLinkingDiagnostics = deviceLinkingDiagnostics;

  const bootstrapManager = new AccountBootstrapManager();
  const recoveryManager = new DeviceRecoveryManager();
  logBot('✅ Phase 4 managers initialized (Bootstrap + Recovery)', 'success');
  services.register('bootstrapManager', bootstrapManager);
  services.register('recoveryManager', recoveryManager);

  return {
    googleServiceAccountManager,
    gorahaServicesBridge,
    protocolErrorRecoveryManager,
    enhancedQRCodeDisplayV2,
    interactiveMasterAccountSelector,
    enhancedDeviceLinkingSystem,
    deviceLinkingQueue,
    deviceLinkingDiagnostics,
    bootstrapManager,
    recoveryManager,
  };
}

/**
 * Initialize Phase 29c-30 Resilience, Monitoring, Analytics and Google Sheets Managers.
 * 
 * @param {Object} params
 * @param {Function} params.logBot
 * @param {Object} params.terminalHealthDashboard
 * @param {Object} params.googleServiceAccountManager
 * @returns {Promise<Object>} Initialized instances
 */
export async function initResilienceAndAnalyticsManagers({ logBot, terminalHealthDashboard, googleServiceAccountManager }) {
  const autoAccountRelinkingManager = new AutoAccountRelinkingManager({
    unifiedAccountManager: null,
    terminalDashboard: terminalHealthDashboard,
    sessionsDir: './sessions',
    maxRetries: 3,
    retryDelayMs: 3000,
  });
  logBot('✅ Phase 29c: Auto-Relinking Manager initialized', 'success');
  services.register('autoAccountRelinkingManager', autoAccountRelinkingManager);

  const accountConnectionMonitor = new AccountConnectionMonitor({
    unifiedAccountManager: null,
    terminalDashboard: terminalHealthDashboard,
    healthCheckInterval: 30000,
  });
  logBot('✅ Phase 29c: Connection Monitor initialized (30s health checks)', 'success');
  services.register('accountConnectionMonitor', accountConnectionMonitor);

  const autoReconnectManager = new AutoReconnectManager({
    accountConnectionMonitor,
    autoAccountRelinkingManager,
    terminalDashboard: terminalHealthDashboard,
    maxReconnectAttempts: 5,
    initialBackoffMs: 2000,
    monitoringIntervalMs: 5000,
  });
  await autoReconnectManager.initialize();
  logBot('✅ Phase 29d: Auto-Reconnect Manager initialized', 'success');
  services.register('autoReconnectManager', autoReconnectManager);

  const circuitBreakerManager = new CircuitBreakerManager({
    failureThreshold: 5,
    resetTimeoutMs: 30000,
    terminalDashboard: terminalHealthDashboard,
  });
  logBot('✅ Phase 29d: Circuit Breaker Manager initialized', 'success');
  services.register('circuitBreakerManager', circuitBreakerManager);

  const gracefulDegradationManager = new GracefulDegradationManager({
    accountConnectionMonitor,
    terminalDashboard: terminalHealthDashboard,
  });
  logBot('✅ Phase 29d: Graceful Degradation Manager initialized', 'success');
  services.register('gracefulDegradationManager', gracefulDegradationManager);

  const analyticsManager = new AnalyticsManager();
  await analyticsManager.initialize();
  logBot('✅ Phase 29e: AnalyticsManager initialized (real-time metrics collection)', 'success');
  services.register('analyticsManager', analyticsManager);

  const uptimeTracker = new UptimeTracker({ slaTarget: 0.99 });
  await uptimeTracker.initialize();
  logBot('✅ Phase 29e: UptimeTracker initialized (SLA compliance tracking)', 'success');
  services.register('uptimeTracker', uptimeTracker);

  const reportGenerator = new ReportGenerator(analyticsManager, uptimeTracker);
  logBot('✅ Phase 29e: ReportGenerator initialized (multi-format reports)', 'success');
  services.register('reportGenerator', reportGenerator);

  const metricsDashboard = new MetricsDashboard(analyticsManager, uptimeTracker);
  logBot('✅ Phase 29e: MetricsDashboard initialized (visual metrics display)', 'success');
  services.register('metricsDashboard', metricsDashboard);

  let googleSheetsManager = null;
  if (googleServiceAccountManager) {
    googleSheetsManager = new GoogleSheetsManager(googleServiceAccountManager);
    await googleSheetsManager.initialize('poweragent');
    logBot('✅ Phase 30: GoogleSheetsManager initialized (Google Sheets CRUD operations)', 'success');
    services.register('googleSheetsManager', googleSheetsManager);
  }

  return {
    autoAccountRelinkingManager,
    accountConnectionMonitor,
    autoReconnectManager,
    circuitBreakerManager,
    gracefulDegradationManager,
    analyticsManager,
    uptimeTracker,
    reportGenerator,
    metricsDashboard,
    googleSheetsManager,
  };
}

