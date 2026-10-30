/**
 * ====================================================================
 * GRACEFUL SHUTDOWN (Extracted from index.js — Phase 12)
 * ====================================================================
 * Handles SIGINT (Ctrl+C) and SIGTERM (process managers, Docker, PM2).
 *
 * Features:
 *   - 15-second timeout guard prevents hanging shutdown
 *   - Double-shutdown prevention
 *   - Destroys connection managers (listeners, browser processes)
 *   - Saves session states
 *   - Closes all WhatsApp connections
 *   - Closes database connections
 *
 * @since Phase 12 — February 14, 2026
 */

import services from './ServiceRegistry.js';

const SHUTDOWN_TIMEOUT_MS = 15_000; // 15s max for graceful shutdown
let isShuttingDown = false;

/**
 * Creates a graceful shutdown handler bound to the given bot state.
 *
 * @param {Object} deps
 * @param {Function}  deps.logBot
 * @param {object}    deps.sessionStateManager
 * @param {object}    deps.accountHealthMonitor
 * @param {Map}       deps.connectionManagers
 * @param {Map}       deps.accountClients
 * @param {Array}     deps.allInitializedAccounts
 * @param {object|null} deps.sessionCleanupManager
 * @param {object|null} deps.browserProcessMonitor
 * @param {object|null} deps.lockFileDetector
 * @param {Function}    deps.clearAccounts   - () => void  (resets the mutable array)
 * @returns {Function}  gracefulShutdown(signal)
 */
export function createGracefulShutdown(deps) {
  const {
    logBot,
    sessionStateManager,
    getSessionStateManager = () => sessionStateManager,
    accountHealthMonitor,
    connectionManagers,
    accountClients,
    allInitializedAccounts,
    sessionCleanupManager,
    browserProcessMonitor,
    lockFileDetector,
    clearAccounts,
    closeCampaigns,
    stopSessionRecovery,
  } = deps;

  return async function gracefulShutdown(signal = 'UNKNOWN') {
    if (isShuttingDown) {
      logBot(`Shutdown already in progress (${signal} ignored)`, 'warn');
      return;
    }
    isShuttingDown = true;

    console.log('\n');
    logBot(`Received ${signal} - Initiating graceful shutdown...`, 'warn');

    const forceExitTimer = setTimeout(() => {
      logBot(`⚠️  Shutdown timeout (${SHUTDOWN_TIMEOUT_MS / 1000}s) exceeded. Force exiting...`, 'error');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExitTimer.unref();

    try {
      stopSessionRecovery?.();
      // Finish any in-flight campaign recipient before closing its client.
      await closeCampaigns?.();
      await Promise.all([...connectionManagers.values()].map(manager => manager.persistenceQueue));
      const stateManager = getSessionStateManager();
      if (stateManager) {
        for (const [phoneNumber, state] of Object.entries(stateManager.state?.accounts || {})) {
          const saved = await stateManager.saveDeviceMetadata(phoneNumber, {
            ...state, isActive: false,
            status: ['logged_out', 'auth_failed'].includes(state.status) ? state.status : 'offline',
          });
          if (!saved) logBot(`Could not persist shutdown state for ${phoneNumber}`, 'error');
        }
      }

      // 0. Stop Phase 8 auto-recovery systems
      logBot('Stopping auto-recovery systems...', 'info');
      if (sessionCleanupManager) sessionCleanupManager.stop();
      if (browserProcessMonitor) browserProcessMonitor.stop();
      if (lockFileDetector) lockFileDetector.stop();
      const greetingService = services.get("dailyMasterGreetingService");
      if (greetingService?.stop) greetingService.stop();

      // 0A. Stop health monitoring
      if (accountHealthMonitor) {
        logBot('Stopping health monitoring...', 'info');
        accountHealthMonitor.stopHealthChecks();
      }

      // 0B. Destroy connection managers
      const closedClients = new Set();
      logBot(`Destroying connection managers for ${connectionManagers.size} account(s)`, 'info');
      for (const [phoneNumber, manager] of connectionManagers.entries()) {
        try {
          logBot(`  Cleaning up ${phoneNumber}...`, 'info');
          await manager.destroy();
          closedClients.add(manager.client);
        } catch (_) {
          logBot(`  Warning: Error destroying manager for ${phoneNumber}`, 'warn');
        }
      }
      connectionManagers.clear();

      // 2. Close all WhatsApp connections
      logBot(`Closing ${allInitializedAccounts.length} WhatsApp connection(s)`, 'info');
      for (const [phoneNumber, client] of accountClients.entries()) {
        if (closedClients.has(client)) continue;
        try {
          logBot(`  Disconnecting ${phoneNumber}...`, 'info');
          client.removeAllListeners();
          await client.destroy();
        } catch (_) {
          logBot(`  Warning: Error closing ${phoneNumber}`, 'warn');
        }
      }
      accountClients.clear();

      // 4. Database cleanup
      logBot('Closing database connections', 'info');
      const dbCtx = services.get('databaseContext');
      if (dbCtx && dbCtx.close) {
        try {
          await dbCtx.close();
        } catch (_) {
          // Ignore database close errors
        }
      }

      // 5. Clear mutable references
      clearAccounts();

      logBot('✅ Graceful shutdown complete', 'success');
    } catch (error) {
      logBot(`Error during shutdown: ${error.message}`, 'error');
    }

    clearTimeout(forceExitTimer);
    logBot('Bot stopped. Nodemon will restart on code changes...', 'info');
    process.exit(0);
  };
}

/**
 * Install SIGINT + SIGTERM listeners.
 * @param {Function} shutdownFn - The function returned by createGracefulShutdown
 */
export function installShutdownHandlers(shutdownFn) {
  process.on('SIGINT', () => shutdownFn('SIGINT'));
  process.on('SIGTERM', () => shutdownFn('SIGTERM'));
}
