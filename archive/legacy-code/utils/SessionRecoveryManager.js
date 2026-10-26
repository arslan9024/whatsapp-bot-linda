/**
 * ====================================================================
 * SESSION RECOVERY MANAGER (Production-Grade)
 * ====================================================================
 * Restores WhatsApp sessions from stored credentials (Tier 1 recovery).
 *
 * Features:
 * - Load stored session after browser restart
 * - Attempt reconnection using session path (skip QR/code)
 * - Fallback to code auth if restore fails
 * - Track recovery success/failure rates per device
 * - Detailed diagnostics: restoration status, failure reasons
 *
 * Recovery Flow (Tier 1):
 * 1. Browser crashes or connection lost
 * 2. BrowserHealthMonitor detects crash
 * 3. SessionRecoveryManager.restore() called
 * 4. If stored session exists:
 *    a. Load encrypted session data
 *    b. Create new WhatsApp client with session path
 *    c. Wait for "authenticated" event (no QR needed)
 *    d. If success: device linked (fastest recovery)
 * 5. If restore fails:
 *    a. Return null (trigger Tier 2: CodeAuthManager)
 *    b. CodeAuthManager generates 6-digit code
 *
 * @since Phase 7 - February 17, 2026
 * Version: 1.0
 * Status: Production Ready
 */

export default class SessionRecoveryManager {
  /**
   * @param {SessionStorageManager} storageManager
   * @param {Function} logFunc - Logging function (msg, level) => void
   */
  constructor(storageManager, logFunc) {
    this.storage = storageManager;
    this.log = logFunc || console.log;

    // Recovery tracking per phone number
    this.recoveryAttempts = new Map();
    this.recoveryStats = new Map();

    // Device state detector (injected later)
    this.deviceStateDetector = null;

    this.metrics = {
      createdAt: Date.now(),
      totalAttempts: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      averageRecoveryTimeMs: 0,
      recoveryTimesMs: [],
    };
  }

  /**
   * Inject device state detector for enhanced validation
   */
  setDeviceStateDetector(detector) {
    this.deviceStateDetector = detector;
  }

