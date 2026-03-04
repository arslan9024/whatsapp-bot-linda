/**
 * SessionManager.js
 * Handles WhatsApp session lifecycle management
 * Cleans up old sessions and manages directory structure
 * ENHANCED: Persistent session recovery for nodemon restarts
 * ENHANCED V2: Better session detection, validation, and recovery
 */

import path from "path";
import fs from "fs/promises";
import { rmSync, existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, cpSync, statSync, readdirSync } from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../../");
const SESSIONS_DIR = path.join(PROJECT_ROOT, "sessions");
const SESSION_CACHE_DIR = path.join(PROJECT_ROOT, ".session-cache");
const SESSION_STATE_FILE = path.join(PROJECT_ROOT, "session-state.json");

// Recovery state file for circuit breaker pattern
const RECOVERY_STATE_FILE = path.join(PROJECT_ROOT, ".recovery-state.json");

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
   * Get all phone numbers that have valid saved sessions
   * Used by dashboard for restore-all-sessions command
   * @returns {Array<string>} - Array of phone numbers with valid sessions
   */
  static getAllSavedSessions() {
    try {
      if (!existsSync(SESSIONS_DIR)) {
        return [];
      }

      const entries = readdirSync(SESSIONS_DIR, { withFileTypes: true });
      const validSessions = [];

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('session-')) {
          const phoneNumber = entry.name.replace('session-', '');
          
          // Verify session is actually valid (can be restored)
          const defaultDir = path.join(SESSIONS_DIR, entry.name, 'Default');
          const sessionFile = path.join(defaultDir, 'Session');
          
          if (existsSync(sessionFile)) {
            validSessions.push(phoneNumber);
          }
        }
      }

      return validSessions;
    } catch (error) {
      console.error(`⚠️  Error reading saved sessions: ${error.message}`);
      return [];
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
      const backups = readdirSync(backupDir)
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
      createdAt: exists ? statSync(sessionFolder).birthtime : null,
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

      readdirSync(SESSION_CACHE_DIR).forEach(file => {
        const filePath = path.join(SESSION_CACHE_DIR, file);
        if (existsSync(filePath)) {
          const stats = statSync(filePath);
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

  // ============ ENHANCED V2: Better Recovery & Circuit Breaker ============

  /**
   * Get detailed session validation report
   * Returns comprehensive info about session state
   */
  static getDetailedSessionStatus(masterNumber) {
    const sessionFolder = path.join(SESSIONS_DIR, `session-${masterNumber}`);
    const result = {
      phoneNumber: masterNumber,
      sessionFolder,
      folderExists: false,
      defaultDirExists: false,
      sessionFileExists: false,
      leveldbExists: false,
      canRestore: false,
      issues: [],
      size: null,
      lastModified: null
    };

    try {
      // Check folder
      if (!existsSync(sessionFolder)) {
        result.issues.push("Session folder missing");
        console.log(`⚠️  Session folder missing: ${masterNumber}`);
        return result;
      }
      result.folderExists = true;

      // Get folder stats
      const stats = statSync(sessionFolder);
      result.size = formatBytes(stats.size);
      result.lastModified = stats.mtime;

      // Check Default directory
      const defaultDir = path.join(sessionFolder, 'Default');
      if (!existsSync(defaultDir)) {
        result.issues.push("Default session directory missing");
        console.log(`⚠️  Default session directory missing for ${masterNumber}`);
        return result;
      }
      result.defaultDirExists = true;

      // Check Session file
      const sessionFile = path.join(defaultDir, 'Session');
      if (!existsSync(sessionFile)) {
        result.issues.push("Session file missing");
        console.log(`⚠️  Session file missing for ${masterNumber}`);
        return result;
      }
      result.sessionFileExists = true;

      // Check LevelDB directory (important for wa-web.js)
      const leveldbDir = path.join(defaultDir, 'leveldb');
      if (existsSync(leveldbDir)) {
        result.leveldbExists = true;
      }

      // All checks passed
      result.canRestore = true;
      console.log(`✅ Session can be restored for ${masterNumber}`);
      return result;

    } catch (error) {
      result.issues.push(`Error: ${error.message}`);
      console.error(`❌ Session validation error: ${error.message}`);
      return result;
    }
  }

  /**
   * Check if recovery should be attempted based on circuit breaker
   * Prevents repeated failed recovery attempts
   */
  static shouldAttemptRecovery(masterNumber, maxAttempts = 3, cooldownMinutes = 30) {
    try {
      if (!existsSync(RECOVERY_STATE_FILE)) {
        return { allowed: true, reason: "No previous recovery attempts" };
      }

      const recoveryState = JSON.parse(readFileSync(RECOVERY_STATE_FILE, 'utf8'));
      const accountState = recoveryState[masterNumber];

      if (!accountState) {
        return { allowed: true, reason: "No previous recovery attempts for this account" };
      }

      // Check cooldown
      const lastAttempt = new Date(accountState.lastAttempt);
      const now = new Date();
      const minutesSinceLastAttempt = (now - lastAttempt) / (1000 * 60);

      if (minutesSinceLastAttempt < cooldownMinutes) {
        return {
          allowed: false,
          reason: `Cooldown active. Last attempt ${Math.round(minutesSinceLastAttempt)} minutes ago. Try again in ${Math.round(cooldownMinutes - minutesSinceLastAttempt)} minutes.`,
          cooldownRemaining: Math.round(cooldownMinutes - minutesSinceLastAttempt),
          attempts: accountState.attempts,
          lastAttempt: accountState.lastAttempt
        };
      }

      // Check max attempts
      if (accountState.attempts >= maxAttempts) {
        return {
          allowed: false,
          reason: `Max recovery attempts (${maxAttempts}) reached. Manual intervention required.`,
          attempts: accountState.attempts,
          lastAttempt: accountState.lastAttempt,
          lastError: accountState.lastError
        };
      }

      return { allowed: true, reason: "Recovery allowed", attempts: accountState.attempts };

    } catch (error) {
      // If file doesn't exist or is corrupted, allow recovery
      return { allowed: true, reason: "No valid recovery state" };
    }
  }

  /**
   * Record recovery attempt for circuit breaker
   */
  static recordRecoveryAttempt(masterNumber, success, errorMessage = null) {
    try {
      let recoveryState = {};
      
      // Load existing state
      if (existsSync(RECOVERY_STATE_FILE)) {
        try {
          recoveryState = JSON.parse(readFileSync(RECOVERY_STATE_FILE, 'utf8'));
        } catch (e) {
          recoveryState = {};
        }
      }

      // Initialize or update account state
      if (!recoveryState[masterNumber]) {
        recoveryState[masterNumber] = {
          attempts: 0,
          successes: 0,
          failures: 0,
          lastAttempt: null,
          lastError: null,
          firstAttempt: null,
          lastSuccess: null
        };
      }

      const accountState = recoveryState[masterNumber];
      accountState.attempts++;
      accountState.lastAttempt = new Date().toISOString();

      if (!accountState.firstAttempt) {
        accountState.firstAttempt = accountState.lastAttempt;
      }

      if (success) {
        accountState.successes++;
        accountState.lastSuccess = accountState.lastAttempt;
        accountState.lastError = null;
        // Reset failures on success
        accountState.failures = 0;
      } else {
        accountState.failures++;
        accountState.lastError = errorMessage;
      }

      // Save state
      mkdirSync(SESSION_CACHE_DIR, { recursive: true });
      writeFileSync(RECOVERY_STATE_FILE, JSON.stringify(recoveryState, null, 2));

      if (success) {
        console.log(`✅ Recovery recorded: SUCCESS for ${masterNumber} (attempt ${accountState.attempts})`);
      } else {
        console.log(`⚠️  Recovery recorded: FAILED for ${masterNumber} - ${errorMessage} (attempt ${accountState.attempts})`);
      }

      return accountState;

    } catch (error) {
      console.error(`⚠️  Failed to record recovery attempt: ${error.message}`);
      return null;
    }
  }

  /**
   * Clear recovery state for an account
   * Use this after successful manual linking
   */
  static clearRecoveryState(masterNumber) {
    try {
      if (!existsSync(RECOVERY_STATE_FILE)) {
        return true;
      }

      const recoveryState = JSON.parse(readFileSync(RECOVERY_STATE_FILE, 'utf8'));
      
      if (recoveryState[masterNumber]) {
        delete recoveryState[masterNumber];
        writeFileSync(RECOVERY_STATE_FILE, JSON.stringify(recoveryState, null, 2));
        console.log(`✅ Recovery state cleared for ${masterNumber}`);
      }

      return true;
    } catch (error) {
      console.error(`⚠️  Failed to clear recovery state: ${error.message}`);
      return false;
    }
  }

  /**
   * Get all sessions with detailed status
   */
  static getAllSessionsDetailed() {
    const sessions = this.getAllSavedSessions();
    return sessions.map(phoneNumber => ({
      phoneNumber,
      status: this.getDetailedSessionStatus(phoneNumber)
    }));
  }

  /**
   * Find session by looking for any valid session folder
   * Useful when phone number format might be different
   */
  static findSessionByPartialMatch(partialNumber) {
    try {
      if (!existsSync(SESSIONS_DIR)) {
        return null;
      }

      const entries = readdirSync(SESSIONS_DIR, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('session-')) {
          const phoneNumber = entry.name.replace('session-', '');
          
          // Check if partial match
          if (phoneNumber.includes(partialNumber) || partialNumber.includes(phoneNumber)) {
            const status = this.getDetailedSessionStatus(phoneNumber);
            if (status.canRestore) {
              return { phoneNumber, ...status };
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error(`⚠️  Error finding session: ${error.message}`);
      return null;
    }
  }

  /**
   * Auto-create session directory if it doesn't exist
   * This helps when WhatsApp client is started fresh
   */
  static ensureSessionDirectory(masterNumber) {
    try {
      const sessionPath = path.join(SESSIONS_DIR, `session-${masterNumber}`);
      
      if (!existsSync(sessionPath)) {
        mkdirSync(sessionPath, { recursive: true });
        console.log(`📂 Created session directory: ${masterNumber}`);
        
        // Also create Default subdirectory
        const defaultDir = path.join(sessionPath, 'Default');
        mkdirSync(defaultDir, { recursive: true });
        console.log(`📂 Created Default directory for: ${masterNumber}`);
        
        return { created: true, path: sessionPath };
      }

      return { created: false, path: sessionPath };
    } catch (error) {
      console.error(`❌ Failed to create session directory: ${error.message}`);
      return { created: false, error: error.message };
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
