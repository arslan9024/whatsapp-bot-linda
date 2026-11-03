/**
 * @file Batch11MegaUpgrades.test.js
 * @description Unit tests for Mega Batch 11 (Upgrades 141-155).
 */

import { RegulatoryComplianceExporter } from '../../src/core/RegulatoryComplianceExporter.js';
import { ZombieBrowserReaper } from '../../src/devops/ZombieBrowserReaper.js';
import { SessionAutoHealer } from '../../src/devops/SessionAutoHealer.js';
import { MemoryLeakCanaryGuard } from '../../src/devops/MemoryLeakCanaryGuard.js';
import { PrometheusMetricsExporter } from '../../src/devops/PrometheusMetricsExporter.js';
import { HealthcheckPingRouter } from '../../src/devops/HealthcheckPingRouter.js';
import { DiskSpaceAutoPruner } from '../../src/devops/DiskSpaceAutoPruner.js';
import { DatabaseIndexOptimizer } from '../../src/devops/DatabaseIndexOptimizer.js';
import { HotReloadingManager } from '../../src/devops/HotReloadingManager.js';
import { GracefulShutdownOrchestrator } from '../../src/devops/GracefulShutdownOrchestrator.js';
import { CrashLoopBackoffDetector } from '../../src/devops/CrashLoopBackoffDetector.js';
import { ScratchGarbageCollector } from '../../src/devops/ScratchGarbageCollector.js';
import { EventLoopLagMonitor } from '../../src/devops/EventLoopLagMonitor.js';
import { DynamicLogLevelSwitcher } from '../../src/devops/DynamicLogLevelSwitcher.js';
import { DeadLetterQueueInspector } from '../../src/devops/DeadLetterQueueInspector.js';

