/**
 * BrowserProcessMonitor.js
 * ========================
 * Monitors Chrome/Chromium browser processes to detect unexpected losses.
 * If a ConnectionManager shows CONNECTED state but browser process is gone,
 * triggers automatic recovery (destroy + reconnect).
 * 
 * Production: Checks every 60 seconds, platform-aware (Windows/Linux/Mac).
 * 
 * @since Phase 8 - Browser Lock Auto-Recovery (February 14, 2026)
 */

import { execSync } from 'child_process';
import os from 'os';

class BrowserProcessMonitor {
  constructor(connectionManagers = new Map(), logFunc = null) {
    this.connectionManagers = connectionManagers; // Reference to global Map
    this.log = logFunc || console.log;
    this.monitorInterval = null;
    this.isRunning = false;
    this.platform = os.platform();

    // Configuration
    this.monitorIntervalMs = 60000;  // 60 seconds
    this.processCheckTimeoutMs = 5000; // 5 second timeout for process checks

    // Statistics
    this.totalChecks = 0;
    this.totalRecoveries = 0;
    this.lastCheckTime = null;
  }

  /**
   * Start monitoring browser processes
   */
  startMonitoring() {
    if (this.isRunning) {
      this.log('[BrowserMonitor] Already running', 'info');
      return;
    }

    this.isRunning = true;
    this.log(`[BrowserMonitor] Started (checking every 60s on ${this.platform})`, 'info');

    // Run first check after a delay (allow initial startup to complete)
    setTimeout(() => {
      if (this.isRunning) this.performCheck();
    }, 30000); // 30s initial delay

    // Schedule recurring checks
    this.monitorInterval = setInterval(() => {
      this.performCheck();
    }, this.monitorIntervalMs);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isRunning = false;
    this.log('[BrowserMonitor] Stopped', 'info');
  }

  /**
   * Main check logic - verify all active managers have running browser processes
   */
  performCheck() {
    try {
      this.totalChecks++;
      this.lastCheckTime = new Date().toISOString();

      let checkCount = 0;
      let connectedCount = 0;
      let recoveredCount = 0;

      for (const [phoneNumber, manager] of this.connectionManagers) {
        checkCount++;

        // Only check managers in CONNECTED state
        if (manager.state !== 'CONNECTED') {
          continue;
        }
        connectedCount++;

        // Check if the client's browser process is alive
        const hasProcess = this._verifyClientProcess(manager.client);

        if (!hasProcess) {
          this.log(`[BrowserMonitor] ⚠️  Browser process lost for ${phoneNumber} (state: CONNECTED)`, 'warn');

          try {
            if (typeof manager.handleBrowserProcessLost === 'function') {
              manager.handleBrowserProcessLost('process_monitor_detected');
              recoveredCount++;
              this.totalRecoveries++;
              this.log(`[BrowserMonitor] Recovery triggered for ${phoneNumber}`, 'info');
            } else {
              // Fallback: use destroy + scheduleReconnect
              this.log(`[BrowserMonitor] Fallback recovery for ${phoneNumber}`, 'warn');
              manager.setState('DISCONNECTED');
              manager.scheduleReconnect();
              recoveredCount++;
              this.totalRecoveries++;
            }
          } catch (err) {
            this.log(`[BrowserMonitor] Recovery failed for ${phoneNumber}: ${err.message}`, 'error');
          }
        }
      }

      // Only log if there were connected managers to check
      if (connectedCount > 0 && recoveredCount > 0) {
        this.log(`[BrowserMonitor] Check #${this.totalChecks}: ${connectedCount} connected, ${recoveredCount} recoveries`, 'info');
      }
    } catch (err) {
      this.log(`[BrowserMonitor] Check error: ${err.message}`, 'warn');
    }
  }

  /**
   * Verify if a WhatsApp client's browser process is still running
   * Uses multiple detection strategies for reliability
   */
  _verifyClientProcess(client) {
    if (!client) return false;

    try {
      // Strategy 1: Check Puppeteer browser reference
      if (client.pupBrowser) {
        const browserProcess = client.pupBrowser.process();
        if (browserProcess && browserProcess.pid) {
          return this._pidExists(browserProcess.pid);
        }
      }

      // Strategy 2: Check if client reports connected
      if (client.info && client.info.wid) {
        return true; // Client has active session info
      }

      // Strategy 3: Try getState (might throw if disconnected)
      try {
        const state = client.getState && client.getState();
        if (state === 'CONNECTED') return true;
      } catch (e) {
        // getState threw - process likely dead
      }

      return false;
    } catch (err) {
      // If any check throws, assume process is gone
      return false;
    }
  }

  /**
   * Check if a process ID is still running (platform-aware)
   */
  _pidExists(pid) {
    try {
      if (this.platform === 'win32') {
        const output = execSync(
          `tasklist /FI "PID eq ${pid}" /NH`,
          { timeout: this.processCheckTimeoutMs, stdio: ['pipe', 'pipe', 'pipe'] }
        ).toString();
        return output.includes(pid.toString());
      } else {
        // Linux/Mac: kill -0 returns 0 if process exists
        execSync(`kill -0 ${pid}`, { stdio: 'pipe' });
        return true;
      }
    } catch (err) {
      return false;
    }
  }

  /**
   * Get monitor statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      platform: this.platform,
      totalChecks: this.totalChecks,
      totalRecoveries: this.totalRecoveries,
      lastCheckTime: this.lastCheckTime,
      managersTracked: this.connectionManagers.size,
    };
  }
}

export default BrowserProcessMonitor;
