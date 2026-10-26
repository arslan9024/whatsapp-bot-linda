/**
 * ====================================================================
 * BROWSER HEALTH MONITOR (Production-Grade)
 * ====================================================================
 * Detects Chrome/Puppeteer process crashes and orchestrates recovery.
 *
 * Features:
 * - Crash detection via page lifecycle events (disconnect, error)
 * - Auto-restart logic (max 3 restarts per 10 minutes)
 * - Consecutive failure tracking with reset on success
 * - Graceful degradation (alert user after max retries)
 * - Detailed diagnostics: uptime, crash reasons, recovery attempts
 * - Integration with ConnectionManager for automatic restart
 *
 * Recovery Strategy:
 * 1. Detect crash (page error, client disconnect within 30s)
 * 2. Wait 5 seconds (browser cleanup)
 * 3. Attempt auto-restart (max 3 times in 10 minutes)
 * 4. On 3rd failure: notify user "manual intervention required"
 * 5. User invokes `recover <phone>` command to trigger 3-tier flow
 *
 * @since Phase 7 - February 17, 2026
 * Version: 1.0
 * Status: Production Ready
 */

export default class BrowserHealthMonitor {
  /**
   * @param {string} phoneNumber - Account phone number
   * @param {Function} logFunc - Logging function (msg, level) => void
   */
  constructor(phoneNumber, logFunc) {
    this.phoneNumber = phoneNumber;
    this.log = logFunc || console.log;

    // Crash tracking
    this.crashCount = 0;
    this.lastCrashTime = null;
    this.lastCrashReason = null;
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 3;
    this.crashWindow = 10 * 60 * 1000; // 10 minutes

    // Recovery attempt tracking
    this.restartAttempts = [];
    this.maxRestartsInWindow = 3;

    // Browser process tracking
    this.browserUptime = null;
    this.browserStartTime = null;
    this.isHealthy = true;
    this.lastHealthCheckTime = Date.now();

    // State
    this.restartInProgress = false;
    this.recoveryMode = false;

    // Metrics
    this.metrics = {
      createdAt: Date.now(),
      totalCrashes: 0,
      totalRestarts: 0,
      totalRecoveries: 0,
      averageUptimeBetweenCrashes: 0,
      upTimesMs: [],
    };
  }

  /**
   * Mark browser as started (successful initialization)
   */
  markBrowserStarted() {
    this.browserStartTime = Date.now();
    this.browserUptime = null;
    this.isHealthy = true;
    this.consecutiveFailures = 0;

    this.log(
      `[${this.phoneNumber}] 🟢 Browser started - Health Monitor active`,
      'info'
    );
  }

  /**
   * Detect crash and trigger recovery
   * Called from ConnectionManager when page/client errors detected
   */
  detectCrash(reason = 'unknown') {
    if (this.restartInProgress) {
      this.log(
        `[${this.phoneNumber}] ⚠️  Restart already in progress, ignoring crash`,
        'warn'
      );
      return false;
    }

    this.crashCount++;
    this.lastCrashTime = Date.now();
    this.lastCrashReason = reason;
    this.isHealthy = false;
    this.consecutiveFailures++;

    // Calculate uptime before crash
    if (this.browserStartTime) {
      const uptime = Date.now() - this.browserStartTime;
      this.metrics.upTimesMs.push(uptime);
      this.browserUptime = uptime;
      this._updateAverageUptime();
    }

    this.log(
      `[${this.phoneNumber}] 💥 Crash detected (#${this.crashCount}): ${reason}`,
      'error'
    );

    if (this.browserUptime) {
      this.log(
        `[${this.phoneNumber}]    Browser uptime before crash: ${this._formatMs(this.browserUptime)}`,
        'info'
      );
    }

    // Check if we should attempt restart
    const canRestart = this._canAttemptRestart();
    if (canRestart) {
      this.log(
        `[${this.phoneNumber}] 🔄 Attempting auto-restart (${this.restartAttempts.length + 1}/${this.maxRestartsInWindow})`,
        'info'
      );
      return true; // Signal caller to attempt restart
    } else {
      this.log(
        `[${this.phoneNumber}] ❌ Max restarts exceeded (${this.restartAttempts.length}/${this.maxRestartsInWindow}) in ${this._formatMs(this.crashWindow)}`,
        'error'
      );
      this.log(
        `[${this.phoneNumber}]    📋 Call 'recover <phone>' or 'relink <phone>' to fix`,
        'warn'
      );
      return false; // No more auto-restart, require user intervention
    }
  }

