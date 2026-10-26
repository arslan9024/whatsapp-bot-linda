/**
 * SessionLockManager.js
 * 
 * File-based atomic locking mechanism for multi-account session initialization
 * Prevents concurrent initialization of the same account across restarts
 * 
 * Features:
 * - File-based locking (no external dependencies like Redis)
 * - Atomic lock/unlock operations
 * - Automatic timeout + force-unlock safeguard
 * - Per-account lock management
 * - Lock history tracking
 * 
 * Version: 1.0
 * Created: February 17, 2026
 * Status: Production Ready - Workstream 1
 */

import fs from "fs/promises";
import path from "path";
import { existsSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../../");
const LOCKS_DIR = path.join(PROJECT_ROOT, ".locks");
const LOCK_TIMEOUT_MS = 30000; // 30 second timeout (force unlock)
const LOCK_POLL_INTERVAL_MS = 100; // Check every 100ms
const LOCK_POLL_MAX_WAIT_MS = 60000; // Max 60 seconds to wait

class SessionLockManager {
  constructor() {
    this.locks = new Map(); // Map of accountId -> { lockId, timestamp, processId }
    this.initialized = false;
  }

  /**
   * Initialize lock directory
   */
  async initialize() {
    try {
      if (this.initialized) return true;

      // Create locks directory if it doesn't exist
      await fs.mkdir(LOCKS_DIR, { recursive: true });

      // Clean up stale locks from previous runs (>1 hour old)
      await this._cleanupStaleLocks();

      this.initialized = true;
      console.log("✅ SessionLockManager initialized");
      return true;
    } catch (error) {
      console.error(`❌ SessionLockManager initialization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Acquire lock for account initialization (with waiting)
   * @param {string} accountId - Account identifier (phone number or ID)
   * @param {number} maxWaitMs - Max time to wait for lock (default: 60s)
   * @returns {Promise<boolean>} - true if lock acquired, false if timeout
   */
  async acquireLock(accountId, maxWaitMs = LOCK_POLL_MAX_WAIT_MS) {
    const startTime = Date.now();
    const lockId = this._generateLockId();

    try {
      while (true) {
        // Try to acquire lock
        const acquired = await this._tryAcquireLock(accountId, lockId);

        if (acquired) {
          // Lock acquired successfully
          this.locks.set(accountId, {
            lockId,
            timestamp: Date.now(),
            processId: process.pid,
          });

          console.log(`🔒 Lock acquired for ${accountId} (ID: ${lockId.slice(0, 8)}...)`);
          return true;
        }

        // Check if we've exceeded max wait time
        if (Date.now() - startTime > maxWaitMs) {
          console.warn(`⏱️ Lock acquisition timeout for ${accountId} after ${maxWaitMs}ms`);
          return false;
        }

        // Check if existing lock is stale (>30s) - force unlock
        const existingLock = await this._readLockFile(accountId);
        if (existingLock && Date.now() - existingLock.timestamp > LOCK_TIMEOUT_MS) {
          console.warn(`🔓 Forcing stale lock removal for ${accountId}`);
          await this._releaseLockFile(accountId);
          // Try again
          continue;
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, LOCK_POLL_INTERVAL_MS));
      }
    } catch (error) {
      console.error(`❌ Lock acquisition failed for ${accountId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Release lock for account
   * @param {string} accountId - Account identifier
   * @returns {Promise<boolean>} - true if released, false if error
   */
  async releaseLock(accountId) {
    try {
      const lock = this.locks.get(accountId);

      if (!lock) {
        console.warn(`⚠️ Attempted to release non-existent lock for ${accountId}`);
        return false;
      }

      // Verify this process owns the lock (security check)
      const existingLock = await this._readLockFile(accountId);
      if (existingLock && existingLock.processId !== process.pid) {
        console.error(`🚫 Lock owned by different process (${existingLock.processId}). Cannot release.`);
        return false;
      }

      // Remove lock
      await this._releaseLockFile(accountId);
      this.locks.delete(accountId);

      console.log(`🔓 Lock released for ${accountId}`);
      return true;
    } catch (error) {
      console.error(`❌ Lock release failed for ${accountId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if lock is held for account
   * @param {string} accountId - Account identifier
   * @returns {Promise<boolean>} - true if locked, false otherwise
   */
  async isLocked(accountId) {
    try {
      const lockPath = path.join(LOCKS_DIR, `${this._escapeLockPath(accountId)}.lock`);
      return existsSync(lockPath);
    } catch (error) {
      console.error(`❌ Error checking lock status for ${accountId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get lock info for account
   * @param {string} accountId - Account identifier
   * @returns {Promise<object|null>} - Lock info or null if not locked
   */
  async getLockInfo(accountId) {
    try {
      return await this._readLockFile(accountId);
    } catch (error) {
      console.error(`❌ Error reading lock info for ${accountId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get all active locks
   * @returns {Promise<object>} - Map of accountId -> lock info
   */
  async getAllLocks() {
    try {
      const locks = {};

      if (!existsSync(LOCKS_DIR)) {
        return locks;
      }

      const files = await fs.readdir(LOCKS_DIR);

      for (const file of files) {
        if (file.endsWith(".lock")) {
          const accountId = this._unescapeLockPath(file.replace(".lock", ""));
          locks[accountId] = await this._readLockFile(accountId);
        }
      }

      return locks;
    } catch (error) {
      console.error(`❌ Error reading all locks: ${error.message}`);
      return {};
    }
  }

  /**
   * Force release lock (dangerous - use only for stuck locks)
   * @param {string} accountId - Account identifier
   * @returns {Promise<boolean>} - true if released
   */
  async forceReleaseLock(accountId) {
    try {
      console.warn(`⚠️ Force releasing lock for ${accountId}`);
      await this._releaseLockFile(accountId);
      this.locks.delete(accountId);
      return true;
    } catch (error) {
      console.error(`❌ Force release failed for ${accountId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Release all locks held by this process (on shutdown)
   * @returns {Promise<boolean>} - true if all released
   */
  async releaseAllLocks() {
    try {
      console.log(`🔓 Releasing all locks (${this.locks.size} locks held)`);

      for (const [accountId] of this.locks.entries()) {
        await this.releaseLock(accountId);
      }

      return true;
    } catch (error) {
      console.error(`❌ Error releasing all locks: ${error.message}`);
      return false;
    }
  }

  /**
   * PRIVATE: Try to acquire lock (atomic operation)
   */
  async _tryAcquireLock(accountId, lockId) {
    try {
      const lockPath = path.join(LOCKS_DIR, `${this._escapeLockPath(accountId)}.lock`);

      // Check if lock already exists
      if (existsSync(lockPath)) {
        return false; // Another process has lock
      }

      // Try to create lock (atomic write - fails if file exists)
      const lockData = {
        accountId,
        lockId,
        processId: process.pid,
        timestamp: Date.now(),
        hostname: require("os").hostname(),
      };

      // Use atomic write: synchronous to prevent race condition
      try {
        writeFileSync(lockPath, JSON.stringify(lockData, null, 2), {
          flag: "wx", // Write exclusive (fails if exists)
        });
        return true;
      } catch (error) {
        if (error.code === "EEXIST") {
          return false; // Lock file already exists
        }
        throw error;
      }
    } catch (error) {
      console.error(`⚠️ Error in lock acquisition for ${accountId}: ${error.message}`);
      return false;
    }
  }

  /**
   * PRIVATE: Read lock file
   */
  async _readLockFile(accountId) {
    try {
      const lockPath = path.join(LOCKS_DIR, `${this._escapeLockPath(accountId)}.lock`);

      if (!existsSync(lockPath)) {
        return null;
      }

      const data = fs.readFileSync(lockPath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error(`⚠️ Error reading lock file: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * PRIVATE: Release lock file
   */
  async _releaseLockFile(accountId) {
    try {
      const lockPath = path.join(LOCKS_DIR, `${this._escapeLockPath(accountId)}.lock`);

      if (existsSync(lockPath)) {
        await fs.unlink(lockPath);
      }

      return true;
    } catch (error) {
      console.error(`⚠️ Error releasing lock file: ${error.message}`);
      return false;
    }
  }

  /**
   * PRIVATE: Clean up stale locks (>1 hour old)
   */
  async _cleanupStaleLocks() {
    try {
      if (!existsSync(LOCKS_DIR)) {
        return;
      }

      const files = await fs.readdir(LOCKS_DIR);
      const oneHourAgo = Date.now() - 3600000;

      for (const file of files) {
        if (!file.endsWith(".lock")) continue;

        try {
          const lockPath = path.join(LOCKS_DIR, file);
          const data = fs.readFileSync(lockPath, "utf-8");
          const lock = JSON.parse(data);

          if (lock.timestamp < oneHourAgo) {
            await fs.unlink(lockPath);
            console.log(`🧹 Cleaned up stale lock: ${file}`);
          }
        } catch (error) {
          console.warn(`⚠️ Error processing lock file ${file}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`⚠️ Error cleaning up stale locks: ${error.message}`);
    }
  }

  /**
   * PRIVATE: Generate unique lock ID
   */
  _generateLockId() {
    return crypto.randomBytes(16).toString("hex");
  }

  /**
   * PRIVATE: Escape path for lock filename
   */
  _escapeLockPath(accountId) {
    // Replace problematic characters with underscores
    return accountId.replace(/[^a-z0-9._-]/gi, "_");
  }

  /**
   * PRIVATE: Unescape path from lock filename
   */
  _unescapeLockPath(escaped) {
    // For now, this is 1:1 with escape (could be improved if needed)
    return escaped;
  }
}

// Create singleton instance
const sessionLockManager = new SessionLockManager();

export default sessionLockManager;
export { SessionLockManager };