describe('Mega Batch 11 (Upgrades 141–155) Test Suite', () => {
  // Upgrade 141
  test('Upgrade 141: RegulatoryComplianceExporter compiles TDRA/DLD audit report', () => {
    const exporter = new RegulatoryComplianceExporter();
    const rep = exporter.generateComplianceReport({
      reportingPeriod: '2026-Q4',
      consentLogs: [{ active: true }, { active: false }],
      optOutLogs: [{ phone: '+971501112233', date: '2026-11-01' }],
      messageVolumeStats: { totalOutbound: 1500 }
    });

    expect(rep.reportId).toContain('REG_AUDIT_2026-Q4');
    expect(rep.summary.totalOutboundMessages).toBe(1500);
    expect(rep.summary.activeConsentCount).toBe(1);
    expect(rep.summary.optOutRequestsCount).toBe(1);
  });

  // Upgrade 142
  test('Upgrade 142: ZombieBrowserReaper targets strictly Chrome and NEVER kills node.exe', () => {
    const reaper = new ZombieBrowserReaper();

    // Crucial safety check
    expect(reaper.isSafeToReap('node.exe')).toBe(false);
    expect(reaper.isSafeToReap('node')).toBe(false);
    expect(reaper.isSafeToReap('nodemon')).toBe(false);
    expect(reaper.isSafeToReap('chrome.exe')).toBe(true);
    expect(reaper.isSafeToReap('chromium')).toBe(true);

    const filtered = reaper.filterSafeZombieProcesses([
      { pid: 101, name: 'node.exe' },
      { pid: 102, name: 'chrome.exe' }
    ]);
    expect(filtered.length).toBe(1);
    expect(filtered[0].pid).toBe(102);

    expect(reaper.getReapCommand('win32')).toContain('taskkill /F /IM chrome.exe');
    expect(reaper.getReapCommand('win32')).not.toContain('node.exe');
  });

  // Upgrade 143
  test('Upgrade 143: SessionAutoHealer detects lock files and preserves sacred credentials', () => {
    const healer = new SessionAutoHealer();
    const files = [
      'sessions/session-linda/Default/SingletonLock',
      'sessions/session-linda/Default/IndexedDB/leveldb',
      'sessions/session-linda/Default/SingletonSocket'
    ];

    const stale = healer.detectStaleLocks(files);
    expect(stale.length).toBe(2);

    const plan = healer.planHealing('sessions/session-linda', files);
    expect(plan.safeToHeal).toBe(true);
    expect(plan.hasCredentials).toBe(true);
    expect(plan.staleLocksCount).toBe(2);
  });

  // Upgrade 144
  test('Upgrade 144: MemoryLeakCanaryGuard evaluates memory status and alerts on high heap', () => {
    const canary = new MemoryLeakCanaryGuard({ heapThresholdPercent: 80, rssLimitMb: 1000 });

    const healthy = canary.evaluateMemory({ heapUsed: 50 * 1024 * 1024, heapTotal: 100 * 1024 * 1024, rss: 200 * 1024 * 1024 });
    expect(healthy.status).toBe('OK');

    const critical = canary.evaluateMemory({ heapUsed: 95 * 1024 * 1024, heapTotal: 100 * 1024 * 1024, rss: 1200 * 1024 * 1024 });
    expect(critical.status).toBe('CRITICAL');
  });

  // Upgrade 145
  test('Upgrade 145: PrometheusMetricsExporter renders standard prometheus lines', () => {
    const prom = new PrometheusMetricsExporter();
    prom.incrementCounter('linda_messages_sent_total', 42);
    prom.setGauge('linda_queue_depth', 5);

    const text = prom.renderMetrics();
    expect(text).toContain('# TYPE linda_messages_sent_total counter');
    expect(text).toContain('linda_messages_sent_total 42');
    expect(text).toContain('linda_queue_depth 5');
  });

  // Upgrade 146
  test('Upgrade 146: HealthcheckPingRouter generates health reports', () => {
    const router = new HealthcheckPingRouter(Date.now() - 5000);
    const rep = router.getHealthReport({ dbConnected: true, connectedAccounts: 2 });

    expect(rep.status).toBe('healthy');
    expect(rep.uptimeSeconds).toBeGreaterThanOrEqual(5);
    expect(rep.checks.activeAccounts).toBe(2);
  });

  // Upgrade 147
  test('Upgrade 147: DiskSpaceAutoPruner identifies old logs and media while protecting sessions', () => {
    const pruner = new DiskSpaceAutoPruner({ logRetentionDays: 14, tempMediaRetentionHours: 48 });
    const now = Date.now();

    const files = [
      { path: 'logs/old_out.log', type: 'log', mtimeMs: now - 20 * 86400000, sizeBytes: 5000 },
      { path: 'logs/today.log', type: 'log', mtimeMs: now - 1 * 86400000, sizeBytes: 2000 },
      { path: 'sessions/session-linda/Default/Cookies', type: 'session', mtimeMs: now - 50 * 86400000, sizeBytes: 9000 },
      { path: 'data/media/old_cache.mp3', type: 'media', mtimeMs: now - 60 * 3600000, sizeBytes: 4000 }
    ];

    const result = pruner.evaluatePrunableFiles(files, now);
    expect(result.count).toBe(2); // old_out.log and old_cache.mp3
    expect(result.bytesReclaimable).toBe(9000);
    expect(result.prunableFiles.some(f => f.path.includes('sessions'))).toBe(false);
  });

  // Upgrade 148
  test('Upgrade 148: DatabaseIndexOptimizer audits missing indexes on collections', () => {
    const optimizer = new DatabaseIndexOptimizer();
    const existing = [{ name: 'idx_contacts_phone_unique', key: { phone: 1 } }];

    const audit = optimizer.auditCollection('contacts', existing);
    expect(audit.optimal).toBe(false);
    expect(audit.missingIndexes.length).toBe(1);
    expect(audit.missingIndexes[0].name).toBe('idx_contacts_triage');
  });

  // Upgrade 149
  test('Upgrade 149: HotReloadingManager updates configs dynamically and triggers hooks', () => {
    const hmr = new HotReloadingManager();
    hmr.registerModule('templates', { welcome: 'Hello!' });

    let notified = null;
    hmr.onReload('templates', (newCfg) => { notified = newCfg; });

    const res = hmr.reload('templates', { welcome: 'Welcome to Dubai!' });
    expect(res.success).toBe(true);
    expect(hmr.getConfig('templates').welcome).toBe('Welcome to Dubai!');
    expect(notified.welcome).toBe('Welcome to Dubai!');
  });

  // Upgrade 150
  test('Upgrade 150: GracefulShutdownOrchestrator runs registered cleanup tasks', async () => {
    const orchestrator = new GracefulShutdownOrchestrator({ timeoutMs: 1000 });
    let drained = false;

    orchestrator.registerCleanupTask('drain_queues', async () => {
      drained = true;
    });

    const report = await orchestrator.executeShutdown();
    expect(report.completed).toContain('drain_queues');
    expect(drained).toBe(true);
  });

  // Upgrade 151
  test('Upgrade 151: CrashLoopBackoffDetector calculates exponential backoff delay', () => {
    const detector = new CrashLoopBackoffDetector({ maxCrashesBeforeBackoff: 3, baseBackoffSeconds: 10 });
    const now = Date.now();

    expect(detector.recordCrash(now).inCrashLoop).toBe(false);
    expect(detector.recordCrash(now + 100).inCrashLoop).toBe(false);
    const loop = detector.recordCrash(now + 200);
    expect(loop.inCrashLoop).toBe(true);
    expect(loop.backoffSeconds).toBe(10);
  });

  // Upgrade 152
  test('Upgrade 152: ScratchGarbageCollector filters temporary files and excludes sessions', () => {
    const collector = new ScratchGarbageCollector({ maxAgeHours: 24 });
    const now = Date.now();

    const files = [
      { path: 'data/scratch/temp_voice.wav', mtimeMs: now - 30 * 3600000, sizeBytes: 1024 },
      { path: 'sessions/session-linda/scratch.txt', mtimeMs: now - 50 * 3600000, sizeBytes: 1024 },
      { path: 'cache/thumb.png', mtimeMs: now - 10 * 3600000, sizeBytes: 1024 }
    ];

    const prunable = collector.collectGarbage(files, now);
    expect(prunable.length).toBe(1);
    expect(prunable[0].path).toBe('data/scratch/temp_voice.wav');
  });

  // Upgrade 153
  test('Upgrade 153: EventLoopLagMonitor samples lag and calculates statistics', () => {
    const monitor = new EventLoopLagMonitor({ thresholdMs: 100 });

    const normal = monitor.recordSample(15);
    expect(normal.status).toBe('NORMAL');

    const blocked = monitor.recordSample(150);
    expect(blocked.status).toBe('BLOCKED');
    expect(blocked.isWarning).toBe(true);

    const stats = monitor.getLagStatistics();
    expect(stats.totalSamples).toBe(2);
    expect(stats.avgLagMs).toBe(82.5);
  });

  // Upgrade 154
  test('Upgrade 154: DynamicLogLevelSwitcher alters logging levels dynamically', () => {
    const switcher = new DynamicLogLevelSwitcher('info');
    expect(switcher.shouldLog('debug')).toBe(false);
    expect(switcher.shouldLog('info')).toBe(true);
    expect(switcher.shouldLog('error')).toBe(true);

    switcher.setLevel('debug');
    expect(switcher.shouldLog('debug')).toBe(true);
  });

  // Upgrade 155
  test('Upgrade 155: DeadLetterQueueInspector enqueues, requeues, and discards items', () => {
    const dlq = new DeadLetterQueueInspector();
    const id = dlq.enqueueFailed({
      recipientJid: '971501234567@s.whatsapp.net',
      messageContent: 'Test',
      errorReason: 'Rate limit hit'
    });

    expect(dlq.listFailed().length).toBe(1);
    const requeued = dlq.requeueItem(id);
    expect(requeued.status).toBe('REQUEUED');
    expect(requeued.retryCount).toBe(1);

    expect(dlq.discardItem(id)).toBe(true);
    expect(dlq.listFailed().length).toBe(0);
  });
});
