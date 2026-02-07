/**
 * SessionManager.js
 * Handles WhatsApp session lifecycle management
 * Cleans up old sessions and manages directory structure
 * ENHANCED: Persistent session recovery for nodemon restarts
 */

import path from "path";
import fs from "fs/promises";
import { rmSync, existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, cpSync } from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../../");
const SESSIONS_DIR = path.join(PROJECT_ROOT, "sessions");
const SESSION_CACHE_DIR = path.join(PROJECT_ROOT, ".session-cache");
const SESSION_STATE_FILE = path.join(PROJECT_ROOT, "session-state.json");

export class SessionManager {
  /**
   * Check if session directory exists
   */
  static async sessionExists(masterNumber) {
    try {
      const sessionPath = path.join(SESSIONS_DIR, `session-${masterNumber}`);
      const stats = await fs.stat(sessionPath);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all existing sessions
   */
  static async getAllSessions() {
    try {
      await fs.mkdir(SESSIONS_DIR, { recursive: true });
      const entries = await fs.readdir(SESSIONS_DIR, { withFileTypes: true });
      return entries
        .filter((e) => e.isDirectory() && e.name.startsWith("session-"))
        .map((e) => ({
          name: e.name,
          number: e.name.replace("session-", ""),
          path: path.join(SESSIONS_DIR, e.name),
        }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Clean up a specific session
   */
  static async cleanupSession(masterNumber) {
    try {
      const sessionPath = path.join(SESSIONS_DIR, `session-${masterNumber}`);

      if (await this.sessionExists(masterNumber)) {
        console.log(`🧹 Cleaning up session: ${masterNumber}...`);

        await fs.rm(sessionPath, { recursive: true, force: true });

        console.log(`✅ Session cleaned: ${masterNumber}\n`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ Error cleaning session: ${error.message}`);
      return false;
    }
  }

  /**
   * Clean up all sessions
   */
  static async cleanupAllSessions() {
    try {
      const sessions = await this.getAllSessions();

      if (sessions.length === 0) {
        console.log("✅ No sessions to clean\n");
        return true;
      }

      console.log(`🧹 Found ${sessions.length} session(s) to clean...\n`);

      for (const session of sessions) {
        await this.cleanupSession(session.number);
      }

      return true;
    } catch (error) {
      console.error(`❌ Error during cleanup: ${error.message}`);
      return false;
    }
  }

  /**
   * Create fresh session directory
   */
  static async createFreshSession(masterNumber) {
    try {
      // First clean up if exists
      await this.cleanupSession(masterNumber);

      // Create fresh session directory
      const sessionPath = path.join(SESSIONS_DIR, `session-${masterNumber}`);
      await fs.mkdir(sessionPath, { recursive: true });

      console.log(`✅ Fresh session created: ${masterNumber}\n`);
      return true;
    } catch (error) {
      console.error(`❌ Error creating fresh session: ${error.message}`);
      return false;
    }
  }

  /**
   * Get session creation time
   */
  static async getSessionCreationTime(masterNumber) {
    try {
      const sessionPath = path.join(SESSIONS_DIR, `session-${masterNumber}`);
      const stats = await fs.stat(sessionPath);
      return stats.birthtime;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get session size (for debugging)
   */
  static async getSessionSize(masterNumber) {
    try {
      const sessionPath = path.join(SESSIONS_DIR, `session-${masterNumber}`);
      let size = 0;

      const getSize = async (dir) => {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            size += await getSize(fullPath);
          } else {
            const stats = await fs.stat(fullPath);
            size += stats.size;
          }
        }

        return size;
      };

      size = await getSize(sessionPath);
      return formatBytes(size);
    } catch (error) {
      return "unknown";
    }
  }

  /**
   * List all sessions with details
   */
  static async listSessions(verbose = false) {
    try {
      const sessions = await this.getAllSessions();

      if (sessions.length === 0) {
        console.log("📭 No sessions found\n");
        return;
      }

      console.log(`\n📱 Found ${sessions.length} session(s):\n`);

      for (const session of sessions) {
        console.log(`   • ${session.number}`);

        if (verbose) {
          const createdAt = await this.getSessionCreationTime(session.number);
          const size = await this.getSessionSize(session.number);

          console.log(`     Created: ${createdAt?.toLocaleString() || "unknown"}`);
          console.log(`     Size: ${size}`);
        }
      }

      console.log();
    } catch (error) {
      console.error(`❌ Error listing sessions: ${error.message}`);
    }
  }

  /**
   * Validate session integrity
   */
  static async validateSession(masterNumber) {
    try {
      const sessionPath = path.join(SESSIONS_DIR, `session-${masterNumber}`);
      const requiredDirs = ["Default", "chrome_shutdown_ms"];

      if (!(await this.sessionExists(masterNumber))) {
        return { valid: false, reason: "Session directory not found" };
      }

      // Check for basic session structure
      const entries = await fs.readdir(sessionPath);

      if (entries.length === 0) {
        return { valid: false, reason: "Session directory is empty" };
      }

      return { valid: true, reason: "Session is valid" };
    } catch (error) {
      return { valid: false, reason: error.message };
    }
  }

  /**
   * ============ ENHANCED: Persistent Session Recovery ============
   */

  /**
   * Save session state/metadata for recovery after restart
   */
  static saveSessionState(masterNumber, metadata = {}) {
    try {
      // Ensure cache directory exists
      mkdirSync(SESSION_CACHE_DIR, { recursive: true });

      const state = {
        masterNumber,
        lastSeen: new Date().toISOString(),
        isLinked: metadata.isLinked || false,
        authMethod: metadata.authMethod || "qr", // 'qr' or 'code'
        deviceStatus: metadata.deviceStatus || null,
        ...metadata
      };

      writeFileSync(SESSION_STATE_FILE, JSON.stringify(state, null, 2));
      console.log(`✅ Session state saved for ${masterNumber}`);
      return true;
    } catch (error) {
      console.error(`⚠️  Failed to save session state: ${error.message}`);
      return false;
    }
  }

  /**
   * Load session state/metadata
   */
  static loadSessionState() {
    try {
      if (existsSync(SESSION_STATE_FILE)) {
        const state = JSON.parse(readFileSync(SESSION_STATE_FILE, 'utf8'));
        return state;
      }
    } catch (error) {
      console.error(`⚠️  Failed to load session state: ${error.message}`);
    }
    return null;
  }

  /**
   * Check if session can be restored immediately (nodemon restart scenario)
   */
  static canRestoreSession(masterNumber) {
    try {
      // Check session folder exists and has content
      const sessionFolder = path.join(SESSIONS_DIR, `session-${masterNumber}`);
      if (!existsSync(sessionFolder)) {
        console.log(`⚠️  Session folder missing: ${masterNumber}`);
        return false;
      }

      // Check for critical session files (Chromium session data)
      const defaultDir = path.join(sessionFolder, 'Default');
      if (!existsSync(defaultDir)) {
        console.log(`⚠️  Default session directory missing for ${masterNumber}`);
        return false;
      }

      // Check for Session file (crucial for restauration)
      const sessionFile = path.join(defaultDir, 'Session');
      if (!existsSync(sessionFile)) {
        console.log(`⚠️  Session file missing for ${masterNumber}`);
        return false;
      }

      console.log(`✅ Session can be restored for ${masterNumber}`);
      return true;
    } catch (error) {
      console.error(`❌ Session restoration check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Create backup of current session before potential loss (on shutdown)
   */
  static backupSession(masterNumber) {
    try {
      mkdirSync(SESSION_CACHE_DIR, { recursive: true });

      const sessionFolder = path.join(SESSIONS_DIR, `session-${masterNumber}`);
      const backupFolder = path.join(SESSION_CACHE_DIR, `backup-${masterNumber}-${Date.now()}`);

      if (!existsSync(sessionFolder)) {
        console.log(`⚠️  Session folder not found for backup: ${masterNumber}`);
        return false;
      }

      // Copy session folder to backup
      cpSync(sessionFolder, backupFolder, { recursive: true, force: true });
      console.log(`✅ Session backup created for ${masterNumber} at ${backupFolder}`);
      return true;
    } catch (error) {
      console.error(`⚠️  Failed to backup session: ${error.message}`);
      return false;
    }
  }

  /**
   * Restore session from backup (if primary is corrupted)
   */
  static restoreFromBackup(masterNumber) {
    try {
      mkdirSync(SESSION_CACHE_DIR, { recursive: true });

      const sessionFolder = path.join(SESSIONS_DIR, `session-${masterNumber}`);
      
      // Find most recent backup
      const backupDir = SESSION_CACHE_DIR;
      const backups = fsSyncVarious.readdirSync(backupDir)
        .filter(f => f.startsWith(`backup-${masterNumber}`))
        .sort()
        .reverse();

      if (backups.length === 0) {
        console.log(`⚠️  No backup found for ${masterNumber}`);
        return false;
      }

      const latestBackup = path.join(backupDir, backups[0]);
      console.log(`🔄 Restoring from backup: ${backups[0]}`);

      // Clear corrupted session
      if (existsSync(sessionFolder)) {
        rmSync(sessionFolder, { recursive: true, force: true });
      }

      // Restore from backup
      cpSync(latestBackup, sessionFolder, { recursive: true, force: true });
      console.log(`✅ Session restored from backup for ${masterNumber}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to restore from backup: ${error.message}`);
      return false;
    }
  }

  /**
   * Get session information for debugging
   */
  static getSessionInfo(masterNumber) {
    const sessionFolder = path.join(SESSIONS_DIR, `session-${masterNumber}`);
    const exists = existsSync(sessionFolder);
    const canRestore = exists ? this.canRestoreSession(masterNumber) : false;
    const state = this.loadSessionState();

    return {
      masterNumber,
      sessionFolderExists: exists,
      canRestoreImmediate: canRestore,
      lastState: state,
      path: sessionFolder,
      createdAt: exists ? fsSyncVarious.statSync(sessionFolder).birthtime : null
    };
  }

  /**
   * Cleanup old backups to save disk space
   */
  static cleanupOldBackups(daysOld = 7) {
    try {
      if (!existsSync(SESSION_CACHE_DIR)) return;

      const now = Date.now();
      const maxAge = daysOld * 24 * 60 * 60 * 1000;

      fsSyncVarious.readdirSync(SESSION_CACHE_DIR).forEach(file => {
        const filePath = path.join(SESSION_CACHE_DIR, file);
        if (existsSync(filePath)) {
          const stats = fsSyncVarious.statSync(filePath);
          if (now - stats.mtime.getTime() > maxAge) {
            rmSync(filePath, { recursive: true, force: true });
            console.log(`🧹 Cleaned old backup: ${file}`);
          }
        }
      });
    } catch (error) {
      console.error(`⚠️  Cleanup failed: ${error.message}`);
    }
  }
}

/**
 * Helper function to format bytes
 */
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

export default SessionManager;
