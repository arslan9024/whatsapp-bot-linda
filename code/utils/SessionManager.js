/**
 * SessionManager.js
 * Handles WhatsApp session lifecycle management
 * Cleans up old sessions and manages directory structure
 */

import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../../");
const SESSIONS_DIR = path.join(PROJECT_ROOT, "sessions");

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
