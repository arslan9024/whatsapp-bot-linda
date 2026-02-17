/**
 * SessionStateManager.js
 * 
 * Manages account state persistence for multi-account WhatsApp bot
 * - Saves account states on graceful shutdown
 * - Recovers account states on startup
 * - Tracks device linking and session integrity
 * - Enables server restart without losing connections
 * 
 * Version: 1.0
 * Created: February 9, 2026
 * Status: Production Ready
 */

import fs from "fs/promises";
import path from "path";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../../");
const SESSION_STATE_FILE = path.join(PROJECT_ROOT, "session-state.json");
const SESSIONS_DIR = path.join(PROJECT_ROOT, "sessions");

class SessionStateManager {
  /**
   * State Machine for Session Lifecycle
   * INITIALIZING → AUTHENTICATING → AUTHENTICATED → HEARTBEATING → HEALTHY
   * 
   * Allowed transitions:
   * - INITIALIZING → AUTHENTICATING
   * - AUTHENTICATING → AUTHENTICATED (success) or back to AUTHENTICATING (retry)
   * - AUTHENTICATED → HEARTBEATING
   * - HEARTBEATING → HEALTHY (success) or AUTHENTICATING (reconnect needed)
   * - Any → ERROR (failure)
   * - ERROR → INITIALIZING (recovery)
   * - HEALTHY → HEARTBEATING (continuous cycle)
   */
  static STATES = {
    INITIALIZING: "INITIALIZING",
    AUTHENTICATING: "AUTHENTICATING",
    AUTHENTICATED: "AUTHENTICATED",
    HEARTBEATING: "HEARTBEATING",
    HEALTHY: "HEALTHY",
    ERROR: "ERROR",
  };

  static ALLOWED_TRANSITIONS = {
    INITIALIZING: ["AUTHENTICATING", "ERROR"],
    AUTHENTICATING: ["AUTHENTICATED", "AUTHENTICATING", "ERROR"],
    AUTHENTICATED: ["HEARTBEATING", "ERROR", "INITIALIZING"],
    HEARTBEATING: ["HEALTHY", "AUTHENTICATING", "ERROR"],
    HEALTHY: ["HEARTBEATING", "ERROR"],
    ERROR: ["INITIALIZING", "AUTHENTICATING"],
  };

  constructor() {
    this.accountStates = new Map();
    this.stateTransitionLocks = new Map(); // Prevents concurrent state changes
    this.initialized = false;
  }

