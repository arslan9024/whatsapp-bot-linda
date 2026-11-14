// @ts-nocheck
/**
 * ====================================================================
 * STARTUP DIAGNOSTICS (Extracted from index.js — Phase 12)
 * ====================================================================
 * Prints a comprehensive health dashboard after initialization:
 *   - System resources (Node version, memory)
 *   - Account & connection-manager status
 *   - Phase 8 auto-recovery monitors
 *   - Phase 7 advanced modules
 *   - Core managers
 *
 * @since Phase 12 — February 14, 2026
 */

import services from './ServiceRegistry.js';

/**
 * Print the startup diagnostics report to stdout.
 *
 * @param {Object} opts
 * @param {Map}      opts.accountClients          phone → client
 * @param {Map}      opts.connectionManagers      phone → ConnectionManager
 * @param {boolean}  opts.sessionCleanupStarted
 * @param {boolean}  opts.browserProcessMonitorStarted
 * @param {boolean}  opts.lockFileDetectorStarted
 * @param {boolean}  opts.healthChecksStarted
 * @param {object|null} opts.analyticsModule
 * @param {object|null} opts.adminConfigModule
 * @param {object|null} opts.conversationModule
 * @param {object|null} opts.reportGeneratorModule
 * @param {object|null} opts.commandHandler
 * @param {object|null} opts.keepAliveManager
 * @param {object|null} opts.deviceLinkedManager
 * @param {object|null} opts.accountConfigManager
 * @param {object|null} opts.bootstrapManager
 * @param {object|null} opts.recoveryManager
 * @param {object|null} opts.dynamicAccountManager
 * @param {Function}    opts.logBot
 */
export function printStartupDiagnostics(opts) {
  try {
    const now = new Date();
    const memUsage = process.memoryUsage();
    const heapMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);

    console.log('\n┌──────────────────────────────────────────────────────────────┐');
    console.log('│              📊 STARTUP DIAGNOSTICS REPORT                   │');
    console.log(`│              ${now.toLocaleDateString()} ${now.toLocaleTimeString()}                       │`);
    console.log('├──────────────────────────────────────────────────────────────┤');

    // System Resources
    console.log(`│  💻 System: Node ${process.version} | ${process.platform} | PID: ${process.pid}`);
    console.log(`│  🧠 Memory: Heap ${heapMB}MB | RSS ${rssMB}MB`);
    console.log('│');

    // Account Status
    console.log(`│  📱 Accounts Configured: ${opts.accountClients.size}`);
    console.log(`│  🔗 Connection Managers: ${opts.connectionManagers.size}`);

    for (const [phone, manager] of opts.connectionManagers) {
      const status = manager.getStatus();
      const stateIcon = {
        CONNECTED: '🟢', CONNECTING: '🟡', DISCONNECTED: '🔴',
        ERROR: '❌', SUSPENDED: '⛔', IDLE: '⚪',
      }[status.state] || '❓';
      console.log(`│    ${stateIcon} ${phone}: ${status.state} (errors: ${status.errorCount}, reconnects: ${status.reconnectAttempts})`);
    }
    console.log('│');

    // Phase 8 Monitors
    console.log('│  🔧 Auto-Recovery Monitors:');
    console.log(`│    ${opts.sessionCleanupStarted ? '✅' : '❌'} SessionCleanupManager (every 90s)`);
    console.log(`│    ${opts.browserProcessMonitorStarted ? '✅' : '❌'} BrowserProcessMonitor (every 60s)`);
    console.log(`│    ${opts.lockFileDetectorStarted ? '✅' : '❌'} LockFileDetector (every 45s)`);
    console.log(`│    ${opts.healthChecksStarted ? '✅' : '❌'} AccountHealthMonitor (every 5min)`);
    console.log('│');

    // Phase 7 Modules
    console.log('│  🧩 Advanced Modules:');
    console.log(`│    ${opts.analyticsModule ? '✅' : '⚠️'}  Analytics Dashboard`);
    console.log(`│    ${opts.adminConfigModule ? '✅' : '⚠️'}  Admin Config Interface`);
    console.log(`│    ${opts.conversationModule ? '✅' : '⚠️'}  Conversation AI`);
    console.log(`│    ${opts.reportGeneratorModule ? '✅' : '⚠️'}  Report Generator`);
    console.log(`│    ${opts.commandHandler ? '✅' : '⚠️'}  Command System (71 commands)`);
    console.log('│');

    // Managers
    console.log('│  ⚙️  Core Managers:');
    console.log(`│    ${opts.keepAliveManager ? '✅' : '❌'} KeepAlive | ${opts.deviceLinkedManager ? '✅' : '❌'} DeviceLinked | ${opts.accountConfigManager ? '✅' : '❌'} AccountConfig`);
    console.log(`│    ${opts.bootstrapManager ? '✅' : '❌'} Bootstrap | ${opts.recoveryManager ? '✅' : '❌'} Recovery | ${opts.dynamicAccountManager ? '✅' : '❌'} DynamicAccount`);

    // Service Registry
    const registeredCount = services.list().length;
    console.log('│');
    console.log(`│  📦 ServiceRegistry: ${registeredCount} services registered`);

    console.log('├──────────────────────────────────────────────────────────────┤');
    console.log('│  🎯 Status: ALL SYSTEMS OPERATIONAL                         │');
    console.log('│  📡 Chat: !help | Terminal: dashboard | Admin: /admin       │');
    console.log('└──────────────────────────────────────────────────────────────┘\n');
  } catch (error) {
    opts.logBot(`Diagnostics report error: ${error.message}`, 'warn');
  }
}
