/**
 * ====================================================================
 * SESSION AUTO-HEALER & INDEXEDDB CORRUPTION RECOVERY (Pillar 6)
 * ====================================================================
 * Protects WhatsApp sessions from corrupted SQLite/IndexedDB locks and
 * crash loops without losing linking state:
 *   1. Detects common Puppeteer / Chrome corruption patterns:
 *      - "Target closed" / "Execution context was destroyed"
 *      - "Protocol error: Page.navigate timed out"
 *      - Lockfile remnants in LocalAuth directory (SingletonLock, etc.)
 *   2. Safely clears dangling Chromium locks while preserving Auth keys.
 *   3. If persistent corruption occurs, rolls back to the latest valid
 *      AES-256 encrypted session backup via SessionBackupManager.
 *   4. Adheres strictly to Law #1: NEVER kills node.exe.
 *
 * @since Development Phase — November 2026
 */

import fs from 'fs';
import path from 'path';
import { Logger } from '../core/Logger.js';
import { sessionBackupManager } from './SessionBackupManager.js';

const logger = new Logger('SessionAutoHealer');

export const KNOWN_CORRUPTIONS = [
  'Protocol error: Target closed',
  'Execution context was destroyed',
  'Session closed unexpectedly',
  'Page.navigate timed out',
  'Crashpad initialization failed',
  'SingletonLock',
];

export class SessionAutoHealer {
  constructor(options = {}) {
    this.sessionsDir = options.sessionsDir || path.resolve('sessions');
    this.backupManager = options.backupManager || sessionBackupManager;
  }

  /**
   * Determine if an error message represents recoverable corruption.
   *
   * @param {string|Error} error
   * @returns {boolean}
   */
  isRecoverableCorruption(error) {
    const msg = String(error?.message || error || '');
    return KNOWN_CORRUPTIONS.some((pat) => msg.includes(pat));
  }

  /**
   * Remove dangling lock files left behind by crashed Chromium instances.
   *
   * @param {string} clientId - e.g. "971501234567"
   * @returns {{ cleared: number, files: string[] }}
   */
  clearDanglingLocks(clientId) {
    const sessionPath = path.join(this.sessionsDir, `session-${clientId}`);
    const cleared = [];

    if (!fs.existsSync(sessionPath)) {
      return { cleared: 0, files: [] };
    }

    const lockNames = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile'];

    for (const name of lockNames) {
      const lockPath = path.join(sessionPath, name);
      if (fs.existsSync(lockPath)) {
        try {
          fs.unlinkSync(lockPath);
          cleared.push(name);
          logger.info(`🧹 Cleared dangling Chromium lock: ${lockPath}`);
        } catch (_) {
          /* lock may be held by running process */
        }
      }
    }

    return { cleared: cleared.length, files: cleared };
  }

  /**
   * Attempt full self-healing of a corrupted session directory:
   * 1. Clear dangling locks.
   * 2. If session remains damaged, restore from the latest encrypted backup.
   *
   * @param {string} clientId
   * @param {object} [options]
   * @returns {Promise<{ healed: boolean, action: string, backupUsed?: string, error?: string }>}
   */
  async healSession(clientId, options = {}) {
    logger.info(`🩹 Initiating session auto-healing for client: session-${clientId}`);

    // Step 1: Clean lockfiles
    const lockRes = this.clearDanglingLocks(clientId);
    if (lockRes.cleared > 0 && !options.forceRestore) {
      return {
        healed: true,
        action: 'CLEARED_LOCKS',
        files: lockRes.files,
      };
    }

    // Step 2: Attempt rollback from latest backup
    if (this.backupManager && typeof this.backupManager.listBackups === 'function') {
      try {
        const backups = this.backupManager.listBackups();
        if (backups.length > 0) {
          const latest = backups[0]; // sorted latest first
          const targetDir = path.join(this.sessionsDir, `session-${clientId}`);
          
          await this.backupManager.restoreBackup(latest.fileName, targetDir);

          logger.info(`✅ Successfully healed session-${clientId} using backup: ${latest.fileName}`);
          return {
            healed: true,
            action: 'RESTORED_FROM_BACKUP',
            backupUsed: latest.fileName,
          };
        }
      } catch (err) {
        logger.warn(`Backup restoration failed during auto-healing: ${err.message}`);
        return { healed: false, action: 'RESTORATION_FAILED', error: err.message };
      }
    }

    return {
      healed: false,
      action: 'NO_BACKUP_AVAILABLE',
    };
  }
}

export const sessionAutoHealer = new SessionAutoHealer();
export default sessionAutoHealer;

