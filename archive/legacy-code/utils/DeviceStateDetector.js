/**
 * ====================================================================
 * DEVICE STATE DETECTOR (Production-Grade)
 * ====================================================================
 * Detects if WhatsApp device is still linked on server.
 * Prevents restore attempts with unlinked sessions.
 *
 * Features:
 * - Validates device state before session restore
 * - Detects user removal of device from WhatsApp Web
 * - Tracks device state changes (linked ↔ unlinked)
 * - Caches state for performance
 * - Provides clear diagnostics on state change
 *
 * States: 'linked' | 'unlinked' | 'unknown'
 *
 * @since Phase 8 - February 18, 2026
 * Version: 1.0
 * Status: Production Ready
 */

export default class DeviceStateDetector {
  constructor(logFunc) {
    this.log = logFunc || console.log;
    this.deviceStates = new Map(); // phone → state
    this.stateHistory = new Map(); // phone → [{state, changedAt}, ...]

    this.metrics = {
      createdAt: Date.now(),
      validationAttempts: 0,
      devicesLinked: 0,
      devicesUnlinked: 0,
      stateChanges: 0,
    };
  }

  /**
   * Validate device state by attempting basic WhatsApp operation
   * @returns {Promise<'linked'|'unlinked'|'unknown'>}
   */
  async validateDeviceState(client, phoneNumber, timeoutMs = 10000) {
    if (!client) {
      this.log(`[DeviceDetector] ❌ No client provided for ${phoneNumber}`, 'error');
      return 'unknown';
    }

    this.metrics.validationAttempts++;

    try {
      // Try to get WhatsApp version (lightweight, non-intrusive check)
      const versionPromise = client.getWWebVersion && client.getWWebVersion();
      if (!versionPromise) {
        this.log(
          `[DeviceDetector] ⚠️  Client method getWWebVersion not available`,
          'warn'
        );
        return 'unknown';
      }

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Device validation timeout')),
          timeoutMs
        )
      );

      await Promise.race([versionPromise, timeoutPromise]);

      // If we got version info, device is linked
      this._setState(phoneNumber, 'linked');
      this.log(
        `[DeviceDetector] ✅ Device LINKED: ${phoneNumber} (session valid)`,
        'success'
      );
      this.metrics.devicesLinked++;

      return 'linked';
    } catch (error) {
      const msg = (error?.message || String(error)).toLowerCase();

      // Detect device unlinked indicators
      const unlinkIndicators = [
        'auth required',
        'invalid session',
        'device not linked',
        'session expired',
        'unauthorized',
        'logout',
        'www.whatsapp.com', // Redirect to login
        'qrcode', // Wants new QR
      ];

      if (unlinkIndicators.some(indicator => msg.includes(indicator))) {
        this._setState(phoneNumber, 'unlinked');
        this.log(
          `[DeviceDetector] 📱 Device UNLINKED: ${phoneNumber} - User removed device or session expired`,
          'warn'
        );
        this.metrics.devicesUnlinked++;

        return 'unlinked';
      }

      // Timeout or transient error - unknown state
      this.log(
        `[DeviceDetector] ❓ Device state UNKNOWN for ${phoneNumber}: ${msg.substring(0, 60)}`,
        'info'
      );

      return 'unknown';
    }
  }

  /**
   * Get cached device state without validation
   */
  getCachedState(phoneNumber) {
    return this.deviceStates.get(phoneNumber) || 'unknown';
  }

  /**
   * Explicitly mark device as unlinked
   * Called when user removes device or auth failure detected
   */
  markUnlinked(phoneNumber, reason = 'user action') {
    const oldState = this.deviceStates.get(phoneNumber);
    this._setState(phoneNumber, 'unlinked');

    this.log(
      `[DeviceDetector] 📱 Device marked UNLINKED: ${phoneNumber}`,
      'warn'
    );
    this.log(
      `[DeviceDetector]    Reason: ${reason}`,
      'info'
    );

    if (oldState !== 'unlinked') {
      this.metrics.stateChanges++;
    }
  }

  /**
   * Explicitly mark device as linked
   * Called after successful authentication or device restore
   */
  markLinked(phoneNumber, reason = 'authentication') {
    const oldState = this.deviceStates.get(phoneNumber);
    this._setState(phoneNumber, 'linked');

    this.log(
      `[DeviceDetector] ✅ Device marked LINKED: ${phoneNumber}`,
      'success'
    );
    this.log(
      `[DeviceDetector]    Reason: ${reason}`,
      'debug'
    );

    if (oldState !== 'linked') {
      this.metrics.stateChanges++;
    }
  }

  /**
   * Check if device state likely changed
   * Returns true if last validation showed link, but now might be unlinked
   */
  hasStateChanged(phoneNumber) {
    const history = this.stateHistory.get(phoneNumber) || [];
    if (history.length < 2) return false;

    const current = history[history.length - 1];
    const previous = history[history.length - 2];

    return current.state !== previous.state;
  }

  /**
   * Get state change history
   */
  getStateHistory(phoneNumber) {
    const history = this.stateHistory.get(phoneNumber) || [];
    return history.map(entry => ({
      ...entry,
      changedAt: new Date(entry.changedAt).toISOString(),
    }));
  }

  /**
   * Reset device state (for testing or manual reset)
   */
  resetDeviceState(phoneNumber) {
    this.deviceStates.delete(phoneNumber);
    this.stateHistory.delete(phoneNumber);
    this.log(`[DeviceDetector] 🔄 Device state reset: ${phoneNumber}`, 'info');
  }

  /**
   * Private: Update state and track history
   */
  _setState(phoneNumber, state) {
    this.deviceStates.set(phoneNumber, state);

    // Track in history
    if (!this.stateHistory.has(phoneNumber)) {
      this.stateHistory.set(phoneNumber, []);
    }

    this.stateHistory.get(phoneNumber).push({
      state,
      changedAt: Date.now(),
    });

    // Keep only last 10 state changes
    const history = this.stateHistory.get(phoneNumber);
    if (history.length > 10) {
      history.shift();
    }
  }

  /**
   * Get status for diagnostics
   */
  getStatus() {
    const allStates = {};
    for (const [phone, state] of this.deviceStates) {
      allStates[phone] = state;
    }

    return {
      deviceStates: allStates,
      metrics: { ...this.metrics },
      history: (() => {
        const h = {};
        for (const [phone, entries] of this.stateHistory) {
          h[phone] = entries.slice(-5).map(e => ({
            state: e.state,
            at: new Date(e.changedAt).toISOString(),
          }));
        }
        return h;
      })(),
    };
  }
}