  /**
   * Attempt to restore session for a phone number
   * Called when ConnectionManager detects disconnection/crash
   *
   * @param {string} phoneNumber - Account phone number
   * @param {Function} createClientFunc - async (sessionPath) => Client
   * @param {number} timeoutMs - Max time to wait (default 30000ms)
   * @returns {Promise<boolean>} - true if restored, false if not
   */
  async restore(phoneNumber, createClientFunc, timeoutMs = 30000) {
    if (!phoneNumber || !createClientFunc) {
      this.log(
        `[SessionRecovery] ❌ Missing parameters for restore`,
        'error'
      );
      return false;
    }

    const startTime = Date.now();
    this.metrics.totalAttempts++;

    try {
      // Check if stored session exists
      if (!this.storage.hasValidSession(phoneNumber)) {
        this.log(
          `[SessionRecovery] ℹ️  No valid stored session for ${phoneNumber}`,
          'info'
        );
        return false;
      }

      // LAYER 2: Validate session with device state detection
      if (this.deviceStateDetector) {
        const validation = this.storage.validateSessionForRestore(
          phoneNumber,
          this.deviceStateDetector
        );

        if (!validation.isValid) {
          this.log(
            `[SessionRecovery] ⚠️  Session validation failed: ${validation.reason}`,
            'warn'
          );
          if (validation.warnings.length > 0) {
            validation.warnings.forEach(w =>
              this.log(`[SessionRecovery]    ⚠️  ${w}`, 'warn')
            );
          }
          this.metrics.totalFailures++;
          return false;
        }

        if (validation.warnings.length > 0) {
          validation.warnings.forEach(w =>
            this.log(`[SessionRecovery]    ℹ️  ${w}`, 'info')
          );
        }
      }

      this.log(
        `[SessionRecovery] 🔄 Attempting session restore for ${phoneNumber}...`,
        'info'
      );

      // Load session data
      const sessionData = this.storage.loadSession(phoneNumber);
      if (!sessionData) {
        this.log(
          `[SessionRecovery] ⚠️  Failed to load session data for ${phoneNumber}`,
          'warn'
        );
        this.metrics.totalFailures++;
        return false;
      }

      const sessionPath = sessionData.sessionPath;
      if (!sessionPath) {
        this.log(
          `[SessionRecovery] ❌ No session path in stored data for ${phoneNumber}`,
          'error'
        );
        this.metrics.totalFailures++;
        return false;
      }

      // Create client with stored session path
      let client = null;
      try {
        client = await Promise.race([
          createClientFunc(sessionPath),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Client creation timeout')),
              timeoutMs
            )
          ),
        ]);
      } catch (error) {
        this.log(
          `[SessionRecovery] ❌ Failed to create client with stored session: ${error.message}`,
          'error'
        );
        this.metrics.totalFailures++;

        // Try once more with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 3000));

        try {
          client = await Promise.race([
            createClientFunc(sessionPath),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error('Client creation timeout (retry)')),
                timeoutMs
              )
            ),
          ]);
        } catch (retryError) {
          this.log(
            `[SessionRecovery] ⚠️  Second restore attempt also failed: ${retryError.message}`,
            'warn'
          );
          this.metrics.totalFailures++;
          return false;
        }
      }

      if (!client) {
        this.log(
          `[SessionRecovery] ❌ Client creation returned null`,
          'error'
        );
        this.metrics.totalFailures++;
        return false;
      }

      // Success! Record recovery
      const recoveryTimeMs = Date.now() - startTime;
      this.metrics.totalSuccesses++;
      this.metrics.recoveryTimesMs.push(recoveryTimeMs);
      this._updateAverageRecoveryTime();

      this.log(
        `[SessionRecovery] ✅ Session restored for ${phoneNumber} in ${recoveryTimeMs}ms`,
        'success'
      );

      // Update recovery stats
      this._recordRecovery(phoneNumber, true, recoveryTimeMs);

      return true;
    } catch (error) {
      this.log(
        `[SessionRecovery] ❌ Unexpected error during restore: ${error.message}`,
        'error'
      );
      this.metrics.totalFailures++;
      this._recordRecovery(phoneNumber, false, Date.now() - startTime);
      return false;
    }
  }

  /**
   * Fallback when restore fails: clear stored session
   * (user will be prompted for code auth or QR in Tier 2/3)
   */
  clearFailedSession(phoneNumber) {
    try {
      this.storage.deleteSession(phoneNumber);
      this.log(
        `[SessionRecovery] 🗑️  Cleared failed session for ${phoneNumber}`,
        'info'
      );
      return true;
    } catch (error) {
      this.log(
        `[SessionRecovery] ⚠️  Error clearing session: ${error.message}`,
        'warn'
      );
      return false;
    }
  }

  /**
   * Called after successful device re-link to store new session
   * (ConnectionManager calls this from "authenticated" event handler)
   */
  saveSessionAfterLink(phoneNumber, sessionPath, authMethod = 'restore') {
    try {
      const sessionData = {
        sessionPath,
        authMethod,
        linkedAt: new Date().toISOString(),
        deviceInfo: { restorable: true },
      };

      this.storage.saveSession(phoneNumber, sessionData);
      this.log(
        `[SessionRecovery] ✅ Session saved for future restore (${authMethod})`,
        'success'
      );
      return true;
    } catch (error) {
      this.log(
        `[SessionRecovery] ⚠️  Failed to save session: ${error.message}`,
        'warn'
      );
      return false;
    }
  }

  /**
   * Get recovery statistics for a device
   */
  getRecoveryStats(phoneNumber) {
    return (
      this.recoveryStats.get(phoneNumber) || {
        attempts: 0,
        successes: 0,
        failures: 0,
        successRate: 0,
      }
    );
  }

  /**
   * List all recovery attempts
   */
  listRecoveryAttempts(phoneNumber = null) {
    if (phoneNumber) {
      return this.recoveryAttempts.get(phoneNumber) || [];
    }

    const all = {};
    for (const [phone, attempts] of this.recoveryAttempts) {
      all[phone] = attempts;
    }
    return all;
  }

  /**
   * Get overall metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      averageRecoveryTimeMs: Math.round(this.metrics.averageRecoveryTimeMs),
    };
  }

  /**
   * Private: Record recovery attempt (success or failure)
   */
  _recordRecovery(phoneNumber, success, durationMs) {
    // Track individual attempts
    if (!this.recoveryAttempts.has(phoneNumber)) {
      this.recoveryAttempts.set(phoneNumber, []);
    }

    this.recoveryAttempts
      .get(phoneNumber)
      .push({
        at: Date.now(),
        success,
        durationMs,
      });

    // Update stats
    let stats = this.recoveryStats.get(phoneNumber) || {
      attempts: 0,
      successes: 0,
      failures: 0,
      successRate: 0,
      lastAttempt: null,
    };

    stats.attempts++;
    if (success) {
      stats.successes++;
    } else {
      stats.failures++;
    }
    stats.successRate = Math.round(
      (stats.successes / stats.attempts) * 100
    );
    stats.lastAttempt = new Date().toISOString();

    this.recoveryStats.set(phoneNumber, stats);
  }

  /**
   * Private: Update average recovery time metric
   */
  _updateAverageRecoveryTime() {
    if (this.metrics.recoveryTimesMs.length === 0) {
      this.metrics.averageRecoveryTimeMs = 0;
      return;
    }

    const sum = this.metrics.recoveryTimesMs.reduce((a, b) => a + b, 0);
    this.metrics.averageRecoveryTimeMs = Math.round(
      sum / this.metrics.recoveryTimesMs.length
    );
  }
}
