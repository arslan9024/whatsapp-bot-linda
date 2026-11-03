/**
 * MultiDeviceSyncVerifier.js
 * 
 * Single responsibility: Verify companion device sync state against primary phone.
 * Category: 2️⃣ Domain / Feature (src/connection/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class MultiDeviceSyncVerifier {
  constructor({ maxSyncLagMs = 120000 } = {}) {
    this.maxSyncLagMs = maxSyncLagMs;
    /** @type {Map<string, Object>} */
    this.deviceStates = new Map();
  }

  recordSyncPulse(sessionId, { isCompanion = true, batteryLevel = null, isPlugged = false, lastSeen = Date.now() } = {}) {
    if (!sessionId) throw new Error('sessionId is required');
    const state = {
      sessionId,
      isCompanion,
      batteryLevel,
      isPlugged,
      lastSeen,
      recordedAt: Date.now(),
    };
    this.deviceStates.set(sessionId, state);
    return state;
  }

  getSyncHealth(sessionId) {
    const state = this.deviceStates.get(sessionId);
    if (!state) {
      return { status: 'UNKNOWN', healthy: false, reason: 'No sync pulses recorded' };
    }
    const lag = Date.now() - state.recordedAt;
    if (lag > this.maxSyncLagMs) {
      return { status: 'LAGGING', healthy: false, lagMs: lag, reason: 'Companion sync pulse delayed' };
    }
    return { status: 'IN_SYNC', healthy: true, lagMs: lag, state };
  }

  clear() {
    this.deviceStates.clear();
  }
}

export default new MultiDeviceSyncVerifier();

