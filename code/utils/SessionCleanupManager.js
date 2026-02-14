/**
 * SessionCleanupManager.js
 * ========================
 * Auto-cleanup utility for abandoned WhatsApp session folders.
 * Removes old/stale session folders to prevent browser lock conflicts.
 * 
 * Production: Scans every 90 seconds, removes sessions inactive for 30+ min
 * or older than 24 hours. Also cleans stale .lock files (10+ min old).
 * 
 * @since Phase 8 - Browser Lock Auto-Recovery (February 14, 2026)
 */

import fs from 'fs';
import path from 'path';

class SessionCleanupManager {
  constructor(logFunc = null) {
    this.log = logFunc || console.log;
    this.sessionDir = path.join(process.cwd(), 'sessions');
    this.cleanupInterval = null;
    this.isRunning = false;

    // Configuration
    this.cleanupIntervalMs = 90000;            // 90 seconds between scans
    this.maxSessionAge = 24 * 60 * 60 * 1000;  // 24 hours
    this.inactivityThreshold = 30 * 60 * 1000;  // 30 minutes
    this.staleLockAgeMs = 10 * 60 * 1000;       // 10 minutes
  }

  /**
   * Start automatic cleanup process
   */
  startAutoCleanup() {
    if (this.isRunning) {
      this.log('[SessionCleanup] Already running', 'info');
      return;
    }

    this.isRunning = true;
    this.log('[SessionCleanup] Started (cleanup every 90s)', 'info');

    // Run first cleanup immediately
    this.performCleanup();

    // Schedule recurring cleanup
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.cleanupIntervalMs);
  }

  /**
   * Stop cleanup process
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isRunning = false;
    this.log('[SessionCleanup] Stopped', 'info');
  }

  /**
   * Main cleanup logic - scan and clean session folders
   */
  performCleanup() {
    try {
      if (!fs.existsSync(this.sessionDir)) {
        return; // Nothing to clean
      }

      const entries = fs.readdirSync(this.sessionDir, { withFileTypes: true });
      let cleanedCount = 0;
      let locksRemoved = 0;
      let totalScanned = 0;

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        totalScanned++;

        const folderPath = path.join(this.sessionDir, entry.name);

        try {
          const stats = fs.statSync(folderPath);
          const folderAgeMs = Date.now() - stats.mtimeMs;

          // Check if too old or inactive
          const isTooOld = folderAgeMs > this.maxSessionAge;
          const isInactive = folderAgeMs > this.inactivityThreshold;

          if (isTooOld) {
            fs.rmSync(folderPath, { recursive: true, force: true });
            cleanedCount++;
            this.log(`[SessionCleanup] Removed old session: ${entry.name} (age: ${this._formatMs(folderAgeMs)})`, 'info');
            continue; // Folder removed, skip lock check
          }

          // Clean stale .lock files within active session folders
          const lockResult = this._cleanStaleLockFiles(folderPath);
          if (lockResult) locksRemoved++;

        } catch (err) {
          // Silent fail for individual folder errors - don't block other cleanup
        }
      }

      if (cleanedCount > 0 || locksRemoved > 0) {
        this.log(`[SessionCleanup] Cycle: scanned=${totalScanned}, removed=${cleanedCount}, locks=${locksRemoved}`, 'info');
      }
    } catch (err) {
      this.log(`[SessionCleanup] Error: ${err.message}`, 'warn');
    }
  }

  /**
   * Remove stale .lock files within a session folder
   * @returns {boolean} true if lock was removed
   */
  _cleanStaleLockFiles(folderPath) {
    try {
      // Check common lock file patterns
      const lockPatterns = ['.lock', 'SingletonLock', 'SingletonCookie', 'SingletonSocket'];

      for (const lockName of lockPatterns) {
        const lockPath = path.join(folderPath, lockName);
        if (fs.existsSync(lockPath)) {
          const lockStats = fs.statSync(lockPath);
          const lockAgeMs = Date.now() - lockStats.mtimeMs;

          if (lockAgeMs > this.staleLockAgeMs) {
            fs.unlinkSync(lockPath);
            this.log(`[SessionCleanup] Removed stale lock: ${path.basename(folderPath)}/${lockName} (age: ${this._formatMs(lockAgeMs)})`, 'info');
            return true;
          }
        }
      }
      return false;
    } catch (err) {
      return false; // Silent fail
    }
  }

  /**
   * Force clean a specific phone number's session folder
   * Used by ConnectionManager during browser lock recovery
   */
  forceCleanSession(phoneNumber) {
    try {
      // Try both naming conventions
      const possiblePaths = [
        path.join(this.sessionDir, `session-${phoneNumber}`),
        path.join(this.sessionDir, phoneNumber),
      ];

      let cleaned = false;
      for (const sessionPath of possiblePaths) {
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true });
          this.log(`[SessionCleanup] Force cleaned session: ${path.basename(sessionPath)}`, 'info');
          cleaned = true;
        }
      }
      return cleaned;
    } catch (err) {
      this.log(`[SessionCleanup] Force clean failed for ${phoneNumber}: ${err.message}`, 'warn');
      return false;
    }
  }

  /**
   * Format milliseconds as human-readable string
   */
  _formatMs(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Get cleanup statistics for diagnostics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      sessionDir: this.sessionDir,
      cleanupIntervalMs: this.cleanupIntervalMs,
      maxSessionAge: this.maxSessionAge,
      inactivityThreshold: this.inactivityThreshold,
      staleLockAgeMs: this.staleLockAgeMs,
    };
  }
}

export default SessionCleanupManager;