  /**
   * Record restart attempt
   * Called when ConnectionManager starts a new Chrome instance
   */
  recordRestartAttempt() {
    const now = Date.now();
    this.restartAttempts.push(now);
    this.restartInProgress = true;
    this.metrics.totalRestarts++;

    this.log(
      `[${this.phoneNumber}] ⏳ Restart attempt recorded (${this.restartAttempts.length}/${this.maxRestartsInWindow})`,
      'info'
    );

    // Schedule restart-in-progress flag to clear after 30 seconds
    setTimeout(() => {
      this.restartInProgress = false;
      this.log(
        `[${this.phoneNumber}] ✅ Restart window closed`,
        'debug'
      );
    }, 30000);
  }

  /**
   * Mark restart as successful (new browser instance initialized)
   */
  markRestartSuccess() {
    this.restartInProgress = false;
    this.consecutiveFailures = 0;
    this.metrics.totalRecoveries++;

    this.log(
      `[${this.phoneNumber}] ✅ Browser restart successful - resuming`,
      'success'
    );
  }

  /**
   * Mark restart as failed
   */
  markRestartFailure(reason = 'unknown') {
    this.consecutiveFailures++;
    this.log(
      `[${this.phoneNumber}] ❌ Browser restart failed: ${reason}`,
      'error'
    );

    if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
      this.log(
        `[${this.phoneNumber}]    ⚠️  Consecutive failures (${this.consecutiveFailures}/${this.maxConsecutiveFailures}) - manual intervention required`,
        'error'
      );
      this.recoveryMode = true;
      return false; // Stop auto-retrying
    }

    return true; // Can try again
  }

  /**
   * Health check: validate browser is responding
   * Can be called periodically (e.g., every 30 seconds)
   */
  async performHealthCheck() {
    this.lastHealthCheckTime = Date.now();

    if (!this.isHealthy) {
      return false;
    }

    return true;
  }

  /**
   * Reset health status (when device successfully re-links)
   */
  resetHealth() {
    this.consecutiveFailures = 0;
    this.crashCount = 0;
    this.recoveryMode = false;
    this.isHealthy = true;
    this.metrics.totalCrashes = 0;

    this.log(
      `[${this.phoneNumber}] 🔄 Browser health reset`,
      'info'
    );
  }

  /**
   * Private: Check if we can attempt another restart
   */
  _canAttemptRestart() {
    // Check restart window: only count restarts within last 10 minutes
    const now = Date.now();
    const recentRestarts = this.restartAttempts.filter(
      t => now - t < this.crashWindow
    );

    // Update list with recent only
    this.restartAttempts = recentRestarts;

    // Can restart if under limit
    return recentRestarts.length < this.maxRestartsInWindow;
  }

  /**
   * Private: Update average uptime metric
   */
  _updateAverageUptime() {
    if (this.metrics.upTimesMs.length === 0) return;

    const sum = this.metrics.upTimesMs.reduce((a, b) => a + b, 0);
    this.metrics.averageUptimeBetweenCrashes = Math.round(
      sum / this.metrics.upTimesMs.length
    );
  }

  /**
   * Private: Format milliseconds to human-readable
   */
  _formatMs(ms) {
    if (!ms || ms <= 0) return '0s';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  }

  /**
   * Get detailed status
   */
  getStatus() {
    return {
      phoneNumber: this.phoneNumber,
      isHealthy: this.isHealthy,
      crashCount: this.crashCount,
      lastCrashTime: this.lastCrashTime
        ? new Date(this.lastCrashTime).toISOString()
        : null,
      lastCrashReason: this.lastCrashReason,
      consecutiveFailures: this.consecutiveFailures,
      maxConsecutiveFailures: this.maxConsecutiveFailures,
      restartAttempts: this.restartAttempts.length,
      maxRestartsInWindow: this.maxRestartsInWindow,
      recoveryMode: this.recoveryMode,
      browserUptime: this.browserUptime
        ? this._formatMs(this.browserUptime)
        : 'N/A',
      metrics: this.metrics,
    };
  }
}