  /**
   * Initialize manager - load existing session state from disk
   */
  async initialize() {
    try {
      if (this.initialized) return true;

      // Ensure sessions directory exists
      await fs.mkdir(SESSIONS_DIR, { recursive: true });

      // Load existing session state if file exists
      if (existsSync(SESSION_STATE_FILE)) {
        const data = readFileSync(SESSION_STATE_FILE, "utf-8");
        const state = JSON.parse(data);
        this.accountStates = new Map(Object.entries(state.accounts || {}));
        
        console.log(`✅ SessionStateManager initialized (${this.accountStates.size} accounts loaded)`);
      } else {
        console.log("✅ SessionStateManager initialized (no previous state)");
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error(`❌ Failed to initialize SessionStateManager: ${error.message}`);
      return false;
    }
  }

  /**
   * Atomically transition account to new state
   * @param {string} accountId - Account identifier
   * @param {string} newState - New state (must be valid STATES value)
   * @param {object} metadata - Additional metadata to associate with transition
   * @returns {Promise<boolean>} - true if transition successful, false if invalid
   */
  async transitionState(accountId, newState, metadata = {}) {
    try {
      // Validate new state
      if (!Object.values(SessionStateManager.STATES).includes(newState)) {
        console.error(`❌ Invalid state: ${newState}`);
        return false;
      }

      // Get current state
      const state = this.getAccountState(accountId);
      if (!state) {
        console.warn(`⚠️ Account ${accountId} not found for state transition`);
        return false;
      }

      const currentState = state.currentSessionState || SessionStateManager.STATES.INITIALIZING;

      // Check if transition is allowed
      const allowedNext = SessionStateManager.ALLOWED_TRANSITIONS[currentState] || [];
      if (!allowedNext.includes(newState)) {
        console.error(
          `❌ Invalid state transition: ${currentState} → ${newState} (allowed: ${allowedNext.join(", ")})`
        );
        return false;
      }

      // Acquire lock to prevent concurrent transitions on same account
      await this._acquireStateLock(accountId);

      try {
        // Update state atomically
        state.currentSessionState = newState;
        state.lastStateChange = new Date().toISOString();
        state.stateHistory = state.stateHistory || [];
        state.stateHistory.push({
          from: currentState,
          to: newState,
          timestamp: new Date().toISOString(),
          metadata,
        });

        // Keep only last 50 state changes
        if (state.stateHistory.length > 50) {
          state.stateHistory = state.stateHistory.slice(-50);
        }

        // Persist
        await this.saveAccountState(accountId, state);

        console.log(
          `🔄 State transition: ${accountId} ${currentState} → ${newState} ${
            metadata.reason ? `(${metadata.reason})` : ""
          }`
        );

        return true;
      } finally {
        // Always release lock
        this._releaseStateLock(accountId);
      }
    } catch (error) {
      console.error(`❌ State transition failed for ${accountId}: ${error.message}`);
      this._releaseStateLock(accountId);
      return false;
    }
  }

  /**
   * Get current state of account
   * @param {string} accountId - Account identifier
   * @returns {string} - Current state
   */
  getCurrentState(accountId) {
    const state = this.getAccountState(accountId);
    return state?.currentSessionState || SessionStateManager.STATES.INITIALIZING;
  }

  /**
   * Get state history for account
   * @param {string} accountId - Account identifier
   * @returns {array} - Array of state transitions
   */
  getStateHistory(accountId) {
    const state = this.getAccountState(accountId);
    return state?.stateHistory || [];
  }

  /**
   * Check if account is in healthy state
   * @param {string} accountId - Account identifier
   * @returns {boolean} - true if in HEALTHY state
   */
  isHealthy(accountId) {
    return this.getCurrentState(accountId) === SessionStateManager.STATES.HEALTHY;
  }

  /**
   * Check if account is in error state
   * @param {string} accountId - Account identifier
   * @returns {boolean} - true if in ERROR state
   */
  isInErrorState(accountId) {
    return this.getCurrentState(accountId) === SessionStateManager.STATES.ERROR;
  }

  /**
   * PRIVATE: Acquire state transition lock for account
   */
  async _acquireStateLock(accountId) {
    // Simple in-memory lock for atomic transitions
    while (this.stateTransitionLocks.has(accountId)) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    this.stateTransitionLocks.set(accountId, Date.now());
  }

  /**
   * PRIVATE: Release state transition lock for account
   */
  _releaseStateLock(accountId) {
    this.stateTransitionLocks.delete(accountId);
  }

  /**

   * Save individual account state
   * Called after successful account initialization or at intervals
   */
  async saveAccountState(accountId, state) {
    try {
      const accountState = {
        phoneNumber: state.phoneNumber,
        displayName: state.displayName,
        deviceLinked: state.deviceLinked || false,
        isActive: state.isActive || false,
        sessionPath: state.sessionPath,
        lastKnownState: state.lastKnownState || "unknown",
        lastPing: new Date().toISOString(),
        recoveryAttempts: state.recoveryAttempts || 0,
        lastAuthenticated: state.lastAuthenticated || null,
        lastError: state.lastError || null,
        // NEW: Device metadata
        deviceMetadata: state.deviceMetadata || {
          linkedAt: null,
          lastHeartbeat: null,
          authMethod: null,
          ipAddress: null,
          uptime: 0,
          heartbeatCount: 0,
        },
      };

      this.accountStates.set(accountId, accountState);

      // Persist to disk
      await this._persistStateToDisk();

      return true;
    } catch (error) {
      console.error(`❌ Failed to save account state for ${accountId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Update device metadata for an account
   */
  async updateDeviceMetadata(accountId, metadata) {
    try {
      const state = this.getAccountState(accountId);
      if (!state) {
        return false;
      }

      if (!state.deviceMetadata) {
        state.deviceMetadata = {};
      }

      Object.assign(state.deviceMetadata, metadata);
      await this.saveAccountState(accountId, state);

      return true;
    } catch (error) {
      console.error(`❌ Failed to update device metadata for ${accountId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get device metadata for account
   */
  getDeviceMetadata(accountId) {
    const state = this.getAccountState(accountId);
    return state?.deviceMetadata || null;
  }

  /**
   * Record device link event
   */
  async recordDeviceLinkEvent(accountId, result = "success") {
    try {
      const state = this.getAccountState(accountId);
      if (!state) return false;

      if (result === "success") {
        state.deviceLinked = true;
        state.isActive = true;
        state.lastKnownState = "authenticated";
        state.lastAuthenticated = new Date().toISOString();
        
        if (!state.deviceMetadata) {
          state.deviceMetadata = {};
        }
        state.deviceMetadata.linkedAt = new Date().toISOString();
      } else if (result === "unlinked") {
        state.deviceLinked = false;
        state.isActive = false;
      }

      await this.saveAccountState(accountId, state);
      return true;
    } catch (error) {
      console.error(`❌ Failed to record device link event: ${error.message}`);
      return false;
    }
  }

  /**
   * Load account state from memory
   */
  getAccountState(accountId) {
    return this.accountStates.get(accountId) || null;
  }

  /**
   * Get all account states
   */
  getAllAccountStates() {
    return Object.fromEntries(this.accountStates);
  }

  /**
   * Get list of accounts that need recovery
   * (were previously linked and should auto-reconnect)
   */
  async getAccountsToRecover() {
    const accountsToRecover = [];

    for (const [accountId, state] of this.accountStates.entries()) {
      // Account should be recovered if:
      // 1. Device was previously linked
      // 2. Session path is valid
      // 3. Not already recovered in this session
      if (state.deviceLinked && state.sessionPath && state.recoveryAttempts < 5) {
        accountsToRecover.push({
          accountId,
          phoneNumber: state.phoneNumber,
          displayName: state.displayName,
          sessionPath: state.sessionPath,
          recoveryAttempts: state.recoveryAttempts,
        });
      }
    }

    return accountsToRecover;
  }

  /**
   * Check if session directory exists and is valid
   */
  async validateSession(accountId) {
    try {
      const state = this.getAccountState(accountId);
      if (!state || !state.sessionPath) {
        return { valid: false, reason: "No session path stored" };
      }

      const sessionPath = path.join(PROJECT_ROOT, state.sessionPath);

      // Check if session directory exists
      try {
        await fs.access(sessionPath);
        
        // Check if it has expected subdirectories
        const entries = await fs.readdir(sessionPath);
        const hasChromium = entries.some(e => e.includes("Chrome") || e.includes(".chromium-browser-snapshots"));
        
        return {
          valid: true,
          sessionPath: state.sessionPath,
          hasChromium,
          estimatedAge: this._getSessionAge(state.lastPing),
        };
      } catch (error) {
        return { valid: false, reason: "Session directory not found" };
      }
    } catch (error) {
      return { valid: false, reason: error.message };
    }
  }

  /**
   * Clean corrupted or invalid session
   */
  async cleanCorruptedSession(accountId) {
    try {
      const state = this.getAccountState(accountId);
      if (!state || !state.sessionPath) {
        return false;
      }

      const sessionPath = path.join(PROJECT_ROOT, state.sessionPath);

      // Try to remove the session
      try {
        await fs.rm(sessionPath, { recursive: true, force: true });
        console.log(`🧹 Cleaned corrupted session: ${accountId}`);
        
        // Update state to reflect removal
        state.deviceLinked = false;
        state.isActive = false;
        await this.saveAccountState(accountId, state);
        
        return true;
      } catch (error) {
        console.error(`⚠️ Failed to clean session for ${accountId}: ${error.message}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error cleaning corrupted session: ${error.message}`);
      return false;
    }
  }

  /**
   * Mark account as having recovered successfully
   */
  async markRecoverySuccess(accountId) {
    try {
      const state = this.getAccountState(accountId);
      if (state) {
        state.isActive = true;
        state.lastKnownState = "authenticated";
        state.lastAuthenticated = new Date().toISOString();
        state.recoveryAttempts = 0;
        await this.saveAccountState(accountId, state);
      }
      return true;
    } catch (error) {
      console.error(`❌ Failed to mark recovery success: ${error.message}`);
      return false;
    }
  }

  /**
   * Mark account as failed recovery attempt
   */
  async markRecoveryFailed(accountId, error) {
    try {
      const state = this.getAccountState(accountId);
      if (state) {
        state.recoveryAttempts = (state.recoveryAttempts || 0) + 1;
        state.lastError = error?.message || "Unknown error";
        state.isActive = false;

        // After 5 failed attempts, mark device as no longer linked
        if (state.recoveryAttempts >= 5) {
          state.deviceLinked = false;
          console.warn(`⚠️ Account ${accountId} exceeded max recovery attempts (5). Device marked as unlinked.`);
        }

        await this.saveAccountState(accountId, state);
      }
      return true;
    } catch (error) {
      console.error(`❌ Failed to mark recovery failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Reset recovery attempts for account
   */
  async resetRecoveryAttempts(accountId) {
    try {
      const state = this.getAccountState(accountId);
      if (state) {
        state.recoveryAttempts = 0;
        state.lastError = null;
        await this.saveAccountState(accountId, state);
      }
      return true;
    } catch (error) {
      console.error(`❌ Failed to reset recovery attempts: ${error.message}`);
      return false;
    }
  }

  /**
   * Get health report for all accounts
   */
  getHealthReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalAccounts: this.accountStates.size,
      activeAccounts: 0,
      linkedDevices: 0,
      accounts: {},
    };

    for (const [accountId, state] of this.accountStates.entries()) {
      if (state.isActive) report.activeAccounts++;
      if (state.deviceLinked) report.linkedDevices++;

      report.accounts[accountId] = {
        displayName: state.displayName,
        phoneNumber: state.phoneNumber,
        isActive: state.isActive,
        deviceLinked: state.deviceLinked,
        lastKnownState: state.lastKnownState,
        lastPing: state.lastPing,
        recoveryAttempts: state.recoveryAttempts,
        sessionAge: this._getSessionAge(state.lastPing),
      };
    }

    return report;
  }

  /**
   * Write safe point file before shutdown
   * This ensures state is saved even if there's a crash
   */
  async writeSafePointFile() {
    try {
      const safePoint = {
        timestamp: new Date().toISOString(),
        version: "1.0",
        accounts: Object.fromEntries(this.accountStates),
      };

      writeFileSync(SESSION_STATE_FILE, JSON.stringify(safePoint, null, 2));
      console.log("💾 Session state saved to disk");
      return true;
    } catch (error) {
      console.error(`❌ Failed to write safe point file: ${error.message}`);
      return false;
    }
  }

  /**
   * Clear all session state (for testing or reset)
   */
  async clearAllState() {
    try {
      this.accountStates.clear();
      if (existsSync(SESSION_STATE_FILE)) {
        await fs.unlink(SESSION_STATE_FILE);
      }
      console.log("🔄 Session state cleared");
      return true;
    } catch (error) {
      console.error(`❌ Failed to clear session state: ${error.message}`);
      return false;
    }
  }

  /**
   * Private: Persist state to disk
   */
  async _persistStateToDisk() {
    try {
      const stateData = {
        timestamp: new Date().toISOString(),
        version: "1.0",
        accounts: Object.fromEntries(this.accountStates),
      };

      writeFileSync(SESSION_STATE_FILE, JSON.stringify(stateData, null, 2));
    } catch (error) {
      console.error(`⚠️ Failed to persist state to disk: ${error.message}`);
    }
  }

  /**
   * Private: Calculate session age
   */
  _getSessionAge(lastPingIso) {
    if (!lastPingIso) return "unknown";

    const lastPing = new Date(lastPingIso);
    const now = new Date();
    const diffMs = now - lastPing;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d`;
    if (diffHours > 0) return `${diffHours}h`;
    if (diffMins > 0) return `${diffMins}m`;
    return "now";
  }
}

// Create singleton instance
const sessionStateManager = new SessionStateManager();

export default sessionStateManager;
export { SessionStateManager };
