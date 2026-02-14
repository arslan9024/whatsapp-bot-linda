/**
 * LockFileDetector.js
 * ====================
 * Monitors .lock files in session directories.
 * Detects and removes stale lock files that prevent browser initialization.
 * 
 * Production: Scans every 45 seconds. Removes locks older than 10 minutes.
 * Checks common Chromium lock patterns: .lock, SingletonLock, SingletonCookie, SingletonSocket.
 * 
 * @since Phase 8 - Browser Lock Auto-Recovery (February 14, 2026)
 */

import fs from 'fs';
import path from 'path';

class LockFileDetector {
  constructor(logFunc = null) {
    this.log = logFunc || console.log;
    this.sessionDir = path.join(process.cwd(), 'sessions');
    this.monitorInterval = null;
    this.isRunning = false;

    // Configuration
    this.monitorIntervalMs = 45000;         // 45 seconds
    this.staleLockAgeMs = 10 * 60 * 1000;   // 10 minutes

    // Lock file patterns used by Chromium/Puppeteer
    this.lockPatterns = ['.lock', 'SingletonLock', 'SingletonCookie', 'SingletonSocket'];

    // Statistics
    this.totalScans = 0;
    this.totalLocksRemoved = 0;
  }

  /**
   * Start monitoring for lock files
   */
  startMonitoring() {
    if (this.isRunning) {
      this.log('[LockDetector] Already running', 'info');
      return;
    }

    this.isRunning = true;
    this.log('[LockDetector] Started (checking every 45s)', 'info');

    // Run first check immediately
    this.performCheck();

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
    this.log('[LockDetector] Stopped', 'info');
  }

  /**
   * Main check logic - scan for stale lock files in all session folders
   */
  performCheck() {
    try {
      if (!fs.existsSync(this.sessionDir)) {
        return;
      }

      this.totalScans++;
      const entries = fs.readdirSync(this.sessionDir, { withFileTypes: true });
      let locksFound = 0;
      let locksRemoved = 0;

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const folderPath = path.join(this.sessionDir, entry.name);

        // Also scan subdirectories (Chromium profile folders)
        const locksInFolder = this._scanFolderForLocks(folderPath, entry.name);
        locksFound += locksInFolder.found;
        locksRemoved += locksInFolder.removed;
      }

      if (locksFound > 0) {
        this.log(`[LockDetector] Scan #${this.totalScans}: found=${locksFound}, removed=${locksRemoved}`, 'info');
      }

      this.totalLocksRemoved += locksRemoved;
    } catch (err) {
      this.log(`[LockDetector] Check error: ${err.message}`, 'warn');
    }
  }

  /**
   * Scan a folder for lock files and remove stale ones
   * @returns {{ found: number, removed: number }}
   */
  _scanFolderForLocks(folderPath, folderName) {
    let found = 0;
    let removed = 0;

    for (const lockName of this.lockPatterns) {
      try {
        const lockPath = path.join(folderPath, lockName);
        if (!fs.existsSync(lockPath)) continue;

        found++;
        const lockStats = fs.statSync(lockPath);
        const lockAgeMs = Date.now() - lockStats.mtimeMs;

        if (lockAgeMs > this.staleLockAgeMs) {
          // Remove stale lock
          try {
            fs.unlinkSync(lockPath);
          } catch (e) {
            // If unlink fails, try rmSync (for directories like SingletonLock)
            fs.rmSync(lockPath, { recursive: true, force: true });
          }
          removed++;
          this.log(`[LockDetector] Removed stale lock: ${folderName}/${lockName} (age: ${this._formatMs(lockAgeMs)})`, 'info');
        }
      } catch (err) {
        // Silent fail for individual lock files
      }
    }

    // Also scan Default/Profile subdirectories for Chromium locks
    try {
      const subDirs = ['Default', 'Profile 1', 'chrome-profile'];
      for (const subDir of subDirs) {
        const subPath = path.join(folderPath, subDir);
        if (fs.existsSync(subPath) && fs.statSync(subPath).isDirectory()) {
          const subResult = this._scanFolderForLocks(subPath, `${folderName}/${subDir}`);
          found += subResult.found;
          removed += subResult.removed;
        }
      }
    } catch (err) {
      // Silent fail
    }

    return { found, removed };
  }

  /**
   * Force remove all lock files for a specific phone number's session
   * Used by ConnectionManager during emergency recovery
   */
  forceCleanLocks(phoneNumber) {
    try {
      const possiblePaths = [
        path.join(this.sessionDir, `session-${phoneNumber}`),
        path.join(this.sessionDir, phoneNumber),
      ];

      let cleaned = 0;

      for (const sessionPath of possiblePaths) {
        if (!fs.existsSync(sessionPath)) continue;

        for (const lockName of this.lockPatterns) {
          const lockPath = path.join(sessionPath, lockName);
          if (fs.existsSync(lockPath)) {
            try {
              fs.unlinkSync(lockPath);
            } catch (e) {
              fs.rmSync(lockPath, { recursive: true, force: true });
            }
            cleaned++;
          }
        }
      }

      if (cleaned > 0) {
        this.log(`[LockDetector] Force cleaned ${cleaned} lock(s) for ${phoneNumber}`, 'info');
      }
      return cleaned > 0;
    } catch (err) {
      this.log(`[LockDetector] Force clean failed for ${phoneNumber}: ${err.message}`, 'warn');
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

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Get detector statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      sessionDir: this.sessionDir,
      totalScans: this.totalScans,
      totalLocksRemoved: this.totalLocksRemoved,
      monitorIntervalMs: this.monitorIntervalMs,
      staleLockAgeMs: this.staleLockAgeMs,
    };
  }
}

export default LockFileDetector;
